//@ts-nocheck

import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import { GridModule } from "@/components/UMconstructor/types/UMtypes.ts";
import {
    findFreeWardrobeShelfPositionY,
    getWardrobeSectionInstallableHeight,
    getWardrobeShelfDepth,
} from "@/components/UMconstructor/utils/WardrobeSystem.ts";

// ==== Гардеробная система (WARDROBE) ====
// Штанга (rail) — товар из динамических групп "Наполнение" -> "Вставка"
// (WardrobeSystem.getWardrobeFillingsGroups, WardrobeInsertView.vue) Лежит в ТОМ ЖЕ section.wardrobeShelves, что
// и полки (kind==='rail'), ради полноценной коллизии: поиск свободного места,
// зазоры, драг и авто-удаление по потолку секции
// (findFreeWardrobeShelfPositionY, getWardrobeShelfDragBounds,
// UMconstructorClass.reset()) переиспользованы без правок — они уже дженерик
// над {type, positionY, kind, railHeight}, см.
// WardrobeSystem.getWardrobeShelfPixiHeight. Отдельный класс, а не метод
// ShelvesManager — то же разделение по сущностям, что у
// ProfilesManager/SectionsManager/ShelvesManager.
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

        if (!section.wardrobeShelves) section.wardrobeShelves = [];
        const shelves = section.wardrobeShelves;

        const railHeight = Number(item?.height) || 0;
        const depthMm = getWardrobeShelfDepth(grid);
        const ceilingHeight = getWardrobeSectionInstallableHeight(grid, secIndex);

        const positionY = findFreeWardrobeShelfPositionY(
            shelves,
            { type: 'flat', kind: 'rail', railHeight },
            depthMm,
            ceilingHeight,
            grid.productID,
        );

        if (positionY === null) {
            this.scope.callAlert("warning", "В секторе не осталось места для штанги!");
            return;
        }

        const newId = shelves.reduce((max, s) => Math.max(max, s.id), 0) + 1;

        shelves.push({
            id: newId,
            productId: item?.ID ?? item?.id,
            type: 'flat',
            kind: 'rail',
            railHeight,
            positionY,
        });

        if (reset) this.scope.reset(grid);
    }
}
