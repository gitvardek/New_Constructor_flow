<script setup lang="ts">
// @ts-nocheck 31
// Интерфейс для табов
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

import { TFasadeSize } from "@/types/types";
import { THandleType } from "../FigureRightPage/Handles/useHandlesAction";

import ConfigurationOption from "./ConfigurationOption.vue";
import SurfaceRedactor from "./SurfaceRedactor.vue";
import MillingRedactor from "./MillingRedactor.vue";
import ColorRedactor from "./ColorRedactor.vue";
import PatinaRedactor from "./PatinaRedactor.vue";
import GlassRedactor from "./GlassRedactor.vue";
import ShowcaseRedactor from "./ShowcaseRedactor.vue";
import Accordion from "@/components/ui/accordion/Accordion.vue";
import MainInput from "@/components/ui/inputs/MainInput.vue";
import DirectionControl from "@/components/ui/direction/DirectionControl.vue";

import { useOptions } from "../RailsRightPage/useOptions";
import { useHandlesAction } from "../FigureRightPage/Handles/useHandlesAction";
import { useConversationActions } from "../../actions/useConversationActions";

const { resetGlobal } = useOptions();
const { getIntegratedHandleControllerData, setIntegratedHandleAction } =
  useHandlesAction();
const {
  createFasadeConversations,
  checkConversations,
  checkFasadeConversations,
  filterFasadeConversations,
} = useConversationActions();

const props = defineProps({
  tabIndex: Number /** Индекс выбранного фасада в defaultTab.vue */,
  fasadeData: Object,
});

const _APP = useAppData().getAppData;
const _FASADE = _APP.FASADE;

const eventBus = useEventBus();
const emit = defineEmits(["select_material"]);

const modelState = useModelState();

const materialList = ref(null);
const productData = ref(null);
const productId = ref(null);

let currentEditableOption = ref<String>("surface");

