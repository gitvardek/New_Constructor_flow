//@ts-nocheck

import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import * as THREE from "three";
import {
    GridModule,
    GridCell,
    GridCellsRow,
    GridRowExtra,
} from "@/components/UMconstructor/types/UMtypes.ts";
import { createTsargaData, isTsargaCapableProduct, isMetalTsargaOptionActive, isTsargaEligibleWidth, applyTsargaToRow } from "@/components/UMconstructor/utils/Tsarga.ts";
import { getWardrobeShelfColorOptions, findFreeWardrobeShelfPositionY, getWardrobeSectionInstallableHeight, getWardrobeShelfDepth, getWardrobeShelfDragBounds } from "@/components/UMconstructor/utils/WardrobeSystem.ts";
import { WARDROBE_SHELF_PRODUCT_ID } from "@/components/UMconstructor/ts/createWardrobeGrid.ts";

export default class ShelvesManager {
    scope: UMconstructorClass

    constructor(scope: UMconstructorClass) {
        this.scope = scope
    }

    private get metalTsargaActive(): boolean {
        return isMetalTsargaOptionActive(this.scope.UM_STORE.getUMData());
    }

    private hasTsargaProduct(grid: GridModule): boolean {
        return isTsargaCapableProduct(grid.productID);
    }

    // У внешнего ящика ограничение задаёт его фасад: ячейка не может быть ниже верхней
    // точки фасада. Верх фасада относительно низа ячейки равен
    // distances.bottom - manufacturerOffset + fasade.height, а минимально допустимый
    // distances.bottom (при котором фасад стоит на 4 мм от нижнего горизонта) равен
    // manufacturerOffset - (moduleThickness - 4). После подстановки manufacturerOffset
    // сокращается и остаётся fasade.height - (moduleThickness - 4)

    getFillingMinHeight(filling: any, grid: GridModule = this.scope.UM_STORE.getUMGrid()): number {
        if (filling?.fasade) {
            // Верхняя точка фасада относительно низа ячейки
            const fasadeTop = (filling.fasade.height ?? 0) - (grid.moduleThickness - 4)

            // Фасад заходит под полку сверху, поэтому её толщина в высоту ячейки
            // не входит — минус толщина полки и обратно технологический зазор 4 мм
            return fasadeTop - grid.moduleThickness + 4
        }

        return (filling?.height ?? 0) + Math.max(filling?.distances?.bottom ?? 0, 0)
    };

    // Минимальная высота ячейки — по самому требовательному наполнению
    getCellMinHeight(cell: any, grid: GridModule = this.scope.UM_STORE.getUMGrid()): number {
        const MIN = this.scope.CONST.MIN_SECTION_HEIGHT
        const fillings = cell?.fillings ?? []

        if (!fillings.length) return MIN

        const needed = Math.max(...fillings.map((filling: any) =>
            this.getFillingMinHeight(filling, grid)
        ))

        return Math.max(needed, MIN)
    };

    // ==== Гардеробная система (WARDROBE) — временно, черновик ====
    // Настройки полки сектора: тип (прямая/наклонная), вид (ЛДСП/стекло) и
    // материал (только для ЛДСП, из _WARDROBE_SYSTEM[...].shelf[...].fasade,
    // см. WardrobeSystem.getWardrobeShelfColorOptions). Полностью отдельно от
    // addCell/updateCellHeight/... ниже — те работают с cells box-UM,
    // которых у гардеробной системы нет вовсе.
    private findWardrobeShelf(grid: GridModule, secIndex: number, shelfId: number) {
        return grid.sections[secIndex]?.wardrobeShelves?.find((s) => s.id === shelfId);
    }

