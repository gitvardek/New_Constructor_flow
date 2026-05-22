<script setup lang="ts">
import { ref } from "vue";

interface Props {
  content?: string;
  position?: "top" | "bottom" | "left" | "right";
  theme?: "light" | "dark";
  offset?: number;
}

const props = withDefaults(defineProps<Props>(), {
  content: "",
  position: "top",
  theme: "light",
  offset: 5,
});

const triggerRef = ref<HTMLElement | null>(null);
const tooltipPos = ref({});
const isVisible = ref(false);
const teleportTarget = ref("body");

const showTooltip = () => {
  if (!triggerRef.value) return;

  const parentDialog = triggerRef.value.closest("dialog[open]");
  teleportTarget.value = parentDialog ? "dialog[open]" : "body";

  const rect = triggerRef.value.getBoundingClientRect();
  const offset = props.offset;

  switch (props.position) {
    case "top":
      tooltipPos.value = {
        position: "fixed",
        top: `${rect.top - offset}px`,
        left: `${rect.left + rect.width / 2}px`,
        transform: "translateX(-50%) translateY(-100%)",
      };
      break;
    case "bottom":
      tooltipPos.value = {
        position: "fixed",
        top: `${rect.bottom + offset}px`,
        left: `${rect.left + rect.width / 2}px`,
        transform: "translateX(-50%)",
      };
      break;
    case "left":
      tooltipPos.value = {
        position: "fixed",
        top: `${rect.top + rect.height / 2}px`,
        left: `${rect.left - offset}px`,
        transform: "translateX(-100%) translateY(-50%)",
      };
      break;
    case "right":
      tooltipPos.value = {
        position: "fixed",
        top: `${rect.top + rect.height / 2}px`,
        left: `${rect.right + offset}px`,
        transform: "translateY(-50%)",
      };
      break;
  }

  isVisible.value = true;
};

const hideTooltip = () => {
  isVisible.value = false;
};
</script>

<template>
  <div ref="triggerRef" class="tooltip-wrapper" @mouseenter="showTooltip" @mouseleave="hideTooltip">
    <slot name="trigger"></slot>

    <Teleport :to="teleportTarget">
      <Transition name="fade">
        <div v-if="isVisible" class="tooltip" :style="{ ...tooltipPos, zIndex: 2147483647 }"
          :class="[`tooltip-${position}`, { 'tooltip-dark': theme === 'dark' }]">
          <slot name="content">{{ content }}</slot>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
.tooltip-wrapper {
  position: relative;
  display: inline-block;
}

.tooltip {
  position: fixed;
  z-index: 9999;
  display: flex;
  flex-wrap: wrap;
  background: $white;
  color: #333;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 1.4rem;
  // white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  pointer-events: none;
  text-align: center;

  &.tooltip-dark {
    background: $strong-grey;
    color: $white;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>