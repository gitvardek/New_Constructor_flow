<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useProjectAPI } from '@/features/quickActions/project/composables/useProjectAPI'
import { normalizer } from '../utils/normalizeFields'
import type { NormalizedFields } from '../types/form.types'
import { fieldComponentMap } from '../config/fieldComponentMap'

const { getOrderFormData, submitOrderForm, getOrderPaySystems } = useProjectAPI()
const MAX_MULTIPLE_ITEMS = 5

const emit = defineEmits<{
  (
    e: 'service-calc-change',
    value: Array<{
      code: string
      checked: boolean
      calcType: string
      min: number
      percent: number
    }>
  ): void
}>()

interface OrderPaySystem {
  ID: string
  NAME: string
  SORT?: string
  LOGOTIP?: string
}

const fields = ref<NormalizedFields[]>([])
const formValues = ref<Record<string, any>>({})
const paySystems = ref<OrderPaySystem[]>([])
const selectedPaySystemId = ref<string>('')
const isLoaded = ref(false)
const loadError = ref<string | null>(null)
const isSubmitting = ref(false)
const submitError = ref<string | null>(null)
const submitSuccess = ref(false)

const fieldsForSubmit = computed(() =>
  fields.value.filter((field) => Boolean(fieldComponentMap[field.TYPE]))
)

// DELIVERY_COORDS должен уходить в запрос, но не должен отображаться пользователю.
const visibleFields = computed(() => fieldsForSubmit.value.filter((field) => field.CODE !== 'DELIVERY_COORDS'))

const splitFieldsIndex = computed(() => Math.ceil(visibleFields.value.length / 2))
const leftColumnFields = computed(() => visibleFields.value.slice(0, splitFieldsIndex.value))
const rightColumnFields = computed(() => visibleFields.value.slice(splitFieldsIndex.value))

const isRepeatableField = (field: NormalizedFields) =>
  Boolean(field.MULTIPLE) && field.TYPE !== 'CHECKBOX' && field.TYPE !== 'FILE'

const createDefaultFieldValue = (field: NormalizedFields) => {
  if (field.TYPE === 'FILE') return null
  return field.DEFAULT_VALUE
}

const normalizeInitialFieldValue = (field: NormalizedFields) => {
  if (!isRepeatableField(field)) return field.DEFAULT_VALUE
  return [createDefaultFieldValue(field)]
}

onMounted(async () => {
  const paySystemsResponse = await getOrderPaySystems()
  if (!paySystemsResponse.success) {
    console.error('Ошибка загрузки систем оплаты', paySystemsResponse.error)
  } else {
    const data = Array.isArray(paySystemsResponse.data) ? paySystemsResponse.data : []
    paySystems.value = data
      .map((item) => ({
        ID: String(item.ID ?? ''),
        NAME: String(item.NAME ?? ''),
        SORT: item.SORT != null ? String(item.SORT) : undefined,
        LOGOTIP: item.LOGOTIP != null ? String(item.LOGOTIP) : undefined
      }))
      .filter((item) => item.ID !== '' && item.NAME !== '')
      .sort((a, b) => Number(a.SORT ?? 0) - Number(b.SORT ?? 0))

    if (paySystems.value.length > 0) {
      selectedPaySystemId.value = paySystems.value[0].ID
    }
  }

  const response = await getOrderFormData()

  if (!response.success || !response.data) {
    loadError.value = response.error || 'Ошибка загрузки формы заказа'
    console.error('Ошибка загрузки', response.error)
    return
  }

  const normalized = normalizer(response.data)
  fields.value = normalized
  formValues.value = normalized.reduce<Record<string, any>>((acc, field) => {
    acc[field.CODE] = normalizeInitialFieldValue(field)
    return acc
  }, {})

  isLoaded.value = true
})

