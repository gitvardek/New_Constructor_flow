<script setup lang="ts">
// @ts-nocheck 31
// Интерфейс для табов
import MaterialSelector from "@/components/right-menu/customiser-pages/ColorRightPage/MaterialSelector.vue";

interface Tab {
  name: string;
  label: string;
}

type TIncomeFasadeSize = {
  value: number | null;
  min: number | null;
  max: number | null;
};

import {
  defineProps,
  watch,
  ref,
  onMounted,
  computed,
  reactive,
  onBeforeMount,
  onBeforeUnmount,
} from "vue";
import { useModelState } from "@/store/appliction/useModelState";
import { useAppData } from "@/store/appliction/useAppData";
import { useEventBus } from "@/store/appliction/useEventBus";

import MillingRedactor from "@/components/right-menu/customiser-pages/ColorRightPage/MillingRedactor.vue";
import PatinaRedactor from "@/components/right-menu/customiser-pages/ColorRightPage/PatinaRedactor.vue";
import GlassRedactor from "@/components/right-menu/customiser-pages/ColorRightPage/GlassRedactor.vue";
import ConfigurationOption from "@/components/right-menu/customiser-pages/ColorRightPage/ConfigurationOption.vue";
import SurfaceRedactor from "@/components/right-menu/customiser-pages/ColorRightPage/SurfaceRedactor.vue";
import ColorRedactor from "@/components/right-menu/customiser-pages/ColorRightPage/ColorRedactor.vue";
import {useHandlesAction} from "@/components/right-menu/customiser-pages/FigureRightPage/Handles/useHandlesAction.ts";
import {useConversationActions} from "@/components/right-menu/actions/useConversationActions.ts";
import {TFasadeSize} from "@/types/types.ts";
import DirectionControl from "@/components/ui/direction/DirectionControl.vue";
import MainInput from "@/components/ui/inputs/MainInput.vue";
import Accordion from "@/components/ui/accordion/Accordion.vue";
import ShowcaseRedactor from "@/components/right-menu/customiser-pages/ColorRightPage/ShowcaseRedactor.vue";

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
  }
});

const { getIntegratedHandleControllerData, setIntegratedHandleAction } =
    useHandlesAction();
const {
  createFasadeConversations,
  checkConversations,
  filterMaterialsConversations,
  checkFasadeConversations,
  filterFasadeConversations,
} = useConversationActions();

enum partsNames {
  PROFILECOLOR = 'Цвет профиля'
}

const emit = defineEmits(["parent-callback"]);

const callback = (material: Object, type: String, palette: Number) => {
  emit("parent-callback", material, type, palette);
};

const _APP = useAppData().getAppData;
const _FASADE = _APP.FASADE;
const _COLOR = _APP.COLOR;

const eventBus = useEventBus();

const modelState = useModelState();

const materialList = ref(null);
const productData = ref(null);
const productId = ref(null);
const currentElementData = ref(null);

let currentEditableOption = ref<String>("surface");

const currentSurfaceData = ref<Object>({});
const currentMillingData = ref<Object>({});
const currentPaletteData = ref<Object>({});
const currentPatinaData = ref<Object>({});
const currentGlassData = ref<Object>({});
const currentShowcaseData = ref<Object>({});

const isSurfaceSelected = ref<boolean>(false);

const millingList = ref<Array>([]);
const isMillingExist = ref<boolean>(false);

const paletteList = ref<Object>({});
const isPalleteExist = ref<boolean>(false);

const patinaList = ref<Array>([]);
const isPatinaExist = ref<boolean>(false);

const glassList = ref<Array>([]);
const isGlassExist = ref<boolean>(false);

const showcaseList = ref<Array>([]);
const isShowcaseExist = ref<boolean>(false);

const fasadeSizeList = ref<Array>([]);
const fasadeSizeListExist = ref<boolean>(false);

const currentSize = ref<TFasadeSize | null>(null);
const incomeSize = ref<TIncomeFasadeSize>({
  width: null,
  min: null,
  max: null,
});

const fasadeTypesList = ref<Array>([]);
const isFasadeTypesExist = ref<boolean>(false);

const fasadeHandleList = ref<Array>([]);
const isFasadeHandleExist = ref<boolean>(false);

