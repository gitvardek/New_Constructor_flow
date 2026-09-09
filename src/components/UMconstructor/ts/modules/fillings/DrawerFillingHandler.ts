// Логика, специфичная для ящиков: внешние/встраиваемые/универсальные ящики,
// ящики с фасадом. Вынесено из FillingsManager.ts (Фаза 1c рефакторинга, см.
// C:\Users\MG_GO.MG\.claude\plans\iterative-launching-lerdorf.md).
// Общий обход дерева/позиционирование/коллизии — через this.core (FillingsCore).
//@ts-nocheck

import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import FillingsCore from "./FillingsCore.ts";
import * as THREE from "three";
import {
    GridModule,
    GridSection,
    FillingObject,
    FasadeObject,
    DrawerFasadeObject,
    MANUFACTURER, LOOPSIDE,
} from "@/components/UMconstructor/types/UMtypes.ts";
import { TFasadeProp } from "@/types/types.ts";
import { UM_DRAWERS_IDS, UM_PARAMS } from "../../../utils/Const";
import { isOuterDrawer, isInnerDrawer, isUniversalDrawer } from "./FillingTypePredicates.ts";

export default class DrawerFillingHandler {
    scope: UMconstructorClass
    core: FillingsCore
    private readonly OUTER_DRAWER_IDS: number[] = UM_DRAWERS_IDS.OUTER
    private readonly INNER_DRAWER_IDS: number[] = UM_DRAWERS_IDS.INNER
    private readonly UNIVERSAL_DRAWER_IDS: number[] = UM_DRAWERS_IDS.UNIVERSAL
    static readonly UNIVERSAL_DRAWER_MIN_THICKNESS = 18

    constructor(scope: UMconstructorClass, core: FillingsCore) {
        this.scope = scope
        this.core = core
    }

    // Толщину берём так же, как reset: у стенки без собственного цвета она корпусная.
    // Не подходит любая из трёх панелей — корпус, левая или правая стенка
    isUniversalDrawerAllowed(grid: GridModule = this.scope.UM_STORE.getUMGrid()) {
        const { CONFIG } = this.scope.UM_STORE.getUMData() ?? {}
        const FASADE = this.scope.APP.FASADE ?? {}

        const moduleThickness = FASADE[CONFIG?.MODULE_COLOR]?.DEPTH || grid?.moduleThickness || 18
        const sideThickness = (side: string) => FASADE[CONFIG?.[side]?.COLOR]?.DEPTH || moduleThickness

        return [moduleThickness, sideThickness("LEFTSIDECOLOR"), sideThickness("RIGHTSIDECOLOR")]
            .every(depth => depth >= this.UNIVERSAL_DRAWER_MIN_THICKNESS)
    };

    // Снимает уже установленные универсальные ящики, когда толщина панелей перестала подходить 
    cleanupUniversalDrawers(grid: GridModule) {
        if (this.isUniversalDrawerAllowed(grid)) return

        let removed = false

        const deleteUniversal = (
            segment: any,
            secIndex: number,
            cellIndex: number | null,
            rowIndex: number | null,
            extraIndex: number | null,
        ) => {
            if (!segment?.fillings?.length) return

            // Удаляем в обратном порядке чтобы не сбивать индексы
            for (let i = segment.fillings.length - 1; i >= 0; i--) {
                if (!UM_DRAWERS_IDS.UNIVERSAL.includes(segment.fillings[i]?.productGroupID)) continue

                this.deleteFilling(secIndex, i, cellIndex, rowIndex, extraIndex, grid, false)
                removed = true
            }
        }

        grid.sections?.forEach((section, secIndex) => {
            deleteUniversal(section, secIndex, null, null, null)
            section.cells?.forEach((cell, cellIndex) => {
                deleteUniversal(cell, secIndex, cellIndex, null, null)
                cell.cellsRows?.forEach((row, rowIndex) => {
                    deleteUniversal(row, secIndex, cellIndex, rowIndex, null)
                    row.extras?.forEach((extra, extraIndex) => {
                        deleteUniversal(extra, secIndex, cellIndex, rowIndex, extraIndex)
                    })
                })
            })
        })

        if (removed)
            this.scope.callAlert("error", `Универсальный ящик удалён: толщина панели меньше ${this.UNIVERSAL_DRAWER_MIN_THICKNESS} мм`)
    };

