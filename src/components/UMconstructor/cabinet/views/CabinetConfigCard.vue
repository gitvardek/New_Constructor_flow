<script setup lang="ts">
// @ts-nocheck

// ==== Универсальная тумбочка (CABINET) ====
// Карточка установленной тумбочки во вкладке "Конфигурация"
// (WardrobeFillingsView.vue). card — плоский снимок из cachedShelfCards
// (см. там же, почему не живой объект).

import MainInput from "@/components/ui/inputs/MainInput.vue";

defineProps({
  index: { type: Number, required: true },
  card: { type: Object, required: true },
});

const emit = defineEmits<{
  (e: "edit"): void;
  (e: "delete"): void;
  (e: "update:positionY", value: number): void;
}>();
</script>

<template>
  <div class="UM cabinet-card">
    <div class="UM cabinet-card__header">
      <div>
        <p class="UM no-select cabinet-card__title">Тумбочка {{ index + 1 }}</p>
        <p class="UM no-select cabinet-card__subtitle">
          {{ card.size.width }} × {{ card.size.height }} × {{ card.size.depth }} мм
        </p>
      </div>
      <button class="UM actions-btn actions-icon" @click.stop="emit('delete')">
        <img class="UM actions-icon--delete" src="/icons/delite.svg" alt="" />
      </button>
    </div>

    <button class="UM no-select actions-btn actions-btn--default cabinet-card__edit" @click.stop="emit('edit')">
      Редактировать
    </button>

    <div class="actions-items--height">
      <div class="actions-inputs">
        <p class="actions-title">Положение по Y</p>
        <div class="actions-input--container">
          <MainInput :type="'number'" :inputClass="'actions-input'" :modelValue="card.positionY" :min="card.min"
            :max="card.max" :step="1" :isUM="true"
            @update:modelValue="(value) => emit('update:positionY', Number(value))" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.cabinet-card {
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    font-size: 1.4rem;
  }

  &__title {
    font-weight: bold;
    opacity: 0.7;
    margin-bottom: 0;
  }

  &__subtitle {
    font-size: 1.4rem;
    opacity: 0.5;
    margin-bottom: 0;
  }

  &__edit {
    width: 100%;
    margin-bottom: 0.75rem;
  }
}
</style>
