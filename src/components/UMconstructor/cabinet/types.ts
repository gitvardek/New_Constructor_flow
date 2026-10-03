// ==== Универсальная тумбочка (CABINET) — типы ====
// Тумбочка хранится в section.wardrobeFilling как элемент с type==='cabinet'
// (как штанга), чтобы коллизия/драг/авто-удаление работали без дублирования.
// Параметры корпуса — в поле cabinet этого элемента (WardrobeFillingItem).

export interface WardrobeCabinetThickness {
    side: number;
    top: number;
    back: number;
    bottom: number;
}

// Ящик внутри тумбочки — заведётся вместе с конфигуратором тумбочки.
export interface WardrobeCabinetDrawer {
    id: number;
}

// Ширины нет: она всегда = section.width - 2 * CABINET_SIDE_INSET.
// colorId — материал корпуса из _FASADE (по умолчанию первый ЛДСП полки).
// config — CONFIG товара УМ после редактора тумбочки (MODULEGRID, цвета, опции);
// нет, пока тумбочку не редактировали (cabinetEditSession.ts).
export interface WardrobeCabinetConfig {
    height: number;
    thickness: WardrobeCabinetThickness;
    colorId?: number;
    drawers: WardrobeCabinetDrawer[];
    config?: Record<string, any>;
}
