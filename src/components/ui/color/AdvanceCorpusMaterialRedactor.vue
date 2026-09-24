<script setup lang="ts">
// @ts-nocheck 31
import MaterialSelector from "@/components/right-menu/customiser-pages/ColorRightPage/MaterialSelector.vue";

import {
  defineProps,
  ref,
  onMounted,
  computed,
  onBeforeMount,
  onBeforeUnmount,
} from "vue";
import { useModelState } from "@/store/appliction/useModelState";
import { useAppData } from "@/store/appliction/useAppData";
import { useUMStorage } from "@/store/appStore/UniversalModule/useUMStorage";

import MillingRedactor from "@/components/right-menu/customiser-pages/ColorRightPage/MillingRedactor.vue";
import PatinaRedactor from "@/components/right-menu/customiser-pages/ColorRightPage/PatinaRedactor.vue";
import GlassRedactor from "@/components/right-menu/customiser-pages/ColorRightPage/GlassRedactor.vue";
import ConfigurationOption from "@/components/right-menu/customiser-pages/ColorRightPage/ConfigurationOption.vue";
import SurfaceRedactor from "@/components/right-menu/customiser-pages/ColorRightPage/SurfaceRedactor.vue";
import ColorRedactor from "@/components/right-menu/customiser-pages/ColorRightPage/ColorRedactor.vue";
import { useHandlesAction } from "@/components/right-menu/customiser-pages/FigureRightPage/Handles/useHandlesAction.ts";
import { useConversationActions } from "@/components/right-menu/actions/useConversationActions.ts";
import LoopPositionSelect from "@/components/ui/direction/LoopPositionSelect.vue";
import ShowcaseRedactor from "@/components/right-menu/customiser-pages/ColorRightPage/ShowcaseRedactor.vue";
import {
  FASADE_OPTION_KEYS,
  getDefaultPatinaForMilling,
} from "@/components/right-menu/customiser-pages/ColorRightPage/domain/fasadeOptions";
import { useFasadeOptionsState } from "@/components/right-menu/customiser-pages/ColorRightPage/composables/useFasadeOptionsState";
import { useUMFasadeCommands } from "@/components/right-menu/customiser-pages/ColorRightPage/composables/useUMFasadeCommands";
import { scrollToActiveOption } from "@/components/right-menu/customiser-pages/ColorRightPage/composables/scrollToActiveOption";

const umStorage = useUMStorage();

const props = defineProps({
  elementIndex: [Number, String] /** Индекс выбранного элемента */,
  elementData: Object,
  fasadeSize: {
    type: Object,
    default: false,
  },
  isFasade: {
    type: Boolean,
    default: false,
  },
  materialList: {
    type: Array,
    default: [],
  },
  noGlass: {
    type: Boolean,
    default: false,
  },
});

const { getIntegratedHandleControllerData } = useHandlesAction();
const {
  filterMaterialsConversations,
  checkFasadeConversations,
  filterFasadeConversations,
} = useConversationActions();

enum partsNames {
  PROFILECOLOR = "Цвет профиля",
}

const emit = defineEmits(["parent-callback", "select_material"]);

/** Запись выбранного значения в материал ячейки УМ (selectOption родителя) */
const callback = (material: Object, type: String, paletteId?: Number, alumModel?: number) => {
  emit("parent-callback", material, type, paletteId, alumModel);
};

// Все записи в материал ячейки, данные элемента и модель — через команды
const commands = useUMFasadeCommands({
  sendToCell: callback,
  getElementIndex: () => props.elementIndex,
  getElementData: () =>
    props.elementData || productData.value.PROPS.CONFIG.FASADE_PROPS[props.elementIndex],
  getProductData: () => productData.value,
});

const _APP = useAppData().getAppData;
const _FASADE = _APP.FASADE;
const _COLOR = _APP.COLOR;

const modelState = useModelState();

const materialList = ref(null);
const productData = ref(null);
const productId = ref(null);
/** Данные редактируемого элемента (материал ячейки / FASADE_PROPS / CONFIG[элемент]) — задаются в prepareData */
const currentElementData = ref(null);
const mainContainer = ref<HTMLElement | null>(null);

