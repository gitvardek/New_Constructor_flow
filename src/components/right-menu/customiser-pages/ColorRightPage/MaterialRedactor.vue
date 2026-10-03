<script setup lang="ts">
// @ts-nocheck 31

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

import { TFasadeItem, TFasadeProp, TTotalProps } from "@/types/types";

import ConfigurationOption from "./ConfigurationOption.vue";
import SurfaceRedactor from "./SurfaceRedactor.vue";
import MillingRedactor from "./MillingRedactor.vue";
import ColorRedactor from "./ColorRedactor.vue";
import PatinaRedactor from "./PatinaRedactor.vue";
import GlassRedactor from "./GlassRedactor.vue";
import ShowcaseRedactor from "./ShowcaseRedactor.vue";
import FasadeSizeSelector from "./FasadeSizeSelector.vue";
import LoopPositionSelect from "@/components/ui/direction/LoopPositionSelect.vue";

import { useConversationActions } from "../../actions/useConversationActions";
import {
  useFasadeMaterialActions,
  TSurfaceSelection,
} from "../../actions/useFasadeMaterialActions";
import { useFasadeSize } from "./composables/useFasadeSize";
import { useFasadeHandles } from "./composables/useFasadeHandles";
import { useFasadeCommands } from "./composables/useFasadeCommands";
import { useFasadeOptionsState } from "./composables/useFasadeOptionsState";
import { scrollToActiveOption } from "./composables/scrollToActiveOption";
import {
  FASADE_OPTION_KEYS,
  toImageView,
  toColorView,
  isPatinaAvailableForMilling,
  getDefaultPatinaForMilling,
  resolveMillingRepair,
  resolveOptionsOnMaterialSelect,
  resolveOptionsFromConfig,
} from "./domain/fasadeOptions";

const { checkFasadeConversations, filterFasadeConversations } =
  useConversationActions();
const { buildCurrentFasadeData, createSurfaceSelection } =
  useFasadeMaterialActions();

/** ID полотна «Без фасада» */
const NO_FASADE_ID = 7397;

const props = defineProps({
  tabIndex: Number /** Индекс выбранного фасада в defaultTab.vue */,
});

const {
  sizeList,
  currentSize,
  incomeSize,
  initSize,
  changeFasadeSize,
  updateFasadeWidth,
  resetSize,
} = useFasadeSize(() => props.tabIndex);

const _APP = useAppData().getAppData;
const _FASADE = _APP.FASADE;

const emit = defineEmits(["select_material"]);

const modelState = useModelState();

const materialList = ref(null);
const productData = ref(null);
const productId = ref(null);

const fasadeProps = computed(() =>
  productData.value?.PROPS?.CONFIG?.FASADE_PROPS?.[props.tabIndex]
);

const currentEditableOption = ref<string>("surface");
const mainContainer = ref<HTMLElement | null>(null);

const {
  surface,
  fasadeOptions,
  applyOptionsPatch,
  applySurfacePatch,
  hideOptions,
  resetOptionsState,
} = useFasadeOptionsState();
// Слоты опций: { list, exists, current }. Не заменяются при сбросе, поэтому деструктуризация безопасна
const { milling, palette, patina, glass, showcase } = fasadeOptions;

const {
  fasadeTypesList,
  isFasadeTypesExist,
  fasadeHandleList,
  isFasadeHandleExist,
  hideIntegratedTypes,
  resetIntegratedTypes,
  hideMillingHandles,
  resetMillingHandles,
  applyIntegratedTypes,
  applyMillingHandles,
  restoreHandles,
  onChangeMillingHandlePos,
  onChangeIntegratedHandlePos,
} = useFasadeHandles(
  () => props.tabIndex,
  () => productData.value,
);

// Все записи в конфиг фасада и события сцены — через команды
const commands = useFasadeCommands(
  () => props.tabIndex,
  () => productData.value,
);

/**
 * Выбор полотна. SurfaceRedactor только сообщает о выборе,
 * а вся цепочка выполняется здесь: проверка размеров → списки опций → опции → сцена
 */
