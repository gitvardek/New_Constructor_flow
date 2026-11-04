<template>
  <div class="autosave-dialog">
    <h3 class="autosave-dialog__label">Найден несохранённый проект</h3>

    <p class="autosave-dialog__text">
      Работа от {{ savedAtLabel }} осталась без сохранения на сервер.
      <template v-if="projectName">Проект: «{{ projectName }}».</template>
      Восстановить её или удалить копию и начать с чистого проекта?
    </p>

    <div class="autosave-dialog__actions">
      <button class="btn btn--confirm" :disabled="isRestoring" @click="onRestore">
        {{ isRestoring ? "Восстановление..." : "Восстановить" }}
      </button>
      <button class="btn btn--cancel" :disabled="isRestoring" @click="onDelete">
        Удалить
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { usePopupStore } from "@/store/appStore/popUpsStore";
import { useToast } from "@/features/toaster/useToast";
import { useAutosaveStorage } from "../composables/useAutosaveStorage";
import { useAutosaveRestore } from "../composables/useAutosaveRestore";

const popupStore = usePopupStore();
const toaster = useToast();
const storage = useAutosaveStorage();
const { restore } = useAutosaveRestore();

const snapshot = ref(storage.read());
const isRestoring = ref(false);

const savedAtLabel = computed(() => {
  if (!snapshot.value) {
    return "";
  }

  return new Date(snapshot.value.savedAt).toLocaleString("ru-RU");
});

const projectName = computed(() => snapshot.value?.projectName ?? "");

const close = () => {
  popupStore.closePopup("autosave");
};

const onDelete = () => {
  storage.remove();
  close();
};

const onRestore = async () => {
  if (!snapshot.value) {
    close();
    return;
  }

  isRestoring.value = true;
  const isRestored = await restore(snapshot.value);
  isRestoring.value = false;
  close();

  if (isRestored) {
    toaster.success("Проект восстановлен");
  } else {
    toaster.error("Не удалось восстановить проект");
  }
};
</script>

<style scoped lang="scss">
.autosave-dialog {
  position: relative;
  background-color: $white;
  border-radius: 25px;
  padding: 16px;
  max-width: 360px;
  width: 100%;

  &__label {
    display: block;
    font-size: 1.6rem;
    margin-bottom: 8px;
    color: $strong-grey;
  }

  &__text {
    font-size: 1.4rem;
    color: $strong-grey;
    margin-bottom: 16px;
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

      &:disabled {
        opacity: 0.6;
        cursor: default;
      }

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
