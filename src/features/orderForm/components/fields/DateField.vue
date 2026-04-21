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
    return String(props.field.DEFAULT_VALUE ?? '')
  }
  return String(props.modelValue)
})

const toDateInputValue = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined

  // Бэкенд отдаёт даты как "dd.mm.yyyy"
  const ddmmyyyy = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(trimmed)
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy
    return `${yyyy}-${mm}-${dd}`
  }

  // Если уже пришёл ISO-формат, оставляем как есть
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (iso) return trimmed

  return undefined
}

const dateMin = computed(() =>
  toDateInputValue((props.field.META as Record<string, unknown> | undefined)?.FROM)
)

const dateMax = computed(() =>
  toDateInputValue((props.field.META as Record<string, unknown> | undefined)?.TO)
)

const onInput = (event: Event) => {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="order-date-field">
    <label class="order-date-field__label" :for="`field-${field.CODE}`">
      {{ field.NAME }}
      <sup v-if="field.REQUIED">*</sup>
    </label>

    <input
      class="order-date-field__control"
      :id="`field-${field.CODE}`"
      :name="field.CODE"
      type="date"
      :required="Boolean(field.REQUIED)"
      :value="currentValue"
      :min="dateMin"
      :max="dateMax"
      @input="onInput"
    />
  </div>
</template>

<style scoped>
.order-date-field {
  display: grid;
  gap: 3px;
  margin: 0;
}

.order-date-field__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  line-height: 1;
  font-weight: 500;
  color: #272727;
  margin: 0;
}

.order-date-field__label sup {
  color: #da444c;
  font-weight: 700;
}

.order-date-field__control {
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

.order-date-field__control:focus {
  border-color: #4285f4;
  box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.15);
}
</style>
