<script setup lang="ts">
//@ts-nocheck

import MainInput from "@/components/ui/inputs/MainInput.vue";
import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import { computed } from "vue";
import { UM_PARAMS, WITH_TSARGA } from "@/components/UMconstructor/utils/Const.ts";

const props = defineProps({
  module: {
    type: Object,
    required: true,
  },
  UMconstructor: {
    type: UMconstructorClass,
    required: true,
  },
  // Координаты области: { sec, cell, row, extra }. Какие поля размера показывать,
  // определяет уровень — так же, как в SectionElementAdder
  target: {
    type: Object,
    required: true,
  },
  step: {
    type: Number,
    default: 1,
  },
});

const section = computed(() => props.module?.sections?.[props.target.sec] ?? null);

const cell = computed(() => {
  if (props.target.cell == null) {
    return null;
  }

  return section.value?.cells?.[props.target.cell] ?? null;
});

const row = computed(() => {
  if (props.target.row == null) {
    return null;
  }

  return cell.value?.cellsRows?.[props.target.row] ?? null;
});

const extra = computed(() => {
  if (props.target.extra == null) {
    return null;
  }

  return row.value?.extras?.[props.target.extra] ?? null;
});

const level = computed(() => {
  if (extra.value) {
    return "extra";
  }

  if (row.value) {
    return "row";
  }

  if (cell.value) {
    return "cell";
  }

  if (section.value) {
    return "section";
  }

  return null;
});

const CONST = computed(() => props.UMconstructor.CONST);

const maxSectionWidth = computed(() => {
  if (WITH_TSARGA.includes(props.module?.productID)) {
    return UM_PARAMS.MAX_SECTION_WIDTH_TSARGA;
  }

  return UM_PARAMS.MAX_SECTION_WIDTH;
});

// Ячейку нельзя ужать ниже её содержимого: наполнение прижато к низу, поэтому
// сохранять нужно его высоту вместе с нижним отступом (инвариант ячейки —
// height = filling.height + distances.top + distances.bottom). Без этого инпут
// принимал заведомо неприменимое значение: геометрия зажимала его до минимума,
// а в поле оставалось введённое число
const cellMinHeight = (cellIndex: number): number =>
  props.UMconstructor.SHELVES.getCellMinHeight(section.value.cells[cellIndex], props.module);

// Изменение компенсирует сосед сверху (prev) — см. ShelvesManager.updateCellHeight.
// Максимум по соседу снизу брался не с той ячейки: при нижнем соседе 279 нельзя
// было задать 500, хотя сверху свободно 992
const cellMaxHeight = (cellIndex: number): number => {
  const current = section.value.cells[cellIndex];
  const MIN = CONST.value.MIN_SECTION_HEIGHT;

  const neighborIndex = section.value.cells[cellIndex - 1] ? cellIndex - 1 : cellIndex + 1;
  const neighbor = section.value.cells[neighborIndex];

  if (!neighbor) {
    return section.value.height - MIN;
  }

  // Сосед не может уйти ниже собственного минимума по содержимому
  return current.height + neighbor.height - cellMinHeight(neighborIndex);
};

const minCellHeight = computed(() => cellMinHeight(props.target.cell));
const maxCellHeight = computed(() => cellMaxHeight(props.target.cell));

const updateSectionWidth = (value: number) => {
  props.UMconstructor.SECTIONS.updateSectionWidth({
    grid: props.module,
    secIndex: props.target.sec,
    value: value ?? CONST.value.MIN_SECTION_WIDTH,
  });
};

const updateCellHeight = (value: number) => {
  props.UMconstructor.SHELVES.updateCellHeight({
    grid: props.module,
    secIndex: props.target.sec,
    cellIndex: props.target.cell,
    value: value ?? minCellHeight.value,
  });
};

const updateRowWidth = (event: Event) => {
  props.UMconstructor.SHELVES.updateCellRowWidth({
    grid: props.module,
    secIndex: props.target.sec,
    cellIndex: props.target.cell,
    rowIndex: props.target.row,
    value: event?.target?.value || CONST.value.MIN_SECTION_WIDTH,
  });
};

