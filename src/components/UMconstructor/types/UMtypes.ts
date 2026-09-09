import * as THREE from "three";
import { TFasadeProp } from "@/types/types.ts";

export interface FillingObject {
    product: number;
    isVerticalItem: boolean;
    id: number;
    name: string;
    image: string;
    type: "shelf" | "drawer" | "any";
    position: THREE.Vector2;
    size: THREE.Vector3;
    width: number,
    height: number,
    color: number;
    fasade?: DrawerFasadeObject;
    sec: number;
    cell?: number;
    row?: number;
    extra?: number;
    item?: number;
    error?: boolean;
    moduleThickness?: number;
    isProfile?: ProfileData;
}

export enum LOOPSIDE {
    left = 4693746,
    left_on_partition = 7080918,
    right = 4693757,
    right_on_partition = 7080949,
    none = 13864508,
    top = 14981055
}

export interface LoopsmokAPI {
    ID: number,
    NAME: string,
    DETAIL_PICTURE: string,
    PREVIEW_PICTURE: string,
    CODE: string,
    SORT: number
}

export interface FasadeObject {
    id: number;
    type: "fasade";
    loopsSide: number | boolean;
    position: THREE.Vector2 | THREE.Vector3;
    width: number;
    height: number;
    material: TFasadeProp;
    minY: number;
    maxY: number;
    minX?: number;
    maxX?: number;
    error?: boolean;
    splitGroup?: number;
}

export const MANUFACTURER = {
    "innotech": 31,
    "иннотех": 31,
    "avantech": 29.25,
    "авантех": 29.25,
    "flowbox": 25,
    "флоубокс": 25,
    "квадро": 29,
}

export interface DrawerFasadeObject extends FasadeObject {
    manufacturerOffset: number;
    fasadeDrawerId: number;
    item: number;
    sec: number | null;
    cell?: number | null;
    row?: number | null;
}

export interface GridRowExtra {
    number: number;
    width: number;
    height: number;
    position: THREE.Vector2;
    type: "rowExtra";
    fillings?: FillingObject[];
}

export interface GridCellsRow {
    number: number;
    width: number;
    height: number;
    position: THREE.Vector2;
    type: "rowCell";
    extras?: GridRowExtra[];
    fillings?: FillingObject[];
}

export interface GridCell {
    number: number;
    width: number;
    height: number;
    position: THREE.Vector2;
    type: "cell";
    cellsRows?: GridCellsRow[];
    fillings?: FillingObject[];
}

export interface GridSection {
    number: number;
    width: number;
    height: number;
    position: THREE.Vector2;
    type: "section";
    cells: GridCell[];
    fasades?: FasadeObject[];
    fasadesDrawers?: FasadeObject[];
    loops?: [];
    loopsSides?: {};
    hiTechProfiles?: FillingObject[];
    fillings?: FillingObject[];
    // Гардеробная система (см. GridModule.moduleKind) — сектор не использует
    // cells/cellsRows/extras вовсе, содержимое сектора плоским списком здесь.
    wardrobeShelves?: WardrobeShelfPlacement[];
    // Тумбочки с ящиками (см. WardrobeCabinetPlacement) — отдельный от полок
    // массив, т.к. у тумбочки есть собственное вложенное наполнение (ящики).
    wardrobeCabinets?: WardrobeCabinetPlacement[];
}

// Профиль стоит на границе двух секторов (или на краю модуля), поэтому не
// принадлежит сектору, а лежит в GridModule.wardrobeProfiles длиной
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
// _FASADE, в отличие от WardrobeShelfPlacement.colorId), варианты зависят от
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

// Полка — плоская или наклонная (обувная, см.
// ShelfBuilder.buildWardrobeAngledShelf).
//
// productId — ссылка в _PRODUCTS (всегда 5975548, других полок в каталоге
// нет). colorId — материал из _FASADE, только при material==='ldsp'
// (варианты — _WARDROBE_SYSTEM[wardrobeProductId].shelf[productId].fasade);
// _FASADE[colorId].DEPTH даёт толщину вместо захардкоженных 18мм.
//
// kind — 'shelf' (по умолчанию; undefined тоже полка) или 'rail' (штанга из
// "Наполнение" -> "Вставка", группы
// _PRODUCTS[wardrobeProductId].FILLING_SECTION — см.
// getWardrobeFillingsGroups/RailsManager.addWardrobeRail). Штанга лежит в
// ТОМ ЖЕ wardrobeShelves ради полноценной коллизии: getWardrobeShelfMinGap/
// getWardrobeShelfFloorGap/findFreeWardrobeShelfPositionY/
// getWardrobeShelfDragBounds и авто-удаление по потолку сектора уже дженерик
// над {type, positionY, ...}. У штанги type всегда 'flat', material/colorId
// не используются, толщина — из railHeight (см. getWardrobeShelfPixiHeight).
export interface WardrobeShelfPlacement {
    id: number;
    productId: number;
    type: 'flat' | 'angled';
    material?: WardrobeShelfMaterial;
    colorId?: number;
    positionY: number;
    kind?: 'shelf' | 'rail';
    railHeight?: number;
}