const appendFieldToFormData = (
  payload: FormData,
  index: number,
  fieldId: string,
  fieldCode: string,
  fieldName: string,
  value: unknown
) => {
  payload.append(`fields[${index}][id]`, fieldId)
  payload.append(`fields[${index}][code]`, fieldCode)
  payload.append(`fields[${index}][name]`, fieldName)

  if (value === null || value === undefined) return

  if (value instanceof File) {
    payload.append(`fields[${index}][value]`, value)
    return
  }

  if (Array.isArray(value)) {
    const hasFiles = value.some((item) => item instanceof File)

    if (hasFiles) {
      value.forEach((item) => {
        if (item instanceof File) {
          payload.append(`fields[${index}][value][]`, item)
        } else {
          payload.append(`fields[${index}][value][]`, String(item))
        }
      })
      return
    }

    value.forEach((item) => {
      payload.append(`fields[${index}][value][]`, String(item))
    })
    return
  }

  if (typeof value === 'boolean') {
    payload.append(`fields[${index}][value]`, value ? 'true' : 'false')
    return
  }

  payload.append(`fields[${index}][value]`, String(value))
}

const sanitizeArrayValue = (value: unknown[]) =>
  value.filter((item) => {
    if (item === null || item === undefined) return false
    if (item instanceof File) return true
    if (typeof item === 'string') return item.trim() !== ''
    return true
  })

const parseAllowedExtensionsFromDescription = (description: string): string[] => {
  const text = String(description ?? '').toLowerCase()
  const exts = new Set<string>()

  // Основной сценарий с бэка: "*.jpg, *.jpeg, *.png"
  const starExtRe = /\*\.\s*([a-z0-9]+)/gi
  let match: RegExpExecArray | null
  while ((match = starExtRe.exec(text))) {
    exts.add(`.${match[1].toLowerCase()}`)
  }
  if (exts.size > 0) return Array.from(exts)

  // Запасной сценарий: ".jpg .png jpg png"
  const tokens = text
    .split(/[,;]+|\s+/)
    .map((t) => t.trim())
    .filter(Boolean)

  for (const token of tokens) {
    const cleaned = token
      .replace(/^\*+\./, '')
      .replace(/^\*\./, '')
      .replace(/^\./, '')
      .replace(/^\*/, '')
    if (!cleaned) continue
    if (!/^[a-z0-9]+$/i.test(cleaned)) continue
    exts.add(`.${cleaned.toLowerCase()}`)
  }

  return Array.from(exts)
}

const isFileExtensionAllowed = (file: File, allowedExtensions: string[]) => {
  const parts = file.name.split('.')
  if (parts.length < 2) return false
  const ext = (parts[parts.length - 1] || '').toLowerCase()
  return allowedExtensions.includes(`.${ext}`)
}

const getSubmitValue = (field: NormalizedFields, value: unknown) => {
  if (!isRepeatableField(field)) return value
  if (!Array.isArray(value)) return []
  return sanitizeArrayValue(value)
}

const addMultipleValue = (field: NormalizedFields) => {
  const current = formValues.value[field.CODE]
  if (!Array.isArray(current)) {
    formValues.value[field.CODE] = [createDefaultFieldValue(field)]
    return
  }
  if (current.length >= MAX_MULTIPLE_ITEMS) return
  current.push(createDefaultFieldValue(field))
}

const canAddMultipleValue = (field: NormalizedFields) => {
  const current = formValues.value[field.CODE]
  if (!Array.isArray(current)) return true
  return current.length < MAX_MULTIPLE_ITEMS
}

const removeMultipleValue = (field: NormalizedFields, valueIndex: number) => {
  const current = formValues.value[field.CODE]
  if (!Array.isArray(current) || current.length <= 1) return
  current.splice(valueIndex, 1)
}

const getFieldForRender = (field: NormalizedFields, valueIndex: number): NormalizedFields => {
  const isAdditionalValue = valueIndex > 0
  if (!isAdditionalValue && field.TYPE !== 'FILE') return field

  return {
    ...field,
    REQUIED: isAdditionalValue ? false : field.REQUIED,
    // Для повторяемых file-полей каждый инпут представляет отдельное значение.
    ...(field.TYPE === 'FILE' ? { MULTIPLE: false } : {})
  }
}