const onSelectMaterial = (data) => {

  console.log(data, 'data')

  const {PROPS} = productData.value;
  const { CONFIG, FASADE } = PROPS;
  const {FASADE_POSITIONS, FASADE_PROPS} = CONFIG;
  const product = _APP.CATALOG.PRODUCTS[productId.value];
  const { COLOR, RESET_COLOR, ALUM, SHOWCASE } = props.elementData || FASADE_PROPS[props.elementIndex];

  let haveShowcase
  let dataOfFasadeType;

  if(props.isFasade) {
    const checkConversation = checkFasadeConversations(
        data.ID,
        props.fasadeSize || FASADE[props.elementIndex].userData.trueSize
    );

    if (!checkConversation) return;

    productData.value.restrictData[props.elementIndex] = createFasadeConversations(
        data.ID
    );
  }

  isSurfaceSelected.value = true;
  currentSurfaceData.value = data;

  dataOfFasadeType = _FASADE[COLOR] || _COLOR[COLOR]
  haveShowcase = !!SHOWCASE;
  let disablePatina = false;

  if (data.ATTACH_MILLINGS?.[0] || data.ATTACH_MILLINGS_SIDE?.[0]) {
    modelState.createCurrentMillingData({
      fasadeId: data.ID,
      productId: productId.value,
      fasadeNdx: props.elementIndex,
    });

    modelState.createCurrentPatinaData({
      fasadeId: data.ID,
      productId: productId.value,
    });

    modelState.createCurrentShowcaseData({
      fasadeId: data.ID,
      productId: productId.value,
    });

    millingList.value = modelState.getCurrentMillingData;
    patinaList.value = modelState.getCurrentPatinaData;

    if(typeof props.elementIndex === "string" && props.elementIndex.toLowerCase().includes('sidecolor')) {
      /*millingList.value = millingList.value.filter(item => {
        if ([2462671, 2503106, 2839850, 1596264].includes(item.ID))
          return item
      })*/
      patinaList.value = []
      isPatinaExist.value = false
      disablePatina = true;
    }
    else{
      /** @Патина */
      isPatinaExist.value =
          patinaList.value.length > 0 && !product.type_showcase[0];
    }

    isMillingExist.value = millingList.value.length > 0 && !haveShowcase;
  }
  else {
    isMillingExist.value = false;
    isPalleteExist.value = false;
    isPatinaExist.value = false;
  }

  if (data.ATTACH_GLASS?.[0]) {
    modelState.createCurrentGlassData({
      fasadeId: data.ID,
      productId: productId.value,
      fasadeNdx: props.elementIndex,
    });
  }
  else {
    glassList.value = false
  }


  modelState.createCurrentPaletteData(data.ID);

  /** @Палитра */
  paletteList.value = modelState.getCurrentPaletteData;
  isPalleteExist.value = Object.keys(paletteList.value).length > 0;

  /** @Витрины */
  showcaseList.value = modelState.getCurrentShowcaseData;

  // console.log(data, "==== ❌ Параметры выбранного фасада ❌ ====");

  isShowcaseExist.value =
      !data.material?.includes("Alum") && haveShowcase && data.id !== RESET_COLOR;

  /** @Стёкла */
  glassList.value = modelState.getCurrentGlassData;
  isGlassExist.value = glassList.value.length > 0 && haveShowcase;

  /** @Тип_фасада */
  isFasadeTypesExist.value = modelState.getCurrentFasadeTypesData.length > 0;

  isFasadeHandleExist.value = false;
  fasadeHandleList.value = {};
  callback(false, "MILLING_TYPE");

  // ================================================================================================================

  if (isMillingExist.value) {
    const { NAME, PREVIEW_PICTURE, ID, PATINAOFF } = millingList.value[0];
    callback(millingList.value[0], "MILLING");
    currentMillingData.value = { name: NAME, imgSrc: PREVIEW_PICTURE };

    isPatinaExist.value =
        patinaList.value.length > 0 && isMillingExist.value && PATINAOFF == 0 && !disablePatina;

  } else {
    currentMillingData.value = {};
    isFasadeHandleExist.value = false;
    fasadeHandleList.value = {};
    callback(false, "MILLING");
    callback(false, "MILLING_TYPE");
    isPatinaExist.value = false;
  }

  if (isPatinaExist.value) {
    const { NAME, PREVIEW_PICTURE, ID } = patinaList.value[0];
    currentPatinaData.value = { name: NAME, imgSrc: PREVIEW_PICTURE };
    callback(patinaList.value[0], "PATINA");
  }
  else
    callback(false, "PATINA");


  let palette;
  if (isPalleteExist.value) {
    let { NAME, HTML, ID } =
        paletteList.value[Object.keys(paletteList.value)[0]];
    currentPaletteData.value = { name: NAME, hex: HTML };
    callback(ID, "PALETTE");

    palette = ID;
  }
  else
    callback(false, "PALETTE");

  if (isGlassExist.value) {
    const { NAME, PREVIEW_PICTURE, ID } = glassList.value[0];
    currentGlassData.value = { name: NAME, imgSrc: PREVIEW_PICTURE };
    callback(glassList.value[0], "GLASS");
  } else {
    currentGlassData.value = {};
    callback(false, "GLASS");
  }

  if (isShowcaseExist.value) {
    const { NAME, PREVIEW_PICTURE, ID } = showcaseList.value[0];
    currentShowcaseData.value = { name: NAME, imgSrc: PREVIEW_PICTURE };
    callback(showcaseList.value[0], "SHOWCASE");
  } else {
    currentShowcaseData.value = {};
    callback(false, "SHOWCASE");
  }

  if (isFasadeTypesExist.value) {
    const typeList = getIntegratedHandleControllerData(
        modelState.getCurrentFasadeTypesData,
        props.elementIndex,
        "integrate"
    );

    fasadeTypesList.value = typeList;
    callback(typeList[0], "TYPE");
  } else {
    fasadeTypesList.value = {};
    callback(false, "TYPE");
  }

  callback(data, "COLOR", palette);
};

