import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useRoomValidationStore = defineStore('roomValidation', () => {
  // Флаг, указывающий, есть ли комната с более чем 3 точками контура
  const hasValidRoom = ref<boolean>(false);

  const setHasValidRoom = (value: boolean) => {
    hasValidRoom.value = value;
  };

  const getHasValidRoom = computed(() => hasValidRoom.value);

  return {
    hasValidRoom,
    setHasValidRoom,
    getHasValidRoom,
  };
});