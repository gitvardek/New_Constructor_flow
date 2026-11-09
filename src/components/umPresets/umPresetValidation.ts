// Предварительная проверка пресета: материалы и наполнение сверяются с
// текущими справочниками по тем же правилам, по которым сборка подменяет
// потерянные записи (BuildProduct.sanitizeProductMaterials и
// sanitizeGridMaterials). Поэтому предупреждение в карточке совпадает с тем,
// что реально заменится при вставке.
//
// Критерий устаревания — отсутствие id в справочнике (hasMaterial): ровно то,
// на что смотрит замена. Ограничения конкретного товара (его списки
// MODULECOLOR/FACADE) не учитываются.

import { useModelState } from '@/store/appliction/useModelState'
import { hasMaterial, isEmptyMaterialId } from '@/Application/Meshes/Utils/MaterialResolver'
import type { UmPreset } from './types'

export type UmPresetIssue = {
  /** Человекочитаемое место, где потерян материал или товар */
  label: string
  id: string | number
}

export type UmPresetValidation = {
  /** Товар пресета есть в каталоге — без него вставка невозможна */
  productAvailable: boolean
  /** Пустой список — пресет полностью актуален */
  outdated: UmPresetIssue[]
}

const EMPTY_VALIDATION: UmPresetValidation = { productAvailable: false, outdated: [] }

type Dict = Record<string | number, any>

/** Сбор проблем с дедупликацией: один потерянный цвет встречается десятками. */
const createCollector = () => {
  const issues = new Map<string, UmPresetIssue>()

  return {
    add(label: string, id: unknown) {
      const key = `${label}:${id}`
      if (!issues.has(key)) issues.set(key, { label, id: id as string | number })
    },
    list: () => [...issues.values()],
  }
}