/**
 * Текущие значения элемента для подсветки выбранного в списках. Берутся из props, а не из
 * currentElementData: SidecolorsView после каждого выбора передаёт новую копию данных стенки
 * (getCurrentValue = { ...CONFIG[сторона] }), а запомненная при открытии копия не обновляется
 */
const selectedValues = computed(() => props.elementData || currentElementData.value);

let currentEditableOption = ref<String>("surface");

const { surface, fasadeOptions, resetOptionsState } = useFasadeOptionsState();
// Слоты опций: { list, exists, current }. Не заменяются при сбросе, поэтому деструктуризация безопасна
const { milling, palette, patina, glass, showcase } = fasadeOptions;

const fasadeTypesList = ref<Array>([]);
const isFasadeTypesExist = ref<boolean>(false);

const fasadeHandleList = ref<Array>([]);
const isFasadeHandleExist = ref<boolean>(false);

/**
 * Размер выбранной ячейки сетки УМ — для фильтра фрезеровок по размеру (тот же фильтр
 * применяет сцена при пересборке). null — ячейка не выбрана или не найдена (наполнение,
 * накладка, боковина): список фрезеровок строится без фильтра
 */
const getSelectedCellSize = () => {
  const selected = umStorage.getSelected("fasades");

  if (!selected) {
    return null;
  }

  const { sec, cell, row } = selected;
  const grid = umStorage.getUMGrid();
  // Фасады вне секций лежат в grid.fasades — как в FasadesView.selectOption
  const curFasade = sec === null
    ? grid.fasades?.[cell]?.[row]
    : grid.sections[sec]?.fasades?.[cell]?.[row];

  if (!curFasade) {
    return null;
  }

  return { FASADE_WIDTH: curFasade.width, FASADE_HEIGHT: curFasade.height };
};

/** Фрезеровки полотна для текущего элемента — с фильтром по размеру ячейки, если он известен */
const buildMillingList = (materialId) => {
  modelState.createCurrentMillingData({
    fasadeId: materialId,
    productId: productId.value,
    fasadeNdx: props.elementIndex,
    fasadeSize: getSelectedCellSize(),
  });
};

/**
 * Типы фасада (положения интегрированной ручки) под полотно. Стор заполняется здесь же —
 * раньше редактор УМ читал список, оставшийся от другого фасада. Только для фасадов:
 * у накладок и боковин индекс строковый, и getIntegratedHandleControllerData на нём падает
 */
const buildFasadeTypes = (materialId) => {
  if (!props.isFasade || !_FASADE[materialId]?.fasade_type) {
    return [];
  }

  return modelState.createCurrentFasadeTypesData({
    fasadeId: materialId,
    productId: productId.value,
  });
};

