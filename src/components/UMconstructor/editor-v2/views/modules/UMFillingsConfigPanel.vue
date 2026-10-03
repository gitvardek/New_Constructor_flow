<script setup lang="ts">
// @ts-nocheck

// ==== Редактор УМ v2 — "Наполнение › Конфигурация" ====
// Установленное наполнение выбранной секции плоским списком в стиле
// "Конфигурации" гардеробной (WardrobeFillingsView): название, область с
// составным номером, положение (от дна изнутри; у вертикальных — слева),
// высота фасада, размеры универсального ящика, фасад и ручка, удаление.
// Действия — методы FillingsManager, как в FillingsView обычного УМ;
// редактор фасада/ручки — useFillingFasadeEditor (общий с FillingsView).

import "@/components/UMconstructor/styles/UM.scss";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { UM_DRAWERS_IDS, UM_PARAMS } from "@/components/UMconstructor/utils/Const.ts";
import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import MainInput from "@/components/ui/inputs/MainInput.vue";
import AccordionSelect from "@/components/ui/accordion/AccordionSelect.vue";
import AdvanceCorpusMaterialRedactor from "@/components/ui/color/AdvanceCorpusMaterialRedactor.vue";
import Handles from "@/components/right-menu/customiser-pages/FigureRightPage/Handles/Handles.vue";
import ClosePopUpButton from "@/components/ui/svg/ClosePopUpButton.vue";
import { useFigureRightPage } from "@/utils/useFigureRightPage";
import MaterialThumb from "../components/MaterialThumb.vue";
import { formatAreaTitle, formatCellPath } from "../../grid/cellPath.ts";
import { useEditorPolicy } from "../../policy/editorPolicy.ts";
import { collectSectionFillings } from "../../fillings/fillingLocations.ts";
import {
  applyFillingPositionX,
  applyFillingPositionY,
  getFillingPositionX,
  getFillingPositionY,
} from "../../fillings/fillingPosition.ts";
import { getUniversalDepthOptions, getUniversalHeightOptions } from "../../fillings/drawerOptions.ts";
import { useFillingFasadeEditor } from "../../fillings/useFillingFasadeEditor.ts";

const props = defineProps({
  module: {
    type: Object,
    required: true,
  },
  UMconstructor: {
    type: UMconstructorClass,
    required: true,
  },
});

const policy = useEditorPolicy();
const { createSurfaceList } = useFigureRightPage();
const listRef = ref<HTMLElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);

const store = computed(() => props.UMconstructor.UM_STORE);
const selectedFilling = computed(() => store.value.getSelected("fillings") ?? {});

// Секция — из выбора наполнения, иначе из выбора области.
const selectedSec = computed(() => selectedFilling.value.sec ?? store.value.getSelected("module")?.sec ?? null);

const productId = computed(() => store.value.getUMData()?.PRODUCT);

const {
  isOpenMaterialSelector,
  currentFasadeMaterial,
  isOpenHandleSelector,
  currentHandle,
  openFasadeSelector,
  openHandleSelector,
  selectHandle,
  selectOption,
  closeMenu,
  closeIfOtherSelected,
} = useFillingFasadeEditor({
  getEngine: () => props.UMconstructor,
  getModule: () => props.module,
});

const toSelectOptions = (values: number[]) => values.map((value) => ({ value, label: `${value} мм` }));

const cards = computed(() =>
  collectSectionFillings(props.module, selectedSec.value).map((location) => {
    const { filling, level, path } = location;
    const isVertical = !!filling.isVerticalItem;
    const isUniversal = UM_DRAWERS_IDS.UNIVERSAL.includes(filling.productGroupID);

    return {
      key: `${formatCellPath(path)}-${filling.id}`,
      location,
      title: `${filling.name} №${filling.id}`,
      areaTitle: formatAreaTitle(level, path, policy.sectionLabel),
      // Внутренний ящик двигается только вместе с внешним.
      isInner: UM_DRAWERS_IDS.INNER.includes(filling.productGroupID) && productId.value !== UM_PARAMS.RASPASHNOY_ID,
      isVertical,
      position: isVertical
        ? getFillingPositionX(location)
        : getFillingPositionY(props.UMconstructor, props.module, location),
      // changeDrawerFasade и размеры универсального ящика работают до уровня ряда.
      canEditFasadeHeight: !!filling.fasade && level !== "extra",
      depthOptions: isUniversal && level !== "extra" ? toSelectOptions(getUniversalDepthOptions(props.UMconstructor, props.module, filling)) : [],
      heightOptions: isUniversal && level !== "extra" ? toSelectOptions(getUniversalHeightOptions(props.UMconstructor, filling)) : [],
    };
  }),
);

const isActive = ({ location }) => {
  const { sec, cell, row, extra, item } = selectedFilling.value;
  const { path, filling } = location;
  return sec === path.sec && cell === path.cell && row === path.row && extra === path.extra && item === filling.id;
};

