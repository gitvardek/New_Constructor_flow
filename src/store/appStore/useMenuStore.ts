// src/stores/useMenuStore.ts
/**//@ts-nocheck */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { MenuType } from '@/types/types';

export const useMenuStore = defineStore('menu', () => {

  const catalogFilterProductsId = ref([])
  const openMenus = ref<MenuType[]>([]);
  const menuContentsByID = ref<string>('');

  const drowMode = ref<boolean>(false)
  const rulerVisibility = ref<boolean>(true);



  async function openMenu(type: MenuType, content: string, products: []) {

    openMenus.value = [];
    catalogFilterProductsId.value = [];

    if (!openMenus.value.includes(type)) {

      openMenus.value.push(type);

      menuContentsByID.value = content;

      catalogFilterProductsId.value = products;
    }
  }

  function closeMenu(type: MenuType) {
    openMenus.value = openMenus.value.filter(menu => menu !== type);
    menuContentsByID.value = '';
  }

  function closeAllMenus() {
    openMenus.value = [];
    menuContentsByID.value = '';
  }

  //-------------------------
  /** @Режим_чертежа */
  //-------------------------

  const setDrowModeValue = (value: boolean) => {
    drowMode.value = value
  }

  const toggleDrowModeValue = async () => {
    drowMode.value = !drowMode.value
    // console.log(drowMode.value, 'drowMode.value')
  }

  const getDrowModeValue = computed(() => {
    return drowMode.value
  })

  //-------------------------
  /** @Видимость_размеров */
  //-------------------------

  const setRulerVisibility = (value: boolean) => {
    rulerVisibility.value = value
  }

  const toggleRulerVisibility = () => {
    rulerVisibility.value = !rulerVisibility.value
  }

  const getRulerVisibility = computed(() => {
    return rulerVisibility.value
  })


  return {
    openMenus,
    menuContentsByID,
    catalogFilterProductsId,

    openMenu,
    closeMenu,
    closeAllMenus,


    toggleDrowModeValue,
    setDrowModeValue,
    getDrowModeValue,

    toggleRulerVisibility,
    setRulerVisibility,
    getRulerVisibility,

  };
});