    // Проверка минимальной глубины для универсального ящика. true — можно продолжать размещение.
    validateUniversalDrawerDepth(_product: any, productGroupID: number, grid: GridModule): boolean {
        if (!this.isUniversalDrawerAllowed(grid)) {
            this.scope.callAlert("error", `Невозможно установить универсальный ящик: толщина корпуса или боковой стенки меньше ${this.UNIVERSAL_DRAWER_MIN_THICKNESS} мм`)
            return false;
        }

        if (!UM_DRAWERS_IDS.UNIVERSAL.includes(productGroupID)) return true

        const minDepth = _product.SIZE_EDIT_DEPTH?.length
            ? Math.min(..._product.SIZE_EDIT_DEPTH) + 7
            : 0;
        if (grid.depth < minDepth) {
            this.scope.callAlert("error", `Невозможно установить универсальный ящик, минимальная глубина для установки: ${minDepth} мм`)
            return false;
        }
        return true
    }

    // Внешние и универсальные ящики можно ставить только в секцию или ячейку полной
    // ширины. true — можно продолжать размещение.
    validateFullWidthDrawerPlacement(
        productGroupID: number,
        cell: number | null,
        row: number | null,
        extra: number | null,
        currentSection: GridSection,
    ): boolean {
        const requiresFullWidth =
            isOuterDrawer(productGroupID, this.OUTER_DRAWER_IDS) ||
            isUniversalDrawer(productGroupID, this.UNIVERSAL_DRAWER_IDS)
        if (!requiresFullWidth || cell === null) return true

        const currentCell = currentSection.cells?.[cell]
        const isNarrowCell = !currentCell || currentCell.width !== currentSection.width
        if (isNarrowCell || row !== null || extra !== null) {
            this.scope.callAlert("error", "Внешние и универсальные ящики можно устанавливать только в секцию или ячейку полной ширины")
            return false
        }
        return true
    }