const setDeliveryCoords = (coords: string | null) => {
  formValues.value['DELIVERY_COORDS'] = coords ?? ''
}

const selectedPaySystem = computed(() =>
  paySystems.value.find((item) => item.ID === selectedPaySystemId.value) || null
)

const toNumberSafe = (value: unknown): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const toBooleanSafe = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'y', 'yes', 'on'].includes(normalized)) return true
    if (['false', '0', 'n', 'no', 'off', ''].includes(normalized)) return false
  }
  if (typeof value === 'number') return value !== 0
  return Boolean(value)
}

const serviceCalcPayload = computed(() =>
  fields.value
    .filter((field) => {
      const meta = field.META as Record<string, unknown> | undefined
      return field.TYPE === 'CHECKBOX' && meta?.SERVICE === true
    })
    .map((field) => {
      const meta = field.META as Record<string, unknown> | undefined
      const calc = (meta?.CALC as Record<string, unknown> | undefined) ?? {}

      return {
        code: field.CODE,
        checked: toBooleanSafe(formValues.value[field.CODE]),
        calcType: String(calc.TYPE ?? ''),
        min: toNumberSafe(calc.MIN),
        percent: toNumberSafe(calc.PERCENT)
      }
    })
)

watch(
  serviceCalcPayload,
  (value) => {
    emit('service-calc-change', value)
  },
  { immediate: true }
)

