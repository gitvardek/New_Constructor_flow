<template>
  <input
      v-if="isChangeEnable()"
      ref="input"
      :class="inputClass"
      :type="type"
      :min="props.min"
      :max="props.max"
      type="number"
      v-model="inputValue"
      :placeholder="placeholder"
      :step="step"
  />
  <input
      v-else
      ref="input"
      type="number"
      :class="inputClass"
      :type="type"
      :min="props.min"
      :max="props.max"
      v-model="inputValue"
      :placeholder="placeholder"
      readonly
  />

  <button
      :class="buttonClass"
      @click="emit('update:modelValue', inputValue)"
  >
    {{ props.buttonText }}
  </button>
</template>

<script setup>
import {ref, watch, toRefs, useTemplateRef} from "vue";

const props = defineProps({
  modelValue: {
    type: [String, Number],
    required: true,
  },
  buttonText: {
    type: String,
    required: true,
  },
  min: {
    type: [String, Number],
    default: 1,
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
  buttonClass: {
    type: String,
    default: "",
  },
  step: {
    type: [String, Number],
    default: 1,
  },
});

const input = useTemplateRef("input");

const isChangeEnable = () => {
  return props.min !== null && props.max !== null;
};

const customValidation = (value) => {
  if (value === "" || value > props.max || value < props.min) return false;
  return true;
};

const emit = defineEmits(["update:modelValue"]);

const inputValue = ref(props.modelValue);

watch(inputValue, (newValue) => {
  if (input.value.checkValidity() && customValidation(newValue)) {
    input.value.style.color = "#6d6e73";
  } else
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
  font-size: 1.6rem;
  padding: 0 32px;
  box-sizing: border-box;

  &.right-menu {
    width: 100%;
    height: 39px;
    padding: 0 15px;
  }
}
</style>
