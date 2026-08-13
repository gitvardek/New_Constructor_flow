//@ts-nocheck

import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import * as THREE from "three";
import {
    GridModule,
    GridCell,
    GridCellsRow,
    GridRowExtra,
} from "@/components/UMconstructor/types/UMtypes.ts";
import { UM_PARAMS, WITH_TSARGA } from "@/components/UMconstructor/utils/Const.ts";

export default class ShelvesManager {
    scope: UMconstructorClass

    constructor(scope: UMconstructorClass) {
        this.scope = scope
    }

    private get metalTsargaActive(): boolean {
        return this.scope.UM_STORE.getUMData()?.CONFIG?.OPTIONS?.some(opt => +opt.id === 7250589 && opt.active) ?? false;
    }

    private hasTsargaProduct(grid: GridModule): boolean {
        return WITH_TSARGA.includes(grid.productID);
    }

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


        if (!this.scope.checkSelection('sec', { sec: secIndex })) return;

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

        // Сбрасываем tsarga с базовой ячейки — будет переустановлена ниже
        delete cell.tsarga;

        // Добавляем новую строку в эту колонку
        for (let i = 0; i < count; i++) {

            let newCell = <GridCell>{
                ...cell,
                number: cell.number + 1 + i,
                position: new THREE.Vector2(cell.position.x, cell.position.y + (halfHeight + grid.moduleThickness) * (i + 1)),
                fillings: [],
            }

            delete newCell.hiTechProfiles

            if (deltaLastCell && i === count - 1) {
                newCell.height += deltaLastCell;
            }

            // Новые ячейки получают царгу по ширине (только для продуктов с царгой)
            if (this.hasTsargaProduct(grid) && newCell.width >= UM_PARAMS.MIN_TSARGA_WIDTH && newCell.width <= UM_PARAMS.MAX_TSARGA_WIDTH) {
                newCell.tsarga = { PRODUCT_ID: 15335121, ID: 15335121, MATERIAL_ID: 15826, WIDTH: cell.width, POSITION: cell.position.x, type: 'tsarga' };
            }

            section.cells.splice(cellIndex || 0, 0, newCell);
        }

        // Восстанавливаем tsarga базовой ячейки (только для продуктов с царгой)
        if (this.hasTsargaProduct(grid) && cell.width >= UM_PARAMS.MIN_TSARGA_WIDTH && cell.width <= UM_PARAMS.MAX_TSARGA_WIDTH) {
            cell.tsarga = { PRODUCT_ID: 15335121, ID: 15335121, MATERIAL_ID: 15826, WIDTH: cell.width, POSITION: cell.position.x, type: 'tsarga' };
        } else {
            delete cell.tsarga;
        }