const getPaySystemLogoUrl = (logoPath?: string) => {
  if (!logoPath) return ''
  if (/^https?:\/\//i.test(logoPath)) return logoPath
  return `https://dev.vardek.online${logoPath.startsWith('/') ? '' : '/'}${logoPath}`
}

const submitForm = async () => {
  submitError.value = null
  submitSuccess.value = false
  isSubmitting.value = true

  try {
    // Проверка обязательных полей перед отправкой.
    // Так как отправка идёт через JS, нативная HTML-валидация не срабатывает.
    const requiredFields = fieldsForSubmit.value.filter((f) => f.REQUIED === true)
    const isValueFilled = (field: NormalizedFields, value: any): boolean => {
      if (value === null || value === undefined) return false

      if (field.TYPE === 'CHECKBOX') {
        return value === true
      }

      if (field.TYPE === 'FILE') {
        if (Array.isArray(value)) return value.length > 0
        return value instanceof File
      }

      if (field.TYPE === 'PHONE') {
        if (typeof value !== 'string') return false
        // Если маска оставила незаполненные позиции
        if (value.includes('_')) return false
        // Проверка по количеству цифр
        const digits = value.replace(/\D/g, '')
        return digits.length === 11
      }

      if (Array.isArray(value)) {
        // Для repeatable полей: считаем заполненными, если в каждом элементе есть значение.
        if (value.length === 0) return false
        return value.every((item) => {
          if (item === null || item === undefined) return false
          if (typeof item === 'string') return item.trim() !== ''
          if (item instanceof File) return true
          return Boolean(item)
        })
      }

      if (typeof value === 'string') return value.trim() !== ''
      if (typeof value === 'number') return Number.isFinite(value) && !Number.isNaN(value)
      return Boolean(value)
    }

    for (const f of requiredFields) {
      const value = formValues.value[f.CODE]
      if (!isValueFilled(f, value)) {
        submitError.value = `Поле "${f.NAME}" обязательно для заполнения`
        return { success: false, error: submitError.value }
      }
    }

    const address = String(formValues.value['ADDRESS'] ?? '').trim()
    const getDeliveryCoords = () => String(formValues.value['DELIVERY_COORDS'] ?? '').trim()

    if (address !== '' && getDeliveryCoords() === '') {
      const timeoutMs = 2000
      const intervalMs = 100
      const startedAt = Date.now()

      console.log('[orderForm] wait deliveryCoords after address select', {
        address,
        deliveryCoordsInitially: getDeliveryCoords()
      })

      while (Date.now() - startedAt < timeoutMs && getDeliveryCoords() === '') {
        await new Promise((resolve) => setTimeout(resolve, intervalMs))
      }

      if (getDeliveryCoords() === '') {
        submitError.value = 'Пожалуйста, выберите адрес из автокомплита Яндекса'
        return { success: false, error: submitError.value }
      }
      console.log('[orderForm] deliveryCoords received after wait:', getDeliveryCoords())
    }

    if (paySystems.value.length > 0 && !selectedPaySystem.value) {
      submitError.value = 'Пожалуйста, выберите систему оплаты'
      return { success: false, error: submitError.value }
    }

    // Проверяем расширения для TYPE === 'FILE' по списку из field.DESCRIPTION
    const fileFields = fieldsForSubmit.value.filter((f) => f.TYPE === 'FILE')
    for (const f of fileFields) {
      const allowedExtensions = parseAllowedExtensionsFromDescription(f.DESCRIPTION)
      if (!allowedExtensions.length) continue

      const value = formValues.value[f.CODE]
      const files = Array.isArray(value) ? value : value instanceof File ? [value] : []
      const realFiles = files.filter((x): x is File => x instanceof File)

      const invalidFiles = realFiles.filter((file) => !isFileExtensionAllowed(file, allowedExtensions))
      if (invalidFiles.length) {
        submitError.value = `Поле "${f.NAME}": разрешены только форматы: ${allowedExtensions
          .map((e) => e.replace('.', ''))
          .join(', ')}`
        return { success: false, error: submitError.value }
      }
    }

    const payload = new FormData()
    fieldsForSubmit.value.forEach((field, index) => {
      appendFieldToFormData(
        payload,
        index,
        field.ID,
        field.CODE,
        field.NAME,
        getSubmitValue(field, formValues.value[field.CODE])
      )
    })

    if (selectedPaySystem.value) {
      appendFieldToFormData(
        payload,
        fieldsForSubmit.value.length,
        selectedPaySystem.value.ID,
        'PAYSYSTEM',
        'Система оплаты',
        selectedPaySystem.value.NAME
      )
    }

    const response = await submitOrderForm(payload)
    if (!response.success) {
      submitError.value = response.error || 'Не удалось отправить форму'
      return { success: false, error: submitError.value }
    }

    submitSuccess.value = true
    return { success: true }
  } finally {
    isSubmitting.value = false
  }
}

defineExpose({
  submitForm,
  isSubmitting
})
</script>

<template> 
  <section class="order-form">
    <div class="order-form__container">
      <p v-if="loadError" class="order-form__error">{{ loadError }}</p>

      <div v-else-if="!isLoaded" class="order-form__loading">Загрузка полей...</div>

      <div v-else class="order-form__fields">
        <div class="order-form__column">
          <template v-for="field in leftColumnFields" :key="`left-${field.ID}`">
            <div v-if="isRepeatableField(field)" class="order-form__multiple-field">
              <div
                v-for="(_, valueIndex) in formValues[field.CODE]"
                :key="`${field.ID}-${valueIndex}`"
                class="order-form__multiple-row"
              >
                <component
                  :is="fieldComponentMap[field.TYPE]"
                  :field="getFieldForRender(field, Number(valueIndex))"
                  v-model="formValues[field.CODE][valueIndex]"
                  @update-delivery-coords="setDeliveryCoords"
                />
                <button
                  v-if="valueIndex === 0"
                  type="button"
                  class="order-form__multiple-btn"
                  :disabled="!canAddMultipleValue(field)"
                  @click="addMultipleValue(field)"
                >
                  +
                </button>
                <button
                  v-else
                  type="button"
                  class="order-form__multiple-btn order-form__multiple-btn--remove"
                  @click="removeMultipleValue(field, Number(valueIndex))"
                >
                  -
                </button>
              </div>
            </div>

            <component
              v-else
              :is="fieldComponentMap[field.TYPE]"
              :field="field"
              v-model="formValues[field.CODE]"
              @update-delivery-coords="setDeliveryCoords"
            />
          </template>

          <div v-if="paySystems.length" class="order-form__pay-system">
            <p class="order-form__pay-system-title">Система оплаты</p>
            <label
              v-for="paySystem in paySystems"
              :key="paySystem.ID"
              class="order-form__pay-system-option"
            >
              <input
                v-model="selectedPaySystemId"
                class="order-form__pay-system-radio"
                type="radio"
                name="order-pay-system"
                :value="paySystem.ID"
              />
              <img
                v-if="paySystem.LOGOTIP"
                class="order-form__pay-system-logo"
                :src="getPaySystemLogoUrl(paySystem.LOGOTIP)"
                :alt="paySystem.NAME"
              />
              <span>{{ paySystem.NAME }}</span>
            </label>
          </div>
        </div>

        <div class="order-form__column">
          <template v-for="field in rightColumnFields" :key="`right-${field.ID}`">
            <div v-if="isRepeatableField(field)" class="order-form__multiple-field">
              <div
                v-for="(_, valueIndex) in formValues[field.CODE]"
                :key="`${field.ID}-${valueIndex}`"
                class="order-form__multiple-row"
              >
                <component
                  :is="fieldComponentMap[field.TYPE]"
                  :field="getFieldForRender(field, Number(valueIndex))"
                  v-model="formValues[field.CODE][valueIndex]"
                  @update-delivery-coords="setDeliveryCoords"
                />
                <button
                  v-if="valueIndex === 0"
                  type="button"
                  class="order-form__multiple-btn"
                  :disabled="!canAddMultipleValue(field)"
                  @click="addMultipleValue(field)"
                >
                  +
                </button>
                <button
                  v-else
                  type="button"
                  class="order-form__multiple-btn order-form__multiple-btn--remove"
                  @click="removeMultipleValue(field, Number(valueIndex))"
                >
                  -
                </button>
              </div>
            </div>

            <component
              v-else
              :is="fieldComponentMap[field.TYPE]"
              :field="field"
              v-model="formValues[field.CODE]"
              @update-delivery-coords="setDeliveryCoords"
            />
          </template>
        </div>
      </div>

      <p v-if="submitError" class="order-form__error">{{ submitError }}</p>
      <p v-if="submitSuccess" class="order-form__success">Форма успешно отправлена</p>
    </div>
  </section>
</template>

<style scoped>
.order-form {
  width: 100%;
  max-width: 100%;
  padding: 8px 0 12px;
}

.order-form__container {
  border: 1px solid #e6e6e6;
  border-radius: 10px;
  background: #ffffff;
  padding: 14px;
}

.order-form__fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: start;
}

