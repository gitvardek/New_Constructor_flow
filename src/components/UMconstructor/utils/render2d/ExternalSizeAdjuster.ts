// Изменение размеров секций/фасадов по числовому вводу из правой панели
// (в отличие от перетаскивания разделителей мышью — см. DividerDragEngine).
// Вынесено из Render2D.vue (Фаза 2e рефакторинга, см.
// C:\Users\MG_GO.MG\.claude\plans\iterative-launching-lerdorf.md).
//@ts-nocheck

import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import RenderContext from "./RenderContext.ts";
import { UM_PARAMS } from "./../Const.ts";

const { MIN_SECTION_WIDTH, MIN_SECTION_HEIGHT, MIN_FASADE_HEIGHT, MIN_FASADE_WIDTH } = UM_PARAMS;

export default class ExternalSizeAdjuster {
    ctx: RenderContext

    constructor(ctx: RenderContext) {
        this.ctx = ctx
    }

    adjustSectionSize(
        sectionIndex,
        cellIndex,
        rowIndex,
        extraIndex,
        newValue,
        dimension = "width",
    ) {
        const ctx = this.ctx
        const minValue =
            dimension === "width" ? MIN_SECTION_WIDTH : MIN_SECTION_HEIGHT;
        newValue = Math.max(Math.floor(newValue / ctx.props.step) * ctx.props.step, minValue);
        if (dimension === "width") newValue = Math.min(newValue, ctx.effectiveMaxSectionWidth.value);
        let calcValue;

        const module = ctx.props.module;
        if (!sectionIndex && sectionIndex !== 0) {
            //module[dimension] = newValue
            calcValue = newValue;
        } else {
            const section = module.sections[sectionIndex];
            const cell = section.cells?.[cellIndex];
            const row = cell?.cellsRows?.[rowIndex];
            const extra = row?.extras?.[extraIndex];
            const currentRow = extra || row || cell || section;

            let next, prev;
            switch (currentRow.type) {
                case "rowExtra":
                    prev = row.extras[extraIndex - 1];
                    next = row.extras[extraIndex + 1];
                    break;
                case "rowCell":
                    prev = cell.cellsRows[rowIndex - 1];
                    next = cell.cellsRows[rowIndex + 1];
                    break;
                case "cell":
                    prev = section.cells[cellIndex - 1];
                    next = section.cells[cellIndex + 1];
                    break;
                case "section":
                    prev = module.sections[sectionIndex - 1];
                    next = module.sections[sectionIndex + 1];
                    break;
            }

            let nextRow = next || prev;

            if (dimension === "width") {
                if (nextRow) {
                    let curMin = next
                        ? currentRow.maxX
                        : currentRow.minX || MIN_SECTION_WIDTH;
                    if (currentRow.cells?.length) {
                        let count = 1;
                        currentRow.cells.forEach((elem) => {
                            if (elem.cellsRows?.length > count) {
                                count = elem.cellsRows.length;
                            }
                        });

                        curMin = Math.max(
                            curMin,
                            MIN_SECTION_WIDTH * count + module.moduleThickness * (count - 1),
                        );
                    }

                    let nextMin = next ? nextRow.minX : nextRow.maxX || MIN_SECTION_WIDTH;
                    if (nextRow.cells?.length) {
                        let count = 1;
                        nextRow.cells.forEach((elem) => {
                            if (elem.cellsRows?.length > count) {
                                count = elem.cellsRows.length;
                            }
                        });

                        nextMin = Math.max(
                            nextMin,
                            MIN_SECTION_WIDTH * count + module.moduleThickness * (count - 1),
                        );
                    }

                    const totalWidth = currentRow.width + nextRow.width;
                    calcValue = this.updateSizes(
                        newValue,
                        dimension,
                        currentRow,
                        nextRow,
                        totalWidth,
                        curMin,
                        nextMin,
                    );
                } else {
                    calcValue = newValue;
                }

            } else {
                if (nextRow) {

                    nextRow = prev || next;

                    const contentHeight = (entity) =>
                        ctx.UMconstructor.value?.SHELVES.getCellMinHeight(entity, module) ?? MIN_SECTION_HEIGHT;

                    let curMin = Math.max(contentHeight(currentRow), MIN_SECTION_HEIGHT);

                    if (currentRow.cellsRows?.length) {
                        let count = 1;
                        currentRow.cellsRows.forEach((elem) => {
                            if (elem.extras?.length > count) {
                                count = elem.extras.length;
                            }
                        });

                        curMin = Math.max(
                            curMin,
                            MIN_SECTION_HEIGHT * count + module.moduleThickness * (count - 1),
                        );
                    }

                    let nextMin = Math.max(contentHeight(nextRow), MIN_SECTION_HEIGHT);
                    if (nextRow.cells?.length) {
                        let count = 1;
                        nextRow.cellsRows.forEach((elem) => {
                            if (elem.extras?.length > count) {
                                count = elem.extras.length;
                            }
                        });

                        nextMin = Math.max(
                            nextMin,
                            MIN_SECTION_HEIGHT * count + module.moduleThickness * (count - 1),
                        );
                    }

                    if (!Number.isFinite(curMin) || curMin < MIN_SECTION_HEIGHT) curMin = MIN_SECTION_HEIGHT;
                    if (!Number.isFinite(nextMin) || nextMin < MIN_SECTION_HEIGHT) nextMin = MIN_SECTION_HEIGHT;

                    const totalHeight = currentRow.height + nextRow.height;
                    calcValue = this.updateSizes(
                        newValue,
                        dimension,
                        currentRow,
                        nextRow,
                        totalHeight,
                        curMin,
                        nextMin,
                    );
                } else {
                    calcValue = newValue;
                }
            }
        }

        return calcValue;
    }

