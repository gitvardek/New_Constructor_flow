<script setup lang="ts">
import { ref, computed, watch } from "vue";

const props = defineProps<{
  value: number|string; // Текущее значение ширины
  min: number; // Минимальное значение
  max: number; // Максимальное значение
  step: number; // Шаг изменения
  disabled?: boolean; // Флаг для отключения ввода
}>();

const emit = defineEmits<{
  (e: "update:value", value: number): void;
  (e: "input", value: number | null): void; 
}>();

const inputValue = ref(props.value); 
const isValid = computed(() => {
  const value = parseInt(String(inputValue.value));
  return !isNaN(value) && value >= props.min && value <= props.max;
});


watch(
  () => props.value,
  (newValue) => {
    inputValue.value = newValue;
  }
);

// Обработка ввода
const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const rawValue = target.value;

  inputValue.value = rawValue;
  const parsedValue = rawValue === "" ? null : parseInt(rawValue);
  emit("input", parsedValue);
};

// Применяем валидное значение при потере фокуса
const handleBlur = () => {
  const parsedValue = parseInt(String(inputValue.value));
  if (isNaN(parsedValue) || parsedValue < props.min) {
    inputValue.value = props.min;
    emit("update:value", props.min);
  } else if (parsedValue > props.max) {
    inputValue.value = props.max;
    emit("update:value", props.max);
  } else {
    emit("update:value", parsedValue);
  }
};
</script>

<template>
  <div
    :class="[
      'actions-input--container',
      { invalid: !isValid, disable: props.disabled },
    ]"
  >
    <input
      type="number"
      :step="props.step"
      :min="props.min"
      :max="props.max"
      class="actions-input"
      :value="inputValue"
      @input="handleInput"
      @blur="handleBlur"
      :disabled="props.disabled"
    />
  </div>
</template>

<style lang="scss" scoped>
.actions {
  &-input {
    padding: 0.5rem 1.6rem;
    width: 100%;
    max-width: 125px;
    border: none;
    border-radius: 15px;
    background-color: #ecebf1;
    color: #6d6e73;
    font-size: 1.4rem;
    font-weight: 600;

    &:focus {
      outline: none;
    }
  }

  &-input--container {
    position: relative;

    &.invalid {
      .actions-input {
        color: #da444c; 
      }
    }

    &.disable {
      pointer-events: none;
      cursor: auto;
    }

    &::before {
      content: "mm";
      display: block;
      position: absolute;
      top: 50%;
      left: 60px;
      transform: translate(0, -50%);
      pointer-events: none;
      z-index: 0;
      font-size: 1.2rem;
      font-weight: 600;
      color: #6d6e73;
    }
  }
}
</style>
