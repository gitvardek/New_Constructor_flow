import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { Vector2 } from '@/types/constructor2d/interfaсes';

export const useC2DInteractiveWallStore = defineStore('useC2DInteractiveWallStore', () => {

  // Состояния
  const activeObjectID = ref<string | number>(0);
  const statusLeftDownMouse = ref<boolean>(false);
  const activePoint = ref<number | null>(null);
  const downPositionPoint = ref<Vector2>({
    x: 0,
    y: 0
  });

  // Методы
  const setStatusLeftDownMouse = (value: boolean) => {
    statusLeftDownMouse.value = value;
  };

  const setActiveObjectID = (value: string | number) => {
    activeObjectID.value = value;
    // console.log("\n\r\n\rsetActiveObjectID:", activeObjectID.value);
  }

  const setActivePoint = (value: number | null) => {
    activePoint.value = value;
  }

  const setDownPositionPoint = (value: Vector2) => {
    downPositionPoint.value = value;
  }

  const getActiveObjectID =  computed(() => activeObjectID.value);
  const getActivePoint = computed(() => activePoint.value);
  const getStatusLeftDownMouse = computed(() => statusLeftDownMouse.value);
  const getDownPositionPoint = computed(() => downPositionPoint.value);

  return {
    
    activeObjectID,
    statusLeftDownMouse,
    activePoint,

    getActiveObjectID,
    getActivePoint,
    getStatusLeftDownMouse,
    getDownPositionPoint,

    setActiveObjectID,
    setStatusLeftDownMouse,
    setActivePoint,
    setDownPositionPoint,
    
  };

});