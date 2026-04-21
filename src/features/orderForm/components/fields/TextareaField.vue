<script lang="ts" setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import type { NormalizedFields } from '../../types/form.types'
import { loadYandexSuggest } from '../../utils/loadYandexSuggest'

const props = defineProps<{
  field: NormalizedFields
  modelValue?: string | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'update-delivery-coords', value: string | null): void
}>()

const currentValue = computed(() => {
  if (props.modelValue === null || props.modelValue === undefined) {
    return String(props.field.DEFAULT_VALUE ?? '')
  }
  return String(props.modelValue)
})

const selectingFromSuggest = ref(false)

const ADDRESS_CODE = 'ADDRESS'

const onInput = (event: Event) => {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value)

  // Если пользователь редактирует вручную, координаты из выбранного адреса могли стать неверными.
  // При выборе из SuggestView не очищаем, чтобы не перетереть корректные координаты.
  if (props.field.CODE === ADDRESS_CODE && !selectingFromSuggest.value) {
    emit('update-delivery-coords', '')
  }
}

onMounted(async () => {
  if (props.field.CODE !== ADDRESS_CODE) return

  const suggestApiKey = import.meta.env.VITE_YANDEX_SUGGEST_API_KEY as string | undefined
  const mapsApiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY as string | undefined

  if (!suggestApiKey || !mapsApiKey) {
    console.warn('[orderForm] Yandex keys are not set in env')
    return
  }

  const ymaps = await loadYandexSuggest(mapsApiKey, suggestApiKey)

  const elementId = `field-${props.field.CODE}`
  const inputEl = document.getElementById(elementId) as any
  console.log('[orderForm][ymap] init SuggestView for element:', {
    elementId,
    elementFound: Boolean(inputEl),
    tagName: inputEl?.tagName,
    currentValue: inputEl?.value
  })
  let geocodeFn: any = null
  // Геокодирование нужно подгрузить отдельным модулем.
  // Иначе ymaps.geocode может быть undefined.
  await new Promise<void>((resolve, reject) => {
    try {
      ;(ymaps as any).modules.require(['geocode'], (geocodeModule: any) => {
        geocodeFn = geocodeModule
        resolve()
      })
    } catch (err) {
      reject(err)
    }
  })

  console.log('[orderForm][ymap] geocodeFn loaded:', Boolean(geocodeFn))
  // Вынесем панель подсказок в document.body и дадим высокий z-index,
  // чтобы она не перекрывалась/не уходила "под" другие блоки верстки.
  console.log('[orderForm][ymap] ymaps.SuggestView:', (ymaps as any)?.SuggestView, typeof (ymaps as any)?.SuggestView)

  let SuggestViewCtor: any = (ymaps as any)?.SuggestView
  if (!SuggestViewCtor || typeof SuggestViewCtor !== 'function') {
    // На некоторых загрузках модуль может быть доступен не как конструктор в момент resolve.
    // Достанем модуль через modules.require.
    await new Promise<void>((resolve, reject) => {
      try {
        ;(ymaps as any).modules.require(['SuggestView'], (moduleSuggestView: any) => {
          SuggestViewCtor = moduleSuggestView || (ymaps as any).SuggestView
          resolve()
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  if (!SuggestViewCtor || typeof SuggestViewCtor !== 'function') {
    throw new Error('ymaps.SuggestView is not a constructor after module load')
  }

  let suggestView: any
  try {
    suggestView = new SuggestViewCtor(elementId, {
      container: document.body,
      zIndex: 1000000
    })
    console.log('[orderForm][ymap] SuggestView instance created')
  } catch (err) {
    console.error('[orderForm][ymap] Failed to create SuggestView instance', err)
    throw err
  }

  suggestView.events.add('select', async (e: any) => {
    console.log('[orderForm][ymap] SuggestView select fired')
    selectingFromSuggest.value = true

    const item = e?.get?.('item')
    console.log('[orderForm][ymap] geocodeFn typeof:', typeof geocodeFn)
    // В SuggestView:
    // - `displayName` обычно то, что пользователь видит
    // - `value` обычно строка/идентификатор подсказки (зависит от провайдера)
    // Для geocode нам нужна строка адреса. Иногда лучше попробовать несколько кандидатов.
    const candidates: string[] = []
    if (typeof item?.value === 'string' && item.value.trim()) candidates.push(item.value)
    if (typeof item?.displayName === 'string' && item.displayName.trim()) candidates.push(item.displayName)

    // Доп. fallback: если item.value не строка, но содержит displayName.
    if (!candidates.length && item?.value && typeof item.value.displayName === 'string' && item.value.displayName.trim()) {
      candidates.push(item.value.displayName)
    }

    let coords: number[] | null = null

    // Часто geometry доступна сразу у выбранного элемента.
    try {
      const maybeGeom = item?.geometry
      if (maybeGeom?.getCoordinates) coords = maybeGeom.getCoordinates()
    } catch {
      coords = null
    }

    // Fallback: если geometry нет — геокодируем выбранный адрес.
    // Пробуем кандидаты по очереди, пока не получим координаты.
    if (!coords && candidates.length) {
      for (const candidate of candidates) {
        try {
          console.log('[orderForm][ymap] geocode candidate:', candidate)
          if (!geocodeFn) throw new Error('geocodeFn is not loaded')
          const res = await geocodeFn(candidate, { results: 1 })
          const first = res?.geoObjects?.get?.(0)

          const nextCoordsRaw = first?.geometry?.getCoordinates?.() ?? null
          console.log('[orderForm][ymap] geocode result:', {
            candidate,
            firstExists: Boolean(first),
            nextCoordsRaw
          })

          if (Array.isArray(nextCoordsRaw) && nextCoordsRaw.length >= 2) {
            coords = nextCoordsRaw.slice(0, 2)
            break
          }
        } catch (err) {
          // Продолжаем пробовать следующий кандидат
          coords = null
          console.warn('[orderForm][ymap] geocode failed for candidate:', candidate, err)
        }
      }
    }

    const coordsValue = coords ? coords.join(',') : ''

    // Текст в поле обновляем самым “читаемым” кандидатом.
    const selectedAddressForInput =
      (typeof item?.displayName === 'string' && item.displayName) ||
      (typeof item?.value === 'string' && item.value) ||
      candidates[0] ||
      String(item?.value ?? '')

    console.log('[orderForm][ymap] suggest selected:', {
      addressForInput: selectedAddressForInput,
      candidates,
      coords,
      coordsValue
    })

    emit('update:modelValue', selectedAddressForInput)
    emit('update-delivery-coords', coordsValue)

    await nextTick()
    selectingFromSuggest.value = false
  })
})
</script>

<template>
  <div class="order-textarea-field">
    <label class="order-textarea-field__label" :for="`field-${field.CODE}`">
      {{ field.NAME }}
      <sup v-if="field.REQUIED">*</sup>
    </label>

    <textarea
      class="order-textarea-field__control"
      :id="`field-${field.CODE}`"
      :name="field.CODE"
      :required="Boolean(field.REQUIED)"
      :minlength="field.MIN"
      :maxlength="field.MAX"
      :value="currentValue"
      rows="3"
      @input="onInput"
    />
  </div>
</template>

<style scoped>
.order-textarea-field {
  display: grid;
  gap: 3px;
  margin: 0;
}

.order-textarea-field__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 500;
  color: #272727;
  line-height: 1;
  margin: 0;
}

.order-textarea-field__label sup {
  color: #da444c;
  font-weight: 700;
}

.order-textarea-field__control {
  width: 100%;
  min-height: 84px;
  padding: 10px 12px;
  border: 1px solid #d5d8e0;
  border-radius: 8px;
  background: #fff;
  color: #131313;
  font-size: 14px;
  resize: vertical;
  outline: none;
  margin: 0;
}

.order-textarea-field__control:focus {
  border-color: #4285f4;
  box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.15);
}
</style>
