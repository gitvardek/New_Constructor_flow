<template>
  <div
    v-if="isVisible"
    class="wall-context-menu"
    :style="menuStyle"
    @click.stop
  >
    <button
      v-for="action in actions"
      :key="action.key"
      class="wall-context-menu__item"
<<<<<<< HEAD
      :disabled="action.disabled"
      @click="handleAction(action.key)"
=======
      :class="{ 'wall-context-menu__item--disabled': action.disabled }"
      :disabled="action.disabled"
      @click="!action.disabled && handleAction(action.key)"
>>>>>>> 4e3dbf34f155bd0d488801828cee0d61107f5b07
    >
      {{ action.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
//@ts-nocheck

import { computed, onMounted, onUnmounted } from 'vue';
import { useWallContextMenu, type WallContextMenuPayload } from './useWallContextMenu';
import { Events } from '@/store/constructor2d/events';
import { useEventBus } from '@/store/constructor2d/useEventBus';

const eventBus = useEventBus();
const {
  actions,
  isVisible,
  position,
  openMenu,
  closeMenu,
  handleAction
} = useWallContextMenu();

const menuStyle = computed(() => {
  return {
    left: `${position.value.x}px`,
    top: `${position.value.y}px`,
  };
});

const showMenu = (data: WallContextMenuPayload) => {
  openMenu(data.x, data.y, data.context);
};

const hideMenu = () => {
  closeMenu();
};

// Закрываем меню при клике вне его
const handleClickOutside = (e: MouseEvent) => {
  if (isVisible.value) {
    const target = e.target as HTMLElement;
    if (!target.closest('.wall-context-menu')) {
      hideMenu();
    }
  }
};

onMounted(() => {
  eventBus.on(Events.C2D_SHOW_WALL_CONTEXT_MENU, showMenu);
  eventBus.on(Events.C2D_HIDE_WALL_CONTEXT_MENU, hideMenu);
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  eventBus.off(Events.C2D_SHOW_WALL_CONTEXT_MENU, showMenu);
  eventBus.off(Events.C2D_HIDE_WALL_CONTEXT_MENU, hideMenu);
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped lang="scss">
.wall-context-menu {
  position: fixed;
  z-index: 10000;
  min-width: 220px;
  width: max-content;
  max-width: 320px;
  background-color: #ffffff;
  border: 1px solid #cccccc;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  padding: 4px 0;
  display: flex;
  flex-direction: column;

  &__item {
    padding: 8px 16px;
    text-align: left;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 14px;
    color: #212121;
    transition: background-color 0.2s;

    &:hover {
      background-color: #f1f1f1;
    }

    &:active {
      background-color: #e0e0e0;
    }

<<<<<<< HEAD
    &:disabled {
      color: #9e9e9e;
      cursor: not-allowed;
      background: transparent;
=======
    &--disabled {
      color: #aaaaaa;
      cursor: not-allowed;
>>>>>>> 4e3dbf34f155bd0d488801828cee0d61107f5b07
      pointer-events: none;
    }
  }
}
</style>