        this.recalcSectionTsarga(section);
        this.scope.reset(grid)
        this.autoSelectDeepest(grid)
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
                                            filling.position.y += (adjustedValue - extraSize) / 2;
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
                                                filling.position.y += (adjustedValue - extraSize) / 2;
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
        }, 1000)
    };

    deleteCell(grid: GridModule = this.scope.UM_STORE.getUMGrid(), secIndex: number, cellIndex: number) {
        const clone = Object.assign({}, grid);
        const currentSection = clone.sections[secIndex];
        const currentCell = currentSection.cells[cellIndex];

        const next = currentSection.cells[cellIndex + 1];
        const prev = currentSection.cells[cellIndex - 1];

        const combinedHeight = next
            ? currentCell.height + next.height
            : currentCell.height + prev.height;

        next ? (next.height = combinedHeight) : (prev.height = combinedHeight);

        // Очищаем филлинги соседней ячейки независимо от наличия филлингов у удаляемой
        const mergedCell = next || prev
        if (mergedCell?.fillings?.length) {
            this.scope.FILLINGS.clearFillings({ grid, secIndex, cellIndex: next ? cellIndex + 1 : cellIndex - 1 });
        }
        if (currentCell.fillings?.length) {
            this.scope.FILLINGS.clearFillings({ grid, secIndex, cellIndex });
        }

        if (currentSection.cells.length > 1) {
            currentSection.cells.splice(cellIndex, 1);
        }

        if (currentSection.cells.length <= 1)
            currentSection.cells.length = 0

        if (currentSection.cells.length > 0)
            this.recalcSectionTsarga(currentSection);

        grid = clone;
        this.scope.reset(grid)
        this.autoSelectDeepest(grid)
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

        if (!this.scope.checkSelection('sec', { sec: secIndex })) return;

        const { MIN_SECTION_WIDTH } = this.scope.CONST
        const section = grid.sections[secIndex];

        // Если у секции ещё нет ячеек — создаём базовую из размеров секции
        if (section.cells.length === 0) {
            const baseCell = <GridCell>{
                number: 1,
                width: section.width,
                height: section.height,
                type: "cell",
                position: new THREE.Vector2(section.position.x, section.position.y),
            };
            if (section.fillings?.length) {
                this.scope.FILLINGS.clearFillings({ grid, secIndex });
            }
            section.cells.push(baseCell);
            cellIndex = 0;
        }


        const cell = section.cells[cellIndex];

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

        // Ячейка с cellsRows — контейнер столбцов, своя царга не нужна
        delete cell.tsarga;

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

        // Обновляем ширину последней строки
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

        // Перенумерация всех рядов после вставки
        cell.cellsRows.forEach((r, idx) => { r.number = idx + 1; });

        this.recalcSectionTsarga(section);
        this.scope.reset(grid)
        this.autoSelectDeepest(grid)
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
            const section = clone.sections[secIndex];
            this.recalcSectionTsarga(section);
            grid = clone;

            this.scope.reset(grid)
        }, 1000)

    };

    deleteRowCell(grid: GridModule = this.scope.UM_STORE.getUMGrid(), secIndex: number, cellIndex: number, rowIndex: number) {
        const clone = Object.assign({}, grid);
        const currentSection = clone.sections[secIndex];
        const currentCell = currentSection.cells[cellIndex];
        const currentRow = currentCell.cellsRows[rowIndex];

        const next = currentCell.cellsRows[rowIndex + 1];
        const prev = currentCell.cellsRows[rowIndex - 1];

        const combinedWidth = next
            ? currentRow.width + next.width + grid.moduleThickness
            : currentRow.width + prev.width + grid.moduleThickness;


        next ? (next.position.x = next.position.x - next.width / 2 + combinedWidth / 2) : (prev.position.x = prev.position.x - prev.width / 2 + combinedWidth / 2);
        next ? (next.width = combinedWidth) : (prev.width = combinedWidth);

        if (currentCell.cellsRows.length > 1) {
            currentCell.cellsRows.splice(rowIndex, 1);
        }

        next ? (delete next.fillings) : (delete prev.fillings);

        if (currentCell.cellsRows.length <= 1)
            delete currentCell.cellsRows

        this.recalcSectionTsarga(currentSection);
        grid = clone;
        this.scope.reset(grid)
        this.autoSelectDeepest(grid)
    }

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

        if (!this.scope.checkSelection('row', { sec: secIndex, cell: cellIndex, row: rowIndex })) return;

        const { MIN_SECTION_HEIGHT } = this.scope.CONST

        let section = grid.sections[secIndex];
        let cell = section.cells[cellIndex];
        let row = cell.cellsRows?.[rowIndex]

        if (!row) {
            this.scope.callAlert("warning", "Необходимо выбрать ряд");
            return;
        }

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
            }

            delete newExtra.hiTechProfiles

            if (deltaLastCell && i === count - 1) {
                newExtra.height += deltaLastCell;
            }

            row.extras.splice(extraIndex || 0, 0, newExtra);
        }

        this.recalcSectionTsarga(grid.sections[secIndex]);
        this.scope.reset(grid)
        this.autoSelectDeepest(grid)
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
        }, 1000)
    };

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

        this.recalcSectionTsarga(currentSection);
        grid = clone;
        this.scope.reset(grid)
        this.autoSelectDeepest()
    };

    recalcSectionTsarga(section) {
        const { MIN_TSARGA_WIDTH, MAX_TSARGA_WIDTH } = UM_PARAMS;
        const productID = this.scope.UM_STORE.getUMGrid()?.productID;
        if (!WITH_TSARGA.includes(productID)) {
            delete section.tsarga;
            section.cells?.forEach(cell => {
                delete cell.tsarga;
                cell.cellsRows?.forEach(row => {
                    delete row.tsarga;
                    row.extras?.forEach(extra => delete extra.tsarga);
                });
            });
            return;
        }
        const metalTsarga = this.metalTsargaActive;
        // section.cells должен быть уже отсортирован по убыванию position.y (cells[0] = верхняя = крыша)
        section.cells.forEach((cell, cellIdx) => {
            const isCellRoof = cellIdx === 0;

            if (cell.cellsRows?.length > 0) {
                delete cell.tsarga;
                cell.cellsRows.forEach(row => {
                    if (row.extras?.length > 0) {
                        delete row.tsarga;
                        row.extras.forEach((extra, extraIdx) => {
                            if (isCellRoof && extraIdx === 0 && metalTsarga) {
                                delete extra.tsarga;
                            } else if (row.width >= MIN_TSARGA_WIDTH && row.width <= MAX_TSARGA_WIDTH) {
                                extra.tsarga = { PRODUCT_ID: 15335121, ID: 15335121, MATERIAL_ID: 15826, WIDTH: row.width, POSITION: row.position.x, type: 'tsarga' };
                            } else {
                                delete extra.tsarga;
                            }
                        });
                    } else if (isCellRoof && metalTsarga) {
                        delete row.tsarga;
                    } else if (row.width >= MIN_TSARGA_WIDTH && row.width <= MAX_TSARGA_WIDTH) {
                        row.tsarga = { PRODUCT_ID: 15335121, ID: 15335121, MATERIAL_ID: 15826, WIDTH: row.width, POSITION: row.position.x, type: 'tsarga' };
                    } else {
                        delete row.tsarga;
                    }
                });
            } else if (isCellRoof && metalTsarga) {
                delete cell.tsarga;
            } else if (cell.width >= MIN_TSARGA_WIDTH && cell.width <= MAX_TSARGA_WIDTH) {
                cell.tsarga = { PRODUCT_ID: 15335121, ID: 15335121, MATERIAL_ID: 15826, WIDTH: cell.width, POSITION: cell.position.x, type: 'tsarga' };
            } else {
                delete cell.tsarga;
            }
        });

        if (!metalTsarga && section.cells.length === 0) {
            if (section.width >= MIN_TSARGA_WIDTH && section.width <= MAX_TSARGA_WIDTH) {
                section.tsarga = { PRODUCT_ID: 15335121, ID: 15335121, MATERIAL_ID: 15826, WIDTH: section.width, POSITION: section.position.x, type: 'tsarga' };
            } else {
                delete section.tsarga;
            }
        } else {
            delete section.tsarga;
        }
    }

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

        this.scope.SECTIONS.selectCell(sec, cell, row, extra, null)

    };
}


