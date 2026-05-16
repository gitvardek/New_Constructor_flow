<template>
  <div class="project-params-dialog">
    <h3 class="project-params-dialog__label">Длина стены</h3>
    <ClosePopUpButton class="project-params-dialog__close" @close="onCancel" />

    <div class="project-params-dialog__fields">
      <div class="project-params-dialog__field">
        <label class="project-params-dialog__field-label">При выборе значения длины, которая создаст угол, равный 50 гр. или меньше - изменение недоступно</label>
        <label class="project-params-dialog__field-label">Длина, мм</label>
        <input
          v-model="lengthInput"
          type="text"
          class="project-params-dialog__input"
          :placeholder="lengthPlaceholder"
          :disabled="isClosingWall"
        />
      </div>
    </div>

    <div class="project-params-dialog__actions">
      <button class="btn btn--confirm" :disabled="isClosingWall" @click="onApply">Изменить</button>
      <button class="btn btn--cancel" @click="onCancel">Отменить</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import ClosePopUpButton from '@/components/ui/svg/ClosePopUpButton.vue';
import { usePopupStore } from '@/store/appStore/popUpsStore';
import { useWallLengthEditorStore } from '@/store/constructor2d/store/useWallLengthEditorStore';

const popupStore = usePopupStore();
const wallLengthStore = useWallLengthEditorStore();

const lengthInput = ref('');

type PlannerAccess = {
  getWallProperty?: <T extends keyof import('@/Constructor2D/Layers/Planner/interfaces').ObjectWall>(
    id: string | number, propName: T
  ) => import('@/Constructor2D/Layers/Planner/interfaces').ObjectWall[T] | null;
};

const getPlanner = (): PlannerAccess | undefined =>
  (globalThis as any).C2D?.layers?.planner;

const isClosingWall = computed((): boolean => {
  const id = wallLengthStore.wallId;
  if (id == null) return false;
  return getPlanner()?.getWallProperty?.(id, 'isClosing') === true;
});

const getCurrentWallLengthMm = (): number | null => {
  const id = wallLengthStore.wallId;
  if (id == null) return null;
  const widthPlan = getPlanner()?.getWallProperty?.(id, 'width');
  if (typeof widthPlan !== 'number' || !Number.isFinite(widthPlan)) return null;
  return Math.round(widthPlan * 10);
};

const lengthPlaceholder = computed(() => {
  const current = getCurrentWallLengthMm();
  return current == null ? '' : String(current);
});

watch(
  () => popupStore.popups.wallLength,
  (open) => {
    if (open) {
      const current = getCurrentWallLengthMm();
      lengthInput.value = current == null ? '' : String(current);
    } else {
      wallLengthStore.clear();
    }
  },
);

const parseLength = (value: string): number | null => {
  const n = Number(String(value ?? '').trim().replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
};

const onCancel = () => {
  popupStore.closePopup('wallLength');
};

const onApply = () => {
  if (isClosingWall.value) return;
  const id = wallLengthStore.wallId;
  if (id == null) return;
  const parsed = parseLength(lengthInput.value);
  if (parsed == null) return;

  const c2d = (globalThis as any).C2D;
  const ok = c2d?.layers?.planner?.applyWallLengthMm?.(id, parsed);
  if (!ok) return;
  c2d?.updateRoomStore?.();
  popupStore.closePopup('wallLength');
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
    font-size: 1.6rem;
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
    font-size: 1.4rem;
    color: $strong-grey;
  }

  &__input {
    width: 100%;
    padding: 10px 14px;
    border: none;
    border-radius: 10px;
    background-color: $light-stroke;
    font-size: 1.6rem;
    outline: none;
    box-sizing: border-box;
  }

  &__actions {
    display: flex;
    justify-content: flex-start;
    gap: 12px;

    .btn {
      font-size: 1.6rem;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;

      &--confirm {
        background-color: $red;
        color: white;
      }

      &--cancel {
        background-color: transparent;
        color: $strong-grey;
      }
    }
  }
}
</style>
