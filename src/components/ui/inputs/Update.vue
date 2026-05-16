<template>
    <div class="input-dialog">
      <h3 v-if="label" class="input-dialog__label">{{ label }}</h3>
  
      <div class="input-dialog__radio-group">
        <label class="input-dialog__radio-option">
          <input
            type="radio"
            :value="optionOneValue"
            v-model="selectedValue"
          />
          <span>{{ optionOneLabel }}</span>
        </label>
  
        <label class="input-dialog__radio-option">
          <input
            type="radio"
            :value="optionTwoValue"
            v-model="selectedValue"
          />
          <span>{{ optionTwoLabel }}</span>
        </label>
      </div>
  
      <div class="input-dialog__actions">
        <slot name="confirmButton" :onConfirm="emitConfirm">
          <button class="btn btn--confirm" @click="emitConfirm">
            Сохранить
          </button>
        </slot>
  
        <slot name="cancelButton" :onCancel="emitCancel">
          <button class="btn btn--cancel" @click="emitCancel">Отменить</button>
        </slot>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref } from "vue";
  
  const props = defineProps<{
    label?: string;
    confirmText?: string;
    optionOneLabel: string;
    optionTwoLabel: string;
    optionOneValue: string;
    optionTwoValue: string;
    initialValue?: string;
  }>();
  
  const emit = defineEmits(["confirm", "cancel"]);
  
  const selectedValue = ref(props.initialValue || props.optionOneValue);
  
  const emitConfirm = () => {
    emit("confirm", selectedValue.value);
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
  
    &__radio-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
    }
  
    &__radio-option {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1.6rem;
      color: $strong-grey;
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
  
  