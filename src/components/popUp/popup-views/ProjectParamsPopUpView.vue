<template>
  <div class="project-params-dialog">
    <h3 class="project-params-dialog__label">Задайте размеры комнаты</h3>
    <ClosePopUpButton class="project-params-dialog__close" @close="onCancel" />

    <div class="project-params-dialog__fields">
      <div class="project-params-dialog__field">
        <label class="project-params-dialog__field-label">Ширина, мм</label>
        <input
          v-model="width"
          type="text"
          class="project-params-dialog__input"
          placeholder="3000"
        />
      </div>
      <div class="project-params-dialog__field">
        <label class="project-params-dialog__field-label">Высота, мм</label>
        <input
          v-model="height"
          type="text"
          class="project-params-dialog__input"
          placeholder="3000"
        />
      </div>
    </div>

    <div class="project-params-dialog__actions">
      <button class="btn btn--confirm" @click="onCreate">Создать</button>
      <button class="btn btn--cancel" @click="onCancel">Отменить</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ClosePopUpButton from '@/components/ui/svg/ClosePopUpButton.vue';
import { usePopupStore } from '@/store/appStore/popUpsStore';
import { useNewProjectAction } from '@/features/quickActions/project/composables/useNewProjectAction';

const popupStore = usePopupStore();
const { runNewProject, DEFAULT_WALL_WIDTH } = useNewProjectAction();

const width = ref('');
const height = ref('');

const parseWidth = (value: string, fallback: number): number => {
  const n = Number(value?.trim());
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const onCancel = () => {
  popupStore.closePopup('projectParams');
};

const onCreate = async () => {
  const parsedWidth = parseWidth(width.value, DEFAULT_WALL_WIDTH);
  const parsedHeight = parseWidth(height.value, DEFAULT_WALL_WIDTH);
  const widths = {
    right: parsedHeight,
    left: parsedHeight,
    bottom: parsedWidth,
    top: parsedWidth,
  };

  // Если popup открывали как шаг создания комнаты — используем переданный обработчик.
  // Иначе работаем в режиме "новый проект".
  const handler = popupStore.getProjectParamsCreateHandler();
  popupStore.closePopup('projectParams');

  if (handler) {
    await handler(widths);
    return;
  }

  await runNewProject(widths);
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