const currentSurfaceData = ref<Object>({});
const currentMillingData = ref<Object>({});
const currentPaletteData = ref<Object>({});
const currentPatinaData = ref<Object>({});
const currentShowcaseData = ref<Object>({});
const currentGlassData = ref<Object>({});
const curretFasadeTypesData = ref<Object>({});

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
  const { PROPS } = productData.value;
  const { CONFIG, FASADE } = PROPS;
  const { FASADE_POSITIONS, FASADE_PROPS } = CONFIG;
  const product = modelState._PRODUCTS[productId.value];
  const { COLOR, RESET_COLOR, ALUM } = FASADE_PROPS[props.tabIndex];

  const checkConversation = checkFasadeConversations(
    data.id,
    FASADE[props.tabIndex].userData.trueSize,
  );

  if (!checkConversation) return;

  emit("select_material", data);

  resetGlobal();

  const isShowcase = FASADE_POSITIONS[props.tabIndex].SHOWCASE === 1;
  const dataOfFasadeType = _FASADE[data.id];

  productData.value.restrictData[props.tabIndex] = createFasadeConversations(
    data.id,
  );

  isSurfaceSelected.value = true;
  currentSurfaceData.value = data;

  // ================================================================================================================

  /** @Фрезеровка */
  millingList.value = modelState.getCurrentMillingData;
  // isMillingExist.value = millingList.value.length > 0 && !product.GLASS[0];
  isMillingExist.value = millingList.value.length > 0;

  /** @Палитра */
  paletteList.value = modelState.getCurrentPaletteData;
  isPalleteExist.value = Object.keys(paletteList.value).length > 0;

  /** @Патина */
  patinaList.value = modelState.getCurrentPatinaData;
  // isPatinaExist.value = patinaList.value.length > 0 && isMillingExist.value;

  /** @Витрины */
  showcaseList.value = modelState.getCurrentShowcaseData;

  // console.log(data, "==== ❌ Параметры выбранного фасада ❌ ====");

  isShowcaseExist.value =
    !data.material?.includes("Alum") &&
    isShowcase &&
    data.id !== RESET_COLOR &&
    showcaseList.value.length > 0;

  /** @Стёкла */
  glassList.value = modelState.getCurrentGlassData;
  isGlassExist.value = glassList.value.length > 0 && isShowcase;

  /** @Тип_фасада */
  isFasadeTypesExist.value = modelState.getCurrentFasadeTypesData.length > 0;

  isFasadeHandleExist.value = false;
  fasadeHandleList.value = {};
  FASADE_PROPS[props.tabIndex].MILLING_TYPE = null;

  // ================================================================================================================

  if (isMillingExist.value) {
    const { NAME, PREVIEW_PICTURE, ID, PATINAOFF } = millingList.value[0];
    modelState.setMillingId(props.tabIndex, ID);
    currentMillingData.value = { name: NAME, imgSrc: PREVIEW_PICTURE };

    isPatinaExist.value =
      patinaList.value.length > 0 && isMillingExist.value && PATINAOFF == 0;
  } else {
    currentMillingData.value = {};
    isFasadeHandleExist.value = false;
    fasadeHandleList.value = {};
    FASADE_PROPS[props.tabIndex].MILLING_TYPE = null;
    isPatinaExist.value = false;
  }

  if (isPatinaExist.value) {
    const { NAME, PREVIEW_PICTURE } = patinaList.value[0];
    currentPatinaData.value = { name: NAME, imgSrc: PREVIEW_PICTURE };
  }

  if (isPalleteExist.value) {
    let { NAME, HTML, ID } =
      paletteList.value[Object.keys(paletteList.value)[0]];
    currentPaletteData.value = { name: NAME, hex: HTML };

    eventBus.emit("A:ChangePaletteColor", {
      data: ID,
      fasadeNdx: props.tabIndex,
    });
  }

  if (isGlassExist.value) {
    const { NAME, PREVIEW_PICTURE } = glassList.value[0];
    currentGlassData.value = { name: NAME, imgSrc: PREVIEW_PICTURE };
  } else {
    currentGlassData.value = {};
  }

  if (isShowcaseExist.value && showcaseList.value.length > 0) {
    const { NAME, PREVIEW_PICTURE } = showcaseList.value[0];
    currentShowcaseData.value = { name: NAME, imgSrc: PREVIEW_PICTURE };
  } else {
    currentShowcaseData.value = {};
  }

  if (isFasadeTypesExist.value) {
    const typeList = getIntegratedHandleControllerData(
      modelState.getCurrentFasadeTypesData,
      props.tabIndex,
      "integrate",
    );

    FASADE_PROPS[props.tabIndex].TYPE = typeList[0].id;
    fasadeTypesList.value = typeList;
  } else {
    fasadeTypesList.value = {};
    FASADE_PROPS[props.tabIndex].TYPE = null;
  }
};

