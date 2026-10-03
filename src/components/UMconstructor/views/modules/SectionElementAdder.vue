<script setup lang="ts">
//@ts-nocheck

import CounterInput from "@/components/ui/inputs/CounterInput.vue";
import Accordion from "@/components/ui/accordion/Accordion.vue";
import Tooltip from "@/components/ui/tooltip/Tooltip.vue";
import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import { computed, ref, watch } from "vue";

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


const canAddDivider = computed(() => {
  if (props.module?.isRestrictedModule) {
    return false;
  }

  if (level.value === "extra") {
    return false;
  }

  if (props.UMconstructor?.SHELVES.hasGlassShelfAround(section.value, coords.value.cell)) {
    return false;
  }

  return canAddShelf.value;
});

const shelfType = ref<string>("ldsp");

const targetWidth = computed(() => {
  return (extra.value ?? row.value ?? cell.value ?? section.value)?.width ?? 0;
});

const canAddGlassShelf = computed(() => {
  return !!props.UMconstructor?.SHELVES.isGlassShelfWidthAllowed(targetWidth.value);
});

watch(canAddGlassShelf, (allowed) => {
  if (!allowed && shelfType.value === "glass") {
    shelfType.value = "ldsp";
  }
});

const SHELF_TYPE_NAMES = {
  ldsp: "ЛДСП",
  glass: "Стеклянная",
};

const shelfTypeName = computed(() => SHELF_TYPE_NAMES[shelfType.value] ?? "");

const glassShelfHint = computed(() => {
  return props.UMconstructor?.SHELVES.glassShelfWidthMessage() ?? "";
});

const selectShelfType = (value: string, onToggle: () => void) => {
  if (value === "glass" && !canAddGlassShelf.value) {
    return;
  }

  shelfType.value = value;
  onToggle();
};

const shelfLabel = computed(() => {
  return "Добавить полку";

});

const addShelf = (count: number | string) => {
  const { sec, cell: cellIndex, row: rowIndex, extra: extraIndex } = coords.value;
  const grid = props.module;
  const SHELVES = props.UMconstructor.SHELVES;
  const amount = parseInt(count);
  const glass = shelfType.value === "glass";

  switch (level.value) {
    case "extra": {
      SHELVES.addRowExtra({ grid, secIndex: sec, cellIndex, rowIndex, extraIndex, count: amount, glass });
      break;
    }
    case "row": {
      SHELVES.addRowExtra({ grid, secIndex: sec, cellIndex, rowIndex, extraIndex: 0, count: amount, glass });
      break;
    }
    case "cell": {
      SHELVES.addCell({ grid, secIndex: sec, cellIndex, count: amount, glass });
      break;
    }
    case "section": {
      // У секции без ячеек addCell сам создаёт базовую ячейку из её размеров
      SHELVES.addCell({ grid, secIndex: sec, cellIndex: null, count: amount, glass });
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

    <div v-if="canAddShelf" class="um-shelf-type">
      <Accordion>
        <template #title>
          <p class="um-shelf-type--title">Тип полки: {{ shelfTypeName }}</p>
        </template>

        <template #params="{ onToggle }">
          <button type="button" class="um-shelf-type--item"
            :class="{ 'um-shelf-type--item__active': shelfType === 'ldsp' }" @click="selectShelfType('ldsp', onToggle)">
            ЛДСП
          </button>

          <!-- Подсказка объясняет только запрет, поэтому доступный пункт в неё не оборачиваем:
               пустой тултип показал бы пустую плашку -->
          <Tooltip v-if="!canAddGlassShelf" :content="glassShelfHint" position="bottom">
            <template #trigger>
              <button type="button" class="um-shelf-type--item" disabled>
                Стеклянная
              </button>
            </template>
          </Tooltip>

          <button v-else type="button" class="um-shelf-type--item"
            :class="{ 'um-shelf-type--item__active': shelfType === 'glass' }"
            @click="selectShelfType('glass', onToggle)">
            Стеклянная
          </button>
        </template>
      </Accordion>
    </div>
  </template>
</template>

<style scoped lang="scss">

.um-shelf-type {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;


  &--title {
    width: auto;
    margin-left: 0;
    font-size: 1.1rem;
    white-space: nowrap;

  }

  :deep(.accordion) {
    max-width: 200px;
    padding: 0.4rem 1rem;
    border: 1px solid $light-grey;
    gap: 0;
  }

  &--item {
    display: block;
    width: 100%;
    padding: 0.4rem 0.2rem;
    border: none;
    background: none;
    font-size: 1.2rem;
    color: $dark-grey;
    text-align: left;
    cursor: pointer;

    &:disabled {
      color: rgba($dark-grey, 0.4);
      cursor: not-allowed;
    }

    &__active {
      color: $alter-gray;
    }
  }

  :deep(.tooltip-wrapper) {
    display: block;
    width: 100%;
  }
}
</style>
