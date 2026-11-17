// ==== Универсальная тумбочка (CABINET) — 2D, палитра сцены ====
// Перекрашивает общую box-UM геометрию (PixiMethods.Shape/Section) в стиль
// гардеробной: корпус — деталями ЛДСП, область — задней стенкой в глубине,
// наполнение — по материалу/типу, выделение — обводкой поверх заливки, а не
// её подменой. Корпус и задняя стенка — ТЕ ЖЕ цвета, которыми тумбочка
// нарисована на канвасе гардеробной (render/CabinetGraphics.ts): одна и та же
// тумбочка выглядит одинаково в обоих окнах.
//
// Точка входа одна: SceneBuilder берёт эту палитру для ctx.sceneKind ===
// 'cabinet' (см. editor-v2/render2d/palette.ts про сам механизм).

import {
    UM_MATERIAL_COLORS,
    SELECTION_STROKE_COLOR,
    SELECTION_STROKE_WIDTH,
    type ScenePalette,
    type ScenePartColors,
} from "@/components/UMconstructor/editor-v2/render2d/palette.ts";
import { CABINET_COLORS } from "./CabinetGraphics.ts";

// Выделение в стиле гардеробной: заливка остаётся (она несёт тип детали),
// сверху ложится яркая обводка.
const selectable = (colors: ScenePartColors): ScenePartColors => ({
    ...colors,
    highlightFill: colors.fill,
    highlightStroke: SELECTION_STROKE_COLOR,
    highlightStrokeWidth: SELECTION_STROKE_WIDTH,
});

// Контур модуля = детали корпуса (боковины, крышка, дно): между областями
// видны именно они, как в CabinetGraphics.drawWardrobeCabinet.
const CORPUS: ScenePartColors = { ...CABINET_COLORS.panel };

// Область (секция/ячейка/ряд/уровень) — проём, в глубине задняя стенка.
// Без обводки: области разделяют сами детали корпуса (между ними виден
// CORPUS), а обводка на каждом уровне вложенности давала бы двойные линии.
const OPENING = selectable({ fill: CABINET_COLORS.back.fill });

// Сегмент фасада — панель ЛДСП перед проёмом. Тон между корпусом и задней
// стенкой: одинаковый с корпусом сливался бы с ним в одно пятно.
const FASADE = selectable({ fill: '#e4d3b8', stroke: CABINET_COLORS.panel.stroke });

// Наполнение — по логическому типу (FillingsManager пишет его в filling.type,
// см. ts/modules/fillings/FillingTypePredicates.classifyFillingType).
const FILLING_COLORS: Record<string, ScenePartColors> = {
    shelf: selectable(UM_MATERIAL_COLORS.ldsp),
    // Вертикальный разделитель — та же ЛДСП, тип читается по форме.
    vertical_shelf: selectable(UM_MATERIAL_COLORS.ldsp),
    glass_shelf: selectable({ ...UM_MATERIAL_COLORS.glass, alpha: UM_MATERIAL_COLORS.glassAlpha }),
    drawer: selectable(UM_MATERIAL_COLORS.ldspDark),
    profile: selectable(UM_MATERIAL_COLORS.metal),
};

// Аксессуары ('any') — фурнитура, металл: отдельно от полок и ящиков.
const FILLING_DEFAULT = selectable(UM_MATERIAL_COLORS.metal);

// Ручка — металл с обводкой: бледно-серая ручка box-UM на светлом фасаде
// тумбочки почти не видна (у box-UM фасад синий, там контраст был).
const HANDLE: ScenePartColors = { ...UM_MATERIAL_COLORS.metal };

export const CABINET_SCENE_PALETTE: ScenePalette = {
    module: CORPUS,
    handle: HANDLE,
    cell: (data, gridType) => (gridType === 'fasades' || data?.type === 'fasade' ? FASADE : OPENING),
    filling: (data) => FILLING_COLORS[data?.type] ?? FILLING_DEFAULT,
};
