// Пресет — сохранённый экземпляр УМ или гардеробной системы для повторной
// вставки в этот же или новый проект.
//
// Бек (POST /api/modellerjwt/productconfig/*) хранит запись как
// {id, name, userId, data, isVardek, createdAt}. Структура внутри data целиком
// наша и версионируется UM_PRESET_DATA_VERSION; метода update у эндпоинта нет,
// поэтому пресет неизменяем: только создать или удалить.

/** Версия структуры data. Повышать при несовместимых правках snapshot. */
export const UM_PRESET_DATA_VERSION = 1

export type UmPresetKind = 'um' | 'wardrobe'

export type UmPresetSize = { width: number; height: number; depth: number }

/** Мета для карточки списка: читается без разбора самого снимка. */
export type UmPresetMeta = {
  version: number
  kind: UmPresetKind
  productId: number
  productName: string
  size: UmPresetSize | null
  savedAt: string
}

/**
 * Снимок экземпляра = RoomManager.saveSingle без position/rotation/obb/
 * basketId: место в сцене задаёт вставка, а не пресет. Точка вставки берётся
 * из snapshot.data.CONFIG.POSITION (RoomManager.insertPresetProd).
 */
export type UmPresetSnapshot = {
  id: number
  type: string
  size: UmPresetSize | null
  data: Record<string, any>
}

export type UmPresetData = {
  meta: UmPresetMeta
  snapshot: UmPresetSnapshot
}

/**
 * Запись списка. data === null — запись не нашего формата (вставка запрещена).
 * image — поле previewPicture (снимок модуля, dataURL), лежит рядом с data, а не
 * внутри неё; null — пресет сохранён без снимка.
 */
export type UmPreset = {
  id: number
  name: string
  userId: number | null
  isVardek: boolean
  createdAt: string
  data: UmPresetData | null
  image: string | null
}

export type UmPresetPage = {
  items: UmPreset[]
  total: number
  page: number
  pageSize: number
  pages: number
}

export type UmPresetsFilter = 'all' | 'mine' | 'vardek'
