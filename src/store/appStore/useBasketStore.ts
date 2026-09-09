//@ts-nocheck
import { defineStore } from 'pinia'
import { computed, readonly, ref } from 'vue'
import { useBasketApi } from '@/store/appStore/basket/useBasketApi'
import { useBasketStorage } from '@/store/appStore/basket/useBasketStorage'
import { useRoomContantData } from '../appliction/useRoomContantData'
import { createBasketItem, createGlobalData, updateGlobalData } from '@/components/Basket/helper/basketMapper'
import { TTotalProps } from "@/types/types";
import type { IBasket, IBasketResponse, BasketItemType } from '@/types/basket'
import { useAppData } from '../appliction/useAppData'

// Вспомогательные функции

// Генерация ID
const generateUniqueId = (): string =>
  `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// Формирования массива ручик фасадов
const countHandles = (items: any[]): number[] => {

  const handles: number[] = []

  items.forEach(item => {
    if (item?.HANDLES) {
      item.HANDLES.forEach(handle => {
        const hId = handle?.ID ?? handle?.id
        if (hId && hId !== 69920) {
          handles.push(hId)
        }
      })
    }
    else {
      item.PROPS?.FASADE?.forEach(facade => {
        const hId = facade.HANDLES?.ID ?? facade.HANDLES?.id
        if (hId && hId !== 69920) {
          handles.push(hId)
        }
      })
    }
  })

  return handles
}

// Преобразование данных для получение цены ручик фасадов
const transformCountHandles = (numbers: number[]) => {
  const countMap = new Map();
  // Подсчитываем повторения
  numbers.forEach(num => {
    countMap.set(num, (countMap.get(num) || 0) + 1);
  });

  return Array.from(countMap.entries()).map(([id, quantity]) => ({
    BASKETID: generateUniqueId(),
    PRODUCT: id,
    PROPS: {
      ID: id,
      IGNORE_SIZE: 0,
      NOT_DISCOUNT: 1.25,
    },
    QUANTITY: quantity,
    TYPE: "catalog",
  }));
}

export const useBasketStore = defineStore('basket', () => {
  // Композиции
  const { mainConstructor, mainCatalog, initializeFromStorage, clearStorage } = useBasketStorage()
  const { loading, error, syncBasketWithServer, syncBasketProductDelay, syncInvoice } = useBasketApi()
  const appDataStore = useAppData();

  // State
  const basketData = ref<IBasketResponse | null>(null)
  const basketDelay = ref<any[]>([]) // Указал тип any[] для лучшей типизации


  // Инициализация
  // initializeFromStorage()

  // Getters
  const totalItems = computed(() => mainConstructor.value.length + mainCatalog.value.length)
  const totalPrice = computed(() => basketData.value?.basket?.sum ?? 0)
  const totalOldPrice = computed(() => basketData.value?.basket?.sumOld ?? 0)
  const allBasketItems = computed(() => [...mainConstructor.value, ...mainCatalog.value])
  const allBasketDelay = computed(() => basketDelay.value) // Теперь будет реактивно обновляться

  // Actions
  const addFromCatalog = (productData: any) => {
    const basketItem: IBasket = {
      BASKETID: generateUniqueId(),
      PRODUCT: productData.ID,
      PROPS: productData,
      QUANTITY: productData.QUANTITY,
      TYPE: 'catalog',
    }

    mainCatalog.value.push(basketItem)
    syncBasket();
  }

  const addFromScene = () => {

    const roomContantData = useRoomContantData().getRoomContantDataForBasket
    let roomDataCopy: any
    try {
      roomDataCopy = typeof roomContantData === 'string' ? JSON.parse(roomContantData) : roomContantData
    } catch {
      roomDataCopy = []
    }

    const filtered = getFilteredData()

    const sceneItems = filtered
      .map((obj: TTotalProps, key: string) =>
        createBasketItem(obj.data, mainConstructor.value.length, obj.basketId)
      )

    const globalData = createGlobalData(filtered)

    mainConstructor.value = [...sceneItems, ...globalData]

  }

  /** 
   * Вспомогательные функции 
  */

  const getFilteredData = () => {
    const roomContantData = useRoomContantData().getRoomContantDataForBasket
    let roomDataCopy: any
    try {
      roomDataCopy = typeof roomContantData === 'string' ? JSON.parse(roomContantData) : roomContantData
    } catch {
      roomDataCopy = []
    }

    return Object.values(roomDataCopy)
      .filter((obj: any) => obj.data.PRODUCT)
      .filter((obj: any) => {
        const itemId = obj.data.CONFIG?.ID;
        const decorIds = appDataStore.getAppData.decor || [];
        return !decorIds.includes(itemId);
      })
  }

  /** ---------------------------------------------------------- */

  const removeItem = (type: string, basketId: string) => {

    const list = (type === 'scene' || type === 'umscene') ? mainConstructor : mainCatalog
    const index = list.value.findIndex(item => String(item.BASKETID) === String(basketId))

    if (index !== -1) {
      list.value.splice(index, 1)
      updateGlobalData()
      syncBasket();
    }
  }

  const removeFromBasket = (basketId: string, type: string) => {
    removeItem(type, basketId)
  }

  const updateQuantity = (basketId: string, type: string, quantity: number) => {
    const list = type === 'catalog' ? mainCatalog.value : mainConstructor.value
    const item = list.find(i => String(i.BASKETID) === String(basketId))

    if (item) {
      item.QUANTITY = quantity
      syncBasket();
    }
  }

  const clearBasket = () => {
    clearStorage()
    basketData.value = null
    syncBasket();
  }

  const loadBasket = async (data: any) => {
    // console.log('datadata', data);
    mainConstructor.value = data.scene;
    mainCatalog.value = data.catalog;
    // console.log('allBasketItems.value', allBasketItems.value);
    syncBasket();
  }

  const creatDataBasket = () => {
    const currentHandlesData = countHandles(mainConstructor.value)
    const data = currentHandlesData.length > 0
      ? [...allBasketItems.value, ...transformCountHandles(currentHandlesData)]
      : allBasketItems.value
    return {
      BASKET: data,
      TYPE_PRICE: 25,
    }
  }

  const syncBasket = async (): Promise<IBasketResponse | null> => {

    const currentHandlesData = countHandles(mainConstructor.value)
    const data = currentHandlesData.length > 0
      ? [...allBasketItems.value, ...transformCountHandles(currentHandlesData)]
      : allBasketItems.value
    const result = await syncBasketWithServer(data)
    if (result) {
      basketData.value = result
    }

    return result
  }
  const syncBasketMulti = async (data): Promise<IBasketResponse | null> => {

    const result = await syncBasketWithServer(data)
    if (result) {
      basketData.value = result
    }

    return result
  }
  const syncBasketDelay = async (): Promise<IBasketResponse | null> => {
    const currentHandlesData = countHandles(mainConstructor.value)
    const data = currentHandlesData.length > 0
      ? [...allBasketItems.value, ...transformCountHandles(currentHandlesData)]
      : allBasketItems.value

    const result = await syncBasketProductDelay(data)
    console.log('result', result);
    // Используем basketDelay.value для реактивного обновления
    if (result) {
      basketDelay.value = Array.isArray(result) ? result : [result]
    } else {
      basketDelay.value = []
    }

    return result
  }

  const syncInvoce = async (technologistBasket: boolean | Object = false, dumpProjectId?: string | number, explicitItems?: any[]): Promise<IBasketResponse | null> => {
    let data: any[]
    if (explicitItems) {
      data = explicitItems
    } else {
      const currentHandlesData = countHandles(mainConstructor.value)
      data = currentHandlesData.length > 0
        ? [...allBasketItems.value, ...transformCountHandles(currentHandlesData)]
        : allBasketItems.value
    }

    const result = await syncInvoice(data, technologistBasket, dumpProjectId)
    return result
  }

  const updateBasket = (newData: IBasketResponse | null) => {
    basketData.value = newData
  }


  return {
    // State
    basketData: readonly(basketData),
    basketDelay: readonly(basketDelay),
    loading: readonly(loading),
    error: readonly(error),

    // Getters
    mainConstructor: readonly(mainConstructor),
    mainCatalog: readonly(mainCatalog),
    totalItems,
    totalPrice,
    totalOldPrice,
    allBasketItems: readonly(allBasketItems),
    allBasketDelay: readonly(allBasketDelay),

    // Actions
    addFromCatalog,
    addFromScene,
    removeItem,
    removeFromBasket,
    updateQuantity,
    clearBasket,
    loadBasket,
    updateBasket,
    syncBasket,
    syncBasketMulti,
    syncBasketDelay,
    syncInvoce,
    creatDataBasket
  }
})