const onSelectMilling = (data) => {
  currentMillingData.value = data;

  const { FASADE_PROPS } = productData.value.PROPS.CONFIG;
  const fasadeProps = props.elementData || FASADE_PROPS[props.elementIndex];
  const rootDataPatina = modelState._FASADE[fasadeProps.COLOR].PATINA;
  const disablePatina = typeof props.elementIndex === "string" && props.elementIndex.toLowerCase().includes('sidecolor')

  isPatinaExist.value =
      data.patina == 0 &&
      rootDataPatina.length > 0 &&
      rootDataPatina[0] != null &&
      rootDataPatina[0] != 0 &&
      !disablePatina;


  /** @Если у выбранной фрезы нет патина */

  try {
    if (!isPatinaExist.value && patinaList.value.length > 0) {


      fasadeProps.PATINA = Object.values(modelState._PATINA)[0].ID;
      const { NAME, PREVIEW_PICTURE } = Object.values(modelState._PATINA)[0];
      currentPatinaData.value = { name: NAME, imgSrc: PREVIEW_PICTURE };
    }
  } catch (e) {
    console.warn(e, "в методе onSelectMilling");
  }

  /** @Отображение_положения_петель */

  if (data.fasade_type && data.fasade_type[0] !== null) {
    const typeList = getIntegratedHandleControllerData(
        data,
        props.elementIndex,
        "milling"
    );

    if (typeList.length > 0) {
      isFasadeHandleExist.value = true;
      fasadeHandleList.value = typeList;
      fasadeProps.MILLING_TYPE = typeList[0].id ?? null;
    } else {
      isFasadeHandleExist.value = false;
      fasadeHandleList.value = {};
      fasadeProps.MILLING_TYPE = null;
    }
    callback(fasadeProps.MILLING_TYPE, 'MILLING_TYPE')
  } else {
    isFasadeHandleExist.value = false;
    fasadeHandleList.value = {};
    fasadeProps.MILLING_TYPE = null;
    callback(null, 'MILLING_TYPE')
  }

  callback(data, "MILLING");
};

const onSelectPalette = (data) => {
  currentPaletteData.value = data;
  callback(data, "PALETTE");
};

const onSelectPatina = (data) => {
  currentPatinaData.value = data;
  callback(data, "PATINA");
};

const onSelectGlass = (data) => {
  currentGlassData.value = data;
  callback(data, "GLASS");
};

const onSelectShowcase = (data) => {
  currentShowcaseData.value = data;
  callback(data, "SHOWCASE");
};

