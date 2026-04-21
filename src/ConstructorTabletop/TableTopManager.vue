<script setup lang="ts">
// @ts-nocheck

import {
  onMounted,
  onBeforeMount,
  onBeforeUnmount,
  onUnmounted,
  computed,
  ref,
  toRaw,
  watch,
  defineExpose,
  nextTick,
} from "vue";
import { useEventBus } from "@/store/appliction/useEventBus";
import { useModelState } from "@/store/appliction/useModelState";
import { useKromkaActions } from "./Kromka/useKromkaActions";
import { useToast } from "@/features/toaster/useToast";
import { CUTTER_PARAMS } from "./CutterScripts/CutterConst";
import { ShapeAdjuster } from "./CutterScripts/CutterMethods";

import Visualization from "./TableTopVisualization.vue";
import CutOptions from "./OptionsMenu/CutOptions.vue";
import CutServise from "./OptionsMenu/CutServise.vue";
import MainInput from "@/components/ui/inputs/MainInput.vue";

import TableTopInput from "./TableTopInput.vue";
import MaterialSelector from "@/components/right-menu/customiser-pages/ColorRightPage/MaterialSelector.vue";
import KromkaCard from "./Kromka/KromkaCard.vue";

const eventBus = useEventBus();
const modelState = useModelState();
const kromkaActions = useKromkaActions();
const toaster = useToast();

const {
  checkKromkaActive,
  getKromkaList,
  getKromkaActive,
  kromkaSelect,
  getKromkaCardData,
  kromkaCardSelect,
  getKromkaCardSelect,
  getCurretKromkaList,
  getCurrentKromkaId,
  hideKromkaList,
  setKromkaActive,
  setGridData,
  setProfileData,
  setKromkaId,
  clearKromkaData,
} = kromkaActions;

const emit = defineEmits(["save-table-data"]);

const {
  MAX_AREA_WIDTH,
  TOTAL_LENGTH,
  TOTAL_HEIGHT,
  BACKGROUND_COLOR,
  MIN_SECTION_WIDTH,
  MIN_SECTION_HEIGHT,
  SECTOR_PADDING,
  PART_MIN_SIZE
} = CUTTER_PARAMS;

let shapeAdjuster = null;

const props = defineProps({
  grid: {
    type: Array,
    default: CUTTER_PARAMS.DEFAULT,
  },
  canvasHeight: {
    type: Number,
    default: 600,
  },
  modelHeight: {
    type: Number,
    default: 20,
  },
});

const tempProfile = ref(null);
const tempUslugi = ref(null);
const kromkaMap = ref([
  "kromka_tri_storony",
  "kromka_perimetr",
  "kromka_torec",
  "kromka_torec_right",
  "kromka_torec_left",
]);

const isMounted = ref(false);
const visualizationRef = ref(null);
const refFooter = ref(null);
const serviseData = ref([]);
const grid = ref([]);
const totalHeight = ref(0);

const tempHole = ref({});

const currentSection = ref(null);

const selectedCell = ref({ col: 0, row: 0 });
const correct = ref({ change: false });
const holeOptions = ref({ show: false, section: { col: 0, row: 0 } });
const cutServise = ref({ show: false, section: { col: 0, row: 0 } });
const splitterContainer = ref(null);
const step = ref(1);

const getHole = computed(() => {
  const colNdx = selectedCell.value.col;
  const rowNdx = selectedCell.value.row;

  const curRow = grid.value[colNdx][rowNdx];

  if (curRow.holes.length > 0) {
    return curRow.holes;
  }
  return [];
});
// Получаем текущую секцию
const getCurrentSection = computed(() => {
  if (!isMounted.value) return;
  const rowNdx = selectedCell.value.row ?? 0;
  const colNdx = selectedCell.value.col ?? 0;

  const currentColl = grid.value[colNdx];
  const currentRow = currentColl[rowNdx];
  return { currentRow, currentColl };
});

const getCurrentProfileData = computed(() => {
  const parent = modelState.getCurrentRaspilParent;
  const { PROFILE } = parent?.userData?.PROPS.CONFIG;
  return PROFILE || [];
});

const currentSectionServiseData = ref([]);
// Получаем данные услуг секции
// const getCurrentSectionServiseData = computed(() => {
//   if (!isMounted.value) return;
//   return getCurrentSection.value.currentRow.serviseData ?? [];
// });

const getCurrentSectionServiseData = computed(() => {
  if (!isMounted.value) return;
  return getCurrentSection.value.currentRow.serviseData ?? [];
});

const getRoundSectionValidation = computed(() => {
  return (col, row) => {
    if (!isMounted.value) return;
    try {
      const currentColl = grid.value[col];
      const currentRow = currentColl[row];

      if ("radius" in currentRow.roundCut) return true;
      return false;
    } catch (e) {
      console.error(e);
    }
  };
});

const checkRounded = computed(() => {
  if (!isMounted.value) return;
  const row = getCurrentSection.value.currentRow;
  if ("radius" in row.roundCut) return true;
  return false;
});

const updateTotalHeight = (value) => {
  totalHeight.value = parseInt(value);

  visualizationRef.value.updateTotalHeight(value);
  // visualizationRef.value.renderGrid();
  reset();
  visualizationRef.value.selectCell(0, 0);
};

const getMaxAreaHeight = (value) => {
  return (value * MAX_AREA_WIDTH) / TOTAL_LENGTH;
};

// const getMaxAreaHeight = computed(() => {
//   return (totalHeight.value * MAX_AREA_WIDTH) / TOTAL_LENGTH;
// });

const showCurrentCol = (colIndex) => {
  selectedCell.value = { col: colIndex, row: 0 };
  visualizationRef.value.selectCell(colIndex, 0);
  holeOptions.value.show = false;
  cutServise.value.show = false;
};