const onSelectMaterial = (rawData: TFasadeItem) => {
  const fasadeNdx = props.tabIndex;
  const { trueSize } = productData.value.PROPS.FASADE[fasadeNdx].userData;

  // Проверка до любых изменений: при несоответствии размеров не трогаем ни стор, ни сцену
  if (!checkFasadeConversations(rawData.ID, trueSize)) {
    return;
  }

  buildCurrentFasadeData({
    fasadeId: rawData.ID,
    productId: productId.value,
    fasadeNdx,
    fasadeSize: trueSize,
  });

  applyMaterialOptions(createSurfaceSelection(rawData));

  // Сцена — последней: applyFasadeChange читает MILLING/TYPE/MILLING_TYPE из FASADE_PROPS
  commands.changeMaterial(rawData);
};

/** Пересчёт доступных опций и их значений по умолчанию под выбранное полотно */
const applyMaterialOptions = (data: TSurfaceSelection) => {
  const { FASADE_POSITIONS, FASADE_PROPS } = productData.value.PROPS.CONFIG;
  const { RESET_COLOR } = FASADE_PROPS[props.tabIndex] as TFasadeProp;

  commands.setMillingConversation(data.id);

  emit("select_material", data);

  commands.resetGlobalOptions();

  const isShowcase = FASADE_POSITIONS[props.tabIndex].SHOWCASE === 1;

  commands.setMaterialRestrictions(data.id);

  surface.selected = true;
  surface.current = data;

  const { patch, defaultMilling, defaultPaletteColor } =
    resolveOptionsOnMaterialSelect({
      lists: getCurrentOptionLists(),
      material: data,
      isShowcase,
      resetColor: RESET_COLOR,
    });

  applyOptionsPatch(patch);

  // Запись значений по умолчанию в конфиг и сцену — порядок как до выноса правил:
  // MILLING_TYPE → MILLING → палитра → TYPE
  resetMillingHandles();

  if (defaultMilling) {
    commands.setMilling(defaultMilling.ID);
  }

  if (defaultPaletteColor) {
    commands.changePaletteColor(defaultPaletteColor.ID);
  }

  /** @Тип_фасада */
  applyIntegratedTypes();
};

/** Списки опций, собранные в сторе под текущее полотно */
const getCurrentOptionLists = () => ({
  milling: modelState.getCurrentMillingData,
  palette: modelState.getCurrentPaletteData,
  patina: modelState.getCurrentPatinaData,
  glass: modelState.getCurrentGlassData,
  showcase: modelState.getCurrentShowcaseData,
});

/**
 * Выбор фрезеровки. MillingRedactor только сообщает о выборе: сначала пересчитываются
 * зависящие от фрезеровки патина и положения ручки, затем фрезеровка пишется в конфиг и сцену —
 * тот же порядок, что был, когда запись делал сам MillingRedactor. finally — потому что раньше
 * запись выполнялась и при раннем выходе или ошибке в пересчёте
 */
const onSelectMilling = (data) => {
  try {
    updateMillingDependents(data);
  } finally {
    commands.selectMilling(data);
  }
};

/** Патина и положения ручки под выбранную фрезеровку */
const updateMillingDependents = (data) => {
  milling.current = data;

  // Проверка на существование свойств productData.value.PROPS.CONFIG
  if (!productData.value?.PROPS?.CONFIG) return;

  const { FASADE_PROPS } = productData.value.PROPS.CONFIG;
  const fasadeProps = FASADE_PROPS[props.tabIndex];

  // Проверка на существование fasadeProps
  if (!fasadeProps) {
    console.warn('FASADE_PROPS is undefined or null');
    return;
  }

  const rootDataPatina = _FASADE[fasadeProps.COLOR]?.PATINA;

  // Проверка на существование rootDataPatina и его свойств
  if (!rootDataPatina) {
    console.warn('rootDataPatina is undefined or null');
    return;
  }

  // Патина пересчитывается и для витрин: там она пишется только в конфиг, без отрисовки.
  // data.patina — PATINAOFF выбранной фрезеровки (см. MillingRedactor)
  patina.exists = isPatinaAvailableForMilling(data.patina, rootDataPatina);

  /** @Если у выбранной фрезы нет патина */
  try {
    if (!patina.exists && patina.list.length > 0) {
      commands.setPatina(null);
    } else {
      commands.setPatina(rootDataPatina[0]);

      const { NAME, PREVIEW_PICTURE } = _APP?.PATINA[rootDataPatina[0]];

      if (!NAME || !PREVIEW_PICTURE) {
        console.warn('Missing PATINA data');
        return;
      }

      patina.current = { name: NAME, imgSrc: PREVIEW_PICTURE };
    }
  } catch (e) {
    console.warn(e, "в методе onSelectMilling");
  }

  /** @Отображение_положения_петель */
  applyMillingHandles(data);
};

