// Строит PIXI-сцену 2D-редактора из дерева GridModule: renderGrid и все
// create*-методы (Module/Sector/Loop/Handle/Filling/Tsarga/SectionNum/
// VerticalCut/HorozontalCut), плюс checkPositionFillingToCreate и clearRender.
// Вынесено из Render2D.vue (Фаза 2c рефакторинга, см.
// C:\Users\MG_GO.MG\.claude\plans\iterative-launching-lerdorf.md).
//
// Общее состояние читается через this.ctx (RenderContext) вместо замыкания
// над переменными компонента — тот же контекст у SelectionHighlighter/
// ExternalSizeAdjuster/DividerDragEngine, так что все движки видят одни
// PIXI-контейнеры/массивы/реактивное состояние.
//
// selectCell/checkSectorsCollision/onVerticalDragStart/onHorizontalDragStart
// тоже идут через ctx: на момент фазы 2c это ещё локальные функции
// Render2D.vue (переедут на 2d/2f), но точка вызова здесь не изменится.
//
// Гардеробная сетка рисуется не здесь: renderGrid() для moduleKind ===
// 'wardrobe' уходит в wardrobe/render/WardrobeSceneBuilder.ts (this.wardrobe).
//@ts-nocheck

import { Container, Graphics, Text } from "pixi.js";
import { Shape, Section } from "./../PixiMethods.ts";
import { UM_DRAWERS_IDS } from "./../Const.ts";
import * as THREE from "three";
import { LOOPSIDE, TSelectedCell } from "./../../types/UMtypes.ts";
import RenderContext from "./RenderContext.ts";
import WardrobeSceneBuilder from "@/components/UMconstructor/wardrobe/render/WardrobeSceneBuilder.ts";
import { createTsargaData, isTsargaEligibleWidth } from "./../Tsarga.ts";
import { WARDROBE_CANVAS_PADDING_PX } from "@/Application/F-wardrobeData.ts";


const positionMap = {
    0: { col: -1, row: 1, rotation: 0 }, // лево-верх
    1: { col: 0, row: 1, rotation: Math.PI / 2 }, // центр-верх
    2: { col: 1, row: 1, rotation: 0 }, // право-верх
    3: { col: -1, row: 0, rotation: 0 }, // лево-центр
    4: { col: 0, row: 0, rotation: Math.PI / 2 }, // центр
    5: { col: 1, row: 0, rotation: 0 }, // право-центр
    6: { col: -1, row: -1, rotation: 0 }, // лево-низ
    7: { col: 0, row: -1, rotation: Math.PI / 2 }, // центр-низ
    8: { col: 1, row: -1, rotation: 0 }, // право-низ
};

export default class SceneBuilder {
    ctx: RenderContext
    wardrobe: WardrobeSceneBuilder

    constructor(ctx: RenderContext) {
        this.ctx = ctx
        this.wardrobe = new WardrobeSceneBuilder(ctx)
    }

    getHandlesPosition(
        posNumber: number,
        fasadeMesh: {
            position: THREE.Vector2;
            size: { width: number; height: number };
        },
        handleMesh: {
            size: THREE.Vector2;
        },
    ) {
        const trueSize = fasadeMesh.size;
        if (!trueSize) {
            console.warn("fasadeMesh.userData.trueSize отсутствует");
            return;
        }
        const { width, height } = trueSize;

        // Получаем размеры ручки (если их нет — вычисляем)
        let handlSize = handleMesh.size;

        const W = handlSize.x;
        const H = handlSize.y;
        const offset = this.ctx.mode.value === "fasades" ? 45 : 25; // мм

        const cfg = positionMap[posNumber];
        if (!cfg) {
            console.warn("Неверный action для ручки:", posNumber);
            return;
        }

        const halfWidth = width; // 2;
        const halfHeight = height; // 2;

        // Проекция размеров ручки на оси X/Y после поворота (полная ширина/высота AABB)
        const theta = cfg.rotation;
        const projW = Math.abs(W * Math.cos(theta)) + Math.abs(H * Math.sin(theta));
        const projH = Math.abs(W * Math.sin(theta)) + Math.abs(H * Math.cos(theta));
        const halfExtX = projW; // 2;
        const halfExtY = projH; // 2;

        // Вычисляем координаты центра ручки с учётом отступа и проекции (чтобы край ручки был не ближе offset)
        let posX = 0;
        if (cfg.col === -1) posX = offset + halfExtX;
        else if (cfg.col === 1) posX = halfWidth - offset - halfExtX;
        else posX = width / 2 + halfExtX / 2;

        let posY = 0;
        if (cfg.row === -1) posY = height - offset - halfExtY;
        else if (cfg.row === 1) posY = offset + halfExtY;
        else posY = height / 2 - halfExtY / 2;

        return {
            position: new THREE.Vector2(
                posX + fasadeMesh.position.x,
                posY + (fasadeMesh.position.y - height),
            ),
            rotation: theta,
        };
    }

