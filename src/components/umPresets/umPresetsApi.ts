// Клиент эндпоинтов пресетов: POST /api/modellerjwt/productconfig/{add,
// deleteById, getById, getByUser}, авторизация Bearer <jwt> из cookie.
// getByUser отдаёт свои пресеты плюс все пресеты Вардэк одним списком.

import axios from 'axios'
import { COOKIE_NAMES, getCookie } from '@/components/authorization/utils/cookieUtils'
import { BASE_DOMAIN } from '@/utils/originalDomain'
import { resolveUmPresetImage } from './umPresetImage'
import type { UmPreset, UmPresetData, UmPresetPage } from './types'

const BASE_API_URL = `https://${BASE_DOMAIN}/api/modellerjwt/productconfig`
const REQUEST_TIMEOUT = 20_000

/** Допустимые значения sortBy/sortOrder заданы контрактом эндпоинта. */
export type UmPresetsQuery = {
  page?: number
  pageSize?: number
  sortBy?: 'id' | 'name' | 'created_at'
  sortOrder?: 'asc' | 'desc'
}

const presetsAxios = axios.create({
  baseURL: BASE_API_URL,
  timeout: REQUEST_TIMEOUT,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
})

presetsAxios.interceptors.request.use((config) => {
  const token = getCookie(COOKIE_NAMES.AUTH_TOKEN)
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

const ERROR_BY_STATUS: Record<number, string> = {
  400: 'Некорректный запрос к серверу пресетов',
  401: 'Войдите в аккаунт, чтобы работать с пресетами',
  403: 'Нет прав на этот пресет',
  404: 'Пресет не найден',
  500: 'Ошибка сервера пресетов',
}

const toError = (error: unknown, fallback: string): Error => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    const message = (error.response?.data as any)?.message
    return new Error(message || (status ? ERROR_BY_STATUS[status] : null) || fallback)
  }
  // Ошибка конверта (unwrap) уже несёт текст от бека — не затираем её fallback'ом.
  if (error instanceof Error && error.message) return error

  return new Error(fallback)
}

/**
 * Ответы бека завёрнуты в конверт {CODE, MESSAGE?, DATA} — как в
 * catalogService и useAppData. Возвращаем DATA; тело без конверта отдаём как
 * есть. CODE не из 2xx бросаем: HTTP при этом может быть 200, и ошибка иначе
 * уехала бы в разбор как пустые данные.
 */
const unwrap = (payload: any): any => {
  if (!payload || typeof payload !== 'object' || !('DATA' in payload)) return payload

  const code = Number(payload.CODE)

  if (Number.isFinite(code) && (code < 200 || code > 299)) {
    throw new Error(payload.MESSAGE || ERROR_BY_STATUS[code] || `Ошибка сервера пресетов (${code})`)
  }

  return payload.DATA
}

const safeJson = (raw: string): unknown => {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

// data приходит объектом либо JSON-строкой (зависит от хранения на беке);
// запись чужого формата отдаём как null — такую карточку нельзя вставить.
const parseData = (raw: unknown): UmPresetData | null => {
  const value = typeof raw === 'string' ? safeJson(raw) : raw
  if (!value || typeof value !== 'object') return null

  const { meta, snapshot } = value as UmPresetData
  if (!meta || !snapshot?.data || !snapshot?.id) return null

  return { meta, snapshot }
}

const normalizePreset = (item: any): UmPreset => ({
  id: Number(item?.id),
  name: String(item?.name ?? ''),
  userId: item?.userId != null ? Number(item.userId) : null,
  isVardek: !!item?.isVardek,
  createdAt: String(item?.createdAt ?? ''),
  data: parseData(item?.data),
  image: resolveUmPresetImage(item?.previewPicture),
})

export const umPresetsApi = {
  /**
   * Создание. Возвращает id новой записи. previewPicture — снимок модуля
   * (dataURL); шлём только когда он снят, пустую строку бек не ждёт.
   */
  async add(name: string, data: UmPresetData, image?: string | null): Promise<number> {
    try {
      const body: Record<string, unknown> = { name, data }
      if (image) body.previewPicture = image

      const response = await presetsAxios.post('/add', body)
      return Number(unwrap(response.data)?.id)
    } catch (error) {
      throw toError(error, 'Не удалось сохранить пресет')
    }
  },

  /** Удаление. Чужие пресеты и пресеты Вардэк бек отклоняет (403). */
  async deleteById(id: number): Promise<void> {
    try {
      const response = await presetsAxios.post('/deleteById', { id })
      unwrap(response.data)
    } catch (error) {
      throw toError(error, 'Не удалось удалить пресет')
    }
  },

  async getById(id: number): Promise<UmPreset> {
    try {
      const response = await presetsAxios.post('/getById', { id })
      return normalizePreset(unwrap(response.data))
    } catch (error) {
      throw toError(error, 'Не удалось загрузить пресет')
    }
  },

  /**
   * Страница списка. select не передаём: карточке нужны мета и снимок, а
   * отдельного поля под мету у эндпоинта нет — по умолчанию приходят все поля,
   * включая data, поэтому вставка обходится без getById.
   */
  async getByUser(query: UmPresetsQuery = {}): Promise<UmPresetPage> {
    const { page = 1, pageSize = 20, sortBy = 'created_at', sortOrder = 'desc' } = query

    try {
      const response = await presetsAxios.post('/getByUser', { page, pageSize, sortBy, sortOrder })
      const payload = (unwrap(response.data) ?? {}) as any
      const items = Array.isArray(payload.items) ? payload.items.map(normalizePreset) : []

      return {
        items,
        total: Number(payload.total ?? items.length),
        page: Number(payload.page ?? page),
        pageSize: Number(payload.pageSize ?? pageSize),
        pages: Number(payload.pages ?? 1),
      }
    } catch (error) {
      throw toError(error, 'Не удалось загрузить список пресетов')
    }
  },
}
