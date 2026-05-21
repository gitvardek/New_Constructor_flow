<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";

// defineProps<{
//   title: string;
// }>();

const isOpen = ref(false);
const contentRef = ref<HTMLElement | null>(null);

const toggle = async () => {
  isOpen.value = !isOpen.value;
  await nextTick();

  const content = contentRef.value;
  if (!content) return;

  if (isOpen.value) {
    const scrollHeight = content.scrollHeight;
    content.style.maxHeight = `${scrollHeight}px`;
  } else {
    content.style.maxHeight = `0px`;
  }
};

onMounted(() => {
  const content = contentRef.value;
  if (content) {
    content.style.overflow = "hidden";
    content.style.maxHeight = "0px";
  }
});
</script>

<template>
  <div class="accordion">
    <div class="accordion__summary" @click="toggle">
      <slot name="title"></slot>
      <span class="accordion__icon" :class="{ open: isOpen }"></span>
    </div>
    <div
      ref="contentRef"
      class="accordion__content"
      :class="{ 'accordion__content--open': isOpen }"
    >
      <slot />
      <slot name="params" :onToggle="toggle"/>
    </div>
  </div>
</template>

<style lang="scss" >
.accordion {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  margin: 4px 4px 4px 0px;
  padding:   clamp(9px, 0.78125vw + 1px, 15px);
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
      //   transform: rotate(180deg);
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