const addVerticalCut = (colIndex) => {
  const column = grid.value[colIndex];
  const halfWidth = column[0].width / 2;

  if (halfWidth < PART_MIN_SIZE || !((column[0].width / 2) % step.value == 0)) return;

  // Обновляем ширину текущей колонки
  column.forEach((row) => {
    row.width = halfWidth;
    row.holes = [];
    row.roundCut = {};
    row.serviseData = createServiseData();
  });

  // Создаем новую колонку с такими же параметрами
  const newColumn = column.map((row) => ({
    ...row,
    roundCut: {},
    holes: [],
    width: halfWidth,
    serviseData: createServiseData(),
  }));

  grid.value.splice(colIndex + 1, 0, newColumn);

  // Обновляем рендер
  visualizationRef.value.renderGrid();
};

const addHorizontalCut = (colIndex, rowIndex) => {
  selectedCell.value.row = rowIndex;
  selectedCell.value.col = colIndex;
  visualizationRef.value.selectCell(colIndex, rowIndex, true);

  const column = grid.value[colIndex];

  column.forEach((row) => {
    row.holes = [];
    row.roundCut = {};
    row.serviseData = createServiseData();
  });

  const curRow = getCurrentSection.value.currentRow;

  const lastRow = column[column.length - 1];
  // const halfHeight = Math.floor(lastRow.height / 2);

  const halfHeight = Math.floor(curRow.height / 2);

  if (halfHeight < PART_MIN_SIZE || !(curRow.height % step.value == 0)) return;

  // Обновляем высоту последней строки
  curRow.height = halfHeight;
  // Добавляем новую строку в эту колонку
  column.splice(rowIndex, 0, {
    width: curRow.width,
    height: curRow.height, // Оставшаяся высота
    roundCut: {},
    holes: [],
    serviseData: createServiseData(),
  });

  // Обновляем рендер
  visualizationRef.value.renderGrid();
};

const addRoundСut = (colIndex) => {
  const column = grid.value[selectedCell.value.col];
  const row = column[selectedCell.value.row];
  row.holes = [];

  let extremum =
    row.width < row.height
      ? row.width - SECTOR_PADDING * 2
      : row.height - SECTOR_PADDING * 2;

  if (extremum > CUTTER_PARAMS.EXTREMUMS.CUT)
    extremum = CUTTER_PARAMS.EXTREMUMS.CUT;

  if (
    row.width < 300 + SECTOR_PADDING * 2 ||
    row.height < 300 + SECTOR_PADDING * 2
  ) {
    alert("Высота и ширина секции должны быть не меньше 360 мм.");
    return;
  }

  row.roundCut = {
    radius: extremum,
  };

  clearServiseData(row);

  visualizationRef.value.renderGrid();
};

const createHoleDataToCheck = (type, row, col) => {
  let width, height, radius, tempHole;

  let extremum =
    row.width < row.height
      ? row.width - SECTOR_PADDING * 2
      : row.height - SECTOR_PADDING * 2;

  if (
    row.width < 300 + SECTOR_PADDING * 2 ||
    row.height < 300 + SECTOR_PADDING * 2
  ) {
    alert("Высота и ширина секции должны быть не меньше 360 мм.");
    return;
  }

  if (extremum > CUTTER_PARAMS.EXTREMUMS.HOLES)
    extremum = CUTTER_PARAMS.EXTREMUMS.HOLES;

  width = extremum;
  height = extremum;
  radius = extremum;

  switch (type) {
    case "rect":
      tempHole = {
        type: "rect",
        width,
        height,
      };
      break;

    case "circle":
      tempHole = {
        type: "circle",
        radius,
      };
      break;
  }

  return visualizationRef.value.checkPositionHoleToCreate(tempHole);
};

const addHole = (type) => {
  const col = grid.value[selectedCell.value.col];
  const row = col[selectedCell.value.row];

  const startHoleData = createHoleDataToCheck(type, row, col);

  if (!startHoleData) {
    // alert("Позиция не найдена");
    return;
  }

  if (selectedCell.value.col === null || selectedCell.value.row === null) {
    alert("Пожалуйста, выберите секцию для добавления прямоугольного выреза");
    return;
  }

  let preperedData;

  switch (type) {
    case "rect":
      preperedData = {
        ...startHoleData,
        lable: "Прямоугольный разрез",
        holeId: row.holes.length,
        Mwidth: 600,
        Mheight: 600,
      };
      break;
    case "circle":
      preperedData = {
        ...startHoleData,
        lable: "Круглый разрез",
        holeId: row.holes.length,
        Mradius: 600,
      };
      break;
  }

  row.holes.push(preperedData);

  // // Обновляем рендер
  visualizationRef.value.renderGrid();
};

const showHoleOptions = (colIndex, rowIndex) => {
  visualizationRef.value.selectCell(colIndex, rowIndex);

  cutServise.value.show = false;
  holeOptions.value.show = true;
  holeOptions.value.section.col = colIndex;
  holeOptions.value.section.row = rowIndex;
};

const showCutServises = (colIndex, rowIndex) => {
  visualizationRef.value.selectCell(colIndex, rowIndex);
  holeOptions.value.show = false;
  cutServise.value.show = true;
  cutServise.value.section.col = colIndex;
  cutServise.value.section.row = rowIndex;
};

const toggleHoleOptions = (colIndex, rowIndex) => {
  cutServise.value.show = false;
  holeOptions.value.show = !holeOptions.value.show;
};

const toggleCutServise = (colIndex, rowIndex) => {
  holeOptions.value.show = false;
  cutServise.value.show = !cutServise.value.show;
};

const getCutServiseActive = computed(() => {
  return (col, row) => {
    if (!isMounted.value) return;
    const { section, show } = cutServise.value;
    return { active: col === section.col && row === section.row && show };
  };
});

const getHoleOptionsActive = computed(() => {
  return (col, row) => {
    if (!isMounted.value) return;
    const { section, show } = holeOptions.value;
    return { active: col === section.col && row === section.row && show };
  };
});

/** =================== @Опции_Услуги =================== */

