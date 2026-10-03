// Перетаскивание разделителей мышью (изменение размеров секций/ячеек/рядов),
// в отличие от числового ввода в правой панели — см. ExternalSizeAdjuster.
// Вынесено из Render2D.vue (Фаза 2f рефакторинга, см.
// C:\Users\MG_GO.MG\.claude\plans\iterative-launching-lerdorf.md).
//
// onVerticalDragStart/onHorizontalDragStart — единственные, кому НУЖЕН
// caller-provided this: PIXI зовёт их через
// divider.on("pointerdown", engine.onVerticalDragStart), и внутри
// this === divider. Поэтому они объявлены обычными `function` и присвоены
// полям в конструкторе, а ctx получают через замыкание, а не через this.
// Остальные (onDragMove/onDragEnd/handleGlobalPointerMove) — стрелочные поля
// класса: привязанный this можно без потери контекста передавать в
// app.stage.on/off и addEventListener/removeEventListener.
//@ts-nocheck

import RenderContext from "./RenderContext.ts";
import { UM_PARAMS } from "./../Const.ts";
import { createTsargaData, isTsargaEligibleWidth, applyTsargaToRow } from "./../Tsarga.ts";

const { RASPASHNOY_ID, MIN_SECTION_WIDTH, MIN_SECTION_HEIGHT } = UM_PARAMS;

export default class DividerDragEngine {
    ctx: RenderContext
    onVerticalDragStart: (event: any) => void
    onHorizontalDragStart: (event: any) => void


