import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { POPUP_CONFIG, PopupKey } from '@/components/popUp';
import { useEventBus } from '../appliction/useEventBus';

export type PopupsState = Record<PopupKey, boolean>

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

  const openPopup = (popupName: PopupKey) => {
    popups.value[popupName] = true;
    eventBus.emit("A:ClearSelected", { object: null });
  };

  const closePopup = (popupName: PopupKey) => {
    popups.value[popupName] = false;
  };

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
    toggleInfoPopup,
    isAnyPopupOpen,
    getOpenedPopups
  };
});