const onSelectMaterial = (data) => {
  const isDowerSelect = umStorage.getSelected("fillings")

  const { PROPS } = productData.value;
  const { CONFIG, FASADE } = PROPS;
  const { FASADE_POSITIONS, FASADE_PROPS } = CONFIG;
  const product = _APP.CATALOG.PRODUCTS[productId.value];
  const { COLOR, RESET_COLOR, ALUM, SHOWCASE } =
    props.elementData || FASADE_PROPS[props.elementIndex];

  let haveShowcase;
  let dataOfFasadeType;

  if (props.isFasade && !isDowerSelect) {
    const checkConversation = checkFasadeConversations(
      data.ID,
      props.fasadeSize || FASADE[props.elementIndex].userData.trueSize,
    );

    if (!checkConversation) return;

    commands.setMaterialRestrictions(data.ID);
  }

  surface.selected = true;
  surface.current = data;

  dataOfFasadeType = _FASADE[COLOR] || _COLOR[COLOR];
  haveShowcase = !!SHOWCASE;
  let disablePatina = false;

  if (data.ATTACH_MILLINGS?.[0] || data.ATTACH_MILLINGS_SIDE?.[0]) {
    // Раньше список строился дважды, и второй вызов без размера затирал отфильтрованный
    buildMillingList(data.ID);

    modelState.createCurrentPatinaData({
      fasadeId: data.ID,
      productId: productId.value,
    });

    modelState.createCurrentShowcaseData({
      fasadeId: data.ID,
      productId: productId.value,
    });

    milling.list = modelState.getCurrentMillingData;
    patina.list = modelState.getCurrentPatinaData;

    if (
      typeof props.elementIndex === "string" &&
      props.elementIndex.toLowerCase().includes("sidecolor")
    ) {
      /*milling.list = milling.list.filter(item => {
        if ([2462671, 2503106, 2839850, 1596264].includes(item.ID))
          return item
      })*/
      patina.list = [];
      patina.exists = false;
      disablePatina = true;
    } else {
      /** @Патина */
      patina.exists =
        patina.list.length > 0 && !product.type_showcase[0];
    }

    milling.exists = milling.list.length > 0 && !haveShowcase;
  } else {
    milling.exists = false;
    palette.exists = false;
    patina.exists = false;
  }

  if (data.ATTACH_GLASS?.[0]) {
    modelState.createCurrentGlassData({
      fasadeId: data.ID,
      productId: productId.value,
      fasadeNdx: props.elementIndex,
    });
  } else {
    glass.list = false;
  }

  modelState.createCurrentPaletteData(data.ID);

  /** @Палитра */
  palette.list = modelState.getCurrentPaletteData;
  palette.exists = Object.keys(palette.list).length > 0;

  /** @Витрины */
  showcase.list = modelState.getCurrentShowcaseData;


  showcase.exists = !data.MATERIAL?.includes("Alum") &&
    haveShowcase && data.id !== RESET_COLOR &&
    showcase.list.length > 0;

  /** @Стёкла */
  glass.list = modelState.getCurrentGlassData;
  glass.exists = !props.noGlass && (glass.list.length > 0 && haveShowcase || glass.list.length > 0 && data.MATERIAL?.includes("Alum"));

  /** @Тип_фасада */
  const fasadeTypes = buildFasadeTypes(data.ID);
  isFasadeTypesExist.value = fasadeTypes.length > 0;

  isFasadeHandleExist.value = false;
  fasadeHandleList.value = {};
  commands.setMillingType(false);

  // ================================================================================================================

  if (milling.exists) {
    const { NAME, PREVIEW_PICTURE, ID, PATINAOFF } = milling.list[0];
    commands.setMilling(milling.list[0]);
    milling.current = { name: NAME, imgSrc: PREVIEW_PICTURE };

    patina.exists =
      patina.list.length > 0 &&
      milling.exists &&
      PATINAOFF == 0 &&
      !disablePatina;
  } else {
    milling.current = {};
    isFasadeHandleExist.value = false;
    fasadeHandleList.value = {};
    commands.setMilling(false);
    commands.setMillingType(false);
    patina.exists = false;
  }

  if (patina.exists) {
    const { NAME, PREVIEW_PICTURE, ID } = patina.list[0];
    patina.current = { name: NAME, imgSrc: PREVIEW_PICTURE };
    commands.setPatina(patina.list[0]);
  } else commands.setPatina(false);

  // ID цвета палитры по умолчанию — уходит вместе с полотном в callback COLOR
  let paletteId;
  if (palette.exists) {
    const { NAME, HTML, ID } =
      palette.list[Object.keys(palette.list)[0]];
    palette.current = { name: NAME, hex: HTML };
    commands.setPalette(ID);

    paletteId = ID;
  } else commands.setPalette(false);

  if (glass.exists) {
    const { NAME, PREVIEW_PICTURE, ID } = glass.list[0];
    glass.current = { name: NAME, imgSrc: PREVIEW_PICTURE };
    commands.setGlass(glass.list[0]);
  } else {
    glass.current = {};
    commands.setGlass(false);
  }

  if (showcase.exists) {
    const { NAME, PREVIEW_PICTURE, ID } = showcase.list[0];
    showcase.current = { name: NAME, imgSrc: PREVIEW_PICTURE };
    commands.setShowcase(showcase.list[0]);
  } else {
    showcase.current = {};
    commands.setShowcase(false);
  }

  if (isFasadeTypesExist.value) {
    const typeList = getIntegratedHandleControllerData(
      fasadeTypes,
      props.elementIndex,
      "integrate",
    );

    fasadeTypesList.value = typeList;
    commands.setType(typeList[0]);
  } else {
    fasadeTypesList.value = {};
    commands.setType(false);
  }

  commands.setMaterial(data, paletteId, data.MODEL);
  emit("select_material", data);
  commands.notifyOptionsUpdate();
};

