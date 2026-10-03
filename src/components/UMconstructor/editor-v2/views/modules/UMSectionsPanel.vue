<script setup lang="ts">
// @ts-nocheck

// ==== Редактор УМ v2 — "Модуль › Секции" ====
// Панель в стиле гардеробной (WardrobeSectionsView): карточки секций с размерами,
// под ними — структура выбранной секции плоским списком с составными номерами:
// ячейки (делят полки), вертикальные ячейки (делят разделители) и горизонтальные
// внутри них. Добавление полок/разделителей — SectionElementAdder по текущему
// выбору, размеры — SectionSizeInputs, как в SectionsView обычного УМ.

import "@/components/UMconstructor/styles/UM.scss";
import { computed, nextTick, ref, watch } from "vue";
import CounterInput from "@/components/ui/inputs/CounterInput.vue";
import SectionElementAdder from "@/components/UMconstructor/views/modules/SectionElementAdder.vue";
import SectionSizeInputs from "@/components/UMconstructor/views/modules/SectionSizeInputs.vue";
import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import { formatAreaTitle, formatCellPath, formatSelectionTitle, type CellPath } from "../../grid/cellPath.ts";
import { useEditorPolicy } from "../../policy/editorPolicy.ts";

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
const listRef = ref<HTMLElement | null>(null);

const selected = computed<CellPath>(() => {
  const { sec = null, cell = null, row = null, extra = null } = props.UMconstructor.UM_STORE.getSelected("module") ?? {};
  return { sec, cell, row, extra };
});

const selectedSection = computed(() => props.module.sections?.[selected.value.sec] ?? null);

const sectionPath = (sec: number): CellPath => ({ sec, cell: null, row: null, extra: null });

const sectionTitle = (secIndex: number) => formatAreaTitle("section", sectionPath(secIndex), policy.sectionLabel);

const isSamePath = (a: CellPath, b: CellPath) =>
  a.sec === b.sec && a.cell === b.cell && a.row === b.row && a.extra === b.extra;

const canAddSection = computed(() =>
  !props.module.isHiTech && (!props.module.isRestrictedModule || props.module.sections.length < 2),
);

// Структура выбранной секции в порядке сетки: ячейка -> её ряды -> уровни ряда.
const structure = computed(() => {
  const sec = selected.value.sec;
  const section = selectedSection.value;
  if (!section) return [];

  const restricted = !!props.module.isRestrictedModule;
  const items = [];

  section.cells?.forEach((cell, cellIndex) => {
    items.push({
      level: "cell",
      path: { sec, cell: cellIndex, row: null, extra: null },
      canDelete: section.cells.length > 1,
    });

    cell.cellsRows?.forEach((row, rowIndex) => {
      items.push({
        level: "row",
        path: { sec, cell: cellIndex, row: rowIndex, extra: null },
        canDelete: !restricted && cell.cellsRows.length > 1,
      });

      // Горизонтальная ячейка сливается с соседней, без соседа удалять нечего.
      row.extras?.forEach((_, extraIndex) => {
        items.push({
          level: "extra",
          path: { sec, cell: cellIndex, row: rowIndex, extra: extraIndex },
          canDelete: !restricted && row.extras.length > 1,
        });
      });
    });
  });

  return items.map((item) => ({
    ...item,
    key: formatCellPath(item.path),
    title: formatAreaTitle(item.level, item.path, policy.sectionLabel),
  }));
});

// Куда добавит SectionElementAdder — самая глубокая существующая область выбора.
const targetTitle = computed(() => formatSelectionTitle(props.module, selected.value, policy.sectionLabel));

const select = (path: CellPath) => {
  props.UMconstructor.SECTIONS.selectCell(path.sec, path.cell, path.row, path.extra);
};

const deleteArea = ({ level, path }) => {
  const { SHELVES } = props.UMconstructor;
  switch (level) {
    case "cell":
      SHELVES.deleteCell(props.module, path.sec, path.cell);
      break;
    case "row":
      SHELVES.deleteRowCell(props.module, path.sec, path.cell, path.row);
      break;
    case "extra":
      SHELVES.deleteRowExtra(props.module, path.sec, path.cell, path.row, path.extra);
      break;
  }
};

const addSections = (count: number | string) => {
  props.UMconstructor.SECTIONS.addSection({
    grid: props.module,
    secIndex: selected.value.sec ?? 0,
    count: parseInt(count),
    reset: true,
  });
};

const deleteSection = (secIndex: number) => {
  props.UMconstructor.SECTIONS.deleteSection(props.module, secIndex, true);
};