    // Размещение встраиваемого/универсального ящика внутрь конкретного внешнего ящика,
    // выбранного на канвасе. Всегда завершает обработку addFilling (вызывающий должен return).
    addInnerDrawer(
        product: any,
        productGroupID: number,
        grid: GridModule,
        sec: number,
        cell: number | null,
        row: number | null,
        extra: number | null,
        _type: string,
    ): void {
        if (grid.productID === UM_PARAMS.RASPASHNOY_ID) return

        // Целевой внешний ящик — тот, который кликнут на канвасе (selectCell("fillings"))
        const selectedOnCanvas = this.scope.UM_STORE.getSelected("fillings")
        const outerSec = selectedOnCanvas?.sec ?? sec

        if (outerSec === null || outerSec === undefined) {
            this.scope.callAlert("info", "Кликните по внешнему ящику на канвасе, затем добавляйте встраиваемый ящик")
            return
        }

        // Навигация к контейнеру, в котором находится выбранный внешний ящик
        // Иерархия: sections → cells → cellsRows → extras → fillings
        const outerCell = selectedOnCanvas?.cell ?? null
        const outerRow = selectedOnCanvas?.row ?? null
        const outerExtra = selectedOnCanvas?.extra ?? null

        const outerSection = grid.sections[outerSec]
        const outerCellObj = outerSection.cells?.[outerCell]
        const outerRowObj = outerCellObj?.cellsRows?.[outerRow]
        const outerExtraObj = outerRowObj?.extras?.[outerExtra]
        const outerContainer = outerExtraObj || outerRowObj || outerCellObj || outerSection

        const outerDrawer = (selectedOnCanvas?.item !== null && selectedOnCanvas?.item !== undefined)
            ? outerContainer?.fillings?.find(
                f => f.id === selectedOnCanvas.item &&
                    isOuterDrawer(f.productGroupID, this.OUTER_DRAWER_IDS)
            ) ?? null
            : null

        if (!outerDrawer) {
            this.scope.callAlert("info", "Кликните по внешнему ящику на канвасе, затем добавляйте встраиваемый ящик")
            return
        }

        // Доступная высота = расстояние от верха тела до верха фасада внешнего ящика
        const availableHeight = this.scope.FILLINGS.getInnerDrawerSpace(outerDrawer)

        if (availableHeight <= 0) {
            this.scope.callAlert("error", "Внешний ящик не имеет свободного пространства для встраиваемого ящика")
            return
        }

        // Суммируем высоту уже добавленных внутренних ящиков для этого внешнего
        const existingInnerDrawers = outerContainer.fillings
            ?.filter(f => isInnerDrawer(f.productGroupID, this.INNER_DRAWER_IDS) &&
                f.innerDrawerConstraint?.outerDrawerGroupId === outerDrawer.innerDrawerGroupId) ?? []

        const existingCount = existingInnerDrawers.length
        const usedHeight = existingInnerDrawers.reduce((sum, f) => sum + f.height, 0)

        // Занято отступами: INNER_DRAWER_GAP от тела + по INNER_DRAWER_GAP на каждый уже добавленный ящик + INNER_DRAWER_FACADE_GAP до фасада
        const { INNER_DRAWER_GAP, INNER_DRAWER_FACADE_GAP } = UM_PARAMS
        const gapsTotal = INNER_DRAWER_GAP * (existingCount + 1) + INNER_DRAWER_FACADE_GAP

        const freeHeight = availableHeight - gapsTotal - usedHeight

        if (product.width > outerDrawer.width) {
            this.scope.callAlert("error", `Ширина ящика (${product.width} мм) больше ширины внешнего ящика (${outerDrawer.width} мм)`)
            return
        }
        if (product.height > freeHeight) {
            this.scope.callAlert("error", `Недостаточно места: доступно ${Math.round(freeHeight)} мм, требуется ${product.height} мм`)
            return
        }

        if (!outerContainer.fillings)
            outerContainer.fillings = []

        const startY = outerDrawer.position.y - availableHeight

        // Ищем первый свободный слот по фактическим позициям ящиков (они могут быть перемещены)
        let newDrawerY: number
        if (existingInnerDrawers.length === 0) {
            newDrawerY = outerDrawer.position.y - INNER_DRAWER_GAP - product.height
        } else {
            const sorted = [...existingInnerDrawers].sort((a, b) => a.position.y - b.position.y)
            let slot: number | null = null

            // 1. Выше крайнего верхнего (ближе к фасаду)
            const aboveTop = sorted[0].position.y - INNER_DRAWER_GAP - product.height
            if (aboveTop >= startY + INNER_DRAWER_FACADE_GAP) slot = aboveTop

            // 2. В зазоре между соседними ящиками
            if (slot === null) {
                for (let i = 0; i < sorted.length - 1; i++) {
                    const slotTop = sorted[i].position.y + sorted[i].height + INNER_DRAWER_GAP
                    const slotBottom = sorted[i + 1].position.y - INNER_DRAWER_GAP
                    if (slotTop + product.height <= slotBottom) { slot = slotTop; break }
                }
            }

            // 3. Ниже крайнего нижнего (ближе к телу)
            if (slot === null) {
                const last = sorted[sorted.length - 1]
                const belowLast = last.position.y + last.height + INNER_DRAWER_GAP
                if (belowLast + product.height <= outerDrawer.position.y - INNER_DRAWER_GAP) slot = belowLast
            }

            if (slot === null) {
                this.scope.callAlert("error", "Нет подходящего места для внутреннего ящика")
                return
            }
            newDrawerY = slot
        }

        const fillingObject = <FillingObject>{
            isVerticalItem: false,
            product: product.ID,
            id: outerContainer.fillings.length + 1,
            name: product.NAME,
            image: product.PREVIEW_PICTURE,
            type: _type,
            position: new THREE.Vector2(outerDrawer.position.x, newDrawerY),
            size: new THREE.Vector3(product.width, product.height, product.depth || grid.depth),
            width: product.width,
            height: product.height,
            color: false,
            sec: outerSec,
            cell: outerCell,
            row: outerRow,
            extra: outerExtra,
            productGroupID,
            innerDrawerConstraint: {
                outerDrawerGroupId: outerDrawer.innerDrawerGroupId,
                x: outerDrawer.position.x,
                startY,
                width: outerDrawer.width,
                height: availableHeight,
            },
        }

        outerContainer.fillings.push(fillingObject)
        this.scope.FILLINGS.registerLoopCollisionExclusion()
        this.scope.reset(grid)
        this.core.selectCell(outerSec, outerCell, outerRow, outerExtra, null)
    }

