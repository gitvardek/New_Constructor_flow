import { computed, ref } from 'vue';
import { usePopupStore } from '@/store/appStore/popUpsStore';
import { useOpeningSizeEditorStore } from '@/store/constructor2d/store/useOpeningSizeEditorStore';
import { useWallLengthEditorStore } from '@/store/constructor2d/store/useWallLengthEditorStore';

export interface WallContextMenuItem {
  key: string;
  label: string;
  disabled?: boolean;
}

export type WallContextMenuWallContext = {
  kind: 'wall';
  wallId: string | number;
  isClosingWall: boolean;
  canDelete: boolean;
  onSplitWall: (id: string | number) => void;
  onDeleteWall: (id: string | number) => void;
};

export type WallContextMenuOpeningContext = {
  kind: 'door' | 'window';
  openingId: string | number;
};

export type WallMenuContext = WallContextMenuWallContext | WallContextMenuOpeningContext;

export type WallContextMenuPayload = {
  x: number;
  y: number;
  context: WallMenuContext;
};

export const useWallContextMenu = () => {
  const popupStore = usePopupStore();
  const openingSizeStore = useOpeningSizeEditorStore();
  const wallLengthStore = useWallLengthEditorStore();

  const isVisible = ref(false);
  const position = ref({ x: 0, y: 0 });
  const menuContext = ref<WallMenuContext | null>(null);
  let splitWallCallback: ((id: string | number) => void) | null = null;
  let deleteWallCallback: ((id: string | number) => void) | null = null;

  const actions = computed((): WallContextMenuItem[] => {
    const ctx = menuContext.value;
    if (!ctx) return [];
    if (ctx.kind === 'wall') {
      const closing = ctx.isClosingWall;
      return [
        { key: 'splitWall',        label: 'Добавить стену',        disabled: closing },
        { key: 'changeWallHeight', label: 'Изменить высоту стен',  disabled: false },
        { key: 'changeWallLength', label: 'Изменить длину стены',  disabled: closing },
        { key: 'deleteWall',       label: 'Удалить стену',         disabled: closing || !ctx.canDelete },
      ];
    }
    if (ctx.kind === 'window') {
      return [{ key: 'changeWindowSize', label: 'Изменить размеры окна' }];
    }
    return [{ key: 'changeDoorSize', label: 'Изменить размеры двери' }];
  });

  const openMenu = (x: number, y: number, context: WallMenuContext) => {
    position.value = {
      x: x + 10,
      y: y,
    };
    menuContext.value = context;
    if (context.kind === 'wall') {
      splitWallCallback = context.onSplitWall;
      deleteWallCallback = context.onDeleteWall;
    } else {
      splitWallCallback = null;
      deleteWallCallback = null;
    }
    isVisible.value = true;
  };

  const closeMenu = () => {
    isVisible.value = false;
    menuContext.value = null;
    splitWallCallback = null;
    deleteWallCallback = null;
  };

  const handleAction = (actionKey: string) => {
    const ctx = menuContext.value;

    if (actionKey === 'splitWall' && ctx?.kind === 'wall' && splitWallCallback) {
      splitWallCallback(ctx.wallId);
      closeMenu();
      return;
    }
    if (
      actionKey === 'deleteWall' &&
      ctx?.kind === 'wall' &&
      ctx.canDeleteWall !== false &&
      deleteWallCallback
    ) {
      deleteWallCallback(ctx.wallId);
      closeMenu();
      return;
    }
    if (actionKey === 'changeWallHeight') {
      popupStore.openPopup('wallHeight');
      closeMenu();
      return;
    }
    if (actionKey === 'changeWallLength' && ctx?.kind === 'wall') {
      wallLengthStore.setWallId(ctx.wallId);
      popupStore.openPopup('wallLength');
      closeMenu();
      return;
    }
    if (
      actionKey === 'changeWindowSize' &&
      ctx?.kind === 'window'
    ) {
      openingSizeStore.setObjectId(ctx.openingId);
      popupStore.openPopup('doorWindowSize');
      closeMenu();
      return;
    }
    if (actionKey === 'changeDoorSize' && ctx?.kind === 'door') {
      openingSizeStore.setObjectId(ctx.openingId);
      popupStore.openPopup('doorWindowSize');
      closeMenu();
      return;
    }
    closeMenu();
  };

  return {
    actions,
    isVisible,
    position,
    openMenu,
    closeMenu,
    handleAction,
  };
};
