<script setup lang="ts">
// Карточка пресета в каталоге. Клик — вставка в сцену; удаление доступно только
// своим пресетам (пресеты Вардэк бек удалять не даёт).

import { computed } from 'vue'
import Tooltip from '@/components/ui/tooltip/Tooltip.vue'
import { formatUmPresetDate, formatUmPresetSize } from '@/components/umPresets/umPresetSnapshot'
import { formatUmPresetIssues } from '@/components/umPresets/umPresetValidation'
import type { UmPresetValidation } from '@/components/umPresets/umPresetValidation'
import type { UmPreset } from '@/components/umPresets/types'

const props = defineProps<{
  preset: UmPreset
  validation: UmPresetValidation
}>()

const emit = defineEmits<{
  (e: 'insert', preset: UmPreset): void
  (e: 'remove', preset: UmPreset): void
}>()

const meta = computed(() => props.preset.data?.meta ?? null)

const kindLabel = computed(() => {
  if (!meta.value) return 'Формат пресета не распознан'
  return meta.value.kind === 'wardrobe' ? 'Гардеробная система' : 'Универсальный модуль'
})

const sizeLabel = computed(() => formatUmPresetSize(meta.value?.size ?? null))
const dateLabel = computed(() => formatUmPresetDate(props.preset.createdAt))

const isBroken = computed(() => !props.preset.data)
const isDisabled = computed(() => isBroken.value || !props.validation.productAvailable)

const disabledReason = computed(() => {
  if (isBroken.value) return 'данные пресета недоступны'
  if (!props.validation.productAvailable) return 'товар недоступен'
  return ''
})

// Устаревшие материалы/наполнение вставку не блокируют: сборка подберёт им
// замену (BuildProduct.sanitizeProductMaterials) — предупреждаем заранее.
const outdatedIssues = computed(() =>
  isDisabled.value ? [] : formatUmPresetIssues(props.validation.outdated)
)

const onInsert = () => {
  if (isDisabled.value) return
  emit('insert', props.preset)
}
</script>

<template>
  <div class="preset-card" :class="{ 'preset-card--disabled': isDisabled }">
    <div class="preset-card__container">
      <button class="preset-card__body" type="button" :disabled="isDisabled" @click="onInsert">
        <span class="preset-card__thumb" :class="{ 'preset-card__thumb--empty': !preset.image }">
          <img v-if="preset.image" :src="preset.image" :alt="preset.name" loading="lazy" />
          <span v-else class="preset-card__thumb-stub">нет снимка</span>
        </span>

        <span class="preset-card__text">
          <span class="preset-card__name">
            {{ preset.name || 'Без названия' }}
            <span v-if="preset.isVardek" class="preset-card__badge">Вардэк</span>
          </span>

          <span class="preset-card__product">
            {{ meta?.productName || kindLabel }}
            <span v-if="meta?.productName" class="preset-card__kind">· {{ kindLabel }}</span>
          </span>

          <span class="preset-card__meta">
            <span v-if="sizeLabel">{{ sizeLabel }}</span>
            <span v-if="dateLabel">{{ dateLabel }}</span>
            <span v-if="disabledReason" class="preset-card__warning">{{ disabledReason }}</span>
          </span>
        </span>
      </button>

      <Tooltip v-if="outdatedIssues.length" class="preset-card__outdated" position="top" theme="dark">
        <template #trigger>
          <span class="preset-card__outdated-text">
            ⚠ Некоторые параметры пресета устарели и более недоступны
          </span>
        </template>
        <template #content>
          <ul class="preset-card__outdated-list">
            <li v-for="issue in outdatedIssues" :key="issue">{{ issue }}</li>
          </ul>
        </template>
      </Tooltip>
    </div>


    <button v-if="!preset.isVardek" class="preset-card__remove" type="button" title="Удалить пресет"
      @click.stop="emit('remove', preset)">
      <svg width="18" height="18" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M5.06087 16.5355C5.06087 17.4521 5.81087 18.2021 6.72754 18.2021H13.3942C14.3109 18.2021 15.0609 17.4521 15.0609 16.5355V6.53548H5.06087V16.5355ZM6.72754 8.20215H13.3942V16.5355H6.72754V8.20215ZM12.9775 4.03548L12.1442 3.20215H7.97754L7.14421 4.03548H4.22754V5.70215H15.8942V4.03548H12.9775Z"
          fill="currentColor" />
      </svg>
    </button>
  </div>
</template>

<style lang="scss" scoped>
.preset-card {
  display: flex;
  align-items: stretch;
  // Предупреждение об устаревших параметрах переносится на свою строку.
  flex-wrap: wrap;
  gap: 5px;
  border: 1px solid $stroke;
  border-radius: 10px;
  background: $white;
  transition: border-color 0.15s, background-color 0.15s;

  &:hover {
    border-color: $light-stroke;
  }

  &--disabled {
    opacity: 0.55;

    &:hover {
      border-color: $stroke;
    }
  }

  &__container {
    display: flex;
    flex: 1;
    flex-direction: column;
  }

  &__body {

    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 15px;
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;
    font-size: 1.4rem;

    &:disabled {
      cursor: not-allowed;
    }
  }



  // Пропорции как у снимка (4:3), чтобы миниатюра не искажалась.
  &__thumb {
    flex-shrink: 0;
    width: 88px;
    height: 66px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 8px;
    background: $bg;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__thumb-stub {
    color: $dark-grey;
    font-size: 1.1rem;
  }

  &__text {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  &__name {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: $black;
  }

  &__badge {
    padding: 1px 7px;
    border-radius: 20px;
    background: $light-grey;
    color: $strong-grey;
    font-size: 1.1rem;
    font-weight: 500;
  }

  &__product {
    color: $strong-grey;
    font-size: 1.3rem;
  }

  &__kind {
    color: $dark-grey;
  }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    color: $dark-grey;
    font-size: 1.2rem;
  }

  &__warning {
    color: $red;
  }

  &__outdated {
    width: 100%;
    padding: 0 15px 10px;
    margin-top: -4px;
  }

  &__outdated-text {
    display: inline-block;
    color: #a86a00;
    font-size: 1.2rem;
    cursor: help;
  }

  &__outdated-list {
    margin: 0;
    padding-left: 16px;
    text-align: left;
    list-style: disc;
  }

  &__remove {
    display: flex;
    align-items: flex-start;
    padding: 1rem 1rem;
    border: none;
    background: none;
    color: $dark-grey;
    cursor: pointer;
    transition: color 0.15s;

    &:hover {
      color: $red;
    }
  }
}
</style>