const select = ({ location }) => {
  const { path, filling } = location;
  props.UMconstructor.FILLINGS.selectCell(path.sec, path.cell, path.row, path.extra, filling.id);
};

const deleteFilling = ({ location }) => {
  const { path, index } = location;
  closeMenu();
  props.UMconstructor.FILLINGS.deleteFilling(path.sec, index, path.cell, path.row, path.extra);
};

const changePosition = (card, value: number) => {
  const apply = card.isVertical ? applyFillingPositionX : applyFillingPositionY;
  apply(props.UMconstructor, props.module, card.location, Number(value));
};

const changeFasadeHeight = ({ location }, value: number) => {
  const { path, index } = location;
  props.UMconstructor.FILLINGS.changeDrawerFasade(null, Number(value), index, path.sec, path.cell, path.row);
};

const changeUniversalDepth = ({ location }, value: number) => {
  const { path, index } = location;
  props.UMconstructor.FILLINGS.changeUniversalDepth(value, index, path.sec, path.cell, path.row, path.extra);
};

const changeUniversalHeight = ({ location }, value: number) => {
  const { path, index } = location;
  props.UMconstructor.FILLINGS.changeUniversalHeight(value, index, path.sec, path.cell, path.row, path.extra);
};

const openFasade = ({ location }) => {
  const { path, index } = location;
  openFasadeSelector(path.sec, path.cell, path.row, path.extra, index);
};

const openHandle = ({ location }) => {
  const { path, index } = location;
  openHandleSelector(path.sec, path.cell, path.row, path.extra, index);
};

const isFasadeOpen = (card) => isOpenMaterialSelector.value && currentFasadeMaterial.value?.item === card.location.filling.id;
const isHandleOpen = (card) => isOpenHandleSelector.value && currentHandle.value?.item === card.location.filling.id;

const fasadeMaterial = (filling) => {
  const { PALETTE, COLOR } = filling.fasade.material;
  return PALETTE ? props.UMconstructor.APP.PALETTE[PALETTE] : props.UMconstructor.APP.FASADE[COLOR];
};

const handleProduct = (filling) => {
  const id = filling.fasade.material.HANDLES?.id;
  return id ? props.UMconstructor.APP.CATALOG.PRODUCTS[id] : null;
};


watch(selectedFilling, (selected) => closeIfOtherSelected(selected));

// Выбор с канваса — прокрутка списка к карточке (без сдвига холста, см. UMSectionsPanel).
watch(() => `${selectedFilling.value.sec}-${selectedFilling.value.item}`, async () => {
  await nextTick();
  const list = listRef.value;
  const target = list?.querySelector(".um-fillings-config__item--active") as HTMLElement | null;
  if (!list || !target) return;

  const shift = target.getBoundingClientRect().top - list.getBoundingClientRect().top;
  const visible = shift >= 0 && shift + target.offsetHeight <= list.clientHeight;
  if (!visible) list.scrollTo({ top: list.scrollTop + shift, behavior: "smooth" });
});

const handleOutsideClick = (event: MouseEvent) => {
  if (!isOpenMaterialSelector.value && !isOpenHandleSelector.value) return;

  const panel = panelRef.value;
  const target = event.target;
  if (!panel || !(target instanceof Node) || panel.contains(target)) return;

  closeMenu();
};

onMounted(() => document.addEventListener("click", handleOutsideClick));
onBeforeUnmount(() => document.removeEventListener("click", handleOutsideClick));
</script>

