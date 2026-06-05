<template>
  <input
    ref="inputRef"
    :class="inputClass"
    :style="inputStyle"
    :type="type"
    :min="props.min ?? undefined"
    :max="props.max ?? undefined"
    :maxlength="maxlength ?? undefined"
    :inputmode="digitsOnly ? 'numeric' : undefined"
    :pattern="digitsOnly ? '[0-9]*' : undefined"
    :placeholder="placeholder"
    :step="step"
    :readonly="isReadonly"
    v-model="inputValue"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch, useTemplateRef } from "vue";

// ─── Props ────────────────────────────────────────────────────────────────────

interface IProps {
  modelValue: string | number;
  type?: string;
  min?: string | number | null;
  max?: string | number | null;
  step?: string | number;
  placeholder?: string;
  inputClass?: string;
  inputStyle?: Record<string, string>;
  maxlength?: string | number | null;
  disabled?: boolean;
  digitsOnly?: boolean;

  isUM?: boolean;
};

const props = withDefaults(defineProps<IProps>(), {}); // описаны инлайн ниже

// явные дефолты через withDefaults не нужны — используем деструктуризацию ниже

const emit = defineEmits<{
  (e: "update:modelValue", value: string | number): void;
}>();

// ─── Refs ─────────────────────────────────────────────────────────────────────

const inputRef = useTemplateRef<HTMLInputElement>("inputRef");
const inputValue = ref<string | number>(props.modelValue);
let resetTimer: ReturnType<typeof setTimeout> | null = null;

// ─── Computed ─────────────────────────────────────────────────────────────────

/**
 * readonly если:
 * - disabled=true
 * - числовое поле без min/max (нет смысла редактировать без границ валидации)
 */
const isReadonly = computed(() => {
  if (props.disabled) return true;
  if (props.type !== "text" && (props.min == null || props.max == null)) return true;
  return false;
});

// ─── Validation ───────────────────────────────────────────────────────────────

const isValueValid = (value: string | number): boolean => {
  if (props.type === "text") return true;
  if (value === "") return false;
  const num = Number(value);
  if (props.min != null && num < Number(props.min)) return false;
  if (props.max != null && num > Number(props.max)) return false;
  return true;
};

/** Фильтрует нецифровые символы и обрезает по maxlength */
const applyDigitsOnly = (value: string | number): string => {
  const digits = String(value ?? "").replace(/\D/g, "");
  const limit = props.maxlength != null ? Number(props.maxlength) : null;
  return limit != null ? digits.slice(0, limit) : digits;
};

// ─── Цвет инпута ─────────────────────────────────────────────────────────────

const setInputColor = (valid: boolean) => {
  if (!inputRef.value) return;
  inputRef.value.style.color = valid ? "var(--input-color, #6d6e73)" : "var(--input-error-color, #da444c)";
};

// ─── Обработка изменения значения ────────────────────────────────────────────

/**
 * isUM=true — с отложенным сбросом:
 * невалидное значение подсвечивается красным и через 1 с откатывается
 */
const handleValueWithReset = (newValue: string | number) => {
  if (newValue === props.modelValue) return;

  if (resetTimer) clearTimeout(resetTimer);

  if (props.digitsOnly) {
    const filtered = applyDigitsOnly(newValue);
    if (filtered !== String(newValue)) {
      inputValue.value = filtered;
      emit("update:modelValue", filtered);
      setInputColor(true);
      return;
    }
  }

  const nativeValid = inputRef.value?.checkValidity() ?? true;

  if (nativeValid && isValueValid(newValue)) {
    setInputColor(true);
    emit("update:modelValue", newValue);
    return;
  }

  setInputColor(false);
  resetTimer = setTimeout(() => {
    setInputColor(true);
    inputValue.value = props.modelValue;
    resetTimer = null;
  }, 1000);
};

/**
 * isUM=false — мгновенная обработка:
 * невалидное значение подсвечивается, но не откатывается
 */
const handleValueImmediate = (newValue: string | number) => {
  if (props.digitsOnly) {
    const filtered = applyDigitsOnly(newValue);
    if (filtered !== String(newValue)) {
      inputValue.value = filtered;
      emit("update:modelValue", filtered);
      setInputColor(true);
      return;
    }
  }

  const nativeValid = inputRef.value?.checkValidity() ?? true;

  if (nativeValid && isValueValid(newValue)) {
    setInputColor(true);
    emit("update:modelValue", newValue);
    return;
  }

  setInputColor(false);
};

// Watchers 

watch(inputValue, (newValue) => {
  if (props.isUM) {

    handleValueWithReset(newValue);
  } else {
  
    handleValueImmediate(newValue);
  }
});

watch(
  () => props.modelValue,
  (newValue) => {
    inputValue.value = newValue;
  }
);
</script>

<style lang="scss" scoped>
.input__search {
  width: 100% !important;
  height: 50px;
  min-height: 50px;
  font-size: 1.6rem;
  padding: 0 32px;
  box-sizing: border-box;

  &.right-menu {
    height: 39px;
    padding: 0 15px;
  }
}
</style>