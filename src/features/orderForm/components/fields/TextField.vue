<script lang="ts" setup>
import { computed } from 'vue'
import type { NormalizedFields } from '../../types/form.types'

const props = defineProps<{
  field: NormalizedFields
  modelValue?: string | number | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const currentValue = computed(() => {
  if (props.modelValue === null || props.modelValue === undefined) {
    return String(props.field.DEFAULT_VALUE ?? '')
  }
  return String(props.modelValue)
})

const onInput = (event: Event) => {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="order-text-field">
    <label class="order-text-field__label" :for="`field-${field.CODE}`">
      {{ field.NAME }}
      <sup v-if="field.REQUIED">*</sup>
    </label>

    <input
      class="order-text-field__control"
      :id="`field-${field.CODE}`"
      :name="field.CODE"
      type="text"
      :required="Boolean(field.REQUIED)"
      :minlength="field.MIN"
      :maxlength="field.MAX"
      :value="currentValue"
      @input="onInput"
    />
  </div>
</template>

<style scoped>
.order-text-field {
  display: grid;
  gap: 3px;
  margin: 0;
}

.order-text-field__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  line-height: 1;
  font-weight: 500;
  color: #272727;
  margin: 0;
}

.order-text-field__label sup {
  color: #da444c;
  font-weight: 700;
}

.order-text-field__control {
  width: 100%;
  height: 42px;
  padding: 0 12px;
  border: 1px solid #d5d8e0;
  border-radius: 8px;
  background: #fff;
  color: #131313;
  font-size: 14px;
  outline: none;
  margin: 0;
}

.order-text-field__control:focus {
  border-color: #4285f4;
  box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.15);
}
</style>
