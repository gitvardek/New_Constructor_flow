<script setup lang="ts">
// @ts-nocheck
import {
  onMounted,
  onUnmounted,
  ref,
  watch,
  computed,
  reactive,
  toRaw,
  defineExpose,
  render,
  onBeforeMount,
  toRef,
} from "vue";
import { Application, Container, Graphics, Text, Ticker } from "pixi.js";
import { CUTTER_PARAMS } from "./CutterScripts/CutterConst";
import { Shape, ShapeAdjuster, Section } from "./CutterScripts/CutterMethods";

const props = defineProps({
  grid: {
    type: Array,
    required: true,
  },

  maxAreaHeight: {
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
  tempHole: { type: Object },
});

const emit = defineEmits(["cell-selected", "position-non"]);
const canvasContainer = ref();
const selectedCell = ref({ col: 0, row: 0 });
const curSection = ref(null);

let app: Application,
  roundSectionsContainer: Container,
  sectionsContainer: Container,
  holesContainer: Container,
  lablesContainer: Container,
  dementionContainer: Container,
  shapeAdjuster: ShapeAdjuster;

let cursorCheck = false;
let lastDragEvent = ref(null);

// Хранилища объектов
const sections: Container[] = [];
const roundSections: Graphics[] = [];
const sectionLables: (Graphics | Text)[] = [];
const deviders: Graphics[] = [];
const holes: Graphics[] = [];
const dementions: Graphics[] = [];

const {
  MAX_AREA_WIDTH,
  TOTAL_LENGTH,
  // TOTAL_HEIGHT,
  BACKGROUND_COLOR,
  MIN_SECTION_WIDTH,
  MIN_SECTION_HEIGHT,
  PART_MIN_SIZE
} = CUTTER_PARAMS;

const dragState = reactive({
  isDragging: false,
  type: null, // "vertical" или "horizontal"

  colIndex: null,
  rowIndex: null, // Для горизонтального перетаскивания

  startX: 0,
  startY: 0,

  startLeftWidth: 0,
  startRightWidth: 0,

  minXleft: PART_MIN_SIZE,
  minXRight: PART_MIN_SIZE,

  startTopHeight: 0,
  startBottomHeight: 0,

  minTop: PART_MIN_SIZE,
  minBottom: PART_MIN_SIZE,

  element: null,
});

const pixelRatio = computed(() => TOTAL_LENGTH / MAX_AREA_WIDTH);

const TOTAL_HEIGHT = ref(0);
const areaHeight = ref(0);

const getMaxAreaHeight = () =>
  (TOTAL_HEIGHT.value * MAX_AREA_WIDTH) / TOTAL_LENGTH;

const updateTotalHeight = (value) => {
  TOTAL_HEIGHT.value = parseInt(value);
  areaHeight.value = getMaxAreaHeight();

  app.canvas.style.height = `${areaHeight.value}px`;
  app.renderer.resize(MAX_AREA_WIDTH, areaHeight.value);
};

const getPixelWidth = (mmWidth) => {
  // return Math.floor((mmWidth / TOTAL_LENGTH) * MAX_AREA_WIDTH);
  return (mmWidth / TOTAL_LENGTH) * MAX_AREA_WIDTH;
};

const getPixelHeight = (mmHeight) => {
  // return Math.floor((mmHeight / TOTAL_HEIGHT) * getMaxAreaHeight.value);
  return (mmHeight / TOTAL_HEIGHT.value) * areaHeight.value;
};

const getMmWidth = (pxWidth) => {
  return (pxWidth / MAX_AREA_WIDTH) * TOTAL_LENGTH;
};

const init = async () => {
  app = new Application();
  await app.init({
    canvas: canvasContainer.value,
    width: MAX_AREA_WIDTH,
    height: areaHeight.value,
    backgroundColor: BACKGROUND_COLOR,
    resolution: window.devicePixelRatio || 1,
    // autoDensity: true,
    antialias: true,
    premultipliedAlpha: false,
  });

  sectionsContainer = new Container();
  holesContainer = new Container();
  lablesContainer = new Container();
  roundSectionsContainer = new Container();
  dementionContainer = new Container();

  // sectionsContainer.interactive = true;
  holesContainer.interactive = true;
  roundSectionsContainer.interactive = true;
  lablesContainer.interactiveChildren = false;
  dementionContainer.interactiveChildren = false;

  app.stage.addChild(sectionsContainer);
  app.stage.addChild(roundSectionsContainer);
  app.stage.addChild(holesContainer);
  app.stage.addChild(lablesContainer);
  app.stage.addChild(dementionContainer);

  app.stage.eventMode = "static";
  app.stage.hitArea = app.screen;

  shapeAdjuster = new ShapeAdjuster();
  shapeAdjuster.setStep(props.step);
  addTicker();

  renderGrid();
};

const renderGrid = () => {
  if (!props.grid) return;
  clearRender();

  let xOffset = 0;

  props.grid.forEach((column, colIndex) => {
    const pxWidth = getPixelWidth(column[0].width);

    let yOffset = 0;

    column.forEach((row, rowIndex, col) => {
      const pxHeight = getPixelHeight(row.height);
      row.xOffset = xOffset;
      row.yOffset = yOffset;

      // Отрисовываем секцию

      createSector({
        x: xOffset,
        y: yOffset,
        width: pxWidth,
        height: pxHeight,
        colIndex,
        rowIndex,
        row,
        col,
      });

      //Добавляем отступ по вертикали
      yOffset += pxHeight;
    });
    //Добавляем отступ по горизонтали
    xOffset += pxWidth;

    // Создаём ограничения для секторов по ширине
    const colBond = shapeAdjuster.createColumnBounds(sections, colIndex);

    column.forEach((row, ndx) => {
      row.shapesBond = colBond;
      row.maxX = shapeAdjuster.convertToTen(getMmWidth(colBond.maxX));
      row.minX = shapeAdjuster.convertToTen(getMmWidth(colBond.minX));
    });
  });

  sections.forEach((elem) => {
    app.stage.addChildAt(elem, 0);
  });

  roundSections.forEach((elem) => {
    roundSectionsContainer.addChild(elem);
  });

  // deviders.forEach((elem) => {
  //   sectionsContainer.addChild(elem);
  // });

  holes.forEach((elem) => {
    holesContainer.addChild(elem);
  });

  sectionLables.forEach((elem) => {
    lablesContainer.addChild(elem);
  });

  // deviders.forEach((elem) => {
  //   sectionsContainer.addChild(elem);
  // });

  dementions.forEach((elem) => {
    dementionContainer.addChild(elem);
  });
  deviders.forEach((elem) => {
    sectionsContainer.addChild(elem);
  });

  props.grid.forEach((column, colIndex) => {
    column.forEach((row, rowIndex, col) => {
      calculateMaxDimensions(column, colIndex, row, rowIndex, col);
    });
  });
};

// Создаём сектора
const createSector = ({
  x,
  y,
  width,
  height,
  row,
  col,
  colIndex,
  rowIndex,
}) => {
  const sector = new Container();

  sector.position.set(x, y);

  sector.shapes = [];
  sector.sectorData = row;
  sector.sections = sections;
  sector.holesContainer = holesContainer;

  sector.colNdx = colIndex;
  sector.rowNdx = rowIndex;

  const cell = new Section(row, width, height, sector);

  if (
    selectedCell.value.col === colIndex &&
    selectedCell.value.row === rowIndex
  ) {
    cell.highlightGraphics.visible = true;
  } else {
    cell.highlightGraphics.visible = false;
  }

  if ("radius" in row.roundCut) {
    cell.cellGraphics.alpha = 0;
    cell.highlightGraphics.alpha = 0;
  }

  cell.cellGraphics.eventMode = "static";
  cell.cellGraphics.cursor = "pointer";

  sector.addChild(cell.cellGraphics);
  sector.addChild(cell.highlightGraphics);
  createRoundCut(row, sector);

  row.path = cell.cellGraphics.cellPath;

  sections.push(sector);

  /** Создаём отверсти */
  row.holes.forEach((data) => {
    createHole(data, sector);
  });

  // /** Создаём нумерацию сектора */
  createSectioNum({ x, y, width, height, row, colIndex, rowIndex });

  cell.cellGraphics.on("pointerdown", () => {
    selectCell(colIndex, rowIndex);
  });
  // /**Создание вертикального выреза */
  createVerticalCut({ width, height, row, col, colIndex, sector });
  // /**Создание горизонтального выреза */
  createHorozontalCut({ width, height, row, col, colIndex, rowIndex, sector });

  // Создаём ограничения для секторов по высоте

  const sectorBounds = shapeAdjuster.getTotalBounds(sector, row);
  sector.bound = sectorBounds;

  row.maxY = shapeAdjuster.convertToTen(getMmWidth(sectorBounds.maxY));
  row.minY = shapeAdjuster.convertToTen(getMmWidth(sectorBounds.minY));

  row.sector = sector;

  // Рендер линейки расстояний до границ сектора
  sector.shapes.forEach((el) => {
    el.drawBoundaryDistances();
  });
};

// Отрисовываем номер ячейки
const createSectioNum = ({ x, y, width, height, row, colIndex, rowIndex }) => {
  const pxWidth = getPixelWidth(row.width);
  const pxHeight = getPixelHeight(row.height);

  const cellNumber = new Text({
    text: `${colIndex + 1}.${rowIndex + 1}`,
    style: { fontSize: 14, fill: "#131313", align: "center" },
  });
  cellNumber.anchor.set(0.5);
  cellNumber.x = row.xOffset + pxWidth / 2;
  cellNumber.y = row.yOffset + pxHeight / 2;

  const cellNumberBackground = new Graphics();
  cellNumberBackground.roundRect(
    row.xOffset + pxWidth / 2 - 12.5,
    row.yOffset + pxHeight / 2 - 12,
    25,
    25,
    5
  );
  cellNumberBackground.fill("#ffffff");
  cellNumberBackground.stroke({ width: 1, color: "#A3A9B5" });

  cellNumber.interactive = false;
  cellNumberBackground.interactive = false;

  sectionLables.push(cellNumberBackground);
  sectionLables.push(cellNumber);
};

// Отрисовываем вертикальный вырез
const createVerticalCut = ({ width, height, row, col, colIndex, sector }) => {
  if (!(colIndex < props.grid.length - 1)) return;

  const pxWidth = getPixelWidth(row.width);
  const totalHeight = col.reduce((sum, row) => sum + row.height, 0);
  const convertTotalHeight = getPixelHeight(totalHeight);

  const divider = new Graphics();
  const dashVert = new Graphics();

  divider.rect(0, 0, 10, convertTotalHeight);
  divider.fill("#A3A9B5");
  divider.alpha = 0;

  divider.eventMode = "static";
  divider.cursor = "col-resize";
  divider.col = colIndex;

  dashVert.rect(0, 0, 0.1, convertTotalHeight);
  dashVert.stroke({ width: 1, color: "#5D6069" });
  divider.dev_name = `dev${divider.uid}`;

  divider.position.set(row.xOffset + pxWidth - 5, 0);
  dashVert.position.set(row.xOffset + pxWidth, 0);
  divider.toColideCheck = dashVert;

  // const dashedV = drawDashedLine({
  //   startX: row.xOffset + pxWidth,
  //   startY: 0,
  //   endX: row.xOffset + pxWidth,
  //   endY: convertTotalHeight,
  //   graphics: dashVert,
  // });

  divider.on("pointerdown", onVerticalDragStart, divider);

  deviders.push(dashVert, divider);
};

// Отрисовываем вертикальный вырез
const createHorozontalCut = ({
  width,
  height,
  row,
  col,
  colIndex,
  rowIndex,
  sector,
}) => {
  if (!(rowIndex < col.length - 1)) return;

  const pxWidth = getPixelWidth(row.width);
  const pxHeight = getPixelHeight(row.height);

  const divider = new Graphics();
  const dashHor = new Graphics();

  divider.rect(row.xOffset, row.yOffset + pxHeight - 5, pxWidth, 10);
  divider.fill("#A3A9B5");
  divider.alpha = 0;
  divider.eventMode = "static";
  divider.cursor = "row-resize";
  divider.col = colIndex;
  divider.row = rowIndex;

  // dragState.colIndex === colIndex && dragState.rowIndex === rowIndex
  //   ? (divider.alpha = 0.5)
  //   : (divider.alpha = 0);

  // const dashedV = drawDashedLine({
  //   startX: row.xOffset,
  //   startY: row.yOffset + pxHeight,
  //   endX: row.xOffset + pxWidth,
  //   endY: row.yOffset + pxHeight,
  //   graphics: dashHor,
  // });

  dashHor.rect(row.xOffset, row.yOffset + pxHeight, pxWidth, 0.1);
  dashHor.stroke({ width: 1, color: "#5D6069" });

  divider.on("pointerdown", onHorizontalDragStart, divider);

  // deviders.push(dashedV, divider);
  deviders.push(dashHor, divider);
};

// Отрисовываем кпуглый вырез
const createRoundCut = (row, sector) => {
  const secBounds = sector.getBounds();

  if (!("radius" in row.roundCut)) return;

  const x =
    row.roundCut.x ??
    Math.round(
      getMmWidth(secBounds.x + (secBounds.maxX - secBounds.minX) * 0.5)
    );
  const y =
    row.roundCut.y ??
    Math.round(
      getMmWidth(secBounds.y + (secBounds.maxY - secBounds.minY) * 0.5)
    );

  if (!("x" in row.roundCut)) {
    row.roundCut.x = x;
    row.roundCut.y = y;

    // row.roundCut.x = Math.round(getMmWidth(x));
    // row.roundCut.y = Math.round(getMmWidth(y));
  }

  const circleSector = new Shape({
    type: "circleSector",
    sector: sector,
    data: row.roundCut,
    position: { x, y },
    select: selectCell,
    render: renderGrid,
  });

  row.roundCut.graphic = circleSector.graphic;
  roundSections.push(circleSector.graphic);
};

// Создание отверстия
const checkPositionHoleToCreate = (data) => {
  const col = selectedCell.value.col;
  const row = selectedCell.value.row;

  let position, tempShape;

  const sector = sections.find(
    (elem) => elem.rowNdx === row && elem.colNdx === col
  );

  tempShape = new Shape({
    type: data.type,
    sector,
    position: { x: 0, y: 0 },
    data,
  });

  /** Проверяем на возможность размещения отверстия */

  position = shapeAdjuster.getRandomPosition(sector, tempShape);

  if (!position) {
    return false;
  }
  return {
    x: Math.round(getMmWidth(position.x)),
    y: Math.round(getMmWidth(position.y)),
    width: data.width,
    height: data.height,
    type: data.type,
    radius: data.radius,
  };
};

const createHole = (data, sector) => {
  const hole = new Shape({
    type: data.type,
    sector,
    data,
    select: selectCell,
    render: renderGrid,
    dementions,
    dementionContainer,
  });

  holes.push(hole.graphic);
  sector.shapes.push(hole);
};

// Рассчитываем экстремумы для UX
const calculateMaxDimensions = (column, colIndex, row, rowIndex, col) => {
  // Рассчитываем row.maxWidth
  if (colIndex < props.grid.length - 1) {
    // Случай: не последняя колонка, расчёт на основе следующей колонки
    const nextCol = props.grid[colIndex + 1];
    const totalWidth = column[0].width + nextCol[0].width;
    const minNext = Math.max(
      MIN_SECTION_WIDTH,
      shapeAdjuster.getRightSectionWidth(nextCol[0].sector, nextCol[0].minX)
    );
    row.maxWidth = totalWidth - minNext;
  } else if (colIndex > 0) {
    // Случай: не первая колонка, расчёт на основе предыдущей колонки
    const prevCol = props.grid[colIndex - 1];
    const totalWidth = column[0].width + prevCol[0].width;
    const minPrev = Math.max(
      MIN_SECTION_WIDTH,
      shapeAdjuster.getLeftSectionWidth(prevCol[0].sector, prevCol[0].maxX)
    );
    row.maxWidth = totalWidth - minPrev;
  } else {
    // Случай: единственная колонка, maxWidth равен TOTAL_LENGTH
    row.maxWidth = TOTAL_LENGTH;
  }

  // Рассчитываем row.maxHeight
  if (rowIndex < col.length - 1) {
    // Случай: не последняя строка, расчёт на основе следующей строки
    const nextRow = col[rowIndex + 1];
    const totalHeight = row.height + nextRow.height;
    const minNext = Math.max(
      MIN_SECTION_HEIGHT,
      shapeAdjuster.getSectionBottom(nextRow.sector, nextRow.minY)
    );
    row.maxHeight = totalHeight - minNext;
  } else if (rowIndex > 0) {
    // Случай: не первая строка, расчёт на основе предыдущей строки
    const prevRow = col[rowIndex - 1];
    const totalHeight = row.height + prevRow.height;
    const minPrev = Math.max(
      MIN_SECTION_HEIGHT,
      shapeAdjuster.getSectionTop(prevRow.sector, prevRow.maxY)
    );
    row.maxHeight = totalHeight - minPrev;
  } else {
    // Случай: единственная строка, maxHeight равен TOTAL_HEIGHT
    row.maxHeight = TOTAL_HEIGHT.value;
  }
};

// Выбор сектора, передача в родительский компонент
const selectCell = (colIndex, rowIndex, parent = false) => {
  selectedCell.value = { col: colIndex, row: rowIndex };
  curSection.value = {
    currentColl: props.grid[colIndex],
    currentRow: props.grid[colIndex][rowIndex],
  };

  toggleSectorColor(colIndex, rowIndex);
  if (!parent) emit("cell-selected", colIndex, rowIndex);
};

const toggleSectorColor = (colIndex, rowIndex) => {
  const sector = props.grid[colIndex][rowIndex].sector;
  sections.forEach((elem) => {
    elem.children[1].visible = false;
    // elem.children[0].alpha = 1;
  });
  sector.children[1].visible = true;
  // sector.children[0].alpha = 0.5;
};

// Обработчик для вертикального перетаскивания (между колонками)
function onVerticalDragStart(event) {
  // event.stopPropagation();
  cursorCheck = true;
  const colIndex = this.col;

  const cur = props.grid[colIndex];
  const next = props.grid[colIndex + 1];

  // event.currentTarget.alpha = 0.5;

  dragState.isDragging = true;
  dragState.type = "vertical";

  dragState.colIndex = colIndex;
  dragState.startX = event.data.global.x;

  dragState.startLeftWidth = cur[0].width;
  dragState.startRightWidth = next[0].width;

  dragState.minXleft = shapeAdjuster.getLeftSectionWidth(
    cur[0].sector,
    cur[0].maxX
  );

  dragState.minXRight = shapeAdjuster.getRightSectionWidth(
    next[0].sector,
    next[0].minX
  );

  dragState.element = this;

  app.stage.on("pointermove", onDragMove);
  app.stage.on("pointerup", onDragEnd);
}

// Обработчик для горизонтального перетаскивания (между строками)
function onHorizontalDragStart(event) {
  // event.stopPropagation();

  cursorCheck = true;

  const colIndex = this.col as number;
  const rowIndex = this.row as number;

  const cur = props.grid[colIndex][rowIndex];
  const next = props.grid[colIndex][rowIndex + 1];

  // event.currentTarget.alpha = 0.5;
  dragState.element = this;
  dragState.isDragging = true;
  dragState.type = "horizontal";
  dragState.colIndex = colIndex;
  dragState.rowIndex = rowIndex;
  dragState.startY = event.data.global.y;
  dragState.startTopHeight = cur.height;
  dragState.startBottomHeight = next.height;

  dragState.minTop = shapeAdjuster.getSectionTop(cur.sector, cur.maxY);
  dragState.minBottom = shapeAdjuster.getSectionBottom(next.sector, next.minY);

  app.stage.on("pointermove", onDragMove);
  app.stage.on("pointerup", onDragEnd);
}

function onDragMove(event) {
  if (!event) return;

  lastDragEvent.value = event;
}

function dragMove(event) {
  if (!dragState.isDragging || !lastDragEvent.value) return;

  const {
    type,
    colIndex,
    rowIndex,
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
    let curMin = minXleft < MIN_SECTION_WIDTH ? MIN_SECTION_WIDTH : minXleft;
    let nextMin = minXRight < MIN_SECTION_WIDTH ? MIN_SECTION_WIDTH : minXRight;

    const deltaPixels = event.data.global.x - startX;

    element.position.x =
      Math.floor(event.data.global.x / props.step) * props.step;
    const deltaMm =
      Math.floor((deltaPixels * pixelRatio.value) / props.step) * props.step;

    // Calculate new dimensions
    let newLeftWidth = startLeftWidth + deltaMm;
    let newRightWidth = startRightWidth - deltaMm;

    // Enforce minimum dimensions
    if (newLeftWidth < curMin) {
      newLeftWidth = curMin;
      newRightWidth = startLeftWidth + startRightWidth - curMin;
    } else if (newRightWidth < nextMin) {
      newRightWidth = nextMin;
      newLeftWidth = startLeftWidth + startRightWidth - nextMin;
    }

    props.grid[colIndex].forEach((row) => {
      row.width = newLeftWidth;
    });

    props.grid[colIndex + 1].forEach((row) => {
      row.width = newRightWidth;
    });
  } else if (type === "horizontal") {
    let curMin = minTop < MIN_SECTION_WIDTH ? MIN_SECTION_WIDTH : minTop;
    let nextMin = minBottom < MIN_SECTION_WIDTH ? MIN_SECTION_WIDTH : minBottom;

    const deltaPixels = event.data.global.y - startY;

    element.position.y =
      Math.floor(event.data.global.y / props.step) * props.step;
    const deltaMm =
      Math.floor((deltaPixels * pixelRatio.value) / props.step) * props.step;

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

    props.grid[colIndex][rowIndex].height = newTopHeight;
    props.grid[colIndex][rowIndex + 1].height = newBottomHeight;
  }

  renderGrid();
}

const onDragEnd = () => {
  dragState.isDragging = false;
  dragState.type = null;
  dragState.colIndex = null;
  dragState.rowIndex = null;
  dragState.curRoundMax = null;
  dragState.nextRoundMax = null;
  lastDragEvent.value = null;

  app.stage.off("pointermove", onDragMove);
  app.stage.off("pointerup", onDragEnd);
  cursorCheck = false;

  renderGrid();
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
  colIndex,
  rowIndex,
  newValue,
  dimension = "width"
) => {
  const minValue =
    dimension === "width" ? MIN_SECTION_WIDTH : MIN_SECTION_HEIGHT;
  newValue = Math.max(Math.floor(newValue / props.step) * props.step, minValue);
  let calcValue;

  const grid = props.grid;

  if (dimension === "width") {
    const column = grid[colIndex];

    if (colIndex < grid.length - 1) {
      const nextCol = grid[colIndex + 1];
      const totalWidth = column[0].width + nextCol[0].width;

      const minCurrent = Math.max(
        MIN_SECTION_WIDTH,
        shapeAdjuster.getLeftSectionWidth(column[0].sector, column[0].maxX)
      );

      const minNext = Math.max(
        MIN_SECTION_WIDTH,
        shapeAdjuster.getRightSectionWidth(nextCol[0].sector, nextCol[0].minX)
      );

      calcValue = updateSizes(
        newValue,
        dimension,
        column,
        nextCol,
        totalWidth,
        minCurrent,
        minNext
      );
    } else if (colIndex > 0) {
      const prevCol = grid[colIndex - 1];
      const totalWidth = column[0].width + prevCol[0].width;

      const minCurrent = Math.max(
        MIN_SECTION_WIDTH,
        shapeAdjuster.getRightSectionWidth(column[0].sector, column[0].minX)
      );

      const minPrev = Math.max(
        MIN_SECTION_WIDTH,
        shapeAdjuster.getLeftSectionWidth(prevCol[0].sector, prevCol[0].maxX)
      );

      calcValue = updateSizes(
        newValue,
        dimension,
        column,
        prevCol,
        totalWidth,
        minCurrent,
        minPrev
      );
    } else {
      column.forEach((row) => (row.width = newValue));
    }
  } else {
    const column = grid[colIndex];
    const currentRow = column[rowIndex];
    if (rowIndex < column.length - 1) {
      const nextRow = column[rowIndex + 1];
      const totalHeight = currentRow.height + nextRow.height;
      const minCurrent = Math.max(
        MIN_SECTION_HEIGHT,
        shapeAdjuster.getSectionTop(currentRow.sector, currentRow.maxY)
      );
      const minNext = Math.max(
        MIN_SECTION_HEIGHT,
        shapeAdjuster.getSectionBottom(nextRow.sector, nextRow.minY)
      );
      calcValue = updateSizes(
        newValue,
        dimension,
        currentRow,
        nextRow,
        totalHeight,
        minCurrent,
        minNext
      );
    } else if (rowIndex > 0) {
      const prevRow = column[rowIndex - 1];
      const totalHeight = currentRow.height + prevRow.height;
      const minCurrent = Math.max(
        MIN_SECTION_HEIGHT,
        shapeAdjuster.getSectionBottom(currentRow.sector, currentRow.minY)
      );
      const minPrev = Math.max(
        MIN_SECTION_HEIGHT,
        shapeAdjuster.getSectionTop(prevRow.sector, prevRow.maxY)
      );
      calcValue = updateSizes(
        newValue,
        dimension,
        currentRow,
        prevRow,
        totalHeight,
        minCurrent,
        minPrev
      );
    } else {
      currentRow.height = newValue;
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
  minAdjacent
) => {
  if (newValue < minCurrent) newValue = minCurrent;
  const newAdjacentSize = total - newValue;

  if (newAdjacentSize < minAdjacent) newValue = total - minAdjacent;

  if (dimension === "width") {
    current.forEach((row) => {
      row.width = newValue;
      row.maxWidth = total - minAdjacent;
    });

    adjacent.forEach((row) => {
      row.width = total - newValue;
    });
  } else {
    current[dimension] = newValue;
    adjacent[dimension] = total - newValue;
    current["maxHeight"] = total - minAdjacent;
  }

  return newValue;
};

const adjustSizeFromExternal = ({
  dimension,
  value,
  col,
  row,
}: {
  dimension: string;
  value: number;
  col: number;
  row?: number;
}) => {
  if (col === null) {
    console.warn("Не выбрана ячейка для изменения размера");
    return;
  }

  return adjustSectionSize(col, row, value, dimension);
};

const clearRender = () => {
  sections.forEach((elem) => {
    app.stage.removeChild(elem);
    elem.destroy();
  });

  sections.length = 0;
  sectionLables.length = 0;
  deviders.length = 0;
  holes.length = 0;
  roundSections.length = 0;
  dementions.length = 0;

  sectionsContainer.removeChildren();
  roundSectionsContainer.removeChildren();
  holesContainer.removeChildren();
  lablesContainer.removeChildren();
  dementionContainer.removeChildren();
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

onBeforeMount(() => {
  TOTAL_HEIGHT.value = props.maxAreaHeight;
  areaHeight.value = getMaxAreaHeight();
});

onMounted(() => {
  init();
  document.addEventListener("mousemove", handleGlobalPointerMove, false);
});

onUnmounted(() => {
  document.removeEventListener("mousemove", handleGlobalPointerMove, false);
  app.destroy(true);
});

defineExpose({
  adjustSizeFromExternal,
  renderGrid,
  checkPositionHoleToCreate,
  createHole,
  createRoundCut,
  selectCell,
  curSection,
  updateTotalHeight,
  destroy,
});
</script>

<template>
  <div class="visualization" :style="`height:${areaHeight}px`">
    <canvas ref="canvasContainer"></canvas>
  </div>
  <!-- :style="'height:getMaxAreaHeight'" -->
</template>

<style>
.visualization {
  width: 800px;
  canvas {
    border: 1px solid #bbbbbb;
  }
}

/*  height: 320px; */

canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
