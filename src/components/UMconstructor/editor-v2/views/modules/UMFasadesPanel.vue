<script setup lang="ts">
// @ts-nocheck

// ==== Редактор УМ v2 — "Фасады" (распашные двери секций) ====
// В стиле "Конфигурации" гардеробной: двери выбранной секции, у каждой —
// сегменты карточками (высота, ширина, сторона открывания, фасад, ручка,
// разделить/удалить, подъёмные механизмы). Действия — методы FasadesManager,
// как в FasadesView обычного УМ; редактор сегмента — useFasadeEditor (общий с ним).
// Раздвижные двери модуля (grid.fasades) — в FasadesView.

import "@/components/UMconstructor/styles/UM.scss";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { LOOPSIDE } from "@/components/UMconstructor/types/UMtypes.ts";
import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import MainInput from "@/components/ui/inputs/MainInput.vue";
import AccordionSelect from "@/components/ui/accordion/AccordionSelect.vue";
import AdvanceCorpusMaterialRedactor from "@/components/ui/color/AdvanceCorpusMaterialRedactor.vue";
import Handles from "@/components/right-menu/customiser-pages/FigureRightPage/Handles/Handles.vue";
import Options from "@/components/right-menu/customiser-pages/RailsRightPage/Options.vue";
import ClosePopUpButton from "@/components/ui/svg/ClosePopUpButton.vue";
import { useFigureRightPage } from "@/utils/useFigureRightPage";
import MaterialThumb from "../components/MaterialThumb.vue";
import { formatAreaTitle } from "../../grid/cellPath.ts";
import { useEditorPolicy } from "../../policy/editorPolicy.ts";
import { useFasadeEditor } from "../../fasades/useFasadeEditor.ts";

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

const NO_FASADE_ID = 7397;

const policy = useEditorPolicy();
const { createSurfaceList } = useFigureRightPage();
const listRef = ref<HTMLElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);

const store = computed(() => props.UMconstructor.UM_STORE);
const selectedFasade = computed(() => store.value.getSelected("fasades") ?? {});

// Секция — из выбора фасада, иначе из выбора области, иначе первая.
const selectedSec = computed(() => {
  const sec = selectedFasade.value.sec ?? store.value.getSelected("module")?.sec;
  if (sec !== null && sec !== undefined && props.module.sections?.[sec]) return sec;
  return props.module.sections?.length ? 0 : null;
});

const selectedSection = computed(() => props.module.sections?.[selectedSec.value] ?? null);

const {
  isOpenMaterialSelector,
  currentFasadeMaterial,
  currentFasadeSize,
  isOpenHandleSelector,
  currentHandle,
  isOpenMechanizm,
  mechanismList,
  currentElement,
  currentSegment,
  openFasadeSelector,
  openHandleSelector,
  selectHandle,
  selectOption,
  closeMenu,
  getLoopsideList,
  setLoopside,
  createMechanizmList,
  closeIfOtherSelected,
} = useFasadeEditor({
  getEngine: () => props.UMconstructor,
  getModule: () => props.module,
});

const sectionTitle = (sec: number) => formatAreaTitle("section", { sec, cell: null, row: null, extra: null }, policy.sectionLabel);

const FASADES = computed(() => props.UMconstructor.FASADES);

const canAddDoor = computed(() => {
  const section = selectedSection.value;
  if (!section) return false;

  const count = section.fasades?.length ?? 0;
  return count < 1 || (
    (!props.module.isHiTech || !props.module.profilesConfig?.sideProfile)
    && count < 2
    && FASADES.value.checkAddDoor(selectedSec.value, count - 1, props.module)
  );
});

const canDeleteDoor = computed(() =>
  !props.module.isRestrictedModule || (selectedSection.value?.fasades?.length ?? 0) > 1,
);

// Индекс двери — индекс в section.fasades (его ждёт FasadesManager), пустые не показываются.
const doors = computed(() => selectedSection.value?.fasades ?? []);
const hasDoors = computed(() => doors.value.some((door) => door?.length));

const segmentTitle = (doorIndex: number, segment: any) => `Сегмент ${selectedSec.value + 1}.${doorIndex + 1}.${segment.id}`;

