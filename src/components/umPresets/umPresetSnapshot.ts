// Сборка data пресета из экземпляра сцены и подписи для карточки списка.
// Пресеты доступны только товарам с сеткой УМ (CONFIG.MODULEGRID) и
// гардеробной системе (CONFIG.WARDROBEGRID) — см. getUMGridFromConfig.

import { getUMGridFromConfig, isWardrobeSystemProduct } from '@/components/UMconstructor/wardrobe/WardrobeSystem.ts'
import { UM_PRESET_DATA_VERSION } from './types'
import type { UmPresetData, UmPresetKind, UmPresetSize } from './types'

// UNIFORM_TEXTURE — привязка фасада к группе переходящей текстуры ТЕКУЩЕЙ
// сцены: в пресет уходит сброшенной, иначе вставленный модуль тянул бы группу
// из чужого проекта.
const EMPTY_UNIFORM_TEXTURE = {
  group: null,
  level: null,
  index: null,
  column_index: null,
  backupFasadId: null,
  color: null,
}

/** Товар поддерживает пресеты, если у него есть сетка УМ или гардеробной. */
export const isUmPresetProduct = (product: any): boolean =>
  !!getUMGridFromConfig(product?.userData?.PROPS?.CONFIG).grid

const toSize = (value: any): UmPresetSize | null => {
  const width = Number(value?.width)
  const height = Number(value?.height)
  const depth = Number(value?.depth)

  if (![width, height, depth].every(Number.isFinite)) return null

  return { width, height, depth }
}

/**
 * Снимок экземпляра для сохранения в пресет.
 *
 * app — Application (нужен его _roomManager.saveSingle), product — объект
 * сцены, gridOverride — сетка из открытого 2D-редактора, которая ещё не
 * записана в товар (кладётся в тот же ключ CONFIG, откуда сетка читается).
 * null — товар без сетки УМ/гардеробной или снимок собрать не удалось.
 */
export const buildUmPresetData = (app: any, product: any, gridOverride?: any): UmPresetData | null => {
  const roomManager = app?._roomManager
  const PROPS = product?.userData?.PROPS

  if (!roomManager?.saveSingle || !PROPS?.CONFIG) return null
  if (!isUmPresetProduct(product)) return null

  // duplicate=false: флаг дублирования чистит UNIFORM_TEXTURE на ЖИВОМ товаре,
  // а сохранение пресета сцену менять не должно.
  const saved = roomManager.saveSingle(product, false)
  if (!saved) return null

  // JSON-прогон — тот же путь, что у дублирования (saveSingle -> stringify ->
  // loadSingle): отсекает THREE-объекты, прокси Vue и несериализуемое.
  const snapshot = JSON.parse(
    JSON.stringify({
      id: saved.id,
      type: saved.type,
      size: saved.size,
      data: saved.data,
    })
  )

  if (!snapshot?.data?.CONFIG) return null

  snapshot.data.CONFIG.UNIFORM_TEXTURE = { ...EMPTY_UNIFORM_TEXTURE }

  if (gridOverride) {
    const { key } = getUMGridFromConfig(PROPS.CONFIG)
    snapshot.data.CONFIG[key] = JSON.parse(JSON.stringify(gridOverride))
  }

  const productId = Number(snapshot.id)
  const kind: UmPresetKind = isWardrobeSystemProduct(productId) ? 'wardrobe' : 'um'

  return {
    meta: {
      version: UM_PRESET_DATA_VERSION,
      kind,
      productId,
      productName: String(PROPS.NAME ?? ''),
      size: toSize(snapshot.size ?? PROPS.CONFIG.SIZE),
      savedAt: new Date().toISOString(),
    },
    snapshot,
  }
}

const pad = (value: number): string => String(value).padStart(2, '0')

/** Дефолтное имя в диалоге сохранения: «Пресет 05.11.2026 19:42». */
export const defaultUmPresetName = (date: Date = new Date()): string =>
  `Пресет ${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ` +
  `${pad(date.getHours())}:${pad(date.getMinutes())}`

/** «1200 × 2400 × 600 мм» для карточки и диалога. */
export const formatUmPresetSize = (size: UmPresetSize | null): string =>
  size ? `${Math.round(size.width)} × ${Math.round(size.height)} × ${Math.round(size.depth)} мм` : ''

/** Дата создания из ответа бека («2024-11-05 12:00:00») в «05.11.2024 12:00». */
export const formatUmPresetDate = (createdAt: string): string => {
  const parsed = new Date(String(createdAt).replace(' ', 'T'))
  if (Number.isNaN(parsed.getTime())) return String(createdAt ?? '')

  return `${pad(parsed.getDate())}.${pad(parsed.getMonth() + 1)}.${parsed.getFullYear()} ` +
    `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`
}