const createProfileServices = () => {
  /** Отладка */

  // console.log(modelState._PROFILE, "---Profile");

  /*---------------*/
  const parent = modelState.getCurrentRaspilParent;

  const { PROPS } = parent.userData;
  const { PROFILE, USLUGI } = PROPS.CONFIG;
  if (!tempProfile.value.length > 0) return null;

  const activeProfile = tempProfile.value.find((prof) => prof.value);

  const curProfileData = Object.values(modelState._PROFILE).find(
    (el) => el.PROFILE == activeProfile.ID,
  );

  const { SERVICE } = curProfileData;

  // console.log(SERVICE, "----SERVICE---", USLUGI, "--USLUGI");

  const curProfileServise = USLUGI.filter((el) => {
    // console.log(el.ID);
    return SERVICE.includes(el.ID);
  });

  // console.log(curProfileServise, 'curProfileServise')

  if (activeProfile.show_props && activeProfile.show_props?.includes("hem")) {
    getCurretKromkaList();
  }

  console.log(curProfileServise, ' ======= curProfileServise')

  return curProfileServise;
};

const checkProfileDisablegroups = () => {
  const curProfileServise = createProfileServices();
  if (!curProfileServise) return;

  // checkKromkaActive();

  // if (getKromkaActive) {
  //   getCurretKromkaList();
  // }

  grid.value.forEach((column) =>
    column.forEach((row) => {
      const temp = curProfileServise.map((el) => {
        const curUsluga = row.serviseData.find((usluga) => usluga.ID === el.ID);
        if (curUsluga) el.value = curUsluga.value;
        else el.value = false;

        // return el;
        return {
          ID: el.ID,
          NAME: el.NAME,
          NEW_CONSTRUCTOR_GROUP: el.NEW_CONSTRUCTOR_GROUP,
          NEW_CONSTRUCTOR_CHOISEGROUP: el.NEW_CONSTRUCTOR_CHOISEGROUP,
          value: el.value,
          RADIUS: el.RADIUS,
          EURO_WIDTH: el.EURO_WIDTH,
          CORNER: el.CORNER,
          separated: el.separated,
          visible: el.visible,
          show_props: el.show_props,
        };
      });

      row.serviseData = temp;
    }),
  );

  checkKromkaActive();

  if (getKromkaActive) {
    getCurretKromkaList();
  }
};

const convertProfileData = (value, item) => {
  console.log('---- PROF')


  const parent = modelState.getCurrentRaspilParent;

  const { PROPS } = parent.userData;
  const { PROFILE, USLUGI } = PROPS.CONFIG;

  const curProfile = tempProfile.value.find((el) => el.ID === item.ID);

  if (curProfile.ID === 251698 && curProfile.value) {
    checkProfileDisablegroups();
    return;
  }

  // Основное обновление
  tempProfile.value.forEach((profile) => {
    profile.value = profile.ID === item.ID ? value : false;
  });

  //  Если всё выключено — включаем дефолт
  if (tempProfile.value.every((p) => !p.value)) {
    const defaultProfile = tempProfile.value.find((p) => p.ID === 251698);
    if (defaultProfile) {
      defaultProfile.value = true;
    }
  }

  checkProfileDisablegroups();
  visualizationRef.value?.renderGrid();
};

const convertServisData = (value, item) => {
  const parent = modelState.getCurrentRaspilParent;

  const { PROPS } = parent.userData;
  const { USLUGI } = PROPS.CONFIG;

  const separetedOption = parseInt(item.separated) === 0;

  if (separetedOption) {
    updateGlobalService(value, item, tempUslugi.value);
    return;
  }

  updateLocalService(value, item, tempUslugi.value);
};

/** @Обновляет_значение_глобального_сервиса (для всех ячеек и в USLUGI) */

const updateGlobalService = (value, item, USLUGI) => {
  grid.value.forEach((column) =>
    column.forEach((row) => {
      const service = row.serviseData.find((el) => el.ID === item.ID);
      if (service) service.value = value;
    }),
  );

  const globalService = USLUGI.find((el) => el.ID === item.ID);

  if (globalService) {
    globalService.value = value;
  }

  console.log(tempUslugi.value, "tempUslugi.value");
};

/** @Обновляет_локальный_сервис_в_текущей_секции_с_логикой_позиционирования */

const updateLocalService = (value, item, USLUGI) => {
  const currentSection = getCurrentSection.value;
  if (!currentSection?.currentRow?.serviseData) return;

  const data = currentSection.currentRow.serviseData;
  const itemNameLower = item.NAME.toLowerCase();

  // Находим целевой сервис
  const targetService = data.find(
    // (el) => el.NAME.toLowerCase() === itemNameLower
    (el) => el.ID === item.ID,
  );

  if (!targetService) return;

  const targetPosition = targetService.NEW_CONSTRUCTOR_CHOISEGROUP;

  data.forEach((service) => {
    if (service.ID === targetService.ID) return;

    const pos = service.NEW_CONSTRUCTOR_GROUP;
    // console.log(service, targetPosition, "==== ❌ ====");

    if (!pos || !targetPosition) return;
    const isConflict = pos.some((item) => targetPosition.includes(item));
    if (isConflict) {
      service.value = false;
    }
  });

  //  Установка значения для текущего сервиса
  targetService.value = value;

  // console.log(data, " ==== data ====");
  checkKromkaActive();

  if (getKromkaActive) {
    getCurretKromkaList();
  }

  //  Перерисовка
  visualizationRef.value?.renderGrid();
};

/** =================== =================== */

const updateServiseWidth = (value, type) => {
  const newValue = parseInt(value);
  const data = getCurrentSection.value.currentRow.serviseData;
  const row = getCurrentSection.value.currentRow;
  const servise = data.find((el) => el.NAME.toLowerCase() === type);

  if (newValue >= row.width) {
    servise.width = row.width;
  } else {
    servise.width = newValue;
  }

  servise.width = newValue;
  visualizationRef.value.renderGrid();
};

const handleWidthInput = (
  value: number,
  colIndex: number,
  rowIndex: number,
) => {
  // Обновляем выбранную секцию для визуального отображения
  selectedCell.value = { col: colIndex, row: rowIndex };
  visualizationRef.value.selectCell(colIndex, rowIndex);

  // Проверяем валидность значения
  const minWidth = PART_MIN_SIZE;
  const maxWidth = grid.value[colIndex][0].maxWidth || TOTAL_LENGTH;
  if (!isNaN(value) && value >= minWidth && value <= maxWidth) {
    updateSectionWidth(value, colIndex, rowIndex);
  }
};