const onSelectMilling = (data) => {
  milling.current = data;

  const { FASADE_PROPS } = productData.value.PROPS.CONFIG;
  const fasadeProps = props.elementData || FASADE_PROPS[props.elementIndex];
  const rootDataPatina = modelState._FASADE[fasadeProps.COLOR].PATINA;
  const disablePatina =
    typeof props.elementIndex === "string" &&
    props.elementIndex.toLowerCase().includes("sidecolor");

  patina.exists =
    data.patina == 0 &&
    rootDataPatina.length > 0 &&
    rootDataPatina[0] != null &&
    rootDataPatina[0] != 0 &&
    !disablePatina;

  // Список патин полотна — из стора (prepareData заполняет его вместе с фрезеровками).
  // Локальный список при открытии редактора без фрезеровки оставался пустым
  patina.list = modelState.getCurrentPatinaData;

  // Патина по правилу: фреза допускает патину (PATINAOFF == 0) — первая патина списка,
  // иначе без патины. Раньше при доступной патине она не выбиралась вовсе, а при
  // недоступной ставилась первая патина каталога (475428) вместо null
  const defaultPatina = patina.exists
    ? getDefaultPatinaForMilling(data.patina, patina.list)
    : null;

  patina.exists = defaultPatina !== null;
  commands.writeElementPatina(defaultPatina?.ID ?? null);
  patina.current = defaultPatina
    ? { name: defaultPatina.NAME, imgSrc: defaultPatina.PREVIEW_PICTURE }
    : { name: "", imgSrc: null };

  /** @Отображение_положения_петель */

  // Положение ручки фрезеровки: первое допустимое для фрезеровки или null
  let millingType = null;

  if (data.fasade_type && data.fasade_type[0] !== null) {
    const typeList = getIntegratedHandleControllerData(
      data,
      props.elementIndex,
      "milling",
    );

    if (typeList.length > 0) {
      isFasadeHandleExist.value = true;
      fasadeHandleList.value = typeList;
      millingType = typeList[0].id ?? null;
    } else {
      isFasadeHandleExist.value = false;
      fasadeHandleList.value = {};
    }
  } else {
    isFasadeHandleExist.value = false;
    fasadeHandleList.value = {};
  }

  commands.writeElementMillingType(millingType);
  commands.setMillingType(millingType);

  commands.setMilling(data);
};

const onSelectPalette = (data) => {
  palette.current = data;
  commands.setPalette(data);
};

const onSelectPatina = (data) => {
  patina.current = data;
  commands.setPatina(data);
};

const onSelectGlass = (data) => {
  glass.current = data;
  commands.setGlass(data);
};

const onSelectShowcase = (data) => {
  showcase.current = data;
  commands.setShowcase(data);
};

const onChangeMillingHandlePos = (action, id) => {
  commands.setMillingType(id);
  commands.applyHandleAction(action, "milling");
};

const onChangeIntegratedHandlePos = (action, id) => {
  commands.setType(id);
  commands.applyHandleAction(action, "integrate");
};

/** Удаление опций конфигурации */

