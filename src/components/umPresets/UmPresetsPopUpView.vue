<script setup lang="ts">
// Каталог пресетов (popup 'presets'). Клик по карточке закрывает попап и
// отдаёт снимок в сцену: RoomManager.insertPresetProd создаёт объект и ведёт
// его за курсором до клика — как при дублировании.

import { onMounted, ref } from 'vue'
import { usePopupStore } from '@/store/appStore/popUpsStore'
import { useEventBus } from '@/store/appliction/useEventBus'
import { useToast } from '@/features/toaster/useToast'
import { useUmPresetsStore } from '@/components/umPresets/store/useUmPresetsStore'
import UmPresetCard from '@/components/umPresets/UmPresetCard.vue'
import ClosePopUpButton from '@/components/ui/svg/ClosePopUpButton.vue'
import type { UmPreset, UmPresetsFilter } from '@/components/umPresets/types'

const popupStore = usePopupStore()
const eventBus = useEventBus()
const toaster = useToast()
const presetsStore = useUmPresetsStore()

const FILTERS: Array<{ value: UmPresetsFilter; label: string }> = [
  { value: 'all', label: 'Все' },
  { value: 'mine', label: 'Мои' },
  { value: 'vardek', label: 'Вардэк' },
]

const removingId = ref<number | null>(null)

const closePopup = () => popupStore.closePopup('presets')

const onInsert = (preset: UmPreset) => {
  const snapshot = preset.data?.snapshot
  if (!snapshot) return

  closePopup()
  eventBus.emit('A:InsertPreset', snapshot)
}

const onRemove = async (preset: UmPreset) => {
  if (removingId.value) return
  if (!window.confirm(`Удалить пресет «${preset.name}»?`)) return

  removingId.value = preset.id

  try {
    await presetsStore.remove(preset.id)
    toaster.success('Пресет удалён')
  } catch (error) {
    toaster.error(error instanceof Error ? error.message : 'Не удалось удалить пресет')
  } finally {
    removingId.value = null
  }
}

onMounted(() => {
  presetsStore.loadIfEmpty()
})
</script>

<template>
  <div class="presets-popup">
    <div class="presets-popup__top">
      <h2 class="presets-popup__title">Пресеты</h2>
      <ClosePopUpButton class="presets-popup__close" @close="closePopup" />
    </div>

    <p class="presets-popup__hint">
      Сохранённые универсальные модули и гардеробные системы. Клик по пресету — вставка в проект.
    </p>

    <div class="presets-popup__controls">
      <div class="presets-popup__filters">
        <button
          v-for="item in FILTERS"
          :key="item.value"
          class="presets-popup__filter"
          :class="{ active: presetsStore.filter === item.value }"
          type="button"
          @click="presetsStore.setFilter(item.value)"
        >
          {{ item.label }}
        </button>
      </div>

      <input
        v-model="presetsStore.search"
        class="presets-popup__search"
        type="text"
        placeholder="Поиск по названию"
      />

      <button class="presets-popup__reload" type="button" :disabled="presetsStore.isLoading" @click="presetsStore.reload()">
        Обновить
      </button>
    </div>

    <p v-if="presetsStore.error" class="presets-popup__error">{{ presetsStore.error }}</p>

    <div class="presets-popup__list">
      <UmPresetCard
        v-for="row in presetsStore.visibleRows"
        :key="row.preset.id"
        :preset="row.preset"
        :validation="row.validation"
        @insert="onInsert"
        @remove="onRemove"
      />

      <p v-if="presetsStore.isLoading" class="presets-popup__empty">Загрузка…</p>

      <p v-else-if="!presetsStore.visibleRows.length" class="presets-popup__empty">
        {{ presetsStore.items.length ? 'По фильтру ничего не найдено' : 'Пресетов пока нет' }}
      </p>
    </div>

    <div class="presets-popup__footer">
      <button
        v-if="presetsStore.hasMore"
        class="presets-popup__more"
        type="button"
        :disabled="presetsStore.isLoading"
        @click="presetsStore.loadMore()"
      >
        Показать ещё ({{ presetsStore.total - presetsStore.items.length }})
      </button>

      <span class="presets-popup__counter">
        {{ presetsStore.items.length }} из {{ presetsStore.total }}
      </span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.presets-popup {
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 70rem;
  max-width: 100%;
  max-height: 70vh;

  &__top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 15px;
  }

  &__title {
    font-size: 2.4rem;
    font-weight: 600;
  }

  &__close {
    flex-shrink: 0;
    cursor: pointer;
  }

  &__hint {
    color: $dark-grey;
    font-size: 1.3rem;
  }

  &__controls {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  &__filters {
    display: flex;
    gap: 5px;
  }

  &__filter {
    padding: 7px 15px;
    border: 1px solid $stroke;
    border-radius: 20px;
    background: $white;
    color: $strong-grey;
    font-size: 1.3rem;
    cursor: pointer;
    transition: 0.15s;

    &.active {
      border-color: $red;
      background: $red;
      color: $white;
    }
  }

  &__search {
    flex: 1;
    min-width: 180px;
    padding: 8px 15px;
    border: 1px solid $stroke;
    border-radius: 20px;
    font-size: 1.3rem;
  }

  &__reload {
    padding: 8px 15px;
    border: 1px solid $stroke;
    border-radius: 20px;
    background: $white;
    color: $strong-grey;
    font-size: 1.3rem;
    cursor: pointer;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__error {
    color: $red;
    font-size: 1.3rem;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
    padding-right: 5px;
  }

  &__empty {
    padding: 25px 0;
    color: $dark-grey;
    text-align: center;
    font-size: 1.4rem;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
  }

  &__more {
    padding: 9px 20px;
    border: 1px solid $stroke;
    border-radius: 20px;
    background: $white;
    font-size: 1.3rem;
    cursor: pointer;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__counter {
    margin-left: auto;
    color: $dark-grey;
    font-size: 1.2rem;
  }
}
</style>
