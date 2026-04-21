<template>
  <input
    v-if="isChangeEnable() && !disabled"
    ref="input"
    :class="inputClass"
    :type="type"
    :min="props.min"
    :max="props.max"
    :maxlength="maxlength"
    :inputmode="digitsOnly ? 'numeric' : undefined"
    :pattern="digitsOnly ? '[0-9]*' : undefined"
    v-model="inputValue"
    :placeholder="placeholder"
    :step="step"
  />
  <input
    v-else
    ref="input"
    :class="inputClass"
    :type="type"
    :min="props.min"
    :max="props.max"
    :maxlength="maxlength"
    :inputmode="digitsOnly ? 'numeric' : undefined"
    :pattern="digitsOnly ? '[0-9]*' : undefined"
    v-model="inputValue"
    :placeholder="placeholder"
    readonly
  />
</template>

<script setup>
import { ref, watch, toRefs, useTemplateRef } from "vue";

const props = defineProps({
  modelValue: {
    type: [String, Number],
    required: true,
  },
  min: {
    type: [String, Number],
    default: null,
  },
  max: {
    type: [String, Number],
    default: null,
  },
  type: {
    type: String,
    default: "text",
  },
  placeholder: {
    type: String,
    default: "",
  },
  inputClass: {
    type: String,
    default: "",
  },
  inputStyle: {
    type: Object,
    default: () => ({}),
  },
  step: {
    type: [String, Number],
    default: 1,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  maxlength: {
    type: [String, Number],
    default: null,
  },
  digitsOnly: {
    type: Boolean,
    default: false,
  },
});

const input = useTemplateRef("input");

const isChangeEnable = () => {
  // Для текстовых полей всегда разрешаем редактирование
  if (props.type === 'text') return true;
  // Для числовых полей проверяем min/max
  return props.min !== null && props.max !== null;
};

const customValidation = (value) => {
  // Для текстовых полей разрешаем пустые строки
  if (props.type === 'text') {
    return true;
  }
  // Для числовых полей применяем строгую валидацию
  if (value === "" || value > props.max || value < props.min) return false;
  return true;
};

const emit = defineEmits(["update:modelValue"]);

const inputValue = ref(props.modelValue);

watch(inputValue, (newValue) => {
  let valueToEmit = newValue;
  if (props.digitsOnly) {
    const filtered = String(newValue ?? "").replace(/\D/g, "");
    const maxLen = props.maxlength != null ? Number(props.maxlength) : null;
    valueToEmit = maxLen != null ? filtered.slice(0, maxLen) : filtered;
    if (valueToEmit !== newValue) {
      inputValue.value = valueToEmit;
      emit("update:modelValue", valueToEmit);
      if (input.value) input.value.style.color = "#6d6e73";
      return;
    }
  }
  if (input.value.checkValidity() && customValidation(newValue)) {
    input.value.style.color = "#6d6e73";
    emit("update:modelValue", newValue);
    return;
  }
  input.value.style.color = "#da444c";
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
  font-size: 16px;
  padding: 0 32px;
  box-sizing: border-box;
  &.right-menu {
    width: 100%;
    height: 39px;
    padding: 0 15px;
  }
}
</style>