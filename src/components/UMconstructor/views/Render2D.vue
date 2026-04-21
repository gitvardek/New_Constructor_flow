<script setup lang="ts">
// @ts-nocheck
import {
  onMounted,
  onUnmounted,
  ref,
  computed,
  reactive,
  defineExpose,
  onBeforeMount,
  toRefs,
  watch,
} from "vue";
import { Application, Container, Graphics, Text } from "pixi.js";
import { Shape, ShapeAdjuster, Section } from "./../utils/PixiMethods.ts";
import { UM_PARAMS } from "./../utils/Const.ts";
import { useAppData } from "@/store/appliction/useAppData.ts";
import * as THREE from "three";
import { LOOPSIDE, TSelectedCell } from "./../types/UMtypes.ts";
import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";

const props = defineProps({
  module: {
    type: Object,
    required: true,
  },
  mode: {
    type: String,
    default: "module",
  },
  maxAreaHeight: {
    type: Number,
    default: 720,
  },
  maxAreaWidth: {
    type: Number,
    default: 600,
  },
  correct: {
    type: Object,
  },
  step: {
    type: Number,
    default: 1,
  },
  container: {},
  UMconstructor: {
    type: UMconstructorClass,
    required: true,
  },
});

const emit = defineEmits([
  "cell-selected",
  "position-non",
  "calcDrawersFasades",
  "module-reset",
  "checkLoopsCollision",
]);
const canvasContainer = ref();
const APP = useAppData().getAppData;

const selectedCell = ref<TSelectedCell>(<TSelectedCell>{});
const selectedFasade = ref<TSelectedCell>(<TSelectedCell>{});
const selectedFilling = ref<TSelectedCell>(<TSelectedCell>{});
const { module, UMconstructor } = toRefs(props);

let app: Application,
  sectionsContainer: Container,
  lablesContainer: Container,
  dementionContainer: Container,
  fillingsContainer: Container,
  fasadesContainer: Container,
  loopsContainer: Container,
  handlesContainer: Container,
  shapeAdjuster: ShapeAdjuster;

let cursorCheck = false;
let lastDragEvent = ref(null);

// Хранилища объектов
const sections: Container[] = [];
const sectionLables: (Graphics | Text)[] = [];
const deviders: Graphics[] = [];
const dementions: Graphics[] = [];
const fillings: Graphics[] = [];
const fasades: Graphics[] = [];
const loops: Container[] = [];
const handles: Container[] = [];

const {
  CONST_MAX_AREA_WIDTH,
  CONST_MAX_AREA_HEIGHT,
  BACKGROUND_COLOR,
  MIN_SECTION_WIDTH,
  MIN_SECTION_HEIGHT,
  MIN_FASADE_HEIGHT,
  MIN_FASADE_WIDTH,
  MIN_SLIDE_DOOR_WIDTH,
} = UM_PARAMS;

const dragState = reactive({
  isDragging: false,
  type: null, // "vertical" или "horizontal"

  secIndex: null, // Для горизонтального перетаскивания
  cellIndex: null, // Для вертикального перетаскивания
  rowIndex: null, // Для горизонтального перетаскивания
  extraIndex: null, // Для вертикального перетаскивания

  startX: 0,
  startY: 0,

  startLeftWidth: 0,
  startRightWidth: 0,

  minXleft: MIN_SECTION_WIDTH,
  minXRight: MIN_SECTION_WIDTH,

  startTopHeight: 0,
  startBottomHeight: 0,

  minTop: MIN_SECTION_HEIGHT,
  minBottom: MIN_SECTION_HEIGHT,

  element: null,
});

const MAX_AREA_WIDTH = computed(() => {
  let midArea = document.getElementById("midAreaUM2Dconstructor");
  return midArea?.clientWidth * 0.7 || CONST_MAX_AREA_WIDTH;
});

const MAX_AREA_HEIGHT = computed(() => {
  let midArea = document.getElementById("midAreaUM2Dconstructor");
  return midArea?.clientHeight * 0.75 || CONST_MAX_AREA_HEIGHT;
});

const TOTAL_HEIGHT = ref(0);
const TOTAL_WIDTH = ref(0);
const areaHeight = ref(0);
const areaWidth = ref(0);
const mode = ref("module");

const calcDrawersFasades = (secIndex, fillingData = false) => {
  UMconstructor?.value?.FASADES.EXTERNAL_FASADES.calcDrawersFasades(
    secIndex,
    fillingData,
    module.value,
  );
};

const checkLoopsCollision = (secIndex) => {
  UMconstructor?.value?.LOOPS.checkLoopsCollision(secIndex, module.value);
};

const resetModule = () => {
  UMconstructor?.value?.reset(module.value);
};

const pixelRatioWidth = computed(() => TOTAL_WIDTH.value / areaWidth.value);
const pixelRatioHeight = computed(() => TOTAL_HEIGHT.value / areaHeight.value);

const calcMaxAreaSize = () => {
  let scale = Math.min(
    MAX_AREA_WIDTH.value / TOTAL_WIDTH.value,
    MAX_AREA_HEIGHT.value / TOTAL_HEIGHT.value,
  );

  areaWidth.value = TOTAL_WIDTH.value * scale;
  areaHeight.value = TOTAL_HEIGHT.value * scale;
};

const updateTotalSize = (value, dimension) => {
  switch (dimension) {
    case "width":
      TOTAL_WIDTH.value = parseInt(value);
      break;
    case "height":
      TOTAL_HEIGHT.value = parseInt(value);
      break;
    default:
      break;
  }

  calcMaxAreaSize();

  app.canvas.style.width = `${areaWidth.value}px`;
  app.canvas.style.height = `${areaHeight.value}px`;
  app.renderer.resize(areaWidth.value, areaHeight.value);
};

const getPixelWidth = (mmWidth) => {
  return (mmWidth / TOTAL_WIDTH.value) * areaWidth.value;
};

const getPixelHeight = (mmHeight) => {
  return (mmHeight / TOTAL_HEIGHT.value) * areaHeight.value;
};

const getMmWidth = (pxWidth) => {
  return (pxWidth / areaWidth.value) * TOTAL_WIDTH.value;
};

const getMmHeight = (pxHeight) => {
  return (pxHeight / areaHeight.value) * TOTAL_HEIGHT.value;
};

const init = async () => {
  app = new Application();
  await app.init({
    canvas: canvasContainer.value,
    width: areaWidth.value,
    height: areaHeight.value,
    backgroundColor: BACKGROUND_COLOR,
    resolution: window.devicePixelRatio || 1,
    // autoDensity: true,
    antialias: true,
    premultipliedAlpha: false,
  });
  updateTotalSize();
  loopsContainer = new Container();
  handlesContainer = new Container();
  sectionsContainer = new Container();
  lablesContainer = new Container();
  dementionContainer = new Container();
  fillingsContainer = new Container();
  fasadesContainer = new Container();

  // sectionsContainer.interactive = true;
  fillingsContainer.interactive = true;
  //loopsContainer.interactiveChildren = true;
  fasadesContainer.interactive = true;
  lablesContainer.interactiveChildren = false;
  dementionContainer.interactiveChildren = false;

  app.stage.addChild(dementionContainer);
  app.stage.addChild(fillingsContainer);
  app.stage.addChild(sectionsContainer);
  app.stage.addChild(loopsContainer);
  app.stage.addChild(fasadesContainer);
  app.stage.addChild(handlesContainer);
  app.stage.addChild(lablesContainer);

  app.stage.eventMode = "static";
  app.stage.hitArea = app.screen;

  shapeAdjuster = new ShapeAdjuster({
    scope: UMconstructor?.value,
    getMmWidth,
    getMmHeight,
    getPixelHeight,
    getPixelWidth,
  });
  UMconstructor.value.setShapeAdjuster(shapeAdjuster);
  shapeAdjuster.setStep(props.step);
  addTicker();

  renderGrid();
};

const positionMap = {
  0: { col: -1, row: 1, rotation: 0 }, // лево-верх
  1: { col: 0, row: 1, rotation: Math.PI / 2 }, // центр-верх
  2: { col: 1, row: 1, rotation: 0 }, // право-верх
  3: { col: -1, row: 0, rotation: 0 }, // лево-центр
  4: { col: 0, row: 0, rotation: Math.PI / 2 }, // центр
  5: { col: 1, row: 0, rotation: 0 }, // право-центр
  6: { col: -1, row: -1, rotation: 0 }, // лево-низ
  7: { col: 0, row: -1, rotation: Math.PI / 2 }, // центр-низ
  8: { col: 1, row: -1, rotation: 0 }, // право-низ
};

const getHandlesPosition = (
  posNumber: number,
  fasadeMesh: {
    position: THREE.Vector2;
    size: { width: number; height: number };
  },
  handleMesh: {
    size: THREE.Vector2;
  },
) => {
  const trueSize = fasadeMesh.size;
  if (!trueSize) {
    console.warn("fasadeMesh.userData.trueSize отсутствует");
    return;
  }
  const { width, height } = trueSize;

  // Получаем размеры ручки (если их нет — вычисляем)
  let handlSize = handleMesh.size;

  const W = handlSize.x;
  const H = handlSize.y;
  const offset = mode.value === "fasades" ? 45 : 25; // мм

  const cfg = positionMap[posNumber];
  if (!cfg) {
    console.warn("Неверный action для ручки:", posNumber);
    return;
  }

  const halfWidth = width; // 2;
  const halfHeight = height; // 2;

  // Проекция размеров ручки на оси X/Y после поворота (полная ширина/высота AABB)
  const theta = cfg.rotation;
  const projW = Math.abs(W * Math.cos(theta)) + Math.abs(H * Math.sin(theta));
  const projH = Math.abs(W * Math.sin(theta)) + Math.abs(H * Math.cos(theta));
  const halfExtX = projW; // 2;
  const halfExtY = projH; // 2;

  // Вычисляем координаты центра ручки с учётом отступа и проекции (чтобы край ручки был не ближе offset)
  let posX = 0;
  if (cfg.col === -1) posX = offset + halfExtX;
  else if (cfg.col === 1) posX = halfWidth - offset - halfExtX;
  else posX = width / 2 + halfExtX / 2;

  let posY = 0;
  if (cfg.row === -1) posY = height - offset - halfExtY;
  else if (cfg.row === 1) posY = offset + halfExtY;
  else posY = height / 2 - halfExtY / 2;

  return {
    position: new THREE.Vector2(
      posX + fasadeMesh.position.x,
      posY + (fasadeMesh.position.y - height),
    ),
    rotation: theta,
  };
};