// Остальные редакторы тоже только сообщают о выборе: карточка обновляется здесь,
// запись в конфиг и сцену — командами, как раньше делал сам редактор

const onSelectPalette = (data) => {
  palette.current = data;
  commands.setPalette(data.ID);
  commands.changePaletteColor(data.ID);
};

const onSelectPatina = (data) => {
  patina.current = data;
  commands.applyPatina(data.ID);
};

const onSelectGlass = (data) => {
  glass.current = data;
  commands.changeGlassColor(data.ID);
};

const onSelectShowcase = (data) => {
  showcase.current = data;
  commands.changeShowcase(data.ID);
};

/** Удаление опций конфигурации */
const deleteSelectedOptions = (type: String) => {
  const { FASADE_PROPS, FASADE_POSITIONS } = productData.value.PROPS.CONFIG;
  const isShowcase = FASADE_POSITIONS[props.tabIndex].SHOWCASE === 1;

  if (type == "surface") {
    commands.removeMaterial();
    const { NAME, DETAIL_PICTURE } = _FASADE[NO_FASADE_ID];
    surface.current = { name: NAME, imgSrc: DETAIL_PICTURE };
    hideOptions();

    resetMillingHandles();
    resetIntegratedTypes();

    /** @Очищаем данные для отслеживания полотна */
    commands.clearMaterialRestrictions();

    setCurrentEditableOption("surface");
    commands.resetGlobalOptions();
    return;
  }

  if (type === "milling") {
    const firstMilling = milling.list[0];
    milling.current = toImageView(firstMilling);

    if (!patina.exists && patina.list.length > 0) {
      commands.removePatina();
    }

    hideIntegratedTypes();
    hideMillingHandles();

    // Патина по умолчанию для первой фрезеровки — то же правило, что в Events.deliteMilling:
    // при PATINAOFF == 0 первая патина списка, иначе без патины
    const defaultPatina = getDefaultPatinaForMilling(
      firstMilling.PATINAOFF,
      patina.list,
    );
    patina.exists = defaultPatina !== null;
    patina.current = defaultPatina ? toImageView(defaultPatina) : {};

    commands.setMilling(firstMilling.ID);

    if (isShowcase) {
      // На витрине фрезеровка и патина живут только в конфиге: патину по умолчанию
      // записываем здесь, Events.deliteMilling делает это для обычного фасада
      commands.setPatina(defaultPatina?.ID ?? null);
      commands.notifyShowcaseMillingChanged();
      return;
    }
    commands.removeMilling();
  }

  if (type === "palette") {
    const firstColor = Object.values(palette.list)[0];
    commands.changePaletteColor(firstColor.ID);
    palette.current = toColorView(firstColor);
  }

  if (type === "patina") {
    // Удаление патины — возврат к патине по умолчанию для текущей фрезеровки:
    // при PATINAOFF == 0 это первая патина списка, а не null
    const currentMilling = _APP.MILLING[FASADE_PROPS[props.tabIndex].MILLING];
    const defaultPatina = getDefaultPatinaForMilling(
      currentMilling?.PATINAOFF,
      patina.list,
    );

    if (defaultPatina) {
      commands.applyPatina(defaultPatina.ID);
      patina.current = toImageView(defaultPatina);
    } else {
      commands.removePatina();
      patina.current = {};
    }
  }

  if (type === "showcase") {
    // Удаление витрины — возврат к витрине по умолчанию: первой в списке продукта
    // (её же подставляет FasadeBuilder при сборке). Фрезеровку и патину не трогает
    const defaultShowcase = showcase.list[0];
    commands.changeShowcase(defaultShowcase.ID);
    showcase.current = toImageView(defaultShowcase);
  }

  if (type === "glass") {
    const firstGlass = glass.list[0];
    glass.current = toImageView(firstGlass);

    commands.changeGlassColor(firstGlass.ID);
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

/** Запись починенной фрезеровки и патины в конфиг и сцену (см. resolveMillingRepair) */
const repairMilling = (millingId: number, patinaId: number | null, isShowcase: boolean) => {
  commands.setMilling(millingId);
  commands.setPatina(patinaId);

  if (isShowcase) {
    // На витрине фрезеровка и патина только в конфиге — нужен лишь пересчёт корзины
    commands.notifyShowcaseMillingChanged();
  } else {
    // Перерисовка фрезеровки уже с записанной патиной
    commands.changeMilling(millingId);
  }
};

const update = () => {
  resetOptionsState();
  resetSize();
  hideMillingHandles();
};

const prepareData = () => {
  const { PROPS } = productData.value;
  const { CONFIG, FASADE } = PROPS as TTotalProps;
  const { FASADE_POSITIONS, FASADE_PROPS } = CONFIG;
  const fasadeProps = FASADE_PROPS[props.tabIndex];
  const isShowcase = FASADE_POSITIONS[props.tabIndex].SHOWCASE === 1;

  const {
    MILLING,
    MILLING_TYPE,
    PALETTE,
    COLOR,
    PATINA,
    GLASS,
    SHOWCASE,
    ALUM,
    TYPE,
  } = fasadeProps;

  const curFasade = FASADE[props.tabIndex];
  const { trueSize } = curFasade.userData;
  const fasadeData = _FASADE[COLOR];
  if (!fasadeData) return;

  const pid = productId.value;

  // Инициализация данных фасада
  modelState.createCurrentPaletteData(COLOR);
  modelState.createCurrentMillingData({
    fasadeId: COLOR,
    productId: pid,
    fasadeNdx: props.tabIndex,
    fasadeSize: trueSize,
  });
  modelState.createCurrentPatinaData({ fasadeId: COLOR, productId: pid });
  modelState.createCurrentGlassData({ fasadeId: COLOR, productId: pid });
  modelState.createCurrentShowcaseData({
    fasadeId: COLOR,
    productId: pid,
    fasadeNdx: props.tabIndex,
  });
  // Типы фасада (положения интегрированной ручки) — под текущее полотно: иначе restoreHandles
  // берёт из стора список, оставшийся от другого фасада, или пустой после загрузки проекта
  modelState.createCurrentFasadeTypesData({ fasadeId: COLOR, productId: pid });

  // Починка испорченного конфига: фрезеровки нет в списке фрезеровок фасада (например, ID
  // витрины после старого удаления витрины). При загрузке проекта это же чинит FasadeBuilder
  const repair = resolveMillingRepair({
    millingId: MILLING,
    patinaId: PATINA,
    millingList: modelState.getCurrentMillingData,
    patinaList: modelState.getCurrentPatinaData,
  });

  if (repair) {
    console.warn(
      `Фасад №${props.tabIndex + 1}: фрезеровки ${MILLING} нет в списке, заменена на ${repair.milling.ID}`,
    );
    repairMilling(repair.milling.ID, repair.patinaId, isShowcase);
  }

  const millingId = repair ? repair.milling.ID : MILLING;
  const patinaId = repair ? repair.patinaId : PATINA;

  /** @Тип_фасада и @Тип_ручки_фрезеровки */
  restoreHandles({ TYPE, MILLING_TYPE, MILLING: millingId });

  // Списки, флаги доступности и выбранные значения опций по сохранённому конфигу
  const { patch, surface: surfacePatch } = resolveOptionsFromConfig({
    lists: getCurrentOptionLists(),
    fasadeProps: {
      MILLING: millingId,
      PALETTE,
      PATINA: patinaId,
      GLASS,
      SHOWCASE,
      ALUM,
      COLOR,
    },
    material: fasadeData,
    millingItem: _APP.MILLING[millingId],
    isShowcase,
    noFasadeId: NO_FASADE_ID,
  });

  applyOptionsPatch(patch);

  if (surfacePatch) {
    applySurfacePatch(surfacePatch);
  }
};

const getFasadesize = computed(() => {
  const sceneModel = modelState.getCurrentModel;
  const { FASADE } = sceneModel?.userData.PROPS;
  const current = FASADE[props.tabIndex];
  return current.userData.trueSize;
});

onBeforeMount(() => {
  productData.value = modelState.getCurrentModel.userData;
  productId.value = productData.value.PROPS.PRODUCT;

  const { FASADE } = productData.value.PROPS;
  materialList.value = filterFasadeConversations(
    props.tabIndex,
    FASADE[props.tabIndex]?.userData?.trueSize,
  );

  initSize();
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
    <div class="configuration" v-if="surface.selected">
      <ConfigurationOption :type="'surface'" :data="surface.current" @choose-option="setCurrentEditableOption"
        @delete-choise="deleteSelectedOptions" />

      <!-- Опции полотна в порядке FASADE_OPTION_KEYS: фрезеровка, палитра, патина, стекло, витрина -->
      <template v-for="key in FASADE_OPTION_KEYS" :key="key">
        <ConfigurationOption v-if="fasadeOptions[key].exists" :type="key" :data="fasadeOptions[key].current"
          :additionalClass="key === 'patina' ? millingStatus : undefined" @choose-option="setCurrentEditableOption"
          @delete-choise="deleteSelectedOptions" />
      </template>

      <FasadeSizeSelector :sizeList="sizeList" :currentSize="currentSize" :incomeSize="incomeSize"
        @select-size="changeFasadeSize" @update-width="updateFasadeWidth" />

      <LoopPositionSelect v-if="isFasadeTypesExist" :options="fasadeTypesList"
        @change="onChangeIntegratedHandlePos" />

      <LoopPositionSelect v-if="isFasadeHandleExist" :options="fasadeHandleList"
        @change="onChangeMillingHandlePos" />
    </div>

    <!-- Редактор выбранной опции: список значений, выбор уходит в обработчик опции -->
    <SurfaceRedactor v-if="currentEditableOption === 'surface'" :materialList="materialList"
      :selectedId="fasadeProps?.COLOR" @select_material="onSelectMaterial" />

    <MillingRedactor v-if="currentEditableOption === 'milling'" :millingList="milling.list"
      :selectedId="fasadeProps?.MILLING" @select_milling="onSelectMilling" />

    <ColorRedactor v-if="currentEditableOption === 'palette'" :paletteList="palette.list"
      :selectedId="fasadeProps?.PALETTE" @select_color="onSelectPalette" />

    <PatinaRedactor v-if="currentEditableOption === 'patina'" :patinaList="patina.list"
      :selectedId="fasadeProps?.PATINA" @select_patina="onSelectPatina" />

    <GlassRedactor v-if="currentEditableOption === 'glass'" :glassList="glass.list"
      :selectedId="fasadeProps?.GLASS" @select_glass="onSelectGlass" />

    <ShowcaseRedactor v-if="currentEditableOption === 'showcase'" :showcaseList="showcase.list"
      :selectedId="fasadeProps?.SHOWCASE" @select_showcase="onSelectShowcase" />
  </div>
</template>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  gap: 15px;
  border: 1px solid $stroke;
  border-radius: 10px;
  padding: 5px;
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

}

.configuration {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 8px;

  @media (min-height: 1000px) {
    gap: 17px;
  }
}
</style>