const onSelectMilling = (data) => {
  currentMillingData.value = data;

  const { FASADE_PROPS, FASADE_POSITIONS } = productData.value.PROPS.CONFIG;
  const fasadeProps = FASADE_PROPS[props.tabIndex];
  const isShowcase = FASADE_POSITIONS[props.tabIndex].SHOWCASE === 1;
  const rootDataPatina = modelState._FASADE[fasadeProps.COLOR].PATINA;

  // if (isShowcase) return;

  if (!isShowcase) {
    isPatinaExist.value =
      data.patina == 0 &&
      rootDataPatina.length > 0 &&
      rootDataPatina[0] != null &&
      rootDataPatina[0] != 0;

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
  }

  /** @Отображение_положения_петель */

  if (data.fasade_type && data.fasade_type[0] !== null) {
    const typeList = getIntegratedHandleControllerData(
      data,
      props.tabIndex,
      "milling",
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
  } else {
    isFasadeHandleExist.value = false;
    fasadeHandleList.value = {};
    fasadeProps.MILLING_TYPE = null;
  }
};

const onSelectPalette = (data) => {
  currentPaletteData.value = data;
};

const onSelectPatina = (data) => {
  currentPatinaData.value = data;
};

const onSelectGlass = (data) => {
  currentGlassData.value = data;
};

const onSelectShowcase = (data) => {
  currentShowcaseData.value = data;
};

const onChangeMillingHandlePos = (action, id) => {
  const { FASADE_PROPS, FASADE_POSITIONS } = productData.value.PROPS.CONFIG;
  const fasadeProps = FASADE_PROPS[props.tabIndex];
  const isShowcase = FASADE_POSITIONS[props.tabIndex].SHOWCASE === 1;
  fasadeProps.MILLING_TYPE = id ?? null;

  if (isShowcase) {
    eventBus.emit("A:ChangeShowcaseMilling");
    return;
  }
  setIntegratedHandleAction(action, props.tabIndex, "milling");
};

const onChangeIntegratedHandlePos = (action, id) => {
  const { FASADE_PROPS } = productData.value.PROPS.CONFIG;
  const fasadeProps = FASADE_PROPS[props.tabIndex];
  fasadeProps.TYPE = id ?? null;

  setIntegratedHandleAction(action, props.tabIndex, "integrate");
};

/** Удаление опций конфигурации */
const deleteSelectedOptions = (type: String) => {
  const { FASADE_PROPS, FASADE_POSITIONS } = productData.value.PROPS.CONFIG;
  const isShowcase = FASADE_POSITIONS[props.tabIndex].SHOWCASE === 1;

  if (type == "surface") {
    eventBus.emit("A:Delite-Fasad", props.tabIndex);
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

    FASADE_PROPS[props.tabIndex].TYPE = null;
    FASADE_PROPS[props.tabIndex].MILLING_TYPE = null;

    /** @Очищаем данные для отслеживания полотна */
    productData.value.restrictData = {};

    setCurrentEditableOption("surface");
    resetGlobal(); /** @Очищаеи_опции */
    return;
  }

  if (type === "milling") {
    const { NAME, PREVIEW_PICTURE, ID } = millingList.value[0];
    currentMillingData.value = { name: NAME, imgSrc: PREVIEW_PICTURE };
    // FASADE_PROPS[props.tabIndex].PATINA = 475428;
    currentPatinaData.value = {
      name: Object.values(modelState._PATINA)[0].NAME,
      imgSrc: Object.values(modelState._PATINA)[0].PREVIEW_PICTURE,
    };

    if (!isPatinaExist.value && patinaList.value.length > 0) {
      eventBus.emit("A:DelitePatina", props.tabIndex);
    }

    // FASADE_PROPS[props.tabIndex].MILLING_TYPE = null;
    isFasadeTypesExist.value = false;
    fasadeTypesList.value = {};

    isFasadeHandleExist.value = false;
    fasadeHandleList.value = {};
    isPatinaExist.value = false;

    FASADE_PROPS[props.tabIndex].MILLING = ID;

    if (isShowcase) {
      eventBus.emit("A:ChangeShowcaseMilling");
      return;
    }
    eventBus.emit("A:DeliteMilling", props.tabIndex);
  }

  if (type === "palette") {
    let { ID, NAME, HTML } = Object.values(paletteList.value)[0];
    eventBus.emit("A:ChangePaletteColor", {
      data: ID,
      fasadeNdx: props.tabIndex,
    });
    currentPaletteData.value = { name: NAME, hex: HTML };
  }

  if (type === "patina") {
    eventBus.emit("A:DelitePatina", props.tabIndex);
    const { NAME, PREVIEW_PICTURE } = patinaList.value[0];
    currentPatinaData.value = { name: NAME, imgSrc: PREVIEW_PICTURE };
  }

  if (type === "showcase") {
    eventBus.emit("A:DeliteShowcase", props.tabIndex);

    const { NAME, PREVIEW_PICTURE } = showcaseList.value[0];
    currentShowcaseData.value = { name: NAME, imgSrc: PREVIEW_PICTURE };
  }

  if (type === "glass") {
    const { ID, NAME, PREVIEW_PICTURE } = glassList.value[0];
    currentGlassData.value = { name: NAME, imgSrc: PREVIEW_PICTURE };

    eventBus.emit("A:ChangeGlassColor", {
      data: ID,
      fasadeNdx: props.tabIndex,
    });
  }
};

const millingStatus = computed(() => {
  if (!currentMillingData.value.imgSrc) {
    return "disabled";
  }
});

/** Выбор панели редактирования фрезеровки или цвета, если такая опция существует */
const setCurrentEditableOption = (name: String) => {
  currentEditableOption.value = name;
};

const update = () => {
  currentSurfaceData.value = {};
  currentMillingData.value = {};
  currentPaletteData.value = {};
  currentPatinaData.value = {};
  currentShowcaseData.value = {};
  currentGlassData.value = {};

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
  const fasadeProps = FASADE_PROPS[props.tabIndex];
  const product = _APP.CATALOG.PRODUCTS[productId.value];
  const isShowcase = FASADE_POSITIONS[props.tabIndex].SHOWCASE === 1;

  const {
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
  } = fasadeProps;

  const fasadeData = _FASADE[COLOR];
  if (!fasadeData) return;

  const pid = productId.value;

  // Инициализация данных фасада
  modelState.createCurrentPaletteData(COLOR);
  modelState.createCurrentMillingData({
    fasadeId: COLOR,
    productId: pid,
    fasadeNdx: props.tabIndex,
  });
  modelState.createCurrentPatinaData({ fasadeId: COLOR, productId: pid });
  modelState.createCurrentGlassData({ fasadeId: COLOR, productId: pid });
  modelState.createCurrentShowcaseData({
    fasadeId: COLOR,
    productId: pid,
    fasadeNdx: props.tabIndex,
  });

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
      props.tabIndex,
      "integrate",
    );
  }

  /** @Тип_ручки_фрезеровки */
  if (MILLING_TYPE && MILLING) {
    const curMilling = _APP.MILLING[MILLING];
    const typeList = getIntegratedHandleControllerData(
      curMilling,
      props.tabIndex,
      "milling",
    );
    fasadeHandleList.value = typeList;
    isFasadeHandleExist.value = true;
  }

  /** @Фрезеровка */
  // if (fasadeData.ATTACH_MILLINGS?.[0] && !isShowcase) {
  if (millingData.length > 0) {
    millingList.value = millingData;
    isMillingExist.value = millingData.length > 0;
  }

  /** @Витрины */
  if (isShowcase && ALUM == null && COLOR != 7397) {
    showcaseList.value = showcaseData;
    isShowcaseExist.value = showcaseData.length > 0;
  }

  /** @Палитра */
  if (fasadeData.PALETTE?.[0]) {
    paletteList.value = paletteData;
    isPalleteExist.value = Object.keys(paletteList.value).length > 0;
  }

  /** @Патина */
  if (fasadeData.PATINA?.[0] && isMillingExist.value && !isShowcase) {
    const curMilling = _APP.MILLING[MILLING];

    patinaList.value = patinaData;
    isPatinaExist.value = patinaData.length > 0 && curMilling.PATINAOFF == 0;
  }

  /** @Стёкла */
  if (isShowcase && glassData.length > 0) {
    glassList.value = glassData;
    isGlassExist.value = glassData.length > 0;
  }

  // Текущие выбранные значения
  if (COLOR && _FASADE[COLOR]) {
    const { NAME, PREVIEW_PICTURE } = _FASADE[COLOR];
    currentSurfaceData.value = { name: NAME, imgSrc: PREVIEW_PICTURE };
    isSurfaceSelected.value = true;
  }

  const assignIfFound = (
    list: any[],
    id: string | number,
    target: any,
    key: string,
    imageKey = "PREVIEW_PICTURE",
  ) => {
    const item = list?.find((i) => i.ID == id);

    if (item) target.value = { name: item.NAME, imgSrc: item[imageKey] };
  };

  if (MILLING) {
    assignIfFound(
      millingData,
      MILLING,
      currentMillingData,
      "currentMillingData",
    );
  }
  if (PALETTE && paletteData[PALETTE]) {
    const { NAME, HTML } = paletteData[PALETTE];
    currentPaletteData.value = { name: NAME, hex: HTML };
  }
  if (PATINA && !product.type_showcase?.[0]) {
    assignIfFound(patinaData, PATINA, currentPatinaData, "currentPatinaData");
  }
  if (SHOWCASE) {
    assignIfFound(
      showcaseData,
      SHOWCASE,
      currentShowcaseData,
      "currentShowcaseData",
    );
  }
  if (GLASS) {
    assignIfFound(glassData, GLASS, currentGlassData, "currentGlassData");
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

  const parentKey = parseInt(sizesParentKey[props.tabIndex]);

  const sizesKeys = Object.values(_APP.FASADENUMBERSIZE[parentKey]).flat();
  const curSizeId = FASADE_PROPS[props.tabIndex].SIZES.id;

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
  const curFasade = FASADE_PROPS[props.tabIndex];
  const curSize = curFasade.SIZES;
  const positionList = Object.values(FASADE_SIZE)[props.tabIndex];
  const curPositionId = positionList[data.ID].ID;
  const defaultWidth = Object.values(positionList)[0].FASADE_WIDTH;

  const isIncomeWidth = isNaN(
    Number(_APP.FASADE_POSITION[curPositionId].FASADE_WIDTH),
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
    type: "resize",
  });
};