    // Достраивает выдвижной фасад для ящика (product.MIN_FASADE_SIZE) поверх уже
    // созданного fillingObject: считает позицию/материал фасада, регистрирует его
    // в currentSection.fasadesDrawers, пересчитывает соседние фасады.
    attachFasade(
        fillingObject: FillingObject,
        product: any,
        productGroupID: number,
        sec: number,
        cell: number | null,
        row: number | null,
        currentSection: GridSection,
        grid: GridModule,
        startFillingData: any,
    ): void {
        console.log(product.MIN_FASADE_SIZE, 'MIN_FASADE_SIZE')

        if (!currentSection.fasadesDrawers)
            currentSection.fasadesDrawers = []

        const leftWidth = grid.leftWallThickness || grid.moduleThickness;
        const rightWidth = grid.rightWallThickness || grid.moduleThickness;

        const correctSectionFasadeWidth =
            grid.sections.length > 1 ?
                sec > 0 && sec < grid.sections.length - 1 ? currentSection.width + grid.moduleThickness - 4 :
                    currentSection.width + ((sec == 0 ? leftWidth : rightWidth) - 2) + (grid.moduleThickness / 2 - 2) :
                grid.width - 4;

        let baseFasade = grid.sections[sec]?.fasades?.[0]?.[0] || currentSection.fasadesDrawers?.[0]
        if (!baseFasade) {
            const PROPS = this.scope.UM_STORE.getUMData();

            const FASADE_PROPS = PROPS.CONFIG.FASADE_PROPS[0];
            const FASADE = this.scope.FASADES.getFasadePosition(FASADE_PROPS.POSITION);

            let startX = sec > 0 ? currentSection.position.x - currentSection.width / 2 - grid.moduleThickness / 2 + 2 : FASADE.POSITION_X;

            let newDoorPosition = new THREE.Vector2(startX, grid.isRestrictedModule ? FASADE.POSITION_Y : grid.horizont + 2);
            baseFasade = <FasadeObject>{
                id: 1,
                width: correctSectionFasadeWidth,
                height: grid.height - grid.horizont - 4,
                position: newDoorPosition,
                type: "fasade",
                material: <TFasadeProp>{
                    ...FASADE_PROPS,
                },
            };
            let fasadeMinMax = this.scope.FASADES.getFasadePositionMinMax(baseFasade);
            baseFasade = Object.assign(baseFasade, fasadeMinMax);
            baseFasade.loopsSide = LOOPSIDE['none']
        }

        let manufacturerOffset = 0
        let manufacturer_name = product.EN_NAME?.toLowerCase() || product.NAME?.toLowerCase()
        if (product.FASADE_DRAWER_OFFSET) {
            manufacturerOffset = product.FASADE_DRAWER_OFFSET
        } else
            Object.entries(MANUFACTURER).forEach(([key, offset]) => {
                if (manufacturer_name.includes(key)) {
                    manufacturer_name = key
                    manufacturerOffset = offset
                }
            })

        fillingObject.type = "drawer"
        fillingObject.moduleThickness = grid.moduleThickness
        // Уникальный ID группы: нужен для привязки внутренних ящиков к этому внешнему
        fillingObject.innerDrawerGroupId = Date.now()
        fillingObject.fasade = <DrawerFasadeObject>{
            id: currentSection.fasadesDrawers.length + 1,
            fasadeDrawerId: currentSection.fasadesDrawers.length + 1,
            width: correctSectionFasadeWidth,
            height: product.MIN_FASADE_SIZE,
            minY: product.MIN_FASADE_SIZE,
            maxY: product.MAX_FASADE_SIZE,
            loopsSide: false,
            position: new THREE.Vector2(baseFasade.position.x, grid.height - (startFillingData.y + startFillingData.height + manufacturerOffset)),
            material: <TFasadeProp>{
                ...baseFasade.material,
                HANDLES: { ...baseFasade.material.HANDLES }
            },
            type: "fasade",
            manufacturerOffset,
            item: fillingObject.id,
            sec,
            cell,
            row,
        }

        if (UM_DRAWERS_IDS.UNIVERSAL.includes(productGroupID) && product.DROWER_FASADE_HEIGHT) {
            const heightOptions = Object.keys(product.DROWER_FASADE_HEIGHT).map(Number);
            const firstHeight = heightOptions[0];
            const fasadeRange = product.DROWER_FASADE_HEIGHT[String(firstHeight)];
            if (fasadeRange) {
                fillingObject.fasade.minY = fasadeRange.min;
                fillingObject.fasade.maxY = fasadeRange.max;
                fillingObject.fasade.height = fasadeRange.min;
            }
        }

        currentSection.fasadesDrawers.push(fillingObject.fasade);
        this.scope.FASADES.EXTERNAL_FASADES.calcDrawersFasades(sec, false, grid)
        this.scope.callAlert('warning', 'Проверьте корректность рассчитанной позиции ящика!')
    }