// Универсальная тумбочка с ящиками (черновик — товара в каталоге пока нет,
// см. чат: ширина всегда = ширине сектора, поэтому отдельного поля width
// нет; высота фиксирована у товара (productId), но позиция по Y —
// произвольная, как у полки, а не всегда от пола).
export interface WardrobeDrawerPlacement {
    id: number;
    // productId/height и т.п. — пока не заведено, товара с ящиком в
    // каталоге ещё нет; добавится вместе с самим товаром "Универсальная тумбочка".
}

export interface WardrobeCabinetPlacement {
    id: number;
    productId: number;
    positionY: number;
    // Настраивается пользователем ("Добавить ящик"/"Удалить"), не
    // фиксировано у товара — см. чат.
    drawers: WardrobeDrawerPlacement[];
}

export const ErrorsType = {
    "loops": 'LOOPS',
    'fasades': 'FASADES',
    'fillings': 'FILLINGS',
}

export const ErrorsMessage = {
    "loops": 'Ошибка! Петли фасадов пересекаются с наполнением!',
    'fasades': 'Ошибка размера фасадов!',
    'fillings': 'Ошибка установки наполнения!',
}

export interface ErrorItem {
    type: typeof ErrorsType;
    message: typeof ErrorsMessage;
    list?: [];
    sections?: Object;
}

export interface ProfilesConfig {
    COLOR: number;
    colorsList: number[];
    onSectionSize?: boolean;
    sideProfile?: number,
    manufacturerOffset?: number;
}

export interface ProfileData {
    TYPE_PROFILE: string;
    offsetFasades: number;
    manufacturerOffset: number;
    isBottomHiTechProfile?: boolean;
    id: number;
    COLOR: number;
}

export interface HiTechProfileData {
    isVerticalItem: boolean;
    product: number;
    id: number;
    name: string;
    image: string;
    type: string;
    position: Position;
    size: Size;
    width: number;
    height: number;
    color: number;
    sec: number;
    cell: null | any; // или конкретный тип, если известен
    row: null | any;  // или конкретный тип, если известен
    extra: null | any; // или конкретный тип, если известен
    productGroupID: number;
    isProfile: ProfileData;
    moduleThickness: number;
}

export interface GridModule {
    width: number;
    height: number;
    depth?: number;
    productID: number;
    moduleThickness: number;
    moduleColor: number;
    sections: GridSection[];
    type: "module";
    horizont?: number;
    fasades?: FasadeObject[];
    isSlidingDoors?: boolean;
    isRestrictedModule?: boolean;
    leftWallThickness?: number;
    rightWallThickness?: number;
    noBottom?: boolean;
    noBackwall?: boolean
    noLoops?: boolean;
    errors?: Object;
    profilesConfig?: ProfilesConfig;
    // Не задано (undefined) = обычный "коробочный" УМ, как и раньше.
    // 'wardrobe' = гардеробная система — sections[] используются только для
    // ширины/позиции секторов и resize-драга, cells/cellsRows/extras внутри
    // них не используются вовсе (см. GridSection.wardrobeShelves,
    // WardrobeProfile, вариант "C" в SESSION_CONTEXT.md).
    moduleKind?: 'boxed' | 'wardrobe';
    wardrobeProfiles?: WardrobeProfile[];
}

export interface canvasConfig {
    canvasHeight: number,
    canvasWidth: number,
}

export interface TSelectedCell {
    sec: number | null,
    cell?: number | null,
    row?: number | null,
    extra?: number | null,
    item?: number | null
}


interface Position {
    x: number;
    y: number;
}
interface Size {
    x: number;
    y: number;
    z: number;
}

export type constructorMode = 'module' | 'fasades' | 'fillings';
export type alertType = "error" | "warning" | "success" | "info";