const renderGrid = (_moduleGrid) => {
  clearRender();
  let xOffset = 0;
  let yOffset = 0;

  if (_moduleGrid) {
    setModuleGrid(_moduleGrid);
  }

  if (mode.value === "fasades") {
    fasadesContainer.interactiveChildren = true;
  } else {
    fasadesContainer.interactiveChildren = false;
  }

  const moduleGrid = _moduleGrid || props.module;

  let ModulepxWidth = getPixelWidth(moduleGrid.width);
  let ModulepxHeight = getPixelHeight(moduleGrid.height);
  moduleGrid.xOffset = xOffset;
  moduleGrid.yOffset = yOffset;

  let moduleSector = createModule({
    x: xOffset,
    y: yOffset,
    width: ModulepxWidth,
    height: ModulepxHeight,
    moduleData: moduleGrid,
  });

  xOffset = getPixelWidth(moduleGrid.leftWallThickness);

  moduleGrid?.sections.forEach((section, sectionIndex, _sections) => {
    const pxWidth = getPixelWidth(section.width);

    yOffset = getPixelHeight(moduleGrid.moduleThickness);

    let tmp_array_sectors = [];

    section.xOffset = xOffset;
    section.yOffset = yOffset;

    if (section.cells.length > 0) {
      section.cells
        .slice()
        .sort((a, b) => b.position.y - a.position.y)
        .forEach((cell, cellIndex, section) => {
          const pxHeight = getPixelHeight(cell.height);
          cell.xOffset = xOffset;
          cell.yOffset = yOffset;

          if (cell.cellsRows?.length > 0) {
            let rowxOffset = xOffset;
            cell.cellsRows.forEach((cellRow, cellRowIndex, _cell) => {
              const RowpxWidth = getPixelWidth(cellRow.width);
              cellRow.xOffset = rowxOffset;
              cellRow.yOffset = yOffset;

              if (cellRow.extras?.length > 0) {
                let rowyOffset = yOffset;
                cellRow.extras
                  .slice()
                  .sort((a, b) => b.position.y - a.position.y)
                  .forEach((extra, extraIndex, _extras) => {
                    const RowpxHeight = getPixelWidth(extra.height);

                    extra.xOffset = rowxOffset;
                    extra.yOffset = rowyOffset;

                    let sector = createSector({
                      x: rowxOffset,
                      y: rowyOffset,
                      width: RowpxWidth,
                      height: RowpxHeight,
                      sectionIndex,
                      cellIndex,
                      cellData: extra,
                      section: _extras,
                      rowIndex: cellRowIndex,
                      row: cellRow,
                      extraIndex,
                      _sector: moduleSector,
                      gridType: "module",
                    });

                    tmp_array_sectors.push(sector);

                    //Добавляем отступ по вертикали
                    rowyOffset +=
                      RowpxHeight + getPixelHeight(moduleGrid.moduleThickness);
                  });

                //Добавляем отступ по вертикали
                const colBond = shapeAdjuster.createColumnBounds(
                  cellRow.extras,
                );

                // Создаём ограничения для секторов по ширине
                cellRow.shapesBond = colBond;
                cellRow.maxX = shapeAdjuster.convertToTen(
                  getMmWidth(colBond.maxX),
                );
                cellRow.minX = shapeAdjuster.convertToTen(
                  getMmWidth(colBond.minX),
                );
                cellRow.maxY = shapeAdjuster.convertToTen(
                  getMmHeight(colBond.maxY),
                );
                cellRow.minY = shapeAdjuster.convertToTen(
                  getMmHeight(colBond.minY),
                );

                let { maxY, minX, maxX, minY } = cellRow;

                if (minY > 0) {
                  cellRow.minY = Math.max(
                    0,
                    moduleGrid.height - minY - cellRow.position.y,
                  );
                }
                if (maxY > 0) {
                  cellRow.maxY = Math.max(
                    0,
                    cellRow.position.y +
                      cellRow.height -
                      (moduleGrid.height - maxY),
                  );
                }
                if (minX > 0) {
                  cellRow.minX = Math.max(
                    0,
                    minX - (cellRow.position.x - cellRow.width / 2),
                  );
                }
                if (maxX > 0) {
                  cellRow.maxX = Math.max(
                    0,
                    cellRow.position.x + cellRow.width / 2 - maxX,
                  );
                }
              } else {
                let sector = createSector({
                  x: rowxOffset,
                  y: yOffset,
                  width: RowpxWidth,
                  height: pxHeight,
                  sectionIndex,
                  cellIndex,
                  cellData: cellRow,
                  section: _cell,
                  rowIndex: cellRowIndex,
                  row: cellRow,
                  _sector: moduleSector,
                  gridType: "module",
                });

                tmp_array_sectors.push(sector);
              }

              rowxOffset +=
                RowpxWidth + getPixelWidth(moduleGrid.moduleThickness);
            });

            //Добавляем отступ по вертикали
            const colBond = shapeAdjuster.createColumnBounds(cell.cellsRows);

            // Создаём ограничения для секторов по ширине
            cell.shapesBond = colBond;
            cell.maxX = shapeAdjuster.convertToTen(getMmWidth(colBond.maxX));
            cell.minX = shapeAdjuster.convertToTen(getMmWidth(colBond.minX));
            cell.maxY = shapeAdjuster.convertToTen(getMmHeight(colBond.maxY));
            cell.minY = shapeAdjuster.convertToTen(getMmHeight(colBond.minY));

            let { maxY, minX, maxX, minY } = cell;

            if (minY > 0) {
              cell.minY = Math.max(
                0,
                moduleGrid.height - minY - cell.position.y,
              );
            }
            if (maxY > 0) {
              cell.maxY = Math.max(
                0,
                cell.position.y + cell.height - (moduleGrid.height - maxY),
              );
            }
            if (minX > 0) {
              cell.minX = Math.max(
                0,
                minX - (cell.position.x - cell.width / 2),
              );
            }
            if (maxX > 0) {
              cell.maxX = Math.max(0, cell.position.x + cell.width / 2 - maxX);
            }
          } else {
            let sector = createSector({
              x: xOffset,
              y: yOffset,
              width: pxWidth,
              height: pxHeight,
              sectionIndex,
              cellIndex,
              cellData: cell,
              section,
              _sector: moduleSector,
              gridType: "module",
            });

            tmp_array_sectors.push(sector);
          }

          //Добавляем отступ по вертикали
          yOffset += pxHeight + getPixelHeight(props.module.moduleThickness);
        });

      const colBond = shapeAdjuster.createColumnBounds(section.cells);

      // Создаём ограничения для секторов по ширине
      section.shapesBond = colBond;
      section.maxX = shapeAdjuster.convertToTen(getMmWidth(colBond.maxX));
      section.minX = shapeAdjuster.convertToTen(getMmWidth(colBond.minX));
      section.maxY = shapeAdjuster.convertToTen(getMmHeight(colBond.maxY));
      section.minY = shapeAdjuster.convertToTen(getMmHeight(colBond.minY));

      let { maxY, minX, maxX, minY } = section;

      if (minY > 0) {
        section.minY = Math.max(
          0,
          moduleGrid.height - minY - section.position.y,
        );
      }
      if (maxY > 0) {
        section.maxY = Math.max(
          0,
          section.position.y + section.height - (moduleGrid.height - maxY),
        );
      }
      if (minX > 0) {
        section.minX = Math.max(
          0,
          minX - (section.position.x - section.width / 2),
        );
      }
      if (maxX > 0) {
        section.maxX = Math.max(
          0,
          section.position.x + section.width / 2 - maxX,
        );
      }
    } else {
      const pxHeight = getPixelHeight(section.height);
      // Отрисовываем секцию

      let sector = createSector({
        x: xOffset,
        y: yOffset,
        width: pxWidth,
        height: pxHeight,
        sectionIndex,
        cellIndex: null,
        cellData: section,
        section: _sections,
        _sector: moduleSector,
        gridType: "module",
      });
      tmp_array_sectors.push(sector);

      //Добавляем отступ по вертикали
      yOffset += pxHeight;
    }

    //Добавляем отступ по горизонтали
    xOffset += pxWidth + getPixelWidth(moduleGrid.moduleThickness);

    console.log(section, "section");

    if (section.loops?.length) {
      section.loops.forEach((door, doorIndex) => {
        door.forEach((loop, loopIndex) => {
          let tmpLoopData = { ...loop };

          const isTopLoops = LOOPSIDE["top"] === tmpLoopData.side;
          const isNoneLoops = LOOPSIDE["none"] === tmpLoopData.side;

          if (isNoneLoops) return;
          if (!isTopLoops) {
            delete tmpLoopData.coords;
            delete tmpLoopData.errors;
          }

          let loopXOffset = getPixelWidth(tmpLoopData.positionX);
          const pxWidth = getPixelWidth(tmpLoopData.width);
          const pxHeight = getPixelHeight(tmpLoopData.height);

          tmpLoopData.xOffset = loopXOffset;

          console.log(loopXOffset, "loopXOffset");
          console.log(tmpLoopData.positionX, "positionX");

          loop.coords.forEach((pos, posIndex) => {
            let loopSector;
            let tmp_top_loop_pos;

            if (isTopLoops) {
              tmp_top_loop_pos =
                pos[0] +
                tmpLoopData.height / 2 -
                (!module.value.noBottom ? 0 : module.value.moduleThickness);
            } else {
              tmp_top_loop_pos =
                pos +
                tmpLoopData.height / 2 -
                (!module.value.noBottom ? 0 : module.value.moduleThickness);
            }

            let tmp_y_pos = module.value.height - tmp_top_loop_pos;

            tmpLoopData.yOffset = getPixelHeight(tmp_y_pos);

            // Отрисовываем секцию
            if (isTopLoops) {
              console.log(pos, "PPPPPPPP");

              loopSector = createLoop({
                x: getPixelWidth(pos[1]),
                y:  tmpLoopData.yOffset,
                width: pxWidth,
                height: pxHeight,
                loopData: {
                  ...tmpLoopData,
                  error: loop.errors?.includes(posIndex),
                  position: {
                    x: getMmWidth(pos[1]),
                    y: tmp_y_pos,
                  },
                },
              });
            } else {
              loopSector = createLoop({
                x: tmpLoopData.xOffset,
                y: tmpLoopData.yOffset,
                width: pxWidth,
                height: pxHeight,
                loopData: {
                  ...tmpLoopData,
                  error: loop.errors?.includes(posIndex),
                  position: {
                    x: getMmWidth(tmpLoopData.xOffset),
                    y: tmp_y_pos,
                  },
                },
              });
            }

            console.log(loopSector, "vvvv");

            for (let i = 0; i < tmp_array_sectors.length; i++) {
              let sector = tmp_array_sectors[i];

              if (checkSectorsCollision(loopSector.sectorData, sector)) {
                let tempShape = new Shape({
                  type: "loop",
                  sector,
                  data: tmpLoopData,
                  position: {
                    x: loopSector.sectorData.position.x,
                    y: loopSector.sectorData.position.y,
                  },
                  getMmWidth,
                  getMmHeight,
                  getPixelHeight,
                  getPixelWidth,
                  calcDrawersFasades,
                  checkLoopsCollision,
                });

                sector.shapes.push(tempShape);
                break;
              }
            }
          });
        });
      });
    }

    if (!module.value?.isSlidingDoors) {
      section.fasades.forEach((column, colIndex) => {
        if (!column.length) return;

        const pxWidth = getPixelWidth(column[0].width);
        let fasadeXOffset = getPixelWidth(column[0].position.x);

        column.forEach((row, rowIndex, col) => {
          let fasadeYOffset = getPixelHeight(
            module.value.height - row.position.y - row.height,
          );

          const pxHeight = getPixelHeight(row.height);
          row.xOffset = fasadeXOffset;
          row.yOffset = fasadeYOffset;

          // Отрисовываем секцию

          createSector({
            x: fasadeXOffset,
            y: fasadeYOffset,
            width: pxWidth,
            height: pxHeight,
            sectionIndex,
            cellIndex: colIndex,
            rowIndex: row.id - 1,
            cellData: row,
            section: col,
            _sector: moduleSector,
            gridType: "fasades",
            opacity: mode.value === "fasades" ? 0.8 : 0.25,
          });

          if (
            !row.error &&
            row.material.HANDLES?.id !== 69920 &&
            row.material.HANDLES?.position
          ) {
            let handle = APP.CATALOG.PRODUCTS[row.material.HANDLES.id];
            let handle_size = new THREE.Vector2(15, 100);
            let handle_pos = getHandlesPosition(
              row.material.HANDLES.position,
              {
                position: new THREE.Vector2(
                  row.position.x,
                  module.value.height - row.position.y,
                ),
                size: { width: row.width, height: row.height },
              },
              {
                size: handle_size,
              },
            );

            handle_size = handle_size.rotateAround(
              new THREE.Vector2(),
              handle_pos.rotation,
            );

            createHandle({
              x: getPixelWidth(handle_pos.position.x),
              y: getPixelHeight(handle_pos.position.y),
              width: getPixelWidth(handle_size.x),
              height: getPixelHeight(handle_size.y),
              handleData: {
                ...handle,
                position: handle_pos.position,
              },
              opacity: 0.9,
            });
          }
        });
        //Добавляем отступ по горизонтали
        fasadeXOffset += pxWidth + getPixelWidth(4);
      });

      let fasadeXOffset = getPixelWidth(
        section.fasadesDrawers?.[0]?.position.x,
      );
      section.fasadesDrawers?.forEach((row, rowIndex, col) => {
        const pxWidth = getPixelWidth(row.width);
        let fasadeYOffset = getPixelHeight(
          module.value.height - row.position.y - row.height,
        );

        const pxHeight = getPixelHeight(row.height);
        row.xOffset = fasadeXOffset;
        row.yOffset = fasadeYOffset;

        // Отрисовываем секцию

        createSector({
          x: fasadeXOffset,
          y: fasadeYOffset,
          width: pxWidth,
          height: pxHeight,
          sectionIndex,
          cellIndex: 0,
          rowIndex: row.id - 1,
          cellData: row,
          section: col,
          _sector: moduleSector,
          gridType: "fasades",
          opacity: mode.value === "fasades" ? 0.8 : 0.25,
        });

        if (
          !row.error &&
          row.material.HANDLES?.id !== 69920 &&
          row.material.HANDLES?.position
        ) {
          let handle = APP.CATALOG.PRODUCTS[row.material.HANDLES.id];
          let handle_size = new THREE.Vector2(15, 100);
          let handle_pos = getHandlesPosition(
            row.material.HANDLES.position,
            {
              position: new THREE.Vector2(
                row.position.x,
                module.value.height - row.position.y,
              ),
              size: { width: row.width, height: row.height },
            },
            {
              size: handle_size,
            },
          );

          handle_size = handle_size.rotateAround(
            new THREE.Vector2(),
            handle_pos.rotation,
          );

          createHandle({
            x: getPixelWidth(handle_pos.position.x),
            y: getPixelHeight(handle_pos.position.y),
            width: getPixelWidth(handle_size.x),
            height: getPixelHeight(handle_size.y),
            handleData: {
              ...handle,
              position: handle_pos.position,
            },
            opacity: 0.9,
          });
        }
      });
    }
  });

  if (module.value?.isSlidingDoors) {
    module.value?.fasades?.forEach((column, colIndex) => {
      const pxWidth = getPixelWidth(column[0].width);
      let fasadeXOffset = getPixelWidth(column[0].position.x);

      column.forEach((row, rowIndex, col) => {
        let fasadeYOffset = getPixelHeight(
          module.value.height - row.position.y - row.height,
        );

        const pxHeight = getPixelHeight(row.height);
        row.xOffset = fasadeXOffset;
        row.yOffset = fasadeYOffset;

        // Отрисовываем секцию

        createSector({
          x: fasadeXOffset,
          y: fasadeYOffset,
          width: pxWidth,
          height: pxHeight,
          sectionIndex: null,
          cellIndex: colIndex,
          rowIndex: column.length > 1 ? row.id - 1 : null,
          cellData: row,
          section: col,
          _sector: moduleSector,
          gridType: "fasades",
          opacity: mode.value === "fasades" ? 0.8 : 0.25,
        });
      });
      //Добавляем отступ по горизонтали
      fasadeXOffset += pxWidth + getPixelWidth(4);
    });
  }

  sections.forEach((elem) => {
    app.stage.addChildAt(elem, 0);
  });

  deviders.forEach((elem) => {
    sectionsContainer.addChild(elem);
  });

  loops.forEach((elem) => {
    loopsContainer.addChild(elem);
  });

  handles.forEach((elem) => {
    handlesContainer.addChild(elem);
  });

  fillings.forEach((elem) => {
    fillingsContainer.addChild(elem);
  });

  fasades.forEach((elem) => {
    fasadesContainer.addChild(elem);
  });

  sectionLables.forEach((elem) => {
    lablesContainer.addChild(elem);
  });

  dementions.forEach((elem) => {
    dementionContainer.addChild(elem);
  });
};

