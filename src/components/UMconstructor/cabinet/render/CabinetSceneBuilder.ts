//@ts-nocheck

// ==== Универсальная тумбочка (CABINET) — 2D, слой обозначений ====
// Геометрию тумбочки рисует общий box-UM SceneBuilder (сетка у неё box-UM:
// секции -> ячейки -> вертикальные/горизонтальные ячейки, наполнение, фасады).
// Здесь поверх неё добавляется то, чем 2D гардеробной отличается от box-UM:
// размерные линии, нейминги областей и расстояния наполнения —
// "отступы/визуал неймингов/расстояния" (постановка пользователя).
//
// Точка входа одна: SceneBuilder.renderGrid() после своей отрисовки зовёт
// renderCabinetOverlay() для сцены тумбочки (ctx.sceneKind === 'cabinet').
// Собственные "N мм" box-UM (PixiMethods.Section.drawDimensions) при этом
// выключены — их заменяют линии отсюда (уточнение пользователя).
//
// КООРДИНАТЫ — локальные для модуля (те же, что у cell.xOffset/yOffset и
// filling.position): отступ канваса даёт сдвиг самих контейнеров сцены
// (SceneBuilder.renderGrid), а не слагаемое в каждой координате. Отрицательные
// X/Y попадают в полосу отступа СЛЕВА и НАД модулем — там габариты секции.

import RenderContext from "@/components/UMconstructor/utils/render2d/RenderContext.ts";
import {
    createHorizontalDimension,
    createVerticalDimension,
    createNameLabel,
} from "@/components/UMconstructor/editor-v2/render2d/dimensions.ts";

// Обозначения тумбочки крупнее дефолтных (уточнение пользователя: "сделать
// обозначения более видимыми") и ПРОСТО ЧЁРНЫЕ, без обводки и тени (решение
// пользователя): любая обводка при кегле 13 смыкается между соседними цифрами
// и подпись превращается в чёрное пятно. Гардеробная свой вид сохраняет —
// стиль передаётся параметром, а не меняется в ките.
const LABEL_TEXT_STYLE = {
    fontSize: 13,
    fontWeight: '400',
    fill: '#000000',
};

const DIMENSION_STYLE = {
    textStyle: LABEL_TEXT_STYLE,
    lineColor: 0x4a5059,
};

const NAME_STYLE = {
    textStyle: LABEL_TEXT_STYLE,
};

// Вынос габаритов секции за модуль (в полосу отступа канваса): ширина — над
// верхом, высота — левее левого края.
const SECTION_WIDTH_LINE_OFFSET_PX = 24;
const SECTION_NAME_OFFSET_PX = 6;
const SECTION_HEIGHT_LINE_OFFSET_PX = 16;

// Ниже этих размеров подпись/линия в область не влезают и только мешают.
const MIN_WIDTH_FOR_DIMENSION_PX = 46;
const MIN_HEIGHT_FOR_DIMENSION_PX = 34;
const MIN_AREA_FOR_LABEL_PX = 18;

// Отступ размерной линии от края своей области.
const DIMENSION_INSET_PX = 6;

export default class CabinetSceneBuilder {
    ctx: RenderContext

    constructor(ctx: RenderContext) {
        this.ctx = ctx
    }

    // sectionLabel — "Секция тумбочки" и т.п. (editor-v2/policy/editorPolicy),
    // приходит из Render2D пропом: рендер не знает про Vue-контекст панелей.
    renderCabinetOverlay(moduleGrid, sectionLabel = 'Секция') {
        const ctx = this.ctx

        // Режим расстояний наполнения — тот же переключатель, что у
        // гардеробной ("Между объектами" / "До нижнего края"), стор у сессии
        // тумбочки свой, поэтому поле переиспользуется без конфликта.
        const dimensionMode = ctx.UMconstructor?.value?.UM_STORE.wardrobeShelfDimensionMode ?? 'floor'

        moduleGrid.sections?.forEach((section, sectionIndex) => {
            this.drawSectionDimensions(section, sectionIndex, sectionLabel)

            // Наполнение самой секции (без ячеек) — область = секция.
            this.drawAreaFillings(section, dimensionMode)

            const singleCell = section.cells?.length === 1

            section.cells?.forEach((cell, cellIndex) => {
                // У единственной ячейки высота совпадает с высотой секции —
                // она уже вынесена слева от модуля, второй раз не дублируем.
                this.drawAreaDimensions(cell, {
                    width: cell.width,
                    height: cell.height,
                    showWidth: cell.width !== section.width,
                    showHeight: !singleCell,
                })
                this.drawAreaFillings(cell, dimensionMode)

                cell.cellsRows?.forEach((row, rowIndex) => {
                    // Ряд делит ячейку по ШИРИНЕ — его собственный размер это ширина.
                    this.drawAreaDimensions(row, { width: row.width, height: cell.height, showHeight: false })
                    this.drawAreaFillings(row, dimensionMode)

                    row.extras?.forEach((extra, extraIndex) => {
                        // Уровень делит ряд по ВЫСОТЕ — ширина у него рядная, не своя.
                        this.drawAreaDimensions(extra, { width: row.width, height: extra.height, showWidth: false })
                        this.drawAreaFillings(extra, dimensionMode)
                    })
                })
            })
        })
    }

