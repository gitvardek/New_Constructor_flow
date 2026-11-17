<script setup lang="ts">
// Диалог «Сохранить пресет»: имя вводит пользователь, дефолт —
// «Пресет <дата> <время>». Нативный <dialog>.showModal(), чтобы диалог
// открывался ПОВЕРХ окна 2D-редактора (оно тоже <dialog>).
//
// Вызов: ref.open(data) — data собирает buildUmPresetData.

import { computed, ref , watch} from 'vue'
import { useToast } from '@/features/toaster/useToast'
import { useUmPresetsStore } from '@/components/umPresets/store/useUmPresetsStore'
import { defaultUmPresetName, formatUmPresetSize } from '@/components/umPresets/umPresetSnapshot'
import type { UmPresetData } from '@/components/umPresets/types'

const toaster = useToast()
const presetsStore = useUmPresetsStore()

const dialogRef = ref<HTMLDialogElement | null>(null)
const presetData = ref<UmPresetData | null>(null)
const presetImage = ref<string | null>(null)
const isImagePending = ref(false)
const name = ref('')
const isSaving = ref(false)
const maxChars = 100

// Снимок готовится асинхронно (ждём загрузки текстур): держим промис, чтобы
// отправка не ушла раньше картинки, и номер открытия, чтобы снимок от прошлого
// вызова не попал в новый диалог.
let imagePromise: Promise<string | null> | null = null
let openId = 0

const subtitle = computed(() => {
  const meta = presetData.value?.meta
  if (!meta) return ''

  return [meta.productName, formatUmPresetSize(meta.size)].filter(Boolean).join(', ')
})

/** image — готовый dataURL либо промис снимка (диалог ждать не заставляет). */
const open = (data: UmPresetData, image?: string | null | Promise<string | null>) => {
  const currentOpen = ++openId

  presetData.value = data
  name.value = defaultUmPresetName()
  imagePromise = null

  if (image && typeof (image as Promise<string | null>).then === 'function') {
    presetImage.value = null
    isImagePending.value = true

    imagePromise = (image as Promise<string | null>)
      .catch((error) => {
        console.error('Пресет: снимок не готов', error)
        return null
      })
      .then((result) => {
        // Диалог успели закрыть и открыть заново — снимок уже не его.
        if (currentOpen !== openId) return null

        presetImage.value = result ?? null
        isImagePending.value = false
        return presetImage.value
      })
  } else {
    presetImage.value = (image as string) ?? null
    isImagePending.value = false
  }

  dialogRef.value?.showModal()
}

const close = () => {
  dialogRef.value?.close()
  openId++
  presetData.value = null
  presetImage.value = null
  isImagePending.value = false
  imagePromise = null
  isSaving.value = false
}

const submit = async () => {
  const data = presetData.value
  const presetName = name.value.trim()

  if (!data || !presetName || isSaving.value) return

  isSaving.value = true

  try {
    // Успели нажать раньше, чем снимок готов — дожидаемся его, иначе пресет
    // сохранился бы без картинки.
    if (imagePromise) await imagePromise

    await presetsStore.create(presetName, data, presetImage.value)
    close()
    toaster.success('Пресет сохранён')
  } catch (error) {
    toaster.error(error instanceof Error ? error.message : 'Не удалось сохранить пресет')
  } finally {
    isSaving.value = false
  }
}

/** Валидация символов */
watch(name, (newValue) => {
  const dangerousChars = /[<>/\\'"&]/g

  if (dangerousChars.test(newValue)) {
    name.value = newValue.replace(dangerousChars, '')
  }
})

defineExpose({ open })
</script>

<template>
  <dialog ref="dialogRef" class="preset-dialog" @cancel.prevent="close">
    <div class="preset-dialog__body">
      <h3 class="preset-dialog__title">Сохранить пресет</h3>
      <p v-if="subtitle" class="preset-dialog__subtitle">{{ subtitle }}</p>

      <div class="preset-dialog__preview" :class="{ 'preset-dialog__preview--empty': !presetImage }">
        <img v-if="presetImage" :src="presetImage" alt="Снимок модуля" />
        <span v-else-if="isImagePending">Готовим снимок…</span>
        <span v-else>Снимок не получен — пресет сохранится без картинки</span>
      </div>

      <label class="preset-dialog__label">
        Название
        <!-- <input v-model="name" class="preset-dialog__input" type="text" :maxlength="maxChars"
          @keydown.enter.prevent="submit" /> -->
        <input v-model="name" class="preset-dialog__input" type="text" :maxlength="maxChars"
          @keydown.enter.prevent="submit" />
      </label>

      <div class="preset-dialog__actions">
        <button class="preset-dialog__btn preset-dialog__btn--primary" type="button"
          :disabled="isSaving || !name.trim()" @click="submit">
          {{ isSaving ? 'Сохранение…' : 'Сохранить' }}
        </button>

        <button class="preset-dialog__btn" type="button" :disabled="isSaving" @click="close">
          Отмена
        </button>
      </div>
    </div>
  </dialog>
</template>

<style lang="scss" scoped>
.preset-dialog {
  // reset.scss (HTML5-шим) задаёт dialog { display: block } и перебивает
  // браузерное скрытие закрытого диалога — возвращаем его явно.
  display: none;

  &[open] {
    display: block;
  }

  padding: 0;
  border: none;
  border-radius: 15px;
  background: $white;

  &::backdrop {
    background: $black-bg;
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 38rem;
    padding: 25px;
    font-size: 1.4rem;
  }

  &__title {
    font-size: 2rem;
    font-weight: 600;
  }

  &__subtitle {
    color: $dark-grey;
    font-size: 1.3rem;
  }

  // Пропорции совпадают с PREVIEW_PICTURE_WIDTH/HEIGHT (4:3) — снимок не искажается.
  &__preview {
    aspect-ratio: 4 / 3;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border: 1px solid $stroke;
    border-radius: 10px;
    background: $bg;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    &--empty {
      padding: 0 20px;
      color: $dark-grey;
      font-size: 1.2rem;
      text-align: center;
    }
  }

  &__label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    color: $strong-grey;
    font-size: 1.3rem;
  }

  &__input {
    padding: 9px 14px;
    border: 1px solid $stroke;
    border-radius: 10px;
    font-size: 1.4rem;
    color: $black;
  }

  &__actions {
    display: flex;
    gap: 10px;
    margin-top: 5px;
  }

  &__btn {
    flex: 1;
    padding: 10px 15px;
    border: 1px solid $stroke;
    border-radius: 20px;
    background: $white;
    font-size: 1.3rem;
    cursor: pointer;

    &--primary {
      border-color: $red;
      background: $red;
      color: $white;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}
</style>