const createModule = ({ x, y, width, height, moduleData }) => {
  const sector = new Container({ isRenderGroup: true });

  sector.position.set(x, y);

  sector.shapes = [];
  sector.sectorData = moduleData;
  sector.sections = sections;

  const cell = new Section(moduleData, width, height, sector, false);
  cell.highlightGraphics.visible = false;

  sector.addChild(cell.cellGraphics);

  sections.push(sector);

  // Создаём ограничения для секторов по высоте
  const sectorBounds = shapeAdjuster.getSectorBounds(sector);
  sector.bound = sectorBounds;

  moduleData.maxY = shapeAdjuster.convertToTen(getMmWidth(sectorBounds.maxY));
  moduleData.minY = shapeAdjuster.convertToTen(getMmWidth(sectorBounds.minY));
  moduleData.maxX = shapeAdjuster.convertToTen(getMmWidth(sectorBounds.maxX));
  moduleData.minX = shapeAdjuster.convertToTen(getMmWidth(sectorBounds.minX));

  moduleData.sector = sector;

  return sector;
};

// Создаём сектора
const createSector = ({
  x,
  y,
  width,
  height,
  cellData,
  section,
  sectionIndex,
  cellIndex,
  gridType,
  _sector = false,
  rowIndex = null,
  row = false,
  extraIndex = null,
  itemIndex = null,
  item = false,
  opacity = 1,
}) => {
  let sector = new Container();

  sector.position.set(x, y);

  sector.shapes = [];
  sector.sectorData = cellData;
  sector.sections = sections;
  sector.fillingsContainer = fillingsContainer;

  sector.secIndex = sectionIndex;
  sector.cellIndex = cellIndex;
  sector.rowIndex = rowIndex;
  sector.extraIndex = extraIndex;

  const cell = new Section(
    cellData,
    width,
    height,
    sector,
    gridType === mode.value,
    opacity,
  );
  const selected =
    gridType === "fasades"
      ? selectedFasade
      : gridType === "filling"
        ? selectedFilling
        : selectedCell;

  if (
    selected.value.sec === sectionIndex &&
    selected.value.cell === cellIndex &&
    selected.value.row === rowIndex &&
    selected.value.extra === extraIndex &&
    (selected.value.item === undefined || selected.value.item === itemIndex)
  ) {
    cell.highlightGraphics.visible = true;
  } else {
    cell.highlightGraphics.visible = false;
  }

  sector.addChild(cell.cellGraphics);
  sector.addChild(cell.highlightGraphics);

  if (gridType === "fasades") {
    fasades.push(sector);
  } else if (!_sector) sections.push(sector);
  else _sector.addChild(sector);

  cellData.fillings?.forEach((data) => {
    createFilling(data, sector);
  });

  if (gridType === "fasades") {
    if (!cellData.manufacturerOffset && mode.value === "fasades") {
      let tmpRowIndex = section.findIndex((item) => item.id === cellData.id);
      cell.cellGraphics.on("pointerdown", () => {
        selectCell(gridType, <TSelectedCell>{
          sec: sectionIndex,
          cell: cellIndex,
          row: tmpRowIndex,
          extra: extraIndex,
          item: null,
        });
      });

      cell.cellGraphics.eventMode = "static";
      cell.cellGraphics.cursor = "pointer";
    }
  } else {
    cell.cellGraphics.on("pointerdown", () => {
      selectCell(gridType, <TSelectedCell>{
        sec: sectionIndex,
        cell: cellIndex,
        row: rowIndex,
        extra: extraIndex,
        item: null,
      });
    });

    cell.cellGraphics.eventMode = "static";
    cell.cellGraphics.cursor = "pointer";
  }

  // Создаём ограничения для секторов по высоте
  if (gridType !== "fasades") {
    const sectorBounds = shapeAdjuster.getTotalBounds(sector, cellData);
    sector.bound = sectorBounds;

    cellData.maxY = shapeAdjuster.convertToTen(getMmWidth(sectorBounds.maxY));
    cellData.minY = shapeAdjuster.convertToTen(getMmWidth(sectorBounds.minY));
  }

  cellData.sector = sector;

  // Рендер линейки расстояний до границ сектора
  let tmpSectorBounds = shapeAdjuster.getSectorBounds(sector);
  let mmSectorBounds = {
    width: getMmWidth(tmpSectorBounds.width),
    height: getMmHeight(tmpSectorBounds.height),
    x: getMmWidth(tmpSectorBounds.x),
    y: getMmHeight(tmpSectorBounds.y),
  };

  sector.shapes.forEach((el) => {
    el.sectorBounds = tmpSectorBounds;
    el.drawBoundaryDistances();
  });

  if (gridType === mode.value) {
    // /** Создаём нумерацию сектора */
    createSectioNum({
      x,
      y,
      width,
      height,
      cell: cellData,
      sectionIndex,
      cellIndex,
      rowIndex,
      extraIndex,
    });

    if (gridType === "module") {
      // /**Создание вертикального драга */
      createVerticalCut({
        width,
        height,
        cell: cellData,
        section,
        sectionIndex,
        sector,
        cellIndex,
        rowIndex,
        extraIndex,
      });
      // /**Создание горизонтального драга */
      createHorozontalCut({
        width,
        height,
        cell: cellData,
        section,
        sectionIndex,
        sector,
        cellIndex,
        rowIndex,
        extraIndex,
      });
    }
  }

  return sector;
};

const createLoop = ({ x, y, width, height, loopData }) => {
  const sector = new Container();

  sector.position.set(x, y);

  sector.shapes = [];
  sector.sectorData = loopData;
  sector.sections = sections;

  const cell = new Section(loopData, width, height, sector, false);
  cell.highlightGraphics.visible = false;
  cell.cellGraphics.eventMode = "static";

  sector.addChild(cell.cellGraphics);

  loops.push(sector);

  console.log(loopData, "LOOOOOOOOOOO");

  // Создаём ограничения для секторов по высоте
  const sectorBounds = shapeAdjuster.getSectorBounds(sector);
  sector.bound = sectorBounds;

  loopData.sector = sector;

  return sector;
};

const createHandle = ({ x, y, width, height, handleData, opacity }) => {
  const sector = new Container();

  sector.position.set(x, y);

  sector.shapes = [];
  sector.sectorData = handleData;
  sector.sections = sections;

  const cell = new Section(handleData, width, height, sector, false, opacity);
  cell.highlightGraphics.visible = false;
  cell.cellGraphics.eventMode = "static";

  sector.addChild(cell.cellGraphics);

  handles.push(sector);

  // Создаём ограничения для секторов по высоте
  const sectorBounds = shapeAdjuster.getSectorBounds(sector);
  sector.bound = sectorBounds;

  handleData.sector = sector;

  return sector;
};

const createFilling = (data, sector) => {
  let sectorXMMPos = getMmWidth(sector.position.x);
  let sectorYMMPos = getMmHeight(sector.position.y);

  if (
    !data.isProfile &&
    !data.isVerticalItem &&
    data.position.x !== sectorXMMPos
  ) {
    data.position.x = sectorXMMPos;
  } else if (data.isVerticalItem && data.position.y !== sectorYMMPos) {
    data.position.y = sectorYMMPos;
  }

  const filling = new Shape({
    type: data.type,
    position: data.position,
    sector,
    data,
    select: selectCell,
    render: renderGrid,
    getMmWidth,
    getMmHeight,
    getPixelHeight,
    getPixelWidth,
    calcDrawersFasades,
    checkLoopsCollision,
    dementions,
    dementionContainer,
    dragActive: mode.value === "fillings",
  });

  data.sector = filling.sector;

  if (mode.value === "fillings") {
    createSectioNum({
      x: getPixelWidth(filling.data.position.x),
      y: getPixelHeight(filling.data.position.y),
      width: filling.data.width,
      height: filling.data.height,
      cell: filling.data,
      sectionIndex: filling.data.sec,
      cellIndex: filling.data.cell,
      rowIndex: filling.data.row,
      extraIndex: filling.data.extra,
      itemIndex: filling.data.id,
    });

    filling.graphic.on("pointerdown", () => {
      selectCell("fillings", <TSelectedCell>{
        sec: filling.data.sec,
        cell: filling.data.cell,
        row: filling.data.row,
        extra: filling.data.extra,
        item: filling.data.id,
      });
    });
  }

  if (
    selectedFilling.value.sec === filling.data.sec &&
    selectedFilling.value.cell === filling.data.cell &&
    selectedFilling.value.row === filling.data.row &&
    selectedFilling.value.extra === filling.data.extra &&
    selectedFilling.value.item === filling.data.id
  ) {
    filling.highlightGraphics.visible = true;
  } else {
    filling.highlightGraphics.visible = false;
  }

  fillings.push(filling.graphic);
  fillings.push(filling.highlightGraphics);
  sector.shapes.push(filling);
};