.order-form__column {
  display: grid;
  gap: 6px;
  align-content: start;
}

.order-form__multiple-field {
  display: grid;
  gap: 6px;
}

.order-form__multiple-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 40px;
  align-items: end;
  gap: 8px;
}

.order-form__multiple-btn {
  height: 40px;
  border: 1px solid #d5d8e0;
  border-radius: 8px;
  background: #fff;
  color: #131313;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.order-form__multiple-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.order-form__multiple-btn--remove {
  color: #bf353d;
}

.order-form__loading {
  color: #5d6069;
  font-size: 14px;
}

.order-form__pay-system {
  margin-top: 14px;
  display: grid;
  gap: 8px;
}

.order-form__pay-system-title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: #272727;
}

.order-form__pay-system-option {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #272727;
  font-size: 14px;
}

.order-form__pay-system-radio {
  accent-color: #da444c;
}

.order-form__pay-system-logo {
  width: 28px;
  height: 28px;
  object-fit: contain;
  border-radius: 4px;
}

.order-form__error {
  margin: 0;
  color: #bf353d;
  font-size: 14px;
}

.order-form__success {
  margin: 10px 0 0;
  color: #1f8f49;
  font-size: 14px;
}

@media (max-width: 900px) {
  .order-form__fields {
    grid-template-columns: 1fr;
  }
}
</style>
