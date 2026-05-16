<template>
  <div class="input-dialog">
    <h3 v-if="label" class="input-dialog__label">{{ label }}</h3>
    <input
      v-model="inputValue"
      type="text"
      class="input-dialog__input"
      :placeholder="placeholder"
    />

    <div class="input-dialog__checkbox">
      <slot name="checkBox">
    
      </slot>
    </div>

    <div class="input-dialog__actions">
      <slot name="confirmButton" :onConfirm="emitConfirm">
        <button class="btn btn--confirm" @click="emitConfirm">
          {{ confirmText }}
        </button>
      </slot>

      <slot name="cancelButton" :onCancel="emitCancel">
        <button class="btn btn--cancel" @click="emitCancel">Отменить</button>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watchEffect } from "vue";

const props = defineProps<{
  label?: string;
  placeholder?: string;
  initialValue?: string;
  confirmText?: string;
}>();

// const emit = defineEmits<{
//   (e: 'confirm', value: string): void
//   (e: 'cancel'): void
// }>()

const emit = defineEmits(["confirm", "cancel"]);

const inputValue = ref(props.initialValue || "");

watchEffect(() => {
  inputValue.value = props.initialValue || "";
});

const emitConfirm = () => {
  if (inputValue.value.trim()) {
    emit("confirm", inputValue.value.trim());
  }
};

const emitCancel = () => {
  emit("cancel");
};
</script>

<style scoped lang="scss">
.input-dialog {
  background-color: $white;
  border: 1px solid $dark-grey;
  border-radius: 25px;
  padding: 16px;
  max-width: 318px;
  width: 100%;

  &__label {
    display: block;
    font-size: 1.6rem;
    margin-bottom: 8px;
    color: $strong-grey;
  }

  &__input {
    width: 100%;
    padding: 10px 14px;
    border: none;
    border-radius: 10px;
    background-color: $light-stroke;
    font-size: 1.6rem;
    margin-bottom: 16px;
    outline: none;
  }

  &__checkbox {
    text-align: center
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
