<script setup lang="ts">
import { ref, watch, computed } from "vue";

// Описание props с поддержкой значения null для modelValue, min и max
const props = defineProps({
  modelValue: {
    type: Number,
    required: true,
  },
  min: {
    type: [Number, null],
    default: 1,
  },
  max: {
    type: [Number, null],
    default: 10,
  },
  step: {
    type: Number,
    default: 1,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

// Создаем событие для изменения значения
const emit = defineEmits(["update:modelValue"]);

// Локальная переменная для значения инпута
const inputValue = ref(props.modelValue ?? 0); // Если modelValue null, инициализируем 0

// Вычисляемое свойство для disabled состояния
const isDisabled = computed(() => {
  return (
    props.disabled ||
    props.min === null || 
    props.max === null || 
    inputValue.value === null
  );
});

// Следим за изменением inputValue и корректируем его в пределах min/max
watch(inputValue, (newValue) => {
  let value = newValue;

  // Устанавливаем значения в пределах min и max, если они заданы
  if (props.min !== null && value < props.min) value = props.min;
  if (props.max !== null && value > props.max) value = props.max;

  // Обновляем значение через emit
  emit("update:modelValue", value ?? 0); // Если значение null, передаем 0
});

// Функция увеличения значения
const increase = () => {
  if (!isDisabled.value && inputValue.value < (props.max ?? Infinity)) {
    inputValue.value += props.step;
  }
};

// Функция уменьшения значения
const decrease = () => {
  if (!isDisabled.value && inputValue.value > (props.min ?? -Infinity)) {
    inputValue.value -= props.step;
  }
};

// Следим за изменением modelValue и обновляем inputValue
watch(
  () => props.modelValue,
  (newValue) => {
    inputValue.value = newValue ?? 0; // Обрабатываем null как 0
  }
);
</script>

<template>
  <div class="input-number">
    <!-- Кнопка уменьшения с учетом computed isDisabled -->
    <button
      class="input-number__button input-number__button--decrease"
      @click="decrease"
      :disabled="isDisabled"
    >
      -
    </button>

    <!-- Поле ввода с учетом computed isDisabled -->
    <input
      class="input-number__input"
      type="number"
      v-model="inputValue"
      :min="min !== null ? min : 0"
      :max="max !== null ? max : 100"
      :step="step"
      :disabled="isDisabled"
    />

    <!-- Кнопка увеличения с учетом computed isDisabled -->
    <button
      class="input-number__button input-number__button--increase"
      @click="increase"
      :disabled="isDisabled"
    >
      +
    </button>
  </div>
</template>

<style lang="scss" scoped>
.input-number {
  display: flex;
  align-items: center;

  &__button {
    background-color: #ddd;
    border: none;
    padding: 0.5rem 0.5rem;
    cursor: pointer;
    font-size: 0.8rem;
    &--decrease {
      border-radius: 5px 0 0 5px;
    }
    &--increase {
      border-radius: 0 5px 5px 0;
    }
  }
  &__input {
    width: fit-content;
    text-align: center;
    border: 1px solid #ddd;
    padding: 0.5rem;
    font-size: 0.8rem;
  }

  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &__button[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &__input[disabled] {
    background-color: #f5f5f5;
    cursor: not-allowed;
  }
}
</style>