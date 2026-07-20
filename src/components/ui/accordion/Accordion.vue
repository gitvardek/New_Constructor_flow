<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from "vue";

type IProps = {
  open: boolean
}

const props = withDefaults(defineProps<IProps>(), {
  open: false
})


const isOpen = ref(false);
const contentRef = ref<HTMLElement | null>(null);

const emit = defineEmits<{
  (e: 'toggle', value: boolean): void
}>()

const toggle = async () => {
  isOpen.value = !isOpen.value;

  emit('toggle', isOpen.value);

  await nextTick();

  const content = contentRef.value;
  if (!content) return;

  if (isOpen.value) {
    content.style.maxHeight = `${content.scrollHeight}px`;
    content.addEventListener('transitionend', () => {
      if (isOpen.value) content.style.maxHeight = 'none';
    }, { once: true });
  } else {
    content.style.maxHeight = `${content.scrollHeight}px`;
    requestAnimationFrame(() => {
      content.style.maxHeight = '0px';
    });
  }
};

watch(() => props.open, (value) => {
  if (value !== isOpen.value) toggle();
});

onMounted(async () => {
  if (!props.open) return;

  isOpen.value = true;
  await nextTick();

  const content = contentRef.value;
  if (!content) return;

  content.style.maxHeight = 'none'; // без анимации, сразу открыто
});

</script>

<template>
  <div class="accordion">
    <div class="accordion__summary" @click="toggle">
      <slot name="title"></slot>
      <span class="accordion__icon" :class="{ open: isOpen }"></span>
    </div>
    <div ref="contentRef" class="accordion__content" :class="{ 'accordion__content--open': isOpen }">
      <slot />
      <slot name="params" :onToggle="toggle" />
    </div>
  </div>
</template>

<style lang="scss">
.accordion {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  // padding: clamp(9px, 0.78125vw + 1px, 15px);
  border: 1px solid #a3a9b5;
  border-radius: 15px;
  font-family: Gilroy;

  color: rgba(93, 96, 105, 1);

  &__summary {
    cursor: pointer;
    font-weight: bold;
    user-select: none;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 1.4rem;
  }

  &__icon {
    transition: transform 0.3s ease;

    &::before {
      content: "\276F";

      display: inline-block;
      transform: rotate(90deg);
      transition: transform 0.2s ease-in-out;
    }

    &.open {
      &::before {
        transform: rotate(-90deg);
      }
    }
  }

  &__content {
    overflow: hidden;
    max-height: 0;
    opacity: 0;
    transform: translateY(-10px);
    transition: max-height 0.4s ease, opacity 0.3s ease, transform 0.3s ease;
    font-size: 1.6rem;

    &--open {
      opacity: 1;
      transform: translateY(0);
    }
  }
}
</style>