    renderGrid(_moduleGrid?) {
        const ctx = this.ctx
        if (!ctx.appReady) return;
        this.clearRender();

        const moduleGrid = _moduleGrid || ctx.props.module;

        // Отступ канваса для гардеробной системы (уточнение пользователя,
        // см. WARDROBE_CANVAS_PADDING_PX) — модуль стартует не с (0,0), а со
        // сдвигом на отступ, канвас соответственно увеличен НА ТУ ЖЕ величину
        // в Render2D.vue::updateTotalSize (там же подробный комментарий про
        // выбор чистого смещения вместо масштаба). box-UM (moduleKind !==
        // 'wardrobe') — отступ 0, поведение не меняется.
        const isWardrobe = moduleGrid.moduleKind === 'wardrobe'
        let xOffset = isWardrobe ? WARDROBE_CANVAS_PADDING_PX : 0;
        let yOffset = isWardrobe ? WARDROBE_CANVAS_PADDING_PX : 0;

        if (_moduleGrid) {
            ctx.setModuleGrid(_moduleGrid);
        }

        if (ctx.mode.value === "fasades") {
            ctx.fasadesContainer.interactiveChildren = true;
        } else {
            ctx.fasadesContainer.interactiveChildren = false;
        }

        let ModulepxWidth = ctx.getPixelWidth(moduleGrid.width);
        let ModulepxHeight = ctx.getPixelHeight(moduleGrid.height);
        moduleGrid.xOffset = xOffset;
        moduleGrid.yOffset = yOffset;

        let moduleSector = this.createModule({
            x: xOffset,
            y: yOffset,
            width: ModulepxWidth,
            height: ModulepxHeight,
            moduleData: moduleGrid,
        });

        xOffset = ctx.getPixelWidth(moduleGrid.leftWallThickness);

        // Гардеробная система (временно, черновик) — секции без стенок,
        // весь box-UM-специфичный блок ниже (cells/fasades/loops/handles/
        // тсарга) не применим (например section.fasades для гардеробной
        // секции не существует). Отдельная, изолированная отрисовка.
        if (isWardrobe) {
            this.wardrobe.renderWardrobeGrid(moduleGrid, moduleSector);
            this.flushSceneContainers();
            return;
        }

        moduleGrid?.sections.forEach((section, sectionIndex, _sections) => {
            const pxWidth = ctx.getPixelWidth(section.width);

            yOffset = ctx.getPixelHeight(moduleGrid.moduleThickness);

            let tmp_array_sectors = [];

            section.xOffset = xOffset;
            section.yOffset = yOffset;

            if (section.cells.length > 0) {
                section.cells
                    .slice()
                    .sort((a, b) => b.position.y - a.position.y)
                    .forEach((cell, cellIndex, section) => {
                        const pxHeight = ctx.getPixelHeight(cell.height);
                        cell.xOffset = xOffset;
                        cell.yOffset = yOffset;

                        if (cell.cellsRows?.length > 0) {
                            let rowxOffset = xOffset;
                            cell.cellsRows.forEach((cellRow, cellRowIndex, _cell) => {
                                const RowpxWidth = ctx.getPixelWidth(cellRow.width);
                                cellRow.xOffset = rowxOffset;
                                cellRow.yOffset = yOffset;

                                if (cellRow.extras?.length > 0) {
                                    let rowyOffset = yOffset;
                                    cellRow.extras
                                        .slice()
                                        .sort((a, b) => b.position.y - a.position.y)
                                        .forEach((extra, _sortedIndex, _extras) => {
                                            // Оригинальный индекс нужен чтобы PIXI click handler и Vue v-for использовали один и тот же индекс
                                            const extraIndex = cellRow.extras.indexOf(extra);
                                            const RowpxHeight = ctx.getPixelHeight(extra.height);

                                            extra.xOffset = rowxOffset;
                                            extra.yOffset = rowyOffset;

                                            let sector = this.createSector({
                                                x: rowxOffset,
                                                y: rowyOffset,
                                                width: RowpxWidth,
                                                height: RowpxHeight,
                                                sectionIndex,
                                                cellIndex,
                                                cellData: extra,
                                                section: _extras,
                                                rowIndex: cellRowIndex,
                                                row: cellRow,
                                                extraIndex,
                                                _sector: moduleSector,
                                                gridType: "module",
                                            });

                                            tmp_array_sectors.push(sector);

                                            //Добавляем отступ по вертикали

                                            rowyOffset +=
                                                RowpxHeight + ctx.getPixelHeight(ctx.UMconstructor?.value?.getShelfThickness(extra, moduleGrid));
                                        });

                                    //Добавляем отступ по вертикали
                                    const colBond = ctx.shapeAdjuster.createColumnBounds(
                                        cellRow.extras,
                                    );

                                    // Sector row-а = первая extra, чтобы toggleSectionColor мог подсветить ряд при выборе без extra
                                    cellRow.sector = cellRow.extras[0]?.sector;

                                    // Создаём ограничения для секций по ширине
                                    cellRow.shapesBond = colBond;
                                    cellRow.maxX = ctx.shapeAdjuster.convertToTen(
                                        ctx.getMmWidth(colBond.maxX),
                                    );
                                    cellRow.minX = ctx.shapeAdjuster.convertToTen(
                                        ctx.getMmWidth(colBond.minX),
                                    );
                                    cellRow.maxY = ctx.shapeAdjuster.convertToTen(
                                        ctx.getMmHeight(colBond.maxY),
                                    );
                                    cellRow.minY = ctx.shapeAdjuster.convertToTen(
                                        ctx.getMmHeight(colBond.minY),
                                    );

                                    let { maxY, minX, maxX, minY } = cellRow;

                                    if (minY > 0) {
                                        cellRow.minY = Math.max(
                                            0,
                                            moduleGrid.height - minY - cellRow.position.y,
                                        );
                                    }
                                    if (maxY > 0) {
                                        cellRow.maxY = Math.max(
                                            0,
                                            cellRow.position.y +
                                            cellRow.height -
                                            (moduleGrid.height - maxY),
                                        );
                                    }
                                    if (minX > 0) {
                                        cellRow.minX = Math.max(
                                            0,
                                            minX - (cellRow.position.x - cellRow.width / 2),
                                        );
                                    }
                                    if (maxX > 0) {
                                        cellRow.maxX = Math.max(
                                            0,
                                            cellRow.position.x + cellRow.width / 2 - maxX,
                                        );
                                    }
                                } else {
                                    let sector = this.createSector({
                                        x: rowxOffset,
                                        y: yOffset,
                                        width: RowpxWidth,
                                        height: pxHeight,
                                        sectionIndex,
                                        cellIndex,
                                        cellData: cellRow,
                                        section: _cell,
                                        rowIndex: cellRowIndex,
                                        row: cellRow,
                                        _sector: moduleSector,
                                        gridType: "module",
                                    });

                                    tmp_array_sectors.push(sector);
                                }

                                rowxOffset +=
                                    RowpxWidth + ctx.getPixelWidth(moduleGrid.moduleThickness);
                            });

                            //Добавляем отступ по вертикали
                            const colBond = ctx.shapeAdjuster.createColumnBounds(cell.cellsRows);

                            // Создаём ограничения для секций по ширине
                            cell.shapesBond = colBond;
                            cell.maxX = ctx.shapeAdjuster.convertToTen(ctx.getMmWidth(colBond.maxX));
                            cell.minX = ctx.shapeAdjuster.convertToTen(ctx.getMmWidth(colBond.minX));
                            cell.maxY = ctx.shapeAdjuster.convertToTen(ctx.getMmHeight(colBond.maxY));
                            cell.minY = ctx.shapeAdjuster.convertToTen(ctx.getMmHeight(colBond.minY));

                            let { maxY, minX, maxX, minY } = cell;

                            if (minY > 0) {
                                cell.minY = Math.max(
                                    0,
                                    moduleGrid.height - minY - cell.position.y,
                                );
                            }
                            if (maxY > 0) {
                                cell.maxY = Math.max(
                                    0,
                                    cell.position.y + cell.height - (moduleGrid.height - maxY),
                                );
                            }
                            if (minX > 0) {
                                cell.minX = Math.max(
                                    0,
                                    minX - (cell.position.x - cell.width / 2),
                                );
                            }
                            if (maxX > 0) {
                                cell.maxX = Math.max(0, cell.position.x + cell.width / 2 - maxX);
                            }
                        } else {
                            let sector = this.createSector({
                                x: xOffset,
                                y: yOffset,
                                width: pxWidth,
                                height: pxHeight,
                                sectionIndex,
                                cellIndex,
                                cellData: cell,
                                section,
                                _sector: moduleSector,
                                gridType: "module",
                            });

                            tmp_array_sectors.push(sector);
                        }

                        // Добавляем отступ по вертикали — промежуток под ячейкой занимает её полка
                        this.drawGlassShelf(cell, xOffset, yOffset + pxHeight, pxWidth);
                        yOffset += pxHeight + ctx.getPixelHeight(ctx.UMconstructor?.value?.getShelfThickness(cell, ctx.props.module));
                    });

                const colBond = ctx.shapeAdjuster.createColumnBounds(section.cells);

                // Создаём ограничения для секций по ширине
                section.shapesBond = colBond;
                section.maxX = ctx.shapeAdjuster.convertToTen(ctx.getMmWidth(colBond.maxX));
                section.minX = ctx.shapeAdjuster.convertToTen(ctx.getMmWidth(colBond.minX));
                section.maxY = ctx.shapeAdjuster.convertToTen(ctx.getMmHeight(colBond.maxY));
                section.minY = ctx.shapeAdjuster.convertToTen(ctx.getMmHeight(colBond.minY));

                let { maxY, minX, maxX, minY } = section;

                if (minY > 0) {
                    section.minY = Math.max(
                        0,
                        moduleGrid.height - minY - section.position.y,
                    );
                }
                if (maxY > 0) {
                    section.maxY = Math.max(
                        0,
                        section.position.y + section.height - (moduleGrid.height - maxY),
                    );
                }
                if (minX > 0) {
                    section.minX = Math.max(
                        0,
                        minX - (section.position.x - section.width / 2),
                    );
                }
                if (maxX > 0) {
                    section.maxX = Math.max(
                        0,
                        section.position.x + section.width / 2 - maxX,
                    );
                }
            } else {
                const pxHeight = ctx.getPixelHeight(section.height);
                // Отрисовываем секцию

                if (ctx.hasTsargaProduct.value && !ctx.hasModuleTsarga.value && isTsargaEligibleWidth(section.width)) {
                    section.tsarga = createTsargaData(section.width, section.position.x);
                } else {
                    delete section.tsarga;
                }

                let sector = this.createSector({
                    x: xOffset,
                    y: yOffset,
                    width: pxWidth,
                    height: pxHeight,
                    sectionIndex,
                    cellIndex: null,
                    cellData: section,
                    section: _sections,
                    _sector: moduleSector,
                    gridType: "module",
                });
                tmp_array_sectors.push(sector);

                //Добавляем отступ по вертикали
                yOffset += pxHeight;
            }

            //Добавляем отступ по горизонтали
            xOffset += pxWidth + ctx.getPixelWidth(moduleGrid.moduleThickness);

            if (section.loops?.length) {
                section.loops.forEach((door, doorIndex) => {
                    door.forEach((loop, loopIndex) => {
                        let tmpLoopData = { ...loop };

                        const isTopLoops = LOOPSIDE["top"] === tmpLoopData.side;
                        const isNoneLoops = LOOPSIDE["none"] === tmpLoopData.side;

                        if (isNoneLoops) return;
                        if (!isTopLoops) {
                            delete tmpLoopData.coords;
                            delete tmpLoopData.errors;
                        }

                        let loopXOffset = ctx.getPixelWidth(tmpLoopData.positionX);
                        const pxWidth = ctx.getPixelWidth(tmpLoopData.width);
                        const pxHeight = ctx.getPixelHeight(tmpLoopData.height);

                        tmpLoopData.xOffset = loopXOffset;

                        loop.coords.forEach((pos, posIndex) => {
                            let loopSector;
                            let tmp_top_loop_pos;

                            if (isTopLoops) {
                                tmp_top_loop_pos =
                                    pos[0] +
                                    tmpLoopData.height / 2 -
                                    (!ctx.currentModule.value.noBottom
                                        ? 0
                                        : ctx.currentModule.value.moduleThickness);
                            } else {
                                tmp_top_loop_pos =
                                    pos +
                                    tmpLoopData.height / 2 -
                                    (!ctx.currentModule.value.noBottom
                                        ? 0
                                        : ctx.currentModule.value.moduleThickness);
                            }

                            let tmp_y_pos = ctx.currentModule.value.height - tmp_top_loop_pos;

                            tmpLoopData.yOffset = ctx.getPixelHeight(tmp_y_pos);

                            // Отрисовываем секцию
                            if (isTopLoops) {
                                loopSector = this.createLoop({
                                    x: ctx.getPixelWidth(pos[1]),
                                    y: tmpLoopData.yOffset,
                                    width: pxWidth,
                                    height: pxHeight,
                                    loopData: {
                                        ...tmpLoopData,
                                        error: loop.errors?.includes(posIndex),
                                        position: {
                                            x: ctx.getMmWidth(pos[1]),
                                            y: tmp_y_pos,
                                        },
                                    },
                                });
                            } else {
                                loopSector = this.createLoop({
                                    x: tmpLoopData.xOffset,
                                    y: tmpLoopData.yOffset,
                                    width: pxWidth,
                                    height: pxHeight,
                                    loopData: {
                                        ...tmpLoopData,
                                        error: loop.errors?.includes(posIndex),
                                        position: {
                                            x: ctx.getMmWidth(tmpLoopData.xOffset),
                                            y: tmp_y_pos,
                                        },
                                    },
                                });
                            }

                            for (let i = 0; i < tmp_array_sectors.length; i++) {
                                let sector = tmp_array_sectors[i];

                                if (ctx.checkSectorsCollision(loopSector.sectorData, sector)) {
                                    let tempShape = new Shape({
                                        type: "loop",
                                        sector,
                                        data: tmpLoopData,
                                        position: {
                                            x: loopSector.sectorData.position.x,
                                            y: loopSector.sectorData.position.y,
                                        },
                                        getMmWidth: ctx.getMmWidth,
                                        getMmHeight: ctx.getMmHeight,
                                        getPixelHeight: ctx.getPixelHeight,
                                        getPixelWidth: ctx.getPixelWidth,
                                        calcDrawersFasades: ctx.calcDrawersFasades,
                                        checkLoopsCollision: ctx.checkLoopsCollision,
                                        store: ctx.UMconstructor?.value?.UM_STORE,
                                    });

                                    sector.shapes.push(tempShape);
                                    break;
                                }
                            }
                        });
                    });
                });
            }

            if (!ctx.currentModule.value?.isSlidingDoors) {
                section.fasades.forEach((column, colIndex) => {
                    if (!column.length) return;

                    const pxWidth = ctx.getPixelWidth(column[0].width);
                    let fasadeXOffset = ctx.getPixelWidth(column[0].position.x);

                    column.forEach((row, rowIndex, col) => {
                        let fasadeYOffset = ctx.getPixelHeight(
                            ctx.currentModule.value.height - row.position.y - row.height,
                        );

                        const pxHeight = ctx.getPixelHeight(row.height);
                        row.xOffset = fasadeXOffset;
                        row.yOffset = fasadeYOffset;

                        // Отрисовываем секцию

                        this.createSector({
                            x: fasadeXOffset,
                            y: fasadeYOffset,
                            width: pxWidth,
                            height: pxHeight,
                            sectionIndex,
                            cellIndex: colIndex,
                            rowIndex: row.id - 1,
                            cellData: row,
                            section: col,
                            _sector: moduleSector,
                            gridType: "fasades",
                            opacity: ctx.mode.value === "fasades" ? 0.8 : 0.25,
                        });

                        if (
                            !row.error &&
                            row.material.HANDLES?.id !== 69920 &&
                            row.material.HANDLES?.position
                        ) {
                            let handle = ctx.APP.CATALOG.PRODUCTS[row.material.HANDLES.id];
                            let handle_size = new THREE.Vector2(15, 100);
                            let handle_pos = this.getHandlesPosition(
                                row.material.HANDLES.position,
                                {
                                    position: new THREE.Vector2(
                                        row.position.x,
                                        ctx.currentModule.value.height - row.position.y,
                                    ),
                                    size: { width: row.width, height: row.height },
                                },
                                {
                                    size: handle_size,
                                },
                            );

                            handle_size = handle_size.rotateAround(
                                new THREE.Vector2(),
                                handle_pos.rotation,
                            );

                            this.createHandle({
                                x: ctx.getPixelWidth(handle_pos.position.x),
                                y: ctx.getPixelHeight(handle_pos.position.y),
                                width: ctx.getPixelWidth(handle_size.x),
                                height: ctx.getPixelHeight(handle_size.y),
                                handleData: {
                                    ...handle,
                                    position: handle_pos.position,
                                },
                                opacity: 0.9,
                            });
                        }
                    });
                    //Добавляем отступ по горизонтали
                    fasadeXOffset += pxWidth + ctx.getPixelWidth(4);
                });

                let fasadeXOffset = ctx.getPixelWidth(
                    section.fasadesDrawers?.[0]?.position.x,
                );
                section.fasadesDrawers?.forEach((row, rowIndex, col) => {
                    const pxWidth = ctx.getPixelWidth(row.width);
                    let fasadeYOffset = ctx.getPixelHeight(
                        ctx.currentModule.value.height - row.position.y - row.height,
                    );

                    const pxHeight = ctx.getPixelHeight(row.height);
                    row.xOffset = fasadeXOffset;
                    row.yOffset = fasadeYOffset;

                    // Отрисовываем секцию

                    this.createSector({
                        x: fasadeXOffset,
                        y: fasadeYOffset,
                        width: pxWidth,
                        height: pxHeight,
                        sectionIndex,
                        cellIndex: 0,
                        rowIndex: row.id - 1,
                        cellData: row,
                        section: col,
                        _sector: moduleSector,
                        gridType: "fasades",
                        opacity: ctx.mode.value === "fasades" ? 0.8 : 0.25,
                    });

                    if (
                        !row.error &&
                        row.material.HANDLES?.id !== 69920 &&
                        row.material.HANDLES?.position
                    ) {
                        let handle = ctx.APP.CATALOG.PRODUCTS[row.material.HANDLES.id];
                        let handle_size = new THREE.Vector2(15, 100);
                        let handle_pos = this.getHandlesPosition(
                            row.material.HANDLES.position,
                            {
                                position: new THREE.Vector2(
                                    row.position.x,
                                    ctx.currentModule.value.height - row.position.y,
                                ),
                                size: { width: row.width, height: row.height },
                            },
                            {
                                size: handle_size,
                            },
                        );

                        handle_size = handle_size.rotateAround(
                            new THREE.Vector2(),
                            handle_pos.rotation,
                        );

                        this.createHandle({
                            x: ctx.getPixelWidth(handle_pos.position.x),
                            y: ctx.getPixelHeight(handle_pos.position.y),
                            width: ctx.getPixelWidth(handle_size.x),
                            height: ctx.getPixelHeight(handle_size.y),
                            handleData: {
                                ...handle,
                                position: handle_pos.position,
                            },
                            opacity: 0.9,
                        });
                    }
                });
            }
        });

        if (ctx.currentModule.value?.isSlidingDoors) {
            ctx.currentModule.value?.fasades?.forEach((column, colIndex) => {
                const pxWidth = ctx.getPixelWidth(column[0].width);
                let fasadeXOffset = ctx.getPixelWidth(column[0].position.x);

                column.forEach((row, rowIndex, col) => {
                    let fasadeYOffset = ctx.getPixelHeight(
                        ctx.currentModule.value.height - row.position.y - row.height,
                    );

                    const pxHeight = ctx.getPixelHeight(row.height);
                    row.xOffset = fasadeXOffset;
                    row.yOffset = fasadeYOffset;

                    // Отрисовываем секцию

                    this.createSector({
                        x: fasadeXOffset,
                        y: fasadeYOffset,
                        width: pxWidth,
                        height: pxHeight,
                        sectionIndex: null,
                        cellIndex: colIndex,
                        rowIndex: column.length > 1 ? row.id - 1 : null,
                        cellData: row,
                        section: col,
                        _sector: moduleSector,
                        gridType: "fasades",
                        opacity: ctx.mode.value === "fasades" ? 0.8 : 0.25,
                    });
                });
                //Добавляем отступ по горизонтали
                fasadeXOffset += pxWidth + ctx.getPixelWidth(4);
            });
        }

        this.flushSceneContainers();
    }

