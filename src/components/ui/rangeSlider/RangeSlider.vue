<template>
  <div class="range-slider">
    <slot name="title" />
    <input
      ref="range"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="modelValue"
      @input="onInput"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from "vue";

// === Props ===
const props = withDefaults(
  defineProps<{
    modelValue: number | string; // Значение слайдера
    min?: number; // Минимальное значение
    max?: number; // Максимальное значение
    step?: number; // Шаг
  }>(),
  {
    min: 0,
    max: 1,
    step: 0.01,
  }
);


const emit = defineEmits<{
  (e: "update:modelValue", value: number): void;
}>();


const range = ref<HTMLInputElement | null>(null);

/**
 * Обновляет CSS-переменную --progress для градиента заполнения трека.
 */
function updateTrackFill() {
  if (!range.value) return;
  const val = parseFloat(range.value.value);
  const percent = ((val - props.min) / (props.max - props.min)) * 100;
  range.value.style.setProperty("--progress", `${percent}%`);
}

/**
 * Обработчик ввода значения.
 */
function onInput(event: Event) {
  const value = parseFloat((event.target as HTMLInputElement).value);
  emit("update:modelValue", value);
  updateTrackFill();
}

// === Watch & Init ===
watch(
  () => props.modelValue,
  () => {
    updateTrackFill();
  }
);

onMounted(() => {
  nextTick(updateTrackFill);
});
</script>

<style scoped lang="scss">
/* Контейнер */
.range-slider {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  padding: 8px 0;
}

/* Слайдер: базовые стили и фон */
.range-slider input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(
    to right,
    $red 0%,
    $red var(--progress, 50%),
    $stroke var(--progress, 50%),
    $light-stroke 100%
  );
  outline: none;
  transition: background 0.2s ease;
  cursor: pointer;
}

/* Chrome thumb */
.range-slider input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  height: 20px;
  width: 20px;
  border-radius: 50%;
  background-color: $red;
  border: 3px solid $stroke;

  margin-top: 0px;
  transition: background-color 0.2s;
}

/* Firefox thumb */
.range-slider input[type="range"]::-moz-range-thumb {
  height: 20px;
  width: 20px;
  border-radius: 50%;
  background-color: $red;
  border: none;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.12);
}

/* Firefox track */
.range-slider input[type="range"]::-moz-range-track {
  background: transparent;
}
</style>
