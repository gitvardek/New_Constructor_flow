<script setup lang="ts">
// @ts-nocheck

import {onBeforeUnmount, onMounted, ref} from "vue";
import MainButton from "@/components/ui/buttons/MainButton.vue";

const props = defineProps({
  multiple: { type: Boolean, default: true },
  accept: { type: String, default: "" }, // например: "image/*,.pdf"
  maxSizeMb: { type: Number, default: 20 },
  maxFiles: { type: Number, default: 10 },
  message: { type: String, default: "Перетащите файлы сюда или кликните, чтобы выбрать" },
  files: { type: <File>[], default: () => <File>[] },
});

const emit = defineEmits(["update:files", "files-added"]);

const isDragging = ref(false);
const fileInput = ref(null);
const error = ref("");

const files = ref(<File>[]); // [{ id, file, previewUrl? }]
let uid = 0;

function createPreviewUrl(file) {
  if (file && file.type && file.type.startsWith("image/")) {
    try {
      return URL.createObjectURL(file);
    } catch {
      return null;
    }
  }
  return null;
}

function revokePreviewUrl(item) {
  if (item?.previewUrl) {
    try {
      URL.revokeObjectURL(item.previewUrl);
    } catch {
      // ignore
    }
  }
}

function openPicker() {
  fileInput.value?.click();
}

function onDragEnter() {
  isDragging.value = true;
}

function onDragOver(e) {
// важно: подсказать браузеру, что это copy (не обязательно, но приятно)
  if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
}

function onDragLeave(e) {
// часто dragleave стреляет при переходе между детьми — можно упростить:
  if (e.currentTarget === e.target) isDragging.value = false;
}

function onDrop(e) {
  isDragging.value = false;
  const dropped = Array.from(e.dataTransfer?.files ?? []);
  addFiles(dropped);
}

function onPick(e) {
  const picked = Array.from(e.target.files ?? []);
  addFiles(picked);

// чтобы можно было выбрать тот же файл повторно:
  e.target.value = "";
}

function addFiles(incoming) {
  error.value = "";

  if (!incoming.length) return;

// Ограничение по количеству
  const remaining = props.maxFiles - files.value.length;
  const sliced = incoming.slice(0, Math.max(0, remaining));

  if (sliced.length < incoming.length) {
    error.value = `Можно добавить максимум ${props.maxFiles} файлов.`;
  }

// Фильтр по accept (упрощённый, но рабочий)
  const accepted = sliced.filter(isAccepted);

// Фильтр по размеру
  const maxBytes = props.maxSizeMb * 1024 * 1024;
  const sized = accepted.filter((f) => f.size <= maxBytes);

  if (accepted.length !== sliced.length) {
    error.value = error.value || "Некоторые файлы не подходят по типу.";
  }
  if (sized.length !== accepted.length) {
    error.value = error.value || `Некоторые файлы больше ${props.maxSizeMb} MB.`;
  }

// (Опционально) удаляем дубликаты по name+size+lastModified
  const existingKeys = new Set(files.value.map((x) => keyOf(x.file)));
  const unique = sized.filter((f) => !existingKeys.has(keyOf(f)));

  const mapped = unique.map((file) => ({
    id: ++uid,
    file,
    previewUrl: createPreviewUrl(file),
  }));
  files.value.push(...mapped);

  emit("files-added", mapped.map((x) => x.file));
  emit("update:files", files.value.map((x) => x.file));
}

function remove(id) {
  const item = files.value.find((x) => x.id === id);
  revokePreviewUrl(item);

  files.value = files.value.filter((x) => x.id !== id);
  emit("update:files", files.value.map((x) => x.file));
}

function keyOf(f) {
  return `${f.name}|${f.size}|${f.lastModified}`;
}

function isAccepted(file) {
  const a = (props.accept || "").trim();
  if (!a) return true;

  const parts = a.split(",").map((s) => s.trim()).filter(Boolean);

  return parts.some((rule) => {
    if (rule === "*/*") return true;

    // расширение: .pdf .png
    if (rule.startsWith(".")) {
      return file.name.toLowerCase().endsWith(rule.toLowerCase());
    }

    // image/*, application/pdf
    if (rule.endsWith("/*")) {
      const base = rule.slice(0, -2);
      return file.type.startsWith(base + "/");
    }

    return file.type === rule;
  });
}

onMounted(() => {
  const initialFiles = Array.isArray(props.files) ? props.files : [];
  files.value = initialFiles.map((file) => ({
    id: ++uid,
    file,
    previewUrl: createPreviewUrl(file),
  }));
});

onBeforeUnmount(() => {
  files.value.forEach(revokePreviewUrl);
});
</script>

<template>
  <div
      class="dropzone"
      :class="{ 'dropzone--active': isDragging }"
      @dragenter.prevent="onDragEnter"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
      @click="openPicker"
      role="button"
      tabindex="0"
      @keydown.enter.prevent="openPicker"
      @keydown.space.prevent="openPicker"
  >
    <input
        ref="fileInput"
        type="file"
        class="dropzone__input"
        :multiple="multiple"
        :accept="accept"
        @change="onPick"
    />

    <div class="dropzone__content">
      <div>{{props.message}}</div>
      <div class="hint" v-if="accept">Допустимо: {{ accept }}</div>
      <div class="hint" v-if="maxSizeMb">Макс. размер: {{ maxSizeMb }} MB</div>
    </div>
  </div>

  <ul v-if="files.length" class="list">
    <li v-for="f in files" :key="f.id" class="list-item" :title="f.file.name">
      <div
          v-if="f.previewUrl"
          class="preview"
      >
        <img
            :src="f.previewUrl"
            :alt="f.file.name"
            class="preview__image"
        />
      </div>

      <div class="file-info">
        <div class="file-name">{{ f.file.name }}</div>
        <div class="file-size">{{ (f.file.size / 1024 / 1024).toFixed(2) }} MB</div>
      </div>

      <MainButton @click="remove(f.id)" :className="'delete-button'">Удалить</MainButton>
    </li>
  </ul>

  <p v-if="error" class="error">{{ error }}</p>
</template>

<style lang="scss" scoped>
.dropzone {
  border: 2px dashed #bbb;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  user-select: none;
  transition: 150ms;
  margin: 1rem;

  &:hover {
    background-color: $red;
    color: $white;
  }
}
.dropzone--active {
  border-color: #333;
  background: #f6f6f6;
}
.dropzone__input {
  display: none;
}
.hint {
  opacity: 0.7;
  margin-top: 6px;
  font-size: 1.2rem;
}
.list {
  margin-top: 12px;
}
.list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.preview {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid #e0e0e0;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
}
.preview__image {
  max-width: 100%;
  max-height: 100%;
  object-fit: cover;
}
.file-info {
  flex: 1 1 auto;
  min-width: auto;
  max-width: 15vw;
}
.file-name {
  font-size: 1.4rem;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
}
.file-size {
  font-size: 1.2rem;
  opacity: 0.7;
  margin-top: 2px;
}
.error {
  margin-top: 10px;
  color: #c00;
}

.delete-button {
  border: 1px solid #bbb;
  border-radius: 15px;
  font-size: 1.4rem;
  padding: 5px 15px;
  margin-left: 0.5rem;
  font-weight: 600;
  outline: none;
  transition-property: background-color, color;
  transition-duration: 0.25s;
  transition-timing-function: ease;
}
</style>