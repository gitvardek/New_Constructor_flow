// @ts-nocheck 31

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

interface Customisers {
  ruler: boolean,
  color: boolean,
  moving: boolean,
  figure: boolean,
  drawer: boolean,
  hammer: boolean
}

type CustomiserType = 'ruler' | 'color' | 'moving' | 'figure' | 'drawer' | 'hammer';

export const useCustomiserStore = defineStore('customiser', () => {
  const isCustomiserOpen = ref(false);

  const customisers = ref<CustomiserType[]>(['ruler'])

  const toggleCustomiserPopup = () => {
    isCustomiserOpen.value = !isCustomiserOpen.value;
  }

  const showCustomiserPopup = () => {
    isCustomiserOpen.value = true
  }
  const hideCustomiserPopup = () => {
    isCustomiserOpen.value = false
  }

  function switchCustomiser(type: CustomiserType) {
    customisers.value = [];
    if (!customisers.value.includes(type)) {
      customisers.value.push(type);
    }
  }

  const customiserState = computed(() => {
    return isCustomiserOpen.value
  })


  return {
    isCustomiserOpen,
    customisers,
    toggleCustomiserPopup,
    switchCustomiser,

    showCustomiserPopup,
    hideCustomiserPopup,
    customiserState
  };
})
