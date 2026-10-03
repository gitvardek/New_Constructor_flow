//@ts-nocheck

import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import { GridModule } from "@/components/UMconstructor/types/UMtypes.ts";
import {
    findFreeWardrobeShelfPositionY,
    getWardrobeSectionInstallableHeight,
    getWardrobeShelfDepth,
} from "@/components/UMconstructor/wardrobe/WardrobeSystem.ts";

// ==== Гардеробная система (WARDROBE) ====
// Штанга (rail) — товар из динамических групп "Наполнение" -> "Вставка"
// (WardrobeSystem.getWardrobeFillingsGroups, WardrobeInsertView.vue) Лежит в ТОМ ЖЕ section.wardrobeFilling, что
// и полки (type==='rail'), ради полноценной коллизии: поиск свободного места,
// зазоры, драг и авто-удаление по потолку секции
// (findFreeWardrobeShelfPositionY, getWardrobeShelfDragBounds,
// UMconstructorClass.reset()) переиспользованы без правок — они уже дженерик
// над {type, positionY, railHeight}, см.
// WardrobeSystem.getWardrobeShelfPixiHeight. Отдельный класс, а не метод
// WardrobeShelvesManager — то же разделение по сущностям, что у
// остальных менеджеров гардеробной (wardrobe/managers).
export default class RailsManager {
    scope: UMconstructorClass

    constructor(scope: UMconstructorClass) {
        this.scope = scope
    }

    // item — сырой объект каталога _PRODUCTS[id] (см. WardrobeInsertView.vue,
    // ProductCard @click) — высота штанги берётся из item.height (уточнение
    // пользователя), не из _FASADE (у штанги нет материала/цвета).
    addWardrobeRail(grid: GridModule, secIndex: number, item: any, reset: boolean = true) {
        const section = grid.sections[secIndex];
        if (!section) return;

        if (!section.wardrobeFilling) section.wardrobeFilling = [];
        const contant = section.wardrobeFilling;

        const railHeight = Number(item?.height) || 0;
        const depthMm = getWardrobeShelfDepth(grid);
        const ceilingHeight = getWardrobeSectionInstallableHeight(grid, secIndex);

        const positionY = findFreeWardrobeShelfPositionY(
            contant,
            { type: 'rail', railHeight },
            depthMm,
            ceilingHeight,
            grid.productID,
        );

        if (positionY === null) {
            this.scope.callAlert("warning", "В секторе не осталось места для штанги!");
            return;
        }

        const newId = contant.reduce((max, s) => Math.max(max, s.id), 0) + 1;

        contant.push({
            id: newId,
            productId: item?.ID ?? item?.id,
            type: 'rail',
            railHeight,
            positionY,
        });

        if (reset) this.scope.reset(grid);
    }
}