const handleHeightInput = (
  value: number | null,
  colIndex: number,
  rowIndex: number,
) => {
  // Обновляем выбранную секцию для визуального отображения
  selectedCell.value = { col: colIndex, row: rowIndex };
  visualizationRef.value.selectCell(colIndex, rowIndex);

  // Проверяем валидность значения
  const minHeight = PART_MIN_SIZE;
  const maxHeight = grid.value[colIndex][rowIndex].maxHeight || TOTAL_HEIGHT;
  if (
    value !== null &&
    !isNaN(value) &&
    value >= minHeight &&
    value <= maxHeight
  ) {
    updateSectionHeight(value, colIndex, rowIndex);
  }
};

const updateSectionWidth = (
  value: number,
  colIndex: number,
  rowIndex: number,
) => {
  const newValue = parseInt(value);
  let adjustedValue;

  // Обновляем выбранную секцию для визуального отображения
  selectedCell.value = { col: colIndex, row: rowIndex };
  visualizationRef.value.selectCell(colIndex, rowIndex);

  if (!isNaN(newValue) && visualizationRef.value) {
    adjustedValue = visualizationRef.value.adjustSizeFromExternal({
      dimension: "width",
      value: newValue,
      col: colIndex,
    });
  }

  // Обновляем значение в grid для синхронизации
  const clone = grid.value.map((item) => item);
  if (adjustedValue) {
    clone[colIndex].forEach((row) => (row.width = adjustedValue));
  }
  grid.value = clone;
};

const updateSectionHeight = (value, colIndex, rowIndex) => {
  const newValue = parseInt(value);
  let adjustedValue;
  // Обновляем выбранную секцию для визуального отображения
  selectedCell.value = { col: colIndex, row: rowIndex };
  visualizationRef.value.selectCell(colIndex, rowIndex);

  if (!isNaN(newValue) && visualizationRef.value) {
    const adjustedValue = visualizationRef.value.adjustSizeFromExternal({
      dimension: "height",
      value: newValue,
      col: colIndex,
      row: rowIndex,
    });
  }
  // Обновляем значение в grid для синхронизации
  const clone = grid.value.map((item) => item);
  if (adjustedValue) {
    grid.value[colIndex][rowIndex].height = adjustedValue;
  }
  grid.value = clone;
};

const updateRoundCutDiameter = (value, colIndex, rowIndex) => {
  const gridCopy = grid.value.map((item) => item);
  const column = gridCopy[colIndex];
  const row = column[rowIndex];
  const pixiSector = row.sector;

  const prevValue = row.roundCut.radius;
  let newValue = parseInt(value);
  newValue = newValue > 600 ? 600 : newValue < PART_MIN_SIZE ? PART_MIN_SIZE : newValue;

  const shapeData = {
    radius: newValue,
    x: row.roundCut.x,
    y: row.roundCut.y,
  };

  const check = shapeAdjuster.checkToCollision(
    pixiSector,
    "circleSector",
    shapeData,
  );

  check ? (row.roundCut.radius = newValue) : (row.roundCut.radius = prevValue);

  grid.value = gridCopy;
  visualizationRef.value.renderGrid();
};

const updateHole = (event, key, type, holeType) => {
  const rowNdx = selectedCell.value.row;
  const colNdx = selectedCell.value.col;

  const gridCopy = grid.value.map((item) => item);
  // const gridCopy = grid.value
  const currentColl = gridCopy[colNdx];
  const currentRow = currentColl[rowNdx];

  const currenthole = currentRow.holes[key];

  const prevValue = currentRow.holes[key][type]; //Предыдущее значение

  // let newValue = parseInt(event.target.value);
  let newValue = parseInt(event);
  newValue = newValue > 600 ? 600 : newValue < PART_MIN_SIZE ? PART_MIN_SIZE : newValue;

  const holeData = JSON.parse(JSON.stringify(currenthole));
  holeData[type] = newValue;

  const pixiSector = currentRow.sector;

  currenthole[`M${type}`] = 600;

  const check = shapeAdjuster.checkToCollision(pixiSector, holeType, holeData);

  if (check) {
    currenthole[type] = newValue;
  } else {
    currenthole[type] = prevValue;
    currenthole[`M${type}`] = prevValue;
  }

  grid.value = gridCopy;

  visualizationRef.value.renderGrid();
};

const changeHolePositionX = (event, key, type, holeType, value) => {
  const rowNdx = selectedCell.value.row;
  const colNdx = selectedCell.value.col;

  const gridCopy = grid.value.map((item) => item);
  const currentColl = gridCopy[colNdx];
  const currentRow = currentColl[rowNdx];

  const currenthole = currentRow.holes[key];

  const prevValue = currentRow.holes[key].x; //Предыдущее значение

  const newValue = prevValue + value;

  const holeData = JSON.parse(JSON.stringify(currenthole));
  holeData.x = newValue;

  const pixiSector = currentRow.sector;

  const check = shapeAdjuster.checkToCollision(pixiSector, holeType, holeData);

  if (check) {
    currenthole.x = newValue;
  } else {
    currenthole.x = prevValue;
  }

  grid.value = gridCopy;

  visualizationRef.value.renderGrid();
};

const changeHolePositionY = (event, key, type, holeType, value) => {
  const rowNdx = selectedCell.value.row;
  const colNdx = selectedCell.value.col;

  const gridCopy = grid.value.map((item) => item);
  const currentColl = gridCopy[colNdx];
  const currentRow = currentColl[rowNdx];

  const currenthole = currentRow.holes[key];

  const prevValue = currentRow.holes[key].y; //Предыдущее значение

  const newValue = prevValue + value;

  const holeData = JSON.parse(JSON.stringify(currenthole));
  holeData.y = newValue;

  const pixiSector = currentRow.sector;

  // Проверяем коллизию
  const check = shapeAdjuster.checkToCollision(pixiSector, holeType, holeData);

  if (check) {
    currenthole.y = newValue;
  } else {
    currenthole.y = prevValue;
  }

  grid.value = gridCopy;

  visualizationRef.value.renderGrid();
};

