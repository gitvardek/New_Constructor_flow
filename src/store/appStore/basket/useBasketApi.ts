//@ts-nocheck

import { readonly, ref } from 'vue'
import { BasketService } from '@/services/basketService'
import type { IBasket, IBasketResponse, BasketRequest } from '@/types/basket'
import { useAppData } from '@/store/appliction/useAppData'


export function useBasketApi() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const appDataStore = useAppData()

  const syncBasketWithServer = async (basketItems: IBasket[]): Promise<IBasketResponse | null> => {
    loading.value = true
    error.value = null

    try {
      // if (basketItems.length === 0) {
      //   return null
      // }

      const request: BasketRequest = {
        BASKET: basketItems,
        // TYPE_PRICE: 25,
        style:appDataStore.appData?.CITY?.style,
        
      }

      // Выполняем оба запроса параллельно для оптимизации
      // const [basketResponse, productDelayResponse] = await Promise.all([
      //   BasketService.getBasket(request),
      //   BasketService.getProductDelay(request)
      // ])

      const response = await BasketService.getBasket(request)
      // const responsenew = await BasketService.getProductDelay(request)
      return { ...response.DATA }
      
      // Объединяем результаты в один объект
      // return {
      //   ...basketResponse.DATA,
      //   productDelay: productDelayResponse.DATA // или другое поле, в зависимости от структуры ответа
      // }
    } catch (err: any) {
      error.value = err.message || 'Ошибка при синхронизации корзины'
      console.error('Sync basket error:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  const syncBasketProductDelay = async (basketItems: IBasket[]): Promise<IBasketResponse | null> => {
    loading.value = true
    error.value = null

    try {
      // if (basketItems.length === 0) {
      //   return null
      // }

      const request: BasketRequest = {
        BASKET: basketItems,
        TYPE_PRICE: 25,
      }

      // Выполняем оба запроса параллельно для оптимизации
      // const [basketResponse, productDelayResponse] = await Promise.all([
      //   BasketService.getBasket(request),
      //   BasketService.getProductDelay(request)
      // ])

      // const response = await BasketService.getBasket(request)
      const response = await BasketService.getProductDelay(request)
      return response.DATA 
      
      // Объединяем результаты в один объект
      // return {
      //   ...basketResponse.DATA,
      //   productDelay: productDelayResponse.DATA // или другое поле, в зависимости от структуры ответа
      // }
    } catch (err: any) {
      error.value = err.message || 'Ошибка при синхронизации корзины'
      console.error('Sync basket error:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  const syncInvoice = async (basketItems: IBasket[], technologistBasket: boolean|Object = false): Promise<IBasketResponse | null> => {
    loading.value = true
    error.value = null

    try {
      if (basketItems.length === 0) {
        return null
      }

      const request: BasketRequest = {
        BASKET: basketItems,
        TYPE_PRICE: 25,
      }

      if(technologistBasket)
        request.technologistBasket = technologistBasket

      const response = await BasketService.invoceBasket(request)
      return response?.DATA?.type !== 'error' ? response.DATA : null
    } catch (err: any) {
      error.value = err.message || 'Ошибка при синхронизации корзины'
      console.error('Sync invoice error:', err)
      return null
    } finally {
      loading.value = false
    }
  }



  return {
    loading: readonly(loading),
    error: readonly(error),
    syncBasketWithServer,
    syncBasketProductDelay,
    syncInvoice,
  }
}