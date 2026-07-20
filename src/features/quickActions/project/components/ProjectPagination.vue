<template>
  <div v-if="totalPages >= 1" class="project-pagination">
    <button
      type="button"
      class="project-pagination__arrow"
      :disabled="currentPage <= 1"
      aria-label="Предыдущая страница"
      @click="goToPage(currentPage - 1)"
    >
      ‹
    </button>

    <div class="project-pagination__numbers">
      <template v-for="(page, index) in visiblePages" :key="page === 'ellipsis' ? `e-${index}` : page">
        <button
          v-if="page === 'ellipsis'"
          type="button"
          class="project-pagination__ellipsis"
          disabled
          aria-hidden="true"
        >
          …
        </button>
        <button
          v-else
          type="button"
          :class="['project-pagination__page', { 'project-pagination__page_active': currentPage === page }]"
          :aria-current="currentPage === page ? 'page' : undefined"
          @click="goToPage(page)"
        >
          {{ page }}
        </button>
      </template>
    </div>

    <button
      type="button"
      class="project-pagination__arrow"
      :disabled="currentPage >= totalPages"
      aria-label="Следующая страница"
      @click="goToPage(currentPage + 1)"
    >
      ›
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    totalItems: number;
    pageSize?: number;
    currentPage: number;
    maxVisiblePages?: number;
  }>(),
  {
    pageSize: 12,
    maxVisiblePages: 5,
  }
);

const emit = defineEmits<{
  "update:currentPage": [page: number];
}>();

const totalPages = computed(() =>
  Math.max(1, Math.ceil(props.totalItems / props.pageSize))
);

const visiblePages = computed(() => {
  const total = totalPages.value;
  if (total <= 1) return [];
  const current = props.currentPage;
  const max = props.maxVisiblePages ?? 5;
  const pages: (number | "ellipsis")[] = [];

  if (total <= max) {
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }

  const half = Math.floor(max / 2);
  let start = Math.max(1, current - half);
  let end = Math.min(total, start + max - 1);
  if (end - start + 1 < max) {
    start = Math.max(1, end - max + 1);
  }

  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push("ellipsis");
  }
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  if (end < total) {
    if (end < total - 1) pages.push("ellipsis");
    pages.push(total);
  }
  return pages;
});

function goToPage(page: number) {
  const p = Math.max(1, Math.min(totalPages.value, page));
  if (p === props.currentPage) return;
  emit("update:currentPage", p);
}
</script>

<style lang="scss" scoped>
.project-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 0 0;
  flex-shrink: 0;

  &__arrow {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid $stroke;
    border-radius: 8px;
    background: #fff;
    cursor: pointer;
    font-size: 2rem;
    line-height: 1;
    color: #333;
    transition: background 0.2s, border-color 0.2s;

    &:hover:not(:disabled) {
      background: #f5f5f5;
      border-color: #ccc;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__numbers {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  &__page {
    min-width: 36px;
    height: 36px;
    padding: 0 8px;
    border: 1px solid $stroke;
    border-radius: 8px;
    background: #fff;
    cursor: pointer;
    font-size: 1.4rem;
    transition: background 0.2s, border-color 0.2s, color 0.2s;

    &:hover {
      background: #f5f5f5;
      border-color: #ccc;
    }

    &_active {
      background: #da444c;
      color: #fff;
      border-color: #da444c;

      &:hover {
        background: #c73d44;
        border-color: #c73d44;
      }
    }
  }

  &__ellipsis {
    min-width: 28px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    cursor: default;
    font-size: 1.4rem;
    color: #999;
  }
}
</style>