const deliteVerticalCut = (colIndex) => {
  const current = grid.value[colIndex];
  const next = grid.value[colIndex + 1];
  const prev = grid.value[colIndex - 1];

  const combinedWidth = next
    ? current[0].width + next[0].width
    : current[0].width + prev[0].width;

  if (next) {
    next.forEach((elem) => {
      elem.width = combinedWidth;
    });
  } else {
    prev.forEach((elem) => {
      elem.width = combinedWidth;
    });
  }

  if (grid.value.length > 1) {
    grid.value.splice(colIndex, 1);
  }

  selectedCell.value.row = 0;
  selectedCell.value.col = 0;

  visualizationRef.value.renderGrid();
};

const deliteHorizontalCut = (rowIndex, colIndex) => {
  // const column = grid.value[colIndex];
  const clone = grid.value.map((item) => item);
  const currentCol = clone[colIndex];
  const currentRow = currentCol[rowIndex];

  const next = currentCol[rowIndex + 1];
  const prev = currentCol[rowIndex - 1];

  const combinedWidth = next
    ? currentRow.height + next.height
    : currentRow.height + prev.height;

  next ? (next.height = combinedWidth) : (prev.height = combinedWidth);

  if (currentCol.length > 1) {
    currentCol.splice(rowIndex, 1);
  }

  currentCol.forEach((row) => {
    row.roundCut = {};
  });

  grid.value = clone;

  // Обновляем текущий сектор
  selectedCell.value.row = 0;
  selectedCell.value.col = colIndex;

  visualizationRef.value.renderGrid();
};

const deliteRoundCut = (colIndex, rowIndex) => {
  const col = grid.value[colIndex];
  const row = col[rowIndex];

  row.roundCut = {};
  visualizationRef.value.renderGrid();
};

const deliteHole = (ndx) => {
  const colNdx = selectedCell.value.col;
  const rowNdx = selectedCell.value.row;
  const curRow = grid.value[colNdx][rowNdx];

  curRow.holes = curRow.holes.filter((el, index) => {
    return index !== ndx;
  });

  visualizationRef.value.renderGrid();
};

const disableVisible = (event, colIndex, rowIndex) => {
  const col = grid.value[colIndex];
  const row = col[rowIndex];
  row.disabled = event.target.checked;
};

const checkDisabled = computed(() => {
  return (row) => {
    const { disabled } = row;
    const result = checkDisableVisible();
    // disableActive.value = result;
    // if (!disabled && result) disableActive.value = true;
    return !disabled && result;
  };
});

const checkDisableVisible = () => {
  const disabledValues = grid.value.flat(2).map((o) => o.disabled);
  const result =
    disabledValues.filter(Boolean).length + 1 === disabledValues.length;

  return result;
};

const handleCellSelect = (colIndex, rowIndex, type) => {
  selectedCell.value = { col: colIndex, row: rowIndex };

  const roundSector = grid.value[colIndex][rowIndex];
  if ("radius" in roundSector.roundCut) {
    holeOptions.value.show = false;
    cutServise.value.show = false;
    return;
  }

  holeOptions.value.section.col = colIndex;
  holeOptions.value.section.row = rowIndex;
  cutServise.value.section.col = colIndex;
  cutServise.value.section.row = rowIndex;
};

const createServiseData = () => {
  const parent = modelState.getCurrentRaspilParent;

  const { PROPS } = parent.userData;
  const { PROFILE, USLUGI } = PROPS.CONFIG;

  const serviseList =
    tempProfile.value.length > 0 ? createProfileServices() : tempUslugi.value;

  const convertParams = serviseList.reduce((acc, el) => {
    const checkGlobal = el.separated == 0 ? el.value : false;

    const param = {
      // ...el,
      // value: checkGlobal,
      ID: el.ID,
      NAME: el.NAME,
      NEW_CONSTRUCTOR_GROUP: el.NEW_CONSTRUCTOR_GROUP,
      NEW_CONSTRUCTOR_CHOISEGROUP: el.NEW_CONSTRUCTOR_CHOISEGROUP,
      value: checkGlobal,
      RADIUS: el.RADIUS,
      EURO_WIDTH: el.EURO_WIDTH,
      CORNER: el.CORNER,
      separated: el.separated,
      visible: el.visible,
      show_props: el.show_props,
    };
    acc.push(param);
    return acc;
  }, []);

  console.log(convertParams, "convertParams");

  return convertParams;
};

const clearServiseData = (row) => {
  row.serviseData.forEach((el) => {
    el.value = false;
  });
};

const reset = (reset = false) => {
  const parent = modelState.getCurrentRaspilParent;

  const { PROPS } = parent.userData;
  const { USLUGI } = PROPS.CONFIG;

  grid.value.length = 0;
  grid.value.push([
    {
      width: TOTAL_LENGTH,
      height: totalHeight.value,
      roundCut: {},
      holes: [],
      serviseData: USLUGI,
    },
  ]);
  holeOptions.value = { show: false, section: { col: 0, row: 0 } };
  cutServise.value = { show: false, section: { col: 0, row: 0 } };
  visualizationRef.value.renderGrid();
  if (reset) {
    visualizationRef.value.selectCell(0, 0);
  }
};

const saveProfile = () => {
  // console.log(getCurrentKromkaId(), "tempKromka.value;");

  const parent = modelState.getCurrentRaspilParent;
  const { PROPS } = parent.userData;
  PROPS.CONFIG.USLUGI = tempUslugi.value;
  PROPS.CONFIG.PROFILE = tempProfile.value;
  PROPS.CONFIG.KROMKA = getCurrentKromkaId();
};

