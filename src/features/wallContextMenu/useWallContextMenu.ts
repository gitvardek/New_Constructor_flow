import { ref } from 'vue';

export interface WallContextMenuItem {
  key: string;
  label: string;
  action: () => void | Promise<void>;
}

export const useWallContextMenu = () => {
  const actions: WallContextMenuItem[] = [
    {
      key: 'splitWall',
      label: 'Добавить стену',
      action: () => {
        // Действие будет передано извне через openMenu
      }
    }
  ];

  const isVisible = ref(false);
  const position = ref({ x: 0, y: 0 });
  const wallId = ref<string | number | null>(null);
  let splitWallCallback: ((id: string | number) => void) | null = null;

  const openMenu = (
    x: number,
    y: number,
    id: string | number,
    onSplitWall: (id: string | number) => void
  ) => {
    // Позиционируем меню справа от курсора (добавляем небольшой отступ)
    position.value = { 
      x: x + 10, // Отступ 10px справа от курсора
      y: y 
    };
    wallId.value = id;
    splitWallCallback = onSplitWall;
    isVisible.value = true;
  };

  const closeMenu = () => {
    isVisible.value = false;
    wallId.value = null;
    splitWallCallback = null;
  };

  const handleAction = (actionKey: string) => {
    if (actionKey === 'splitWall' && wallId.value !== null && splitWallCallback) {
      splitWallCallback(wallId.value);
    }
    closeMenu();
  };

  return {
    actions,
    isVisible,
    position,
    openMenu,
    closeMenu,
    handleAction
  };
};