    // Переносит все отслеживаемые массивы (ctx.sections/deviders/loops/...) в
    // реальные PIXI-контейнеры сцены. Вынесено в отдельный метод, т.к. нужно
    // вызывать из двух мест в renderGrid — из box-UM пути (в конце) и из
    // ветки гардеробной системы (renderWardrobeGrid не проходит через
    // остальной box-UM код ниже, но так же должна попасть на экран).
    private flushSceneContainers() {
        const ctx = this.ctx

        ctx.sections.forEach((elem) => {
            ctx.app.stage.addChildAt(elem, 0);
        });

        ctx.deviders.forEach((elem) => {
            ctx.sectionsContainer.addChild(elem);
        });

        ctx.loops.forEach((elem) => {
            ctx.loopsContainer.addChild(elem);
        });

        ctx.handles.forEach((elem) => {
            ctx.handlesContainer.addChild(elem);
        });

        ctx.fillings.forEach((elem) => {
            ctx.fillingsContainer.addChild(elem);
        });

        ctx.fasades.forEach((elem) => {
            ctx.fasadesContainer.addChild(elem);
        });

        ctx.sectionLables.forEach((elem) => {
            ctx.lablesContainer.addChild(elem);
        });

        ctx.dementions.forEach((elem) => {
            ctx.dementionContainer.addChild(elem);
        });
    }

