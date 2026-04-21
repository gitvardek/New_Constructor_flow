import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useOpeningSizeEditorStore = defineStore('openingSizeEditor', () => {
  const objectId = ref<string | number | null>(null);

  const setObjectId = (id: string | number | null) => {
    objectId.value = id;
  };

  const clear = () => {
    objectId.value = null;
  };

  return {
    objectId,
    setObjectId,
    clear,
  };
});
