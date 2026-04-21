<script lang="ts" setup>
import { computed, ref } from 'vue'
import type { NormalizedFields } from '../../types/form.types'

const props = defineProps<{
  field: NormalizedFields
  modelValue?: File[] | File | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: File[] | File | null): void
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)
const uploadError = ref<string | null>(null)
const isDragging = ref(false)
let dragCounter = 0

const filesList = computed<File[]>(() => {
  if (!props.modelValue) return []
  return Array.isArray(props.modelValue) ? props.modelValue : [props.modelValue]
})

const parseAllowedExtensions = (description: string): string[] => {
  const text = String(description ?? '').toLowerCase()
  const exts = new Set<string>()

  // Основной сценарий с бэка: "*.jpg, *.jpeg, *.png"
  const starExtRe = /\*\.\s*([a-z0-9]+)/gi
  let match: RegExpExecArray | null
  while ((match = starExtRe.exec(text))) {
    exts.add(`.${match[1].toLowerCase()}`)
  }
  if (exts.size > 0) return Array.from(exts)

  // Запасной сценарий: ".jpg .png jpg png"
  const tokens = text
    .split(/[,;]+|\s+/)
    .map((t) => t.trim())
    .filter(Boolean)

  for (const token of tokens) {
    const cleaned = token
      .replace(/^\*+\./, '')
      .replace(/^\*\./, '')
      .replace(/^\./, '')
      .replace(/^\*/, '')
    if (!cleaned) continue
    if (!/^[a-z0-9]+$/i.test(cleaned)) continue
    exts.add(`.${cleaned.toLowerCase()}`)
  }

  return Array.from(exts)
}

const allowedExtensions = computed<string[]>(() => parseAllowedExtensions(props.field.DESCRIPTION))

const acceptValue = computed<string | undefined>(() => {
  if (!allowedExtensions.value.length) return undefined
  return allowedExtensions.value.join(',')
})

const isFileExtensionAllowed = (file: File, exts: string[]) => {
  const parts = file.name.split('.')
  if (parts.length < 2) return false
  const ext = (parts[parts.length - 1] || '').toLowerCase()
  return exts.includes(`.${ext}`)
}

const getCurrentFiles = (): File[] => {
  if (!props.modelValue) return []
  return Array.isArray(props.modelValue) ? props.modelValue : [props.modelValue]
}

const fileKey = (file: File) => `${file.name}|${file.size}|${file.lastModified}`

const clearInput = () => {
  if (fileInputRef.value) fileInputRef.value.value = ''
}

const removeFile = (file: File) => {
  uploadError.value = null

  if (!props.field.MULTIPLE) {
    emit('update:modelValue', null)
    clearInput()
    return
  }

  const current = getCurrentFiles()
  const key = fileKey(file)
  const next = current.filter((f) => fileKey(f) !== key)
  emit('update:modelValue', next)
  clearInput()
}

const applyIncomingFiles = (incomingFiles: File[]) => {
  uploadError.value = null

  const allowed = allowedExtensions.value
  const currentFiles = getCurrentFiles()

  const validateFiles = (incoming: File[]) => {
    if (!allowed.length) return { valid: incoming, invalid: [] as File[] }
    const invalid = incoming.filter((f) => !isFileExtensionAllowed(f, allowed))
    return {
      valid: incoming.filter((f) => isFileExtensionAllowed(f, allowed)),
      invalid
    }
  }

  const { valid: validNewFiles, invalid: invalidNewFiles } = validateFiles(incomingFiles)

  if (invalidNewFiles.length) {
    uploadError.value = `Разрешены только форматы: ${allowed.map((e) => e.replace('.', '')).join(', ')}`
  }

  // Чтобы можно было "долкладывать" файлы в несколько выборов подряд,
  // браузер каждый раз присылает только свежий selection — поэтому копим в modelValue.
  if (props.field.MULTIPLE) {
    const merged = [...currentFiles, ...validNewFiles]

    // Дедупликация (чтобы при повторном выборе не накапливались одинаковые)
    const seen = new Set<string>()
    const unique: File[] = []
    for (const f of merged) {
      const key = fileKey(f)
      if (seen.has(key)) continue
      seen.add(key)
      unique.push(f)
    }

    emit('update:modelValue', unique)
  } else {
    // Для одиночного поля: если выбран некорректный файл, оставляем текущий.
    if (invalidNewFiles.length) {
      emit('update:modelValue', currentFiles[0] ?? null)
    } else {
      emit('update:modelValue', validNewFiles[0] ?? null)
    }
  }
}

const onChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files ? Array.from(target.files) : []

  applyIncomingFiles(files)

  // Сбрасываем input, чтобы пользователь мог выбрать те же файлы повторно.
  target.value = ''
  clearInput()
}

const onDragEnter = (event: DragEvent) => {
  event.preventDefault()
  dragCounter += 1
  isDragging.value = true
}

const onDragOver = (event: DragEvent) => {
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
  isDragging.value = true
}

const onDragLeave = (event: DragEvent) => {
  event.preventDefault()
  dragCounter = Math.max(0, dragCounter - 1)
  if (dragCounter === 0) isDragging.value = false
}

const onDrop = (event: DragEvent) => {
  event.preventDefault()
  dragCounter = 0
  isDragging.value = false

  const files = event.dataTransfer?.files ? Array.from(event.dataTransfer.files) : []
  applyIncomingFiles(files)
  clearInput()
}
</script>

<template>
  <div
    class="order-file-field"
    :class="{ 'order-file-field--dragging': isDragging }"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <label class="order-file-field__label" :for="`field-${field.CODE}`">
      {{ field.NAME }}
      <sup v-if="field.REQUIED">*</sup>
    </label>

    <label class="order-file-field__upload" :for="`field-${field.CODE}`">
      Загрузить файлы
    </label>
    <input
      ref="fileInputRef"
      class="order-file-field__control"
      :id="`field-${field.CODE}`"
      :name="field.CODE"
      type="file"
      :required="Boolean(field.REQUIED)"
      :multiple="Boolean(field.MULTIPLE)"
      :accept="acceptValue"
      @change="onChange"
    />

    <div v-if="isDragging" class="order-file-field__drop-overlay">
      Отпустите файлы
    </div>

    <p v-if="uploadError" class="order-file-field__error">{{ uploadError }}</p>
    <p v-if="field.DESCRIPTION" class="order-file-field__hint">{{ field.DESCRIPTION }}</p>

    <ul v-if="filesList.length" class="order-file-field__list">
      <li
        v-for="file in filesList"
        :key="fileKey(file)"
        class="order-file-field__list-item"
      >
        <span class="order-file-field__file-name">{{ file.name }}</span>
        <button
          v-if="field.MULTIPLE"
          type="button"
          class="order-file-field__remove-btn"
          @click="removeFile(file)"
        >
          Удалить
        </button>
      </li>
    </ul>

    <button
      v-if="filesList.length && !field.MULTIPLE"
      type="button"
      class="order-file-field__remove-btn"
      @click="removeFile(filesList[0])"
    >
      Удалить
    </button>
  </div>
</template>

<style scoped>
.order-file-field {
  display: grid;
  gap: 3px;
  margin: 0;
  position: relative;
}

.order-file-field--dragging {
  outline: 2px dashed #4a90e2;
  outline-offset: 6px;
  border-radius: 10px;
}

.order-file-field--dragging .order-file-field__upload {
  border-color: #4a90e2;
  background: #f5faff;
}

.order-file-field__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 500;
  color: #272727;
  line-height: 1;
  margin: 0;
}

.order-file-field__label sup {
  color: #da444c;
  font-weight: 700;
}

.order-file-field__upload {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: max-content;
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid #d5d8e0;
  border-radius: 8px;
  background: #fff;
  color: #131313;
  font-size: 14px;
  cursor: pointer;
  margin: 0;
}

.order-file-field__control {
  display: none;
}

.order-file-field__drop-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 10px;
  font-size: 12px;
  color: #4a90e2;
  pointer-events: none;
  z-index: 2;
}

.order-file-field__hint {
  margin: 0;
  color: #5d6069;
  font-size: 12px;
}

.order-file-field__error {
  margin: 0;
  color: #bf353d;
  font-size: 12px;
}

.order-file-field__list {
  margin: 0;
  padding-left: 14px;
  font-size: 11px;
  color: #272727;
}

.order-file-field__list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.order-file-field__file-name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  max-width: 180px;
}

.order-file-field__remove-btn {
  border: 1px solid #d5d8e0;
  border-radius: 6px;
  background: #fff;
  padding: 3px 8px;
  cursor: pointer;
  font-size: 11px;
  color: #131313;
  align-self: center;
  line-height: 1.1;
}

.order-file-field__remove-btn:hover {
  border-color: #c2c6cf;
}

.order-file-field__remove-btn:active {
  transform: translateY(1px);
}
</style>
