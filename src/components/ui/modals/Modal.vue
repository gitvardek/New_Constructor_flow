<script setup lang="ts">
// @ts-nocheck
import { ref, computed, onMounted, defineExpose } from "vue";

const props = defineProps<{
  container?: string;
  to?: string;
  // Esc закрывает через closeModal (с событием close-modal), а не нативно в
  // обход обработчиков. Без флага — прежнее нативное поведение.
  handleEscape?: boolean;
  // Вызывается на Esc первым; true — Esc обработан (например, шаг назад по навигации).
  beforeEscape?: () => boolean;
}>();

const emit = defineEmits(["open-modal", "close-modal"]);

const dialogBody = ref(null);
// Нативный close приходит асинхронно; флаг отличает закрытие через closeModal от
// принудительного закрытия браузером (Chrome закрывает на повторный Esc, даже
// если cancel отменён).
let closeRequested = false;

const openModal = () => {
  dialogBody.value?.showModal();
  emit("open-modal", true);
};

const closeModal = () => {
  // close() на уже закрытом диалоге события close не даёт — флаг бы завис.
  if (dialogBody.value?.open) closeRequested = true;
  dialogBody.value?.close();
  emit("close-modal", false);
};

const onCancel = (event: Event) => {
  if (!props.handleEscape) return;
  event.preventDefault();
  if (props.beforeEscape?.()) return;
  closeModal();
};

const onNativeClose = () => {
  if (closeRequested) {
    closeRequested = false;
    return;
  }
  if (props.handleEscape) emit("close-modal", false);
};

const teleportComponent = computed(() => {
  return props.to ? { name: "Teleport", props: { to: props.to } } : "div";
});

defineExpose({ openModal, closeModal }); 

onMounted(() => {
});
</script>

<template>
  <!-- <component :is="teleportComponent"> -->
    <dialog :class="['modal', props.container || 'modal--default-size']" ref="dialogBody" @cancel="onCancel"
      @close="onNativeClose">
      <slot name="modalClose" :onModalClose="closeModal" />
      <slot
        name="modalBody"
        :onModalClose="closeModal"
        :modalCloseSlot="$slots.modalClose"
        :modalContainer="dialogBody"
      />
    </dialog>
  <!-- </component> -->

  <slot :onModalOpen="openModal" name="modalOpen"></slot>
</template>
<style scoped lang="scss">
.modal {
  /* display: none;  */
  display: flex;
  justify-content: center;
  width: 100%;
  padding: 0;
  border: none;
  background-color: transparent;
  transform: scale(0);
  opacity: 0;
  filter: blur(10px);
  transition: all ease-in 0.25s;

  &--default-size {
    max-width: 85vw;
  }
}

.modal:focus {
  outline: none;
}

.modal[open] {
  /* display: block; */
  transform: scale(1);
  opacity: 1;
  filter: blur(0px);
  pointer-events: auto;
}

.modal::backdrop {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
}
</style>
