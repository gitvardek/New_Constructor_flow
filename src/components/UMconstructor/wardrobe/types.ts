// ==== Гардеробная система (WARDROBE) ====
// Типы содержимого гардеробной сетки. Вынесено из types/UMtypes.ts — там
// остались только опциональные поля, которыми гардеробное содержимое
// цепляется к общим GridSection/GridModule (wardrobeFilling и
// moduleKind/wardrobeProfiles), сами структуры живут здесь.
import type { WardrobeCabinetConfig } from "@/components/UMconstructor/cabinet/types.ts";

// Профиль стоит на границе двух секций (или на краю модуля), поэтому не
// принадлежит секции, а лежит в GridModule.wardrobeProfiles длиной
// sections.length + 1.
//
// profileProductId — "Тип профиля": товар из
// _WARDROBE_SYSTEM[wardrobeProductId].profile (getWardrobeProfileProducts).
// У каждого свой список цветов (.colors), поэтому colorId зависит от него, а
// не от крепления.
//
// fasteningId — "Крепление профиля": запись в
// _WARDROBE_SYSTEM[wardrobeProductId].fastenings ({id, name, type,
// height:{min,max}, depth:{min,max}}). type — машинный идентификатор
// ("floor_ceiling"/"floor_wall"/"wall_wall"), name — подпись для UI. От type
// зависят цветовая "семья" в 2D (getWardrobeFasteningColorFamily/
// WardrobeColors.ts) и диапазон height (getWardrobeProfileHeightRange).
//
// colorId — цвет из _COLOR (как PROFILECOLOR у обычных УМ-профилей; НЕ
// _FASADE, в отличие от WardrobeFillingItem.colorId), варианты зависят от
// profileProductId (getWardrobeProfileMaterials).
//
// height — собственная высота профиля, мм; высота модуля (GridModule.height)
// = максимум по всем профилям (UMconstructorClass.reset()), т.к. "Пол-стена"
// обычно короче "Пол-потолок".
export interface WardrobeProfile {
    id: number;
    profileProductId: number;
    fasteningId: number;
    colorId?: number;
    height: number;
}

// Вид полки — ЛДСП (с выбором материала/цвета) или стекло (без выбора).
// Отдельного productId под стекло нет — это флаг поверх той же полки-товара
// (5975548): товара "полка-стекло" в каталоге не существует.
export type WardrobeShelfMaterial = 'ldsp' | 'glass';

// Объект наполнения секции: полка, штанга (группы
// _PRODUCTS[wardrobeProductId].FILLING_SECTION, RailsManager.addWardrobeRail)
// или универсальная тумбочка (components/UMconstructor/cabinet).
export type WardrobeFillingType = 'shelf' | 'rail' | 'cabinet';

// Полка — прямая или наклонная (обувная, см. ShelfBuilder.buildWardrobeAngledShelf).
export type WardrobeShelfType = 'flat' | 'angled';

// Все объекты секции лежат в одном section.wardrobeFilling ради общей
// коллизии: getWardrobeShelfMinGap/getWardrobeShelfFloorGap/
// findFreeWardrobeShelfPositionY/getWardrobeShelfDragBounds и авто-удаление
// по потолку секции работают с любым type.
//
// productId — ссылка в _PRODUCTS (у полки всегда 5975548).
// Полка: shelfType, material, colorId — материал из _FASADE при
// material==='ldsp' (варианты — _WARDROBE_SYSTEM[wardrobeProductId].shelf[productId].fasade),
// _FASADE[colorId].DEPTH даёт толщину.
// Штанга: высота — railHeight (getWardrobeShelfPixiHeight), материала нет.
// Тумбочка: параметры корпуса — cabinet.
export interface WardrobeFillingItem {
    id: number;
    productId: number;
    type: WardrobeFillingType;
    shelfType?: WardrobeShelfType;
    material?: WardrobeShelfMaterial;
    colorId?: number;
    positionY: number;
    railHeight?: number;
    cabinet?: WardrobeCabinetConfig;
}

// Поля, от которых зависят высота объекта и зазоры до соседей.
export type WardrobeFillingShape = Pick<WardrobeFillingItem, 'type' | 'shelfType' | 'material' | 'colorId' | 'railHeight' | 'cabinet'>;
