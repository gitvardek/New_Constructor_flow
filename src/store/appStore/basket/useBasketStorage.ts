import { ref, watch } from 'vue'
import type { IBasket } from '@/types/basket'

const STORAGE_KEY = 'basket-data'

export function useBasketStorage() {
  const mainConstructor = ref<IBasket[]>([])
  const mainCatalog = ref<IBasket[]>([])

  // Инициализация из localStorage
  const initializeFromStorage = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)

      if (saved) {
        const parsed = JSON.parse(saved)
        mainConstructor.value = parsed.mainConstructor || []
        mainCatalog.value = parsed.mainCatalog || []
      }
    } catch (e) {
      console.error('Error parsing saved basket data', e)
    }
  }

  // Автосохранение при изменениях
  watch([mainConstructor, mainCatalog], () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        mainConstructor: mainConstructor.value,
        mainCatalog: mainCatalog.value
      }))
    } catch (e) {
      console.error('Error saving basket data', e)
    }
  }, { deep: true })

  const clearStorage = () => {
    localStorage.removeItem(STORAGE_KEY)
    mainConstructor.value = []
    mainCatalog.value = []
  }

  return {
    mainConstructor,
    mainCatalog,
    initializeFromStorage,
    clearStorage,
  }
}