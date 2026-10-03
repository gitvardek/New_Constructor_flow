// Габариты тумбочки, которые задаёт гардеробная. Ширина и глубина в редакторе
// тумбочки не меняются, высота — в [CABINET_HEIGHT_MIN, maxHeight], где
// maxHeight — место до ближайшего элемента выше (с зазором пары) или до потолка
// секции. Иначе WardrobeGridReset удалил бы тумбочку как "не помещается".
import {
    getWardrobeSectionInstallableHeight,
    getWardrobeShelfDepth,
    getWardrobeShelfMinGap,
} from "@/components/UMconstructor/wardrobe/WardrobeSystem.ts";
import { CABINET_HEIGHT_MIN, CABINET_HEIGHT_MAX } from "./cabinetData.ts";
import { getCabinetWidth, getWardrobeItemCeilingGap } from "./CabinetSystem.ts";

export interface CabinetEditLimits {
    width: number;
    depth: number;
    minHeight: number;
    maxHeight: number;
}

export const getCabinetEditLimits = (grid: any, secIndex: number, cabinetId: number): CabinetEditLimits | null => {
    const section = grid?.sections?.[secIndex];
    const items: any[] = section?.wardrobeFilling ?? [];
    const cabinet = items.find((item) => item.id === cabinetId);
    if (!section || !cabinet) return null;

    const depth = getWardrobeShelfDepth(grid);

    let top = getWardrobeSectionInstallableHeight(grid, secIndex) - getWardrobeItemCeilingGap(cabinet);
    items.forEach((other) => {
        if (other.id === cabinetId || other.positionY <= cabinet.positionY) return;
        top = Math.min(top, other.positionY - getWardrobeShelfMinGap(cabinet, other, depth, grid.productID));
    });

    return {
        width: getCabinetWidth(section.width),
        depth,
        minHeight: CABINET_HEIGHT_MIN,
        maxHeight: Math.max(CABINET_HEIGHT_MIN, Math.min(CABINET_HEIGHT_MAX, Math.floor(top - cabinet.positionY))),
    };
};

// Нужна ли пересборка конфига УМ тумбочки (cabinet/session/syncCabinetConfig.ts):
// конфига нет или ширина/глубина его сетки разошлись с секцией.
export const isCabinetConfigStale = (wardrobeGrid: any, secIndex: number, item: any): boolean => {
    const grid = item.cabinet?.config?.MODULEGRID;
    if (!grid || !Object.keys(grid).length) return true;

    const limits = getCabinetEditLimits(wardrobeGrid, secIndex, item.id);
    return !!limits && (grid.width !== limits.width || grid.depth !== limits.depth);
};