    createModule({ x, y, width, height, moduleData }) {
        const ctx = this.ctx
        const sector = new Container({ isRenderGroup: true });

        sector.position.set(x, y);

        sector.shapes = [];
        sector.sectorData = moduleData;
        sector.sections = ctx.sections;

        const cell = new Section(moduleData, width, height, sector, false);
        cell.highlightGraphics.visible = false;

        // Гардеробная система (временно, черновик) — у неё нет "коробки",
        // заливку общего контура модуля (обычно коричневая, type:"module")
        // не показываем; секции рисуются отдельно в createWardrobeSector.
        // Bounds/bookkeeping ниже (getSectorBounds, moduleData.sector и т.д.)
        // всё равно нужны — оставляем как есть, скрываем только заливку.
        if (moduleData.moduleKind === 'wardrobe') {
            cell.cellGraphics.alpha = 0;
        }

        sector.addChild(cell.cellGraphics);

        ctx.sections.push(sector);

        // Создаём ограничения для секций по высоте
        const sectorBounds = ctx.shapeAdjuster.getSectorBounds(sector);
        sector.bound = sectorBounds;

        moduleData.maxY = ctx.shapeAdjuster.convertToTen(ctx.getMmHeight(sectorBounds.maxY));
        moduleData.minY = ctx.shapeAdjuster.convertToTen(ctx.getMmHeight(sectorBounds.minY));
        moduleData.maxX = ctx.shapeAdjuster.convertToTen(ctx.getMmWidth(sectorBounds.maxX));
        moduleData.minX = ctx.shapeAdjuster.convertToTen(ctx.getMmWidth(sectorBounds.minX));

        moduleData.sector = sector;

        return sector;
    }