    adjustFasadeSize(
        sectionIndex,
        doorIndex,
        segmentIndex,
        extraIndex,
        newValue,
        dimension = "height",
    ) {
        const ctx = this.ctx
        const minValue =
            dimension === "width" ? MIN_SECTION_WIDTH : MIN_SECTION_HEIGHT;
        newValue = Math.max(Math.floor(newValue / ctx.props.step) * ctx.props.step, minValue);
        let calcValue;

        const module = ctx.props.module;

        if (dimension === "width") {
            const section = module.sections[sectionIndex];
            const door = section.fasades?.[doorIndex];
            const currentSegment = door?.[segmentIndex];

            if (sectionIndex < module.sections.length - 1) {
                const nextRow = door[segmentIndex + 1];

                const totalWidth = currentSegment.width + nextRow.width;

                const minCurrent = MIN_FASADE_WIDTH;
                const maxCurrent = currentSegment.maxX;


                const minNext = MIN_FASADE_WIDTH;
                const maxNext = nextRow.maxX;

                calcValue = this.updateSizesFasades(
                    newValue,
                    totalWidth,
                    minCurrent,
                    maxCurrent,
                    minNext,
                    maxNext,
                );
            } else if (sectionIndex > 0) {
                const prevRow = door[segmentIndex - 1];

                const totalWidth = currentSegment.width + prevRow.width;

                const minCurrent = MIN_FASADE_WIDTH;
                const maxCurrent = currentSegment.maxX;

                const minPrev = MIN_FASADE_WIDTH;
                const maxPrev = prevRow.maxX;

                calcValue = this.updateSizesFasades(
                    newValue,
                    totalWidth,
                    minCurrent,
                    maxCurrent,
                    minPrev,
                    maxPrev,
                );
            } else {
                const minCurrent = MIN_FASADE_WIDTH;
                const maxCurrent = currentSegment.maxX;

                if (newValue < minCurrent) calcValue = minCurrent;
                else if (newValue > maxCurrent) calcValue = maxCurrent;
            }
        } else {
            const section = module.sections[sectionIndex];
            const door = section.fasades?.[doorIndex];
            const currentSegment = door?.[segmentIndex];

            if (segmentIndex < door.length - 1) {
                const nextRow = door[segmentIndex + 1];

                const totalHeight = currentSegment.height + nextRow.height;
                const minCurrent = MIN_FASADE_HEIGHT; //Math.max(MIN_FASADE_HEIGHT, currentSegment.maxY);
                const minNext = MIN_FASADE_HEIGHT; //Math.max(MIN_FASADE_HEIGHT, nextRow.minY);
                const maxCurrent = currentSegment.maxY;
                const maxNext = nextRow.maxY;

                calcValue = this.updateSizesFasades(
                    newValue,
                    totalHeight,
                    minCurrent,
                    maxCurrent,
                    minNext,
                    maxNext,
                );
            } else if (segmentIndex > 0) {
                const prevRow = door[segmentIndex - 1];
                const totalHeight = currentSegment.height + prevRow.height;

                const minCurrent = MIN_FASADE_HEIGHT; // Math.max(MIN_FASADE_HEIGHT, currentSegment.minY);
                const minPrev = MIN_FASADE_HEIGHT; // Math.max(MIN_FASADE_HEIGHT, prevRow.maxY);
                const maxCurrent = currentSegment.maxY;
                const maxPrev = prevRow.maxY;

                calcValue = this.updateSizesFasades(
                    newValue,
                    totalHeight,
                    minCurrent,
                    maxCurrent,
                    minPrev,
                    maxPrev,
                );
            } else {
                const minCurrent = MIN_FASADE_HEIGHT;
                const maxCurrent = currentSegment.maxY;

                if (newValue < minCurrent) calcValue = minCurrent;
                else if (newValue > maxCurrent) calcValue = maxCurrent;
            }
        }

        ctx.renderGrid();
        return calcValue;
    }

    updateSizes(
        newValue,
        dimension,
        current,
        adjacent,
        total,
        minCurrent,
        minAdjacent,
    ) {
        // Защита от Infinity/NaN в минимальных значениях (возникает при section.minX = Infinity)
        if (!Number.isFinite(minCurrent) || minCurrent < 0) minCurrent = 0;
        if (!Number.isFinite(minAdjacent) || minAdjacent < 0) minAdjacent = 0;

        if (newValue < minCurrent) newValue = minCurrent;

        const newAdjacentSize = total - newValue;

        if (newAdjacentSize < minAdjacent) newValue = total - minAdjacent;

        return newValue;
    }

    updateSizesFasades(
        newValue,
        total,
        minCurrent,
        maxCurrent,
        minAdjacent,
        maxAdjacent,
    ) {
        if (newValue < minCurrent) newValue = minCurrent;
        else if (newValue > maxCurrent) newValue = maxCurrent;

        const newAdjacentSize = total - newValue;

        if (newAdjacentSize < minAdjacent) newValue = total - minAdjacent;
        else if (newAdjacentSize > maxAdjacent) newValue = total - maxAdjacent;

        return newValue;
    }

    adjustSizeFromExternal({
        dimension,
        value,
        sec = null,
        cell = null,
        row = null,
        extra = null,
        type = "module",
    }: {
        dimension: string;
        value: number;
        sec?: number;
        cell?: number;
        row?: number;
        extra?: number;
        type?: string;
    }) {
        if (sec === null) {
            console.warn("Не выбрана ячейка для изменения размера");
            return;
        }

        switch (type) {
            case "fasades":
                return this.adjustFasadeSize(sec, cell, row, extra, value, dimension);
            default:
                return this.adjustSectionSize(sec, cell, row, extra, value, dimension);
        }
    }
}
