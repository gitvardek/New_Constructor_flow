// Общая для всех типов наполнения логика: обход дерева грида, позиционирование,
// коллизии, generic resize/drag. Вынесено из FillingsManager.ts (Фаза 1b рефакторинга,
// см. C:\Users\MG_GO.MG\.claude\plans\iterative-launching-lerdorf.md).
// Type-specific обработчики (DrawerFillingHandler и др.) держат ссылку на этот класс
// и используют его методы вместо повторной реализации обхода/коллизий.
//@ts-nocheck

import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import {
    GridModule,
    TSelectedCell,
    FillingObject,
    GridSection, GridCell, GridCellsRow, GridRowExtra,
} from "@/components/UMconstructor/types/UMtypes.ts";
import { UM_DRAWERS_IDS, UM_PARAMS } from "../../../utils/Const";
import { isOuterDrawer, isInnerDrawer } from "./FillingTypePredicates.ts";

export default class FillingsCore {
    scope: UMconstructorClass
    private readonly OUTER_DRAWER_IDS: number[] = UM_DRAWERS_IDS.OUTER
    private readonly INNER_DRAWER_IDS: number[] = UM_DRAWERS_IDS.INNER

    constructor(scope: UMconstructorClass) {
        this.scope = scope
    }

    // Возвращает первое наполнение в секции с одним из указанных productGroupID.
    // Сканирует все уровни: секция → ячейка → ряд → дополнительный уровень.
    findFirstFillingWithGroupIDs(section: GridSection, groupIDs: number[]): FillingObject | null {
        const findIn = (fillings: FillingObject[] | undefined): FillingObject | null =>
            fillings?.find(f => groupIDs.includes(f.productGroupID)) ?? null

        let found = findIn(section.fillings)
        if (found) return found

        for (const cell of section.cells ?? []) {
            found = findIn(cell.fillings)
            if (found) return found
            for (const row of cell.cellsRows ?? []) {
                found = findIn(row.fillings)
                if (found) return found
                for (const extra of row.extras ?? []) {
                    found = findIn(extra.fillings)
                    if (found) return found
                }
            }
        }

        return null
    }

    existFilling(grid: GridModule) {
        let check = false;
        if (grid) {
            grid.sections?.forEach(section => {

                if (section.cells.length > 0) {
                    section.cells.forEach(cell => {

                        if (cell.cellsRows?.length > 0) {
                            cell.cellsRows?.forEach((cellRow) => {

                                if (cellRow.extras?.length > 0) {
                                    cellRow.extras?.forEach((extra) => {
                                        if (extra.fillings?.length > 0) {
                                            check = true;
                                        }
                                    })
                                }

                                if (cellRow.fillings?.length > 0) {
                                    check = true;
                                }
                            })
                        }

                        if (cell.fillings?.length > 0) {
                            check = true;
                        }
                    })
                }

                if (section.fillings?.length > 0) {
                    check = true;
                }
            })

            return check;
        } else {
            return check;
        }
    }

    updateFilling(
        value: number,
        currentfilling: FillingObject,
        type: string,
        grid: GridModule = this.scope.UM_STORE.getUMGrid(),
    ) {
        const { sec, cell, row, extra, item } = currentfilling
        const { MAX_SECTION_WIDTH, MIN_SECTION_WIDTH } = this.scope.CONST
        const section = grid.sections[sec];

        if (!section) return


        const currentCell = section.cells?.[cell];
        const currentRow = currentCell?.cellsRows?.[row];
        const currentExtra = currentRow?.extras?.[extra];

        const current = currentExtra || currentRow || currentCell || section;
        const prevValue = currentfilling[type]; //Предыдущее значение
        let newValue = value;

        let tmpSector = currentfilling.sector
        let tmpFasade = currentfilling.fasade
        delete currentfilling.sector
        delete currentfilling.fasade

        const fillingData = JSON.parse(JSON.stringify(currentfilling));
        fillingData[type] = newValue;
        fillingData.sector = tmpSector;

        if (tmpFasade)
            fillingData.fasade = tmpFasade;

        const pixiSector = current.sector;

        const check = pixiSector ? this.scope.SHAPE_ADJUSTER.checkToCollision(pixiSector, currentfilling.type, fillingData) : true;

        if (check && (newValue < MAX_SECTION_WIDTH || newValue > MIN_SECTION_WIDTH)) {
            delete currentfilling.error
            currentfilling[type] = newValue;

            if (type === "width") {
                currentfilling.size.x = newValue
                currentfilling.position.x = current.position.x - newValue / 2;
            }
            if (type === "height") {
                currentfilling.size.y = newValue
                currentfilling.position.y = current.position.y;
                if (currentfilling.distances) {
                    currentfilling.distances.bottom = 0;
                    currentfilling.distances.top = 0;
                }
            }

        } else {
            currentfilling.error = true
            currentfilling[type] = prevValue;
        }

        if (currentfilling.type === 'vertical_shelf') {
            currentfilling.width = grid.moduleThickness
            currentfilling.size.x = grid.moduleThickness
        }

        if (currentfilling.type === 'shelf') {
            currentfilling.height = grid.moduleThickness
            currentfilling.size.y = grid.moduleThickness
        }

        currentfilling.sector = tmpSector;
        if (tmpFasade)
            currentfilling.fasade = tmpFasade;

        return currentfilling;
    };