<template>
  <div ref="listRef" class="UM um-fillings-config">
    <p v-if="selectedSec === null" class="UM no-select um-fillings-config__hint">
      Выберите секцию на канвасе, чтобы увидеть её наполнение.
    </p>

    <template v-else>
      <p class="UM no-select um-fillings-config__section-title">
        {{ formatAreaTitle("section", { sec: selectedSec, cell: null, row: null, extra: null }, policy.sectionLabel) }}
      </p>

      <p v-if="!cards.length" class="UM no-select um-fillings-config__hint">
        Наполнения нет — добавьте его во вкладке «Вставка».
      </p>

      <div v-for="card in cards" :key="card.key"
        :class="['UM um-fillings-config__item', { 'um-fillings-config__item--active': isActive(card) }]"
        @click="select(card)">
        <div class="um-fillings-config__header">
          <div>
            <p class="UM no-select um-fillings-config__title">{{ card.title }}</p>
            <p class="UM no-select um-fillings-config__subtitle">{{ card.areaTitle }}</p>
          </div>
          <button class="UM actions-btn actions-icon" @click.stop="deleteFilling(card)">
            <img class="UM actions-icon--delete" src="/icons/delite.svg" alt="" />
          </button>
        </div>

        <p v-if="card.isInner" class="UM no-select um-fillings-config__subtitle">
          Встроен во внешний ящик · {{ card.location.filling.width }}×{{ card.location.filling.height }} мм
        </p>

        <template v-else>
          <div class="um-fillings-config__fields" @click.stop>
            <div class="actions-inputs">
              <p class="actions-title">{{ card.isVertical ? "Положение слева" : "Положение от дна" }}</p>
              <div class="actions-input--container">
                <MainInput :key="`${card.key}-position-${card.position.value}`" :type="'number'"
                  :inputClass="'actions-input'" :modelValue="card.position.value" :min="card.position.min"
                  :max="card.position.max" :step="1" :isUM="true"
                  @update:modelValue="(value) => changePosition(card, value)" />
              </div>
            </div>

            <div v-if="card.canEditFasadeHeight" class="actions-inputs">
              <p class="actions-title">Высота фасада</p>
              <div class="actions-input--container">
                <MainInput :key="`${card.key}-fasade-${card.location.filling.fasade.height}`" :type="'number'"
                  :inputClass="'actions-input'" :modelValue="card.location.filling.fasade.height"
                  :min="card.location.filling.fasade.minY" :max="card.location.filling.fasade.maxY" :step="1"
                  :isUM="true" @update:modelValue="(value) => changeFasadeHeight(card, value)" />
              </div>
            </div>
          </div>

          <div v-if="card.depthOptions.length || card.heightOptions.length" @click.stop>
            <AccordionSelect v-if="card.depthOptions.length" label="Глубина ящика" :options="card.depthOptions"
              :modelValue="card.location.filling.depth" @update:modelValue="(value) => changeUniversalDepth(card, value)" />
            <AccordionSelect v-if="card.heightOptions.length" label="Высота ящика" :options="card.heightOptions"
              :modelValue="card.location.filling.height"
              @update:modelValue="(value) => changeUniversalHeight(card, value)" />
          </div>

          <div v-if="card.location.filling.fasade" class="um-fillings-config__cards">
            <div :class="['wardrobe-material-card um-fillings-config__card', { 'um-fillings-config__card--active': isFasadeOpen(card) }]"
              @click.stop="openFasade(card)">
              <MaterialThumb :item="fasadeMaterial(card.location.filling)" />
              <div class="wardrobe-material-card__info">
                <p class="wardrobe-material-card__label">Фасад</p>
                <p class="wardrobe-material-card__name">{{ fasadeMaterial(card.location.filling)?.NAME ?? "Не выбран" }}</p>
              </div>
            </div>

            <div :class="['wardrobe-material-card um-fillings-config__card', { 'um-fillings-config__card--active': isHandleOpen(card) }]"
              @click.stop="openHandle(card)">
              <MaterialThumb :item="handleProduct(card.location.filling)" />
              <div class="wardrobe-material-card__info">
                <p class="wardrobe-material-card__label">Ручка</p>
                <p class="wardrobe-material-card__name">{{ handleProduct(card.location.filling)?.NAME ?? "Без ручки" }}</p>
              </div>
            </div>
          </div>
        </template>
      </div>
    </template>
  </div>

  <transition name="slide--right" mode="out-in">
    <div v-if="isOpenMaterialSelector || isOpenHandleSelector" key="um-fillings-select" ref="panelRef"
      class="no-select color--right-select">
      <ClosePopUpButton class="menu__close" @close="closeMenu()" />

      <AdvanceCorpusMaterialRedactor v-if="isOpenMaterialSelector" :is-fasade="true"
        :elementData="currentFasadeMaterial.data" :fasade-size="currentFasadeMaterial.fasadeSize"
        :element-label="`ящика №${currentFasadeMaterial.item}`" @parent-callback="selectOption" />

      <Handles v-else :is2-dconstructor="true" :data="createSurfaceList(currentHandle)" :index="0"
        @parent-callback="selectHandle" :active-pos="currentHandle.data.HANDLES.position" />
    </div>
  </transition>
</template>

<style scoped lang="scss">
.um-fillings-config {
  padding: 0.75rem;
  overflow-y: auto;
  overflow-x: hidden;
  max-height: calc(var(--modal-large-height) - 75px);

  &__hint {
    opacity: 0.6;
  }

  &__section-title {
    font-weight: bold;
    margin-bottom: 1rem;
  }

  &__item {
    cursor: pointer;
    padding: 0.5rem;
    padding-bottom: 1rem;
    margin-bottom: 1rem;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 0.5rem;
    transition: background-color 0.15s ease;

    &--active {
      background: #d1ffd6a4;
      box-shadow: 0 0 0 1px rgba(5, 5, 5, 0.4) inset;
    }
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }

  &__title {
    font-weight: bold;
    opacity: 0.7;
    margin-bottom: 0;
  }

  &__subtitle {
    font-size: 1.2rem;
    opacity: 0.5;
    margin-bottom: 0;
  }

  &__fields {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.25rem;
    margin-bottom: 0.5rem;
  }

  &__cards {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__card {
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.75rem;

    &--active {
      background: $bg;
    }
  }
}

.wardrobe-material-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;

  &__info {
    min-width: 0;
  }

  &__label {
    color: rgb(131, 133, 135);
    font-size: 1.2rem;
    margin-bottom: 0;
  }

  &__name {
    font-size: 1.4rem;
    margin-bottom: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