const onChangeMillingHandlePos = (action, id) => {
  callback(id, 'MILLING_TYPE')
  setIntegratedHandleAction(action, props.elementIndex, "milling");
};

const onChangeIntegratedHandlePos = (action, id) => {
  callback(id, 'TYPE')
  setIntegratedHandleAction(action, props.elementIndex, "integrate");
};

/** Удаление опций конфигурации */
const deleteSelectedOptions = (type: String) => {
  const { FASADE_PROPS } = productData.value.PROPS.CONFIG;

  if (type == "surface" && props.isFasade) {

    let { NAME, DETAIL_PICTURE } = _FASADE[7397];
    currentSurfaceData.value = { name: NAME, imgSrc: DETAIL_PICTURE };
    isMillingExist.value = false;
    isPalleteExist.value = false;
    isPatinaExist.value = false;
    isGlassExist.value = false;
    isShowcaseExist.value = false;

    isFasadeHandleExist.value = false;
    fasadeHandleList.value = {};

    isFasadeTypesExist.value = false;
    fasadeTypesList.value = {};

    if(props.elementIndex && FASADE_PROPS[props.elementIndex]) {
      FASADE_PROPS[props.elementIndex].TYPE = null;
      FASADE_PROPS[props.elementIndex].MILLING_TYPE = null;
    }

    /** @Очищаем данные для отслеживания полотна */
    productData.value.restrictData = {};

    callback(_FASADE[7397], "COLOR");
    callback(false, "MILLING");
    callback(false, "PALETTE");
    callback(false, "PATINA");
    callback(false, "GLASS");
    callback(null, "MILLING_TYPE");
    callback(null, "TYPE");

    setCurrentEditableOption("surface");
    return;
  }

  if (type === "milling") {
    isFasadeTypesExist.value = false;
    fasadeTypesList.value = {};
    isFasadeHandleExist.value = false;
    fasadeHandleList.value = {};
    isPatinaExist.value = false;

    currentMillingData.value = { name: "", imgSrc: null };
    currentPatinaData.value = { name: "", imgSrc: null };
    callback(false, "MILLING");
    callback(false, "PATINA");
  }

  if (type === "palette") {
    let { ID, NAME, HTML } = Object.values(paletteList.value)[0];
    callback(Object.values(paletteList.value)[0], "PALETTE");
    currentPaletteData.value = { name: NAME, hex: HTML };
  }

  if (type === "patina") {
    callback(false, "PATINA");
    currentPatinaData.value = { name: "", imgSrc: null };
  }

  if (type === "showcase") {
    callback(false, "SHOWCASE");
    currentShowcaseData.value = { name: "", imgSrc: null };
  }

  if (type === "glass") {
    callback(false, "GLASS");
    currentGlassData.value = { name: "", imgSrc: null };
  }
};

const millingStatus = computed(() => {
  if (!currentMillingData.value.imgSrc) {
    return "disabled";
  }
});

/** Выбор панели редактирования фрезеровки или цвета, если такая опция существует */
const setCurrentEditableOption = (name: String) => {
  // console.log(name, "NAME");
  currentEditableOption.value = name;
};

const update = () => {
  currentSurfaceData.value = {};
  currentMillingData.value = {};
  currentPaletteData.value = {};
  currentPatinaData.value = {};
  currentShowcaseData.value = {};
  currentGlassData.value = {};
  currentElementData.value = null;

  isSurfaceSelected.value = false;

  millingList.value = [];
  isMillingExist.value = false;

  paletteList.value = {};
  isPalleteExist.value = false;

  patinaList.value = [];
  isPatinaExist.value = false;

  glassList.value = [];
  isGlassExist.value = false;

  showcaseList.value = [];
  isShowcaseExist.value = false;

  currentSize.value = null;
  fasadeSizeList.value = [];
  fasadeSizeListExist.value = false;
  incomeSize.value = null;

  isFasadeHandleExist.value = false;
  fasadeHandleList.value = {};
};

