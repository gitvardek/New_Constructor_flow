//@ts-nocheck

// ==== Универсальная тумбочка (CABINET) — 2D (PIXI) ====
// Фронтальная проекция корпуса. Зовётся из WardrobeSceneBuilder.createWardrobeShelf
// (первичная отрисовка) и WardrobeDragEngine.onWardrobeShelfDragMove
// (перерисовка того же Graphics при драге).

import { Graphics } from "pixi.js";
import { CABINET_SIDE_INSET } from "../cabinetData.ts";
import { getCabinetThickness } from "../CabinetSystem.ts";

export const CABINET_COLORS = {
    // Детали корпуса (боковины, крышка, дно).
    panel: { fill: '#d8c3a5', stroke: '#3b2f22' },
    // Задняя стенка — видна в проёме между деталями.
    back: { fill: '#f3ece2' },
} as const;

// Горизонтальный габарит тумбочки в локальных px секции.
export function getCabinetSpanPx(ctx, sectorWidthPx: number): { x: number; width: number } {
    const insetPx = ctx.getPixelWidth(CABINET_SIDE_INSET);
    return { x: insetPx, width: Math.max(sectorWidthPx - 2 * insetPx, 2) };
}

// Рисует корпус в graphic (вызывающий делает graphic.clear() при перерисовке).
// topPx/heightPx — вертикаль габарита в локальных координатах секции.
export function drawWardrobeCabinet(graphic: Graphics, ctx, item, sectorWidthPx: number, topPx: number, heightPx: number) {
    const { x, width } = getCabinetSpanPx(ctx, sectorWidthPx);
    const t = getCabinetThickness(item);

    // Не тоньше 1px, и детали не больше половины габарита — иначе на мелком масштабе перекрываются.
    const sidePx = Math.min(Math.max(ctx.getPixelWidth(t.side), 1), width / 2);
    const topPanelPx = Math.min(Math.max(ctx.getPixelHeight(t.top), 1), heightPx / 2);
    const bottomPanelPx = Math.min(Math.max(ctx.getPixelHeight(t.bottom), 1), heightPx / 2);
    const innerWidth = Math.max(width - 2 * sidePx, 0);

    graphic.rect(x, topPx, width, heightPx);
    graphic.fill(CABINET_COLORS.back.fill);

    graphic.rect(x, topPx, sidePx, heightPx);
    graphic.rect(x + width - sidePx, topPx, sidePx, heightPx);
    graphic.rect(x + sidePx, topPx, innerWidth, topPanelPx);
    graphic.rect(x + sidePx, topPx + heightPx - bottomPanelPx, innerWidth, bottomPanelPx);
    graphic.fill(CABINET_COLORS.panel.fill);

    graphic.rect(x, topPx, width, heightPx);
    graphic.stroke({ width: 1, color: CABINET_COLORS.panel.stroke, alignment: 1 });
}