const saveGrid = () => {
  const garbage = ["sector", "shapesBond", "maxX", "maxY", "minX", "minY"];
  const clone = grid.value.reduce((acc, el) => {
    const correct = el.reduce((acc, el) => {
      let clone = {};
      for (let value in el) {
        if (!garbage.includes(value)) {
          if (value === "roundCut") {
            if ("graphic" in el[value]) {
              delete el[value].graphic;
            }
          }
          if (value === "xOffset") {
            clone[value] = shapeAdjuster.getMmWidth(el[value]);
          } else if (value === "yOffset") {
            clone[value] = shapeAdjuster.getMmHeight(el[value]);
          } else {
            clone[value] = el[value];
          }
        }
      }
      acc.push(clone);
      return acc;
    }, []);
    acc.push(correct);
    return acc;
  }, []);

  const data = {
    modelHeight: props.modelHeight,
    canvasHeight: totalHeight.value,
    data: clone,
  };

  saveProfile();

  toaster.success("Параметры столешницы сохранены", refFooter.value);

  return data;
};

defineExpose({
  saveGrid,
});

onBeforeMount(() => {
  console.log(
    modelState.getCurrentRaspilParent,
    "==== getCurrentRaspilParent ====",
  );

  const parent = modelState.getCurrentRaspilParent;
  const { PROPS } = parent.userData;
  const { PROFILE, KROMKA, USLUGI } = PROPS.CONFIG;

  totalHeight.value = props.canvasHeight;
  // Делаем клон для реактивности
  grid.value = JSON.parse(JSON.stringify(props.grid));
  tempProfile.value = JSON.parse(JSON.stringify(PROFILE));
  tempUslugi.value = JSON.parse(JSON.stringify(USLUGI));
  setGridData(grid.value);
  setProfileData(tempProfile.value);
  setKromkaId(KROMKA);
});

onMounted(() => {
  shapeAdjuster = new ShapeAdjuster();
  createServiseData();
  checkProfileDisablegroups();

  nextTick().then(() => {
    isMounted.value = true;
  });
});

onBeforeUnmount(() => {
  console.log(
    modelState.getCurrentRaspilParent,
    "==== getCurrentRaspilParent ====",
  );

  shapeAdjuster = null;
  grid.value = null;
  clearKromkaData();
});
</script>

