import type { TDrawerConfigItem, TDrawersData } from "@/types/types"

type NumStr = number | string

/**
 * Позиция ящика в тумбе. Ключ позиции с бэка — это FASADE_NUMBER фасада
 * (DRAWERS.POSITION[<id товара>][<FASADE_NUMBER>])
 */
export type TDrawerPositionInfo = {
    position: number
    drawers: string[]
    defaultDrawer: string | null
    defaultColor: string | null
}

/** Пустые данные, чтобы не проверять каждое поле на всех уровнях */
const emptyData: TDrawersData = { PRODUCT: {}, POSITION: {}, HASH: {} }

const getData = (data?: TDrawersData | null) => data ?? emptyData

/** Есть ли у товара ящики: только такие модули получают пункт меню */
export const hasDrawers = (data: TDrawersData | null | undefined, productId?: NumStr | null) => {
    if (productId == null) {
        return false
    }

    return getDrawerPositions(data, productId).length > 0
}

/** Позиции ящиков товара, отсортированные по номеру фасада */
export const getDrawerPositions = (
    data: TDrawersData | null | undefined,
    productId?: NumStr | null
): TDrawerPositionInfo[] => {
    const source = getData(data)
    const positions = productId != null ? source.POSITION?.[String(productId)] : null

    if (!positions) {
        return []
    }

    return Object.entries(positions)
        .map(([key, item]) => ({
            position: Number(key),
            // Товар ящика может отсутствовать в PRODUCT — такие id бесполезны
            drawers: (item?.DRAWERS ?? []).filter(id => Boolean(source.PRODUCT?.[id])),
            defaultDrawer: item?.DEFAULT_DRAWER ?? null,
            defaultColor: item?.DEFAULT_COLOR ?? null,
        }))
        .filter(item => Number.isFinite(item.position) && item.drawers.length > 0)
        .sort((a, b) => a.position - b.position)
}

/** Данные одной позиции */
export const getDrawerPosition = (
    data: TDrawersData | null | undefined,
    productId: NumStr | null | undefined,
    position: number
) => getDrawerPositions(data, productId).find(item => item.position === position) ?? null

/** Доступные цвета ящика: MODULECOLOR ящика — хеш-ссылка на список цветов в HASH */
export const getDrawerColorIds = (data: TDrawersData | null | undefined, drawerId?: NumStr | null) => {
    const source = getData(data)
    const hash = drawerId != null ? source.PRODUCT?.[String(drawerId)]?.MODULECOLOR : null

    if (!hash) {
        return []
    }

    return source.HASH?.[hash] ?? []
}

/** Ящик позиции по умолчанию: DEFAULT_DRAWER, если он в списке, иначе первый доступный */
export const resolveDrawer = (position: TDrawerPositionInfo, preferred?: NumStr | null) => {
    const wanted = preferred != null ? String(preferred) : null

    if (wanted && position.drawers.includes(wanted)) {
        return wanted
    }
    if (position.defaultDrawer && position.drawers.includes(position.defaultDrawer)) {
        return position.defaultDrawer
    }

    return position.drawers[0] ?? null
}

/**
 * Цвет для ящика: сохранённый, если он доступен у этого ящика, иначе дефолт позиции,
 * иначе первый из списка. У разных ящиков наборы цветов разные, поэтому при смене
 * ящика цвет приходится пересчитывать
 */
export const resolveDrawerColor = (
    data: TDrawersData | null | undefined,
    drawerId: NumStr | null,
    preferred?: NumStr | null,
    fallback?: NumStr | null
) => {
    const colors = getDrawerColorIds(data, drawerId)

    if (!colors.length) {
        return null
    }

    const wanted = preferred != null ? String(preferred) : null
    if (wanted && colors.includes(wanted)) {
        return wanted
    }

    const def = fallback != null ? String(fallback) : null
    if (def && colors.includes(def)) {
        return def
    }

    return colors[0]
}

/** Выбор ящиков по умолчанию — им заполняется CONFIG при создании модуля */
export const createDefaultDrawers = (
    data: TDrawersData | null | undefined,
    productId?: NumStr | null
): TDrawerConfigItem[] => {
    return getDrawerPositions(data, productId).reduce<TDrawerConfigItem[]>((acc, position) => {
        const drawer = resolveDrawer(position)

        if (!drawer) {
            return acc
        }

        acc.push({
            POSITION: position.position,
            ID: drawer,
            COLOR: resolveDrawerColor(data, drawer, position.defaultColor),
        })

        return acc
    }, [])
}

/**
 * Приводит сохранённый выбор к актуальным данным: добавляет позиции, которых нет
 * в конфиге (старые проекты и новые позиции с бэка), и выбрасывает те, что пропали
 */
export const syncDrawers = (
    data: TDrawersData | null | undefined,
    productId: NumStr | null | undefined,
    saved?: TDrawerConfigItem[] | null
): TDrawerConfigItem[] => {
    const positions = getDrawerPositions(data, productId)
    const savedList = Array.isArray(saved) ? saved : []

    return positions.reduce<TDrawerConfigItem[]>((acc, position) => {
        const savedItem = savedList.find(item => Number(item?.POSITION) === position.position)
        const drawer = resolveDrawer(position, savedItem?.ID)

        if (!drawer) {
            return acc
        }

        acc.push({
            POSITION: position.position,
            ID: drawer,
            COLOR: resolveDrawerColor(data, drawer, savedItem?.COLOR, position.defaultColor),
        })

        return acc
    }, [])
}
