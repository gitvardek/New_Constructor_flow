<script setup lang="ts">
import { ref, computed, onMounted } from "vue";

interface Props {
  content: string;
  position?: "top" | "bottom" | "left" | "right";
  theme?: "light" | "dark";
  offset?: number;
}

const props = withDefaults(defineProps<Props>(), {
  content: "",
  position: "top",
  theme: "light",
  offset: 8,
});

const isVisible = ref(false);
const tooltipStyle = computed(() => {
  const style: Record<string, string> = {};
  const offset = `${props.offset}px`;

  switch (props.position) {
    case "top":
      style.bottom = `calc(100% + ${offset})`;
      style.left = "50%";
      style.transform = "translateX(-50%)";
      break;
    case "bottom":
      style.top = `calc(100% + ${offset})`;
      style.left = "50%";
      style.transform = "translateX(-50%)";
      break;
    case "left":
      style.right = `calc(100% + ${offset})`;
      style.top = "50%";
      style.transform = "translateY(-50%)";
      break;
    case "right":
      style.left = `calc(100% + ${offset})`;
      style.top = "50%";
      style.transform = "translateY(-50%)";
      break;
  }

  return style;
});

const showTooltip = () => {
  isVisible.value = true;
};

const hideTooltip = () => {
  isVisible.value = false;
};

onMounted(()=>{
})
</script>

<template>
  <div
    class="tooltip-wrapper"
    @mouseenter="showTooltip"
    @mouseleave="hideTooltip"
  >
    <slot name="trigger"></slot>
    <transition name="fade">
      <div
        v-if="isVisible"
        class="tooltip"
        :style="tooltipStyle"
        :class="[`tooltip-${position}`, { 'tooltip-dark': theme === 'dark' }]"
      >
        <slot name="content">{{ content }}</slot>
      </div>
    </transition>
  </div>
</template>

<style scoped lang="scss">
$light-bg: #fff;
$light-text: #333;
$dark-bg: #333;
$dark-text: #fff;
$arrow-size: 6px;

.tooltip-wrapper {
  position: relative;
  display: inline-block;
}

.tooltip {
  position: absolute;
  background: $light-bg;
  color: $light-text;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 1.4rem;
  white-space: nowrap;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  pointer-events: none;

  &.tooltip-dark {
    background: $dark-bg;
    color: $dark-text;
  }

  // Arrows for different positions
  &.tooltip-top,
  &.tooltip-bottom,
  &.tooltip-left,
  &.tooltip-right {
    &::before {
      content: "";
      position: absolute;
      border: $arrow-size solid transparent;
    }
  }

  &.tooltip-top::before {
    border-top-color: $light-bg;
    bottom: -#{$arrow-size * 2};
    left: 50%;
    transform: translateX(-50%);
  }

  &.tooltip-bottom::before {
    border-bottom-color: $light-bg;
    top: -#{$arrow-size * 2};
    left: 50%;
    transform: translateX(-50%);
  }

  &.tooltip-left::before {
    border-left-color: $light-bg;
    right: -#{$arrow-size * 2};
    top: 50%;
    transform: translateY(-50%);
  }

  &.tooltip-right::before {
    border-right-color: $light-bg;
    left: -#{$arrow-size * 2};
    top: 50%;
    transform: translateY(-50%);
  }

  &.tooltip-dark {
    &.tooltip-top::before {
      border-top-color: $dark-bg;
    }
    &.tooltip-bottom::before {
      border-bottom-color: $dark-bg;
    }
    &.tooltip-left::before {
      border-left-color: $dark-bg;
    }
    &.tooltip-right::before {
      border-right-color: $dark-bg;
    }
  }
}

// Fade transition
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
