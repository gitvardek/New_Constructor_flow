<template>
  <div
    v-if="isVisible"
    class="angle-input-modal"
    :style="modalStyle"
    @click.stop
  >
    <div class="angle-input-modal__title">Введите угол, ° (минимум 50)</div>
    <input
      v-model="angleInput"
      type="text"
      class="angle-input-modal__input"
      @keydown.enter.prevent="apply"
    />
    <div class="angle-input-modal__title">Шаг изменения комнаты, ° (1-45)</div>
    <input
      v-model="dragStepInput"
      type="text"
      class="angle-input-modal__input"
      @keydown.enter.prevent="apply"
    />
    <div class="angle-input-modal__actions">
      <button class="angle-input-modal__btn angle-input-modal__btn--apply" @click="apply">
        Применить
      </button>
      <button class="angle-input-modal__btn" @click="hide">
        Отмена
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { Events } from '@/store/constructor2d/events';
import { useEventBus } from '@/store/constructor2d/useEventBus';

type AngleInputPayload = {
  x: number;
  y: number;
  angle: number;
  dragAngleStep?: number;
  onApply: (angle: number) => void;
  onApplyDragAngleStep?: (step: number) => void;
};

const eventBus = useEventBus();

const isVisible = ref(false);
const angleInput = ref('');
const dragStepInput = ref('');
const position = ref({ x: 0, y: 0 });
let applyCallback: ((angle: number) => void) | null = null;
let applyDragStepCallback: ((step: number) => void) | null = null;

const modalStyle = computed(() => ({
  left: `${position.value.x}px`,
  top: `${position.value.y}px`,
}));

const normalizeAngle = (value: string): number | null => {
  const parsed = Number(String(value).trim().replace(',', '.'));
  if (!Number.isFinite(parsed)) return null;
  if (parsed < 50 || parsed >= 360) return null;
  return parsed;
};

const normalizeDragStep = (value: string): number | null => {
  const parsed = Number(String(value).trim().replace(',', '.'));
  if (!Number.isFinite(parsed)) return null;
  if (parsed < 1 || parsed > 45) return null;
  return parsed;
};

const show = (payload: AngleInputPayload) => {
  position.value = { x: payload.x + 10, y: payload.y };
  angleInput.value = String(payload.angle.toFixed(2).replace('.', ','));
  dragStepInput.value = String((payload.dragAngleStep ?? 1).toFixed(2).replace('.', ','));
  applyCallback = payload.onApply;
  applyDragStepCallback = payload.onApplyDragAngleStep ?? null;
  isVisible.value = true;
};

const hide = () => {
  isVisible.value = false;
  applyCallback = null;
  applyDragStepCallback = null;
};

const apply = () => {
  const angle = normalizeAngle(angleInput.value);
  const dragStep = normalizeDragStep(dragStepInput.value);
  if (angle === null || dragStep === null || !applyCallback) return;
  applyCallback(angle);
  applyDragStepCallback?.(dragStep);
  hide();
};

onMounted(() => {
  eventBus.on(Events.C2D_SHOW_ANGLE_INPUT_MODAL as any, show);
  // Закрытие модалки только по кнопкам внутри (Применить/Отмена).
});

onUnmounted(() => {
  eventBus.off(Events.C2D_SHOW_ANGLE_INPUT_MODAL as any, show);
});
</script>

<style scoped lang="scss">
.angle-input-modal {
  position: fixed;
  z-index: 10001;
  min-width: 220px;
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  padding: 12px;

  &__title {
    font-size: 14px;
    color: #212121;
    margin-bottom: 8px;
  }

  &__input {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #d6d6d6;
    border-radius: 6px;
    padding: 8px 10px;
    font-size: 14px;
    margin-bottom: 10px;
  }

  &__actions {
    display: flex;
    gap: 8px;
  }

  &__btn {
    border: 1px solid #d6d6d6;
    background: #fff;
    border-radius: 6px;
    padding: 6px 10px;
    cursor: pointer;
    font-size: 13px;

    &--apply {
      border-color: #4285f4;
      color: #4285f4;
    }
  }
}
</style>