export const validateUmPreset = (preset: UmPreset): UmPresetValidation => {
  const snapshot = preset?.data?.snapshot
  const CONFIG = snapshot?.data?.CONFIG

  if (!snapshot?.id || !CONFIG) return EMPTY_VALIDATION

  const modelState = useModelState()

  const products: Dict = modelState._PRODUCTS ?? {}
  const fasade: Dict = modelState._FASADE ?? {}
  const color: Dict = modelState._COLOR ?? {}
  const hem: Dict = modelState._HEM ?? {}
  const wall: Dict = modelState._WALL ?? {}
  const wardrobeSystem: Dict = modelState._WARDROBE_SYSTEM ?? {}

  const productAvailable = !!products[snapshot.id]
  const { add, list } = createCollector()

  const checkMaterial = (label: string, dict: Dict, id: unknown) => {
    if (isEmptyMaterialId(id as any)) return
    if (hasMaterial(dict, id as any)) return
    add(label, id)
  }

  const checkProduct = (label: string, id: unknown) => {
    if (id == null || id === '' || id === false) return
    if (products[id as string | number]) return
    add(label, id)
  }

  // Фасад: цвет полотна и цвет, к которому оно откатывается по сбросу.
  const checkFasade = (item: any) => {
    const material = item?.material
    if (!material) return

    checkMaterial('Цвет фасада', fasade, material.COLOR)
    checkMaterial('Цвет фасада', fasade, material.RESET_COLOR)
  }

  // Наполнение box-UM: товар полки/ящика, цвет профиля, фасад ящика.
  const checkFilling = (filling: any) => {
    if (!filling) return

    checkProduct('Наполнение', filling.product)

    if (filling.isProfile) {
      checkMaterial('Цвет профиля', color, filling.color)
      checkMaterial('Цвет профиля', color, filling.isProfile.COLOR)
    }

    checkFasade(filling.fasade)
  }

  // Наполнение лежит на всех уровнях вложенности: секция -> ячейка -> ряд ->
  // доп. область (тот же обход, что в sanitizeGridMaterials).
  const walkContainer = (container: any) => {
    container?.fillings?.forEach(checkFilling)
    container?.cells?.forEach(walkContainer)
    container?.cellsRows?.forEach(walkContainer)
    container?.extras?.forEach(walkContainer)
  }

  const checkModuleGrid = (grid: any) => {
    if (!grid?.sections?.length) return

    checkMaterial('Цвет корпуса', fasade, grid.moduleColor)

    const profilesConfig = grid.profilesConfig
    if (profilesConfig) {
      checkMaterial('Цвет профиля', color, profilesConfig.COLOR)
      checkMaterial('Цвет профиля', color, profilesConfig.sideProfile?.COLOR)
    }

    grid.sections.forEach((section: any) => {
      walkContainer(section)

      section?.fasades?.forEach((door: any[]) => door?.forEach(checkFasade))
      section?.fasadesDrawers?.forEach(checkFasade)
      section?.hiTechProfiles?.forEach(checkFilling)
    })

    // Двери-купе лежат на самом модуле, а не в секциях.
    grid.fasades?.forEach((door: any[]) => door?.forEach(checkFasade))
  }

  // Гардеробная сетка: наполнение секций и профили со своим каталогом
  // (_WARDROBE_SYSTEM[товар].profile), а не общим списком товаров.
  const checkWardrobeGrid = (grid: any, wardrobeProductId: number) => {
    const system = wardrobeSystem[wardrobeProductId]

    grid?.sections?.forEach((section: any) => {
      section?.wardrobeFilling?.forEach((item: any) => {
        checkProduct('Наполнение', item?.productId)

        // Цвет есть только у полки из ЛДСП: у стекла и штанги материала нет.
        if (item?.type === 'shelf' && item?.material === 'ldsp') {
          checkMaterial('Цвет полки', fasade, item.colorId)
        }

        if (item?.cabinet) {
          checkMaterial('Цвет тумбочки', fasade, item.cabinet.colorId)
          // Внутри тумбочки лежит полноценный CONFIG со своей сеткой УМ.
          checkModuleGrid(item.cabinet.config?.MODULEGRID)
        }
      })
    })

    grid?.wardrobeProfiles?.forEach((profile: any) => {
      // Каталог профилей известен только вместе с товаром гардеробной — без
      // него о профиле судить нечем.
      if (system?.profile && profile?.profileProductId != null
        && !system.profile[profile.profileProductId]) {
        add('Профиль', profile.profileProductId)
      }

      checkMaterial('Цвет профиля', color, profile?.colorId)
    })
  }

  // У элементов комнаты MODULE_COLOR — текстура стены из WALL, а не цвет ЛДСП.
  if (CONFIG.ELEMENT_TYPE === 'element_room') {
    checkMaterial('Текстура стены', wall, CONFIG.MODULE_COLOR)
  } else {
    checkMaterial('Цвет корпуса', fasade, CONFIG.MODULE_COLOR)
  }

  checkMaterial('Цвет задней стенки', fasade, CONFIG.BACKWALL?.COLOR)
  checkMaterial('Цвет боковины', fasade, CONFIG.LEFTSIDECOLOR?.COLOR)
  checkMaterial('Цвет боковины', fasade, CONFIG.RIGHTSIDECOLOR?.COLOR)

  // Металлическая царга идёт с цветом фурнитуры, деревянная — цветом корпуса.
  if (CONFIG.TSARGA?.TYPE === 'wood') {
    checkMaterial('Цвет царги', fasade, CONFIG.TSARGA.COLOR)
  }

  checkMaterial('Цвет столешницы', fasade, CONFIG.TOPFASADECOLOR?.COLOR)
  checkMaterial('Кромка столешницы', hem, CONFIG.TOPFASADECOLOR?.KROMKA)
  checkProduct('Столешница', CONFIG.TOPFASADECOLOR?.TABLE)

  Object.values(CONFIG.FASADE_PROPS ?? {}).forEach((item: any) => {
    checkMaterial('Цвет фасада', fasade, item?.COLOR)
    checkMaterial('Цвет фасада', fasade, item?.RESET_COLOR)
  })

  checkMaterial('Кромка', hem, CONFIG.KROMKA)
  checkMaterial('Цвет профиля', color, CONFIG.PROFILECOLOR)

  checkModuleGrid(CONFIG.MODULEGRID)
  checkWardrobeGrid(CONFIG.WARDROBEGRID, Number(snapshot.id))

  return { productAvailable, outdated: list() }
}

/** Строки для тултипа: «Цвет фасада (6469994)». */
export const formatUmPresetIssues = (issues: UmPresetIssue[]): string[] =>
  issues.map((issue) => `${issue.label} (${issue.id})`)