    // Создаём секции
    createSector({
        x,
        y,
        width,
        height,
        cellData,
        section,
        sectionIndex,
        cellIndex,
        gridType,
        _sector = false,
        rowIndex = null,
        row = false,
        extraIndex = null,
        itemIndex = null,
        item = false,
        opacity = 1,
    }) {
        const ctx = this.ctx
        let sector = new Container();

        sector.position.set(x, y);

        sector.shapes = [];
        sector.sectorData = cellData;
        sector.sections = ctx.sections;
        sector.fillingsContainer = ctx.fillingsContainer;

        sector.secIndex = sectionIndex;
        sector.cellIndex = cellIndex;
        sector.rowIndex = rowIndex;
        sector.extraIndex = extraIndex;

        const cell = new Section(
            cellData,
            width,
            height,
            sector,
            gridType === ctx.mode.value,
            opacity,
        );

        const selected =
            gridType === "fasades"
                ? ctx.selectedFasade
                : gridType === "filling"
                    ? ctx.selectedFilling
                    : ctx.selectedCell;

        if (
            selected.value.sec === sectionIndex &&
            selected.value.cell === cellIndex &&
            selected.value.row === rowIndex &&
            selected.value.extra === extraIndex &&
            (selected.value.item === undefined || selected.value.item === itemIndex)
        ) {
            cell.highlightGraphics.visible = true;
        } else {
            cell.highlightGraphics.visible = false;
        }

        sector.addChild(cell.cellGraphics);
        sector.addChild(cell.highlightGraphics);

        if (cellData.tsarga && gridType !== "fasades") {
            this.createTsarga({ width, sector });
        }

        if (gridType === "fasades") {
            ctx.fasades.push(sector);
        } else if (!_sector) ctx.sections.push(sector);
        else _sector.addChild(sector);

        cellData.fillings?.forEach((data) => {
            this.createFilling(data, sector);
        });

        if (gridType === "fasades") {
            if (!cellData.manufacturerOffset && ctx.mode.value === "fasades") {

                let tmpRowIndex = section.findIndex((item) => item.id === cellData.id);
                cell.cellGraphics.on("pointerdown", () => {
                    ctx.selectCell(gridType, <TSelectedCell>{
                        sec: sectionIndex,
                        cell: cellIndex,
                        row: tmpRowIndex,
                        extra: extraIndex,
                        item: null,
                    });
                });

                cell.cellGraphics.eventMode = "static";
                cell.cellGraphics.cursor = "pointer";
            }
        } else {


            cell.cellGraphics.on("pointerdown", () => {
                ctx.selectCell(gridType, <TSelectedCell>{
                    sec: sectionIndex,
                    cell: cellIndex,
                    row: rowIndex,
                    extra: extraIndex,
                    item: null,
                });
            });

            cell.cellGraphics.eventMode = "static";
            cell.cellGraphics.cursor = "pointer";
        }

        // Создаём ограничения для секций по высоте
        if (gridType !== "fasades") {
            const sectorBounds = ctx.shapeAdjuster.getTotalBounds(sector, cellData);
            sector.bound = sectorBounds;

            cellData.maxY = ctx.shapeAdjuster.convertToTen(ctx.getMmHeight(sectorBounds.maxY));
            cellData.minY = ctx.shapeAdjuster.convertToTen(ctx.getMmHeight(sectorBounds.minY));
        }

        cellData.sector = sector;

        // Рендер линейки расстояний до границ секции
        let tmpSectorBounds = ctx.shapeAdjuster.getSectorBounds(sector);
        let mmSectorBounds = {
            width: ctx.getMmWidth(tmpSectorBounds.width),
            height: ctx.getMmHeight(tmpSectorBounds.height),
            x: ctx.getMmWidth(tmpSectorBounds.x),
            y: ctx.getMmHeight(tmpSectorBounds.y),
        };

        sector.shapes.forEach((el) => {
            el.sectorBounds = tmpSectorBounds;
            el.drawBoundaryDistances();
        });

        if (gridType === ctx.mode.value) {
            // /** Создаём нумерацию секции */
            this.createSectioNum({
                x,
                y,
                width,
                height,
                cell: cellData,
                sectionIndex,
                cellIndex,
                rowIndex,
                extraIndex,
            });

            if (gridType === "module") {
                // /**Создание вертикального драга */
                this.createVerticalCut({
                    width,
                    height,
                    cell: cellData,
                    section,
                    sectionIndex,
                    sector,
                    cellIndex,
                    rowIndex,
                    extraIndex,
                });
                // /**Создание горизонтального драга */
                this.createHorozontalCut({
                    width,
                    height,
                    cell: cellData,
                    section,
                    sectionIndex,
                    sector,
                    cellIndex,
                    rowIndex,
                    extraIndex,
                });
            }
        }

        return sector;
    }

