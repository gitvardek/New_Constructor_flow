<script setup lang="ts">
//@ts-nocheck

import CounterInput from "@/components/ui/inputs/CounterInput.vue";
import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import { computed } from "vue";

const props = defineProps({
  module: {
    type: Object,
    required: true,
  },
  UMconstructor: {
    type: UMconstructorClass,
    required: true,
  },
  // Координаты области, в которую добавляем: { sec, cell, row, extra }. Если не передать,
  // берётся текущий выбор — тогда элемент добавляется в выделенный сектор, ячейку или субъячейку
  target: {
    type: Object,
    default: null,
  },
});

const coords = computed(() => {
  if (props.target) {
    return props.target;
  }

  return props.UMconstructor?.UM_STORE.getSelected("module") ?? {};
});

// Разрешаем индексы в объекты сетки: по ним определяется и уровень, и доступность кнопок
const section = computed(() => props.module?.sections?.[coords.value.sec] ?? null);

const cell = computed(() => {
  if (coords.value.cell == null) {
    return null;
  }

  return section.value?.cells?.[coords.value.cell] ?? null;
});

const row = computed(() => {
  if (coords.value.row == null) {
    return null;
  }

  return cell.value?.cellsRows?.[coords.value.row] ?? null;
});

const extra = computed(() => {
  if (coords.value.extra == null) {
    return null;
  }

  return row.value?.extras?.[coords.value.extra] ?? null;
});

// Уровень данных определяется самым глубоким разрешённым объектом
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

// Полка делит область по высоте, поэтому недоступна там, где область уже поделена
// вложенными контейнерами: у ячейки со столбцами и у столбца с горизонтальными ячейками
const canAddShelf = computed(() => {
  switch (level.value) {
    case "extra": {
      return true;
    }
    case "row": {
      return !row.value.extras?.length;
    }
    case "cell": {
      return !cell.value.cellsRows?.length;
    }
    case "section": {
      return !section.value.cells.length;
    }
    default: {
      return false;
    }
  }
});

// Вертикальный разделитель в горизонтальную ячейку не ставится, а у ограниченного
// модуля недоступен вовсе
const canAddDivider = computed(() => {
  if (props.module?.isRestrictedModule) {
    return false;
  }

  if (level.value === "extra") {
    return false;
  }

  return canAddShelf.value;
});

const shelfLabel = computed(() => {
  if (level.value === "row" || level.value === "extra") {
    return "Полка";
  }

  return "Добавить полку";
});

const addShelf = (count: number | string) => {
  const { sec, cell: cellIndex, row: rowIndex, extra: extraIndex } = coords.value;
  const grid = props.module;
  const SHELVES = props.UMconstructor.SHELVES;
  const amount = parseInt(count);

  switch (level.value) {
    case "extra": {
      SHELVES.addRowExtra({ grid, secIndex: sec, cellIndex, rowIndex, extraIndex, count: amount });
      break;
    }
    case "row": {
      SHELVES.addRowExtra({ grid, secIndex: sec, cellIndex, rowIndex, extraIndex: 0, count: amount });
      break;
    }
    case "cell": {
      SHELVES.addCell({ grid, secIndex: sec, cellIndex, count: amount });
      break;
    }
    case "section": {
      // У секции без ячеек addCell сам создаёт базовую ячейку из её размеров
      SHELVES.addCell({ grid, secIndex: sec, cellIndex: null, count: amount });
      break;
    }
    default: {
      break;
    }
  }
};

const addDivider = (count: number | string) => {
  const { sec, cell: cellIndex, row: rowIndex } = coords.value;
  const grid = props.module;
  const SHELVES = props.UMconstructor.SHELVES;
  const amount = parseInt(count);

  switch (level.value) {
    case "row": {
      SHELVES.addRowCell({ grid, secIndex: sec, cellIndex, rowIndex, count: amount });
      break;
    }
    case "cell": {
      SHELVES.addRowCell({ grid, secIndex: sec, cellIndex, rowIndex: 0, count: amount });
      break;
    }
    case "section": {
      // Секция без ячеек: addRowCell создаёт базовую ячейку и первый столбец сам.
      // Индексы из выделения сюда не передаём — они могли остаться от прежней сетки
      SHELVES.addRowCell({ grid, secIndex: sec, cellIndex: null, rowIndex: 0, count: amount });
      break;
    }
    default: {
      break;
    }
  }
};
</script>

<template>
  <template v-if="level">
    <div v-if="canAddShelf" class="actions-items--right-items-input-block">
      <CounterInput :button-text="shelfLabel" model-value="1" max="10" min="1"
        input-class="actions-items--right-items-input-block-counter"
        button-class="actions-btn actions-btn--default actions-items--right-items-input-block-button" type="number"
        @update:model-value="addShelf" />
    </div>

    <div v-if="canAddDivider" class="actions-items--right-items-input-block">
      <CounterInput button-text="Верт. разделитель" model-value="1" max="10" min="1"
        input-class="actions-items--right-items-input-block-counter"
        button-class="actions-btn actions-btn--default actions-items--right-items-input-block-button" type="number"
        @update:model-value="addDivider" />
    </div>
  </template>
</template>