const prepareData = () => {
  const { PROPS } = productData.value;
  const { CONFIG } = PROPS;
  const { FASADE_POSITIONS, FASADE_PROPS } = CONFIG;
  const fasadeProps = FASADE_PROPS[props.elementIndex];
  const product = _APP.CATALOG.PRODUCTS[productId.value];

  currentElementData.value = props.elementData ? props.elementData
      : props.isFasade
          ? fasadeProps
          : productData.value.PROPS.CONFIG[props.elementIndex] || {COLOR: props};

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

  if (typeof currentFasadeData === "number") {
    COLOR = currentFasadeData
  }

  // Проверка есть ли у текущего фасада опции выбора фрезеровки и цвета
  const fasadeData = _FASADE[COLOR] || _COLOR[COLOR];
  if (!fasadeData) return;

  const pid = productId.value;

  modelState.createCurrentPaletteData(COLOR);

  if (fasadeData.ATTACH_MILLINGS?.[0] /*&& !product.GLASS[0]*/) {
    modelState.createCurrentMillingData({
      fasadeId: COLOR,
      productId: pid,
      fasadeNdx: props.elementIndex,
    });

    modelState.createCurrentShowcaseData({
      fasadeId: COLOR,
      productId: pid,
      fasadeNdx: props.elementIndex,
    });

    modelState.createCurrentPatinaData({ fasadeId: COLOR, productId: pid });
  }

  if (fasadeData.ATTACH_GLASS?.[0] /*&& product.GLASS[0]*/)
    modelState.createCurrentGlassData({ fasadeId: COLOR, productId: pid });

  // Кэш для предотвращения лишних обращений
  const millingData = modelState.getCurrentMillingData;
  const paletteData = modelState.getCurrentPaletteData;
  const patinaData = modelState.getCurrentPatinaData;
  const glassData = modelState.getCurrentGlassData;
  const showcaseData = modelState.getCurrentShowcaseData;
  const fasadeTypes = modelState.getCurrentFasadeTypesData;

  // Установка списков и флагов существования

  /** @Тип_фасада */
  if (TYPE) {
    isFasadeTypesExist.value = fasadeTypes.length > 0;
    fasadeTypesList.value = getIntegratedHandleControllerData(
        fasadeTypes,
        props.elementIndex,
        "integrate"
    );
  }

  /** @Тип_ручки_фрезеровки */
  if (MILLING_TYPE && MILLING) {
    const curMilling = _APP.MILLING[MILLING];
    const typeList = getIntegratedHandleControllerData(
        curMilling,
        props.elementIndex,
        "milling"
    );
    fasadeHandleList.value = typeList;
    isFasadeHandleExist.value = true;
  }

  /** @Фрезеровка */
  let disablePatina = false;
  if (fasadeData.ATTACH_MILLINGS?.[0] && !haveShowcase) {
    millingList.value = millingData;

    if(typeof props.elementIndex === "string" && props.elementIndex.toLowerCase().includes('sidecolor')) {
      /*millingList.value = millingData.filter(item => {
        if ([2462671, 2503106, 2839850, 1596264].includes(item.ID))
          return item
      })*/
      patinaList.value = []
      isPatinaExist.value = false
      disablePatina = true;
    }

    isMillingExist.value = millingData.length > 0;
  }

  /** @Витрины */
  if (haveShowcase && ALUM == null && COLOR != 7397) {
    showcaseList.value = showcaseData;
    isShowcaseExist.value = showcaseData.length > 0;
  }

  /** @Палитра */
  if (fasadeData.PALETTE?.[0]) {
    paletteList.value = paletteData;
    isPalleteExist.value = Object.keys(paletteList.value).length > 0;
  }

  /** @Патина */
  if (fasadeData.PATINA?.[0] && isMillingExist.value && MILLING && !disablePatina) {
    const curMilling = _APP.MILLING[MILLING];

    patinaList.value = patinaData;
    isPatinaExist.value = patinaData.length > 0 && curMilling.PATINAOFF == 0 && !disablePatina;
  }

  /** @Стёкла */
  if (haveShowcase && glassData.length > 0) {
    glassList.value = glassData;
    isGlassExist.value = glassData.length > 0;
  }

  // Текущие выбранные значения
  if (COLOR && _FASADE[COLOR]) {
    const { NAME, PREVIEW_PICTURE } = fasadeData;
    currentSurfaceData.value = { name: NAME, imgSrc: PREVIEW_PICTURE };
    isSurfaceSelected.value = true;
  }

  const assignIfFound = (
      list: any[],
      id: string | number,
      target: any,
      key: string,
      imageKey = "PREVIEW_PICTURE"
  ) => {
    const item = list?.find((i) => i.ID == id);

    if (item) target.value = { name: item.NAME, imgSrc: item[imageKey] };
  };

  if (MILLING) {
    assignIfFound(
        millingData,
        MILLING,
        currentMillingData,
        "currentMillingData"
    );

    callback(MILLING, "MILLING");
  }

  if (PALETTE && paletteData[PALETTE]) {
    const { NAME, HTML } = paletteData[PALETTE];
    currentPaletteData.value = { name: NAME, hex: HTML };
  }

  if (PATINA && !product.type_showcase?.[0]) {
    assignIfFound(patinaData, PATINA, currentPatinaData, "currentPatinaData");
    callback(PATINA, "PATINA");
  }

  if (SHOWCASE) {
    assignIfFound(
        showcaseData,
        SHOWCASE,
        currentShowcaseData,
        "currentShowcaseData"
    );
    callback(SHOWCASE, "SWOCASE");
  }

  if (GLASS) {
    assignIfFound(glassData, GLASS, currentGlassData, "currentGlassData");
    callback(GLASS, "GLASS");
  }
};

