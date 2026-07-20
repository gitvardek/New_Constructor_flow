<template>
    <div class="notification">
      <h3 v-if="label" class="notification__label">{{ label }}</h3>
      <p class="notification__description">{{ description }}</p>
      <p class="notification__link">
        <a :href="link" target="_blank">Ссылка на КП</a>
      </p>

      <div class="notification__actions">
        <slot name="cancelButton" :onCancel="emitCancel">
          <button class="btn btn--cancel" @click="emitCancel">Отменить</button>
        </slot>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
    //@ts-nocheck
  
  const props = defineProps<{
    label?: string;
    description?: string;
    link?: string 
  }>();
  
  // const emit = defineEmits<{
  //   (e: 'confirm', value: string): void
  //   (e: 'cancel'): void
  // }>()
  
  const emit = defineEmits(["cancel"]);
  
  const emitCancel = () => {
    emit("cancel");
  };
  </script>
  
  <style scoped lang="scss">
  .notification {
    background-color: $white;
    border: 1px solid $dark-grey;
    border-radius: 25px;
    padding: 16px;
    max-width: 400px;
    width: 100%;

    &__link {
        text-align: center;
    }

    &__link > * {
        font-size: 1.6rem;
        display: inline;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;    
    }

    a:hover {
        transition: 0.5s;
        color: $red;
    }

    &__label {
      display: block;
      text-align: center;
      font-size: 1.6rem;
      margin-bottom: 8px;
      color: $red;
    }
  
    &__actions {
      padding-top: 10px;
      display: flex;
      justify-content: center;
      gap: 12px;
  
      .btn {
        font-size: 1.6rem;
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        cursor: pointer;
  
        &--cancel {
          background-color: transparent;
          color: $strong-grey;
        }
      }
    }
  }
  </style>
  