    changeDrawerFasade(
        event: Event,
        value: number,
        key: number,
        secIndex: number,
        cellIndex: number | null = null,
        rowIndex: number | null = null,
    ) {
        this.scope.debounce("changeDrawerFasade", () => {
            // Берём актуальный grid внутри debounce, чтобы не работать с устаревшей ссылкой
            const grid = this.scope.UM_STORE.getUMGrid()

            this.core.selectCell(secIndex, cellIndex, rowIndex, null, key);

            const sec = grid.sections[secIndex];
            const currentColl = sec.cells?.[cellIndex];
            const currentRow = currentColl?.cellsRows?.[rowIndex] || currentColl || sec;

            const currentfilling = currentRow.fillings[key];

            if (!currentfilling?.fasade) {
                this.scope.callAlert("error", `У элемента нет фасада!`)
                return
            }

            const prevValue = currentfilling.fasade.height;
            const newValue = +value

            // Проверяем по допустимым пределам фасада (minY/maxY).
            // checkToCollision здесь неприменим: он проверяет позицию тела ящика внутри секции,
            // а не высоту фасада, и возвращает false если суммарная высота с фасадом выходит
            // за координаты секции — блокируя изменение без явной ошибки для пользователя.
            const minY = currentfilling.fasade.minY ?? 0
            const maxY = currentfilling.fasade.maxY ?? Infinity

            if (newValue >= minY && newValue <= maxY) {
                currentfilling.fasade.height = newValue;

                // Пересчитываем пространство фасада и согласуем внутренние ящики
                const newAvailableHeight = this.scope.FILLINGS.getInnerDrawerSpace(currentfilling, newValue)
                this.reconcileInnerDrawers(secIndex, currentfilling, newAvailableHeight, grid)
            } else {
                currentfilling.fasade.height = prevValue;
                this.scope.callAlert('error', `Высота фасада должна быть в диапазоне ${minY}–${maxY} мм`)
            }

            // Передаём currentfilling, чтобы calcDrawersFasades обновил fasadesDrawers[k] = fasade
            // и re-синхронизировал ссылку, которая разрывается после saveUMGrid в reset
            this.scope.FASADES.EXTERNAL_FASADES.calcDrawersFasades(secIndex, currentfilling, grid)
            this.scope.reset(grid)
        }, 1000)
    };