const updateFasadeSize = async (data) => {
  const curData = productData.value;
  const { width, height, depth } = _APP.CATALOG.PRODUCTS[curData.PROPS.PRODUCT];
  const { FASADE_PROPS } = curData.PROPS.CONFIG;
  const curFasade = FASADE_PROPS[props.tabIndex];
  const curSize = curFasade.SIZES;
  curSize.params.FASADE_WIDTH = data;

  eventBus.emit("A:Model-resize", {
    data: { width, height, depth },
    type: "resize",
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
  const current = FASADE[props.tabIndex];
  return current.userData.trueSize;
});

onBeforeMount(() => {
  // materialList.value = modelState.getCurrentModelFasadesData;
  productData.value = modelState.getCurrentModel.userData;
  productId.value = productData.value.PROPS.PRODUCT;
  materialList.value = filterFasadeConversations(props.tabIndex);

  fasadeSizeList.value = prepareFasadeSizeList();
  fasadeSizeListExist.value = fasadeSizeList.value.length > 0;

  const { FASADE_PROPS } = productData.value.PROPS.CONFIG;
  const curFasade = FASADE_PROPS[props.tabIndex];
  const curSize = curFasade.SIZES;

  incomeSize.value = {
    width: curSize?.params?.FASADE_WIDTH ?? null,
    min: curSize?.params?.min ?? null,
    max: curSize?.params?.max ?? null,
  };
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
    <div class="container__header">
      <h3>Конфигурация фасада {{ props.tabIndex + 1 }}</h3>
      <div class="container__header--params">
        <p class="container__title--params">
          Высота: {{ getFasadesize.FASADE_HEIGHT ?? "н/о" }} мм.
        </p>
        <p class="container__title--params">
          Ширина: {{ getFasadesize.FASADE_WIDTH ?? "н/о" }} мм.
        </p>
      </div>
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
      v-if="currentEditableOption === 'surface'"
      :materialList="materialList"
      :tabIndex="props.tabIndex"
      @select_material="onSelectMaterial"
    />

    <MillingRedactor
      v-if="currentEditableOption === 'milling'"
      :millingList="millingList"
      :tabIndex="props.tabIndex"
      @select_milling="onSelectMilling"
    />

    <ColorRedactor
      v-if="currentEditableOption === 'palette'"
      :paletteList="paletteList"
      :tabIndex="props.tabIndex"
      @select_color="onSelectPalette"
    />

    <PatinaRedactor
      v-if="currentEditableOption === 'patina'"
      :patinaList="patinaList"
      :tabIndex="props.tabIndex"
      @select_patina="onSelectPatina"
    />

    <GlassRedactor
      v-if="currentEditableOption === 'glass'"
      :glassList="glassList"
      :tabIndex="props.tabIndex"
      @select_glass="onSelectGlass"
    />

    <ShowcaseRedactor
      v-if="currentEditableOption === 'showcase'"
      :showcaseList="showcaseList"
      :tabIndex="props.tabIndex"
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

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 1rem;
    font-weight: 400;

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

.configuration {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 8px;

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