<template>
  <div class="splitter-wrapper">
    <div
      class="splitter-container splitter-container--left"
      ref="splitterContainer"
      @click="hideKromkaList"
    >
      <div class="splitter-header">
        <div class="splitter-header--title"><h1>Настройки распила</h1></div>
        <div class="actions-inputs">
          <p class="actions-title">Высота полотна</p>
          <div class="actions-input--container">
            <MainInput
              @update:modelValue="updateTotalHeight"
              :inputClass="'actions-input'"
              v-model="totalHeight"
              :min="200"
              :max="1200"
              :type="'number'"
            />
          </div>
        </div>
      </div>

      <div class="splitter-content">
        <Visualization
          v-if="isMounted"
          ref="visualizationRef"
          :step="step"
          :grid="grid"
          :correct="correct"
          :container="splitterContainer"
          :max-area-height="props.canvasHeight"
          :tempHole="tempHole"
          @cell-selected="handleCellSelect"
        />
      </div>

      <section class="actions-wrapper">
        <div class="actions-header">
          <div
            :class="[
              'actions-header--container',
              { active: colIndex === selectedCell.col },
            ]"
            v-for="(column, colIndex) in grid"
            :key="colIndex"
          >
            <button
              v-if="grid.length > 1"
              class="actions-btn actions-icon"
              @click="deliteVerticalCut(colIndex)"
            >
              <img
                class="actions-icon--delite"
                src="/icons/delite.svg"
                alt=""
              />
            </button>
            <p
              class="actions-title actions-title--part"
              @click="showCurrentCol(colIndex)"
            >
              {{ colIndex + 1 }} группа
            </p>
          </div>
        </div>

        <div
          class="actions-container"
          v-for="(column, colIndex) in grid"
          :key="colIndex"
        >
          <div
            class="actions-items--wrapper"
            v-if="selectedCell.col === colIndex"
          >
            <div
              v-for="(row, rowIndex) in column"
              :key="rowIndex"
              :class="[
                'actions-items--container',
                {
                  active:
                    rowIndex === selectedCell.row &&
                    colIndex === selectedCell.col,
                },
              ]"
            >
              <article class="actions-items actions-items--left">
                <div class="actions-items--left-wrapper">
                  <div class="actions-items--title">
                    <button
                      v-if="column.length > 1"
                      class="actions-btn actions-icon"
                      @click="deliteHorizontalCut(rowIndex, colIndex)"
                    >
                      <img
                        class="actions-icon--delite"
                        src="/icons/delite.svg"
                        alt=""
                      />
                    </button>
                    <p class="actions-title actions-title--part">
                      {{ colIndex + 1 }}.{{ rowIndex + 1 }} часть
                    </p>
                  </div>

                  <div class="actions-items--width" v-if="!row.roundCut.radius">
                    <div class="actions-inputs">
                      <p class="actions-title">Ширина</p>
                      <div
                        :class="[
                          'actions-input--container',
                          grid.length <= 1 ? 'disable' : '',
                        ]"
                      >
                        <TableTopInput
                          :value="column[0].width"
                          :step="step"
                          :min="PART_MIN_SIZE"
                          :max="column[0].maxWidth || TOTAL_LENGTH"
                          :disabled="grid.length < 0"
                          @input="handleWidthInput($event, colIndex, rowIndex)"
                          @update:value="
                            updateSectionWidth($event, colIndex, rowIndex)
                          "
                        />
                      </div>
                    </div>
                  </div>
                  <!-------------------------- @НА ДАННЫЙ МОМЕНТ НЕТ ЦЕНООБРАЗОВАНИЯ ------------------------>

                  <!-- <div class="actions-items--height">   
                    <div class="actions-inputs">
                      <p class="actions-title">
                        Высота {{ colIndex + 1 }}.{{ rowIndex + 1 }}
                      </p>
                      <div
                        :class="[
                          'actions-input--container',
                          column.length <= 1 ? 'disable' : '',
                        ]"
                      >
                        <TableTopInput
                          :value="row.height"
                          :step="step"
                          :min="PART_MIN_SIZE"
                          :max="row.maxHeight || TOTAL_LENGTH"
                          :disabled="grid.length < 0"
                          @input="handleHeightInput($event, colIndex, rowIndex)"
                          @update:value="
                            updateSectionHeight($event, colIndex, rowIndex)
                          "
                        />
                      </div>
                    </div>
                  </div>

                  <div
                    class="actions-items--diametr"
                    v-if="row.roundCut.radius"
                  >
                    <button
                      v-if="row.roundCut.radius"
                      @click="deliteRoundCut(colIndex, rowIndex)"
                      class="actions-btn actions-icon actions-icon--bottom"
                    >
                      <img
                        class="actions-icon--delite actions-icon--delite-center"
                        src="/icons/delite.svg"
                        alt=""
                      />
                    </button>
                    <div class="actions-inputs">
                      <p class="actions-title">
                        Диаметр {{ colIndex + 1 }}.{{ rowIndex + 1 }}
                      </p>
                      <div class="actions-input--container">
                        <input
                          type="number"
                          step="5"
                          min="300"
                          max="600"
                          class="actions-input"
                          :value="row.roundCut.radius"
                          @input="
                            updateRoundCutDiameter(
                              $event.target.value,
                              colIndex,
                              rowIndex,
                            )
                          "
                        />
                      </div>
                    </div>
                  </div> -->

                  <!----------------------------------------------------------------------------------------->

                  <div class="actions-items--title" v-if="!checkDisabled(row)">
                    <label
                      class="control control-checkbox control-checkbox--bottom"
                    >
                      <input
                        type="checkbox"
                        :disabled="checkDisabled(row)"
                        :checked="row.disabled"
                        @change="disableVisible($event, colIndex, rowIndex)"
                      />
                      <span class="control_indicator"></span>
                      <span class="actions-title">Скрыть</span>
                    </label>
                  </div>
                </div>
              </article>

              <article class="actions-items actions-items--right">
                <div class="actions-items--right-items">
                  <button
                    class="actions-btn actions-btn--default"
                    @click="addVerticalCut(colIndex)"
                  >
                    Верт.распил
                  </button>

                  <!-------------------------- @НА ДАННЫЙ МОМЕНТ НЕТ ЦЕНООБРАЗОВАНИЯ ------------------------>

                  <!-- <button
                    class="actions-btn actions-btn--default"
                    @click="addHorizontalCut(colIndex, rowIndex)"
                  >
                    Горизон.распил
                  </button>

                  <button
                    class="actions-btn actions-btn--default"
                    @click="addRoundСut(colIndex)"
                    v-if="!getRoundSectionValidation(colIndex, rowIndex)"
                  >
                    Круг.распил
                  </button> -->

                  <!-- <button
                    :class="[
                      'actions-btn actions-btn--default',
                      getHoleOptionsActive(colIndex, rowIndex),
                    ]"
                    v-if="!getRoundSectionValidation(colIndex, rowIndex)"
                    @click="showHoleOptions(colIndex, rowIndex)"
                  >
                    Разрез
                  </button> -->

                  <!---------------------------------------------------------------------------------------------------->

                  <button
                    :class="[
                      'actions-btn actions-btn--default',
                      getCutServiseActive(colIndex, rowIndex),
                    ]"
                    v-if="!getRoundSectionValidation(colIndex, rowIndex)"
                    @click="showCutServises(colIndex, rowIndex)"
                  >
                    Услуги
                  </button>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section class="actions-footer" ref="refFooter">
        <div class="actions-footer--delite">
          <button class="actions-btn actions-btn--footer" @click="reset(true)">
            Сбросить
          </button>
          <slot name="delite"></slot>
        </div>
        <div class="actions-footer--save">
          <!-- <button class="actions-btn actions-btn--footer" @click="save">
            Сохранить
          </button> -->
          <slot name="save"></slot>
          <slot name="close"></slot>
        </div>
      </section>
    </div>

    <div
      class="splitter-container splitter-container--right"
      v-if="
        (holeOptions.show && !checkRounded && !cutServise.show) ||
        (cutServise.show && !checkRounded && !holeOptions.show)
      "
    >
      <transition name="slide--right">
        <div
          class="kromka__container"
          v-if="getKromkaActive && getKromkaCardSelect"
        >
          <MaterialSelector :materials="getKromkaList" @select="kromkaSelect" />
        </div>
      </transition>

      <CutOptions
        v-if="holeOptions.show"
        :holes="getHole"
        :step="step"
        @cut-addHole="addHole"
        @cut-deleteHole="deliteHole"
        @cut-updateHole="updateHole"
        @cut-toggleHoleOptions="toggleHoleOptions"
        @cut-changePositionX="changeHolePositionX"
        @cut-changePositionY="changeHolePositionY"
      />

      <CutServise
        v-if="cutServise.show"
        :profile-data="tempProfile"
        :servise-data="getCurrentSectionServiseData"
        :current-section="getCurrentSection"
        @cut-toggleCutServise="toggleCutServise"
        @cut-servisData="convertServisData"
        @cut-updateServise="updateServiseWidth"
        @cut-profileData="convertProfileData"
      >
        <template #kromkaSelect>
          <KromkaCard
            :data="getKromkaCardData"
            @kromka-kard-select="kromkaCardSelect"
          />
        </template>
      </CutServise>
    </div>
  </div>
</template>

<style lang="scss">
.splitter {
  &-wrapper {
    display: flex;
    gap: 1rem;
    justify-content: center;
    width: 100%;
    height: 85vh;
    max-width: 85vw;

    font-family:
      "Gill Sans", "Gill Sans MT", Calibri, "Trebuchet MS", sans-serif;
  }

  &-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;

    width: 100%;

    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    padding: 20px;

    &--left {
      max-width: 60vw;
    }

    &--right {
      max-width: 25vw;
      max-height: 100%;
      overflow: hidden;
      // position: relative;
    }
  }

  &-content {
    display: flex;
    justify-content: center;
    height: 320px;
  }

  &-title {
    font-weight: 400;
    color: #131313;
  }

  &-header {
    display: flex;
    justify-content: center;
    gap: 2rem;
    &--title {
      display: flex;
      align-items: end;
    }

    .actions-inputs {
      max-width: PART_MIN_SIZEpx;
    }
  }
}