// Отрисовываем номер ячейки
const createSectioNum = ({
  x,
  y,
  width,
  height,
  cell,
  sectionIndex,
  cellIndex,
  rowIndex = null,
  itemIndex = null,
  extraIndex = null,
}) => {
  const pxWidth = getPixelWidth(cell.width);
  const pxHeight = getPixelHeight(cell.height);

  const xOffset = cell.xOffset || x;
  const yOffset = cell.yOffset || y;
  const opacity = cell.type == "fasade" ? 1 : 0.4;

  let text;

  if (sectionIndex === null) {
    text =
      rowIndex !== null
        ? `${cellIndex + 1}.${rowIndex + 1}`
        : `${cellIndex + 1}`;
  } else {
    text =
      rowIndex !== null
        ? `${sectionIndex + 1}.${cellIndex + 1}.${rowIndex + 1}`
        : `${sectionIndex + 1}.${cellIndex + 1}`;
  }

  if (extraIndex !== null) text += `.${extraIndex + 1}`;

  if (itemIndex !== null) text += ` ${itemIndex}`;

  const cellNumber = new Text({
    text: text,
    style: { fontSize: 14, fill: "#131313", align: "center", alpha: opacity },
  });

  cellNumber.anchor.set(0.5);
  cellNumber.x = xOffset + pxWidth / 2;
  cellNumber.y = yOffset + pxHeight / 2;

  const labelWidth = cellNumber.width + 4;

  const cellNumberBackground = new Graphics();
  cellNumberBackground.roundRect(
    xOffset + pxWidth / 2 - labelWidth / 2,
    yOffset + pxHeight / 2 - 13,
    labelWidth,
    26,
    5,
  );
  cellNumberBackground.fill({ color: "#ffffff", alpha: opacity });
  cellNumberBackground.stroke({ width: 1, color: "black", alpha: opacity });

  cellNumber.interactive = false;
  cellNumberBackground.interactive = false;

  sectionLables.push(cellNumberBackground);
  sectionLables.push(cellNumber);
};

// Отрисовываем вертикальный драг
const createVerticalCut = ({
  width,
  height,
  cell,
  section,
  sectionIndex,
  sector,
  cellIndex = null,
  rowIndex = null,
  extraIndex = null,
}) => {
  let _cellIndex = cellIndex;
  let _rowIndex = rowIndex;
  let _extraIndex = extraIndex;
  let _cell = cell;

  const curSec = module.value.sections[sectionIndex];
  const curCell = curSec?.cells?.[_cellIndex];
  const curRow = curCell?.cellsRows?.[_rowIndex];
  const curExtra = curRow?.extras?.[_extraIndex];

  switch (_cell.type) {
    case "rowCell":
      if (
        _rowIndex == curCell.cellsRows?.length - 1 &&
        sectionIndex < module.value.sections.length - 1
      ) {
        _cellIndex = null;
        _rowIndex = null;
        _extraIndex = null;

        _cell = curSec;
        break;
      }

      if (!(_rowIndex < curCell.cellsRows?.length - 1)) return;
      break;
    case "section":
      if (!(sectionIndex < section.length - 1)) return;
      break;
    case "rowExtra":
      if (
        _rowIndex == curCell.cellsRows?.length - 1 &&
        sectionIndex < module.value.sections.length - 1
      ) {
        _cellIndex = null;
        _rowIndex = null;
        _extraIndex = null;

        _cell = curSec;
        break;
      }

      if (_rowIndex < curCell.cellsRows?.length - 1) {
        _extraIndex = null;
      } else return;
      break;
    case "cell":
      if (sectionIndex < module.value.sections.length - 1) {
        _cellIndex = null;
        _rowIndex = null;
        _extraIndex = null;

        _cell = curSec;
      } else return;

      break;
    default:
      return;
  }

  const pxWidth = getPixelWidth(_cell.width);
  const convertTotalHeight =
    _rowIndex !== null
      ? getPixelHeight(_cell.height)
      : getPixelHeight(curSec.height);

  const divider = new Graphics();
  const dashVert = new Graphics();

  divider.rect(
    0,
    0,
    getPixelWidth(module.value.moduleThickness + 4),
    convertTotalHeight,
  );

  divider.fill("#4bef61");
  divider.alpha = 0;

  divider.eventMode = "static";
  divider.cursor = "section-resize";
  divider.section = sectionIndex;
  divider.cell = _cellIndex;
  divider.row = _rowIndex;

  dashVert.rect(0, 0, 0, convertTotalHeight);
  dashVert.stroke({ width: 1, color: "#5D6069" });
  divider.dev_name = `dev${divider.uid}`;

  divider.position.set(
    _cell.xOffset + pxWidth - getPixelWidth(2),
    _cell.yOffset,
  );
  dashVert.position.set(
    _cell.xOffset + pxWidth - getPixelWidth(2),
    _cell.yOffset,
  );
  divider.toColideCheck = dashVert;

  divider.on("pointerdown", onVerticalDragStart);
  divider.on("pointerup", () => {
    setTimeout(() => {
      renderGrid();
    }, 100);
  });
  divider.on("pointerupoutside", () => {
    setTimeout(() => {
      renderGrid();
    }, 100);
  });

  deviders.push(divider);
};

// Отрисовываем горизонтальный драг
const createHorozontalCut = ({
  width,
  height,
  cell,
  section,
  sectionIndex,
  sector,
  cellIndex = null,
  rowIndex = null,
  extraIndex = null,
}) => {
  let _cellIndex = cellIndex;
  let _rowIndex = rowIndex;
  let _extraIndex = extraIndex;
  let _cell = cell;

  const curSec = module.value.sections[sectionIndex];
  const curCell = curSec?.cells?.[_cellIndex];
  const curRow = curCell?.cellsRows?.[_rowIndex];
  const curExtra = curRow?.extras?.[_extraIndex];

  switch (_cell.type) {
    case "rowExtra":
      if (!curExtra) {
        return;
      }
      if (_extraIndex !== null && !(_extraIndex < curRow.extras?.length - 1)) {
        if (!(_cellIndex < curSec.cells.length - 1)) {
          return;
        }

        _extraIndex = null;
        _rowIndex = null;

        _cell = curSec.cells[_cellIndex];
      }
      break;
    case "cell":
      if (_cellIndex === null || !(_cellIndex < curSec.cells.length - 1))
        return;
      break;
    default:
      if (_rowIndex !== null && !(_rowIndex < curCell.cellsRows?.length - 1)) {
        if (!(_cellIndex < curSec.cells.length - 1)) {
          return;
        }

        _rowIndex = null;
        _extraIndex = null;

        _cell = curSec.cells[_cellIndex];
      } else return;
      break;
  }

  const pxWidth = getPixelWidth(_cell.width);
  const pxHeight = getPixelHeight(_cell.height);

  const divider = new Graphics();
  const dashHor = new Graphics();

  divider.rect(
    _cell.xOffset,
    _cell.yOffset + pxHeight - getPixelHeight(2),
    pxWidth,
    getPixelHeight(module.value.moduleThickness + 4),
  );
  divider.fill("#c53545");
  divider.alpha = 0;
  divider.eventMode = "static";
  divider.cursor = "cell-resize";
  divider.section = sectionIndex;
  divider.cell = _cellIndex;
  divider.row = _rowIndex;
  divider.extra = _extraIndex;

  dashHor.rect(
    _cell.xOffset,
    _cell.yOffset + pxHeight - getPixelHeight(2),
    pxWidth,
    0,
  );
  dashHor.stroke({ width: 1, color: "#5D6069" });

  divider.on("pointerdown", onHorizontalDragStart);
  divider.on("pointerup", () => {
    setTimeout(() => {
      renderGrid();
    }, 100);
  });
  divider.on("pointerupoutside", () => {
    setTimeout(() => {
      renderGrid();
    }, 100);
  });

  deviders.push(divider);
};

const checkPositionFillingToCreate = (data) => {
  const { sec, cell, row, extra } =
    UMconstructor?.value?.UM_STORE.getSelected("module");

  let position, tempShape;

  const sector = sections[0].children.find(
    (elem) =>
      elem.secIndex === sec &&
      elem.cellIndex === cell &&
      elem.rowIndex === row &&
      elem.extraIndex === extra,
  );

  if (!sector) {
    return false;
  }

  tempShape = new Shape({
    type: data.type,
    sector,
    position: { x: 0, y: 0 },
    data,
    getMmWidth,
    getMmHeight,
    getPixelHeight,
    getPixelWidth,
    calcDrawersFasades,
    checkLoopsCollision,
  });

  /** Проверяем на возможность размещения отверстия */

  position = shapeAdjuster.getRandomPosition(sector, tempShape);

  if (!position) {
    return false;
  }

  return {
    x: Math.round(getMmWidth(position.x)),
    y: Math.round(getMmHeight(position.y)),
    width: data.width,
    height: data.height,
    type: data.type,
    PROPS: data,
  };
};

// Выбор сектора, передача в родительский компонент
const selectCell = (type: string, newSelectedCell: TSelectedCell) => {
  switch (type) {
    case "fillings": {
      UMconstructor?.value?.UM_STORE.setSelected(type, newSelectedCell);
      UMconstructor?.value?.UM_STORE.setSelected("module", newSelectedCell);
      const { sec, cell, row, extra, item } =
        UMconstructor?.value?.UM_STORE.getSelected("fillings");
      toggleFillingColor(sec, cell, row, item, extra);
      break;
    }
    case "fasades": {
      UMconstructor?.value?.UM_STORE.setSelected(type, newSelectedCell);
      UMconstructor?.value?.UM_STORE.setSelected("module", <TSelectedCell>{
        sec: newSelectedCell.sec,
      });
      const { sec, cell, row } =
        UMconstructor?.value?.UM_STORE.getSelected("fasades");
      toggleFasadeColor(sec, cell, row);
      break;
    }
    default: {
      UMconstructor?.value?.UM_STORE.setSelected(type, newSelectedCell);
      UMconstructor?.value?.UM_STORE.setSelected("fillings", newSelectedCell);
      const { sec, cell, row, extra } =
        UMconstructor?.value?.UM_STORE.getSelected("module");
      toggleSectionColor(sec, cell, row, extra);
      break;
    }
  }
  /*if (!parent)
    emit("cell-selected", sectionIndex, cellIndex, type, rowIndex, item, extraIndex);*/
};

const toggleSectionColor = (
  sectionIndex,
  cellIndex,
  rowIndex = null,
  extraIndex = null,
) => {
  const section = props.module.sections[sectionIndex];
  const cell = section?.cells[cellIndex];
  const row = cell?.cellsRows?.[rowIndex];
  const extra = row?.extras?.[extraIndex];

  const sector =
    extra?.sector ||
    row?.sector ||
    cell?.sector ||
    section?.sector ||
    props.module.sector;

  sections[0].children.forEach((elem) => {
    if (elem.children[1]) elem.children[1].visible = false;
    // elem.children[0].alpha = 1;
  });
  if (sector?.children[1]) sector.children[1].visible = true;
  // sector.children[0].alpha = 0.5;
};

const checkSectorsCollision = (currShape, targetSector) => {
  return shapeAdjuster.checkToCollision(targetSector, false, currShape);
};

const toggleFasadeColor = (sectionIndex, doorIndex, segmentIndex = 0) => {
  const _fasades =
    sectionIndex === null
      ? module?.value?.fasades
      : props.module.sections[sectionIndex].fasades;
  const door = _fasades[doorIndex];
  const segment = door?.[segmentIndex];

  const sector = segment?.sector || door?.sector;

  fasades.forEach((elem) => {
    if (elem.children[1]) elem.children[1].visible = false;
    // elem.children[0].alpha = 1;
  });
  if (sector?.children[1]) sector.children[1].visible = true;
  // sector.children[0].alpha = 0.5;
};

