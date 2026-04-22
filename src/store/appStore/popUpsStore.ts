import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { POPUP_CONFIG, PopupKey } from '@/components/popUp';
import { useEventBus } from '../appliction/useEventBus';

export type PopupsState = Record<PopupKey, boolean>

type ProjectParamsWallWidths = {
  right: number;
  left: number;
  bottom: number;
  top: number;
};

type ProjectParamsCreateHandler = (
  widths: ProjectParamsWallWidths
) => void | Promise<void>;

export const usePopupStore = defineStore('popup', () => {
  const eventBus = useEventBus()
  // Создаем состояние на основе конфигурации
  const popups = ref(
    Object.keys(POPUP_CONFIG).reduce((acc, key) => {
      acc[key as PopupKey] = false;
      return acc;
    }, {} as PopupsState)
  );

  const isInfoPopupOpen = ref<boolean>(false)

  const projectParamsCreateHandler = ref<ProjectParamsCreateHandler | null>(null)

  const openPopup = (popupName: PopupKey) => {

    popups.value[popupName] = true;
    eventBus.emit("A:ClearSelected", { object: null });
  };

  const closePopup = (popupName: PopupKey) => {
    popups.value[popupName] = false;
    if (popupName === 'projectParams') {
      projectParamsCreateHandler.value = null;
    }
  };

  const openProjectParamsPopup = (handler?: ProjectParamsCreateHandler) => {
    projectParamsCreateHandler.value = handler ?? null;
    openPopup('projectParams');
  };

  const getProjectParamsCreateHandler = () =>
    projectParamsCreateHandler.value;

  const toggleInfoPopup = () => {
    isInfoPopupOpen.value = !isInfoPopupOpen.value
  }

  const isAnyPopupOpen = computed(() => {
    return Object.values(popups.value).some(isOpen => isOpen);
  });

  const getOpenedPopups = computed(() => {
    return Object.entries(popups.value).reduce((acc, [key, value]) => {
      if (value)
        acc[key as PopupKey] = true;

      return acc
    }, {} as PopupsState)
  });


  return {
    popups,
    isInfoPopupOpen,

    openPopup,
    closePopup,
    openProjectParamsPopup,
    getProjectParamsCreateHandler,
    toggleInfoPopup,
    isAnyPopupOpen,
    getOpenedPopups
  };
});
