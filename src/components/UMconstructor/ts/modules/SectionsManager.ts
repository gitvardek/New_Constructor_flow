//@ts-nocheck


import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import { UM_PARAMS, WITH_TSARGA } from "@/components/UMconstructor/utils/Const.ts";
import * as THREE from "three";
import {
    GridModule,
    GridSection, TSelectedCell
} from "@/components/UMconstructor/types/UMtypes.ts";


export default class SectionsManager {
    scope: UMconstructorClass

    constructor(scope: UMconstructorClass) {
        this.scope = scope
    }

    selectCell(sec: number | null = 0, cell: number | null = null, row: number | null = null, extra: number | null = null) {
        this.scope.selectCell("module", <TSelectedCell>{ sec, cell, row, extra });
    };

    addSection({ grid = this.scope.UM_STORE.getUMGrid(), secIndex = 0, count = 1, reset = false }: {
        grid: GridModule,
        secIndex: number,
        count: number,
        reset: boolean,
    }) {

        const section = grid.sections[secIndex];
        const halfWidth = Math.floor((section.width - grid.moduleThickness * count) / (count + 1));
        const { MIN_SECTION_WIDTH } = this.scope.CONST

        if (halfWidth < MIN_SECTION_WIDTH) {
            this.scope.callAlert("warning", `Размер секций будет слишком мал! Пожалуйста, выберите меньшее количество секций!`)
            return;
        }

        const deltaLastSection = section.width - halfWidth * (count + 1) - grid.moduleThickness * count;

        // Обновляем ширину текущей колонки
        section.position.x = section.position.x - (section.width / 2 - halfWidth / 2)
        section.width = halfWidth;

        if (section.fillings?.length) {
            this.scope.FILLINGS.clearFillings({ grid, secIndex });
        }

        section.cells.forEach((cell, cellIndex) => {
            cell.width = halfWidth;
            cell.position.x = section.position.x
            cell.cellsRows = []
            if (cell.fillings?.length) {
                this.scope.FILLINGS.clearFillings({ grid, secIndex, cellIndex });
            }
        });

        // Создаем новую колонку с такими же параметрами
        for (let i = 0; i < count; i++) {
            const newColumn: GridSection = {
                ...section,
                number: section.number + 1 + i,
                width: halfWidth,
                cells: [],
                fasades: [],
                fillings: [],
                position: new THREE.Vector2(section.position.x + (section.width / 2 + grid.moduleThickness + halfWidth / 2) * (i + 1), section.position.y),
            }

            delete newColumn.hiTechProfiles

            if (section.loops) {
                newColumn.loops = []
                newColumn.loopsSides = {}
            }

            if (i === count - 1) {
                newColumn.width += deltaLastSection;
            }

            grid.sections.splice(secIndex + 1 + i, 0, newColumn);
        }

        if (grid.isRestrictedModule && section?.fasades?.length > 1) {
            let lastDoor = section.fasades.pop()
            lastDoor.id = 1;
            grid.sections[secIndex + 1].fasades.push(lastDoor);
        }

        if (!grid.isSlidingDoors && section?.fasades?.length > 0) {
            for (let i = 0; i < count; i++) {
                const newSecIndex = secIndex + 1 + i;
                if (!grid.sections[newSecIndex].fasades?.length) {
                    this.scope.FASADES.addDoor(newSecIndex, grid, false);
                }
            }
        }

        // Пересчёт царги для изменённых секций
        for (let i = 0; i <= count; i++) {
            this.scope.SHELVES.recalcSectionTsarga(grid.sections[secIndex + i]);
        }

        // Пересчёт петель для всех секций — смена топологии меняет соседство
        for (let i = 0; i < grid.sections.length; i++) {
            this.scope.LOOPS.calcLoops(i, grid);
        }

        if (reset)
            this.scope.reset(grid)

        this.selectCell(0, null)
        this.scope.debounce("postResetSelect", () => this.selectCell(0, null), 150)

    };

