import { NewsItem } from '@/types/newsTypes'
import axios from 'axios'

// Константы
const API_URL = 'https://dev.vardek.online'
const BASE_API_URL = `${API_URL}/api/modeller/news`
const REQUEST_TIMEOUT = 10000

// Сервис
export const NewsService = {
  async getNewsList(): Promise<NewsItem[]> {
    try {
      const { data } = await axios.get(
        `${BASE_API_URL}/getlist/`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: REQUEST_TIMEOUT
        }
      )
      return data // или data.items, в зависимости от структуры ответа
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Ошибка при получении новостей')
      }
      throw error
    }
  }
}