const isActiveSegment = (doorIndex: number, segmentIndex: number) => {
  const { sec, cell, row } = selectedFasade.value;
  return sec === selectedSec.value && cell === doorIndex && row === segmentIndex;
};

const canRemoveSegment = (doorIndex: number, segmentIndex: number) =>
  FASADES.value.checkRemoveFasadeSegment(selectedSec.value, doorIndex, segmentIndex, props.module);

const loopsideOptions = (doorIndex: number, segment: any) =>
  getLoopsideList(selectedSec.value, doorIndex, props.module, segment.id).map((side) => ({ value: side.ID, label: side.NAME }));

const loopsideName = (segment: any) => props.UMconstructor.APP.LOOPSIDE?.[segment.loopsSide]?.NAME ?? "—";

const hasLiftMechanism = (segment: any) =>
  LOOPSIDE[segment.loopsSide]?.includes("top") && segment.material.COLOR !== NO_FASADE_ID;

const segmentMaterial = (segment: any) => {
  const { PALETTE, COLOR } = segment.material;
  return PALETTE ? props.UMconstructor.APP.PALETTE[PALETTE] : props.UMconstructor.APP.FASADE[COLOR];
};

const segmentHandle = (segment: any) => {
  const id = segment.material.HANDLES?.id;
  return id ? props.UMconstructor.APP.CATALOG.PRODUCTS[id] : null;
};

const isFasadeOpen = (doorIndex: number, segmentIndex: number) =>
  isOpenMaterialSelector.value && currentFasadeMaterial.value?.cell === doorIndex && currentFasadeMaterial.value?.row === segmentIndex;

const isHandleOpen = (doorIndex: number, segmentIndex: number) =>
  isOpenHandleSelector.value && currentHandle.value?.cell === doorIndex && currentHandle.value?.row === segmentIndex;

const selectSection = (sec: number) => FASADES.value.selectCell(sec, null, null);

const selectSegment = (doorIndex: number, segmentIndex: number) =>
  props.UMconstructor.selectCell("fasades", { sec: selectedSec.value, cell: doorIndex, row: segmentIndex });

const addDoor = () => FASADES.value.addDoor(selectedSec.value, props.module);
const deleteDoor = (doorIndex: number) => FASADES.value.deleteDoor(selectedSec.value, doorIndex, props.module);
const splitSegment = (doorIndex: number, segmentIndex: number) =>
  FASADES.value.splitFasade(selectedSec.value, doorIndex, segmentIndex, props.module);
const removeSegment = (doorIndex: number, segmentIndex: number) =>
  FASADES.value.removeFasadeSegment(selectedSec.value, doorIndex, segmentIndex, props.module);

const changeHeight = (doorIndex: number, segmentIndex: number, value: number) =>
  FASADES.value.updateFasadeHeight(Number(value), selectedSec.value, doorIndex, segmentIndex, props.module);

const changeLoopside = (doorIndex: number, segment: any, side: number) =>
  setLoopside(selectedSec.value, segment, side, doorIndex, props.module);

watch(selectedFasade, (selected) => closeIfOtherSelected(selected));

// Выбор с канваса — прокрутка списка к сегменту (без сдвига холста, см. UMSectionsPanel).
watch(() => `${selectedFasade.value.sec}-${selectedFasade.value.cell}-${selectedFasade.value.row}`, async () => {
  await nextTick();
  const list = listRef.value;
  const target = list?.querySelector(".um-fasades__segment--active") as HTMLElement | null;
  if (!list || !target) return;

  const shift = target.getBoundingClientRect().top - list.getBoundingClientRect().top;
  const visible = shift >= 0 && shift + target.offsetHeight <= list.clientHeight;
  if (!visible) list.scrollTo({ top: list.scrollTop + shift, behavior: "smooth" });
});

const handleOutsideClick = (event: MouseEvent) => {
  if (!isOpenMaterialSelector.value && !isOpenHandleSelector.value && !isOpenMechanizm.value) return;

  const panel = panelRef.value;
  const target = event.target;
  if (!panel || !(target instanceof Node) || panel.contains(target)) return;

  closeMenu();
};