.actions {
  &-wrapper {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding-right: 0.5rem;
  }

  &-footer {
    display: flex;
    justify-content: space-between;
    margin-top: auto;
    &--save,
    &--delite {
      display: flex;
      gap: 1rem;
    }
  }

  &-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    max-height: 450px;
    overflow-y: scroll;
    padding-right: 0.5rem;

    &::-webkit-scrollbar {
      width: 5px;
      /* Ширина скроллбара */
    }

    &::-webkit-scrollbar-button {
      display: none;
      /* Убираем стрелки */
    }

    &::-webkit-scrollbar-thumb {
      background: #888;
      /* Цвет ползунка */
      border-radius: 4px;
    }
  }

  &-header {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
    width: 100%;
    padding: 1rem 0;
    border-bottom: 1px solid #ecebf1;
    border-top: 1px solid #ecebf1;

    &--container {
      display: flex;
      align-items: center;
      // gap: 0.5rem;
      padding-right: 0.5rem;
      border-right: 1px solid #ecebf1;
      border-bottom: 1px solid transparent;
      cursor: pointer;

      &.active {
        border-bottom: 1px solid #da444c;
      }
    }
  }

  &-items {
    display: flex;
    flex-wrap: wrap;
    // gap: 1rem;
    align-items: center;

    &--wrapper {
      display: flex;
      flex-direction: column;

      width: 100%;
      padding: 0 0 1rem 0;
    }

    &--container {
      display: flex;
      width: 100%;
      padding: 1rem 0;
      border-bottom: 1px solid #ecebf1;

      // &:first-child {
      //   padding-top: 0;
      // }

      &.active {
        background-color: #f1f1f5;
      }
    }

    &--left,
    &--right {
      width: 100%;
    }

    &--left {
      align-items: start;
      max-width: 45%;

      &-wrapper {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
        margin-left: 1rem;
        // max-width: calc(50% - 1rem);
      }
    }

    &--right {
      max-width: calc(65% - 1rem);
      margin-left: 1rem;

      &-items {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
      }
    }

    &--height,
    &--diametr,
    &--width {
      display: flex;
      width: fit-content;

      &-item {
        display: flex;
        align-items: flex-start;
        height: fit-content;
        // gap: 0.5rem;
      }
    }

    &--title {
      display: flex;
      align-items: center;
      align-self: end;
      margin-bottom: 0.5rem;
    }

    // &--diametr {
    //   display: flex;
    //   flex-wrap: wrap;
    //   gap: 1rem;

    //   &-wrapper {
    //     max-width: 25%;
    //   }

    //   &-item {
    //     display: flex;
    //     align-items: flex-start;
    //     width: 100%;
    //     height: fit-content;
    //     // gap: 0.5rem;
    //   }
    // }

    // &--width {
    //   display: flex;
    //   gap: 1rem;
    //   align-items: start;
    //   flex-wrap: wrap;
    //   width: 100%;
    //   max-width: 20%;
    //   height: 100%;
    // }

    // &--diametr,
    // &--height {
    //   &-wrapper {
    //     width: 100%;
    //     margin-left: 1rem;
    //     border-right: 1px solid #ecebf1;
    //   }
    // }
  }

  &-title {
    font-size: 1rem;
    color: #a3a9b5;

    // &--part {
    //   margin-bottom: 0.5rem;
    // }
  }

  &-inputs {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
    max-width: 100px;
  }

  &-input {
    padding: 0.5rem 1rem;
    width: 100%;
    max-width: 125px;
    border: none;
    border-radius: 15px;
    background-color: #ecebf1;
    color: #6d6e73;
    font-size: 1rem;
    font-weight: 600;

    &:focus {
      outline: none;
    }

    &--container {
      position: relative;

      &::before {
        content: "mm";
        display: block;
        position: absolute;
        top: 50%;
        left: 60px;
        transform: translate(0, -50%);
        pointer-events: none;
        z-index: 0;
        font-size: 0.75rem;
        font-weight: 600;
        color: #6d6e73;
      }
    }
  }

  &-btn {
    padding: 0.5rem 1rem;
    border: 1px solid #ecebf1;
    border-radius: 15px;
    background-color: #ffffff;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: bold;
    color: #5d6069;
    outline: none;

    &--default,
    &--footer {
      transition-property: background-color, color, border;
      transition-timing-function: ease;
      transition-duration: 0.25s;
      @media (hover: hover) {
        /* when hover is supported */
        &:hover {
          color: white;
          background-color: #da444c;
          border: 1px solid transparent;
        }
      }
    }
    &--footer {
      background-color: #ecebf1;
    }

    &:focus {
      outline: none;
    }
    &.active {
      border-color: #da444c;
      color: #181818;
      transition-property: background-color, color, border;
      transition-timing-function: ease;
      transition-duration: 0.25s;

      @media (hover: hover) {
        /* when hover is supported */
        &:hover {
          color: white;
          background-color: #da444c;
        }
      }
    }
  }

  &-icon {
    border: none;
    background-color: transparent;
    padding: 0 5px;

    &--delite,
    &--close,
    &--help {
      width: 18px;
      height: 18px;
    }

    &--add {
      width: 12px;
      height: 12px;
    }

    &--delite {
      &-center {
        margin-bottom: 0.5rem;
      }
    }

    &--bottom {
      align-self: flex-end;
      padding: 5px;
    }

    &--position {
      width: 25px;
      height: 25px;
    }
  }
}

.line {
  &-bottom {
    width: 100%;
    padding-bottom: 10px;
    border-bottom: 1px solid black;
  }
}

.disable {
  pointer-events: none;
  cursor: auto;
}

.close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
}

.kromka {
  &__container {
    position: absolute;
    background-color: $white;
    border-radius: 15px;
    max-width: 25vw;
    z-index: 1;
    right: 5rem;
  }
}
.control-checkbox {
  &--bottom {
    margin-bottom: 0;
  }
}
</style>
