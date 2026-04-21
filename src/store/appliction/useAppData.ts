// @ts-nocheck
import { COOKIE_NAMES, getCookie } from '@/components/authorization/utils/cookieUtils'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useAuthStore } from '@/store/appStore/authStore'
import { BASE_DOMAIN } from "@/utils/originalDomain";

export const useAppData = defineStore('AppData', () => {
  const appData = ref<{ [key: string]: any }>({})
  const indexedDataBase = ref<IDBDatabase | null>(null)
  const isLoading = ref(false)
  const isLoaded = ref(false)

  const fetchRemoteData = async () => {
    isLoading.value = true;
    const token = getCookie(COOKIE_NAMES.AUTH_TOKEN);
    console.log('Start fetch from API')
    const url = new URL(`https://${BASE_DOMAIN}/api/modellerjwt/auth/getdata/`)
    let currentURL = window.location.href;
    url.searchParams.append('url', currentURL)
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    })
    if (!response.ok) throw new Error(`Ошибка сети: ${response.status}`)

    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      const data = await response.json()
      console.log('Полученные JSON данные:', data.DATA)
      return data.DATA
    } else {
      const text = await response.text()
      console.log('Полученные текстовые данные:', text)
      return null
    }
  }

  // const initIndexedDB = (): Promise<IDBDatabase> => {
  //   return new Promise((resolve, reject) => {
  //     const openRequest = indexedDB.open('storage', 1)
      
  //     openRequest.onupgradeneeded = (event) => {
  //       const db = (event.target as IDBOpenDBRequest).result
  //       if (!db.objectStoreNames.contains('data')) {
  //         db.createObjectStore('data', { keyPath: 'name' })
  //       }
  //     }
      
  //     openRequest.onsuccess = () => resolve(openRequest.result)
  //     openRequest.onerror = () => reject(openRequest.error)
  //   })
  // }

  const initIndexedDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      // Всегда открываем с новой версией, чтобы гарантировать создание store
      const openRequest = indexedDB.open('storage', 1)
      
      openRequest.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        // Всегда создаем store при обновлении
        if (!db.objectStoreNames.contains('data')) {
          db.createObjectStore('data', { keyPath: 'name' })
        }
      }
      
      openRequest.onsuccess = () => {
        const db = openRequest.result
        // Если store все еще не создан (например, при первой загрузке),
        // закрываем и пересоздаем базу
        if (!db.objectStoreNames.contains('data')) {
          db.close()
          indexedDB.deleteDatabase('storage')
          initIndexedDB().then(resolve).catch(reject)
        } else {
          resolve(db)
        }
      }
      
      openRequest.onerror = () => reject(openRequest.error)
    })
  }

  const getFromIndexedDB = (db: IDBDatabase): Promise<any | null> => {
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction('data', 'readonly')
        const store = transaction.objectStore('data')
        const req = store.getAll()
        req.onsuccess = () => resolve(req.result.length ? req.result[0] : null)
        req.onerror = () => reject(req.error)
      } catch (error) {
        reject(error)
      }
    })
  }

  const saveToIndexedDB = (db: IDBDatabase, value: any) => {
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction('data', 'readwrite')
        const store = transaction.objectStore('data')
        
        // Сначала удаляем существующие данные
        const deleteRequest = store.delete('db')
        deleteRequest.onsuccess = () => {
          // Затем сохраняем новые
          const request = store.add({ name: 'db', ...value })
          request.onsuccess = () => resolve(true)
          request.onerror = () => reject(request.error)
        }
        deleteRequest.onerror = () => reject(deleteRequest.error)
      } catch (error) {
        reject(error)
      }
    })
  }

  const clearIndexedDB = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('storage', 1)
      
      request.onsuccess = function(event) {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Проверяем существование object store перед операцией
        if (!db.objectStoreNames.contains('data')) {
          console.log('Object store "data" не существует, создаем...')
          const transaction = db.transaction(['data'], 'readwrite')
          resolve()
          return
        }
        
        const transaction = db.transaction('data', 'readwrite')
        const store = transaction.objectStore('data')
        const clearRequest = store.clear()
        
        clearRequest.onsuccess = function() {
          console.log('Object store "data" очищен')
          resolve()
        }
        
        clearRequest.onerror = function(event) {
          console.error('Ошибка очистки:', event)
          reject(new Error('Ошибка очистки IndexedDB'))
        }
      }
      
      request.onerror = function(event) {
        console.error('Ошибка открытия IndexedDB:', event)
        reject(new Error('Не удалось открыть IndexedDB'))
      }
      
      request.onupgradeneeded = function(event) {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains('data')) {
          db.createObjectStore('data', { keyPath: 'name' })
        }
      }
    })
  }

  const setAppData = (newData: any) => {
    appData.value = { ...appData.value, ...newData }
  }

  const initAppData = async () => {
    const mainLoader = document.querySelector('#main-loader')
    if (mainLoader) {
      mainLoader.style.display = 'block'
    }

    const authStore = useAuthStore()
    await authStore.fetchUserData()

    if (import.meta.env.DEV) {
      if (isLoaded.value || isLoading.value) return
    } else {
      console.warn('🧹 [BUILD] Очистка IndexedDB перед инициализацией приложения')
      try {
        await clearIndexedDB()
      } catch (error) {
        console.warn('Не удалось очистить IndexedDB:', error)
      }
    }

    isLoading.value = true
    try {
      indexedDataBase.value = await initIndexedDB()
      let localData = await getFromIndexedDB(indexedDataBase.value)
      
      if (localData) {
        console.log('Загружено из IndexedDB', localData)
        setAppData(localData)
        isLoaded.value = true
        return
      }
      
      const remoteData = await fetchRemoteData()
      if (remoteData) {
        setAppData(remoteData)
        await saveToIndexedDB(indexedDataBase.value, remoteData)
        isLoaded.value = true
      }
    } catch (err) {
      console.error('Ошибка инициализации данных:', err)
      // Если произошла ошибка с IndexedDB, пробуем загрузить только удаленные данные
      try {
        const remoteData = await fetchRemoteData()
        if (remoteData) {
          setAppData(remoteData)
          isLoaded.value = true
        }
      } catch (fetchError) {
        console.error('Не удалось загрузить удаленные данные:', fetchError)
      }
    } finally {
      // await authStore.checkUser()
      isLoading.value = false
      isLoaded.value = true
      
      const mainLoader = document.querySelector('#main-loader')
      if (mainLoader) {
        mainLoader.style.display = 'none'
      }
    }
  }

  const getAppData = computed(() => {
    return appData.value
  })

  return {
    appData,
    getAppData,
    isLoaded,
    isLoading,
    setAppData,
    initAppData,
  }
})