    changeUniversalDepth(
        value: number,
        itemIndex: number,
        secIndex: number,
        cellIndex: number | null = null,
        rowIndex: number | null = null,
        extraIndex: number | null = null,
        grid: GridModule = this.scope.UM_STORE.getUMGrid(),
    ) {
        const sec = grid.sections[secIndex];
        const cell = sec.cells?.[cellIndex];
        const row = cell?.cellsRows?.[rowIndex];
        const extra = row?.extras?.[extraIndex];
        const curRow = extra || row || cell || sec;
        const filling = curRow.fillings[itemIndex];
        if (!filling) return;
        filling.depth = Number(value);
        if (filling.size) filling.size.z = Number(value);
        this.scope.reset(grid);
    }

    changeUniversalHeight(
        value: number,
        itemIndex: number,
        secIndex: number,
        cellIndex: number | null = null,
        rowIndex: number | null = null,
        extraIndex: number | null = null,
        grid: GridModule = this.scope.UM_STORE.getUMGrid(),
    ) {
        const numValue = Number(value);
        const sec = grid.sections[secIndex];
        const cell = sec.cells?.[cellIndex];
        const row = cell?.cellsRows?.[rowIndex];
        const extra = row?.extras?.[extraIndex];
        const curRow = extra || row || cell || sec;
        const filling = curRow.fillings[itemIndex];
        if (!filling) return;

        const oldHeight = filling.height;
        const heightDelta = numValue - oldHeight;

        // Вычисляем новую высоту фасада для нового размера ящика
        const productData = this.scope.APP?.CATALOG?.PRODUCTS?.[filling.product];
        const fasadeRange = productData?.DROWER_FASADE_HEIGHT?.[String(numValue)];
        const newFasadeHeight = fasadeRange
            ? Math.max(fasadeRange.min, Math.min(fasadeRange.max, filling.fasade?.height ?? fasadeRange.min))
            : (filling.fasade?.height ?? 0);

        // Минимальный зазор сверху: выступ фасада над телом ящика + 2 мм
        const manufacturerOffset = filling.fasade?.manufacturerOffset ?? 16;
        const minTopGap = filling.fasade
            ? Math.max(0, newFasadeHeight - manufacturerOffset - numValue + 2)
            : 0;

        // Вычисляем новые координаты без применения к filling
        const currentTop = filling.distances?.top ?? 0;
        const maxUpShift = Math.max(0, currentTop - minTopGap);
        const upShift = Math.min(heightDelta, maxUpShift);
        const downShift = heightDelta - upShift;

        let newPositionY = (filling.position.y ?? 0) - upShift;
        let newTop = currentTop - upShift;
        let newBottom = Math.max(0, (filling.distances?.bottom ?? 0) - downShift);

        // Проверяем коллизии с другими наполнениями той же ячейки
        // Для ящиков с фасадами проверяем пересечение фасадов (они больше тела),
        // для остальных — пересечение тел по distances.top
        const newFasadePosY = filling.fasade
            ? grid.height - (newPositionY + numValue + manufacturerOffset)
            : null;
        const newFasadeTopY = newFasadePosY !== null ? newFasadePosY + newFasadeHeight : null;

        const newTopEdge = newTop;
        const newBottomEdge = newTop + numValue;
        const hasCollision = curRow.fillings.some((f, idx) => {
            if (idx === itemIndex) return false;
            // Фасад-фасад: проверяем в координатах module-from-bottom
            if (f.fasade && newFasadePosY !== null) {
                const otherFasadePosY = f.fasade.position.y;
                const otherFasadeTopY = otherFasadePosY + (f.fasade.height ?? 0);
                return newFasadePosY < otherFasadeTopY && newFasadeTopY > otherFasadePosY;
            }
            // Тело-тело: проверяем по distances.top
            if (!f.distances) return false;
            const otherTop = f.distances.top ?? 0;
            const otherBottom = otherTop + (f.height ?? 0);
            return newBottomEdge > otherTop && newTopEdge < otherBottom;
        });
        if (hasCollision) {
            this.scope.callAlert('error', 'Невозможно изменить высоту: пересечение с другим наполнением');
            return;
        }

        // Применяем все изменения
        filling.height = numValue;
        if (filling.size) filling.size.y = numValue;
        filling.position.y = newPositionY;
        if (filling.distances) {
            filling.distances.top = newTop;
            filling.distances.bottom = newBottom;
        }

        if (fasadeRange && filling.fasade) {
            filling.fasade.minY = fasadeRange.min;
            filling.fasade.maxY = fasadeRange.max;
            filling.fasade.height = newFasadeHeight;
        }

        if (filling.fasade) {
            this.scope.FASADES.EXTERNAL_FASADES.calcDrawersFasades(secIndex, filling, grid);
        }
        this.scope.reset(grid);
    }

