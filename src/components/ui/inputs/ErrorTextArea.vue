<template>
  <div class="error-textarea">
    <label class="error-textarea__label" :for="name">{{ label }}</label>

    <textarea
      v-model="fieldValue"
      :id="name"
      class="error-textarea__input"
      :placeholder="placeholder"
    ></textarea>

    <p class="error-textarea__error">{{ errorMessage }}</p>
  </div>
</template>

<script setup lang="ts">
import { useField } from "vee-validate";

interface Props {
  name: string;
  label?: string;
  placeholder?: string;
}

const props = defineProps<Props>();

const { value: fieldValue, errorMessage } = useField<string>(props.name);
</script>

<style scoped lang="scss">
.error-textarea {
  width: 100%;

  &__label {
    font-size: 1.8rem;
    color: $dark-grey;
    margin-left: 8px;
  }

  &__input {
    width: 100%;
    height: 249px;
    resize: none;
    background: $stroke;
    border-radius: 15px;
    border: none;
    margin-bottom: 10px;
    text-indent: 0.5em;
  }

  &__error {
    font-size: 1.4rem;
    color: #dc3545;
    margin-bottom: 8px;
    min-height: 20px;
  }
}
</style> 