    // Габариты секции ВЫНЕСЕНЫ за модуль (уточнение пользователя): ширина —
    // линией над верхом модуля, высота — линией левее левого края, нейминг —
    // между шириной и модулем. Внутри они наезжали на наполнение и на номера
    // областей, которые box-UM рисует по центру (SceneBuilder.createSectioNum).
    private drawSectionDimensions(section, sectionIndex: number, sectionLabel: string) {
        const ctx = this.ctx
        const x = section.xOffset ?? 0
        const y = section.yOffset ?? 0
        const widthPx = ctx.getPixelWidth(section.width)
        const heightPx = ctx.getPixelHeight(section.height)

        // Над МОДУЛЕМ (y < 0), а не над секцией: верх секции лежит ниже
        // верхней детали корпуса, там линия садилась прямо на неё.
        ctx.sectionLables.push(createHorizontalDimension(
            x, x + widthPx, -SECTION_WIDTH_LINE_OFFSET_PX, section.width, DIMENSION_STYLE,
        ))
        ctx.sectionLables.push(createNameLabel(
            `${sectionLabel} ${sectionIndex + 1}`, x + 4, -SECTION_NAME_OFFSET_PX, 0, 1, false, undefined, NAME_STYLE,
        ))

        // Высота — только у ПЕРВОЙ секции: слева от модуля место одно, а
        // высота у секций общая (box-UM делит модуль по вертикали).
        if (sectionIndex === 0 && heightPx > 0) {
            ctx.sectionLables.push(createVerticalDimension(
                y, y + heightPx, -SECTION_HEIGHT_LINE_OFFSET_PX, section.height, -1, false, DIMENSION_STYLE,
            ))
        }
    }

    // Размерные линии области: высота — слева внутри, ширина — сверху внутри.
    // Номер области (1.2.1) рисует box-UM по центру, здесь он не дублируется.
    private drawAreaDimensions(area, { width, height, showWidth = true, showHeight = true }) {
        const ctx = this.ctx
        const x = area.xOffset
        const y = area.yOffset
        if (x == null || y == null) return

        const widthPx = ctx.getPixelWidth(width)
        const heightPx = ctx.getPixelHeight(height)

        if (showHeight && heightPx >= MIN_HEIGHT_FOR_DIMENSION_PX && widthPx >= MIN_AREA_FOR_LABEL_PX) {
            ctx.sectionLables.push(createVerticalDimension(
                y, y + heightPx, x + DIMENSION_INSET_PX, height, 1, false, DIMENSION_STYLE,
            ))
        }

        if (showWidth && widthPx >= MIN_WIDTH_FOR_DIMENSION_PX && heightPx >= MIN_AREA_FOR_LABEL_PX) {
            ctx.sectionLables.push(createHorizontalDimension(
                x, x + widthPx, y + DIMENSION_INSET_PX + 8, width, DIMENSION_STYLE,
            ))
        }
    }

    // Расстояния наполнения области. 'floor' — высота от ДНА ТУМБОЧКИ ИЗНУТРИ
    // прямо в подписи (FillingsCore.getAbsolutePositionY уже вычитает дно),
    // как у полок гардеробной; 'gap' — отдельные линии между соседями.
    private drawAreaFillings(area, dimensionMode: 'gap' | 'floor') {
        const ctx = this.ctx
        const fillings = area?.fillings
        if (!fillings?.length) return

        if (dimensionMode === 'floor') {
            fillings.forEach((filling) => {
                const bottomMm = ctx.UMconstructor?.value?.FILLINGS.getAbsolutePositionY(filling, area) ?? 0
                const labelY = ctx.getPixelHeight(filling.position.y) + ctx.getPixelHeight(filling.height) + 2
                ctx.sectionLables.push(createNameLabel(
                    `${Math.round(bottomMm)} мм`,
                    ctx.getPixelWidth(filling.position.x) + ctx.getPixelWidth(filling.width) / 2,
                    labelY,
                    0.5, 0, false, undefined, NAME_STYLE,
                ))
            })
            return
        }

        // Y наполнения растёт ВНИЗ (PIXI), поэтому "ниже" — больший position.y.
        const sorted = [...fillings].sort((a, b) => a.position.y - b.position.y)
        for (let i = 1; i < sorted.length; i++) {
            const upper = sorted[i - 1]
            const lower = sorted[i]
            const upperBottomPx = ctx.getPixelHeight(upper.position.y + upper.height)
            const lowerTopPx = ctx.getPixelHeight(lower.position.y)
            const gapMm = lower.position.y - (upper.position.y + upper.height)
            if (gapMm <= 0) continue

            const xPx = ctx.getPixelWidth(lower.position.x + lower.width) - DIMENSION_INSET_PX
            // haloText=false: "гало" кита (белым с обводкой 3px) приходит вместе
            // со своей обводкой, и она НЕ отменяется стилем тумбочки — merge
            // перекрывает только заданные поля. Именно она превращала подпись
            // зазора в чёрное пятно. У тумбочки свой стиль подписи.
            ctx.sectionLables.push(createVerticalDimension(
                upperBottomPx, lowerTopPx, xPx, gapMm, 1, false, DIMENSION_STYLE,
            ))
        }
    }
}