const prepareFasadeSizeList = () => {
  const curData = productData.value;
  const { FASADE_SIZE, FASADE_PROPS } = curData.PROPS.CONFIG;

  const sizesParentKey = Object.entries(FASADE_SIZE).map(([key, value]) => {
    return key;
  });

  try {
    if (sizesParentKey.length == 0) return [];
  } catch (e) {
    console.log("Список размера фасадов отсутствует");
  }

  const parentKey = parseInt(sizesParentKey[props.elementIndex]);

  const sizesKeys = Object.values(_APP.FASADENUMBERSIZE[parentKey]).flat();
  const curSizeId = FASADE_PROPS[props.elementIndex].SIZES.id;

  const sizesData = sizesKeys
      .map((el) => {
        _APP.FASADESIZE[el].active = _APP.FASADESIZE[el].ID == curSizeId;
        return _APP.FASADESIZE[el];
      })
      .sort((a, b) => a.SORT - b.SORT);

  currentSize.value = sizesData.find((el) => el.active) ?? null;

  return sizesData;
};

const changeFasadeSize = async (data: TFasadeSize) => {
  currentSize.value = data;
  const curData = productData.value;
  const { width, height, depth } = _APP.CATALOG.PRODUCTS[curData.PROPS.PRODUCT];
  const { FASADE_PROPS, FASADE_SIZE } = curData.PROPS.CONFIG;
  const curFasade = FASADE_PROPS[props.elementIndex];
  const curSize = curFasade.SIZES;
  const positionList = Object.values(FASADE_SIZE)[props.elementIndex];
  const curPositionId = positionList[data.ID].ID;
  const defaultWidth = Object.values(positionList)[0].FASADE_WIDTH;

  const isIncomeWidth = isNaN(
      Number(_APP.FASADE_POSITION[curPositionId].FASADE_WIDTH)
  );

  curSize.id = data.ID;
  curFasade.POSITION = curPositionId;

  if (isIncomeWidth) {
    if (incomeSize.value.width === null)
      incomeSize.value.width = parseInt(defaultWidth);
    incomeSize.value.min = data.SIZE_EDIT_WIDTH_MIN;
    incomeSize.value.max = data.SIZE_EDIT_WIDTH_MAX;

    curSize.params.FASADE_WIDTH = incomeSize.value.width;
    curSize.params.min = data.SIZE_EDIT_WIDTH_MIN;
    curSize.params.max = data.SIZE_EDIT_WIDTH_MAX;
  } else {
    incomeSize.value.width = null;
    incomeSize.value.min = null;
    incomeSize.value.max = null;
    curSize.params = {};
  }

  eventBus.emit("A:Model-resize", {
    data: { width, height, depth },
    type: "fasade",
  });
};

const updateFasadeSize = async (data) => {
  const curData = productData.value;
  const { width, height, depth } = _APP.CATALOG.PRODUCTS[curData.PROPS.PRODUCT];
  const { FASADE_PROPS } = curData.PROPS.CONFIG;
  const curFasade = FASADE_PROPS[props.elementIndex];
  const curSize = curFasade.SIZES;
  curSize.params.FASADE_WIDTH = data;

  eventBus.emit("A:Model-resize", {
    data: { width, height, depth },
    type: "fasade",
  });
};

