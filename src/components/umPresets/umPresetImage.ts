// Снимок модуля для карточки пресета: кроп текущего 3D-кадра по экранной
// проекции габаритов товара. Уходит на бек строкой previewPicture
// (data:image/jpeg;base64,...) и подставляется в <img src> как есть.

import * as THREE from 'three'
import { toRaw } from 'vue'
import { BASE_DOMAIN } from '@/utils/originalDomain'

export const PREVIEW_PICTURE_WIDTH = 400
export const PREVIEW_PICTURE_HEIGHT = 300
const PREVIEW_PICTURE_QUALITY = 0.7

// Запас вокруг габаритов, доля от стороны кропа: модуль не упирается в край.
const CROP_PADDING = 0.12
// Меньше — кроп вырожденный (объект за кадром или камера смотрит мимо).
const MIN_CROP_SIDE = 16

const ASPECT = PREVIEW_PICTURE_WIDTH / PREVIEW_PICTURE_HEIGHT

type Rect = { x: number; y: number; width: number; height: number }

/** Экранный прямоугольник габаритов объекта в пикселях канваса. */
const projectBounds = (
  object: THREE.Object3D,
  camera: THREE.Camera,
  canvasWidth: number,
  canvasHeight: number
): Rect | null => {
  const box = new THREE.Box3().setFromObject(object)
  if (box.isEmpty()) return null

  const corner = new THREE.Vector3()
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (let i = 0; i < 8; i++) {
    corner.set(
      i & 1 ? box.max.x : box.min.x,
      i & 2 ? box.max.y : box.min.y,
      i & 4 ? box.max.z : box.min.z
    ).project(camera)

    const x = (corner.x * 0.5 + 0.5) * canvasWidth
    const y = (-corner.y * 0.5 + 0.5) * canvasHeight

    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }

  if (![minX, minY, maxX, maxY].every(Number.isFinite)) return null

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

/** Запас + приведение к 4:3 + обрезка по границам кадра. */
const fitCrop = (rect: Rect, canvasWidth: number, canvasHeight: number): Rect | null => {
  const centerX = rect.x + rect.width / 2
  const centerY = rect.y + rect.height / 2

  let width = rect.width * (1 + CROP_PADDING * 2)
  let height = rect.height * (1 + CROP_PADDING * 2)

  // Доращиваем меньшую сторону до пропорций превью, чтобы кадр не растягивался.
  if (width / height > ASPECT) height = width / ASPECT
  else width = height * ASPECT

  width = Math.min(width, canvasWidth)
  height = Math.min(height, canvasHeight)

  if (width < MIN_CROP_SIDE || height < MIN_CROP_SIDE) return null

  const x = Math.min(Math.max(centerX - width / 2, 0), canvasWidth - width)
  const y = Math.min(Math.max(centerY - height / 2, 0), canvasHeight - height)

  return { x, y, width, height }
}

/**
 * Перерисовка кадра. THREE-объекты идут только в raw-виде: сцена и товар
 * лежат в ref'ах Vue, а через reactive-прокси рендерер спотыкается о
 * read-only non-configurable поля матриц (modelViewMatrix). Сбой рендера не
 * отменяет снимок — в буфере остаётся предыдущий кадр.
 */
const safeRender = (app: any): void => {
  try {
    app._renderer.render(app._scene, app._camera)
  } catch (error) {
    console.warn('Пресет: кадр не перерисован перед снимком', error)
  }
}

/**
 * Кадр без служебной графики: обводка выделения и линейки на снимке не нужны.
 * CSS2D-лейблы (цифры размеров) живут вне WebGL-канваса и не попадают сюда
 * по определению.
 */
const renderClean = (app: any, draw: () => void) => {
  const boxHelper = app?._customBoxHelper?._boxHelperCheck
  const ruler = app?._ruler
  const wasBoxHelperVisible = boxHelper?.visible

  if (boxHelper) boxHelper.visible = false
  ruler?.toggleRulerVisibility?.(false)

  try {
    safeRender(app)
    draw()
  } finally {
    if (boxHelper) boxHelper.visible = wasBoxHelperVisible ?? true
    ruler?.toggleRulerVisibility?.(true)
    safeRender(app)
  }
}

/**
 * Снимок товара для пресета. null — снять не удалось (нет рендерера, объект
 * вне кадра); сохранение пресета в этом случае идёт без картинки.
 */
export const captureUmPresetImage = (app: any, product: THREE.Object3D | null): string | null => {
  // Снимаем реактивные обёртки: дальше работаем только с настоящими
  // THREE-объектами (см. safeRender).
  const rawApp = app ? toRaw(app) : null
  const rawProduct = product ? toRaw(product) : null

  const renderer = rawApp?._renderer
  const camera = rawApp?._camera
  const canvas = renderer?.domElement as HTMLCanvasElement | undefined

  if (!renderer || !camera || !canvas || !rawProduct) return null

  try {
    const bounds = projectBounds(rawProduct, camera, canvas.width, canvas.height)
    if (!bounds) return null

    const crop = fitCrop(bounds, canvas.width, canvas.height)
    if (!crop) return null

    const out = document.createElement('canvas')
    out.width = PREVIEW_PICTURE_WIDTH
    out.height = PREVIEW_PICTURE_HEIGHT

    const ctx = out.getContext('2d')
    if (!ctx) return null

    // JPEG не хранит альфу: под прозрачными пикселями иначе будет чёрный.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, PREVIEW_PICTURE_WIDTH, PREVIEW_PICTURE_HEIGHT)

    renderClean(rawApp, () => {
      ctx.drawImage(
        canvas,
        crop.x, crop.y, crop.width, crop.height,
        0, 0, PREVIEW_PICTURE_WIDTH, PREVIEW_PICTURE_HEIGHT
      )
    })

    return out.toDataURL('image/jpeg', PREVIEW_PICTURE_QUALITY)
  } catch (error) {
    console.error('Пресет: не удалось снять превью', error)
    return null
  }
}

/** Ожидание загрузки текстур, мс. Дальше снимаем что есть. */
const TEXTURES_TIMEOUT = 3000

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => resolve()))

