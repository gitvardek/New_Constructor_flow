// ==== Гардеробная система (WARDROBE) ====
// Вспомогательные PIXI-примитивы для "динамического обозначения расстояний"
// на канвасе (уточнение пользователя): ширина секций (внутренняя часть),
// расстояния между полками, высота профилей, плюс нейминги объектов
// (Секция N / Полка N / Штанга N / Профиль N). Отдельный файл (не внутри
// SceneBuilder.ts) — чистые функции без состояния, переиспользуются из
// нескольких мест SceneBuilder.ts (createWardrobeSector — размерные линии
// секции/полок в ЛОКАЛЬНЫХ координатах секции; renderWardrobeGrid — высота
// профиля в АБСОЛЮТНЫХ координатах канваса), не привязаны к this/ctx.
//
// Пересчитываются заново на КАЖДЫЙ renderGrid() (та же карусель, что и все
// остальные PIXI-элементы гардеробной системы) — обновляются вживую при
// драге полки/профиля, изменении ширины/глубины/высоты модуля и т.д.
//@ts-nocheck

import { Container, Graphics, Text } from "pixi.js";

const DIMENSION_LINE_COLOR = 0x9aa0ab;
const DIMENSION_TICK_PX = 4;

const DIMENSION_TEXT_STYLE = {
    fontFamily: 'Arial',
    fontSize: 10,
    fill: '#6b7078',
};

// "Гало" — светлая заливка + тёмная обводка, контрастно НЕЗАВИСИМО от того,
// что находится под текстом (в отличие от getContrastTextColor ниже, тут не
// нужно заранее знать точный цвет фона). Уточнение пользователя: подпись
// зазора между полками (createWardrobeSector, режим 'gap') стоит у самого
// края секции, справа, где почти всегда перекрывает тёмный профиль
// соседней границы — двигать саму позицию нельзя (пользователь явно попросил
// оставить "как до этого — справа"), а профилей несколько цветовых семей
// (WARDROBE_COLORS.profile), точный цвет здесь не известен без лишней связи
// с рендером профилей в другой функции — гало решает это без такой связи.
const DIMENSION_TEXT_STYLE_HALO = {
    fontFamily: 'Arial',
    fontSize: 10,
    fontWeight: '700',
    fill: '#ffffff',
    stroke: { color: '#20222a', width: 3 },
};

const NAME_LABEL_DARK_FILL = '#2b2f38';
const NAME_LABEL_LIGHT_FILL = '#f5f6f8';

const NAME_LABEL_TEXT_STYLE = {
    fontFamily: 'Arial',
    fontSize: 10,
    fill: NAME_LABEL_DARK_FILL,
    fontWeight: '600',
};

// Контрастный цвет текста относительно ФОНА, на котором он рисуется —
// уточнение пользователя: "если фон светлый — тёмные обозначения, если
// тёмный — светлые" (нейминг профиля/полки-штанги рисуется ПРЯМО НА их
// собственной заливке — WARDROBE_COLORS.profile[...]/shelf[...].fill — та
// может быть как тёмной (профили пола-потолка/стены и т.п.), так и светлой
// (флэт-полка/стекло/штанга), фиксированный тёмный цвет читался плохо на
// тёмных профилях, см. скриншот). Простая относительная яркость (веса
// ITU-R BT.601, тот же принцип, что и в WCAG-подобных эвристиках) — >0.5
// считается светлым фоном (даём тёмный текст), иначе тёмным (даём светлый).
function getContrastTextColor(bgColorHex: string): string {
    const hex = bgColorHex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? NAME_LABEL_DARK_FILL : NAME_LABEL_LIGHT_FILL;
}