    checkLoopsCollision(secIndex: number, grid: GridModule) {
        this.scope.LOOPS.checkLoopsCollision(secIndex, grid)
    };

    selectCell(sec: number, cell: number | null = null, row: number | null = null, extra: number | null = null, item: number | null = 0) {
        // false и undefined нормализуем в null — FillingsView передаёт false для неприменимых уровней
        const n = (v: any): number | null => (v === false || v === undefined) ? null : v;
        this.scope.selectCell("fillings", <TSelectedCell>{ sec: n(sec), cell: n(cell), row: n(row), extra: n(extra), item: n(item) });
    };

    createFillingDataToCheck(
        product,
        currentSpace,
        grid: GridModule = this.scope.UM_STORE.getUMGrid(),
        isVerticalItem = false,
        isDrawer = false
    ) {
        if (!product || !currentSpace) return false

        let width = product.width
        let height = product.height
        let isSlidingDoors = grid.fasades?.length ? 100 : 0

        if (!isVerticalItem && (height > currentSpace.height || product.ACTUAL_DEPT > grid.depth - isSlidingDoors)) {
            return false
        }

        if (isVerticalItem) {
            height = currentSpace.height;
        } else {
            // Для нефасадного наполнения ширина всегда подгоняется под пространство
            width = currentSpace.width;
        }

        let tempFilling = {
            width,
            height,
            data: product,
            isVerticalItem,
            isDrawer,
            productGroupID: product.productGroupID,
        };

        return this.scope.RENDER_REF.checkPositionFillingToCreate(tempFilling);
    };

    syncDrawerFasade(secIndex: number, filling: any, grid: GridModule = this.scope.UM_STORE.getUMGrid()) {
        const fasade = filling?.fasade
        const list = grid.sections?.[secIndex]?.fasadesDrawers
        if (!fasade || !list) return

        const index = list.findIndex(item =>
            item.sec === fasade.sec &&
            item.cell === fasade.cell &&
            item.row === fasade.row &&
            item.extra === fasade.extra &&
            item.item === fasade.item
        )

        if (index !== -1) list[index] = fasade
    };

    clearFillings(
        {
            grid = this.scope.UM_STORE.getUMGrid(),
            secIndex = 0,
            cellIndex,
            rowIndex,
            extraIndex,
            reset = false,
        }:
            {
                grid: GridModule,
                secIndex: number,
                cellIndex: number | undefined,
                rowIndex: number | undefined,
                extraIndex: number | undefined,
                reset: boolean
            }
    ) {
        const sec = grid.sections[secIndex];
        const cell = sec.cells?.[cellIndex];
        const row = cell?.cellsRows?.[rowIndex];
        const extra = row?.extras?.[extraIndex];
        const curRow = extra || row || cell || sec;

        for (let id = curRow.fillings.length - 1; id >= 0; id--) {
            this.scope.FILLINGS.deleteFilling(secIndex, id, cellIndex, rowIndex, extraIndex, grid, false);
        }

        if (reset)
            this.scope.reset(grid)
    }

