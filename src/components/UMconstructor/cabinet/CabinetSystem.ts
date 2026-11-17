// ==== Универсальная тумбочка (CABINET) — чистые хелперы ====
// Без зависимостей от WardrobeSystem: тот сам импортирует отсюда
// (высота/отступы тумбочки в общей коллизии).

import {
    CABINET_SIDE_INSET,
    CABINET_HEIGHT_MIN,
    CABINET_HEIGHT_MAX,
    CABINET_DEFAULT_HEIGHT,
    CABINET_MIN_GAP,
    CABINET_DEFAULT_THICKNESS,
    CABINET_EXCLUDED_OPTION_IDS,
    CABINET_EXCLUDED_OPTION_GROUPS,
} from "./cabinetData.ts";
import type { WardrobeCabinetConfig } from "./types.ts";

export function isWardrobeCabinet(item: { type?: string } | null | undefined): boolean {
    return item?.type === 'cabinet';
}

export function clampCabinetHeight(height: number): number {
    return Math.min(Math.max(Number(height) || CABINET_DEFAULT_HEIGHT, CABINET_HEIGHT_MIN), CABINET_HEIGHT_MAX);
}

// Целые мм: ширина секции бывает дробной у сохранённых гардеробных.
export function getCabinetWidth(sectionWidth: number): number {
    return Math.max(Math.floor(sectionWidth - 2 * CABINET_SIDE_INSET), 0);
}

export function getCabinetHeight(item: { cabinet?: WardrobeCabinetConfig }): number {
    return clampCabinetHeight(item.cabinet?.height ?? CABINET_DEFAULT_HEIGHT);
}

export function getCabinetThickness(item: { cabinet?: WardrobeCabinetConfig }) {
    return { ...CABINET_DEFAULT_THICKNESS, ...(item.cabinet?.thickness ?? {}) };
}

// Отступ элемента секции от профиля по X, мм (полки/штанги — во всю ширину).
export function getWardrobeItemSideInset(item: { type?: string }): number {
    return isWardrobeCabinet(item) ? CABINET_SIDE_INSET : 0;
}

// Отступ от потолка секции (монтажной высоты), мм. У полок/штанг его нет.
export function getWardrobeItemCeilingGap(item: { type?: string }): number {
    return isWardrobeCabinet(item) ? CABINET_MIN_GAP : 0;
}

const NO_BOTTOM_OPTION_ID = 5738924;

// Убирает из CONFIG.OPTIONS опции, которых у тумбочки нет: не показываются и
// не применяются ни в редакторе, ни в 3D. Включённое "Без дна" сохранённого
// конфига снимается так же, как в useOptions.checkActive при снятии галки.
export function removeExcludedCabinetOptions(config: any): void {
    const options: any[] = config.OPTIONS ?? [];
    const hadNoBottom = options.some((option) => +option.id === NO_BOTTOM_OPTION_ID && option.active);

    config.OPTIONS = options.filter((option) =>
        !CABINET_EXCLUDED_OPTION_IDS.includes(+option.id)
        && !CABINET_EXCLUDED_OPTION_GROUPS.includes(+(option.group ?? 0)));

    if (hadNoBottom) {
        config.BACKWALL = { COLOR: config.MODULE_COLOR, SHOW: true };
        if (config.MODULEGRID) delete config.MODULEGRID.noBottom;
    }
}

export function createDefaultCabinetConfig(colorId?: number): WardrobeCabinetConfig {
    return {
        height: CABINET_DEFAULT_HEIGHT,
        thickness: { ...CABINET_DEFAULT_THICKNESS },
        colorId,
        drawers: [],
    };
}
