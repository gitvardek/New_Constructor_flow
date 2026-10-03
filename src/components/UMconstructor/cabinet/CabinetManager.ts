//@ts-nocheck

// ==== Универсальная тумбочка (CABINET) ====
// Установка тумбочки в секцию гардеробной. Точка входа — scope.WARDROBE.cabinets.
// Положение по Y и удаление — общие с полками
// (WardrobeShelvesManager.updateWardrobeShelfPositionY/deleteWardrobeShelf).
import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import { GridModule } from "@/components/UMconstructor/types/UMtypes.ts";
import {
    findFreeWardrobeShelfPositionY,
    getWardrobeSectionInstallableHeight,
    getWardrobeShelfDepth,
    getWardrobeShelfColorOptions,
} from "@/components/UMconstructor/wardrobe/WardrobeSystem.ts";
import { WARDROBE_SHELF_PRODUCT_ID } from "@/components/UMconstructor/wardrobe/createWardrobeGrid.ts";
import { DRAFT_CABINET_PRODUCT_ID } from "./cabinetProduct.ts";
import { createDefaultCabinetConfig } from "./CabinetSystem.ts";

export default class CabinetManager {
    scope: UMconstructorClass

    constructor(scope: UMconstructorClass) {
        this.scope = scope
    }

    // Ставит тумбочку с параметрами по умолчанию в первое свободное место
    // секции снизу вверх (та же findFreeWardrobeShelfPositionY, что у полок).
    // product — запись каталога (_PRODUCTS[id], карточка "Вставки"); конфиг УМ
    // тумбочка получает на ближайшем пересчёте гардеробной (syncCabinetConfig).
    addWardrobeCabinet(grid: GridModule, secIndex: number, product: any, reset: boolean = true) {
        const section = grid.sections[secIndex];
        if (!section) return;

        if (!section.wardrobeFilling) section.wardrobeFilling = [];
        const items = section.wardrobeFilling;

        // Материал корпуса — первый ЛДСП полки, пока у тумбочки нет своего каталога.
        const colorId = getWardrobeShelfColorOptions(grid.productID, WARDROBE_SHELF_PRODUCT_ID)[0]?.id;
        const cabinetItem = { type: 'cabinet', cabinet: createDefaultCabinetConfig(colorId) };

        const positionY = findFreeWardrobeShelfPositionY(
            items,
            cabinetItem,
            getWardrobeShelfDepth(grid),
            getWardrobeSectionInstallableHeight(grid, secIndex),
            grid.productID,
        );

        if (positionY === null) {
            this.scope.callAlert("warning", "В секторе не осталось места для тумбочки!");
            return;
        }

        const newId = items.reduce((max, s) => Math.max(max, s.id), 0) + 1;

        items.push({
            id: newId,
            productId: Number(product?.ID ?? product?.id) || DRAFT_CABINET_PRODUCT_ID,
            ...cabinetItem,
            positionY,
        });

        if (reset) this.scope.reset(grid);
    }
}