const deleteSelectedOptions = (type: String) => {
  const { FASADE_PROPS } = productData.value.PROPS.CONFIG;

  // Раньше здесь стояло && props.isFasade — из-за этого сброс не работал в SidecolorsView
  // (накладка на крышку, боковые стенки), где флаг не передаётся. Доступ к FASADE_PROPS
  // по нефасадному индексу защищён проверкой в resetModelFasadeTypes
  if (type == "surface") {
    let { NAME, DETAIL_PICTURE } = _FASADE[7397];
    surface.current = { name: NAME, imgSrc: DETAIL_PICTURE };
    milling.exists = false;
    palette.exists = false;
    patina.exists = false;
    glass.exists = false;
    showcase.exists = false;

    isFasadeHandleExist.value = false;
    fasadeHandleList.value = {};

    isFasadeTypesExist.value = false;
    fasadeTypesList.value = {};

    commands.resetModelFasadeTypes();

    /** @Очищаем данные для отслеживания полотна */
    commands.clearMaterialRestrictions();

    commands.setMaterial(_FASADE[7397]);
    commands.setMilling(false);
    commands.setPalette(false);
    commands.setPatina(false);
    commands.setGlass(false);
    commands.setMillingType(null);
    commands.setType(null);

    setCurrentEditableOption("surface");
    return;
  }

  if (type === "milling") {
    isFasadeTypesExist.value = false;
    fasadeTypesList.value = {};
    isFasadeHandleExist.value = false;
    fasadeHandleList.value = {};

    // Удаление фрезеровки — возврат к первой фрезеровке списка, как в MaterialRedactor.
    // Раньше в данные уходил null, сцена при пересборке сама ставила фрезеровку,
    // а карточка оставалась пустой. Патина — по правилу PATINAOFF для этой фрезеровки
    const firstMilling = milling.list[0];
    const disablePatina =
      typeof props.elementIndex === "string" &&
      props.elementIndex.toLowerCase().includes("sidecolor");

    patina.list = modelState.getCurrentPatinaData;

    const defaultPatina = firstMilling && !disablePatina
      ? getDefaultPatinaForMilling(firstMilling.PATINAOFF, patina.list)
      : null;

    milling.current = firstMilling
      ? { name: firstMilling.NAME, imgSrc: firstMilling.PREVIEW_PICTURE }
      : { name: "", imgSrc: null };

    patina.exists = defaultPatina !== null;
    patina.current = defaultPatina
      ? { name: defaultPatina.NAME, imgSrc: defaultPatina.PREVIEW_PICTURE }
      : { name: "", imgSrc: null };

    commands.setMillingType(null);
    commands.setPatina(defaultPatina ?? false);
    commands.setMilling(firstMilling ?? false);
  }

  if (type === "palette") {
    let { ID, NAME, HTML } = Object.values(palette.list)[0];
    commands.setPalette(Object.values(palette.list)[0]);
    palette.current = { name: NAME, hex: HTML };
  }

  if (type === "patina") {
    // Удаление патины — возврат к патине по умолчанию для текущей фрезеровки:
    // при PATINAOFF == 0 это первая патина списка, а не null
    const fasadeProps = props.elementData || FASADE_PROPS[props.elementIndex];
    const currentMilling = _APP.MILLING[fasadeProps?.MILLING];
    const defaultPatina = getDefaultPatinaForMilling(
      currentMilling?.PATINAOFF,
      patina.list,
    );

    commands.setPatina(defaultPatina ?? false);
    patina.current = defaultPatina
      ? { name: defaultPatina.NAME, imgSrc: defaultPatina.PREVIEW_PICTURE }
      : { name: "", imgSrc: null };
  }

  if (type === "showcase") {
    commands.setShowcase(false);
    showcase.current = { name: "", imgSrc: null };
  }

  if (type === "glass") {
    // Удаление стекла — возврат к первому стеклу списка, как в MaterialRedactor.
    // glass.list бывает false (полотно без стёкол) — тогда, как и раньше, без стекла
    const firstGlass = glass.list?.[0];

    commands.setGlass(firstGlass ?? false);
    glass.current = firstGlass
      ? { name: firstGlass.NAME, imgSrc: firstGlass.PREVIEW_PICTURE }
      : { name: "", imgSrc: null };
  }
};

const millingStatus = computed(() => {
  if (!milling.current.imgSrc) {
    return "disabled";
  }
});

/** Выбор панели редактирования фрезеровки или цвета, если такая опция существует */
const setCurrentEditableOption = (name: string) => {
  currentEditableOption.value = name;
  scrollToActiveOption(() => mainContainer.value);
};