// Выбор с канваса — прокрутка к элементу внутри списка. scrollIntoView сдвинул
// бы все прокручиваемые предки, вместе с холстом (см. SectionsView).
watch(() => formatCellPath(selected.value), async () => {
  await nextTick();
  const list = listRef.value;
  const items = list?.querySelectorAll(".um-sections__item--active, .um-sections__card--active");
  const target = items?.[items.length - 1] as HTMLElement | undefined;
  if (!list || !target) return;

  const shift = target.getBoundingClientRect().top - list.getBoundingClientRect().top;
  const visible = shift >= 0 && shift + target.offsetHeight <= list.clientHeight;
  if (!visible) list.scrollTo({ top: list.scrollTop + shift, behavior: "smooth" });
});
</script>

<template>
  <div ref="listRef" class="UM um-sections">
    <div v-for="(section, secIndex) in module.sections" :key="secIndex"
      :class="['UM um-sections__card', { 'um-sections__card--active': secIndex === selected.sec }]"
      @click="select(sectionPath(secIndex))">
      <div class="um-sections__header">
        <h4 class="UM no-select um-sections__title">{{ sectionTitle(secIndex) }}</h4>
        <button v-if="module.sections.length > 1" class="UM actions-btn actions-icon"
          @click.stop="deleteSection(secIndex)">
          <img class="UM actions-icon--delete" src="/icons/delite.svg" alt="" />
        </button>
      </div>

      <div @click.stop>
        <SectionSizeInputs :module="module" :UMconstructor="UMconstructor" :target="sectionPath(secIndex)" />
      </div>
    </div>

    <div v-if="canAddSection" class="UM actions-items--right-items-input-block um-sections__add">
      <CounterInput button-text="Добавить секцию" model-value="1" max="10" min="1" type="number"
        input-class="UM actions-items--right-items-input-block-counter"
        button-class="UM actions-btn actions-btn--default actions-items--right-items-input-block-button"
        @update:model-value="addSections" />
    </div>

    <template v-if="selectedSection">
      <div class="um-sections__structure">
        <p class="UM no-select um-sections__structure-title">Полки и разделители</p>
        <p v-if="targetTitle" class="UM no-select um-sections__target">Добавить в: {{ targetTitle }}</p>
        <div class="um-sections__adder">
          <SectionElementAdder :module="module" :UMconstructor="UMconstructor" />
        </div>
      </div>

      <p v-if="!structure.length" class="UM no-select um-sections__hint">
        {{ sectionTitle(selected.sec) }} не разделена: добавьте полку или вертикальный разделитель.
      </p>

      <div v-for="item in structure" :key="item.key"
        :class="['UM um-sections__item', `um-sections__item--${item.level}`, { 'um-sections__item--active': isSamePath(item.path, selected) }]"
        @click="select(item.path)">
        <div class="um-sections__header">
          <p class="UM no-select um-sections__item-title">{{ item.title }}</p>
          <button v-if="item.canDelete" class="UM actions-btn actions-icon" @click.stop="deleteArea(item)">
            <img class="UM actions-icon--delete" src="/icons/delite.svg" alt="" />
          </button>
        </div>

        <div @click.stop>
          <SectionSizeInputs :module="module" :UMconstructor="UMconstructor" :target="item.path"
            :hide-section-width="true" />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.um-sections {
  padding: 0.75rem;
  overflow-y: auto;
  overflow-x: hidden;
  max-height: calc(var(--modal-large-height) - 75px);

  &__card {
    cursor: pointer;
    padding: 0.75rem;
    border-radius: 1rem;
    margin-bottom: 1rem;

    &--active {
      background: $bg;
    }
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }

  &__title {
    color: $black;
    margin-bottom: 0;
  }

  &__add {
    margin-bottom: 1rem;
  }

  // Кнопки добавления остаются под рукой при длинной структуре.
  &__structure {
    position: sticky;
    top: -0.75rem;
    z-index: 2;
    padding: 0.75rem 0;
    background-color: $white;
    border-top: 1px solid rgba(0, 0, 0, 0.08);
  }

  &__structure-title {
    font-weight: bold;
    margin-bottom: 0.25rem;
  }

  &__target {
    font-size: 1.2rem;
    opacity: 0.6;
    margin-bottom: 0.5rem;
  }

  &__adder {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  &__hint {
    opacity: 0.6;
  }

  &__item {
    cursor: pointer;
    padding: 0.5rem;
    margin-bottom: 0.5rem;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 0.5rem;
    transition: background-color 0.15s ease;

    &--row {
      margin-left: 1rem;
    }

    &--extra {
      margin-left: 2rem;
    }

    &--active {
      background: #d1ffd6a4;
      box-shadow: 0 0 0 1px rgba(5, 5, 5, 0.4) inset;
    }
  }

  &__item-title {
    font-weight: bold;
    opacity: 0.7;
    margin-bottom: 0;
  }
}
</style>
