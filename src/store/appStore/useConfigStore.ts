// @ts-nocheck
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useAppData } from '@/store/appliction/useAppData'

export const useConfigStore = defineStore('config', () => {
 
  const appDataStore = useAppData()

  const oldPrice = computed(() => 
    appDataStore.appData?.SETTINGS?.old_price?.VALUE
  )

  const settingsType = computed(() => 
    appDataStore.appData?.SETTINGS?.type || ""
  )
  const styleData = computed(() => 
    appDataStore.appData?.CITY?.style || ""
  )
  const configData = computed(() => 
    appDataStore.appData?.CITY?.config || ""
  )
  const cityID = computed(() => 
    appDataStore.appData?.CITY?.ID || ""
  )

  const isFeedbackProject = computed(() =>
    appDataStore.appData?.SETTINGS?.type?.VALUE_XML_ID === "feadback_project"
  )

  const getArticleByProductId = (productId: string | number) => {
    if (!appDataStore.getAppData || !productId) return ''
    
    const catalog = appDataStore.getAppData?.CATALOG
    const products = catalog?.PRODUCTS
    const item = products?.[productId]
    
    if (!item) return ''
    
    const dataPetrovich = catalog?.PRODUCTS?.[item?.ID]?.DATA_PETROVICH
    const articleData = appDataStore.getAppData?.article?.[dataPetrovich]
    
    return articleData?.PROPERTIES?.ARTICLE?.VALUE ? `- артикул ${articleData?.PROPERTIES?.ARTICLE?.VALUE}` : ''
  }

  const getArticleByFasadId = (productId: string | number) => {
    if (!appDataStore.getAppData || !productId) return ''

    const articleData = appDataStore.getAppData?.article?.[productId]    
    return articleData?.PROPERTIES?.ARTICLE?.VALUE ? `- артикул ${articleData?.PROPERTIES?.ARTICLE?.VALUE}` : ''
  }



  return {
    // Данные
    oldPrice,
    settingsType,
    isFeedbackProject,
    styleData,
    configData,
    
    // Методы
    getArticleByProductId,
    getArticleByFasadId
  }
})