    // Тип (прямая/наклонная) и вид (ЛДСП/стекло) задаются один раз при
    // добавлении полки (см. addWardrobeShelf, вкладка "Вставка") и больше не
    // редактируются — во вкладке "Конфигурация" у уже установленной полки
    // доступны только материал (для ЛДСП) и положение по Y, см. чат.
    updateWardrobeShelfColor(grid: GridModule, secIndex: number, shelfId: number, colorId: number) {
        const shelf = this.findWardrobeShelf(grid, secIndex, shelfId);
        if (!shelf) return;

        shelf.colorId = colorId;
        this.scope.reset(grid);
    }

    // Положение полки по вертикали — мм от НИЗА сектора до НИЖНЕЙ грани
    // полки ("высота установки от пола"), конвенция подтверждена рендером
    // в SceneBuilder.createWardrobeShelf. Дебаунс — тот же паттерн, что и у
    // updateCellHeight (частый ввод через инпут).
    //
    // Границы — та же getWardrobeShelfDragBounds, что уже считает лимиты при
    // перетаскивании мышью (баг, найден пользователем: раньше здесь была
    // отдельная, более простая формула floorGap/ceilingHeight-shelfHeight,
    // не учитывавшая КОЛЛИЗИИ С ДРУГИМИ ПОЛКАМИ сектора — инпут позволял
    // увести полку ниже соседней, вплотную к полу, хотя перетаскивание мышью
    // такое уже не разрешало). Единый источник правды для обоих способов
    // задать positionY — драг и числовой ввод.
    updateWardrobeShelfPositionY(grid: GridModule, secIndex: number, shelfId: number, value: number) {
        this.scope.debounce("updateWardrobeShelfPositionY", () => {
            const shelves = grid.sections[secIndex]?.wardrobeShelves;
            const shelf = shelves?.find((s) => s.id === shelfId);
            if (!shelf) return;

            const depthMm = getWardrobeShelfDepth(grid);
            const ceilingHeight = getWardrobeSectionInstallableHeight(grid, secIndex);
            const { minY, maxY } = getWardrobeShelfDragBounds(shelves, shelfId, depthMm, ceilingHeight, grid.productID);

            // Округление до целых мм — minY/maxY считаются с тригонометрией
            // (наклонная полка) и почти всегда дробные, positionY должен
            // оставаться целым для MainInput ("Положение по Y" в
            // WardrobeFillingsView.vue), см. чат.
            shelf.positionY = Math.round(Math.min(Math.max(value, minY), maxY));
            this.scope.reset(grid);
        }, 500);
    }

    // "Вставка" — добавляет count полок заданного типа/вида в сектор
    // (WardrobeInsertView.vue); единственный способ получить полку, новые
    // секторы создаются пустыми. При material==='glass' colorId не ставится
    // (материал для стекла не выбирается), иначе берётся явный colorId из
    // панели, а без него — первый доступный из каталога.
    //
    // Условия: (1) полка не накладывается на уже установленные; (2) зазор
    // между двумя ПРЯМЫМИ полками — WARDROBE_SHELF_MIN_GAP_FLAT (52мм);
    // (3-5) наклонная занимает по вертикали больше (проекция повёрнутого
    // прямоугольника) и требует большего зазора от ЛЮБОГО соседа
    // (findFreeWardrobeShelfPositionY/getWardrobeShelfMinGap); (6) установка
    // ограничена "монтажной" высотой сектора — МИНИМУМОМ высот двух его
    // профилей, а не section.height/grid.height (те равны МАКСИМУМУ по всем
    // профилям модуля, см. getWardrobeSectionInstallableHeight). Если места
    // нет — вызов прерывается предупреждением, уже добавленные остаются.
    addWardrobeShelf(
        grid: GridModule,
        secIndex: number,
        type: 'flat' | 'angled',
        material: 'ldsp' | 'glass' = 'ldsp',
        count: number = 1,
        reset: boolean = true,
        colorId?: number,
    ) {
        const section = grid.sections[secIndex];
        if (!section) return;

        if (!section.wardrobeShelves) section.wardrobeShelves = [];
        const shelves = section.wardrobeShelves;

        const resolvedColorId = material === 'ldsp'
            ? (colorId ?? getWardrobeShelfColorOptions(grid.productID, WARDROBE_SHELF_PRODUCT_ID)[0]?.id)
            : undefined;

        // Полки крепятся к ЦЕНТРУ профиля, не к переднему краю корпуса —
        // поэтому их длина считается от ТЕКУЩЕЙ grid.depth плюс запас
        // крепления (getWardrobeShelfDepth), а не от grid.depth напрямую и
        // не от потолка getWardrobeProfileMaxDepth (тот не реагирует на
        // правку самого поля "Глубина" — баг, найден пользователем).
        const depthMm = getWardrobeShelfDepth(grid);
        const ceilingHeight = getWardrobeSectionInstallableHeight(grid, secIndex);

        for (let i = 0; i < count; i++) {
            const positionY = findFreeWardrobeShelfPositionY(shelves, { type, colorId: resolvedColorId, material }, depthMm, ceilingHeight, grid.productID);

            if (positionY === null) {
                this.scope.callAlert("warning", "В секторе не осталось места для новой полки!");
                break;
            }

            const newId = shelves.reduce((max, s) => Math.max(max, s.id), 0) + 1;

            shelves.push({
                id: newId,
                productId: WARDROBE_SHELF_PRODUCT_ID,
                type,
                material,
                colorId: resolvedColorId,
                positionY,
            });
        }

        if (reset) this.scope.reset(grid);
    }