const toggleFillingColor = (
  sectionIndex,
  cellIndex,
  rowIndex = null,
  itemIndex = null,
  extraIndex = null,
) => {
  const section = props.module.sections[sectionIndex];
  const cell = section?.cells[cellIndex];
  const row = cell?.cellsRows?.[rowIndex];
  const extra = row?.extras?.[extraIndex];

  const curSegment = extra || row || cell || section || props.module;
  const sector = curSegment?.fillings?.[itemIndex]?.sector;

  sections[0].children.forEach((elem) => {
    if (elem.children[1]) elem.children[1].visible = false;
    // elem.children[0].alpha = 1;
  });
  if (sector?.children[1]) sector.children[1].visible = true;
  // sector.children[0].alpha = 0.5;
};

// Обработчик для вертикального перетаскивания (между колонками)
function onVerticalDragStart(event) {
  const module = props.module;
  // event.stopPropagation();
  cursorCheck = true;
  const sectionIndex = this.section;
  const cellIndex = this.cell;
  const rowIndex = this.row;
  const extraIndex = this.extra;

  const column = module.sections[sectionIndex];
  const cell = column.cells?.[cellIndex];
  const row = cell?.cellsRows?.[rowIndex];
  const extra = row?.extras?.[extraIndex];

  const cur = row || cell || column;

  let next = {};
  let nextSector, curSector;
  switch (cur.type) {
    case "section":
      if (!cur.sector) {
        curSector =
          cur.cells[0].sector ||
          cur.cells[0].cellsRows[cur.cells[0].cellsRows.length - 1].sector ||
          cur.cells[0].cellsRows[cur.cells[0].cellsRows.length - 1].extras[0]
            .sector;
      } else curSector = cur.sector;

      next = module.sections[sectionIndex + 1];
      if (!next.sector) {
        nextSector =
          next.cells[0].sector ||
          next.cells[0].cellsRows[0].sector ||
          next.cells[0].cellsRows[next.cells[0].cellsRows.length - 1].extras[0]
            .sector;
      } else nextSector = next.sector;
      break;
    case "cell":
      if (!cur.sector) {
        curSector =
          cur.cells[0].cellsRows[cur.cells[0].cellsRows.length - 1].sector ||
          cur.cells[0].cellsRows[cur.cells[0].cellsRows.length - 1].extras[0]
            .sector;
      } else curSector = cur.sector;

      next = module.sections[sectionIndex + 1];
      if (!next.sector) {
        nextSector =
          next.cells[0].sector ||
          next.cells[0].cellsRows[0].sector ||
          next.cells[0].cellsRows[next.cells[0].cellsRows.length - 1].extras[0]
            .sector;
      } else nextSector = next.sector;
      break;
    case "rowCell":
      if (!cur.sector) {
        curSector = cur.extras[0].sector;
      } else curSector = cur.sector;

      next = cell.cellsRows[rowIndex + 1];

      if (!next.sector) {
        nextSector = next.extras[0].sector;
      } else nextSector = next.sector;
      break;
    case "rowExtra":
      curSector = cur.sector;

      next = cell.cellsRows[rowIndex + 1];
      if (!next.sector) {
        nextSector = next.extras[0].sector;
      } else nextSector = next.sector;
      break;
  }

  dragState.isDragging = true;
  dragState.type = "vertical";

  dragState.secIndex = sectionIndex;
  dragState.cellIndex = cellIndex;
  dragState.rowIndex =
    rowIndex !== null && cell.cellsRows[rowIndex + 1] ? rowIndex : null;
  dragState.extraIndex = null;
  dragState.startX = event.data.global.x;

  dragState.startLeftWidth = cur.width;
  dragState.startRightWidth = next.width;

  let curMin = cur.maxX;
  if (cur.cells?.length) {
    let count = 1;
    cur.cells.forEach((elem) => {
      if (elem.cellsRows?.length > count) {
        count = elem.cellsRows.length;
      }
    });

    curMin = Math.max(
      curMin,
      MIN_SECTION_WIDTH * count + module.moduleThickness * (count - 1),
    );
    dragState.minXleft = curMin;
  } else
    dragState.minXleft = shapeAdjuster.getLeftSectionWidth(curSector, curMin);

  let nextMin = next.minX;
  if (next.cells?.length) {
    let count = 1;
    next.cells.forEach((elem) => {
      if (elem.cellsRows?.length > count) {
        count = elem.cellsRows.length;
      }
    });

    nextMin = Math.max(
      nextMin,
      MIN_SECTION_WIDTH * count + module.moduleThickness * (count - 1),
    );
    dragState.minXRight = nextMin;
  } else
    dragState.minXRight = shapeAdjuster.getRightSectionWidth(
      nextSector,
      nextMin,
    );

  dragState.element = this;
  this.onDrag = true;

  app.stage.on("pointermove", onDragMove);
  app.stage.on("pointerup", onDragEnd);
  app.stage.on("pointerupoutside", onDragEnd);
}

// Обработчик для горизонтального перетаскивания (между строками)
function onHorizontalDragStart(event) {
  // event.stopPropagation();

  const module = props.module;
  // event.stopPropagation();
  cursorCheck = true;
  const sectionIndex = this.section;
  const cellIndex = this.cell;
  const rowIndex = this.row;
  const extraIndex = this.extra;

  const column = module.sections[sectionIndex];
  const cell = column.cells?.[cellIndex];
  const row = cell?.cellsRows?.[rowIndex];
  const extra = row?.extras?.[extraIndex];

  const cur = extra || row || cell;

  let next = {};
  let nextSector, curSector;
  switch (cur.type) {
    case "cell":
      if (!cur.sector) {
        curSector =
          cur.cellsRows[0].sector ||
          cur.cellsRows[0].extras[cur.cellsRows[0].extras.length - 1].sector;
      } else curSector = cur.sector;

      next = column.cells[cellIndex + 1];
      if (!next.sector) {
        nextSector =
          next.cellsRows[0].sector || next.cellsRows[0].extras[0].sector;
      } else nextSector = next.sector;
      break;
    case "rowCell":
      if (!cur.sector) {
        curSector = cur.extras[cur.extras.length - 1].sector;
      } else curSector = cur.sector;

      next = cell.cellsRows[rowIndex + 1];

      if (!next.sector) {
        nextSector = next.extras[0].sector;
      } else nextSector = next.sector;
      break;
    case "rowExtra":
      curSector = cur.sector;
      next = row.extras[extraIndex + 1];
      nextSector = next.sector;
      break;
  }

  // event.currentTarget.alpha = 0.5;
  dragState.element = this;
  this.onDrag = true;
  dragState.isDragging = true;
  dragState.type = "horizontal";

  dragState.secIndex = sectionIndex;
  dragState.cellIndex = cellIndex;
  dragState.rowIndex = rowIndex;
  dragState.extraIndex = extraIndex;

  dragState.startY = event.data.global.y;
  dragState.startTopHeight = cur.height;
  dragState.startBottomHeight = next.height;

  let curMin = cur.maxY;
  if (cur.cellsRows?.length) {
    let count = 1;
    cur.cellsRows.forEach((elem) => {
      if (elem.extras?.length > count) {
        count = elem.extras.length;
      }
    });

    curMin = Math.max(
      curMin,
      MIN_SECTION_HEIGHT * count + module.moduleThickness * (count - 1),
    );
    dragState.minTop = curMin;
  } else dragState.minTop = shapeAdjuster.getSectionTop(curSector, curMin);

  let nextMin = next.minY;
  if (next.cellsRows?.length) {
    let count = 1;
    next.cellsRows.forEach((elem) => {
      if (elem.extras?.length > count) {
        count = elem.extras.length;
      }
    });

    nextMin = Math.max(
      nextMin,
      MIN_SECTION_HEIGHT * count + module.moduleThickness * (count - 1),
    );
    dragState.minBottom = nextMin;
  } else
    dragState.minBottom = shapeAdjuster.getSectionBottom(nextSector, nextMin);

  app.stage.on("pointermove", onDragMove);
  app.stage.on("pointerup", onDragEnd);
  app.stage.on("pointerupoutside", onDragEnd);
}

function onDragMove(event) {
  if (!event) return;

  lastDragEvent.value = event;
}

