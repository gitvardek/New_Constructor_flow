import { defineStore } from 'pinia';
import { ref } from 'vue';

export const DEFAULT_WALL_HEIGHT_MM = 300;

export const useWallHeightStore = defineStore('wallHeight', () => {
  const wallHeightMm = ref<number>(DEFAULT_WALL_HEIGHT_MM);

  const setWallHeightMm = (value: number) => {
    wallHeightMm.value = value;
  };

  return {
    wallHeightMm,
    setWallHeightMm,
  };
});
