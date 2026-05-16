<script lang="ts" setup>
// @ts-nocheck

import { onBeforeUnmount, onMounted, ref, computed } from 'vue'
import ClosePopUpButton from "@/components/ui/svg/ClosePopUpButton.vue";
import { usePopupStore } from "@/store/appStore/popUpsStore.ts";
import { useFilePopUpStorage } from "@/store/appStore/FilePopUpStorage.ts";

const popupStore = usePopupStore();
const fileStore = useFilePopUpStorage();

const file = ref<File | null>(null);
const previewUrl = ref<string | null>(null);
const textContent = ref<string | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);

const fileName = computed(() => file.value?.name || "Файл");

const isImage = computed(() => {
  if (!file.value) return false;
  const type = file.value.type || "";
  return type.startsWith("image/");
});

const isText = computed(() => {
  if (!file.value) return false;
  const type = file.value.type || "";
  const name = file.value.name?.toLowerCase() || "";
  return (
      type.startsWith("text/") ||
      /\.(txt|log|json|md|csv)$/i.test(name)
  );
});

const hasContent = computed(() => !!file.value && (isImage.value || isText.value));

const revokePreviewUrl = () => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = null;
  }
};

const loadFile = () => {
  error.value = null;
  textContent.value = null;
  revokePreviewUrl();

  const stored = fileStore.getFile();

  if (!stored || !(stored instanceof File)) {
    file.value = null;
    error.value = "Файл не найден или недоступен";
    return;
  }

  file.value = stored;

  // Изображения
  if (isImage.value) {
    previewUrl.value = URL.createObjectURL(stored);
    return;
  }

  // Текстовые файлы
  if (isText.value) {
    isLoading.value = true;
    const reader = new FileReader();
    reader.onload = () => {
      textContent.value = reader.result as string;
      isLoading.value = false;
    };
    reader.onerror = () => {
      error.value = "Не удалось прочитать файл";
      isLoading.value = false;
    };
    reader.readAsText(stored, "utf-8");
    return;
  }

  // Неподдерживаемые типы
  error.value = "Этот тип файла нельзя просмотреть в окне. Скачайте файл на устройство.";
};

const closePopup = () => {
  revokePreviewUrl();
  fileStore.clearFile();
  popupStore.closePopup("file");
};

onMounted(() => {
  loadFile();
});

onBeforeUnmount(() => {
  revokePreviewUrl();
});
</script>

<template>
  <div class="file-popup-overlay" @click="closePopup">
    <div class="file-popup" @click.stop>
      <header class="file-popup__header">
        <h2 class="file-popup__title">
          {{ fileName }}
        </h2>
        <ClosePopUpButton
            class="file-popup__close-btn"
            @click="closePopup"
        />
      </header>

      <div class="file-popup__body">
        <div v-if="isLoading" class="file-popup__loader">
          Загрузка...
        </div>

        <div v-else-if="error" class="file-popup__message file-popup__message--error">
          {{ error }}
        </div>

        <div v-else-if="!hasContent" class="file-popup__message">
          Файл недоступен для предпросмотра.
        </div>

        <div v-else class="file-popup__content">
          <template v-if="isImage && previewUrl">
            <img :src="previewUrl" :alt="fileName" class="file-popup__image" />
          </template>

          <template v-else-if="isText">
            <pre class="file-popup__text">{{ textContent }}</pre>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.file-popup-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.35);
}

.file-popup {
  width: 90vw;
  max-width: 900px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #ccc;
  padding: 16px 20px;
  box-sizing: border-box;

  &__header {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    margin-bottom: 12px;
  }

  &__title {
    font-weight: 600;
    font-size: 2.0rem;
    text-align: center;
    max-width: 70%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__close-btn {
    position: absolute;
    right: 0;
    cursor: pointer;
  }

  &__body {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__loader {
    font-size: 1.4rem;
    color: #666;
  }

  &__message {
    font-size: 1.4rem;
    color: #555;
    text-align: center;
    padding: 10px 0;

    &--error {
      color: #c0392b;
    }
  }

  &__content {
    width: 100%;
    max-height: 65vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__image {
    max-width: 100%;
    max-height: 65vh;
    object-fit: contain;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  &__text {
    width: 100%;
    max-height: 65vh;
    padding: 12px;
    margin: 0;
    border-radius: 8px;
    background: #f6f6f6;
    font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
    font-size: 1.4rem;
    line-height: 1.4;
    overflow: auto;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
}
</style>