    constructor(ctx: RenderContext) {
        this.ctx = ctx
        const engine = this

        // Обработчик для вертикального перетаскивания (между колонками).
        // this внутри === divider (PIXI Graphics, на который навешан этот листенер).
        this.onVerticalDragStart = function (event) {
            const ctx = engine.ctx

            const module = ctx.props.module;
            if (module.productID === RASPASHNOY_ID) return

            // event.stopPropagation();
            ctx.cursorCheck = true;
            const sectionIndex = this.section;
            const cellIndex = this.cell;
            const rowIndex = this.row;
            const extraIndex = this.extra;

            const column = module.sections[sectionIndex];
            const cell = column.cells?.[cellIndex];
            const row = cell?.cellsRows?.[rowIndex];
            const extra = row?.extras?.[extraIndex];

            const cur = row || cell || column;

            let next = {};
            let nextSector, curSector;
            switch (cur.type) {
                case "section":
                    if (!cur.sector) {
                        curSector =
                            cur.cells[0].sector ||
                            cur.cells[0].cellsRows[cur.cells[0].cellsRows.length - 1].sector ||
                            cur.cells[0].cellsRows[cur.cells[0].cellsRows.length - 1].extras[0]
                                .sector;
                    } else curSector = cur.sector;

                    next = module.sections[sectionIndex + 1];
                    if (!next.sector) {
                        nextSector =
                            next.cells[0].sector ||
                            next.cells[0].cellsRows[0].sector ||
                            next.cells[0].cellsRows[next.cells[0].cellsRows.length - 1].extras[0]
                                .sector;
                    } else nextSector = next.sector;
                    break;
                case "cell":
                    if (!cur.sector) {
                        curSector =
                            cur.cells[0].cellsRows[cur.cells[0].cellsRows.length - 1].sector ||
                            cur.cells[0].cellsRows[cur.cells[0].cellsRows.length - 1].extras[0]
                                .sector;
                    } else curSector = cur.sector;

                    next = module.sections[sectionIndex + 1];
                    if (!next.sector) {
                        nextSector =
                            next.cells[0].sector ||
                            next.cells[0].cellsRows[0].sector ||
                            next.cells[0].cellsRows[next.cells[0].cellsRows.length - 1].extras[0]
                                .sector;
                    } else nextSector = next.sector;
                    break;
                case "rowCell":
                    if (!cur.sector) {
                        curSector = cur.extras[0].sector;
                    } else curSector = cur.sector;

                    next = cell.cellsRows[rowIndex + 1];

                    if (!next.sector) {
                        nextSector = next.extras[0].sector;
                    } else nextSector = next.sector;
                    break;
                case "rowExtra":
                    curSector = cur.sector;

                    next = cell.cellsRows[rowIndex + 1];
                    if (!next.sector) {
                        nextSector = next.extras[0].sector;
                    } else nextSector = next.sector;
                    break;
            }

            ctx.dragState.isDragging = true;
            ctx.dragState.type = "vertical";

            ctx.dragState.secIndex = sectionIndex;
            ctx.dragState.cellIndex = cellIndex;
            ctx.dragState.rowIndex =
                rowIndex !== null && cell.cellsRows[rowIndex + 1] ? rowIndex : null;
            ctx.dragState.extraIndex = null;
            ctx.dragState.startX = event.data.global.x;

            ctx.dragState.startLeftWidth = cur.width;
            ctx.dragState.startRightWidth = next.width;

            let curMin = cur.maxX;
            if (cur.cells?.length) {
                let count = 1;
                cur.cells.forEach((elem) => {
                    if (elem.cellsRows?.length > count) {
                        count = elem.cellsRows.length;
                    }
                });

                curMin = Math.max(
                    curMin,
                    MIN_SECTION_WIDTH * count + module.moduleThickness * (count - 1),
                );
                ctx.dragState.minXleft = curMin;
            } else
                ctx.dragState.minXleft = ctx.shapeAdjuster.getLeftSectionWidth(curSector, curMin);

            let nextMin = next.minX;
            if (next.cells?.length) {
                let count = 1;
                next.cells.forEach((elem) => {
                    if (elem.cellsRows?.length > count) {
                        count = elem.cellsRows.length;
                    }
                });

                nextMin = Math.max(
                    nextMin,
                    MIN_SECTION_WIDTH * count + module.moduleThickness * (count - 1),
                );
                ctx.dragState.minXRight = nextMin;
            } else
                ctx.dragState.minXRight = ctx.shapeAdjuster.getRightSectionWidth(
                    nextSector,
                    nextMin,
                );

            ctx.dragState.element = this;
            this.onDrag = true;

            ctx.app.stage.on("pointermove", engine.onDragMove);
            ctx.app.stage.on("pointerup", engine.onDragEnd);
            ctx.app.stage.on("pointerupoutside", engine.onDragEnd);
        }

        // Обработчик для горизонтального перетаскивания (между строками).
        // this внутри === divider (PIXI Graphics, на который навешан этот листенер).
        this.onHorizontalDragStart = function (event) {
            const ctx = engine.ctx
            // event.stopPropagation();
            const module = ctx.props.module;
            // event.stopPropagation();
            ctx.cursorCheck = true;
            const sectionIndex = this.section;
            const cellIndex = this.cell;
            const rowIndex = this.row;
            const extraIndex = this.extra;

            const column = module.sections[sectionIndex];
            const cell = column.cells?.[cellIndex];
            const row = cell?.cellsRows?.[rowIndex];
            const extra = row?.extras?.[extraIndex];

            const cur = extra || row || cell;

            let next = {};
            let nextSector, curSector;
            switch (cur.type) {
                case "cell":
                    if (!cur.sector) {
                        curSector =
                            cur.cellsRows[0].sector ||
                            cur.cellsRows[0].extras[cur.cellsRows[0].extras.length - 1].sector;
                    } else curSector = cur.sector;

                    next = column.cells[cellIndex + 1];
                    if (!next.sector) {
                        nextSector =
                            next.cellsRows[0].sector || next.cellsRows[0].extras[0].sector;
                    } else nextSector = next.sector;
                    break;
                case "rowCell":
                    if (!cur.sector) {
                        curSector = cur.extras[cur.extras.length - 1].sector;
                    } else curSector = cur.sector;

                    next = cell.cellsRows[rowIndex + 1];

                    if (!next.sector) {
                        nextSector = next.extras[0].sector;
                    } else nextSector = next.sector;
                    break;
                case "rowExtra":
                    curSector = cur.sector;
                    next = row.extras[extraIndex + 1];
                    nextSector = next.sector;
                    break;
            }

            // event.currentTarget.alpha = 0.5;
            ctx.dragState.element = this;
            this.onDrag = true;
            ctx.dragState.isDragging = true;
            ctx.dragState.type = "horizontal";

            ctx.dragState.secIndex = sectionIndex;
            ctx.dragState.cellIndex = cellIndex;
            ctx.dragState.rowIndex = rowIndex;
            ctx.dragState.extraIndex = extraIndex;

            ctx.dragState.startY = event.data.global.y;
            ctx.dragState.startTopHeight = cur.height;
            ctx.dragState.startBottomHeight = next.height;

            let curMin = cur.maxY;
            if (cur.cellsRows?.length) {
                let count = 1;
                cur.cellsRows.forEach((elem) => {
                    if (elem.extras?.length > count) {
                        count = elem.extras.length;
                    }
                });

                curMin = Math.max(
                    curMin,
                    MIN_SECTION_HEIGHT * count + module.moduleThickness * (count - 1),
                );
                ctx.dragState.minTop = curMin;
            } else ctx.dragState.minTop = ctx.shapeAdjuster.getSectionTop(curSector, curMin);

            ctx.dragState.minTop = Math.max(
                ctx.dragState.minTop,
                ctx.UMconstructor.value?.SHELVES.getCellMinHeight(cur, module) ?? MIN_SECTION_HEIGHT,
            );

            let nextMin = next.minY;
            if (next.cellsRows?.length) {
                let count = 1;
                next.cellsRows.forEach((elem) => {
                    if (elem.extras?.length > count) {
                        count = elem.extras.length;
                    }
                });

                nextMin = Math.max(
                    nextMin,
                    MIN_SECTION_HEIGHT * count + module.moduleThickness * (count - 1),
                );
                ctx.dragState.minBottom = nextMin;
            } else
                ctx.dragState.minBottom = ctx.shapeAdjuster.getSectionBottom(nextSector, nextMin);

            ctx.dragState.minBottom = Math.max(
                ctx.dragState.minBottom,
                ctx.UMconstructor.value?.SHELVES.getCellMinHeight(next, module) ?? MIN_SECTION_HEIGHT,
            );

            ctx.app.stage.on("pointermove", engine.onDragMove);
            ctx.app.stage.on("pointerup", engine.onDragEnd);
            ctx.app.stage.on("pointerupoutside", engine.onDragEnd);
        }

    }