const getFasadDataType = (data) => {
  const result = data.fasade_type
      .map((item) => _APP.FASADETYPE[item])
      .filter(Boolean);

  return result;
};

const getFasadesize = computed(() => {
  const sceneModel = modelState.getCurrentModel;
  const { FASADE } = sceneModel?.userData.PROPS;
  const current = FASADE[props.elementIndex];
  return current.userData.trueSize;
});

onBeforeMount(() => {
  productData.value = modelState.getCurrentModel.userData;
  productId.value = productData.value.PROPS.PRODUCT;
  productData.value.restrictData[props.elementIndex] = createFasadeConversations(
      props.elementData.COLOR
  );

  materialList.value = props.materialList?.length ? props.fasadeSize ? filterMaterialsConversations(props.materialList, props.fasadeSize) : props.materialList :
      filterFasadeConversations(props.elementIndex, props.fasadeSize);

  if(!props.materialList?.length) {
    fasadeSizeList.value = prepareFasadeSizeList();
    fasadeSizeListExist.value = fasadeSizeList.value.length > 0;

    const {FASADE_PROPS} = productData.value.PROPS.CONFIG;
    const curFasade = props.elementData || FASADE_PROPS[props.elementIndex];
    const curSize = curFasade?.SIZES;

    incomeSize.value = {
      width: curSize?.params?.FASADE_WIDTH ? curSize.params.FASADE_WIDTH : props.fasadeSize.FASADE_WIDTH || null,
      min: curSize?.params?.min ?? null,
      max: curSize?.params?.max ?? null,
    };
  }
});

onMounted(() => {
  prepareData();
});

onBeforeUnmount(() => {
  update();
});
</script>

