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

export type constructorMode = 'module' | 'fasades' | 'fillings';
export type alertType = "error" | "warning" | "success" | "info";