const update = () => {
  resetOptionsState();
  currentElementData.value = null;

  isFasadeHandleExist.value = false;
  fasadeHandleList.value = {};
};

const prepareData = () => {
  const { PROPS } = productData.value;
  const { CONFIG, FASADE } = PROPS as TTotalProps;
  const { FASADE_POSITIONS, FASADE_PROPS, MODULEGRID } = CONFIG;
  const fasadeProps = FASADE_PROPS[props.elementIndex];
  const product = _APP.CATALOG.PRODUCTS[productId.value];

  currentElementData.value = props.elementData
    ? props.elementData
    : props.isFasade
      ? fasadeProps
      : productData.value.PROPS.CONFIG[props.elementIndex] || { COLOR: props };

  const haveShowcase = currentElementData.value.SHOWCASE === 1;
  const currentFasadeData = currentElementData.value;

  let {
    MILLING,
    MILLING_TYPE,
    PALETTE,
    COLOR,
    RESET_COLOR,
    PATINA,
    GLASS,
    SHOWCASE,
    ALUM,
    TYPE,
  } = currentFasadeData;

  // const curFasade = FASADE[props.elementIndex];
  // const { trueSize } = curFasade.userData;

  if (typeof currentFasadeData === "number") {
    COLOR = currentFasadeData;
  }

  // Проверка есть ли у текущего фасада опции выбора фрезеровки и цвета
  const fasadeData = _FASADE[COLOR] || _COLOR[COLOR];
  if (!fasadeData) return;

  const pid = productId.value;

  modelState.createCurrentPaletteData(COLOR);

  if (fasadeData.ATTACH_MILLINGS?.[0] /*&& !product.GLASS[0]*/) {
    // Раньше список строился дважды, и второй вызов без размера затирал отфильтрованный
    buildMillingList(COLOR);

    modelState.createCurrentShowcaseData({
      fasadeId: COLOR,
      productId: pid,
      fasadeNdx: props.elementIndex,
    });

    modelState.createCurrentPatinaData({ fasadeId: COLOR, productId: pid });
  }

  // Список стёкол хранится в сторе и перезаписывается только для материала со своим
  // ATTACH_GLASS. Для материала без стёкол — «Без фасада», например — createCurrentGlassData
  // не вызывается, и в сторе остаётся список от предыдущего фасада. Поэтому наличие стёкол
  // определяем по самому материалу, а не по содержимому стора
  const hasAttachGlass = !!fasadeData.ATTACH_GLASS?.[0];

  if (hasAttachGlass /*&& product.GLASS[0]*/)
    modelState.createCurrentGlassData({ fasadeId: COLOR, productId: pid });

  // Кэш для предотвращения лишних обращений
  const millingData = modelState.getCurrentMillingData;
  const paletteData = modelState.getCurrentPaletteData;
  const patinaData = modelState.getCurrentPatinaData;
  const glassData = modelState.getCurrentGlassData;
  const showcaseData = modelState.getCurrentShowcaseData;
  const fasadeTypes = buildFasadeTypes(COLOR);

  // Установка списков и флагов существования

  /** @Тип_фасада */
  if (TYPE) {
    isFasadeTypesExist.value = fasadeTypes.length > 0;
    fasadeTypesList.value = getIntegratedHandleControllerData(
      fasadeTypes,
      props.elementIndex,
      "integrate",
    );
  }

  /** @Тип_ручки_фрезеровки */
  if (MILLING_TYPE && MILLING) {
    const curMilling = _APP.MILLING[MILLING];
    const typeList = getIntegratedHandleControllerData(
      curMilling,
      props.elementIndex,
      "milling",
    );
    fasadeHandleList.value = typeList;
    isFasadeHandleExist.value = true;
  }

  /** @Фрезеровка */
  let disablePatina = false;
  if (fasadeData.ATTACH_MILLINGS?.[0] && !haveShowcase) {
    milling.list = millingData;

    if (
      typeof props.elementIndex === "string" &&
      props.elementIndex.toLowerCase().includes("sidecolor")
    ) {
      /*milling.list = millingData.filter(item => {
        if ([2462671, 2503106, 2839850, 1596264].includes(item.ID))
          return item
      })*/
      patina.list = [];
      patina.exists = false;
      disablePatina = true;
    }

    milling.exists = millingData.length > 0;
  }

  /** @Витрины */
  if (haveShowcase && ALUM == null && COLOR != 7397) {
    showcase.list = showcaseData;
    showcase.exists = showcaseData.length > 0;
  }

  /** @Палитра */
  if (fasadeData.PALETTE?.[0]) {
    palette.list = paletteData;
    palette.exists = Object.keys(palette.list).length > 0;
  }

  /** @Патина */
  if (
    fasadeData.PATINA?.[0] &&
    milling.exists &&
    MILLING &&
    !disablePatina
  ) {
    const curMilling = _APP.MILLING[MILLING];

    patina.list = patinaData;
    patina.exists =
      patinaData.length > 0 && curMilling.PATINAOFF == 0 && !disablePatina;
  }

  /** @Стёкла */
  if (hasAttachGlass && !props.noGlass && glassData.length > 0 && (haveShowcase || ALUM !== null)) {
    glass.list = glassData;
    glass.exists = true;
  }

  // Текущие выбранные значения
  if (COLOR && _FASADE[COLOR] || props.elementIndex == 'PROFILECOLOR') {
    const { NAME, PREVIEW_PICTURE } = fasadeData;
    surface.current = { name: NAME, imgSrc: PREVIEW_PICTURE };
    surface.selected = true;
  }

  /** Выбранное значение опции — элемент списка с сохранённым ID */
  const assignIfFound = (list: any[], id: string | number, slot) => {
    const item = list?.find((i) => i.ID == id);

    if (item) {
      slot.current = { name: item.NAME, imgSrc: item.PREVIEW_PICTURE };
    }
  };

  if (MILLING) {
    assignIfFound(millingData, MILLING, milling);

    commands.setMilling(MILLING);
  }

  if (PALETTE && paletteData[PALETTE]) {
    const { NAME, HTML } = paletteData[PALETTE];
    palette.current = { name: NAME, hex: HTML };
  }

  if (PATINA && !product.type_showcase?.[0]) {
    assignIfFound(patinaData, PATINA, patina);
    commands.setPatina(PATINA);
  }

  if (SHOWCASE) {
    assignIfFound(showcaseData, SHOWCASE, showcase);
    commands.setShowcase(SHOWCASE);
  }

  if (GLASS) {
    assignIfFound(glassData, GLASS, glass);
    commands.setGlass(GLASS);
  }
};