/**
 * Ждёт, пока догрузятся текстуры: материал создаётся сразу, а map ему
 * присваивается в колбэке загрузчика, поэтому кадр сразу после пересборки
 * ловит голую геометрию.
 *
 * Все загрузчики проекта сидят на общем LoadingManager (Resources.ts), но
 * публичных счётчиков у него нет. Поэтому добавляем собственный элемент
 * (itemStart/itemEnd): если других загрузок нет, onLoad срабатывает тут же,
 * иначе — когда закончится вся очередь. По таймауту снимаем как есть.
 */
const waitForTexturesReady = async (app: any, timeout = TEXTURES_TIMEOUT): Promise<void> => {
  const manager = app?._resources?.loadingManager

  if (!manager?.itemStart || !manager?.itemEnd) {
    await nextFrame()
    return
  }

  const previousOnLoad = manager.onLoad

  await new Promise<void>((resolve) => {
    let settled = false

    const finish = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      manager.onLoad = previousOnLoad
      resolve()
    }

    const timer = setTimeout(finish, timeout)

    manager.onLoad = () => {
      previousOnLoad?.()
      finish()
    }

    const probe = `um-preset-probe-${Date.now()}`
    manager.itemStart(probe)
    manager.itemEnd(probe)
  })

  // Колбэки, которые ставят material.map, идут микротаском после onLoad
  // (Resources.startLoading оборачивает загрузку в промис) — пропускаем кадр.
  await nextFrame()
}

/**
 * Снимок с ожиданием текстур. Используется обеими точками сохранения, чтобы в
 * карточку не попадала голая геометрия.
 */
export const captureUmPresetImageAsync = async (
  app: any,
  product: THREE.Object3D | null
): Promise<string | null> => {
  await waitForTexturesReady(app)
  return captureUmPresetImage(app, product)
}

/**
 * Значение previewPicture из ответа -> src для <img>. Договорённость — dataURL в
 * обе стороны, но путь к файлу ('/upload/...') тоже принимаем: бек может
 * начать сохранять картинку файлом. Пустая строка и заглушка
 * 'data:image/jpeg;base64,' без тела считаются отсутствием снимка.
 */
export const resolveUmPresetImage = (raw: unknown): string | null => {
  if (typeof raw !== 'string') return null

  const value = raw.trim()
  if (!value) return null

  if (value.startsWith('data:')) {
    const [, body = ''] = value.split(',')
    return body.length > 0 ? value : null
  }

  if (value.startsWith('http')) return value
  if (value.startsWith('/')) return `https://${BASE_DOMAIN}${value}`

  return null
}