    drawGlassShelf(container, x, y, width) {
        if (!container?.glassShelf) {
            return;
        }

        const glassShelf = new Graphics();

        glassShelf.rect(
            x,
            y,
            width,
            this.ctx.getPixelHeight(this.ctx.UMconstructor?.value?.getShelfThickness(container, this.ctx.props.module)),
        );
        glassShelf.fill({ color: "#8ec9e8", alpha: 0.75 });
        glassShelf.eventMode = "none";

        this.ctx.deviders.push(glassShelf);
    };

    createLoop({ x, y, width, height, loopData }) {
        const ctx = this.ctx
        const sector = new Container();

        sector.position.set(x, y);

        sector.shapes = [];
        sector.sectorData = loopData;
        sector.sections = ctx.sections;

        const cell = new Section(loopData, width, height, sector, false);
        cell.highlightGraphics.visible = false;
        cell.cellGraphics.eventMode = "static";

        sector.addChild(cell.cellGraphics);

        ctx.loops.push(sector);

        // Создаём ограничения для секций по высоте
        const sectorBounds = ctx.shapeAdjuster.getSectorBounds(sector);
        sector.bound = sectorBounds;

        loopData.sector = sector;

        return sector;
    }

    createHandle({ x, y, width, height, handleData, opacity }) {
        const ctx = this.ctx
        const sector = new Container();

        sector.position.set(x, y);

        sector.shapes = [];
        sector.sectorData = handleData;
        sector.sections = ctx.sections;

        const cell = new Section(handleData, width, height, sector, false, opacity);
        cell.highlightGraphics.visible = false;
        cell.cellGraphics.eventMode = "static";

        sector.addChild(cell.cellGraphics);

        ctx.handles.push(sector);

        // Создаём ограничения для секций по высоте
        const sectorBounds = ctx.shapeAdjuster.getSectorBounds(sector);
        sector.bound = sectorBounds;

        handleData.sector = sector;

        return sector;
    }

    createFilling(data, sector) {
        const ctx = this.ctx
        let sectorXMMPos = ctx.getMmWidth(sector.position.x);
        let sectorYMMPos = ctx.getMmHeight(sector.position.y);

        if (
            !data.isProfile &&
            !data.isVerticalItem &&
            data.position.x !== sectorXMMPos
        ) {
            data.position.x = sectorXMMPos;
        } else if (data.isVerticalItem && data.position.y !== sectorYMMPos) {
            data.position.y = sectorYMMPos;
        }

        // Для внутренних ящиков (15222587, 2166308) ограничиваем перемещение
        // пределами фасада внешнего ящика. Constraint хранится в data.innerDrawerConstraint (мм).

        let customSectorBounds = undefined
        let containerShape = undefined

        if (data.innerDrawerConstraint) {
            const c = data.innerDrawerConstraint
            customSectorBounds = {
                x: ctx.getPixelWidth(c.x),
                y: ctx.getPixelHeight(c.startY),
                width: ctx.getPixelWidth(c.width),
                height: ctx.getPixelHeight(c.height),
            }
            // Ищем контейнер для исключения коллизии с ним
            containerShape = sector.shapes.find(s => UM_DRAWERS_IDS.OUTER.includes(s.data?.productGroupID))
        }

        const filling = new Shape({
            type: data.type,
            position: data.position,
            sector,
            data,
            select: (type, sel) => ctx.selectCell(type, sel),
            render: (...args) => this.renderGrid(...args),
            getMmWidth: ctx.getMmWidth,
            getMmHeight: ctx.getMmHeight,
            getPixelHeight: ctx.getPixelHeight,
            getPixelWidth: ctx.getPixelWidth,
            calcDrawersFasades: ctx.calcDrawersFasades,
            checkLoopsCollision: ctx.checkLoopsCollision,
            dementions: ctx.dementions,
            dementionContainer: ctx.dementionContainer,
            dragActive: ctx.mode.value === "fillings",
            collisionExclusionRules: ctx.UMconstructor.value.LOOPS.getCollisionExclusionRules(),
            customSectorBounds,
            containerShape,
            store: ctx.UMconstructor?.value?.UM_STORE,
        });

        data.sector = filling.sector;

        if (ctx.mode.value === "fillings") {
            this.createSectioNum({
                x: ctx.getPixelWidth(filling.data.position.x),
                y: ctx.getPixelHeight(filling.data.position.y),
                width: filling.data.width,
                height: filling.data.height,
                cell: filling.data,
                sectionIndex: filling.data.sec,
                cellIndex: filling.data.cell,
                rowIndex: filling.data.row,
                extraIndex: filling.data.extra,
                itemIndex: filling.data.id,
            });

            filling.graphic.on("pointerdown", () => {
                ctx.selectCell("fillings", <TSelectedCell>{
                    sec: filling.data.sec,
                    cell: filling.data.cell,
                    row: filling.data.row,
                    extra: filling.data.extra,
                    item: filling.data.id,
                });
            });
        }

        if (
            ctx.selectedFilling.value.sec === filling.data.sec &&
            ctx.selectedFilling.value.cell === filling.data.cell &&
            ctx.selectedFilling.value.row === filling.data.row &&
            ctx.selectedFilling.value.extra === filling.data.extra &&
            ctx.selectedFilling.value.item === filling.data.id
        ) {
            filling.highlightGraphics.visible = true;
        } else {
            filling.highlightGraphics.visible = false;
        }

        ctx.fillings.push(filling.graphic);
        ctx.fillings.push(filling.highlightGraphics);
        ctx.fillingsMap.push(filling);
        sector.shapes.push(filling);
    }