const updateExtraHeight = (event: Event) => {
  props.UMconstructor.SHELVES.updateExtraHeight({
    grid: props.module,
    secIndex: props.target.sec,
    cellIndex: props.target.cell,
    rowIndex: props.target.row,
    extraIndex: props.target.extra,
    value: event?.target?.value || CONST.value.MIN_SECTION_HEIGHT,
  });
};
</script>

<template>
  <div class="um-size" v-if="level">

    <!-- Ячейка: ширина принадлежит секции, высота — самой ячейке -->
    <template v-if="level === 'cell'">
      <div class="actions-inputs">
        <p class="actions-title">Ширина</p>
        <div class="actions-input--container">
          <MainInput :type="'number'" :inputClass="'actions-input'" :modelValue="section.width"
            :min="CONST.MIN_SECTION_WIDTH" :max="maxSectionWidth" :disabled="module.sections.length < 2" :step="step"
            :isUM="true" @update:modelValue="updateSectionWidth" />
        </div>
      </div>

      <div class="actions-inputs">
        <p class="actions-title">Высота</p>
        <div class="actions-input--container">
          <MainInput :type="'number'" :inputClass="'actions-input'" :modelValue="cell.height" :min="minCellHeight"
            :max="maxCellHeight" :step="step" :isUM="true" @update:modelValue="updateCellHeight" />
        </div>
      </div>
    </template>

    <!-- Вертикальная ячейка: своя ширина внутри ячейки -->
    <div class="actions-inputs" v-else-if="level === 'row'">
      <p class="actions-title">Ширина</p>
      <div class="actions-input--container">
        <input type="number" class="actions-input" :step="step" :min="CONST.MIN_SECTION_WIDTH"
          :max="cell.width - CONST.MIN_SECTION_WIDTH" :value="row.width" @input="updateRowWidth" />
      </div>
    </div>

    <!-- Горизонтальная ячейка: своя высота внутри вертикальной -->
    <div class="actions-inputs" v-else-if="level === 'extra'">
      <p class="actions-title">Высота</p>
      <div class="actions-input--container">
        <input type="number" class="actions-input" :step="step" :min="CONST.MIN_SECTION_HEIGHT"
          :max="row.height - CONST.MIN_SECTION_HEIGHT" :value="extra.height" @input="updateExtraHeight" />
      </div>
    </div>

    <!-- Секция без ячеек: ширина редактируется, высота задана модулем -->
    <template v-else>
      <div class="actions-inputs">
        <p class="actions-title">Ширина</p>
        <div class="actions-input--container">
          <input type="number" class="actions-input" :step="step" :min="CONST.MIN_SECTION_WIDTH"
            :max="maxSectionWidth" :value="section.width" :disabled="module.sections.length < 2"
            @input="updateSectionWidth($event?.target?.value)" />
        </div>
      </div>

      <div class="actions-inputs">
        <p class="actions-title">Высота</p>
        <div class="actions-input--container">
          <input type="number" class="actions-input" :step="step" :min="CONST.MIN_SECTION_HEIGHT"
            :value="section.height" disabled />
        </div>
      </div>
    </template>

  </div>
</template>

<style scoped lang="scss">
// Компактный вариант полей размера для УМ. Разделение на left/right-wrapper здесь не нужно:
// полей два-три, и они спокойно ложатся в одну строку. Информативность сохранена —
// подпись и суффикс «mm» на месте, уменьшены только отступы, радиусы и кегль.
// Селекторы начинаются с .um-size, иначе общие .UM .actions-* перебивают их по весу
.um-size {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1.25rem;
  width: 100%;

  :deep(.actions-inputs) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    width: auto;
    max-width: none;
  }

  // Подпись рядом с полем, а не над ним: так блок вдвое ниже
  :deep(.actions-title) {
    width: auto;
    margin-left: 0;
    font-size: 1.1rem;
    white-space: nowrap;
  }

  :deep(.actions-input) {
    width: 76px;
    // Правый отступ оставляет место суффиксу «mm», иначе значение заезжает под него
    padding: 0.3rem 2.1rem 0.3rem 0.7rem;
    border-radius: 10px;
    font-size: 1.2rem;
  }

  :deep(.actions-input--container)::before {
    right: 8px;
    font-size: 1rem;
  }
}
</style>