    private reconcileInnerDrawers(
        secIndex: number,
        outerDrawer: FillingObject,
        newAvailableHeight: number,
        grid: GridModule,
    ): void {
        const sec = grid.sections[secIndex]

        // Восстанавливаем контейнер внешнего ящика по его координатам
        const ci = outerDrawer.cell ?? null
        const ri = outerDrawer.row ?? null
        const ei = outerDrawer.extra ?? null
        const cell = sec.cells?.[ci]
        const row = cell?.cellsRows?.[ri]
        const extra = row?.extras?.[ei]
        const container = extra || row || cell || sec

        const fillings = container.fillings
        if (!fillings?.length) return

        // Собираем индексы внутренних ящиков этого внешнего (снизу вверх = по возрастанию индекса)
        const innerIndices: number[] = []
        for (let idx = 0; idx < fillings.length; idx++) {
            const f = fillings[idx]
            if (!isInnerDrawer(f.productGroupID, this.INNER_DRAWER_IDS)) continue
            if (outerDrawer.innerDrawerGroupId &&
                f.innerDrawerConstraint?.outerDrawerGroupId !== outerDrawer.innerDrawerGroupId) continue
            // Ящик слишком широкий — удаляем (независимо от высоты)
            if (f.width > outerDrawer.width) {
                innerIndices.push(-idx - 1)  // отмечаем для безусловного удаления через знак
            } else {
                innerIndices.push(idx)
            }
        }

        if (!innerIndices.length) return

        const { INNER_DRAWER_GAP, INNER_DRAWER_FACADE_GAP } = UM_PARAMS

        // Кумулятивная высота и число валидных ящиков (не помеченных на принудительное удаление)
        let totalHeight = 0
        let count = 0
        for (const raw of innerIndices) {
            if (raw >= 0) { totalHeight += fillings[raw].height; count++ }
        }

        const toDelete: number[] = []

        // Удаляем с верха стека (конец массива innerIndices) пока не влезет с учётом отступов
        let i = innerIndices.length - 1
        while (i >= 0) {
            const requiredSpace = totalHeight + count * INNER_DRAWER_GAP + INNER_DRAWER_FACADE_GAP
            if (requiredSpace <= newAvailableHeight && innerIndices[i] >= 0) break
            const raw = innerIndices[i]
            const realIdx = raw < 0 ? -raw - 1 : raw
            toDelete.push(realIdx)
            if (raw >= 0) { totalHeight -= fillings[raw].height; count-- }
            i--
        }

        // Удаляем в убывающем порядке, чтобы не сбивать индексы
        toDelete.sort((a, b) => b - a)
        for (const idx of toDelete) {
            this.scope.FILLINGS.deleteFilling(secIndex, idx, ci, ri, ei, grid, false)
        }

        const removed = toDelete.length > 0

        // Обновляем constraint и переукладываем оставшиеся ящики от тела вверх с отступами
        const newStartY = outerDrawer.position.y - newAvailableHeight
        const currentFillings = container.fillings

        const remaining = currentFillings.filter(f =>
            isInnerDrawer(f.productGroupID, this.INNER_DRAWER_IDS) &&
            (!outerDrawer.innerDrawerGroupId ||
                f.innerDrawerConstraint?.outerDrawerGroupId === outerDrawer.innerDrawerGroupId)
        )
        // Сортируем по убыванию Y: ближайший к телу (большее Y) — первым
        remaining.sort((a, b) => b.position.y - a.position.y)

        let stackBottom = outerDrawer.position.y - INNER_DRAWER_GAP
        for (const f of remaining) {
            if (f.innerDrawerConstraint) {
                f.innerDrawerConstraint.height = newAvailableHeight
                f.innerDrawerConstraint.startY = newStartY
            }
            if (f.position) {
                f.position.y = stackBottom - f.height
                stackBottom -= f.height + INNER_DRAWER_GAP
            }
        }

        if (removed) {
            this.scope.callAlert('warning', 'Встроенный ящик удалён: не помещается в новые параметры фасада')
        }
    }

