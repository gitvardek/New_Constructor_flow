// Материал, снятый с производства, удаляется из каталога на бэке, но остаётся в уже
// сохранённых проектах. Обращение к такой записи справочника роняет сборку целиком
// (_FASADE[id].TEXTURE, _HEM[id].DETAIL_PICTURE и подобные), хотя потерян всего один цвет.
// Здесь собрано единое правило замены и журнал подмен, о которых уже сообщили.

export type TMaterialDict = Record<string | number, any>

export type TMaterialId = number | string | null | undefined | false

/** Справочники, в которых живут сохраняемые в проект материалы */
export type TMaterialDictName = 'FASADE' | 'COLOR' | 'WALL' | 'HEM'

export type TResolveParams = {
    /** id, доступные товару: замену выбираем только из них */
    allowed?: TMaterialId[]
    /** предпочтительная замена — дефолт проекта */
    fallback?: TMaterialId
}

export type TResolvedMaterial = {
    id: TMaterialId
    replaced: boolean
    from: TMaterialId
}

/** id материалов приходят и числом, и строкой ("6469994"), поэтому сверяем значения */
const sameId = (first: TMaterialId, second: TMaterialId) => String(first) === String(second)

/**
 * Пустое значение — это осознанное «материала нет» (COLOR: false у боковой стенки,
 * null у невыбранной патины), а не потерянный id: заменять такие не нужно
 */
export const isEmptyMaterialId = (id: TMaterialId) =>
    id === null || id === undefined || id === false || id === ''

export const hasMaterial = (dict: TMaterialDict, id: TMaterialId) =>
    !isEmptyMaterialId(id) && !!dict?.[id as string | number]

/**
 * Замена id, которого больше нет в справочнике: сначала дефолт проекта — если он доступен
 * товару, — затем первый доступный материал товара. Заменить нечем — возвращаем null,
 * и вызывающий решает, обнулять поле или оставить как есть
 */
export const resolveMaterialId = (
    dict: TMaterialDict,
    id: TMaterialId,
    { allowed = [], fallback = null }: TResolveParams = {},
): TResolvedMaterial => {

    if (isEmptyMaterialId(id) || hasMaterial(dict, id)) {
        return { id, replaced: false, from: id }
    }

    console.log(dict, 'dict', id, 'id')
    const available = allowed.filter(item => hasMaterial(dict, item))



    // Список доступных пуст — про ограничения товара ничего не известно, и дефолт проекта
    // остаётся единственным кандидатом
    const fallbackFits = hasMaterial(dict, fallback)
        && (!available.length || available.some(item => sameId(item, fallback)))

    const replacement = fallbackFits ? fallback : available[0] ?? null

    return { id: replacement, replaced: true, from: id }
}

/** Убирает из списка id, которых больше нет в справочнике */
export const filterKnownMaterials = (dict: TMaterialDict, ids: TMaterialId[] = []) =>
    ids.filter(id => hasMaterial(dict, id))

// Об одной и той же подмене сообщаем единожды за сессию: удалённый цвет встречается
// в проекте десятками — в корпусе, фасадах, наполнении каждого модуля
const reportedReplacements = new Set<string>()

export const shouldReportReplacement = (dictName: string, result: TResolvedMaterial) => {
    const key = `${dictName}:${result.from}>${result.id}`

    if (reportedReplacements.has(key)) {
        return false
    }

    reportedReplacements.add(key)

    return true
}

/** Новый проект — подмены показываем заново */
export const resetReplacementsLog = () => {
    reportedReplacements.clear()
}