    getFillingObject({
        grid = this.scope.UM_STORE.getUMGrid(),
        sec = 0,
        cell,
        row,
        extra,
        item = 0,
    }:
        {
            grid: GridModule,
            sec: number,
            item: number,
            cell?: number | undefined,
            row?: number | undefined,
            extra?: number | undefined,
        }
    ) {
        const curSection = grid.sections[sec];
        if (!curSection) return null;
        const curCell = curSection.cells?.[cell];
        const curRow = curCell?.cellsRows?.[row];
        const curExtra = curRow?.extras?.[extra];

        const currentSpace = curExtra || curRow || curCell || curSection;

        return currentSpace?.fillings?.[item] ?? null;
    }

    changeFillingPositionX(
        conversation: {
            min: number,
            max: number
        },
        _value: number,
        key: number,
        secIndex: number,
        cellIndex: number | null = null,
        rowIndex: number | null = null,
        extraIndex: number | null = null,
        grid: GridModule = this.scope.UM_STORE.getUMGrid(),
    ) {
        this.scope.debounce("changeFillingPositionX", () => {
            let value = Math.min(+_value, conversation.max);
            value = Math.max(+value, conversation.min);

            const sec = grid.sections[secIndex];
            const currentColl = sec.cells?.[cellIndex];
            const currentRow = currentColl?.cellsRows?.[rowIndex];
            const currentExtra = currentRow?.extras?.[extraIndex];

            const current = currentExtra || currentRow || currentColl || sec;

            const currentfilling = current.fillings[key];

            this.selectCell(secIndex, cellIndex, rowIndex, extraIndex, currentfilling?.id ?? key);

            if (currentfilling?.isProfile?.isBottomHiTechProfile) {
                this.scope.callAlert("info", "Г-образный профиль нельзя перемещать!")
                return;
            }

            const prevValue = currentfilling.position.x; //Предыдущее значение
            const prevValueLeft = currentfilling.distances.left; //Предыдущее значение

            let delta = +value - prevValueLeft
            const newValue = prevValue + delta

            let tmpSector = currentfilling.sector
            delete currentfilling.sector

            const fillingData = JSON.parse(JSON.stringify(currentfilling));
            fillingData.position.x = newValue;
            fillingData.sector = tmpSector;

            const pixiSector = current.sector;

            // Проверяем коллизию
            const check = this.scope.SHAPE_ADJUSTER.checkToCollision(pixiSector, false, fillingData);

            if (check) {
                currentfilling.position.x = newValue;
                currentfilling.distances.left = +value
            } else {
                this.scope.callAlert("error", `Нельзя изменить позицию на ${+_value}`)
                currentfilling.position.x = prevValue;
                currentfilling.distances.left = prevValueLeft
            }

            currentfilling.sector = tmpSector;

            if (currentfilling.fasade)
                this.scope.FASADES.EXTERNAL_FASADES.calcDrawersFasades(secIndex, false, grid)

            this.scope.reset(grid)
        }, 1000)
    };

    calcMinMaxPositionY = (
        type: "min" | "max",
        filling: FillingObject,
        cell: GridSection | GridCell | GridCellsRow | GridRowExtra,
        grid: GridModule = this.scope.UM_STORE.getUMGrid()
    ) => {

        let result = 0
        switch (type) {
            case "max":
                result = cell.height - filling.height + (filling.isProfile ? grid.moduleThickness : 0)
                if (filling.fasade) {
                    result += (grid.moduleThickness - 2) - filling.fasade.height + filling.fasade.manufacturerOffset + filling.height
                    // distances.bottom измеряется от sectorBounds.y = moduleThickness, поэтому cell.position.y не добавляем
                    return result
                }
                break;
            case "min":
                result = 0 - (filling.isProfile ? grid.moduleThickness : 0)
                if (filling.fasade) {
                    result = result - (grid.moduleThickness - 2) + filling.fasade.manufacturerOffset
                    // distances.bottom измеряется от sectorBounds.y = moduleThickness, поэтому cell.position.y не добавляем
                    return result
                }
                break;
        }

        return cell.position.y + result
    }