onBeforeMount(() => {
  productData.value = modelState.getCurrentModel.userData;
  productId.value = productData.value.PROPS.PRODUCT;
  commands.setMaterialRestrictions(props.elementData.COLOR);

  materialList.value = props.materialList?.length
    ? props.fasadeSize
      ? filterMaterialsConversations(props.materialList, props.fasadeSize)
      : props.materialList
    : filterFasadeConversations(props.elementIndex, props.fasadeSize);
});

onMounted(() => {
  prepareData();
});

onBeforeUnmount(() => {
  update();
});
</script>

<template>
  <div class="container" ref="mainContainer">
    <div class="container__header" v-if="props.isFasade && props.elementIndex !== null">
      <h3>Конфигурация фасада {{ props.elementIndex + 1 }}</h3>
    </div>
    <div class="container__header" v-if="props.elementIndex !== null && partsNames[props.elementIndex]">
      <h3>{{ partsNames[props.elementIndex] }}</h3>
    </div>

    <div class="configuration" v-if="surface.selected">
      <ConfigurationOption :type="'surface'" :data="surface.current" @choose-option="setCurrentEditableOption"
        @delete-choise="deleteSelectedOptions" />

      <!-- Опции полотна в порядке FASADE_OPTION_KEYS: фрезеровка, палитра, патина, стекло, витрина -->
      <template v-for="key in FASADE_OPTION_KEYS" :key="key">
        <ConfigurationOption v-if="fasadeOptions[key].exists" :type="key" :data="fasadeOptions[key].current"
          :additionalClass="key === 'patina' ? millingStatus : undefined" @choose-option="setCurrentEditableOption"
          @delete-choise="deleteSelectedOptions" />
      </template>

      <LoopPositionSelect v-if="isFasadeTypesExist" :options="fasadeTypesList"
        @change="onChangeIntegratedHandlePos" />

      <LoopPositionSelect v-if="isFasadeHandleExist" :options="fasadeHandleList"
        @change="onChangeMillingHandlePos" />
    </div>

    <!-- Редактор выбранной опции: список значений, выбор уходит в обработчик опции -->
    <!-- selectedId — подсветка выбранного значения (.active), к нему же прокручивается список -->
    <SurfaceRedactor v-if="currentEditableOption === 'surface' && materialList[0]?.FASADES" :materialList="materialList"
      :selectedId="selectedValues?.COLOR" @select_material="onSelectMaterial" />
    <MaterialSelector v-if="currentEditableOption === 'surface' && !materialList[0]?.FASADES" :materials="materialList"
      @select="onSelectMaterial" />

    <MillingRedactor v-if="currentEditableOption === 'milling'" :millingList="milling.list"
      :selectedId="selectedValues?.MILLING" @select_milling="onSelectMilling" />

    <ColorRedactor v-if="currentEditableOption === 'palette'" :paletteList="palette.list"
      :selectedId="selectedValues?.PALETTE" @select_color="onSelectPalette" />

    <PatinaRedactor v-if="currentEditableOption === 'patina'" :patinaList="patina.list"
      :selectedId="selectedValues?.PATINA" @select_patina="onSelectPatina" />

    <GlassRedactor v-if="currentEditableOption === 'glass'" :glassList="glass.list"
      :selectedId="selectedValues?.GLASS" @select_glass="onSelectGlass" />

    <ShowcaseRedactor v-if="currentEditableOption === 'showcase'" :showcaseList="showcase.list"
      :selectedId="selectedValues?.SHOWCASE" @select_showcase="onSelectShowcase" />
  </div>
