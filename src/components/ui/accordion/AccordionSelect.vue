<script setup lang="ts">
// Тонкая обёртка над Accordion.vue под сценарий "выпадающий список": строка
// с текущим значением (Accordion.summary) раскрывает список опций, клик по
// опции выбирает её и закрывает панель. Сам Accordion.vue не менялся —
// специально задуман под UMconstructor/WardrobeFillingsView.vue (Тип/Вид/
// Материал полки), но не привязан к нему ничем, кроме формы options.

import { ref, computed } from "vue";
import Accordion from "@/components/ui/accordion/Accordion.vue";

interface AccordionSelectOption {
  value: string | number;
  label: string;
}

const props = defineProps<{
  label: string;
  options: AccordionSelectOption[];
  modelValue: string | number | undefined;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string | number): void;
}>();

const isOpen = ref(false);

const selectedLabel = computed(() => {
  const found = props.options.find((opt) => opt.value === props.modelValue);
  return found?.label ?? "—";
});

const selectOption = (value: string | number) => {
  if (value !== props.modelValue) emit("update:modelValue", value);
  isOpen.value = false;
};
</script>

<template>
  <Accordion class="accordion-select" :open="isOpen" @toggle="(value) => (isOpen = value)">
    <template #title>
      <div class="accordion-select__title">
        <span class="accordion-select__label">{{ label }}</span>
        <span class="accordion-select__value">{{ selectedLabel }}</span>
      </div>
    </template>

    <ul class="accordion-select__options">
      <li v-for="opt in options" :key="opt.value" class="accordion-select__option"
        :class="{ 'accordion-select__option--active': opt.value === modelValue }" @click="selectOption(opt.value)">
        {{ opt.label }}
      </li>
    </ul>
  </Accordion>
</template>

<style scoped lang="scss">
.accordion-select {
  margin-bottom: 0.5rem;
  font-size: 1.4rem;

  &__title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
  }

  &__label {
    font-weight: normal;
    opacity: 0.7;
  }

  &__value {
    font-weight: bold;
    margin-right: 1rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__options {
    list-style: none;
    margin: 0;
    padding: 0.25rem 0;
  }

  &__option {
    padding: 0.4rem 0.75rem;
    cursor: pointer;
    font-weight: normal;

    &:hover {
      background: rgba(0, 0, 0, 0.05);
    }

    &--active {
      font-weight: bold;
    }
  }
}
</style>