<template>
  <div class="container">
    <div
        class="container__header"
        v-if="props.isFasade && props.elementIndex !== null"
    >
      <h3>Конфигурация фасада {{ props.elementIndex + 1 }}</h3>
    </div>
    <div
        class="container__header"
        v-else-if="props.elementIndex !== null && partsNames[props.elementIndex]"
    >
      <h3>{{partsNames[props.elementIndex]}}</h3>
    </div>

    <div class="configuration" v-if="isSurfaceSelected">
      <ConfigurationOption
          :type="'surface'"
          :data="currentSurfaceData"
          @choose-option="setCurrentEditableOption"
          @delete-choise="deleteSelectedOptions"
      />

      <ConfigurationOption
          v-if="isMillingExist"
          :type="'milling'"
          :data="currentMillingData"
          @choose-option="setCurrentEditableOption"
          @delete-choise="deleteSelectedOptions"
      />

      <ConfigurationOption
          v-if="isPalleteExist"
          :type="'palette'"
          :data="currentPaletteData"
          @choose-option="setCurrentEditableOption"
          @delete-choise="deleteSelectedOptions"
      />

      <ConfigurationOption
          v-if="isPatinaExist"
          :type="'patina'"
          :data="currentPatinaData"
          :additionalClass="millingStatus"
          @choose-option="setCurrentEditableOption"
          @delete-choise="deleteSelectedOptions"
      />

      <ConfigurationOption
          v-if="isGlassExist"
          :type="'glass'"
          :data="currentGlassData"
          @choose-option="setCurrentEditableOption"
          @delete-choise="deleteSelectedOptions"
      />

      <ConfigurationOption
          v-if="isShowcaseExist"
          :type="'showcase'"
          :data="currentShowcaseData"
          @choose-option="setCurrentEditableOption"
          @delete-choise="deleteSelectedOptions"
      />

      <div v-if="fasadeSizeListExist">
        <Accordion>
          <template #title>
            <div class="accordion__title">
              <p>Размер</p>
              <p>{{ currentSize?.NAME }}</p>
            </div>
          </template>

          <template #params="{ onToggle }">
            <ul class="accordion__contant">
              <li
                  class="accordion__text"
                  v-for="(size, key) in fasadeSizeList"
                  :key="key + size.NAME"
                  @click="
                  () => {
                    changeFasadeSize(size);
                    onToggle();
                  }
                "
              >
                {{ size.NAME }}
              </li>
            </ul>
          </template>
        </Accordion>
      </div>

      <MainInput
          v-if="incomeSize.width"
          :inputClass="'input__search right-menu'"
          :type="'number'"
          :min="incomeSize.min"
          :max="incomeSize.max"
          @update:modelValue="updateFasadeSize"
          v-model="incomeSize.width"
      />

      <DirectionControl
          v-if="isFasadeTypesExist"
          :handle-pos="fasadeTypesList"
          @changeDirectionPos="onChangeIntegratedHandlePos"
          :container="'card'"
          :scale="1"
          :gap="2"
          :max-width="120"
          :size="20"
          :fontSize="10"
      />

      <DirectionControl
          v-if="isFasadeHandleExist"
          :handle-pos="fasadeHandleList"
          @changeDirectionPos="onChangeMillingHandlePos"
          :container="'card'"
          :scale="1"
          :gap="2"
          :max-width="120"
          :size="20"
          :fontSize="10"
      />
    </div>

    <SurfaceRedactor
        v-if="currentEditableOption === 'surface' && materialList[0]?.FASADES"
        :materialList="materialList"
        :elementIndex="props.elementIndex"
        :temp-work="true"
        @select_material="onSelectMaterial"
    />
    <MaterialSelector
        v-if="currentEditableOption === 'surface' && !materialList[0]?.FASADES"
        :materials="materialList"
        @select="onSelectMaterial"
    />

    <MillingRedactor
        v-if="currentEditableOption === 'milling'"
        :millingList="millingList"
        :elementIndex="props.elementIndex"
        :temp-work="true"
        @select_milling="onSelectMilling"
    />

    <ColorRedactor
        v-if="currentEditableOption === 'palette'"
        :paletteList="paletteList"
        :elementIndex="props.elementIndex"
        :temp-work="true"
        @select_color="onSelectPalette"
    />

    <PatinaRedactor
        v-if="currentEditableOption === 'patina'"
        :patinaList="patinaList"
        :elementIndex="props.elementIndex"
        :temp-work="true"
        @select_patina="onSelectPatina"
    />

    <GlassRedactor
        v-if="currentEditableOption === 'glass'"
        :glassList="glassList"
        :elementIndex="props.elementIndex"
        :temp-work="true"
        @select_glass="onSelectGlass"
    />

    <ShowcaseRedactor
        v-if="currentEditableOption === 'showcase'"
        :showcaseList="showcaseList"
        :elementIndex="props.elementIndex"
        :temp-work="true"
        @select_showcase="onSelectShowcase"
    />
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

  -webkit-user-select: none; /* Safari */
  -ms-user-select: none;     /* IE 10+ и Edge */
  user-select: none;         /* Стандарт: Chrome, Firefox, Opera, Edge */

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: large;
    font-weight: 600;

    &--params {
      display: flex;
      gap: 1rem;
    }
  }

  &__list {
    position: relative;
    display: flex;
    justify-content: space-between;
    flex-direction: column;
    gap: 8px;
    border: 1px solid #c6c6c6;
    border-radius: 15px;
    padding: 10px 0px 0px 10px;
    height: 100%;
    overflow-y: scroll;
    box-sizing: border-box;
  }

  &__list::-webkit-scrollbar {
    width: 8px;
  }
}

.no-select {
  -webkit-user-select: none; /* Safari */
  -ms-user-select: none;     /* IE 10+ и Edge */
  user-select: none;         /* Стандарт: Chrome, Firefox, Opera, Edge */
}

.configuration {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 8px;

  -webkit-user-select: none; /* Safari */
  -ms-user-select: none;     /* IE 10+ и Edge */
  user-select: none;         /* Стандарт: Chrome, Firefox, Opera, Edge */

  &__item {
    height: 50px;
    border: 1px solid grey;
    border-radius: 5px;
  }

  @media (min-height: 1000px) {
    gap: 17px;
  }
}

.accordion {
  border: none;
  box-shadow: 4px 4px 4px 4px rgba(34, 60, 80, 0.11);
  transition-property: box-shadow;
  transition-duration: 0.25s;
  transition-timing-function: ease;

  -webkit-user-select: none; /* Safari */
  -ms-user-select: none;     /* IE 10+ и Edge */
  user-select: none;         /* Стандарт: Chrome, Firefox, Opera, Edge */

  &__contant {
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