onMounted(() => document.addEventListener("click", handleOutsideClick));
onBeforeUnmount(() => document.removeEventListener("click", handleOutsideClick));
</script>

<template>
  <div ref="listRef" class="UM um-fasades">
    <p v-if="selectedSec === null" class="UM no-select um-fasades__hint">Нет секций.</p>

    <template v-else>
      <div v-if="module.sections.length > 1" class="UM actions-items--right-items um-fasades__sections">
        <button v-for="(section, secIndex) in module.sections" :key="secIndex"
          :class="['UM no-select actions-btn actions-btn--default', { active: secIndex === selectedSec }]"
          @click="selectSection(secIndex)">
          {{ sectionTitle(secIndex) }}
        </button>
      </div>

      <p class="UM no-select um-fasades__section-title">{{ sectionTitle(selectedSec) }}</p>

      <p v-if="!hasDoors" class="UM no-select um-fasades__hint">Фасадов нет.</p>

      <template v-for="(door, doorIndex) in doors" :key="doorIndex">
        <div v-if="door?.length" class="um-fasades__door">
          <div class="um-fasades__header">
            <div>
              <p class="UM no-select um-fasades__title">Дверь №{{ doorIndex + 1 }}</p>
              <!-- <p class="UM no-select um-fasades__subtitle">
                Ширина {{ door[0]?.width }} мм · высота сегментов
                {{ FASADES.calcSumHeightDoorSegmentes(selectedSec, doorIndex, module) }} мм
              </p> -->
            </div>
            <button v-if="canDeleteDoor" class="UM actions-btn actions-icon" @click.stop="deleteDoor(doorIndex)">
              <img class="UM actions-icon--delete" src="/icons/delite.svg" alt="" />
            </button>
          </div>

          <div v-for="(segment, segmentIndex) in door" :key="segment.id ?? segmentIndex"
            :class="['UM um-fasades__segment', { 'um-fasades__segment--active': isActiveSegment(doorIndex, segmentIndex) }]"
            @click="selectSegment(doorIndex, segmentIndex)">
            <p class="UM no-select um-fasades__segment-title">{{ segmentTitle(doorIndex, segment) }}</p>

            <div class="um-fasades__fields" @click.stop>
              <div class="actions-inputs">
                <p class="actions-title">Высота</p>
                <div class="actions-input--container">
                  <MainInput :key="`${doorIndex}-${segment.id}-height-${segment.height}`" :type="'number'"
                    :inputClass="'actions-input'" :modelValue="segment.height"
                    :min="segment.minY ?? UMconstructor.CONST.MIN_FASADE_HEIGHT" :max="segment.maxY ?? selectedSection.height"
                    :step="1" :isUM="true" :disabled="!canRemoveSegment(doorIndex, segmentIndex)"
                    @update:modelValue="(value) => changeHeight(doorIndex, segmentIndex, value)" />
                </div>
              </div>
              <div class="actions-inputs">
                <p class="actions-title">Ширина</p>
                <p class="UM no-select um-fasades__value">{{ segment.width }} мм</p>
              </div>
            </div>

            <div v-if="!module.isRestrictedModule" @click.stop>
              <AccordionSelect v-if="loopsideOptions(doorIndex, segment).length > 1" label="Сторона открывания"
                :options="loopsideOptions(doorIndex, segment)" :modelValue="segment.loopsSide"
                @update:modelValue="(value) => changeLoopside(doorIndex, segment, value)" />
              <p v-else class="UM no-select um-fasades__subtitle">Сторона открывания: {{ loopsideName(segment) }}</p>
            </div>

            <p v-if="segment.error" class="UM no-select splitter-container--product-error-message">
              Фасад некорректного размера!
            </p>

            <div v-else class="um-fasades__cards">
              <div :class="['wardrobe-material-card um-fasades__card', { 'um-fasades__card--active': isFasadeOpen(doorIndex, segmentIndex) }]"
                @click.stop="openFasadeSelector(selectedSec, doorIndex, segmentIndex)">
                <MaterialThumb :item="segmentMaterial(segment)" />
                <div class="wardrobe-material-card__info">
                  <p class="wardrobe-material-card__label">Фасад</p>
                  <p class="wardrobe-material-card__name">{{ segmentMaterial(segment)?.NAME ?? "Не выбран" }}</p>
                </div>
              </div>

              <div :class="['wardrobe-material-card um-fasades__card', { 'um-fasades__card--active': isHandleOpen(doorIndex, segmentIndex) }]"
                @click.stop="openHandleSelector(selectedSec, doorIndex, segmentIndex)">
                <MaterialThumb :item="segmentHandle(segment)" />
                <div class="wardrobe-material-card__info">
                  <p class="wardrobe-material-card__label">Ручка</p>
                  <p class="wardrobe-material-card__name">{{ segmentHandle(segment)?.NAME ?? "Без ручки" }}</p>
                </div>
              </div>
            </div>

            <div class="um-fasades__actions" @click.stop>
              <button v-if="!module.isRestrictedModule" class="UM actions-btn actions-btn--default"
                @click="splitSegment(doorIndex, segmentIndex)">
                Разделить
              </button>
              <button v-if="door.length > 1 && canRemoveSegment(doorIndex, segmentIndex)"
                class="UM actions-btn actions-btn--default" @click="removeSegment(doorIndex, segmentIndex)">
                Удалить сегмент
              </button>
              <button v-if="hasLiftMechanism(segment)" class="UM actions-btn actions-btn--default"
                @click="createMechanizmList(segment)">
                Подъёмные механизмы
              </button>
            </div>
          </div>
        </div>
      </template>

      <button v-if="canAddDoor" class="UM actions-btn actions-btn--default um-fasades__add" @click="addDoor">
        Добавить дверь
      </button>
    </template>
  </div>

  <transition name="slide--right" mode="out-in">
    <div v-if="isOpenMaterialSelector || isOpenHandleSelector || isOpenMechanizm" key="um-fasades-select"
      ref="panelRef" class="no-select color--right-select">
      <ClosePopUpButton class="menu__close" @close="closeMenu()" />

      <AdvanceCorpusMaterialRedactor v-if="isOpenMaterialSelector" :is-fasade="true"
        :elementData="currentFasadeMaterial.data" :elementIndex="currentFasadeMaterial.row"
        :element-label="currentFasadeMaterial.label" :fasade-size="currentFasadeSize" @parent-callback="selectOption" />

      <Handles v-if="isOpenHandleSelector" :is2-dconstructor="true" :data="createSurfaceList(currentHandle)" :index="0"
        @parent-callback="selectHandle" :active-pos="currentHandle.data.HANDLES?.position"
        :disable-position-changer="!!module?.isSlidingDoors" />

      <Options v-if="isOpenMechanizm" :mechanizm-list="mechanismList" :um-mechanizm="true" :element="currentElement"
        :segment="currentSegment" />
    </div>
  </transition>
</template>

<style scoped lang="scss">
.um-fasades {
  padding: 0.75rem;
  overflow-y: auto;
  overflow-x: hidden;
  max-height: calc(var(--modal-large-height) - 75px);

  &__hint {
    opacity: 0.6;
  }

  &__sections {
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  &__section-title {
    font-weight: bold;
    margin-bottom: 1rem;
  }

  &__door {
    margin-bottom: 1.25rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
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

  &__segment {
    cursor: pointer;
    padding: 0.5rem;
    margin-bottom: 0.75rem;
    border-radius: 0.5rem;
    background: rgba(0, 0, 0, 0.02);
    transition: background-color 0.15s ease;

    &--active {
      background: #d1ffd6a4;
      box-shadow: 0 0 0 1px rgba(5, 5, 5, 0.4) inset;
    }
  }

  &__segment-title {
    font-weight: bold;
    opacity: 0.7;
    margin-bottom: 0.5rem;
  }

  &__fields {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.25rem;
    margin-bottom: 0.5rem;
  }

  &__value {
    margin-bottom: 0;
    font-size: 1.4rem;
  }

  &__cards {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  &__card {
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.75rem;

    &--active {
      background: $bg;
    }
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  &__add {
    width: 100%;
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
