import { defineStore } from 'pinia'

export const useConstructorStore = defineStore('constructorStore', {
  state: () => {
    return { 
      count: 0,
      canvasWidth: 0,
      canvasHeight: 0,
      gridSpacing: 30
     }
  },
})