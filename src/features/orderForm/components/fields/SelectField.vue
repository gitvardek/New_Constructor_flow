<script lang="ts" setup>
import { computed } from 'vue'
import type { NormalizedFields } from '../../types/form.types'

const props = defineProps<{
  field: NormalizedFields
  modelValue?: number | string | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
}>()

const options = computed<number[]>(() => {
  if (!Array.isArray(props.field.OPTIONS)) return []
  return props.field.OPTIONS
})

const currentValue = computed<number>(() => {
  if (typeof props.modelValue === 'number') return props.modelValue
  if (typeof props.modelValue === 'string' && props.modelValue !== '') {
    const parsed = Number(props.modelValue)
    if (Number.isFinite(parsed)) return parsed
  }
  if (typeof props.field.DEFAULT_VALUE === 'number') return props.field.DEFAULT_VALUE
  if (typeof props.field.DEFAULT_VALUE === 'string' && props.field.DEFAULT_VALUE !== '') {
    const parsed = Number(props.field.DEFAULT_VALUE)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
})

const onChange = (event: Event) => {
  const value = Number((event.target as HTMLSelectElement).value)
  emit('update:modelValue', Number.isFinite(value) ? value : 0)
}
</script>

<template>
  <div class="order-select-field">
    <label class="order-select-field__label" :for="`field-${field.CODE}`">
      {{ field.NAME }}
      <sup v-if="field.REQUIED">*</sup>
    </label>

    <select
      class="order-select-field__control"
      :id="`field-${field.CODE}`"
      :name="field.CODE"
      :value="currentValue"
      :required="Boolean(field.REQUIED)"
      @change="onChange"
    >
      <option v-for="option in options" :key="option" :value="option">
        {{ option }} %
      </option>
    </select>
  </div>
</template>

<style scoped>
.order-select-field {
  display: grid;
  gap: 3px;
  margin: 0;
}

.order-select-field__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  line-height: 1;
  font-weight: 500;
  color: #272727;
  margin: 0;
}

.order-select-field__label sup {
  color: #da444c;
  font-weight: 700;
}

.order-select-field__control {
  width: 100%;
  height: 42px;
  padding: 0 40px 0 12px;
  border: 1px solid #d5d8e0;
  border-radius: 8px;
  background: #ffffff;
  color: #131313;
  font-size: 14px;
  line-height: 1;
  outline: none;
  cursor: pointer;
  margin: 0;
}

.order-select-field__control:focus {
  border-color: #4285f4;
  box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.15);
}
</style>
