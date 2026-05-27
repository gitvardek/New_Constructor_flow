//@ts-nocheck


import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import { UM_PARAMS } from "@/components/UMconstructor/utils/Const.ts";
import * as THREE from "three";
import {
    GridModule,
    GridCell,
    GridCellsRow,
    GridRowExtra,
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

        // if (grid.productID === UM_PARAMS.RASPASHNOY_ID && !grid.isSlidingDoors && section?.fasades?.length > 0) {
        //     for (let i = 0; i < count; i++) {
        //         const newSecIndex = secIndex + 1 + i;
        //         if (!grid.sections[newSecIndex].fasades?.length) {
        //             this.scope.FASADES.addDoor(newSecIndex, grid, false);
        //         }
        //     }
        // }

        if (!grid.isSlidingDoors && section?.fasades?.length > 0) {
            for (let i = 0; i < count; i++) {
                const newSecIndex = secIndex + 1 + i;
                if (!grid.sections[newSecIndex].fasades?.length) {
                    this.scope.FASADES.addDoor(newSecIndex, grid, false);
                }
            }
        }

        if (reset)
            this.scope.reset(grid)
    };

    addCell(
        {
            grid = this.scope.UM_STORE.getUMGrid(),
            secIndex = 0,
            cellIndex = null,
            count = 1
        }:
            {
                grid: GridModule,
                secIndex: number,
                cellIndex: number | null,
                count: number
            }) {
        this.selectCell(secIndex, cellIndex);

        const { MIN_SECTION_HEIGHT } = this.scope.CONST
        let section = grid.sections[secIndex];

        let cell;
        if (section.cells.length > 0) {
            cell = section.cells[cellIndex]
        } else {
            cell = <GridCell>{
                number: 1,
                width: section.width,
                height: section.height,
                type: "cell",
                position: new THREE.Vector2(section.position.x, section.position.y),
            };

            if (section.fillings?.length) {
                this.scope.FILLINGS.clearFillings({ grid, secIndex });
            }

            section.cells.push(cell);
        }

        if (cell.cellsRows)
            delete cell.cellsRows

        const halfHeight = Math.floor((cell.height - grid.moduleThickness * count) / (count + 1));

        if (halfHeight < MIN_SECTION_HEIGHT) {
            this.scope.callAlert("warning", `Расстояние между полками слишком мало! Пожалуйста, выберите меньшее количество полок!`)
            return;
        }

        const deltaLastCell = cell.height - halfHeight * (count + 1) - grid.moduleThickness * count;

        // Обновляем высоту последней строки
        cell.height = halfHeight;

        if (cell.fillings?.length) {
            this.scope.FILLINGS.clearFillings({ grid, secIndex, cellIndex });
        }

        // Добавляем новую строку в эту колонку
        for (let i = 0; i < count; i++) {

            let newCell = <GridCell>{
                ...cell,
                number: cell.number + 1 + i,
                position: new THREE.Vector2(cell.position.x, cell.position.y + (halfHeight + grid.moduleThickness) * (i + 1)),
                fillings: [],
                //fillings: newFillings,
            }

            delete newCell.hiTechProfiles

            if (deltaLastCell && i === count - 1) {
                newCell.height += deltaLastCell;
            }

            section.cells.splice(cellIndex || 0, 0, newCell);
        }

        this.scope.reset(grid)
    };

    addRowCell({
        grid = this.scope.UM_STORE.getUMGrid(),
        secIndex,
        cellIndex,
        rowIndex = 0,
        count = 1
    }:
        {
            grid: GridModule,
            secIndex: number,
            cellIndex: number,
            rowIndex: number,
            count: number
        }) {

        this.selectCell(secIndex, cellIndex, rowIndex);
        const { MIN_SECTION_WIDTH } = this.scope.CONST

        const cell = grid.sections[secIndex].cells[cellIndex]

        let row;
        if (cell.cellsRows?.length > 0) {
            row = cell.cellsRows[rowIndex];
        } else {
            cell.cellsRows = []
            row = <GridCellsRow>{
                number: 1,
                width: cell.width,
                height: cell.height,
                type: "rowCell",
                fillings: [],
                position: new THREE.Vector2(cell.position.x, cell.position.y),
            }
            cell.cellsRows.push(row);

            if (cell.fillings?.length) {
                this.scope.FILLINGS.clearFillings({ grid, secIndex, cellIndex });
            }
        }

        const halfWidth = Math.floor((row.width - grid.moduleThickness * count) / (count + 1));

        if (halfWidth < MIN_SECTION_WIDTH) {
            this.scope.callAlert("warning", `Расстояние между разделителями слишком мало! Пожалуйста, выберите меньшее количество!`)
            if (cell.cellsRows?.length === 1) {
                delete cell.cellsRows
            }
            return;
        }

        const deltaLastRow = row.width - halfWidth * (count + 1) - grid.moduleThickness * count;

        if (row.fillings?.length)
            this.scope.FILLINGS.clearFillings({ grid, secIndex, cellIndex, rowIndex });

        // Обновляем высоту последней строки
        row.position.x = row.position.x - (row.width / 2 - halfWidth / 2)
        row.width = halfWidth;

        // Добавляем новую строку в эту колонку
        for (let i = 0; i < count; i++) {
            let newRow = <GridCellsRow>{
                ...row,
                number: row.number + 1 + i,
                position: new THREE.Vector2(row.position.x + (row.width / 2 + grid.moduleThickness + halfWidth / 2) * (i + 1), row.position.y),
                fillings: [],
            }

            if (i === count - 1) {
                newRow.width += deltaLastRow;
            }

            cell.cellsRows.splice(rowIndex + 1 + i, 0, newRow);
        }

        this.scope.reset(grid)
    };

    addRowExtra({
        grid = this.scope.UM_STORE.getUMGrid(),
        secIndex,
        cellIndex,
        rowIndex,
        extraIndex = 0,
        count = 1
    }:
        {
            grid: GridModule,
            secIndex: number,
            cellIndex: number,
            rowIndex: number,
            extraIndex: number,
            count: number
        }) {
        this.selectCell(secIndex, cellIndex, rowIndex);
        const { MIN_SECTION_HEIGHT } = this.scope.CONST

        let section = grid.sections[secIndex];
        let cell = section.cells[cellIndex];
        let row = cell.cellsRows[rowIndex]

        let extra;
        if (row.extras?.length > 0) {
            extra = row.extras[extraIndex]
        } else {
            row.extras = <GridRowExtra>[];
            extra = <GridRowExtra>{
                number: 1,
                width: row.width,
                height: row.height,
                type: "rowExtra",
                position: new THREE.Vector2(row.position.x, row.position.y),
            };

            if (row.fillings?.length) {
                this.scope.FILLINGS.clearFillings({ grid, secIndex, cellIndex, rowIndex });
            }

            row.extras.push(extra);
        }

        const halfHeight = Math.floor((extra.height - grid.moduleThickness * count) / (count + 1));

        if (halfHeight < MIN_SECTION_HEIGHT) {
            this.scope.callAlert("warning", `Расстояние между полками слишком мало! Пожалуйста, выберите меньшее количество полок!`)
            if (row.extras?.length === 1) {
                delete row.extras
            }
            return;
        }

        const deltaLastCell = extra.height - halfHeight * (count + 1) - grid.moduleThickness * count;

        // Обновляем высоту последней строки
        extra.height = halfHeight;

        if (extra.fillings?.length)
            this.scope.FILLINGS.clearFillings({ grid, secIndex, cellIndex, rowIndex, extraIndex });

        // Добавляем новую строку в эту колонку
        for (let i = 0; i < count; i++) {

            let newExtra = <GridRowExtra>{
                ...extra,
                number: extra.number + 1 + i,
                position: new THREE.Vector2(extra.position.x, extra.position.y + (halfHeight + grid.moduleThickness) * (i + 1)),
                fillings: [],
                //fillings: newFillings,
            }

            delete newExtra.hiTechProfiles

            if (deltaLastCell && i === count - 1) {
                newExtra.height += deltaLastCell;
            }

            row.extras.splice(extraIndex || 0, 0, newExtra);
        }

        this.scope.reset(grid)
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
            //const clone = Object.assign({}, grid);
            let section = grid.sections[secIndex]

            if (adjustedValue) {
                let next = grid.sections[secIndex + 1]
                let prev = grid.sections[secIndex - 1]

                let nextSection = next || prev

                let delta1 = section.width - adjustedValue
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
                                            }
                                            {
                                                filling.width = extra.width;
                                                filling.size.x = filling.width;
                                                filling.position.x += item.position.x - item.width / 2;
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
                                                filling.position.x += deltaPos1;
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
                                            filling.position.x = deltaPos1;
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
            }
            //grid = clone;

            this.scope.reset(grid)
        }, 1000)

    };

    updateCellHeight(
        {
            grid = this.scope.UM_STORE.getUMGrid(),
            secIndex,
            cellIndex,
            value
        }:
            {
                grid: GridModule,
                secIndex: number,
                cellIndex: number,
                value: number,
            }) {
        this.scope.debounce("updateCellHeight", () => {
            const newValue = value;
            // Обновляем выбранную секцию для визуального отображения
            this.selectCell(secIndex, cellIndex);
            const { MIN_SECTION_HEIGHT } = this.scope.CONST;

            let adjustedValue;
            if (!isNaN(newValue) && this.scope.RENDER_REF) {
                adjustedValue = this.scope.RENDER_REF.adjustSizeFromExternal({
                    dimension: "height",
                    value: newValue,
                    sec: secIndex,
                    cell: cellIndex,
                });
            }
            // Обновляем значение в module для синхронизации
            const clone = Object.assign({}, grid);
            let curSection = clone.sections[secIndex]

            if (adjustedValue) {
                let cell = curSection.cells[cellIndex]
                let prev = curSection.cells[cellIndex - 1];
                let next = curSection.cells[cellIndex + 1]

                let nextCell = next || prev
                let nextIndex = next ? cellIndex + 1 : cellIndex - 1

                let delta1 = cell.height - adjustedValue
                cell.height = adjustedValue
                cell.position.y += delta1;

                if (cell.cellsRows?.length) {
                    cell.cellsRows.forEach((row) => {
                        row.height = cell.height;
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
                            })
                        }

                        if (row.extras?.length) {
                            let divideDelta = Math.floor(-delta1 / row.extras.length)
                            let divideDeltaPos1 = divideDelta
                            let extraSize = (row.extras.length - 1) * grid.moduleThickness

                            row.extras.forEach(item => {
                                if (item.height + divideDelta >= MIN_SECTION_HEIGHT) {
                                    item.height += divideDelta

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
                                        })
                                    }
                                } else {
                                    item.height = MIN_SECTION_HEIGHT
                                }


                                extraSize += item.height

                                item.fillings?.filter((filling, index) => {
                                    return filling.position.y + filling.height <= item.position.y + item.height;
                                })
                            })

                            let lastRow = row.extras[row.extras.length - 1]
                            if (lastRow.height + (adjustedValue - extraSize) >= MIN_SECTION_HEIGHT) {
                                lastRow.height += (adjustedValue - extraSize)
                                lastRow.position.y += (adjustedValue - extraSize) / 2

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
                                    })
                                }
                            } else {
                                lastRow = row.extras.find((item) => {
                                    return item.height + (adjustedValue - extraSize) >= MIN_SECTION_HEIGHT
                                })

                                if (lastRow) {
                                    lastRow.height += (adjustedValue - extraSize)
                                    lastRow.position.y += (adjustedValue - extraSize) / 2

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
                                        })
                                    }
                                }

                            }
                        }

                        row.fillings?.filter((filling, index) => {
                            return filling.position.y + filling.height <= row.position.y + row.height;
                        })
                    })
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
                    })
                }

                let newBottomHeight = nextCell.height - (-delta1)
                let delta2 = nextCell.height - newBottomHeight
                nextCell.height = newBottomHeight;

                if (nextCell.cellsRows) {
                    nextCell.cellsRows.forEach((row) => {
                        row.height = nextCell.height;
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
                            })
                        }

                        if (row.extras?.length) {
                            let divideDelta = Math.floor(-delta2 / row.extras.length)
                            let divideDeltaPos2 = -divideDelta
                            let extraSize = (row.extras.length - 1) * grid.moduleThickness

                            row.extras.forEach(item => {
                                if (item.height + divideDelta >= MIN_SECTION_HEIGHT) {
                                    item.height += divideDelta
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
                                        })
                                    }
                                } else {
                                    item.height = MIN_SECTION_HEIGHT
                                }

                                extraSize += item.height

                                item.fillings?.filter((filling, index) => {
                                    return filling.position.y + filling.height <= item.position.y + item.height;
                                })
                            })

                            let lastRow = row.extras[0]
                            if (lastRow.height + (newBottomHeight - extraSize) >= MIN_SECTION_HEIGHT) {
                                lastRow.height += (newBottomHeight - extraSize)
                                lastRow.position.y += (newBottomHeight - extraSize) / 2

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
                                    })
                                }
                            } else {
                                lastRow = row.extras.find((item) => {
                                    return item.height + (newBottomHeight - extraSize) >= MIN_SECTION_HEIGHT
                                })

                                if (lastRow) {
                                    lastRow.height += (newBottomHeight - extraSize)
                                    lastRow.position.y += (newBottomHeight - extraSize) / 2

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
                                        })
                                    }
                                }

                            }
                        }

                        row.fillings?.filter((filling, index) => {
                            return filling.position.y + filling.height <= row.position.y + row.height;
                        })
                    })
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
                    })
                }
            }
            grid = clone;

            this.scope.reset(grid)
        })
    };

    updateCellRowWidth(
        {
            grid = this.scope.UM_STORE.getUMGrid(),
            secIndex,
            cellIndex,
            rowIndex,
            value
        }:
            {
                grid: GridModule,
                secIndex: number,
                cellIndex: number,
                rowIndex: number,
                value: number,
            }) {

        this.scope.debounce("updateCellRowWidth", () => {
            const newValue = value;
            let adjustedValue;

            // Обновляем выбранную секцию для визуального отображения
            this.selectCell(secIndex, cellIndex, rowIndex);

            if (!isNaN(newValue) && this.scope.RENDER_REF) {
                adjustedValue = this.scope.RENDER_REF.adjustSizeFromExternal({
                    dimension: "width",
                    value: newValue,
                    sec: secIndex,
                    cell: cellIndex,
                    row: rowIndex,
                });
            }
            // Обновляем значение в module для синхронизации
            const clone = Object.assign({}, grid);
            if (adjustedValue) {
                let curRow = clone.sections[secIndex].cells[cellIndex].cellsRows[rowIndex]
                let prevRow = clone.sections[secIndex].cells[cellIndex].cellsRows[rowIndex - 1];
                let nextRow = clone.sections[secIndex].cells[cellIndex].cellsRows[rowIndex + 1];
                let delta = curRow.width - adjustedValue

                curRow.width = adjustedValue
                curRow.position.x -= delta / 2

                if (curRow.extras?.length) {
                    curRow.extras.forEach(extra => {
                        extra.width = curRow.width
                        extra.position.x = curRow.position.x
                    })
                }

                if (nextRow) {
                    nextRow.width += delta
                    nextRow.position.x -= delta / 2

                    if (nextRow.extras?.length) {
                        nextRow.extras.forEach(extra => {
                            extra.width = nextRow.width
                            extra.position.x = nextRow.position.x
                        })
                    }
                } else if (prevRow) {
                    prevRow.width += delta
                    prevRow.position.x += delta / 2

                    if (prevRow.extras?.length) {
                        prevRow.extras.forEach(extra => {
                            extra.width = prevRow.width
                            extra.position.x = prevRow.position.x
                        })
                    }
                }
            }
            grid = clone;

            this.scope.reset(grid)
        })

    };

    updateExtraHeight(
        {
            grid = this.scope.UM_STORE.getUMGrid(),
            secIndex,
            cellIndex,
            rowIndex,
            extraIndex,
            value
        }:
            {
                grid: GridModule,
                secIndex: number,
                cellIndex: number,
                rowIndex: number,
                extraIndex: number,
                value: number,
            }) {
        this.scope.debounce("updateExtraHeight", () => {
            const newValue = value;
            let adjustedValue;
            // Обновляем выбранную секцию для визуального отображения
            this.selectCell(secIndex, cellIndex, rowIndex, extraIndex);

            if (!isNaN(newValue) && this.scope.RENDER_REF) {
                adjustedValue = this.scope.RENDER_REF.adjustSizeFromExternal({
                    dimension: "height",
                    value: newValue,
                    sec: secIndex,
                    cell: cellIndex,
                    row: rowIndex,
                    extra: extraIndex,
                });
            }
            // Обновляем значение в module для синхронизации
            const clone = Object.assign({}, grid);
            let curSection = clone.sections[secIndex]
            let curCell = curSection.cells[cellIndex]
            let curRow = curCell.cellsRows[rowIndex]

            if (adjustedValue) {
                let curExtra = curRow.extras[extraIndex]
                let nextIndex = curRow.extras[extraIndex + 1] ? extraIndex + 1 : extraIndex - 1;
                let nextExtra = curRow.extras[nextIndex]
                let delta = curExtra.height - adjustedValue

                curExtra.height = adjustedValue

                if (nextExtra?.position?.y < curExtra.position.y)
                    curExtra.position.y += delta

                if (nextExtra) {
                    nextExtra.height += delta

                    if (nextExtra.position.y > curExtra.position.y)
                        nextExtra.position.y -= delta

                    nextExtra.fillings?.filter((filling, index) => {
                        if (filling.position.y + filling.height <= nextExtra.position.y - grid.moduleThickness) {
                            filling.extra = extraIndex
                            curExtra.push(filling);
                            return false
                        } else if (filling.position.y >= nextExtra.position.y + nextExtra.height + grid.moduleThickness) {
                            filling.extra = extraIndex
                            curExtra.push(filling);
                            return false
                        } else
                            return true
                    })
                }

                curExtra.fillings?.filter((filling, index) => {
                    if (filling.position.y + filling.height <= curExtra.position.y - grid.moduleThickness) {
                        if (nextExtra) {
                            filling.extra = nextIndex
                            nextExtra.push(filling);
                        }
                        return false
                    } else if (filling.position.y >= curExtra.position.y + curExtra.height + grid.moduleThickness) {
                        if (nextExtra) {
                            filling.extra = nextIndex
                            nextExtra.push(filling);
                        }
                        return false
                    } else
                        return true
                })
            }
            grid = clone;

            this.scope.reset(grid)
        })
    };

    deleteSection(grid: GridModule = this.scope.UM_STORE.getUMGrid(), secIndex: number, reset: boolean = false) {
        const { MAX_SECTION_WIDTH } = this.scope.CONST
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

        this.scope.LOOPS.calcLoops(next ? secIndex + 1 : secIndex - 1, grid);

        if (grid.sections.length > 1) {
            grid.sections.splice(secIndex, 1);
        }

        this.selectCell(0, 0)

        if (reset)
            this.scope.reset(grid)
    };

    deleteCell(grid: GridModule = this.scope.UM_STORE.getUMGrid(), secIndex: number, cellIndex: number) {
        const clone = Object.assign({}, grid);
        const currentSection = clone.sections[secIndex];
        const currentCell = currentSection.cells[cellIndex];

        const next = currentSection.cells[cellIndex + 1];
        const prev = currentSection.cells[cellIndex - 1];
        let needUpdateFasade = false;

        const combinedHeight = next
            ? currentCell.height + next.height
            : currentCell.height + prev.height;

        next ? (next.height = combinedHeight) : (prev.height = combinedHeight);

        if (currentCell.fillings?.length) {
            let newFillings = next || prev
            if (newFillings?.fillings?.length) {
                this.scope.FILLINGS.clearFillings({ grid, secIndex, cellIndex: next ? cellIndex + 1 : cellIndex - 1 });
            }

            /*if (!newFillings.fillings)
                newFillings.fillings = []

            let startIndex = newFillings.fillings.length
            currentCell.fillings.forEach((filling) => {
                let profileId
                if(filling.isProfile){
                    profileId = currentSection.hiTechProfiles?.findIndex(item => (
                        item.sec === filling.sec &&
                        item.cell === filling.cell &&
                        item.row === filling.row &&
                        item.extra === filling.extra &&
                        item.id === filling.id
                    ))
                }
                filling.id = startIndex
                filling.cell = prev ? filling.cell - 1 : filling.cell
                startIndex += 1

                if(profileId) {
                    currentSection.hiTechProfiles?.splice(profileId, 1, filling)
                    needUpdateFasade = true
                }
            })
            newFillings.fillings.push(...currentCell.fillings)*/

            this.scope.FILLINGS.clearFillings({ grid, secIndex, cellIndex });
        }

        if (currentSection.cells.length > 1) {
            currentSection.cells.splice(cellIndex, 1);
        }

        if (currentSection.cells.length <= 1)
            currentSection.cells.length = 0

        grid = clone;
        this.selectCell(secIndex, 0)

        if (needUpdateFasade)
            this.scope.FASADES.EXTERNAL_FASADES.calcDrawersFasades(secIndex, false, grid)

        this.scope.reset(grid)
    };

    deleteRowCell(grid: GridModule = this.scope.UM_STORE.getUMGrid(), secIndex: number, cellIndex: number, rowIndex: number) {
        const clone = Object.assign({}, grid);
        const currentSection = clone.sections[secIndex];
        const currentCell = currentSection.cells[cellIndex];
        const currentRow = currentCell.cellsRows[rowIndex];

        const next = currentCell.cellsRows[rowIndex + 1];
        const prev = currentCell.cellsRows[rowIndex - 1];

        const combinedWidth = next
            ? currentCell.width + next.width
            : currentCell.width + prev.width;


        next ? (next.position.x = next.position.x - next.width / 2 + combinedWidth / 2) : (prev.position.x = prev.position.x - prev.width / 2 + combinedWidth / 2);
        next ? (next.width = combinedWidth) : (prev.width = combinedWidth);

        if (currentCell.cellsRows.length > 1) {
            currentCell.cellsRows.splice(rowIndex, 1);
        }

        next ? (delete next.fillings) : (delete prev.fillings);

        if (currentCell.cellsRows.length <= 1)
            delete currentCell.cellsRows

        grid = clone;
        this.selectCell(secIndex, cellIndex)
        this.scope.reset(grid)
    }

    deleteRowExtra(grid: GridModule = this.scope.UM_STORE.getUMGrid(), secIndex: number, cellIndex: number, rowIndex: number, extraIndex: number) {
        const clone = Object.assign({}, grid);
        const currentSection = clone.sections[secIndex];
        const currentCell = currentSection.cells[cellIndex];
        const currentRow = currentCell.cellsRows[rowIndex];
        const currentExtra = currentRow.extras[extraIndex];

        const next = currentRow.extras[extraIndex + 1];
        const prev = currentRow.extras[extraIndex - 1];

        const combinedHeight = next
            ? currentExtra.height + next.height + grid.moduleThickness
            : currentExtra.height + prev.height + grid.moduleThickness;

        next ? (next.position.y = next.position.y - next.height / 2 + combinedHeight / 2) : (prev.position.y = prev.position.y - prev.height / 2 + combinedHeight / 2);
        next ? (next.height = combinedHeight) : (prev.height = combinedHeight);

        if (currentRow.extras.length > 1) {
            currentRow.extras.splice(extraIndex, 1);
        }

        next ? (delete next.fillings) : (delete prev.fillings);

        if (currentRow.extras.length <= 1)
            delete currentRow.extras

        grid = clone;
        this.selectCell(secIndex, cellIndex, rowIndex)
        this.scope.reset(grid)
    };
}