    //Создаём Царгу
    createTsarga({ width, sector }) {
        const tsarga = new Graphics();
        tsarga.rect(0, 0, width, this.ctx.getPixelHeight(18));
        tsarga.fill({ color: 0x5EC455, alpha: 0.85 });
        sector.addChild(tsarga);
    }

    // Отрисовываем номер ячейки
    createSectioNum({
        x,
        y,
        width,
        height,
        cell,
        sectionIndex,
        cellIndex,
        rowIndex = null,
        itemIndex = null,
        extraIndex = null,
    }) {
        const ctx = this.ctx
        const pxWidth = ctx.getPixelWidth(cell.width);
        const pxHeight = ctx.getPixelHeight(cell.height);

        const xOffset = cell.xOffset || x;
        const yOffset = cell.yOffset || y;
        const opacity = cell.type == "fasade" ? 1 : 0.4;

        let text;

        if (sectionIndex === null) {
            text =
                rowIndex !== null
                    ? `${cellIndex + 1}.${rowIndex + 1}`
                    : `${cellIndex + 1}`;
        } else {
            text =
                rowIndex !== null
                    ? `${sectionIndex + 1}.${cellIndex + 1}.${rowIndex + 1}`
                    : `${sectionIndex + 1}.${cellIndex + 1}`;
        }

        if (extraIndex !== null) text += `.${extraIndex + 1}`;

        if (itemIndex !== null) text += ` ${itemIndex}`;

        const cellNumber = new Text({
            text: text,
            style: { fontSize: 14, fill: "#131313", align: "center", alpha: opacity },
        });

        cellNumber.anchor.set(0.5);
        cellNumber.x = xOffset + pxWidth / 2;
        cellNumber.y = yOffset + pxHeight / 2;

        const labelWidth = cellNumber.width + 4;

        const cellNumberBackground = new Graphics();
        cellNumberBackground.roundRect(
            xOffset + pxWidth / 2 - labelWidth / 2,
            yOffset + pxHeight / 2 - 13,
            labelWidth,
            26,
            5,
        );
        cellNumberBackground.fill({ color: "#ffffff", alpha: opacity });
        cellNumberBackground.stroke({ width: 1, color: "black", alpha: opacity });

        cellNumber.interactive = false;
        cellNumberBackground.interactive = false;

        ctx.sectionLables.push(cellNumberBackground);
        ctx.sectionLables.push(cellNumber);
    }

    // Отрисовываем вертикальный драг
    createVerticalCut({
        width,
        height,
        cell,
        section,
        sectionIndex,
        sector,
        cellIndex = null,
        rowIndex = null,
        extraIndex = null,
    }) {
        const ctx = this.ctx

        let _cellIndex = cellIndex;
        let _rowIndex = rowIndex;
        let _extraIndex = extraIndex;
        let _cell = cell;

        const curSec = ctx.currentModule.value.sections[sectionIndex];
        const curCell = curSec?.cells?.[_cellIndex];
        const curRow = curCell?.cellsRows?.[_rowIndex];
        const curExtra = curRow?.extras?.[_extraIndex];

        switch (_cell.type) {
            case "rowCell":
                if (
                    _rowIndex == curCell.cellsRows?.length - 1 &&
                    sectionIndex < ctx.currentModule.value.sections.length - 1
                ) {
                    _cellIndex = null;
                    _rowIndex = null;
                    _extraIndex = null;

                    _cell = curSec;
                    break;
                }

                if (!(_rowIndex < curCell.cellsRows?.length - 1)) return;
                break;
            case "section":
                if (!(sectionIndex < section.length - 1)) return;
                break;
            case "rowExtra":
                if (
                    _rowIndex == curCell.cellsRows?.length - 1 &&
                    sectionIndex < ctx.currentModule.value.sections.length - 1
                ) {
                    _cellIndex = null;
                    _rowIndex = null;
                    _extraIndex = null;

                    _cell = curSec;
                    break;
                }

                if (_rowIndex < curCell.cellsRows?.length - 1) {
                    _extraIndex = null;
                } else return;
                break;
            case "cell":
                if (sectionIndex < ctx.currentModule.value.sections.length - 1) {
                    _cellIndex = null;
                    _rowIndex = null;
                    _extraIndex = null;

                    _cell = curSec;
                } else return;

                break;
            default:
                return;
        }

        const pxWidth = ctx.getPixelWidth(_cell.width);
        const convertTotalHeight =
            _rowIndex !== null
                ? ctx.getPixelHeight(_cell.height)
                : ctx.getPixelHeight(curSec.height);

        const divider = new Graphics();
        const dashVert = new Graphics();

        divider.rect(
            0,
            0,
            ctx.getPixelWidth(ctx.currentModule.value.moduleThickness + 4),
            convertTotalHeight,
        );

        divider.fill("#4bef61");
        divider.alpha = 0;

        divider.eventMode = "static";
        divider.cursor = "section-resize";
        divider.section = sectionIndex;
        divider.cell = _cellIndex;
        divider.row = _rowIndex;

        dashVert.rect(0, 0, 0, convertTotalHeight);
        dashVert.stroke({ width: 1, color: "#5D6069" });

        divider.dev_name = `dev${divider.uid}`;


        divider.position.set(
            _cell.xOffset + pxWidth - ctx.getPixelWidth(2),
            _cell.yOffset,
        );
        dashVert.position.set(
            _cell.xOffset + pxWidth - ctx.getPixelWidth(2),
            _cell.yOffset,
        );
        divider.toColideCheck = dashVert;

        divider.on("pointerdown", ctx.onVerticalDragStart);
        divider.on("pointerup", () => {
            setTimeout(() => {
                this.renderGrid();
            }, 100);
        });
        divider.on("pointerupoutside", () => {
            setTimeout(() => {
                this.renderGrid();
            }, 100);
        });

        ctx.deviders.push(divider);
    }