    // "Вставка" — кнопка "Применить ко всем" рядом с выбором материала
    // устанавливаемых полок: применяет colorId ко ВСЕМ уже установленным
    // ЛДСП-полкам модуля (во всех секторах, не только в выбранном) — полки
    // material==='glass' не трогает (материал для стекла не выбирается).
    applyMaterialToAllShelves(grid: GridModule, colorId: number, reset: boolean = true) {
        grid.sections.forEach((section) => {
            section.wardrobeShelves?.forEach((shelf) => {
                if (shelf.material === 'ldsp') shelf.colorId = colorId;
            });
        });

        if (reset) this.scope.reset(grid);
    }

    // "Конфигурация" — удаляет уже установленную полку.
    deleteWardrobeShelf(grid: GridModule, secIndex: number, shelfId: number, reset: boolean = true) {
        const shelves = grid.sections[secIndex]?.wardrobeShelves;
        if (!shelves) return;

        const index = shelves.findIndex((s) => s.id === shelfId);
        if (index === -1) return;

        shelves.splice(index, 1);

        if (reset) this.scope.reset(grid);
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
            if (this.hasTsargaProduct(grid) && isTsargaEligibleWidth(newCell.width)) {
                newCell.tsarga = createTsargaData(cell.width, cell.position.x);
            }

            section.cells.splice(cellIndex || 0, 0, newCell);
        }

        // Восстанавливаем tsarga базовой ячейки (только для продуктов с царгой)
        if (this.hasTsargaProduct(grid) && isTsargaEligibleWidth(cell.width)) {
            cell.tsarga = createTsargaData(cell.width, cell.position.x);
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

                // Расчёт сверху вниз
                // let nextCell = next || prev
                // let nextIndex = next ? cellIndex + 1 : cellIndex - 1 

                // Расчёт снизу вверх
                let nextCell = prev || next
                let nextIndex = prev ? cellIndex - 1 : cellIndex + 1

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
        const productID = this.scope.UM_STORE.getUMGrid()?.productID;
        if (!isTsargaCapableProduct(productID)) {
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
                    applyTsargaToRow(row, isCellRoof, metalTsarga);
                });
            } else {
                applyTsargaToRow(cell, isCellRoof, metalTsarga);
            }
        });

        if (!metalTsarga && section.cells.length === 0) {
            if (isTsargaEligibleWidth(section.width)) {
                section.tsarga = createTsargaData(section.width, section.position.x);
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