    // Каскадное удаление внутренних ящиков при удалении внешнего (вызывается из FillingsManager.deleteFilling)
    cascadeDeleteInnerDrawers(curItem: FillingObject, curRow: any): void {
        const groupId = curItem.innerDrawerGroupId
        if (!curRow.fillings) return

        const prevLen = curRow.fillings.length
        curRow.fillings = curRow.fillings.filter(f =>
            !(isInnerDrawer(f.productGroupID, this.INNER_DRAWER_IDS) &&
                f.innerDrawerConstraint?.outerDrawerGroupId === groupId)
        )
        if (curRow.fillings.length !== prevLen) {
            curRow.fillings.forEach((f, idx) => { f.id = idx + 1 })
            this.scope.callAlert('info', 'Встраиваемые ящики удалены вместе с внешним')
        }
    }

    // Ренумерация fasadesDrawers при удалении ящика с фасадом (вызывается из FillingsManager.deleteFilling)
    beforeDeleteFasade(curItemFasade: any, sec: GridSection, grid: GridModule): void {
        sec.fasadesDrawers = sec.fasadesDrawers.filter((el, index) => {
            return el.fasadeDrawerId !== curItemFasade.fasadeDrawerId;
        });
        sec.fasadesDrawers.forEach((fasade, index) => {
            if (fasade.fasadeDrawerId > curItemFasade.fasadeDrawerId) {
                let filling = this.core.getFillingObject({
                    grid,
                    sec: fasade.sec,
                    cell: fasade.cell,
                    row: fasade.row,
                    extra: fasade.extra,
                    item: fasade.item - 1,
                });
                fasade.fasadeDrawerId -= 1;
                if (filling)
                    filling.fasade = fasade
            }
        })
    }

    // Совместное перетаскивание встроенных ящиков вместе с их внешним ящиком по вертикали
    // (вызывается из FillingsCore.changeFillingPositionY). currentfilling.position.y должен
    // быть уже обновлён к моменту вызова — это же значение используется для startY.
    moveLinkedInnerDrawers(current: any, currentfilling: FillingObject, delta: number): void {
        current.fillings.forEach(innerFilling => {
            if (isInnerDrawer(innerFilling?.productGroupID, this.INNER_DRAWER_IDS) &&
                innerFilling.innerDrawerConstraint?.outerDrawerGroupId === currentfilling.innerDrawerGroupId) {
                innerFilling.position.y = (innerFilling.position.y || 0) - delta
                if (innerFilling.distances) {
                    innerFilling.distances.bottom = (innerFilling.distances.bottom || 0) + delta
                }
                if (innerFilling.innerDrawerConstraint) {
                    innerFilling.innerDrawerConstraint.startY = currentfilling.position.y - innerFilling.innerDrawerConstraint.height
                }
            }
        })
    }
}
