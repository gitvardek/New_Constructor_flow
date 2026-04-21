<script lang="ts" setup>
import { computed } from 'vue'
import type { NormalizedFields } from '../../types/form.types'

const props = defineProps<{
  field: NormalizedFields
  modelValue?: string | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const currentValue = computed(() => {
  if (props.modelValue === null || props.modelValue === undefined) {
    if (props.field.DEFAULT_VALUE === false) return ''
    return String(props.field.DEFAULT_VALUE ?? '')
  }
  if ((props.modelValue as unknown) === false) return ''
  return String(props.modelValue)
})

const phoneValue = computed({
  get: () => currentValue.value,
  set: (value: string) => emit('update:modelValue', value)
})
</script>

<template>
  <div class="order-phone-field">
    <label class="order-phone-field__label" :for="`field-${field.CODE}`">
      {{ field.NAME }}
      <sup v-if="field.REQUIED">*</sup>
    </label>

    <input
      v-mask="'+7(###)###-##-##'"
      class="order-phone-field__control"
      :id="`field-${field.CODE}`"
      :name="field.CODE"
      type="tel"
      placeholder="+7(___)___-__-__"
      :required="Boolean(field.REQUIED)"
      inputmode="tel"
      autocomplete="tel"
      v-model="phoneValue"
    />
  </div>
</template>

<style scoped>
.order-phone-field {
  display: grid;
  gap: 3px;
  margin: 0;
}

.order-phone-field__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  line-height: 1;
  font-weight: 500;
  color: #272727;
  margin: 0;
}

.order-phone-field__label sup {
  color: #da444c;
  font-weight: 700;
}

.order-phone-field__control {
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

.order-phone-field__control:focus {
  border-color: #4285f4;
  box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.15);
}
</style>
