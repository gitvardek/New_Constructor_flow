// Царга (металлическая укрепляющая планка) — общая логика вычисления её
// применимости и построения объекта данных. Раньше была независимо
// продублирована в ShelvesManager.recalcSectionTsarga (полный пересчёт
// секции), DividerDragEngine.updateRowTsarga (точечное обновление при
// перетаскивании разделителя) и инлайново в SceneBuilder.renderGrid
// (случай секции без cells) — один и тот же литерал объекта и одни и те
// же условия (продукт поддерживает царгу / активна опция металлической
// царги / ширина попадает в допустимый диапазон) были написаны от руки
// в трёх местах. Здесь — единственный источник истины для всех троих.
//
// 3D-сборка (BuildUniversalModule.ts) сюда не входит: она только читает
// уже посчитанные section.tsarga/cell.tsarga/row.tsarga/extra.tsarga,
// не пересчитывает применимость заново.

import { UM_PARAMS, WITH_TSARGA } from "./Const.ts";

export const TSARGA_PRODUCT_ID = 15335121
export const TSARGA_MATERIAL_ID = 15826
// id опции "Металлическая царга" в CONFIG.OPTIONS
export const METAL_TSARGA_OPTION_ID = 7250589

export function createTsargaData(width: number, positionX: number) {
    return {
        ID: TSARGA_PRODUCT_ID,
        MATERIAL_ID: TSARGA_MATERIAL_ID,
        WIDTH: width,
        POSITION: positionX,
        type: 'tsarga',
    }
}

export function isTsargaCapableProduct(productID: number): boolean {
    return WITH_TSARGA.includes(productID)
}

// productData — объект с CONFIG.OPTIONS (то, что возвращает UM_STORE.getUMData()/PROPS)
export function isMetalTsargaOptionActive(productData: any): boolean {
    return productData?.CONFIG?.OPTIONS?.some(opt => +opt.id === METAL_TSARGA_OPTION_ID && opt.active) ?? false
}

export function isTsargaEligibleWidth(width: number): boolean {
    const { MIN_TSARGA_WIDTH, MAX_TSARGA_WIDTH } = UM_PARAMS
    return width >= MIN_TSARGA_WIDTH && width <= MAX_TSARGA_WIDTH
}

// Применяет/снимает царгу для одного узла дерева грида (cell или row, у
// которого может быть массив .extras) — общая логика, используемая и при
// полном пересчёте секции (ShelvesManager.recalcSectionTsarga проходит по
// всем cells/cellsRows), и при точечном обновлении одного row/cell во время
// драга (DividerDragEngine.updateRowTsarga).
export function applyTsargaToRow(row: any, isCellRoof: boolean, isMetalTsargaActive: boolean): void {
    if (row.extras?.length > 0) {
        delete row.tsarga
        row.extras.forEach((extra, extraIdx) => {
            if (isCellRoof && extraIdx === 0 && isMetalTsargaActive) {
                delete extra.tsarga
            } else if (isTsargaEligibleWidth(row.width)) {
                extra.tsarga = createTsargaData(row.width, row.position?.x ?? 0)
            } else {
                delete extra.tsarga
            }
        })
    } else if (isCellRoof && isMetalTsargaActive) {
        delete row.tsarga
    } else if (isTsargaEligibleWidth(row.width)) {
        row.tsarga = createTsargaData(row.width, row.position?.x ?? 0)
    } else {
        delete row.tsarga
    }
}