    updateSectionWidth({
        grid = this.scope.UM_STORE.getUMGrid(),
        secIndex,
        value
    }:
        {
            grid: GridModule,
            secIndex: number,
            value: number,
        }) {

        this.scope.debounce("updateSectionWidth", () => {

            const newValue = value;
            let adjustedValue;
            const { MIN_SECTION_WIDTH } = this.scope.CONST
            const MAX_SECTION_WIDTH = WITH_TSARGA.includes(grid.productID)
                ? this.scope.CONST.MAX_SECTION_WIDTH_TSARGA
                : this.scope.CONST.MAX_SECTION_WIDTH;

            // Обновляем выбранную секцию для визуального отображения
            this.selectCell(secIndex, null);

            if (!isNaN(newValue) && this.scope.RENDER_REF) {
                adjustedValue = this.scope.RENDER_REF.adjustSizeFromExternal({
                    dimension: "width",
                    value: newValue,
                    sec: secIndex,
                });
            }
            // Обновляем значение в module для синхронизации
            let section = grid.sections[secIndex]

            if (adjustedValue) {
                if (adjustedValue > MAX_SECTION_WIDTH) {
                    this.scope.callAlert("warning", `Ширина секции превышает допустимый предел! Уменьшите ширину секции!`)
                    return;
                }

                let next = grid.sections[secIndex + 1]
                let prev = grid.sections[secIndex - 1]

                let nextSection = next || prev

                let delta1 = section.width - adjustedValue
                let newNeighbourWidth = nextSection.width + delta1
                if (newNeighbourWidth < MIN_SECTION_WIDTH) {
                    this.scope.callAlert("warning", `Ширина соседней секции станет меньше допустимого минимума! Уменьшите ширину секции!`)
                    return;
                }
                if (newNeighbourWidth > MAX_SECTION_WIDTH) {
                    this.scope.callAlert("warning", `Ширина соседней секции превысит допустимый предел! Увеличьте ширину секции!`)
                    return;
                }

                let deltaPos1 = next ? -delta1 / 2 : delta1 / 2
                section.width = adjustedValue;
                section.position.x += deltaPos1

                section.cells.forEach((cell) => {
                    cell.width = adjustedValue;
                    cell.position.x = section.position.x

                    if (cell.cellsRows?.length) {
                        let divideDelta = Math.floor(-delta1 / cell.cellsRows.length)
                        let divideDeltaPos1 = next ? divideDelta / 2 : -divideDelta / 2
                        let extraSize = (cell.cellsRows.length - 1) * grid.moduleThickness

                        cell.cellsRows.forEach(item => {
                            if (item.width + divideDelta >= MIN_SECTION_WIDTH) {
                                item.width += divideDelta
                                item.position.x += divideDeltaPos1

                                item.extras?.forEach(extra => {
                                    extra.width = item.width
                                    extra.position.x = item.position.x

                                    if (extra.fillings?.length) {
                                        extra.fillings.forEach((filling) => {
                                            if (filling.isVerticalItem) {
                                                filling.position.x += divideDeltaPos1;
                                            } else {
                                                filling.width = extra.width;
                                                filling.size.x = filling.width;
                                                filling.position.x = item.position.x - item.width / 2;
                                            }
                                        })
                                    }
                                })

                                if (item.fillings?.length) {
                                    item.fillings.forEach((filling) => {
                                        if (filling.isVerticalItem) {
                                            filling.position.x += divideDeltaPos1;
                                        } else {
                                            filling.width = item.width;
                                            filling.size.x = filling.width;
                                            filling.position.x = item.position.x - item.width / 2;
                                        }
                                    })
                                }
                            } else {
                                item.width = MIN_SECTION_WIDTH
                            }

                            extraSize += item.width
                        })

                        let lastRow = next ? cell.cellsRows[cell.cellsRows.length - 1] : cell.cellsRows[0]
                        if (lastRow.width + (adjustedValue - extraSize) >= MIN_SECTION_WIDTH) {
                            lastRow.width += (adjustedValue - extraSize)
                            lastRow.position.x += (adjustedValue - extraSize) / 2

                            lastRow.fillings?.forEach((filling) => {
                                if (filling.isVerticalItem) {
                                    filling.position.x += (adjustedValue - extraSize) / 2;
                                } else {
                                    filling.width = lastRow.width;
                                    filling.size.x = filling.width;
                                    filling.position.x = lastRow.position.x - lastRow.width / 2;
                                }
                            })

                            lastRow.extras?.forEach(extra => {
                                extra.width = lastRow.width
                                extra.position.x = lastRow.position.x

                                extra.fillings?.forEach((filling) => {
                                    if (filling.isVerticalItem) {
                                        filling.position.x += (adjustedValue - extraSize) / 2;
                                    } else {
                                        filling.width = extra.width;
                                        filling.size.x = filling.width;
                                        filling.position.x = extra.position.x - extra.width / 2;
                                    }
                                })
                            })
                        } else {
                            lastRow = cell.cellsRows.find((item) => {
                                return item.width + (adjustedValue - extraSize) >= MIN_SECTION_WIDTH
                            })

                            if (lastRow) {
                                lastRow.width += (adjustedValue - extraSize)
                                lastRow.position.x += (adjustedValue - extraSize) / 2

                                lastRow.fillings?.forEach((filling) => {
                                    if (filling.isVerticalItem) {
                                        filling.position.x += (adjustedValue - extraSize) / 2;
                                    } else {
                                        filling.width = lastRow.width;
                                        filling.size.x = filling.width;
                                        filling.position.x = lastRow.position.x - lastRow.width / 2;
                                    }
                                })

                                lastRow.extras?.forEach(extra => {
                                    extra.width = lastRow.width
                                    extra.position.x = lastRow.position.x

                                    extra.fillings?.forEach((filling) => {
                                        if (filling.isVerticalItem) {
                                            filling.position.x += (adjustedValue - extraSize) / 2;
                                        } else {
                                            filling.width = extra.width;
                                            filling.size.x = filling.width;
                                            filling.position.x = extra.position.x - extra.width / 2;
                                        }
                                    })
                                })
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
                        })
                    }
                })

                if (section.fillings?.length) {
                    section.fillings.forEach((filling) => {
                        if (filling.isVerticalItem) {
                            filling.position.x += deltaPos1;
                        } else {
                            filling.width = section.width;
                            filling.size.x = filling.width;
                            filling.position.x = section.position.x - section.width / 2;
                        }
                    })
                }

                let newRightWidth = nextSection.width - (-delta1)
                let delta2 = nextSection.width - newRightWidth

                nextSection.width = newRightWidth;
                nextSection.position.x += deltaPos1;

                nextSection.cells.forEach((cell) => {
                    cell.width = nextSection.width;
                    cell.position.x = nextSection.position.x;

                    if (cell.cellsRows?.length) {
                        let divideDelta = Math.floor(-delta2 / cell.cellsRows.length)
                        let divideDeltaPos = next ? -divideDelta / 2 : divideDelta / 2
                        let extraSize = (cell.cellsRows.length - 1) * grid.moduleThickness

                        cell.cellsRows.forEach(item => {
                            if (item.width + divideDelta >= MIN_SECTION_WIDTH) {
                                item.width += divideDelta
                                item.position.x += divideDeltaPos

                                item.extras?.forEach(extra => {
                                    extra.width = item.width
                                    extra.position.x = item.position.x

                                    if (extra.fillings?.length) {
                                        extra.fillings.forEach((filling) => {
                                            if (filling.isVerticalItem) {
                                                filling.position.x += divideDeltaPos;
                                            } else {
                                                filling.width = extra.width;
                                                filling.size.x = filling.width;
                                                filling.position.x = extra.position.x - extra.width / 2;
                                            }
                                        })
                                    }

                                })

                                if (item.fillings?.length) {
                                    item.fillings.forEach((filling) => {
                                        if (filling.isVerticalItem) {
                                            filling.position.x += divideDeltaPos;
                                        } else {
                                            filling.width = item.width;
                                            filling.size.x = filling.width;
                                            filling.position.x = item.position.x - item.width / 2;
                                        }
                                    })
                                }
                            } else {
                                item.width = MIN_SECTION_WIDTH
                            }


                            extraSize += item.width

                        })

                        let lastRow = next ? cell.cellsRows[0] : cell.cellsRows[cell.cellsRows.length - 1]
                        if (lastRow.width + (newRightWidth - extraSize) >= MIN_SECTION_WIDTH) {
                            lastRow.width += (newRightWidth - extraSize)
                            lastRow.position.x += (newRightWidth - extraSize) / 2

                            lastRow.fillings?.forEach((filling) => {
                                if (filling.isVerticalItem) {
                                    filling.position.x += (newRightWidth - extraSize) / 2;
                                } else {
                                    filling.width = lastRow.width;
                                    filling.size.x = filling.width;
                                    filling.position.x = lastRow.position.x - lastRow.width / 2;
                                }
                            })

                            lastRow.extras?.forEach(extra => {
                                extra.width = lastRow.width
                                extra.position.x = lastRow.position.x

                                extra.fillings?.forEach((filling) => {
                                    if (filling.isVerticalItem) {
                                        filling.position.x += (newRightWidth - extraSize) / 2;
                                    } else {
                                        filling.width = extra.width;
                                        filling.size.x = filling.width;
                                        filling.position.x = extra.position.x - extra.width / 2;
                                    }
                                })
                            })
                        } else {
                            lastRow = cell.cellsRows.find((item) => {
                                return item.width + (newRightWidth - extraSize) >= MIN_SECTION_WIDTH
                            })

                            if (lastRow) {
                                lastRow.width += (newRightWidth - extraSize)
                                lastRow.position.x += (newRightWidth - extraSize) / 2
                                lastRow.extras?.forEach(extra => {
                                    extra.width = lastRow.width
                                    extra.position.x = lastRow.position.x

                                    lastRow.fillings?.forEach((filling) => {
                                        if (filling.isVerticalItem) {
                                            filling.position.x += (newRightWidth - extraSize) / 2;
                                        } else {
                                            filling.width = lastRow.width;
                                            filling.size.x = filling.width;
                                            filling.position.x = lastRow.position.x - lastRow.width / 2;
                                        }
                                    })

                                    extra.fillings?.forEach((filling) => {
                                        if (filling.isVerticalItem) {
                                            filling.position.x += (newRightWidth - extraSize) / 2;
                                        } else {
                                            filling.width = extra.width;
                                            filling.size.x = filling.width;
                                            filling.position.x = extra.position.x - extra.width / 2;
                                        }
                                    })
                                })
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
                        })
                    }
                })


                if (nextSection.fillings?.length) {
                    nextSection.fillings.forEach((filling) => {
                        if (filling.isVerticalItem) {
                            filling.position.x += deltaPos1;
                        } else {
                            filling.width = nextSection.width;
                            filling.size.x = filling.width;
                            filling.position.x = nextSection.position.x - nextSection.width / 2;
                        }
                    })
                }

                this.scope.SHELVES.recalcSectionTsarga(section);
                if (nextSection) {
                    this.scope.SHELVES.recalcSectionTsarga(nextSection);
                }
                this.scope.reset(grid)
            }
        }, 1000)

    };

