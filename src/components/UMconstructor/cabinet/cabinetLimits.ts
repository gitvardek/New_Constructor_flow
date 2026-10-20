// Габариты тумбочки, которые задаёт гардеробная. Ширина в редакторе тумбочки не
// меняется, высота — в [CABINET_HEIGHT_MIN, maxHeight], где maxHeight — место до
// ближайшего элемента выше (с зазором пары) или до потолка секции МИНУС крышка:
// она стоит на корпусе и занимает это же место (cabinetTopPanel.ts). Иначе
// WardrobeGridReset удалил бы тумбочку как "не помещается". Глубину корпуса
// пользователь тоже не вводит, но она НЕ равна глубине системы: её считает
// cabinetDepth.ts по крышке и фасадам, и в редакторе она меняется вместе с ними
// (cabinetEditSession.syncDepth).
import {
    getWardrobeSectionInstallableHeight,
    getWardrobeShelfDepth,
    getWardrobeShelfMinGap,
} from "@/components/UMconstructor/wardrobe/WardrobeSystem.ts";
import { CABINET_HEIGHT_MIN, CABINET_HEIGHT_MAX } from "./cabinetData.ts";
import { getCabinetWidth, getWardrobeItemCeilingGap } from "./CabinetSystem.ts";
import { getCabinetBodyDepth } from "./cabinetDepth.ts";
import { getWardrobeCabinetTopThickness } from "./cabinetTopPanel.ts";

export interface CabinetEditLimits {
    width: number;
    // Глубина гардеробной системы: в неё укладываются корпус, фасад и крышка.
    systemDepth: number;
    // Глубина корпуса для СОХРАНЁННОГО конфига тумбочки.
    depth: number;
    minHeight: number;
    // Максимум для КОРПУСА сохранённого конфига (место минус его крышка).
    maxHeight: number;
    // Место под тумбочку ЦЕЛИКОМ (корпус + крышка): крышку включают уже в
    // редакторе, и максимум корпуса пересчитывается от этой величины
    // (getCabinetMaxCarcassHeight).
    maxTotalHeight: number;
}

// Максимум высоты КОРПУСА при крышке толщиной topThickness: из места под
// тумбочку вычитается крышка, затем общий потолок высоты корпуса.
export const getCabinetMaxCarcassHeight = (maxTotalHeight: number, topThickness: number): number =>
    Math.max(CABINET_HEIGHT_MIN, Math.min(CABINET_HEIGHT_MAX, Math.floor(maxTotalHeight - topThickness)));

export const getCabinetEditLimits = (grid: any, secIndex: number, cabinetId: number): CabinetEditLimits | null => {
    const section = grid?.sections?.[secIndex];
    const items: any[] = section?.wardrobeFilling ?? [];
    const cabinet = items.find((item) => item.id === cabinetId);
    if (!section || !cabinet) return null;

    const systemDepth = getWardrobeShelfDepth(grid);

    // Зазоры пар — от глубины СИСТЕМЫ: правила общие с полками и штангами.
    let top = getWardrobeSectionInstallableHeight(grid, secIndex) - getWardrobeItemCeilingGap(cabinet);
    items.forEach((other) => {
        if (other.id === cabinetId || other.positionY <= cabinet.positionY) return;
        top = Math.min(top, other.positionY - getWardrobeShelfMinGap(cabinet, other, systemDepth, grid.productID));
    });

    const maxTotalHeight = top - cabinet.positionY;

    return {
        width: getCabinetWidth(section.width),
        systemDepth,
        depth: getCabinetBodyDepth(systemDepth, cabinet.cabinet?.config),
        minHeight: CABINET_HEIGHT_MIN,
        maxHeight: getCabinetMaxCarcassHeight(maxTotalHeight, getWardrobeCabinetTopThickness(cabinet)),
        maxTotalHeight,
    };
};

// Нужна ли пересборка конфига УМ тумбочки (cabinet/session/syncCabinetConfig.ts):
// конфига нет или ширина/глубина его сетки разошлись с расчётными. Глубина
// расходится не только от смены глубины системы, но и когда сохранённый конфиг
// считали по другим правилам (крышка/фасад — cabinetDepth.ts).
export const isCabinetConfigStale = (wardrobeGrid: any, secIndex: number, item: any): boolean => {
    const grid = item.cabinet?.config?.MODULEGRID;
    if (!grid || !Object.keys(grid).length) return true;

    const limits = getCabinetEditLimits(wardrobeGrid, secIndex, item.id);
    return !!limits && (grid.width !== limits.width || grid.depth !== limits.depth);
};