function dragMove(event) {
  if (!dragState.isDragging || !lastDragEvent.value) return;

  const {
    type,
    secIndex,
    cellIndex,
    rowIndex,
    extraIndex,
    startX,
    startY,
    startLeftWidth,
    startRightWidth,
    startTopHeight,
    startBottomHeight,
    minXleft,
    minXRight,
    minTop,
    minBottom,
    element,
  } = dragState;

  if (type === "vertical") {
    let curMin =
      minXleft < MIN_SECTION_WIDTH
        ? MIN_SECTION_WIDTH
        : minXleft || MIN_SECTION_WIDTH;
    let nextMin =
      minXRight < MIN_SECTION_WIDTH
        ? MIN_SECTION_WIDTH
        : minXRight || MIN_SECTION_WIDTH;

    const deltaPixels = event.data.global.x - startX;

    element.position.x =
      Math.floor(event.data.global.x / props.step) * props.step;
    let deltaMm =
      Math.floor((deltaPixels * pixelRatioWidth.value) / props.step) *
      props.step;

    if (deltaMm === 0) return;

    let section = props.module.sections[secIndex];
    let cell = section.cells[cellIndex];
    let row = cell?.cellsRows?.[rowIndex];
    let extra = row?.extras?.[extraIndex];

    // Calculate new dimensions
    let newLeftWidth = startLeftWidth + deltaMm;
    let newRightWidth = startRightWidth - deltaMm;

    // Enforce minimum dimensions
    if (newLeftWidth < curMin) {
      deltaMm += curMin - newLeftWidth;
      newLeftWidth = curMin;
      newRightWidth = startRightWidth - deltaMm;
    } else if (newRightWidth < nextMin) {
      deltaMm -= nextMin - newRightWidth;
      newRightWidth = nextMin;
      newLeftWidth = startLeftWidth + deltaMm;
    }

    if (row) {
      row.width = newLeftWidth;

      row.extras?.forEach((item) => {
        item.width = row.width;

        if (item.fillings?.length) {
          item.fillings.forEach((filling) => {
            filling.width = item.width;
            filling.size.x = filling.width;
          });
        }
      });

      let nextRow = cell.cellsRows[rowIndex + 1];
      let delta2 = nextRow.width - newRightWidth;
      nextRow.position.x += delta2 / 2;
      nextRow.width = newRightWidth;

      nextRow.extras?.forEach((item) => {
        item.width = nextRow.width;
        item.position.x = nextRow.position.x;

        if (item.fillings?.length) {
          item.fillings.forEach((filling) => {
            filling.width = item.width;
            filling.size.x = filling.width;
          });
        }
      });

      if (row.fillings?.length) {
        row.fillings.forEach((filling) => {
          filling.width = row.width;
          filling.size.x = filling.width;
        });
      }

      if (nextRow.fillings?.length) {
        nextRow.fillings.forEach((filling) => {
          filling.width = nextRow.width;
          filling.size.x = filling.width;
          filling.position.x += delta2 / 2;
        });
      }
    } else {
      let next = props.module.sections[secIndex + 1];
      let prev = props.module.sections[secIndex - 1];

      let nextSection = next || prev;

      let delta1 = section.width - newLeftWidth;
      let deltaPos1 = next ? -delta1 / 2 : delta1 / 2;
      section.width = newLeftWidth;
      section.position.x += deltaPos1;

      section.cells.forEach((cell) => {
        cell.width = section.width;
        cell.position.x = section.position.x;

        if (cell.cellsRows?.length) {
          let divideDelta = Math.floor(-delta1 / cell.cellsRows.length);
          let divideDeltaPos1 = next ? divideDelta / 2 : -divideDelta / 2;
          let extraSize =
            (cell.cellsRows.length - 1) * module.value.moduleThickness;

          cell.cellsRows.forEach((item) => {
            if (item.width + divideDelta >= MIN_SECTION_WIDTH) {
              item.width += divideDelta;
              item.position.x += divideDeltaPos1;

              item.extras?.forEach((extra) => {
                extra.width = item.width;
                extra.position.x = item.position.x;

                if (extra.fillings?.length) {
                  extra.fillings.forEach((filling) => {
                    if (filling.isVerticalItem) {
                      filling.position.x += divideDeltaPos1;
                    } else {
                      filling.width = extra.width;
                      filling.size.x = filling.width;
                      filling.position.x += item.position.x - item.width / 2;
                    }
                  });
                }
              });

              if (item.fillings?.length) {
                item.fillings.forEach((filling) => {
                  if (filling.isVerticalItem) {
                    filling.position.x += divideDeltaPos1;
                  } else {
                    filling.width = item.width;
                    filling.size.x = filling.width;
                    filling.position.x = item.position.x - item.width / 2;
                  }
                });
              }
            } else {
              item.width = MIN_SECTION_WIDTH;
            }

            extraSize += item.width;
          });

          let lastRow = next
            ? cell.cellsRows[cell.cellsRows.length - 1]
            : cell.cellsRows[0];
          if (lastRow.width + (newLeftWidth - extraSize) >= MIN_SECTION_WIDTH) {
            lastRow.width += newLeftWidth - extraSize;
            lastRow.position.x += (newLeftWidth - extraSize) / 2;

            lastRow.fillings?.forEach((filling) => {
              if (filling.isVerticalItem) {
                filling.position.x += (newLeftWidth - extraSize) / 2;
              } else {
                filling.width = lastRow.width;
                filling.size.x = filling.width;
                filling.position.x = lastRow.position.x - lastRow.width / 2;
              }
            });

            lastRow.extras?.forEach((extra) => {
              extra.width = lastRow.width;
              extra.position.x = lastRow.position.x;

              extra.fillings?.forEach((filling) => {
                if (filling.isVerticalItem) {
                  filling.position.x += (newLeftWidth - extraSize) / 2;
                } else {
                  filling.width = extra.width;
                  filling.size.x = filling.width;
                  filling.position.x = extra.position.x - extra.width / 2;
                }
              });
            });
          } else {
            lastRow = cell.cellsRows.find((item) => {
              return (
                item.width + (newLeftWidth - extraSize) >= MIN_SECTION_WIDTH
              );
            });

            if (lastRow) {
              lastRow.width += newLeftWidth - extraSize;
              lastRow.position.x += (newLeftWidth - extraSize) / 2;

              lastRow.fillings?.forEach((filling) => {
                if (filling.isVerticalItem) {
                  filling.position.x += (newLeftWidth - extraSize) / 2;
                } else {
                  filling.width = lastRow.width;
                  filling.size.x = filling.width;
                  filling.position.x = lastRow.position.x - lastRow.width / 2;
                }
              });

              lastRow.extras?.forEach((extra) => {
                extra.width = lastRow.width;
                extra.position.x = lastRow.position.x;

                extra.fillings?.forEach((filling) => {
                  if (filling.isVerticalItem) {
                    filling.position.x += (newLeftWidth - extraSize) / 2;
                  } else {
                    filling.width = extra.width;
                    filling.size.x = filling.width;
                    filling.position.x = extra.position.x - extra.width / 2;
                  }
                });
              });
            }
          }
        }

        if (cell.fillings?.length) {
          cell.fillings.forEach((filling) => {
            if (filling.isVerticalItem) {
              filling.position.x += deltaPos1;
            } else {
              filling.width = cell.width;
              filling.size.x = filling.width;
              filling.position.x = cell.position.x - cell.width / 2;
            }
          });
        }
      });

      if (section.fillings?.length) {
        section.fillings.forEach((filling) => {
          if (filling.isVerticalItem) {
            filling.position.x += deltaPos1;
          } else {
            filling.width = section.width;
            filling.size.x = filling.width;
            filling.position.x = section.position.x - section.width / 2;
          }
        });
      }

      let delta2 = nextSection.width - newRightWidth;
      nextSection.width = newRightWidth;
      nextSection.position.x += deltaPos1;

      nextSection.cells.forEach((cell) => {
        cell.width = nextSection.width;
        cell.position.x = nextSection.position.x;

        if (cell.cellsRows?.length) {
          let divideDelta = Math.floor(-delta2 / cell.cellsRows.length);
          let divideDeltaPos = next ? -divideDelta / 2 : divideDelta / 2;
          let extraSize =
            (cell.cellsRows.length - 1) * module.value.moduleThickness;

          cell.cellsRows.forEach((item) => {
            if (item.width + divideDelta >= MIN_SECTION_WIDTH) {
              item.width += divideDelta;
              item.position.x += divideDeltaPos;

              item.extras?.forEach((extra) => {
                extra.width = item.width;
                extra.position.x = item.position.x;

                if (extra.fillings?.length) {
                  extra.fillings.forEach((filling) => {
                    if (filling.isVerticalItem) {
                      filling.position.x += divideDeltaPos;
                    } else {
                      filling.width = extra.width;
                      filling.size.x = filling.width;
                      filling.position.x += deltaPos1;
                    }
                  });
                }
              });

              if (item.fillings?.length) {
                item.fillings.forEach((filling) => {
                  if (filling.isVerticalItem) {
                    filling.position.x += divideDeltaPos;
                  } else {
                    filling.width = item.width;
                    filling.size.x = filling.width;
                    filling.position.x = deltaPos1;
                  }
                });
              }
            } else {
              item.width = MIN_SECTION_WIDTH;
            }

            extraSize += item.width;
          });

          let lastRow = next
            ? cell.cellsRows[0]
            : cell.cellsRows[cell.cellsRows.length - 1];

          if (
            lastRow.width + (newRightWidth - extraSize) >=
            MIN_SECTION_WIDTH
          ) {
            lastRow.width += newRightWidth - extraSize;
            lastRow.position.x += (newRightWidth - extraSize) / 2;

            lastRow.fillings?.forEach((filling) => {
              if (filling.isVerticalItem) {
                filling.position.x += (newRightWidth - extraSize) / 2;
              } else {
                filling.width = lastRow.width;
                filling.size.x = filling.width;
                filling.position.x = lastRow.position.x - lastRow.width / 2;
              }
            });

            lastRow.extras?.forEach((extra) => {
              extra.width = lastRow.width;
              extra.position.x = lastRow.position.x;

              extra.fillings?.forEach((filling) => {
                if (filling.isVerticalItem) {
                  filling.position.x += (newRightWidth - extraSize) / 2;
                } else {
                  filling.width = extra.width;
                  filling.size.x = filling.width;
                  filling.position.x = extra.position.x - extra.width / 2;
                }
              });
            });
          } else {
            lastRow = cell.cellsRows.find((item) => {
              return (
                item.width + (newRightWidth - extraSize) >= MIN_SECTION_WIDTH
              );
            });

            if (lastRow) {
              lastRow.width += newRightWidth - extraSize;
              lastRow.position.x += (newRightWidth - extraSize) / 2;

              lastRow.fillings?.forEach((filling) => {
                if (filling.isVerticalItem) {
                  filling.position.x += (newRightWidth - extraSize) / 2;
                } else {
                  filling.width = lastRow.width;
                  filling.size.x = filling.width;
                  filling.position.x = lastRow.position.x - lastRow.width / 2;
                }
              });

              lastRow.extras?.forEach((extra) => {
                extra.width = lastRow.width;
                extra.position.x = lastRow.position.x;

                extra.fillings?.forEach((filling) => {
                  if (filling.isVerticalItem) {
                    filling.position.x += (newRightWidth - extraSize) / 2;
                  } else {
                    filling.width = extra.width;
                    filling.size.x = filling.width;
                    filling.position.x = extra.position.x - extra.width / 2;
                  }
                });
              });
            }
          }
        }

        if (cell.fillings?.length) {
          cell.fillings.forEach((filling) => {
            if (filling.isVerticalItem) {
              filling.position.x += deltaPos1;
            } else {
              filling.width = cell.width;
              filling.size.x = filling.width;
              filling.position.x = cell.position.x - cell.width / 2;
            }
          });
        }
      });

      if (nextSection.fillings?.length) {
        nextSection.fillings.forEach((filling) => {
          if (filling.isVerticalItem) {
            filling.position.x += deltaPos1;
          } else {
            filling.width = nextSection.width;
            filling.size.x = filling.width;
            filling.position.x = nextSection.position.x - nextSection.width / 2;
          }
        });
      }
    }
  } else if (type === "horizontal") {
    let curMin =
      minTop < MIN_SECTION_HEIGHT
        ? MIN_SECTION_HEIGHT
        : minTop || MIN_SECTION_HEIGHT;
    let nextMin =
      minBottom < MIN_SECTION_HEIGHT
        ? MIN_SECTION_HEIGHT
        : minBottom || MIN_SECTION_HEIGHT;

    const deltaPixels = event.data.global.y - startY;

    element.position.y =
      Math.floor(event.data.global.y / props.step) * props.step;
    const deltaMm =
      Math.floor((deltaPixels * pixelRatioHeight.value) / props.step) *
      props.step;

    if (deltaMm === 0) return;

    let section = props.module.sections[secIndex];
    let cell = section.cells[cellIndex];
    let row = cell?.cellsRows?.[rowIndex];
    let extra = row?.extras?.[extraIndex];

    // Calculate new dimensions
    let newTopHeight = startTopHeight + deltaMm;
    let newBottomHeight = startBottomHeight - deltaMm;

    // Enforce minimum dimensions
    if (newTopHeight < curMin) {
      newTopHeight = curMin;
      newBottomHeight = startTopHeight + startBottomHeight - curMin;
    } else if (newBottomHeight < nextMin) {
      newBottomHeight = nextMin;
      newTopHeight = startTopHeight + startBottomHeight - nextMin;
    }

    if (extra) {
      let delta1 = newTopHeight - extra.height;
      extra.height = newTopHeight;
      extra.position.y += -delta1;

      let nextExtra = row.extras[extraIndex + 1];
      nextExtra.height = newBottomHeight;
    } else {
      let delta1 = cell.height - newTopHeight;
      cell.height = newTopHeight;
      cell.position.y += delta1;

      if (cell.cellsRows?.length) {
        cell.cellsRows.forEach((row) => {
          row.height = newTopHeight;
          row.position.y = cell.position.y;

          if (row.fillings?.length) {
            row.fillings.forEach((filling) => {
              if (filling.isVerticalItem) {
                filling.position.y = row.position.y;
                filling.height = row.height;
                filling.size.y = filling.height;
                filling.distances.bottom = 0;
                filling.distances.top = 0;
              }
            });
          }

          if (row.extras?.length) {
            let divideDelta = Math.floor(-delta1 / row.extras.length);
            let divideDeltaPos1 = divideDelta;
            let extraSize =
              (row.extras.length - 1) * module.value.moduleThickness;

            row.extras.forEach((item) => {
              if (item.height + divideDelta >= MIN_SECTION_HEIGHT) {
                item.height += divideDelta;

                if (item.fillings?.length) {
                  item.fillings.forEach((filling) => {
                    if (filling.isVerticalItem) {
                      filling.position.y = item.position.y;
                      filling.height = item.height;
                      filling.size.y = filling.height;
                      filling.distances.bottom = 0;
                      filling.distances.top = 0;
                    } else {
                      filling.position.y += divideDeltaPos1;
                    }
                  });
                }
              } else {
                item.height = MIN_SECTION_HEIGHT;
              }

              extraSize += item.height;
            });

            let lastRow = row.extras[row.extras.length - 1];
            if (
              lastRow.height + (newTopHeight - extraSize) >=
              MIN_SECTION_HEIGHT
            ) {
              lastRow.height += newTopHeight - extraSize;
              lastRow.position.y += (newTopHeight - extraSize) / 2;

              if (lastRow.fillings?.length) {
                lastRow.fillings.forEach((filling) => {
                  if (filling.isVerticalItem) {
                    filling.position.y = lastRow.position.y;
                    filling.height = lastRow.height;
                    filling.size.y = filling.height;
                    filling.distances.bottom = 0;
                    filling.distances.top = 0;
                  } else {
                    filling.position.y += (newTopHeight - extraSize) / 2;
                  }
                });
              }
            } else {
              lastRow = row.extras.find((item) => {
                return (
                  item.height + (newTopHeight - extraSize) >= MIN_SECTION_HEIGHT
                );
              });

              if (lastRow) {
                lastRow.height += newTopHeight - extraSize;
                lastRow.position.y += (newTopHeight - extraSize) / 2;

                if (lastRow.fillings?.length) {
                  lastRow.fillings.forEach((filling) => {
                    if (filling.isVerticalItem) {
                      filling.position.y = lastRow.position.y;
                      filling.height = lastRow.height;
                      filling.size.y = filling.height;
                      filling.distances.bottom = 0;
                      filling.distances.top = 0;
                    } else {
                      filling.position.y += (newTopHeight - extraSize) / 2;
                    }
                  });
                }
              }
            }
          }
        });
      }

      if (cell.fillings?.length) {
        cell.fillings.forEach((filling) => {
          if (filling.isVerticalItem) {
            filling.position.y = cell.position.y;
            filling.height = cell.height;
            filling.size.y = filling.height;
            filling.distances.bottom = 0;
            filling.distances.top = 0;
          }
        });
      }

      let nextCell = props.module.sections[secIndex].cells[cellIndex + 1];
      let delta2 = nextCell.height - newBottomHeight;
      nextCell.height = newBottomHeight;

      if (nextCell.cellsRows) {
        nextCell.cellsRows.forEach((row) => {
          row.height = newBottomHeight;
          row.position.y = nextCell.position.y;

          if (row.fillings?.length) {
            row.fillings.forEach((filling) => {
              if (filling.isVerticalItem) {
                filling.position.y = row.position.y;
                filling.height = row.height;
                filling.size.y = filling.height;
                filling.distances.bottom = 0;
                filling.distances.top = 0;
              }
            });
          }

          if (row.extras?.length) {
            let divideDelta = Math.floor(-delta2 / row.extras.length);
            let divideDeltaPos2 = -divideDelta;
            let extraSize =
              (row.extras.length - 1) * module.value.moduleThickness;

            row.extras.forEach((item) => {
              if (item.height + divideDelta >= MIN_SECTION_HEIGHT) {
                item.height += divideDelta;
                item.position.y += divideDelta;

                if (item.fillings?.length) {
                  item.fillings.forEach((filling) => {
                    if (filling.isVerticalItem) {
                      filling.position.y = item.position.y;
                      filling.height = item.height;
                      filling.size.y = filling.height;
                      filling.distances.bottom = 0;
                      filling.distances.top = 0;
                    } else {
                      filling.position.y += divideDeltaPos2;
                    }
                  });
                }
              } else {
                item.height = MIN_SECTION_HEIGHT;
              }

              extraSize += item.height;
            });

            let lastRow = row.extras[0];
            if (
              lastRow.height + (newBottomHeight - extraSize) >=
              MIN_SECTION_HEIGHT
            ) {
              lastRow.height += newBottomHeight - extraSize;
              lastRow.position.y += (newBottomHeight - extraSize) / 2;

              if (lastRow.fillings?.length) {
                lastRow.fillings.forEach((filling) => {
                  if (filling.isVerticalItem) {
                    filling.position.y = lastRow.position.y;
                    filling.height = lastRow.height;
                    filling.size.y = filling.height;
                    filling.distances.bottom = 0;
                    filling.distances.top = 0;
                  } else {
                    filling.position.y += (newBottomHeight - extraSize) / 2;
                  }
                });
              }
            } else {
              lastRow = row.extras.find((item) => {
                return (
                  item.height + (newBottomHeight - extraSize) >=
                  MIN_SECTION_HEIGHT
                );
              });

              if (lastRow) {
                lastRow.height += newBottomHeight - extraSize;
                lastRow.position.y += (newBottomHeight - extraSize) / 2;

                if (lastRow.fillings?.length) {
                  lastRow.fillings.forEach((filling) => {
                    if (filling.isVerticalItem) {
                      filling.position.y = lastRow.position.y;
                      filling.height = lastRow.height;
                      filling.size.y = filling.height;
                      filling.distances.bottom = 0;
                      filling.distances.top = 0;
                    } else {
                      filling.position.y += (newBottomHeight - extraSize) / 2;
                    }
                  });
                }
              }
            }
          }
        });
      }

      if (nextCell.fillings?.length) {
        nextCell.fillings.forEach((filling) => {
          if (filling.isVerticalItem) {
            filling.position.y = nextCell.position.y;
            filling.height = nextCell.height;
            filling.size.y = filling.height;
            filling.distances.bottom = 0;
            filling.distances.top = 0;
          }
        });
      }
    }
  }

  renderGrid();
}