// Горизонтальная размерная линия (для ширины секции) — засечки по концам,
// подпись в мм по центру НАД линией. x1Px/x2Px/yPx — ЛОКАЛЬНЫЕ координаты
// родительского контейнера (секции), см. createWardrobeSector.
export function createHorizontalDimension(x1Px: number, x2Px: number, yPx: number, mmValue: number): Container {
    const container = new Container();

    const graphics = new Graphics();
    graphics.moveTo(x1Px, yPx - DIMENSION_TICK_PX).lineTo(x1Px, yPx + DIMENSION_TICK_PX);
    graphics.moveTo(x2Px, yPx - DIMENSION_TICK_PX).lineTo(x2Px, yPx + DIMENSION_TICK_PX);
    graphics.moveTo(x1Px, yPx).lineTo(x2Px, yPx);
    graphics.stroke({ width: 1, color: DIMENSION_LINE_COLOR });
    container.addChild(graphics);

    const label = new Text({ text: `${Math.round(mmValue)}`, style: DIMENSION_TEXT_STYLE });
    label.anchor.set(0.5, 1);
    label.position.set((x1Px + x2Px) / 2, yPx - DIMENSION_TICK_PX - 1);
    container.addChild(label);

    return container;
}

// Вертикальная размерная линия (зазор между полками / высота профиля):
// засечки по концам, подпись в мм повёрнута на -90°, как в архитектурных
// чертежах — горизонтальный текст в узкое место рядом с объектом не влезает и
// перекрывает соседей. anchor(0.5,0.5) держит центр повёрнутого текста по
// середине линии независимо от направления поворота.
//
// labelSide — сторона подписи (1 = справа, по умолчанию; -1 = слева): у
// крайнего ПРАВОГО профиля подпись справа обрезается краем канваса, поэтому
// renderWardrobeGrid передаёт для него -1.
//
// haloText — DIMENSION_TEXT_STYLE_HALO вместо DIMENSION_TEXT_STYLE: зазор
// между полками (режим 'gap') стоит у края секции и почти всегда ложится на
// тёмный профиль, где обычный серый текст нечитаем.
export function createVerticalDimension(y1Px: number, y2Px: number, xPx: number, mmValue: number, labelSide: 1 | -1 = 1, haloText = false): Container {
    const container = new Container();

    const graphics = new Graphics();
    graphics.moveTo(xPx - DIMENSION_TICK_PX, y1Px).lineTo(xPx + DIMENSION_TICK_PX, y1Px);
    graphics.moveTo(xPx - DIMENSION_TICK_PX, y2Px).lineTo(xPx + DIMENSION_TICK_PX, y2Px);
    graphics.moveTo(xPx, y1Px).lineTo(xPx, y2Px);
    graphics.stroke({ width: 1, color: DIMENSION_LINE_COLOR });
    container.addChild(graphics);

    const label = new Text({ text: `${Math.round(mmValue)}`, style: haloText ? DIMENSION_TEXT_STYLE_HALO : DIMENSION_TEXT_STYLE });
    label.anchor.set(0.5, 0.5);
    label.rotation = -Math.PI / 2;
    label.position.set(xPx + labelSide * (DIMENSION_TICK_PX + 7), (y1Px + y2Px) / 2);
    container.addChild(label);

    return container;
}

// Подпись-нейминг объекта (Секция N / Полка N / Штанга N / Профиль N) —
// позиционированный Text, anchor задаёт вызывающий код (у разных типов
// объектов оно разное). vertical=true поворачивает на -90° (как
// createVerticalDimension выше), при повороте нужен anchor(0.5,0.5).
//
// bgColorHex (опционально) — цвет фона ПОД подписью (например
// WARDROBE_COLORS.shelf[...].fill, когда она лежит прямо на заливке объекта,
// а не на нейтральном фоне секции): текст берётся тёмным на светлом и
// светлым на тёмном (getContrastTextColor выше). Без параметра —
// фиксированный тёмный.
export function createWardrobeNameLabel(text: string, xPx: number, yPx: number, anchorX = 0, anchorY = 0, vertical = false, bgColorHex?: string): Text {
    const style = bgColorHex
        ? { ...NAME_LABEL_TEXT_STYLE, fill: getContrastTextColor(bgColorHex) }
        : NAME_LABEL_TEXT_STYLE;
    const label = new Text({ text, style });
    label.anchor.set(anchorX, anchorY);
    label.position.set(xPx, yPx);
    if (vertical) label.rotation = -Math.PI / 2;
    return label;
}