    deleteSection(grid: GridModule = this.scope.UM_STORE.getUMGrid(), secIndex: number, reset: boolean = false) {
        const MAX_SECTION_WIDTH = WITH_TSARGA.includes(grid.productID)
            ? this.scope.CONST.MAX_SECTION_WIDTH_TSARGA
            : this.scope.CONST.MAX_SECTION_WIDTH;
        const current = grid.sections[secIndex];
        const next = grid.sections[secIndex + 1];
        const prev = grid.sections[secIndex - 1];

        const combinedWidth = next
            ? current.width + next.width + grid.moduleThickness
            : current.width + prev.width + grid.moduleThickness;

        if (combinedWidth > MAX_SECTION_WIDTH) {
            this.scope.callAlert("warning", `Суммарная ширина новой секции превысит допустимый предел! Уменьшите ширину секций!`)
            return;
        }

        if (next) {
            next.position.x = current.position.x - current.width / 2 + combinedWidth / 2
            next.width = combinedWidth;
            next.cells?.forEach((elem) => {
                elem.position.x = next.position.x
                elem.width = combinedWidth;
                if (elem.cellsRows)
                    delete elem.cellsRows
            });
        } else {
            prev.position.x = prev.position.x - prev.width / 2 + combinedWidth / 2
            prev.width = combinedWidth;
            prev.cells?.forEach((elem) => {
                elem.position.x = prev.position.x
                elem.width = combinedWidth;
                if (elem.cellsRows)
                    delete elem.cellsRows
            });
        }

        if (grid.sections.length > 1) {
            grid.sections.splice(secIndex, 1);
            this.scope.FILLINGS.updateSecAfterDelete(grid, secIndex);
        }

        // Удалённая секция могла разделять секции с петлями на встречных перегородках —
        // снимаем дверь до пересчёта, чтобы петли считались по итоговому набору
        this.scope.LOOPS.resolvePartitionLoopsConflicts(grid);

        // Пересчёт петель для всех секций — смена топологии меняет соседство
        for (let i = 0; i < grid.sections.length; i++) {
            this.scope.LOOPS.calcLoops(i, grid);
        }

        // Пересчёт царги для объединённой секции
        this.scope.SHELVES.recalcSectionTsarga(next || prev);

        if (reset)
            this.scope.reset(grid)

        this.selectCell(0, null)
        this.scope.debounce("postResetSelect", () => this.selectCell(0, null), 150)
    };

    autoSelectDeepest = (grid: GridModule = this.scope.UM_STORE.getUMGrid()) => {

        const sec = 0;
        const section = grid.sections[sec];

        let cell: number | null = null;
        let row: number | null = null;
        let extra: number | null = null;

        if (section.cells?.length) {
            cell = 0;
            if (section.cells[0].cellsRows?.length) {
                row = 0;
                if (section.cells[0].cellsRows[0].extras?.length) {
                    extra = 0;
                }
            }
        }

        this.selectCell(sec, cell, row, extra, null)
    };
}