    onDragMove = (event) => {
        const ctx = this.ctx
        if (!event) return;
        ctx.lastDragEvent.value = event;
    }

    updateRowTsarga(row, isCellRoof = false) {
        const ctx = this.ctx
        if (!ctx.hasTsargaProduct.value) {
            delete row.tsarga;
            row.extras?.forEach(extra => delete extra.tsarga);
            return;
        }
        applyTsargaToRow(row, isCellRoof, ctx.hasModuleTsarga.value);
    }

    dragMove(event) {
        const ctx = this.ctx
        if (!ctx.dragState.isDragging || !ctx.lastDragEvent.value) return;
        const {
            type,
            secIndex,
            cellIndex,
            rowIndex,
            extraIndex,
            startX,
            startY,
            startLeftWidth,
            startRightWidth,
            startTopHeight,
            startBottomHeight,
            minXleft,
            minXRight,
            minTop,
            minBottom,
            element,
        } = ctx.dragState;

        if (type === "vertical") {
            // Infinity не спасается через ||, поэтому проверяем isFinite явно
            let curMin = !Number.isFinite(minXleft) || minXleft < MIN_SECTION_WIDTH ? MIN_SECTION_WIDTH : minXleft;
            let nextMin = !Number.isFinite(minXRight) || minXRight < MIN_SECTION_WIDTH ? MIN_SECTION_WIDTH : minXRight;

            const deltaPixels = event.data.global.x - startX;

            element.position.x =
                Math.floor(event.data.global.x / ctx.props.step) * ctx.props.step;
            let deltaMm =
                Math.floor((deltaPixels * ctx.pixelRatioWidth.value) / ctx.props.step) *
                ctx.props.step;

            if (deltaMm === 0) return;

            let section = ctx.props.module.sections[secIndex];
            let cell = section.cells[cellIndex];
            let row = cell?.cellsRows?.[rowIndex];
            let extra = row?.extras?.[extraIndex];

            // Calculate new dimensions
            let newLeftWidth = startLeftWidth + deltaMm;
            let newRightWidth = startRightWidth - deltaMm;

            // Enforce minimum dimensions
            if (newLeftWidth < curMin) {
                deltaMm += curMin - newLeftWidth;
                newLeftWidth = curMin;
                newRightWidth = startRightWidth - deltaMm;
            } else if (newRightWidth < nextMin) {
                deltaMm -= nextMin - newRightWidth;
                newRightWidth = nextMin;
                newLeftWidth = startLeftWidth + deltaMm;
            }

            if (row) {
                const deltaLeft = row.width - newLeftWidth;
                row.position.x -= deltaLeft / 2;
                row.width = newLeftWidth;
                this.updateRowTsarga(row, cellIndex === 0);

                row.extras?.forEach((item) => {
                    item.width = row.width;
                    item.position.x = row.position.x;

                    if (item.fillings?.length) {
                        item.fillings.forEach((filling) => {
                            filling.width = item.width;
                            filling.size.x = filling.width;
                        });
                    }
                });

                let nextRow = cell.cellsRows[rowIndex + 1];
                let delta2 = nextRow.width - newRightWidth;
                nextRow.position.x += delta2 / 2;
                nextRow.width = newRightWidth;
                this.updateRowTsarga(nextRow, cellIndex === 0);

                nextRow.extras?.forEach((item) => {
                    item.width = nextRow.width;
                    item.position.x = nextRow.position.x;

                    if (item.fillings?.length) {
                        item.fillings.forEach((filling) => {
                            filling.width = item.width;
                            filling.size.x = filling.width;
                        });
                    }
                });

                if (row.fillings?.length) {
                    row.fillings.forEach((filling) => {
                        filling.width = row.width;
                        filling.size.x = filling.width;
                    });
                }

                if (nextRow.fillings?.length) {
                    nextRow.fillings.forEach((filling) => {
                        filling.width = nextRow.width;
                        filling.size.x = filling.width;
                        filling.position.x += delta2 / 2;
                    });
                }
            } else {
                let next = ctx.props.module.sections[secIndex + 1];
                let prev = ctx.props.module.sections[secIndex - 1];

                let nextSection = next || prev;

                if (newLeftWidth > ctx.effectiveMaxSectionWidth.value) {
                    deltaMm -= newLeftWidth - ctx.effectiveMaxSectionWidth.value;
                    newLeftWidth = ctx.effectiveMaxSectionWidth.value;
                    newRightWidth = startRightWidth - deltaMm;
                } else if (newRightWidth > ctx.effectiveMaxSectionWidth.value) {
                    deltaMm += newRightWidth - ctx.effectiveMaxSectionWidth.value;
                    newRightWidth = ctx.effectiveMaxSectionWidth.value;
                    newLeftWidth = startLeftWidth + deltaMm;
                }

                let delta1 = section.width - newLeftWidth;
                let deltaPos1 = next ? -delta1 / 2 : delta1 / 2;
                section.width = newLeftWidth;
                section.position.x += deltaPos1;

                section.cells.forEach((cell, cellIdx) => {
                    cell.width = section.width;
                    cell.position.x = section.position.x;
                    if (cell.cellsRows?.length) {
                        delete cell.tsarga;
                    } else {
                        this.updateRowTsarga(cell, cellIdx === 0);
                    }

                    if (cell.cellsRows?.length) {
                        let divideDelta = Math.floor(-delta1 / cell.cellsRows.length);
                        let divideDeltaPos1 = next ? divideDelta / 2 : -divideDelta / 2;
                        let extraSize =
                            (cell.cellsRows.length - 1) * ctx.currentModule.value.moduleThickness;

                        cell.cellsRows.forEach((item) => {
                            if (item.width + divideDelta >= MIN_SECTION_WIDTH) {
                                item.width += divideDelta;
                                this.updateRowTsarga(item, cellIdx === 0);
                                item.position.x += divideDeltaPos1;

                                item.extras?.forEach((extra) => {
                                    extra.width = item.width;
                                    extra.position.x = item.position.x;

                                    if (extra.fillings?.length) {
                                        extra.fillings.forEach((filling) => {
                                            if (filling.isVerticalItem) {
                                                filling.position.x += divideDeltaPos1;
                                            } else {
                                                filling.width = extra.width;
                                                filling.size.x = filling.width;
                                                filling.position.x = item.position.x - item.width / 2;
                                            }
                                        });
                                    }
                                });

                                if (item.fillings?.length) {
                                    item.fillings.forEach((filling) => {
                                        if (filling.isVerticalItem) {
                                            filling.position.x += divideDeltaPos1;
                                        } else {
                                            filling.width = item.width;
                                            filling.size.x = filling.width;
                                            filling.position.x = item.position.x - item.width / 2;
                                        }
                                    });
                                }
                            } else {
                                item.width = MIN_SECTION_WIDTH;
                                this.updateRowTsarga(item, cellIdx === 0);
                            }

                            extraSize += item.width;
                        });

                        let lastRow = next
                            ? cell.cellsRows[cell.cellsRows.length - 1]
                            : cell.cellsRows[0];
                        if (lastRow.width + (newLeftWidth - extraSize) >= MIN_SECTION_WIDTH) {
                            lastRow.width += newLeftWidth - extraSize;
                            this.updateRowTsarga(lastRow, cellIdx === 0);
                            lastRow.position.x += (newLeftWidth - extraSize) / 2;

                            lastRow.fillings?.forEach((filling) => {
                                if (filling.isVerticalItem) {
                                    filling.position.x += (newLeftWidth - extraSize) / 2;
                                } else {
                                    filling.width = lastRow.width;
                                    filling.size.x = filling.width;
                                    filling.position.x = lastRow.position.x - lastRow.width / 2;
                                }
                            });

                            lastRow.extras?.forEach((extra) => {
                                extra.width = lastRow.width;
                                extra.position.x = lastRow.position.x;

                                extra.fillings?.forEach((filling) => {
                                    if (filling.isVerticalItem) {
                                        filling.position.x += (newLeftWidth - extraSize) / 2;
                                    } else {
                                        filling.width = extra.width;
                                        filling.size.x = filling.width;
                                        filling.position.x = extra.position.x - extra.width / 2;
                                    }
                                });
                            });
                        } else {
                            lastRow = cell.cellsRows.find((item) => {
                                return (
                                    item.width + (newLeftWidth - extraSize) >= MIN_SECTION_WIDTH
                                );
                            });

                            if (lastRow) {
                                lastRow.width += newLeftWidth - extraSize;
                                this.updateRowTsarga(lastRow, cellIdx === 0);
                                lastRow.position.x += (newLeftWidth - extraSize) / 2;

                                lastRow.fillings?.forEach((filling) => {
                                    if (filling.isVerticalItem) {
                                        filling.position.x += (newLeftWidth - extraSize) / 2;
                                    } else {
                                        filling.width = lastRow.width;
                                        filling.size.x = filling.width;
                                        filling.position.x = lastRow.position.x - lastRow.width / 2;
                                    }
                                });

                                lastRow.extras?.forEach((extra) => {
                                    extra.width = lastRow.width;
                                    extra.position.x = lastRow.position.x;

                                    extra.fillings?.forEach((filling) => {
                                        if (filling.isVerticalItem) {
                                            filling.position.x += (newLeftWidth - extraSize) / 2;
                                        } else {
                                            filling.width = extra.width;
                                            filling.size.x = filling.width;
                                            filling.position.x = extra.position.x - extra.width / 2;
                                        }
                                    });
                                });
                            }
                        }
                    }

                    if (cell.fillings?.length) {
                        cell.fillings.forEach((filling) => {
                            if (filling.isVerticalItem) {
                                filling.position.x += deltaPos1;
                            } else {
                                filling.width = cell.width;
                                filling.size.x = filling.width;
                                filling.position.x = cell.position.x - cell.width / 2;
                            }
                        });
                    }
                });

                if (!section.cells.length) {
                    if (ctx.hasTsargaProduct.value && !ctx.hasModuleTsarga.value && isTsargaEligibleWidth(section.width)) {
                        section.tsarga = createTsargaData(section.width, section.position.x);
                    } else {
                        delete section.tsarga;
                    }
                }

                if (section.fillings?.length) {
                    section.fillings.forEach((filling) => {
                        if (filling.isVerticalItem) {
                            filling.position.x += deltaPos1;
                        } else {
                            filling.width = section.width;
                            filling.size.x = filling.width;
                            filling.position.x = section.position.x - section.width / 2;
                        }
                    });
                }

                let delta2 = nextSection.width - newRightWidth;
                nextSection.width = newRightWidth;
                nextSection.position.x += deltaPos1;

                nextSection.cells.forEach((cell, cellIdx) => {
                    cell.width = nextSection.width;
                    cell.position.x = nextSection.position.x;
                    if (cell.cellsRows?.length) {
                        delete cell.tsarga;
                    } else {
                        this.updateRowTsarga(cell, cellIdx === 0);
                    }

                    if (cell.cellsRows?.length) {
                        let divideDelta = Math.floor(-delta2 / cell.cellsRows.length);
                        let divideDeltaPos = next ? -divideDelta / 2 : divideDelta / 2;
                        let extraSize =
                            (cell.cellsRows.length - 1) * ctx.currentModule.value.moduleThickness;

                        cell.cellsRows.forEach((item) => {
                            if (item.width + divideDelta >= MIN_SECTION_WIDTH) {
                                item.width += divideDelta;
                                this.updateRowTsarga(item, cellIdx === 0);
                                item.position.x += divideDeltaPos;

                                item.extras?.forEach((extra) => {
                                    extra.width = item.width;
                                    extra.position.x = item.position.x;

                                    if (extra.fillings?.length) {
                                        extra.fillings.forEach((filling) => {
                                            if (filling.isVerticalItem) {
                                                filling.position.x += divideDeltaPos;
                                            } else {
                                                filling.width = extra.width;
                                                filling.size.x = filling.width;
                                                filling.position.x = extra.position.x - extra.width / 2;
                                            }
                                        });
                                    }
                                });

                                if (item.fillings?.length) {
                                    item.fillings.forEach((filling) => {
                                        if (filling.isVerticalItem) {
                                            filling.position.x += divideDeltaPos;
                                        } else {
                                            filling.width = item.width;
                                            filling.size.x = filling.width;
                                            filling.position.x = item.position.x - item.width / 2;
                                        }
                                    });
                                }
                            } else {
                                item.width = MIN_SECTION_WIDTH;
                                this.updateRowTsarga(item, cellIdx === 0);
                            }

                            extraSize += item.width;
                        });

                        let lastRow = next
                            ? cell.cellsRows[0]
                            : cell.cellsRows[cell.cellsRows.length - 1];

                        if (
                            lastRow.width + (newRightWidth - extraSize) >=
                            MIN_SECTION_WIDTH
                        ) {
                            lastRow.width += newRightWidth - extraSize;
                            this.updateRowTsarga(lastRow, cellIdx === 0);
                            lastRow.position.x += (newRightWidth - extraSize) / 2;

                            lastRow.fillings?.forEach((filling) => {
                                if (filling.isVerticalItem) {
                                    filling.position.x += (newRightWidth - extraSize) / 2;
                                } else {
                                    filling.width = lastRow.width;
                                    filling.size.x = filling.width;
                                    filling.position.x = lastRow.position.x - lastRow.width / 2;
                                }
                            });

                            lastRow.extras?.forEach((extra) => {
                                extra.width = lastRow.width;
                                extra.position.x = lastRow.position.x;

                                extra.fillings?.forEach((filling) => {
                                    if (filling.isVerticalItem) {
                                        filling.position.x += (newRightWidth - extraSize) / 2;
                                    } else {
                                        filling.width = extra.width;
                                        filling.size.x = filling.width;
                                        filling.position.x = extra.position.x - extra.width / 2;
                                    }
                                });
                            });
                        } else {
                            lastRow = cell.cellsRows.find((item) => {
                                return (
                                    item.width + (newRightWidth - extraSize) >= MIN_SECTION_WIDTH
                                );
                            });

                            if (lastRow) {
                                lastRow.width += newRightWidth - extraSize;
                                this.updateRowTsarga(lastRow, cellIdx === 0);
                                lastRow.position.x += (newRightWidth - extraSize) / 2;

                                lastRow.fillings?.forEach((filling) => {
                                    if (filling.isVerticalItem) {
                                        filling.position.x += (newRightWidth - extraSize) / 2;
                                    } else {
                                        filling.width = lastRow.width;
                                        filling.size.x = filling.width;
                                        filling.position.x = lastRow.position.x - lastRow.width / 2;
                                    }
                                });

                                lastRow.extras?.forEach((extra) => {
                                    extra.width = lastRow.width;
                                    extra.position.x = lastRow.position.x;

                                    extra.fillings?.forEach((filling) => {
                                        if (filling.isVerticalItem) {
                                            filling.position.x += (newRightWidth - extraSize) / 2;
                                        } else {
                                            filling.width = extra.width;
                                            filling.size.x = filling.width;
                                            filling.position.x = extra.position.x - extra.width / 2;
                                        }
                                    });
                                });
                            }
                        }
                    }

                    if (cell.fillings?.length) {
                        cell.fillings.forEach((filling) => {
                            if (filling.isVerticalItem) {
                                filling.position.x += deltaPos1;
                            } else {
                                filling.width = cell.width;
                                filling.size.x = filling.width;
                                filling.position.x = cell.position.x - cell.width / 2;
                            }
                        });
                    }
                });

                if (!nextSection.cells.length) {
                    if (ctx.hasTsargaProduct.value && !ctx.hasModuleTsarga.value && isTsargaEligibleWidth(nextSection.width)) {
                        nextSection.tsarga = createTsargaData(nextSection.width, nextSection.position.x);
                    } else {
                        delete nextSection.tsarga;
                    }
                }

                if (nextSection.fillings?.length) {
                    nextSection.fillings.forEach((filling) => {
                        if (filling.isVerticalItem) {
                            filling.position.x += deltaPos1;
                        } else {
                            filling.width = nextSection.width;
                            filling.size.x = filling.width;
                            filling.position.x = nextSection.position.x - nextSection.width / 2;
                        }
                    });
                }
            }
        } else if (type === "horizontal") {
            // Infinity не спасается через ||, поэтому проверяем isFinite явно
            let curMin = !Number.isFinite(minTop) || minTop < MIN_SECTION_HEIGHT ? MIN_SECTION_HEIGHT : minTop;
            let nextMin = !Number.isFinite(minBottom) || minBottom < MIN_SECTION_HEIGHT ? MIN_SECTION_HEIGHT : minBottom;

            const deltaPixels = event.data.global.y - startY;

            element.position.y =
                Math.floor(event.data.global.y / ctx.props.step) * ctx.props.step;
            const deltaMm =
                Math.floor((deltaPixels * ctx.pixelRatioHeight.value) / ctx.props.step) *
                ctx.props.step;

            if (deltaMm === 0) return;

            let section = ctx.props.module.sections[secIndex];
            let cell = section.cells[cellIndex];
            let row = cell?.cellsRows?.[rowIndex];
            let extra = row?.extras?.[extraIndex];

            // Calculate new dimensions
            let newTopHeight = startTopHeight + deltaMm;
            let newBottomHeight = startBottomHeight - deltaMm;

            // Enforce minimum dimensions
            if (newTopHeight < curMin) {
                newTopHeight = curMin;
                newBottomHeight = startTopHeight + startBottomHeight - curMin;
            } else if (newBottomHeight < nextMin) {
                newBottomHeight = nextMin;
                newTopHeight = startTopHeight + startBottomHeight - nextMin;
            }

            if (extra) {

                let delta1 = newTopHeight - extra.height;
                extra.height = newTopHeight;
                extra.position.y += -delta1;

                let nextExtra = row.extras[extraIndex + 1];
                nextExtra.height = newBottomHeight;
            } else {

                let delta1 = cell.height - newTopHeight;
                cell.height = newTopHeight;
                cell.position.y += delta1;

                if (cell.cellsRows?.length) {
                    cell.cellsRows.forEach((row) => {
                        row.height = newTopHeight;
                        row.position.y = cell.position.y;

                        if (row.fillings?.length) {
                            row.fillings.forEach((filling) => {
                                if (filling.isVerticalItem) {
                                    filling.position.y = row.position.y;
                                    filling.height = row.height;
                                    filling.size.y = filling.height;
                                    filling.distances.bottom = 0;
                                    filling.distances.top = 0;
                                }
                            });
                        }

                        if (row.extras?.length) {
                            let divideDelta = Math.floor(-delta1 / row.extras.length);
                            let divideDeltaPos1 = divideDelta;
                            // Сумма полок внутри столбца: каждая субъячейка, кроме нижней, несёт полку
                            // под собой, и толщина у стеклянной своя. extras отсортированы сверху вниз
                            let extraSize = row.extras
                                .slice(0, -1)
                                .reduce((sum, item) => sum + this.ctx.UMconstructor.value.getShelfThickness(item, currentModule.value), 0);

                            row.extras.forEach((item) => {
                                if (item.height + divideDelta >= MIN_SECTION_HEIGHT) {
                                    item.height += divideDelta;

                                    if (item.fillings?.length) {
                                        item.fillings.forEach((filling) => {
                                            if (filling.isVerticalItem) {
                                                filling.position.y = item.position.y;
                                                filling.height = item.height;
                                                filling.size.y = filling.height;
                                                filling.distances.bottom = 0;
                                                filling.distances.top = 0;
                                            } else {
                                                filling.position.y += divideDeltaPos1;
                                            }
                                        });
                                    }
                                } else {
                                    item.height = MIN_SECTION_HEIGHT;
                                }

                                extraSize += item.height;
                            });

                            let lastRow = row.extras[row.extras.length - 1];
                            if (
                                lastRow.height + (newTopHeight - extraSize) >=
                                MIN_SECTION_HEIGHT
                            ) {
                                lastRow.height += newTopHeight - extraSize;
                                lastRow.position.y += (newTopHeight - extraSize) / 2;

                                if (lastRow.fillings?.length) {
                                    lastRow.fillings.forEach((filling) => {
                                        if (filling.isVerticalItem) {
                                            filling.position.y = lastRow.position.y;
                                            filling.height = lastRow.height;
                                            filling.size.y = filling.height;
                                            filling.distances.bottom = 0;
                                            filling.distances.top = 0;
                                        } else {
                                            filling.position.y += (newTopHeight - extraSize) / 2;
                                        }
                                    });
                                }
                            } else {
                                lastRow = row.extras.find((item) => {
                                    return (
                                        item.height + (newTopHeight - extraSize) >= MIN_SECTION_HEIGHT
                                    );
                                });

                                if (lastRow) {
                                    lastRow.height += newTopHeight - extraSize;
                                    lastRow.position.y += (newTopHeight - extraSize) / 2;

                                    if (lastRow.fillings?.length) {
                                        lastRow.fillings.forEach((filling) => {
                                            if (filling.isVerticalItem) {
                                                filling.position.y = lastRow.position.y;
                                                filling.height = lastRow.height;
                                                filling.size.y = filling.height;
                                                filling.distances.bottom = 0;
                                                filling.distances.top = 0;
                                            } else {
                                                filling.position.y += (newTopHeight - extraSize) / 2;
                                            }
                                        });
                                    }
                                }
                            }
                        }
                    });
                }

                if (cell.fillings?.length) {
                    cell.fillings.forEach((filling) => {
                        if (filling.isVerticalItem) {
                            filling.position.y = cell.position.y;
                            filling.height = cell.height;
                            filling.size.y = filling.height;
                            filling.distances.bottom = 0;
                            filling.distances.top = 0;
                        }
                    });
                }

                let nextCell = ctx.props.module.sections[secIndex].cells[cellIndex + 1];
                let delta2 = nextCell.height - newBottomHeight;
                nextCell.height = newBottomHeight;

                if (nextCell.cellsRows) {
                    nextCell.cellsRows.forEach((row) => {
                        row.height = newBottomHeight;
                        row.position.y = nextCell.position.y;

                        if (row.fillings?.length) {
                            row.fillings.forEach((filling) => {
                                if (filling.isVerticalItem) {
                                    filling.position.y = row.position.y;
                                    filling.height = row.height;
                                    filling.size.y = filling.height;
                                    filling.distances.bottom = 0;
                                    filling.distances.top = 0;
                                }
                            });
                        }

                        if (row.extras?.length) {
                            let divideDelta = Math.floor(-delta2 / row.extras.length);
                            let divideDeltaPos2 = -divideDelta;
                            // Сумма полок внутри столбца: каждая субъячейка, кроме нижней, несёт полку
                            // под собой, и толщина у стеклянной своя. extras отсортированы сверху вниз
                            let extraSize = row.extras
                                .slice(0, -1)
                                .reduce((sum, item) => sum + this.ctx.UMconstructor.value.getShelfThickness(item, currentModule.value), 0);

                            row.extras.forEach((item) => {
                                if (item.height + divideDelta >= MIN_SECTION_HEIGHT) {
                                    item.height += divideDelta;
                                    item.position.y += divideDelta;

                                    if (item.fillings?.length) {
                                        item.fillings.forEach((filling) => {
                                            if (filling.isVerticalItem) {
                                                filling.position.y = item.position.y;
                                                filling.height = item.height;
                                                filling.size.y = filling.height;
                                                filling.distances.bottom = 0;
                                                filling.distances.top = 0;
                                            } else {
                                                filling.position.y += divideDeltaPos2;
                                            }
                                        });
                                    }
                                } else {
                                    item.height = MIN_SECTION_HEIGHT;
                                }

                                extraSize += item.height;
                            });

                            let lastRow = row.extras[0];
                            if (
                                lastRow.height + (newBottomHeight - extraSize) >=
                                MIN_SECTION_HEIGHT
                            ) {
                                lastRow.height += newBottomHeight - extraSize;
                                lastRow.position.y += (newBottomHeight - extraSize) / 2;

                                if (lastRow.fillings?.length) {
                                    lastRow.fillings.forEach((filling) => {
                                        if (filling.isVerticalItem) {
                                            filling.position.y = lastRow.position.y;
                                            filling.height = lastRow.height;
                                            filling.size.y = filling.height;
                                            filling.distances.bottom = 0;
                                            filling.distances.top = 0;
                                        } else {
                                            filling.position.y += (newBottomHeight - extraSize) / 2;
                                        }
                                    });
                                }
                            } else {
                                lastRow = row.extras.find((item) => {
                                    return (
                                        item.height + (newBottomHeight - extraSize) >=
                                        MIN_SECTION_HEIGHT
                                    );
                                });

                                if (lastRow) {
                                    lastRow.height += newBottomHeight - extraSize;
                                    lastRow.position.y += (newBottomHeight - extraSize) / 2;

                                    if (lastRow.fillings?.length) {
                                        lastRow.fillings.forEach((filling) => {
                                            if (filling.isVerticalItem) {
                                                filling.position.y = lastRow.position.y;
                                                filling.height = lastRow.height;
                                                filling.size.y = filling.height;
                                                filling.distances.bottom = 0;
                                                filling.distances.top = 0;
                                            } else {
                                                filling.position.y += (newBottomHeight - extraSize) / 2;
                                            }
                                        });
                                    }
                                }
                            }
                        }
                    });
                }

                if (nextCell.fillings?.length) {
                    nextCell.fillings.forEach((filling) => {
                        if (filling.isVerticalItem) {
                            filling.position.y = nextCell.position.y;
                            filling.height = nextCell.height;
                            filling.size.y = filling.height;
                            filling.distances.bottom = 0;
                            filling.distances.top = 0;
                        }
                    });
                }
            }
        }

        ctx.renderGrid();
    }

