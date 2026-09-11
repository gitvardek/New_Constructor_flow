// @ts-nocheck

// Начальный GridModule гардеробной системы.
// Для продукта без стенок: sections[] используются только как секции
// (ширина/позиция/resize-драг), cells/cellsRows/extras внутри не нужны —
// вместо них GridSection.wardrobeShelves и GridModule.wardrobeProfiles
// (см. UMtypes.ts).
//
// Единый источник дефолтной сетки: зовётся из UMconstructorClass (первое
// открытие 2D-редактора с пустым гридом) и из
// BuildProduct.createProductObject (сидирование CONFIG.WARDROBEGRID при
// создании товара).

import * as THREE from "three";
import { GridModule, GridSection, WardrobeProfile } from "./../types/UMtypes.ts";
import {
    WARDROBE_SECTION_WIDTH_MIN,
    WARDROBE_SECTION_WIDTH_MAX,
    WARDROBE_START_WIDTH,
    WARDROBE_PROFILE_WIDTH,
} from "@/Application/F-wardrobeData.ts";
import { getWardrobeProfileProducts, getWardrobeProfileFastenings, getWardrobeProfileMaterials } from "./../utils/WardrobeSystem.ts";

// Тот же товар-полка, что уже используется в ShelfBuilder.buildWardrobeShelf
export const WARDROBE_SHELF_PRODUCT_ID = 5975548;

// N секций -> N+1 профилей (профили — границы секций); в стартовой сетке
// секция всегда одна, все профили высотой с модуль. profileProductId/fasteningId/colorId 

function createDefaultWardrobeProfiles(sectorsCount: number, wardrobeProductId: number, height: number): WardrobeProfile[] {
    const profileProductId = getWardrobeProfileProducts(wardrobeProductId)[0]?.id;
    const fasteningId = getWardrobeProfileFastenings(wardrobeProductId)[0]?.id;
    const defaultColorId = profileProductId
        ? getWardrobeProfileMaterials(wardrobeProductId, profileProductId)[0]?.ID
        : undefined;

    return Array.from({ length: sectorsCount + 1 }, (_, i) => ({
        id: i + 1,
        profileProductId,
        fasteningId,
        colorId: defaultColorId,
        height,
    }));
}

export function createWardrobeGrid(
    productID: number,
    size: { width: number; height: number; depth: number },
): GridModule {
    const sectorWidth = Math.min(
        Math.max(size.width || WARDROBE_START_WIDTH, WARDROBE_SECTION_WIDTH_MIN),
        WARDROBE_SECTION_WIDTH_MAX,
    );

    const section: GridSection = {
        number: 1,
        width: sectorWidth,
        height: size.height,
        type: "section",
        cells: [], // у гардеробной системы содержимое не в cells — см. wardrobeShelves ниже
        position: new THREE.Vector2(0, 0), 
        wardrobeShelves: [],
    };

    return {
        width: size.width,
        height: size.height,
        depth: size.depth,
        moduleColor: 0,
        moduleThickness: WARDROBE_PROFILE_WIDTH,
        sections: [section],
        type: "module",
        moduleKind: 'wardrobe',
        productID,
        wardrobeProfiles: createDefaultWardrobeProfiles(1, productID, size.height),
    };
}
