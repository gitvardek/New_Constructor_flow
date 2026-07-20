import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useModelStore = defineStore('modelStore', () => {
  const selectedModel = ref<string | null>(null);

  const selectModel = (modelId: string) => {
    selectedModel.value = modelId;
  };

  const clearModel = () => {
    selectedModel.value = null;
  };

  return {
    selectedModel,
    selectModel,
    clearModel,
  };
});