const onDragEnd = (event) => {
  if (dragState.element) {
    delete dragState.element.onDrag;
    if (dragState.element.parent) {
      dragState.element.removeFromParent();
    }
    dragState.element.destroy();
  }

  dragState.element = null;
  dragState.isDragging = false;
  dragState.type = null;
  dragState.secIndex = null;
  dragState.cellIndex = null;
  dragState.rowIndex = null;
  dragState.curRoundMax = null;
  dragState.nextRoundMax = null;
  lastDragEvent.value = null;

  app.stage.off("pointermove", onDragMove);
  app.stage.off("pointerup", onDragEnd);
  app.stage.off("pointerupoutside", onDragEnd);
  cursorCheck = false;

  resetModule();
};

const handleGlobalPointerMove = (event) => {
  if (!app.renderer || !cursorCheck) return;

  const canvasRect = canvasContainer.value.getBoundingClientRect();

  const mouseX = event.clientX - canvasRect.left;
  const mouseY = event.clientY - canvasRect.top;

  if (
    mouseX < 0 ||
    mouseY < 0 ||
    mouseX > app.renderer.width ||
    mouseY > app.renderer.height
  ) {
    // console.log("Курсор вне холста (глобальная проверка)");
    onDragEnd();
  }
};

const adjustSectionSize = (
  sectionIndex,
  cellIndex,
  rowIndex,
  extraIndex,
  newValue,
  dimension = "width",
) => {
  const minValue =
    dimension === "width" ? MIN_SECTION_WIDTH : MIN_SECTION_HEIGHT;
  newValue = Math.max(Math.floor(newValue / props.step) * props.step, minValue);
  let calcValue;

  const module = props.module;
  if (!sectionIndex && sectionIndex !== 0) {
    //module[dimension] = newValue
    calcValue = newValue;
  } else {
    const section = module.sections[sectionIndex];
    const cell = section.cells?.[cellIndex];
    const row = cell?.cellsRows?.[rowIndex];
    const extra = row?.extras?.[extraIndex];
    const currentRow = extra || row || cell || section;

    let next, prev;
    switch (currentRow.type) {
      case "rowExtra":
        prev = row.extras[extraIndex - 1];
        next = row.extras[extraIndex + 1];
        break;
      case "rowCell":
        prev = cell.cellsRows[rowIndex - 1];
        next = cell.cellsRows[rowIndex + 1];
        break;
      case "cell":
        prev = section.cells[cellIndex - 1];
        next = section.cells[cellIndex + 1];
        break;
      case "section":
        prev = module.sections[sectionIndex - 1];
        next = module.sections[sectionIndex + 1];
        break;
    }

    let nextRow = next || prev;

    if (dimension === "width") {
      if (nextRow) {
        let curMin = next
          ? currentRow.maxX
          : currentRow.minX || MIN_SECTION_WIDTH;
        if (currentRow.cells?.length) {
          let count = 1;
          currentRow.cells.forEach((elem) => {
            if (elem.cellsRows?.length > count) {
              count = elem.cellsRows.length;
            }
          });

          curMin = Math.max(
            curMin,
            MIN_SECTION_WIDTH * count + module.moduleThickness * (count - 1),
          );
        }

        let nextMin = next ? nextRow.minX : nextRow.maxX || MIN_SECTION_WIDTH;
        if (nextRow.cells?.length) {
          let count = 1;
          nextRow.cells.forEach((elem) => {
            if (elem.cellsRows?.length > count) {
              count = elem.cellsRows.length;
            }
          });

          nextMin = Math.max(
            nextMin,
            MIN_SECTION_WIDTH * count + module.moduleThickness * (count - 1),
          );
        }

        const totalWidth = currentRow.width + nextRow.width;
        calcValue = updateSizes(
          newValue,
          dimension,
          currentRow,
          nextRow,
          totalWidth,
          curMin,
          nextMin,
        );
      } else {
        calcValue = newValue;
      }
      /*if (sectionIndex < module.sections.length - 1) {
        const nextRow = rowIndex !== null ? cell.cellsRows[rowIndex + 1] :
            cellIndex !== null ? section.cells[cellIndex + 1] :
                module.sections[sectionIndex + 1];

        const totalWidth = currentRow.width + nextRow.width;

        const minCurrent = MIN_SECTION_WIDTH /!*Math.max(
            MIN_SECTION_WIDTH,
            shapeAdjuster.getLeftSectionWidth(currentRow.sector, currentRow.maxX)
        );*!/

        const minNext = MIN_SECTION_WIDTH /!*Math.max(
            MIN_SECTION_WIDTH,
            shapeAdjuster.getRightSectionWidth(nextRow.sector, nextRow.minX)
        );*!/
        calcValue = updateSizes(
            newValue,
            dimension,
            currentRow,
            nextRow,
            totalWidth,
            minCurrent,
            minNext
        );
      }
      else if (sectionIndex > 0) {

        if (row) {
          const nextRow = cell.cellsRows[rowIndex + 1] || cell.cellsRows[rowIndex - 1]
          const totalWidth = section.width + nextRow.width;

          const minCurrent = MIN_SECTION_WIDTH /!*Math.max(
              MIN_SECTION_WIDTH,
              shapeAdjuster.getRightSectionWidth(section.sector, section.minX)
          );*!/

          const minPrev = MIN_SECTION_WIDTH /!*Math.max(
              MIN_SECTION_WIDTH,
              shapeAdjuster.getLeftSectionWidth(nextRow.sector, nextRow.maxX)
          );*!/

          calcValue = updateSizes(
              newValue,
              dimension,
              section,
              nextRow,
              totalWidth,
              minCurrent,
              minPrev
          );
        }
        else {
          const prevRow = cellIndex !== null ? section.cells[cellIndex - 1] :
                  module.sections[sectionIndex - 1];
          const totalWidth = section.width + prevRow.width;

          const minCurrent = MIN_SECTION_WIDTH/!* Math.max(
            MIN_SECTION_WIDTH,
            shapeAdjuster.getRightSectionWidth(section.sector, section.minX)
        );*!/

          const minPrev = MIN_SECTION_WIDTH /!*Math.max(
            MIN_SECTION_WIDTH,
            shapeAdjuster.getLeftSectionWidth(prevRow.sector, prevRow.maxX)
        );
*!/
          calcValue = updateSizes(
              newValue,
              dimension,
              section,
              prevRow,
              totalWidth,
              minCurrent,
              minPrev
          );
        }

      }
      else {
        if (row) {
          const nextRow = cell.cellsRows[rowIndex + 1] || cell.cellsRows[rowIndex - 1]
          const totalWidth = section.width + nextRow.width;

          const minCurrent = MIN_SECTION_WIDTH /!*Math.max(
              MIN_SECTION_WIDTH,
              shapeAdjuster.getRightSectionWidth(section.sector, section.minX)
          );*!/

          const minPrev = MIN_SECTION_WIDTH /!*Math.max(
              MIN_SECTION_WIDTH,
              shapeAdjuster.getLeftSectionWidth(nextRow.sector, nextRow.maxX)
          );*!/

          calcValue = updateSizes(
              newValue,
              dimension,
              section,
              nextRow,
              totalWidth,
              minCurrent,
              minPrev
          );
        } else {
          section.cells.forEach((cell) => (cell.width = newValue));
          section.width = newValue
        }
      }*/
    } else {
      if (nextRow) {
        let curMin = next
          ? currentRow.maxY
          : currentRow.minY || MIN_SECTION_HEIGHT;
        if (currentRow.cellsRows?.length) {
          let count = 1;
          currentRow.cellsRows.forEach((elem) => {
            if (elem.extras?.length > count) {
              count = elem.extras.length;
            }
          });

          curMin = Math.max(
            curMin,
            MIN_SECTION_HEIGHT * count + module.moduleThickness * (count - 1),
          );
        }

        let nextMin = next ? nextRow.minY : nextRow.maxY || MIN_SECTION_HEIGHT;
        if (nextRow.cells?.length) {
          let count = 1;
          nextRow.cellsRows.forEach((elem) => {
            if (elem.extras?.length > count) {
              count = elem.extras.length;
            }
          });

          nextMin = Math.max(
            nextMin,
            MIN_SECTION_HEIGHT * count + module.moduleThickness * (count - 1),
          );
        }

        const totalHeight = currentRow.height + nextRow.height;
        calcValue = updateSizes(
          newValue,
          dimension,
          currentRow,
          nextRow,
          totalHeight,
          curMin,
          nextMin,
        );
      } else {
        calcValue = newValue;
      }
      /*if (cellIndex < section.cells?.length - 1) {
        const nextRow = rowIndex !== null ? cell.cellsRows[rowIndex + 1] :
            cellIndex !== null ? section.cells[cellIndex + 1] :
                module.sections[sectionIndex + 1];

        const totalHeight = currentRow.height + nextRow.height;
        const minCurrent = MIN_SECTION_HEIGHT /!*Math.max(
            MIN_SECTION_HEIGHT,
            shapeAdjuster.getSectionTop(currentRow.sector, currentRow.maxY)
        );*!/
        const minNext = MIN_SECTION_HEIGHT /!*Math.max(
            MIN_SECTION_HEIGHT,
            shapeAdjuster.getSectionBottom(nextRow.sector, nextRow.minY)
        );*!/
        calcValue = updateSizes(
            newValue,
            dimension,
            currentRow,
            nextRow,
            totalHeight,
            minCurrent,
            minNext
        );
      }
      else if (cellIndex > 0) {
        const prevRow = rowIndex !== null ? cell.cellsRows[rowIndex - 1] :
            cellIndex !== null ? section.cells[cellIndex - 1] :
                module.sections[sectionIndex - 1];
        const totalHeight = currentRow.height + prevRow.height;
        const minCurrent = MIN_SECTION_HEIGHT /!*Math.max(
            MIN_SECTION_HEIGHT,
            shapeAdjuster.getSectionBottom(currentRow.sector, currentRow.minY)
        );*!/
        const minPrev = MIN_SECTION_HEIGHT /!*Math.max(
            MIN_SECTION_HEIGHT,
            shapeAdjuster.getSectionTop(prevRow.sector, prevRow.maxY)
        );*!/
        calcValue = updateSizes(
            newValue,
            dimension,
            currentRow,
            prevRow,
            totalHeight,
            minCurrent,
            minPrev
        );
      }
      else {
        currentRow.height = newValue;
      }*/
    }
  }

  //renderGrid();
  return calcValue;
};

