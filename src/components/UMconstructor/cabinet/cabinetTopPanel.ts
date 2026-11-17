// ==== Универсальная тумбочка (CABINET) — крышка ====
// Накладка на крышку и столешница — одно поле конфига УМ, CONFIG.TOPFASADECOLOR:
// SHOW + COLOR (полотно) либо SHOW + TABLE (товар-столешница). Правила для обеих
// одинаковые, поэтому читают их все отсюда:
// - глубина корпуса (cabinetDepth.ts): крышка забирает свес спереди;
// - габарит в секции (WardrobeSystem.getWardrobeShelfPixiHeight): крышка стоит
//   НАД корпусом, cabinet.height — высота только корпуса;
// - лимит высоты корпуса (cabinetLimits.ts) и отрисовка 2D (render/CabinetGraphics).
//
// Толщина — те же два источника, что у сборки (BuildProduct.applyBodyOverrides):
// у столешницы height её товара, у накладки DEPTH полотна. Материала нет в
// справочнике — сборка крышку пропускает, поэтому здесь 0, а не запасное число:
// иначе 2D и коллизия держали бы место под деталь, которой в 3D нет.
import { useModelState } from "@/store/appliction/useModelState.ts";

export function hasCabinetTopPanel(config: any): boolean {
    return !!config?.TOPFASADECOLOR?.SHOW;
}

// Толщина крышки, мм; 0 — крышки нет или её материал недоступен.
export function getCabinetTopPanelThickness(config: any): number {
    const top = config?.TOPFASADECOLOR;
    if (!top?.SHOW) return 0;

    const modelState = useModelState();
    const thickness = top.TABLE
        ? modelState._PRODUCTS[top.TABLE]?.height
        : modelState._FASADE[top.COLOR]?.DEPTH;

    return Number(thickness) || 0;
}

// То же от ЭЛЕМЕНТА секции гардеробной (section.wardrobeFilling): конфиг УМ
// лежит в item.cabinet.config, у неотредактированной тумбочки его ещё нет.
export function getWardrobeCabinetTopThickness(item: { type?: string; cabinet?: { config?: any } }): number {
    return item?.type === 'cabinet' ? getCabinetTopPanelThickness(item.cabinet?.config) : 0;
}
