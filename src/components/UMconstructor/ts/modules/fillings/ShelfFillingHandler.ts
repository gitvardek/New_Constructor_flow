// Логика, специфичная для полок/разделителей. Вынесено из FillingsManager.ts
// (Фаза 1d рефакторинга, см. C:\Users\MG_GO.MG\.claude\plans\iterative-launching-lerdorf.md).
// Сегодня у полок нет собственной сложной логики размещения (в отличие от ящиков/
// профилей) — только нормализация размера под толщину материала модуля перед общей
// проверкой места в FillingsCore. Класс существует как заранее подготовленное место
// для будущих правил, специфичных для полок/стеклянных полок/разделителей.
//@ts-nocheck

import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import FillingsCore from "./FillingsCore.ts";
import { GridModule } from "@/components/UMconstructor/types/UMtypes.ts";

export default class ShelfFillingHandler {
    scope: UMconstructorClass
    core: FillingsCore

    constructor(scope: UMconstructorClass, core: FillingsCore) {
        this.scope = scope
        this.core = core
    }

    // 'shelf' занимает толщину материала по высоте, 'vertical_shelf' — по ширине.
    normalizeDimensions(product: any, _type: string, grid: GridModule): void {
        if (_type === 'shelf') {
            product.height = grid.moduleThickness
        }

        if (_type === 'vertical_shelf') {
            product.width = grid.moduleThickness
        }
    }
}
