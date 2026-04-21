<template>
  <div class="project-params-dialog">
    <h3 class="project-params-dialog__label">Высота стен</h3>
    <ClosePopUpButton class="project-params-dialog__close" @close="onCancel" />

    <div class="project-params-dialog__fields">
      <div class="project-params-dialog__field">
        <label class="project-params-dialog__field-label">Высота, мм</label>
        <input
          v-model="heightInput"
          type="text"
          class="project-params-dialog__input"
          :placeholder="String(DEFAULT_WALL_HEIGHT_MM * 10)"
        />
        <span v-if="heightError" class="project-params-dialog__error">{{ heightError }}</span>
      </div>
    </div>

    <div class="project-params-dialog__actions">
      <button class="btn btn--confirm" :disabled="Boolean(heightError)" @click="onApply">Изменить</button>
      <button class="btn btn--cancel" @click="onCancel">Отменить</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import ClosePopUpButton from '@/components/ui/svg/ClosePopUpButton.vue';
import { usePopupStore } from '@/store/appStore/popUpsStore';
import {
  DEFAULT_WALL_HEIGHT_MM,
  useWallHeightStore,
} from '@/store/constructor2d/store/useWallHeightStore';

const popupStore = usePopupStore();
const wallHeightStore = useWallHeightStore();
const MIN_WALL_HEIGHT_MM = 1000;
const MAX_WALL_HEIGHT_MM = 10000;

const heightInput = ref(String(wallHeightStore.wallHeightMm * 10));

watch(
  () => popupStore.popups.wallHeight,
  (open) => {
    if (open) {
      heightInput.value = String(wallHeightStore.wallHeightMm * 10);
    }
  },
);

const parseHeight = (value: string): number | null => {
  const n = Number(value?.trim().replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  return n;
};

const heightError = computed(() => {
  const parsed = parseHeight(heightInput.value);
  if (parsed === null) return 'Введите корректное число';
  if (parsed < MIN_WALL_HEIGHT_MM) return `Минимальная высота: ${MIN_WALL_HEIGHT_MM} мм`;
  if (parsed > MAX_WALL_HEIGHT_MM) return `Максимальная высота: ${MAX_WALL_HEIGHT_MM} мм`;
  return '';
});

const onCancel = () => {
  popupStore.closePopup('wallHeight');
};

const onApply = () => {
  const parsed = parseHeight(heightInput.value);
  if (parsed === null) return;
  if (parsed < MIN_WALL_HEIGHT_MM || parsed > MAX_WALL_HEIGHT_MM) return;

  wallHeightStore.setWallHeightMm(parsed / 10);
  popupStore.closePopup('wallHeight');

  const c2d = (window as unknown as { C2D?: { updateRoomStore?: () => void } }).C2D;
  c2d?.updateRoomStore?.();
};
</script>

<style scoped lang="scss">
.project-params-dialog {
  position: relative;
  background-color: $white;
  border-radius: 25px;
  padding: 16px;
  max-width: 318px;
  width: 100%;

  &__label {
    display: block;
    font-size: 16px;
    margin-bottom: 8px;
    color: $strong-grey;
    padding-right: 28px;
  }

  &__close {
    position: absolute;
    top: 16px;
    right: 16px;
  }

  &__fields {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 16px;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__field-label {
    font-size: 14px;
    color: $strong-grey;
  }

  &__input {
    width: 100%;
    padding: 10px 14px;
    border: none;
    border-radius: 10px;
    background-color: $light-stroke;
    font-size: 16px;
    outline: none;
    box-sizing: border-box;
  }

  &__error {
    font-size: 12px;
    color: #d32f2f;
  }

  &__actions {
    display: flex;
    justify-content: flex-start;
    gap: 12px;

    .btn {
      font-size: 16px;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;

      &--confirm {
        background-color: $red;
        color: white;

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }

      &--cancel {
        background-color: transparent;
        color: $strong-grey;
      }
    }
  }
}
</style>
