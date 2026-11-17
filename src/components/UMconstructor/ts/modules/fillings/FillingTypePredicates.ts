// Чистые функции классификации наполнения — вынесены из FillingsManager.ts,
// чтобы одинаковые проверки типа не переизобретались в каждом обработчике
// (DrawerFillingHandler/ShelfFillingHandler/ProfileFillingHandler/AccessoryFillingHandler).

export type FillingKind = 'drawer' | 'shelf' | 'any' | 'profile'

// productGroupID -> логический тип наполнения (см. UMconstructorClass.FILLINGS)
export const FILLING_TYPE_BY_GROUP_ID: Record<number, FillingKind> = {
    2166308: 'drawer', //Встраиваемые ящики
    2166309: 'drawer', //Секции
    5718462: 'drawer', //Секции купе
    5726092: 'drawer', //Внешние ящики
    6560591: 'drawer', //Внешние ящики Hi-Tech
    5726093: 'shelf',  //Полки
    12102124: 'shelf', //Полки Hi-Tech
    6311723: 'shelf',  //Полки купе
    6174300: 'any',    //Аксессуары для шкафов
    6513322: 'profile',//Профиль Hi-Tech
}

export function classifyByGroupId(productGroupID: number, byGroupId: Map<string, string> | Record<number, string> = FILLING_TYPE_BY_GROUP_ID): string {
    if (byGroupId instanceof Map) {
        return byGroupId.get(`${productGroupID}`) || 'any'
    }
    return byGroupId[productGroupID] || 'any'
}

export function isOuterDrawer(productGroupID: number, OUTER_DRAWER_IDS: number[]): boolean {
    return OUTER_DRAWER_IDS.includes(productGroupID)
}

export function isInnerDrawer(productGroupID: number, INNER_DRAWER_IDS: number[]): boolean {
    return INNER_DRAWER_IDS.includes(productGroupID)
}

export function isUniversalDrawer(productGroupID: number, UNIVERSAL_DRAWER_IDS: number[]): boolean {
    return UNIVERSAL_DRAWER_IDS.includes(productGroupID)
}

// product.MIN_FASADE_SIZE — признак того, что у ящика есть выдвижной фасад
export function hasFasade(product: { MIN_FASADE_SIZE?: number }): boolean {
    return !!product?.MIN_FASADE_SIZE
}

export function isHiTechProfile(product: { productType?: number }, APP: any): boolean {
    return APP.PRODUCTS_TYPES[product.productType]?.CODE.includes("hi_tech_profile") || false
}

export function isBottomHiTechProfile(isHiTechProfileFlag: boolean, product: { productType?: number }, APP: any): boolean {
    return (isHiTechProfileFlag && APP.PRODUCTS_TYPES[product.productType]?.CODE.includes("bottom")) || false
}

export function isVerticalShelfByName(name: string): boolean {
    return name.includes('разделитель')
}

export function isGlassShelfByName(name: string): boolean {
    return name.includes('стеклянная')
}

// Повторяет вывод _type из FillingsManager.addFilling: разделитель по имени -> тип по группе -> стеклянная полка
export function classifyFillingType(name: string, productGroupID: number, byGroupId: Map<string, string> | Record<number, string> = FILLING_TYPE_BY_GROUP_ID): string {
    let type = isVerticalShelfByName(name) ? 'vertical_shelf' : classifyByGroupId(productGroupID, byGroupId)
    if (type === 'shelf' && isGlassShelfByName(name)) {
        type = 'glass_shelf'
    }
    return type
}