    onDragEnd = (event) => {
        const ctx = this.ctx

        if (ctx.dragState.element) {
            delete ctx.dragState.element.onDrag;
            if (ctx.dragState.element.parent) {
                ctx.dragState.element.removeFromParent();
            }
            ctx.dragState.element.destroy();
        }

        ctx.dragState.element = null;
        ctx.dragState.isDragging = false;
        ctx.dragState.type = null;
        ctx.dragState.secIndex = null;
        ctx.dragState.cellIndex = null;
        ctx.dragState.rowIndex = null;
        ctx.dragState.curRoundMax = null;
        ctx.dragState.nextRoundMax = null;
        ctx.lastDragEvent.value = null;

        ctx.app.stage.off("pointermove", this.onDragMove);
        ctx.app.stage.off("pointerup", this.onDragEnd);
        ctx.app.stage.off("pointerupoutside", this.onDragEnd);
        ctx.cursorCheck = false;

        ctx.resetModule();
    }


    handleGlobalPointerMove = (event) => {
        const ctx = this.ctx
        // ctx.app сам по себе undefined до появления Object.assign(ctx, {app, ...})
        // внутри init() (см. Render2D.vue) — этот листенер, в отличие от остальных
        // мест, читающих ctx.app, висит на document с момента onMounted и может
        // сработать до завершения async-инициализации PIXI.
        if (!ctx.appReady || !ctx.app.renderer || !ctx.cursorCheck) return;

        const canvasRect = ctx.canvasContainer.value.getBoundingClientRect();

        const mouseX = event.clientX - canvasRect.left;
        const mouseY = event.clientY - canvasRect.top;

        if (
            mouseX < 0 ||
            mouseY < 0 ||
            mouseX > ctx.app.renderer.width ||
            mouseY > ctx.app.renderer.height
        ) {
            // console.log("Курсор вне холста (глобальная проверка)");
            this.onDragEnd();
        }
    }
}
