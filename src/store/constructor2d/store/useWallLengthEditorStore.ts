import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useWallLengthEditorStore = defineStore('wallLengthEditor', () => {
  const wallId = ref<string | number | null>(null);

  const setWallId = (id: string | number | null) => {
    wallId.value = id;
  };

  const clear = () => {
    wallId.value = null;
  };

  return {
    wallId,
    setWallId,
    clear,
  };
});