    // Отрисовываем горизонтальный драг
    createHorozontalCut({
        width,
        height,
        cell,
        section,
        sectionIndex,
        sector,
        cellIndex = null,
        rowIndex = null,
        extraIndex = null,
    }) {
        const ctx = this.ctx
        let _cellIndex = cellIndex;
        let _rowIndex = rowIndex;
        let _extraIndex = extraIndex;
        let _cell = cell;

        const curSec = ctx.currentModule.value.sections[sectionIndex];
        const curCell = curSec?.cells?.[_cellIndex];
        const curRow = curCell?.cellsRows?.[_rowIndex];
        const curExtra = curRow?.extras?.[_extraIndex];

        switch (_cell.type) {
            case "rowExtra":
                if (!curExtra) {
                    return;
                }
                if (_extraIndex !== null && !(_extraIndex < curRow.extras?.length - 1)) {
                    if (!(_cellIndex < curSec.cells.length - 1)) {
                        return;
                    }

                    _extraIndex = null;
                    _rowIndex = null;

                    _cell = curSec.cells[_cellIndex];
                }
                break;
            case "cell":
                if (_cellIndex === null || !(_cellIndex < curSec.cells.length - 1))
                    return;
                break;
            default:
                if (_rowIndex !== null && !(_rowIndex < curCell.cellsRows?.length - 1)) {
                    if (!(_cellIndex < curSec.cells.length - 1)) {
                        return;
                    }

                    _rowIndex = null;
                    _extraIndex = null;

                    _cell = curSec.cells[_cellIndex];
                } else return;
                break;
        }

        const pxWidth = ctx.getPixelWidth(_cell.width);
        const pxHeight = ctx.getPixelHeight(_cell.height);

        const divider = new Graphics();
        const dashHor = new Graphics();

        divider.rect(
            _cell.xOffset,
            _cell.yOffset + pxHeight - ctx.getPixelHeight(2),
            pxWidth,
            ctx.getPixelHeight(ctx.currentModule.value.moduleThickness + 4),
        );
        divider.fill("#c53545");
        divider.alpha = 0;
        divider.eventMode = "static";
        divider.cursor = "cell-resize";
        divider.section = sectionIndex;
        divider.cell = _cellIndex;
        divider.row = _rowIndex;
        divider.extra = _extraIndex;

        dashHor.rect(
            _cell.xOffset,
            _cell.yOffset + pxHeight - ctx.getPixelHeight(2),
            pxWidth,
            0,
        );
        dashHor.stroke({ width: 1, color: "#5D6069" });

        divider.on("pointerdown", ctx.onHorizontalDragStart);
        divider.on("pointerup", () => {
            setTimeout(() => {
                this.renderGrid();
            }, 100);
        });
        divider.on("pointerupoutside", () => {
            setTimeout(() => {
                this.renderGrid();
            }, 100);
        });

        ctx.deviders.push(divider);
    }

    checkPositionFillingToCreate(data) {
        const ctx = this.ctx
        const { sec, cell, row, extra } =
            ctx.UMconstructor?.value?.UM_STORE.getSelected("module") ?? {};

        let position, tempShape;

        const section = ctx.props.module.sections[sec];
        const cellData = cell != null ? section?.cells[cell] : null;
        const rowData = row != null ? cellData?.cellsRows?.[row] : null;
        const extraData = extra != null ? rowData?.extras?.[extra] : null;

        const sector =
            extraData?.sector ||
            rowData?.sector ||
            cellData?.sector ||
            section?.sector ||
            ctx.props.module.sector;

        if (!sector) {
            return false;
        }

        tempShape = new Shape({
            type: data.type,
            sector,
            position: { x: 0, y: 0 },
            data,
            getMmWidth: ctx.getMmWidth,
            getMmHeight: ctx.getMmHeight,
            getPixelHeight: ctx.getPixelHeight,
            getPixelWidth: ctx.getPixelWidth,
            calcDrawersFasades: ctx.calcDrawersFasades,
            checkLoopsCollision: ctx.checkLoopsCollision,
            collisionExclusionRules: ctx.UMconstructor.value.LOOPS.getCollisionExclusionRules(),
            dragActive: false,
            store: ctx.UMconstructor?.value?.UM_STORE,
        });

        /** Проверяем на возможность размещения отверстия */

        position = ctx.shapeAdjuster.getRandomPosition(sector, tempShape);

        if (!position) {
            return false;
        }

        return {
            x: Math.round(ctx.getMmWidth(position.x)),
            y: Math.round(ctx.getMmHeight(position.y)),
            width: data.width,
            height: data.height,
            type: data.type,
            PROPS: data,
        };
    }

    clearRender() {
        const ctx = this.ctx
        ctx.sections.forEach((elem) => {
            if (elem.destroyed) return;
            elem.removeChildren();
            if (elem.parent) elem.removeFromParent();
            elem.destroy();
        });

        ctx.deviders.forEach((elem) => {
            if (!elem.onDrag && !elem.destroyed) {
                if (elem.parent) elem.removeFromParent();
                elem.destroy();
            }
        });

        ctx.sections.length = 0;
        ctx.sectionLables.length = 0;
        ctx.deviders.length = 0;
        ctx.dementions.length = 0;
        ctx.fillings.length = 0;
        ctx.fillingsMap.length = 0;
        ctx.wardrobeShelvesMap.length = 0;
        ctx.wardrobeGapLinesMap = {};
        ctx.wardrobeProfilesMap.length = 0;
        ctx.fasades.length = 0;
        ctx.loops.length = 0;
        ctx.handles.length = 0;

        if (ctx.sectionsContainer && !ctx.sectionsContainer.destroyed) ctx.sectionsContainer.removeChildren();
        if (ctx.loopsContainer && !ctx.loopsContainer.destroyed) ctx.loopsContainer.removeChildren();
        if (ctx.handlesContainer && !ctx.handlesContainer.destroyed) ctx.handlesContainer.removeChildren();
        if (ctx.lablesContainer && !ctx.lablesContainer.destroyed) ctx.lablesContainer.removeChildren();
        if (ctx.fillingsContainer && !ctx.fillingsContainer.destroyed) ctx.fillingsContainer.removeChildren();
        if (ctx.dementionContainer && !ctx.dementionContainer.destroyed) ctx.dementionContainer.removeChildren();
        if (ctx.fasadesContainer && !ctx.fasadesContainer.destroyed) ctx.fasadesContainer.removeChildren();
    }
}
