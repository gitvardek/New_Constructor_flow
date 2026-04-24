// @ts-nocheck


import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { NewsService } from '@/services/newsService'
import type { NewsItem } from '@/types/newsTypes'

export const useNewsStore = defineStore('news', () => {
  const newsList = ref<NewsItem[]>([])
  const isLoading = ref(false)
  const error = ref({
    isError: false,
    message: ''
  })

  // Вычисляемое свойство для последних 3 новостей
  const latestNews = computed(() => {
    return [...newsList.value].slice(0, 3)
  })

  // Вычисляемое свойство для форматирования дат
  const formattedNews = computed(() => {
    return newsList.value.map(news => ({
      ...news,
      formattedDate: new Date(news.date).toLocaleDateString('ru-RU')
    }))
  })

  const fetchNews = async () => {
    try {
      isLoading.value = true
      error.value = { isError: false, message: '' }
      
      const data = await NewsService.getNewsList()
      newsList.value = data.DATA
    } catch (err) {
      handleError(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const getNewsById = (id: number) => {
    return newsList.value.find(news => news.id === id)
  }

  const handleError = (err: unknown) => {
    let message = 'Произошла ошибка при загрузке новостей'
    
    if (err instanceof Error) {
      message = err.message
    }
    
    error.value = {
      isError: true,
      message
    }
    
    // Автоматическое скрытие ошибки через 3 секунды
    setTimeout(() => {
      error.value.isError = false
    }, 3000)
  }

  return {
    newsList,
    isLoading,
    error,
    latestNews,
    formattedNews,
    fetchNews,
    getNewsById
  }
})
