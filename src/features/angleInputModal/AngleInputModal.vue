<template>
  <div
    v-if="isVisible"
    class="angle-input-modal"
    :style="modalStyle"
    @click.stop
  >
    <div class="angle-input-modal__title">
      {{ isReadOnly ? 'Угол, °' : 'Введите угол, °' }}
    </div>
    <input
      v-model="angleInput"
      type="text"
      class="angle-input-modal__input"
      :disabled="isReadOnly"
      @keydown.enter.prevent="apply"
    />
    <div class="angle-input-modal__actions">
      <button v-if="!isReadOnly" class="angle-input-modal__btn angle-input-modal__btn--apply" @click="apply">
        Применить
      </button>
      <button class="angle-input-modal__btn" @click="hide">
        {{ isReadOnly ? 'Закрыть' : 'Отмена' }}
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
  readOnly?: boolean;
  onApply: (angle: number) => void;
};

const eventBus = useEventBus();

const isVisible = ref(false);
const isReadOnly = ref(false);
const angleInput = ref('');
const position = ref({ x: 0, y: 0 });
let applyCallback: ((angle: number) => void) | null = null;

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

const show = (payload: AngleInputPayload) => {
  position.value = { x: payload.x + 10, y: payload.y };
  isReadOnly.value = payload.readOnly === true;
  angleInput.value = String(payload.angle.toFixed(2).replace('.', ','));
  applyCallback = payload.onApply;
  isVisible.value = true;
};

const hide = () => {
  isVisible.value = false;
  isReadOnly.value = false;
  applyCallback = null;
};

const apply = () => {
  if (isReadOnly.value) {
    hide();
    return;
  }
  const angle = normalizeAngle(angleInput.value);
  if (angle === null || !applyCallback) return;
  applyCallback(angle);
  hide();
};

const handleClickOutside = (e: MouseEvent) => {
  if (!isVisible.value) return;
  const target = e.target as HTMLElement;
  if (!target.closest('.angle-input-modal')) hide();
};

onMounted(() => {
  eventBus.on(Events.C2D_SHOW_ANGLE_INPUT_MODAL as any, show);
  eventBus.on(Events.C2D_HIDE_ANGLE_INPUT_MODAL as any, hide);
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  eventBus.off(Events.C2D_SHOW_ANGLE_INPUT_MODAL as any, show);
  eventBus.off(Events.C2D_HIDE_ANGLE_INPUT_MODAL as any, hide);
  document.removeEventListener('click', handleClickOutside);
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

    &:disabled {
      background: #f5f5f5;
      color: #6b6b6b;
      cursor: not-allowed;
    }
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