    getAbsolutePositionY(
        filling: FillingObject,
        cell: GridSection | GridCell | GridCellsRow | GridRowExtra,
    ) {
        let resultPos = filling.position.y;

        if (filling.distances) {
            const grid = this.scope.UM_STORE.getUMGrid()
            resultPos = cell.position.y + filling.distances.bottom - (grid.horizont + (grid.noBottom ? 0 : grid.moduleThickness))
        }

        return resultPos >= 0 ? resultPos : 0;
    }

    getLocalPositionY(
        value: number,
        filling: FillingObject,
        cell: GridSection | GridCell | GridCellsRow | GridRowExtra,
        isMinMax: boolean = false,
    ) {
        const grid = this.scope.UM_STORE.getUMGrid()
        let result = value - cell.position.y

        if (!isMinMax) {
            result += (grid.horizont + (grid.noBottom ? 0 : grid.moduleThickness))
        }

        return result >= 0 ? result : 0;
    }

    changeFillingPositionY(
        conversation: {
            min: number,
            max: number
        },
        _value: number,
        key: number,
        secIndex: number,
        cellIndex: number | null = null,
        rowIndex: number | null = null,
        extraIndex: number | null = null,
        grid: GridModule = this.scope.UM_STORE.getUMGrid(),
        time: number = 1000,
    ) {
        this.scope.debounce("changeFillingPositionY", () => {
            let value = Math.min(+_value, conversation.max);
            value = Math.max(+value, conversation.min);

            const sec = grid.sections[secIndex];
            const currentColl = sec.cells?.[cellIndex];
            const currentRow = currentColl?.cellsRows?.[rowIndex];
            const currentExtra = currentRow?.extras?.[extraIndex];

            const current = currentExtra || currentRow || currentColl || sec;

            const currentfilling = current.fillings[key];

            // item = filling.id (1-based), а не key (0-based индекс массива)
            this.selectCell(secIndex, cellIndex, rowIndex, extraIndex, currentfilling?.id ?? key);

            if (currentfilling?.isProfile?.isBottomHiTechProfile) {
                this.scope.callAlert("info", `Г-образный профиль нельзя перемещать`)
                return;
            }

            const prevValue = currentfilling.position.y; //Предыдущее значение
            const prevValueBottom = currentfilling.distances.bottom; //Предыдущее значение

            let delta = +value - currentfilling.distances.bottom
            const newValue = prevValue - delta


            let tmpSector = currentfilling.sector

            let tmpFasade
            if (currentfilling.fasade) {
                tmpFasade = currentfilling.fasade
                delete currentfilling.fasade
            }

            delete currentfilling.sector

            const fillingData = JSON.parse(JSON.stringify(currentfilling));
            fillingData.position.y = newValue;
            fillingData.sector = tmpSector;

            currentfilling.sector = tmpSector;
            if (tmpFasade)
                currentfilling.fasade = tmpFasade;

            if (tmpFasade)
                fillingData.fasade = tmpFasade;

            const pixiSector = current.sector;

            const isOuterDrawerItem = isOuterDrawer(currentfilling?.productGroupID, this.OUTER_DRAWER_IDS)

            // Для внешних ящиков: исключаем внутренние ящики из проверки коллизии (как в setupDraggable)
            let originalShapes = null
            if (isOuterDrawerItem && pixiSector?.shapes) {
                originalShapes = pixiSector.shapes
                pixiSector.shapes = pixiSector.shapes.filter(
                    s => !isInnerDrawer(s.data?.productGroupID, this.INNER_DRAWER_IDS)
                )
            }

            // Проверяем коллизию
            const check = this.scope.SHAPE_ADJUSTER.checkToCollision(pixiSector, false, fillingData);

            if (originalShapes !== null) {
                pixiSector.shapes = originalShapes
            }

            if (check) {
                currentfilling.position.y = newValue;
                currentfilling.distances.bottom = +value

                // Для внешних ящиков: перемещаем только вложенные ящики этого конкретного внешнего
                if (isOuterDrawerItem) {
                    this.scope.FILLINGS.drawers.moveLinkedInnerDrawers(current, currentfilling, delta)
                }
            } else {
                let tmpPos = {
                    x: fillingData.position.x,
                    y: newValue,
                }
                fillingData.position.y = prevValue;
                fillingData.distances.bottom = prevValueBottom;
                let closestPos = this.scope.SHAPE_ADJUSTER.getClosestPosition(pixiSector, fillingData, tmpPos)

                this.scope.callAlert("error", `Нельзя изменить позицию на ${+_value}`)
                if (closestPos) {
                    currentfilling.position.y = closestPos.y;
                    currentfilling.distances.bottom = current.height - (currentfilling.position.y + currentfilling.height) + grid.horizont + (grid.noBottom ? 0 : grid.moduleThickness)

                    // Для внешних ящиков: перемещаем только вложенные ящики этого конкретного внешнего
                    if (isOuterDrawerItem) {
                        const actualDelta = prevValue - closestPos.y
                        this.scope.FILLINGS.drawers.moveLinkedInnerDrawers(current, currentfilling, actualDelta)
                    }
                } else {
                    currentfilling.position.y = prevValue;
                    currentfilling.distances.bottom = prevValueBottom;
                }
            }

            if (currentfilling.fasade) {
                currentfilling.fasade.position.y = grid.height - (currentfilling.position.y + currentfilling.height + currentfilling.fasade.manufacturerOffset)
                let drawerInfoId = grid.sections[secIndex].fasadesDrawers.findIndex(item => (
                    item.sec === fillingData.fasade.sec &&
                    item.cell === fillingData.fasade.cell &&
                    item.row === fillingData.fasade.row &&
                    item.extra === fillingData.fasade.extra &&
                    item.item === fillingData.fasade.item
                ))
                grid.sections[secIndex].fasadesDrawers[drawerInfoId] = currentfilling.fasade

                this.scope.FASADES.EXTERNAL_FASADES.calcDrawersFasades(secIndex, false, grid)
            } else {
                this.scope.LOOPS.checkLoopsCollision(secIndex, grid)
            }

            this.scope.reset(grid)
        }, time)
    };

