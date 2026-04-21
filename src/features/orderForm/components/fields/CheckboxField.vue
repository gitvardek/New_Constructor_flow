<script lang="ts" setup>
import { computed } from 'vue'
import type { NormalizedFields } from '../../types/form.types'

const props = defineProps<{
  field: NormalizedFields
  modelValue?: boolean | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const checked = computed(() => {
  if (typeof props.modelValue === 'boolean') return props.modelValue
  return Boolean(props.field.DEFAULT_VALUE)
})

const onChange = (event: Event) => {
  emit('update:modelValue', (event.target as HTMLInputElement).checked)
}
</script>

<template>
  <label
    class="order-checkbox-field"
    :class="{ 'order-checkbox-field--installment': field.CODE === 'INSTALLMENT' }"
  >
    <input
      class="order-checkbox-field__control"
      type="checkbox"
      :name="field.CODE"
      :checked="checked"
      @change="onChange"
    />
    <span class="order-checkbox-field__text">
      {{ field.NAME }}
      <sup v-if="field.REQUIED">*</sup>
    </span>
  </label>
</template>

<style scoped>
.order-checkbox-field {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  margin: 3px 0;
}

.order-checkbox-field--installment {
  width: 100%;
  padding: 0px 0;
  border-top: 1px solid #d5d8e0;
  border-bottom: 1px solid #d5d8e0;
}

.order-checkbox-field__control {
  width: 16px;
  height: 16px;
  accent-color: #da444c;
  cursor: pointer;
}

.order-checkbox-field__text {
  font-size: 14px;
  color: #272727;
  line-height: 1;
}

.order-checkbox-field__text sup {
  color: #da444c;
  font-weight: 700;
}
</style>
