// ==== Редактор УМ v2 — общий 2D-кит: палитра ====
// Цвета материалов, общие для сцен гардеробной и тумбочки: одна и та же
// деталь должна читаться одинаково на любом канвасе (ЛДСП — оранжевый,
// стекло — полупрозрачное синее, металл — серый). Значения подобраны и
// приняты на гардеробной (wardrobe/render/WardrobeColors.ts, она берёт их
// отсюда), тумбочка использует те же.
//
// ScenePalette — способ перекрасить ОБЩУЮ box-UM геометрию
// (PixiMethods.Shape/Section) под конкретный вид сцены, не разводя if'ы по
// рендеру: SceneBuilder спрашивает у палитры цвет части, а палитра вида
// лежит рядом со своей сценой (cabinet/render/cabinetPalette.ts). Сцена без
// палитры (box-UM) выглядит как раньше — цвета по умолчанию ниже.

export interface ScenePartColors {
    fill: string;
    stroke?: string;
    // Прозрачность заливки (стекло).
    alpha?: number;
    // Выделение. Приём гардеробной — заливку НЕ подменять (она несёт тип
    // детали), а добавлять обводку поверх; box-UM наоборот меняет заливку,
    // поэтому оба поля опциональны.
    highlightFill?: string;
    highlightStroke?: string;
    highlightStrokeWidth?: number;
}

export interface ScenePalette {
    // Контур модуля (у тумбочки — детали корпуса).
    module?: ScenePartColors | null;
    // Область сетки: секция/ячейка/ряд/уровень или сегмент фасада. gridType —
    // тот же, что у SceneBuilder.createSector ("module" | "fasades").
    cell?: (data: any, gridType?: string) => ScenePartColors | null;
    // Наполнение (PixiMethods.Shape).
    filling?: (data: any) => ScenePartColors | null;
    // Ручка на фасаде. Петли не входят: у box-UM они и так тёмно-серые,
    // читаются на любой заливке фасада.
    handle?: ScenePartColors | null;
}

export const UM_MATERIAL_COLORS = {
    // ЛДСП — полка, вертикальный разделитель.
    ldsp: { fill: '#eea557', stroke: '#181005' },
    // ЛДСП, второй тон — наклонная полка у гардеробной, ящик у тумбочки.
    ldspDark: { fill: '#9c785e', stroke: '#050301' },
    // Стекло — свой цвет плюс прозрачность (glassAlpha).
    glass: { fill: '#80bdfd', stroke: '#0a1e33' },
    glassAlpha: 0.55,
    // Металл — штанга, профиль, фурнитура.
    metal: { fill: '#c4c8cc', stroke: '#5a5e63' },
} as const;

// Обводка выделенного объекта — яркая, не встречается среди цветов самих
// деталей, чтобы читаться поверх любой из них.
export const SELECTION_STROKE_COLOR = '#56a55fe2';
export const SELECTION_STROKE_WIDTH = 4;

// Наполнение box-UM (PixiMethods.Shape) — цвета по умолчанию, когда у сцены
// палитры нет: тот же коричневый на любой тип наполнения, выделение —
// подменой заливки.
export const BOX_UM_FILLING_COLORS: ScenePartColors = {
    fill: '#875003',
    stroke: '#b86c02',
    highlightFill: '#b86c02',
    highlightStroke: '#875003',
};