</template>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  gap: 15px;
  border: 1px solid $stroke;
  border-radius: 10px;
  padding: 15px;
  max-height: 100vh;
  overflow: hidden;
  box-sizing: border-box;

  -webkit-user-select: none;
  /* Safari */
  -ms-user-select: none;
  /* IE 10+ и Edge */
  user-select: none;
  /* Стандарт: Chrome, Firefox, Opera, Edge */

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: large;
    font-weight: 600;

  }
}

.no-select {
  -webkit-user-select: none;
  /* Safari */
  -ms-user-select: none;
  /* IE 10+ и Edge */
  user-select: none;
  /* Стандарт: Chrome, Firefox, Opera, Edge */
}

.configuration {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 8px;

  -webkit-user-select: none;
  /* Safari */
  -ms-user-select: none;
  /* IE 10+ и Edge */
  user-select: none;
  /* Стандарт: Chrome, Firefox, Opera, Edge */

  @media (min-height: 1000px) {
    gap: 17px;
  }
}

// Корень LoopPositionSelect — Accordion, и scoped-стиль редактора доходит до него по цепочке
// корневых элементов: это оформление переключателей положения ручки
.accordion {
  border: none;
  box-shadow: 4px 4px 4px 4px rgba(34, 60, 80, 0.11);
  transition-property: box-shadow;
  transition-duration: 0.25s;
  transition-timing-function: ease;

  -webkit-user-select: none;
  /* Safari */
  -ms-user-select: none;
  /* IE 10+ и Edge */
  user-select: none;
  /* Стандарт: Chrome, Firefox, Opera, Edge */

  &__content {
    padding-top: 0.5rem;
    border-top: 1px solid #a3a9b5;
  }

  &__text {
    cursor: pointer;
    transition-property: color;
    transition-duration: 0.25s;
    transition-timing-function: ease;

    @media (hover: hover) {

      /* when hover is supported */
      &:hover {
        color: $dark-grey;
      }
    }
  }

  @media (hover: hover) {
    &:hover {
      box-shadow: 4px 4px 4px 4px #a3a9b5;
    }
  }
}
</style>
