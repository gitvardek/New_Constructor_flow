//@ts-nocheck

// ==== Универсальная тумбочка (CABINET) — 2D (PIXI) ====
// Фронтальная проекция корпуса. Зовётся из WardrobeSceneBuilder.createWardrobeShelf
// (первичная отрисовка) и WardrobeDragEngine.onWardrobeShelfDragMove
// (перерисовка того же Graphics при драге).

import { Graphics } from "pixi.js";
import { UM_MATERIAL_COLORS } from "@/components/UMconstructor/editor-v2/render2d/palette.ts";
import { getWardrobeFillingSideGap } from "@/components/UMconstructor/wardrobe/WardrobeSystem.ts";
import { CABINET_SIDE_INSET } from "../cabinetData.ts";
import { getCabinetThickness } from "../CabinetSystem.ts";
import { getWardrobeCabinetTopThickness } from "../cabinetTopPanel.ts";

export const CABINET_COLORS = {
    // Детали корпуса (боковины, крышка, дно).
    panel: { fill: '#d8c3a5', stroke: '#3b2f22' },
    // Задняя стенка — видна в проёме между деталями.
    back: { fill: '#f3ece2' },
    // Накладка на крышку/столешница — отдельная деталь поверх корпуса, цвет
    // из общего кита (второй тон ЛДСП), чтобы не сливаться с его деталями.
    top: { fill: UM_MATERIAL_COLORS.ldspDark.fill, stroke: '#3b2f22' },
} as const;

// Горизонтальный габарит тумбочки в локальных px секции.
export function getCabinetSpanPx(ctx, sectorWidthPx: number): { x: number; width: number } {
    const insetPx = ctx.getPixelWidth(CABINET_SIDE_INSET);
    return { x: insetPx, width: Math.max(sectorWidthPx - 2 * insetPx, 2) };
}

// Габарит КРЫШКИ: она шире корпуса — идёт по ширине секции с тем же зазором
// от профилей, что у полки (как в 3D, CabinetMeshBuilder.TOPFASADE_WIDTH).
function getCabinetTopSpanPx(ctx, sectorWidthPx: number): { x: number; width: number } {
    const gapPx = ctx.getPixelWidth(getWardrobeFillingSideGap('shelf'));
    return { x: gapPx, width: Math.max(sectorWidthPx - 2 * gapPx, 2) };
}

// Габарит тумбочки ЦЕЛИКОМ: с крышкой он шире корпуса (она свисает над
// боковинами). По нему рисуется обводка выделения, чтобы крышка не торчала
// за рамку (WardrobeSceneBuilder.getWardrobeItemSpanPx).
export function getCabinetOuterSpanPx(ctx, item, sectorWidthPx: number): { x: number; width: number } {
    return getWardrobeCabinetTopThickness(item)
        ? getCabinetTopSpanPx(ctx, sectorWidthPx)
        : getCabinetSpanPx(ctx, sectorWidthPx);
}

// Рисует тумбочку в graphic (вызывающий делает graphic.clear() при перерисовке).
// topPx/heightPx — вертикаль габарита в локальных координатах секции; в этот
// габарит входит и крышка (getWardrobeShelfPixiHeight), поэтому она занимает
// верхнюю полосу, а корпус — всё, что ниже неё.
export function drawWardrobeCabinet(graphic: Graphics, ctx, item, sectorWidthPx: number, topPx: number, heightPx: number) {
    const topThicknessMm = getWardrobeCabinetTopThickness(item);
    // Крышка не толще половины габарита и не тоньше 1px — как детали корпуса ниже.
    const topPanelHeightPx = topThicknessMm
        ? Math.min(Math.max(ctx.getPixelHeight(topThicknessMm), 1), heightPx / 2)
        : 0;

    if (topPanelHeightPx) {
        const topSpan = getCabinetTopSpanPx(ctx, sectorWidthPx);
        graphic.rect(topSpan.x, topPx, topSpan.width, topPanelHeightPx);
        graphic.fill(CABINET_COLORS.top.fill);
        graphic.rect(topSpan.x, topPx, topSpan.width, topPanelHeightPx);
        graphic.stroke({ width: 1, color: CABINET_COLORS.top.stroke, alignment: 1 });
    }

    // Корпус — под крышкой.
    const bodyTopPx = topPx + topPanelHeightPx;
    const bodyHeightPx = Math.max(heightPx - topPanelHeightPx, 2);
    const { x, width } = getCabinetSpanPx(ctx, sectorWidthPx);
    const t = getCabinetThickness(item);

    // Не тоньше 1px, и детали не больше половины габарита — иначе на мелком масштабе перекрываются.
    const sidePx = Math.min(Math.max(ctx.getPixelWidth(t.side), 1), width / 2);
    const topPanelPx = Math.min(Math.max(ctx.getPixelHeight(t.top), 1), bodyHeightPx / 2);
    const bottomPanelPx = Math.min(Math.max(ctx.getPixelHeight(t.bottom), 1), bodyHeightPx / 2);
    const innerWidth = Math.max(width - 2 * sidePx, 0);

    graphic.rect(x, bodyTopPx, width, bodyHeightPx);
    graphic.fill(CABINET_COLORS.back.fill);

    graphic.rect(x, bodyTopPx, sidePx, bodyHeightPx);
    graphic.rect(x + width - sidePx, bodyTopPx, sidePx, bodyHeightPx);
    graphic.rect(x + sidePx, bodyTopPx, innerWidth, topPanelPx);
    graphic.rect(x + sidePx, bodyTopPx + bodyHeightPx - bottomPanelPx, innerWidth, bottomPanelPx);
    graphic.fill(CABINET_COLORS.panel.fill);

    graphic.rect(x, bodyTopPx, width, bodyHeightPx);
    graphic.stroke({ width: 1, color: CABINET_COLORS.panel.stroke, alignment: 1 });
}
