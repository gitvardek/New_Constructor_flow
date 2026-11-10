<script setup lang="ts">
// Три селекта фильтрации ящиков УМ (производитель / глубина / высота) для
// "Вставки" наполнения. Общий компонент: обычный УМ (FillingsInsertPanel),
// редактор v2 и тумбочка (UMFillingsInsertPanel через UMRightPanel).
//
// Фильтрует переданный список и отдаёт результат в update:filtered — родителю
// остаётся его отрисовать (тот же договор, что у SearchInput).
import { computed, reactive, watch } from "vue";
import MainSelect from "@/components/ui/selects/MainSelect.vue";
import {
  DRAWER_FILTER_ALL,
  DRAWER_FILTER_FIELDS,
  createDrawerFilterState,
  filterDrawerItems,
  getDrawerFilterOptions,
  type DrawerFilterKey,
} from "./drawerFilters.ts";

const props = defineProps<{
  items: any[];
}>();

const emit = defineEmits<{
  (e: "update:filtered", value: any[]): void;
}>();

const state = reactive(createDrawerFilterState());

// Каскад: значения каждого селекта — только те, что реально есть у товаров,
// прошедших остальные два фильтра.
const fields = computed(() => DRAWER_FILTER_FIELDS.map((field) => ({
  ...field,
  options: getDrawerFilterOptions(props.items, state, field.key),
})));

// Селекты показываем, только если каталог отдал хоть одно значение фильтра.
const hasFilters = computed(() => fields.value.some(({ options }) => options.length > 0));

const filtered = computed(() => filterDrawerItems(props.items, state));

watch(filtered, (value) => emit("update:filtered", value), { immediate: true });

// Выбор в соседних селектах, ставший невозможным, сбрасываем в "Все" (иначе
// список товаров оказался бы пустым без видимой причины). Сброс только
// расширяет выборку, поэтому рекурсии нет.
const onChange = (key: DrawerFilterKey, value: string | number) => {
  state[key] = String(value);

  DRAWER_FILTER_FIELDS.forEach((field) => {
    if (field.key === key || state[field.key] === DRAWER_FILTER_ALL) return;

    const isAvailable = getDrawerFilterOptions(props.items, state, field.key)
      .some((option) => option.value === state[field.key]);

    if (!isAvailable) state[field.key] = DRAWER_FILTER_ALL;
  });
};
</script>

<template>
  <div v-if="hasFilters" class="um-drawer-filters">
    <MainSelect v-for="field in fields" v-show="field.options.length" :key="field.key" :model-value="state[field.key]"
      :label="field.label" :options="field.options" all-label="Все"
      @update:model-value="onChange(field.key, $event)" />
  </div>
</template>

<style scoped lang="scss">
.um-drawer-filters {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem 0;
}
</style>