    // После удаления секции decrementирует поле sec у всех fillings/fasadesDrawers,
    // которые ссылались на секции с индексом > deletedSecIndex
    updateSecAfterDelete(grid: GridModule, deletedSecIndex: number) {
        const patchSec = (obj: any) => {
            if (obj && obj.sec > deletedSecIndex) obj.sec--
        }
        const patchFillings = (fillings: FillingObject[] | undefined) => {
            fillings?.forEach(f => {
                patchSec(f)
                patchSec(f.fasade)
            })
        }

        grid.sections.forEach(section => {
            patchFillings(section.fillings)
            section.fasadesDrawers?.forEach(patchSec)
            section.cells?.forEach(cell => {
                patchFillings(cell.fillings)
                cell.cellsRows?.forEach(row => {
                    patchFillings(row.fillings)
                    row.extras?.forEach(extra => patchFillings(extra.fillings))
                })
            })
        })
    }

    cleanupOversizedFillings(grid: GridModule) {
        const maxWidth = UM_PARAMS.FILLINGS_MAX_WIDTH;
        const deleteOversized = (
            segment: any,
            secIndex: number,
            cellIndex: number | null,
            rowIndex: number | null,
            extraIndex: number | null,
        ) => {
            if (!segment?.fillings?.length || segment.width <= maxWidth) return;
            // Удаляем в обратном порядке чтобы не сбивать индексы
            for (let i = segment.fillings.length - 1; i >= 0; i--) {
                if (segment.fillings[i]?.type !== 'tsarga') {
                    this.scope.FILLINGS.deleteFilling(secIndex, i, cellIndex, rowIndex, extraIndex, grid, false);
                }
            }
        };
        grid.sections?.forEach((section, secIndex) => {
            deleteOversized(section, secIndex, null, null, null);
            section.cells?.forEach((cell, cellIndex) => {
                deleteOversized(cell, secIndex, cellIndex, null, null);
                cell.cellsRows?.forEach((row, rowIndex) => {
                    deleteOversized(row, secIndex, cellIndex, rowIndex, null);
                    row.extras?.forEach((extra, extraIndex) => {
                        deleteOversized(extra, secIndex, cellIndex, rowIndex, extraIndex);
                    });
                });
            });
        });
    }
}