const adjustFasadeSize = (
  sectionIndex,
  doorIndex,
  segmentIndex,
  extraIndex,
  newValue,
  dimension = "height",
) => {
  const minValue =
    dimension === "width" ? MIN_SECTION_WIDTH : MIN_SECTION_HEIGHT;
  newValue = Math.max(Math.floor(newValue / props.step) * props.step, minValue);
  let calcValue;

  const module = props.module;

  if (dimension === "width") {
    const section = module.sections[sectionIndex];
    const door = section.fasades?.[doorIndex];
    const currentSegment = door?.[segmentIndex];

    if (sectionIndex < module.sections.length - 1) {
      const nextRow = door[segmentIndex + 1];

      const totalWidth = currentSegment.width + nextRow.width;

      const minCurrent = MIN_FASADE_WIDTH;
      const maxCurrent = currentSegment.maxX;

      /*Math.max(
          MIN_SECTION_WIDTH,
          shapeAdjuster.getLeftSectionWidth(currentRow.sector, currentRow.maxX)
      );*/

      const minNext = MIN_FASADE_WIDTH;
      const maxNext = nextRow.maxX;

      /*Math.max(
          MIN_SECTION_WIDTH,
          shapeAdjuster.getRightSectionWidth(nextRow.sector, nextRow.minX)
      );*/
      calcValue = updateSizesFasades(
        newValue,
        totalWidth,
        minCurrent,
        maxCurrent,
        minNext,
        maxNext,
      );
    } else if (sectionIndex > 0) {
      const prevRow = door[segmentIndex - 1];

      const totalWidth = currentSegment.width + prevRow.width;

      const minCurrent = MIN_FASADE_WIDTH;
      const maxCurrent = currentSegment.maxX;

      const minPrev = MIN_FASADE_WIDTH;
      const maxPrev = prevRow.maxX;

      calcValue = updateSizesFasades(
        newValue,
        totalWidth,
        minCurrent,
        maxCurrent,
        minPrev,
        maxPrev,
      );
    } else {
      const minCurrent = MIN_FASADE_WIDTH;
      const maxCurrent = currentSegment.maxX;

      if (newValue < minCurrent) calcValue = minCurrent;
      else if (newValue > maxCurrent) calcValue = maxCurrent;
    }
  } else {
    const section = module.sections[sectionIndex];
    const door = section.fasades?.[doorIndex];
    const currentSegment = door?.[segmentIndex];

    if (segmentIndex < door.length - 1) {
      const nextRow = door[segmentIndex + 1];

      const totalHeight = currentSegment.height + nextRow.height;
      const minCurrent = MIN_FASADE_HEIGHT; //Math.max(MIN_FASADE_HEIGHT, currentSegment.maxY);
      const minNext = MIN_FASADE_HEIGHT; //Math.max(MIN_FASADE_HEIGHT, nextRow.minY);
      const maxCurrent = currentSegment.maxY;
      const maxNext = nextRow.maxY;

      calcValue = updateSizesFasades(
        newValue,
        totalHeight,
        minCurrent,
        maxCurrent,
        minNext,
        maxNext,
      );
    } else if (segmentIndex > 0) {
      const prevRow = door[segmentIndex - 1];
      const totalHeight = currentSegment.height + prevRow.height;

      const minCurrent = MIN_FASADE_HEIGHT; // Math.max(MIN_FASADE_HEIGHT, currentSegment.minY);
      const minPrev = MIN_FASADE_HEIGHT; // Math.max(MIN_FASADE_HEIGHT, prevRow.maxY);
      const maxCurrent = currentSegment.maxY;
      const maxPrev = prevRow.maxY;

      calcValue = updateSizesFasades(
        newValue,
        totalHeight,
        minCurrent,
        maxCurrent,
        minPrev,
        maxPrev,
      );
    } else {
      const minCurrent = MIN_FASADE_HEIGHT;
      const maxCurrent = currentSegment.maxY;

      if (newValue < minCurrent) calcValue = minCurrent;
      else if (newValue > maxCurrent) calcValue = maxCurrent;
    }
  }

  renderGrid();
  return calcValue;
};

const updateSizes = (
  newValue,
  dimension,
  current,
  adjacent,
  total,
  minCurrent,
  minAdjacent,
) => {
  if (newValue < minCurrent) newValue = minCurrent;

  const newAdjacentSize = total - newValue;

  if (newAdjacentSize < minAdjacent) newValue = total - minAdjacent;

  /*if (dimension === "width") {
    current.forEach((cell) => (cell.width = newValue));
    adjacent.forEach((cell) => (cell.width = total - newValue));
  } else {
    current[dimension] = newValue;
    adjacent[dimension] = total - newValue;
  }*/

  return newValue;
};

const updateSizesFasades = (
  newValue,
  total,
  minCurrent,
  maxCurrent,
  minAdjacent,
  maxAdjacent,
) => {
  if (newValue < minCurrent) newValue = minCurrent;
  else if (newValue > maxCurrent) newValue = maxCurrent;

  const newAdjacentSize = total - newValue;

  if (newAdjacentSize < minAdjacent) newValue = total - minAdjacent;
  else if (newAdjacentSize > maxAdjacent) newValue = total - maxAdjacent;

  return newValue;
};

const adjustSizeFromExternal = ({
  dimension,
  value,
  sec = null,
  cell = null,
  row = null,
  extra = null,
  type = "module",
}: {
  dimension: string;
  value: number;
  sec?: number;
  cell?: number;
  row?: number;
  extra?: number;
  type?: string;
}) => {
  if (sec === null) {
    console.warn("Не выбрана ячейка для изменения размера");
    return;
  }

  switch (type) {
    case "fasades":
      return adjustFasadeSize(sec, cell, row, extra, value, dimension);
    default:
      return adjustSectionSize(sec, cell, row, extra, value, dimension);
  }
};

const clearRender = () => {
  sections.forEach((elem) => {
    elem.removeChildren();
    app.stage.removeChild(elem);
    elem.destroy();
  });

  deviders.forEach((elem) => {
    if (!elem.onDrag) {
      if (elem.parent) {
        elem.removeFromParent();
      }

      elem.destroy();
    }
  });

  sections.length = 0;
  sectionLables.length = 0;
  deviders.length = 0;
  dementions.length = 0;
  fillings.length = 0;
  fasades.length = 0;
  loops.length = 0;
  handles.length = 0;

  sectionsContainer.removeChildren();
  loopsContainer.removeChildren();
  handlesContainer.removeChildren();
  lablesContainer.removeChildren();
  fillingsContainer.removeChildren();
  dementionContainer.removeChildren();
  fasadesContainer.removeChildren();
};

const changeConstructorMode = (_mode) => {
  mode.value = _mode;
  renderGrid();
};

const destroy = () => {
  app.destroy(true);
};

const addTicker = () => {
  app.ticker.maxFPS = 60;
  app.ticker.add(() => {
    dragMove(lastDragEvent.value);
  });
};

const setModuleGrid = (grid) => {
  module.value = grid;
};

watch(
  () => UMconstructor?.value?.UM_STORE.getUMGrid(),
  () => {
    setModuleGrid(UMconstructor?.value?.UM_STORE.getUMGrid());
  },
);

watch(
  () => UMconstructor?.value?.UM_STORE.getSelected("module"),
  () => {
    selectedCell.value = UMconstructor?.value?.UM_STORE.getSelected("module");
  },
);
watch(
  () => UMconstructor?.value?.UM_STORE.getSelected("fasades"),
  () => {
    selectedFasade.value =
      UMconstructor?.value?.UM_STORE.getSelected("fasades");
  },
);
watch(
  () => UMconstructor?.value?.UM_STORE.getSelected("fillings"),
  () => {
    selectedFilling.value =
      UMconstructor?.value?.UM_STORE.getSelected("fillings");
  },
);

onBeforeMount(() => {
  TOTAL_HEIGHT.value = props.maxAreaHeight;
  TOTAL_WIDTH.value = props.maxAreaWidth;
  mode.value = props.mode;

  calcMaxAreaSize();
});

onMounted(() => {
  init();
  selectedCell.value = UMconstructor?.value?.UM_STORE.getSelected("module");
  selectedFasade.value = UMconstructor?.value?.UM_STORE.getSelected("fasades");
  selectedFilling.value =
    UMconstructor?.value?.UM_STORE.getSelected("fillings");
  document.addEventListener("mousemove", handleGlobalPointerMove, false);
});

onUnmounted(() => {
  document.removeEventListener("mousemove", handleGlobalPointerMove, false);
  app.destroy(true);
});

defineExpose({
  adjustSizeFromExternal,
  renderGrid,
  selectCell,
  updateTotalSize,
  destroy,
  changeConstructorMode,
  createFilling,
  checkPositionFillingToCreate,
  getMmWidth,
  getMmHeight,
  getPixelHeight,
  getPixelWidth,
});
</script>

<template>
  <div
    class="visualization-interactive"
    :style="`height:${areaHeight}px width:${areaWidth}px`"
  >
    <canvas ref="canvasContainer"></canvas>
  </div>
  <!-- :style="'height:getMaxAreaHeight'" -->
</template>

<style lang="scss" scoped>
.visualization-interactive {
  canvas {
    border: 1px solid #bbbbbb;
    display: flex;
    justify-content: center;
  }
}

/*  height: 320px;
  width: 800px;
*/

canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
