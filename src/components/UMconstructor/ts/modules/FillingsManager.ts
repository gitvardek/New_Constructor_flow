//@ts-nocheck

import type UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import * as THREE from "three";
import {
    GridModule,
    TSelectedCell,
    DrawerFasadeObject,
    FillingObject,
    MANUFACTURER, GridSection, GridCell, GridCellsRow, GridRowExtra, FasadeObject, LOOPSIDE, LoopZone
} from "@/components/UMconstructor/types/UMtypes.ts";
import { TFasadeProp } from "@/types/types.ts";
import { FILLINGS_RESTRICTION_EXCEPTIONS, FILLINGS_WIDTH_UNRESTRICTED_GROUPS, UM_DRAWERS_IDS, UM_PARAMS } from "../../utils/Const";

type TCollisionExclusionRule = {
    prop: string
    values: any[],
    collisionWith: string
    condition?: (grid: GridModule) => boolean
}

type TloopCollisionExclusion = TCollisionExclusionRule[]

export default class FillingsManager {
    scope: UMconstructorClass
    FILLING_TYPES: Map<string, string>

    private loopCollisionExclusion: TloopCollisionExclusion = [
        {
            prop: 'productGroupID',
            values: [6174300, 15222587, 6513322], //2166309
            collisionWith: 'loop'
        },
        {
            // 2166308 исключается из коллизий петель везде, кроме распашного шкафа
            // (RASPASHNOY_ID) и стандартного УМ (DEFAULT_UM_ID): там пересечение ящика
            // с петлёй — ошибка ErrorsType.loops. Правила проверяются через some(),
            // поэтому условие должно быть одним: два отдельных правила дали бы "или"
            // и исключали ящик в обоих модулях сразу
            prop: 'productGroupID',
            values: [2166308],
            collisionWith: 'loop',
            condition: (grid) => grid.productID !== UM_PARAMS.RASPASHNOY_ID
                && grid.productID !== UM_PARAMS.DEFAULT_UM_ID
        }
    ]
    private readonly OUTER_DRAWER_IDS: number[] = UM_DRAWERS_IDS.OUTER
    private readonly INNER_DRAWER_IDS: number[] = UM_DRAWERS_IDS.INNER
    private readonly UNIVERSAL_DROWER: number[] = UM_DRAWERS_IDS.UNIVERSAL

    constructor(scope: UMconstructorClass) {
        this.scope = scope
        this.FILLING_TYPES = new Map(
            Object.entries({
                2166308: 'drawer', //Встраиваемые ящики
                2166309: 'drawer', //Секции
                5718462: 'drawer', //Секции купе
                5726092: 'drawer', //Внешние ящики
                6560591: 'drawer', //Внешние ящики Hi-Tech
                5726093: 'shelf',  //Полки
                12102124: 'shelf', //Полки Hi-Tech
                6311723: 'shelf',  //Полки купе
                6174300: 'any',    //Аксессуары для шкафов
                6513322: 'profile',//Профиль Hi-Tech
            })
        )
    }

    // Регистрирует правила исключения коллизий в LoopsManager.
    // Вызывается из UMconstructorClass после инициализации обоих менеджеров.
    public initCollisionRules(): void {
        this.scope.LOOPS.addCollisionExclusionRule(this.loopCollisionExclusion)
    }

    // Возвращает первое наполнение в секции с одним из указанных productGroupID.
    // Сканирует все уровни: секция → ячейка → ряд → дополнительный уровень.
    private findFirstFillingWithGroupIDs(section: GridSection, groupIDs: number[]): FillingObject | null {
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

    // saveUMGrid пересобирает fillings[].fasade и fasadesDrawers[] по отдельности,
    // поэтому после каждого reset общая ссылка между ними рвётся и правка фасада
    // остаётся только в fillings. Возвращаем ссылку на место
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

    // Свободное пространство внутри внешнего ящика — это часть фасада выше верха тела.
    // Фасад опущен на manufacturerOffset ниже дна тела (ExternalFasadesManager:
    // fasade.position.y = grid.height - (position.y + height + manufacturerOffset)),
    // поэтому над телом остаётся ровно fasadeHeight - manufacturerOffset - height.
    // Слагаемое (moduleThickness - 2) сюда не входит: это поправка на начало координат
    // зоны перетаскивания, из-за неё отступ до фасада получался на 14 мм больше нужного
    getInnerDrawerSpace(outerDrawer: any, fasadeHeight?: number): number {
        if (!outerDrawer.fasade) return outerDrawer.height
        const height = fasadeHeight ?? outerDrawer.fasade.height
        return height - outerDrawer.fasade.manufacturerOffset - outerDrawer.height
    };

    // Универсальный ящик крепится к боковинам корпуса, поэтому тонкая панель для него
    // не годится
    static readonly UNIVERSAL_DRAWER_MIN_THICKNESS = 18

    // Толщину берём так же, как reset: у стенки без собственного цвета она корпусная.
    // Не подходит любая из трёх панелей — корпус, левая или правая стенка
    isUniversalDrawerAllowed(grid: GridModule = this.scope.UM_STORE.getUMGrid()) {
        const { CONFIG } = this.scope.UM_STORE.getUMData() ?? {}
        const FASADE = this.scope.APP.FASADE ?? {}

        const moduleThickness = FASADE[CONFIG?.MODULE_COLOR]?.DEPTH || grid?.moduleThickness || 18
        const sideThickness = (side: string) => FASADE[CONFIG?.[side]?.COLOR]?.DEPTH || moduleThickness

        return [moduleThickness, sideThickness("LEFTSIDECOLOR"), sideThickness("RIGHTSIDECOLOR")]
            .every(depth => depth >= FillingsManager.UNIVERSAL_DRAWER_MIN_THICKNESS)
    };

    // Универсальный ящик приходит из каталога без собственных габаритов: высота корпуса
    // задаётся ключами DROWER_FASADE_HEIGHT, глубина — списком SIZE_EDIT_DEPTH (глубже
    // корпуса минус 7 мм ящик не встаёт). Берём первые допустимые значения — те же,
    // что потом предлагает панель наполнения
    getUniversalDrawerSizes(product: any, grid: GridModule = this.scope.UM_STORE.getUMGrid()) {
        const height = Object.keys(product?.DROWER_FASADE_HEIGHT ?? {})
            .map(Number)
            .filter(value => Number.isFinite(value))[0]

        const maxAllowedDepth = grid.depth - 7
        const depth = (product?.SIZE_EDIT_DEPTH ?? []).filter((value: number) => value <= maxAllowedDepth)[0]

        return { height, depth }
    };

    // Снимает уже установленные универсальные ящики, когда толщина панелей перестала
    // подходить — например, после смены материала корпуса или боковой стенки
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
            this.scope.callAlert("error", `Универсальный ящик удалён: толщина панели меньше ${FillingsManager.UNIVERSAL_DRAWER_MIN_THICKNESS} мм`)
    };

    addFilling(
        _product: any,
        productGroupID: number,
        grid: GridModule = this.scope.UM_STORE.getUMGrid(),
    ) {

        console.log(_product, productGroupID, 'productGroupID')

        if (UM_DRAWERS_IDS.UNIVERSAL.includes(productGroupID)) {
            if (!this.isUniversalDrawerAllowed(grid)) {
                this.scope.callAlert("error", `Невозможно установить универсальный ящик: толщина корпуса или боковой стенки меньше ${FillingsManager.UNIVERSAL_DRAWER_MIN_THICKNESS} мм`)
                return;
            }

            const minDepth = _product.SIZE_EDIT_DEPTH?.length
                ? Math.min(..._product.SIZE_EDIT_DEPTH) + 7
                : 0;
            if (grid.depth < minDepth) {
                this.scope.callAlert("error", `Невозможно установить универсальный ящик, минимальная глубина для установки: ${minDepth} мм`)
                return;
            }
        }

        const product = Object.assign({}, _product);
        product.productGroupID = productGroupID;
        const { sec, cell, row, extra } = this.scope.UM_STORE.getSelected("module")
        const isHiTechProfile = this.scope.APP.PRODUCTS_TYPES[product.productType]?.CODE.includes("hi_tech_profile") || false
        const isBottomHiTechProfile = isHiTechProfile && this.scope.APP.PRODUCTS_TYPES[product.productType]?.CODE.includes("bottom") || false
        const PROPS = this.scope.UM_STORE.getUMData();

        let name = product.NAME?.toLowerCase()
        let _type = name.includes('разделитель') ? 'vertical_shelf' : this.FILLING_TYPES.get(`${productGroupID}`) || 'any';
        if (_type === 'shelf' && name.includes('стеклянная')) {
            _type = "glass_shelf"
        }

        const isVerticalItem = _type === "vertical_shelf"

        const currentSection = grid.sections[sec];

        if (!currentSection) {
            this.scope.callAlert("warning", "Необходимо выбрать секцию");
            return;
        }

        // Скобки обязательны: && связывает сильнее ||, и без них проверка cell !== null
        // прикрывала только универсальный ящик, а внешний ящик в секцию (cell === null)
        // упирался в cells?.[null] и всегда отклонялся
        const isOuterKindDrawer = this.OUTER_DRAWER_IDS.includes(productGroupID) || this.UNIVERSAL_DROWER.includes(productGroupID)
        if (isOuterKindDrawer && cell !== null) {
            const currentCell = currentSection.cells?.[cell]
            const isNarrowCell = !currentCell || currentCell.width !== currentSection.width
            if (isNarrowCell || row !== null || extra !== null) {
                this.scope.callAlert("error", "Внешние ящики можно устанавливать только в секцию или ячейку полной ширины")
                return
            }
        }

        if (this.INNER_DRAWER_IDS.includes(productGroupID) && grid.productID !== UM_PARAMS.RASPASHNOY_ID) {
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
                        this.OUTER_DRAWER_IDS.includes(f.productGroupID)
                ) ?? null
                : null

            if (!outerDrawer) {
                this.scope.callAlert("info", "Кликните по внешнему ящику на канвасе, затем добавляйте встраиваемый ящик")
                return
            }

            // Доступная высота = расстояние от верха тела до верха фасада внешнего ящика
            const availableHeight = this.getInnerDrawerSpace(outerDrawer)

            if (availableHeight <= 0) {
                this.scope.callAlert("error", "Внешний ящик не имеет свободного пространства для встраиваемого ящика")
                return
            }

            // Суммируем высоту уже добавленных внутренних ящиков для этого внешнего
            const existingInnerDrawers = outerContainer.fillings
                ?.filter(f => this.INNER_DRAWER_IDS.includes(f.productGroupID) &&
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
            this.scope.LOOPS.addCollisionExclusionRule(this.loopCollisionExclusion)
            this.scope.reset(grid)
            this.selectCell(outerSec, outerCell, outerRow, outerExtra, null)
            return
        }

        const currentCell = currentSection.cells?.[cell];
        const currentRow = currentCell?.cellsRows?.[row];
        const currentExtra = currentRow?.extras?.[extra];

        let currentModuleSegment = currentExtra || currentRow || currentCell || currentSection

        // Наполнение из списка исключений ставится без ограничений по размерам области
        const isRestrictionException = FILLINGS_RESTRICTION_EXCEPTIONS.includes(+product.ID)

        // Группы из списка не упираются в предел ширины: их можно ставить в область
        // любого уровня (секция, ячейка, ряд, extra) шире FILLINGS_MAX_WIDTH
        const isWidthUnrestrictedGroup = FILLINGS_WIDTH_UNRESTRICTED_GROUPS.includes(+productGroupID)

        if (!isRestrictionException && !isWidthUnrestrictedGroup && currentModuleSegment.width > UM_PARAMS.FILLINGS_MAX_WIDTH) {
            this.scope.callAlert("error", `Нельзя добавить наполнение: ширина области (${currentModuleSegment.width} мм) превышает ${UM_PARAMS.FILLINGS_MAX_WIDTH} мм`)
            return;
        }

        if (!isRestrictionException && currentModuleSegment.height <= UM_PARAMS.MIN_SECTION_TO_FILLINGS_HEIGHT) {
            this.scope.callAlert("error", `Нельзя добавить наполнение: высота области (${currentModuleSegment.height} мм) менее ${UM_PARAMS.MIN_SECTION_TO_FILLINGS_HEIGHT} мм`)
            return;
        }

        if (row === null && cell === null && sec === null && extra === null) {
            this.scope.callAlert("info", "Пожалуйста, выберите секцию для добавления наполнения")
            return;
        }

        if (product.MIN_FASADE_SIZE) {
            if (row || extra) {
                this.scope.callAlert("error", "Нельзя установить ящик с фасадом в вертикальный разделитель!")
                return;
            }

            if (!currentSection?.fasades?.[0]?.[0] && !currentSection?.fasadesDrawers?.[0]) {
                this.scope.callAlert("error", "Нельзя установить ящик с фасадом в секцию без двери! Добавьте фасад, даже если он должен быть пустым!")
                return;
            }
        }

        if (isBottomHiTechProfile && !this.scope.UM_STORE.onWallModule) {
            this.scope.callAlert("error", "Г-образный профиль доступен только для навесного модуля")
            return;
        }

        if (isHiTechProfile) {
            if (grid.profilesConfig?.sideProfile) {
                this.scope.callAlert("error", "Нельзя добавить горизонтальный профиль вместе с боковым!")
                return;
            }
            if (row || extra) {
                this.scope.callAlert("error", "Нельзя установить профиль в вертикальный разделитель!")
                return;
            }
        }

        let currentFillingsArray = []

        if (_type === 'shelf') {
            product.height = grid.moduleThickness
        }

        if (_type === 'vertical_shelf') {
            product.width = grid.moduleThickness
        }

        // Высота универсального ящика не приходит в product.height, а выбирается из
        // DROWER_FASADE_HEIGHT. Без подстановки место подбиралось под нулевую высоту:
        // ящик садился вплотную под дно секции и уходил телом в цоколь
        if (UM_DRAWERS_IDS.UNIVERSAL.includes(productGroupID)) {
            const { height: universalHeight } = this.getUniversalDrawerSizes(product, grid)
            if (universalHeight !== undefined) {
                product.height = universalHeight
            }
        }

        const startFillingData = this.createFillingDataToCheck(product, currentModuleSegment, grid, isVerticalItem, !!product.MIN_FASADE_SIZE);


        if (!startFillingData) {
            this.scope.callAlert("error", "Нет места для размещения")
            return;
        }

        if (!currentModuleSegment.fillings)
            currentModuleSegment.fillings = []
        currentFillingsArray = currentModuleSegment.fillings

        let depth = product.depth
        if (product.SIZE_EDIT_DEPTH_MAX) {
            depth = grid.depth;

            const moduleProductInfo = this.scope.APP.CATALOG.PRODUCTS[grid.productID]
            if (moduleProductInfo?.moduleType?.CODE === "wardrobe")
                depth -= 100;
        }

        let width = startFillingData.width;
        let height = startFillingData.height;

        let profileData = {}
        if (isHiTechProfile) {
            if (!grid.profilesConfig) {
                grid.profilesConfig = { COLOR: product.COLOR[0] != null ? product.COLOR[0] : grid.moduleColor }
                grid.profilesConfig.colorsList = [...product.COLOR]
                grid.profilesConfig.onSectionSize = false

                PROPS.CONFIG['PROFILECOLOR'] = grid.profilesConfig.COLOR
            }

            height = product.height || grid.moduleThickness
            if (!isBottomHiTechProfile && !this.scope.APP.PRODUCTS_TYPES[product.productType]?.CODE.includes("section")) {
                width = grid.profilesConfig.onSectionSize ? startFillingData.width : startFillingData.width + grid.moduleThickness * 2

                if (!grid.profilesConfig.onSectionSize) {
                    width = startFillingData.width + grid.moduleThickness * 2
                    startFillingData.x -= grid.moduleThickness
                } else {
                    width = startFillingData.width
                }
            }

            profileData.COLOR = grid.profilesConfig?.COLOR ? grid.profilesConfig?.COLOR : grid.moduleColor

            let typeProfile = product.NAME.toLowerCase().split("-")[0].replace(/\s/g, '')
            if (typeProfile !== "c" && typeProfile !== "l")
                typeProfile = typeProfile.split(",").pop().replace(/\s/g, '')

            profileData.TYPE_PROFILE = typeProfile
            profileData.offsetFasades = typeProfile == "c" ? 36 : typeProfile == "l" ? 38 : 0
            profileData.manufacturerOffset = typeProfile == "c" ? -18.5 : typeProfile == "l" ? -19.5 : 0

            if (isBottomHiTechProfile) {
                profileData.isBottomHiTechProfile = true
                startFillingData.y = grid.height - grid.horizont - height
            }

            if (!currentSection.hiTechProfiles)
                currentSection.hiTechProfiles = []

            profileData.id = currentSection.hiTechProfiles.length + 1
        }

        let fillingObject = <FillingObject>{
            isVerticalItem,
            product: product.ID,
            id: currentFillingsArray.length + 1,
            name: product.NAME,
            image: product.PREVIEW_PICTURE,
            type: _type,
            position: new THREE.Vector2(startFillingData.x, startFillingData.y),
            size: new THREE.Vector3(width, height, depth),
            width,
            height,
            color: profileData.COLOR || false,
            sec,
            cell,
            row,
            extra,
            productGroupID
        };


        // Высоту уже учли при подборе позиции, здесь остаётся записать её в сам объект
        if (UM_DRAWERS_IDS.UNIVERSAL.includes(productGroupID)) {
            const { height: universalHeight, depth: universalDepth } = this.getUniversalDrawerSizes(product, grid)
            if (universalHeight !== undefined) {
                fillingObject.height = universalHeight;
                fillingObject.size.y = universalHeight;
            }
            if (universalDepth !== undefined) {
                fillingObject.depth = universalDepth;
                fillingObject.size.z = universalDepth;
            }
        }

        if (isHiTechProfile) {

            fillingObject.isProfile = profileData
            fillingObject.moduleThickness = grid.moduleThickness
            currentSection.hiTechProfiles.push(fillingObject)
            currentFillingsArray.push(fillingObject);

            this.scope.FASADES.EXTERNAL_FASADES.calcDrawersFasades(sec, false, grid)
            this.scope.callAlert('warning', 'Проверьте корректность рассчитанной позиции профиля!')
        } else
            currentFillingsArray.push(fillingObject);

        if (product.MIN_FASADE_SIZE) {

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
                const { height: universalHeight } = this.getUniversalDrawerSizes(product, grid)
                const fasadeRange = product.DROWER_FASADE_HEIGHT[String(universalHeight)];
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

        this.scope.LOOPS.addCollisionExclusionRule(this.loopCollisionExclusion)

        this.scope.reset(grid)
        this.selectCell(sec, cell, row, extra, null);
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
            this.deleteFilling(secIndex, id, cellIndex, rowIndex, extraIndex, grid, false);
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

    deleteFilling(
        secIndex: number,
        itemIndex: number,
        cellIndex: number | null = null,
        rowIndex: number | null = null,
        extraIndex: number | null = null,
        grid: GridModule = this.scope.UM_STORE.getUMGrid(),
        reset: boolean = true,
    ) {
        const sec = grid.sections[secIndex];
        const cell = sec.cells?.[cellIndex];
        const row = cell?.cellsRows?.[rowIndex];
        const extra = row?.extras?.[extraIndex];

        const curRow = extra || row || cell || sec;

        let curItem = curRow.fillings[itemIndex];

        if (!curItem) {
            throw new Error("Объект удаления не найден!")
        }

        let curItemFasade = curItem.fasade
        let curItemProfile = curItem.isProfile ? curItem : false;

        if (curItemFasade) {
            sec.fasadesDrawers = sec.fasadesDrawers.filter((el, index) => {
                return el.fasadeDrawerId !== curItemFasade.fasadeDrawerId;
            });
            sec.fasadesDrawers.forEach((fasade, index) => {
                if (fasade.fasadeDrawerId > curItemFasade.fasadeDrawerId) {
                    let filling = this.getFillingObject({
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

        if (curItemProfile) {
            sec.hiTechProfiles = sec.hiTechProfiles.filter((el, index) => {
                return el.isProfile.id !== curItemProfile.isProfile.id;
            });
            /*            sec.hiTechProfiles.forEach((profile, index) => {
                            if (profile.isProfile.id > curItemProfile.isProfile.id) {
                                let filling = this.getFillingObject({
                                    grid,
                                    sec: profile.sec,
                                    cell: profile.cell,
                                    row: profile.row,
                                    extra: profile.extra,
                                    item: profile.id - 1,
                                });
                                profile.isProfile.id -= 1;
                                if(filling)
                                    filling.isProfile.id = profile.isProfile.id;
                            }
                        })*/
        }

        curRow.fillings = curRow.fillings.filter((el, index) => {
            return index !== itemIndex;
        });


        curRow.fillings.forEach((filling, index) => {
            if (filling.id > curItem.id) {
                filling.id -= 1;
                if (filling.fasade) {
                    let oldDrawerFasadeId = sec.fasadesDrawers?.findIndex(item => (
                        item.sec === filling.fasade.sec &&
                        item.cell === filling.fasade.cell &&
                        item.row === filling.fasade.row &&
                        item.extra === filling.fasade.extra &&
                        item.item === filling.fasade.item
                    ))
                    filling.fasade.item = filling.id;
                    sec.fasadesDrawers?.splice(oldDrawerFasadeId, 1, filling.fasade)
                }
                if (filling.isProfile) {
                    let oldProfileId = sec.hiTechProfiles?.findIndex(item => (
                        item.sec === filling.sec &&
                        item.cell === filling.cell &&
                        item.row === filling.row &&
                        item.extra === filling.extra &&
                        item.id === filling.id + 1
                    ))
                    sec.hiTechProfiles?.splice(oldProfileId, 1, filling)
                }
            }
        })

        // Каскадное удаление внутренних ящиков при удалении внешнего
        if (this.OUTER_DRAWER_IDS.includes(curItem.productGroupID) && curItem.innerDrawerGroupId) {
            const groupId = curItem.innerDrawerGroupId
            if (curRow.fillings) {
                const prevLen = curRow.fillings.length
                curRow.fillings = curRow.fillings.filter(f =>
                    !(this.INNER_DRAWER_IDS.includes(f.productGroupID) &&
                        f.innerDrawerConstraint?.outerDrawerGroupId === groupId)
                )
                if (curRow.fillings.length !== prevLen) {
                    curRow.fillings.forEach((f, idx) => { f.id = idx + 1 })
                    this.scope.callAlert('info', 'Встраиваемые ящики удалены вместе с внешним')
                }
            }
        }

        if (curItemFasade || curItemProfile) {
            if (!sec.fasadesDrawers?.length)
                delete sec.fasadesDrawers

            if (!sec.hiTechProfiles?.length)
                delete sec.hiTechProfiles

            this.scope.FASADES.EXTERNAL_FASADES.calcDrawersFasades(secIndex, false, grid)
        }

        if (reset) {
            this.scope.reset(grid)
            this.selectCell(secIndex, cellIndex, rowIndex, extraIndex, null);
        }
    };

    // Приводит значение поля к числу и ограничивает допустимым диапазоном.
    // Пустое или нечисловое поле (значение стёрли) — не повод двигать наполнение, вернём null
    private clampPosition(
        value: number | string,
        conversation: { min: number, max: number },
    ): number | null {
        const raw = typeof value === "string" ? value.trim() : value

        if (raw === "" || raw === null || raw === undefined) return null

        const result = Number(raw)

        if (!Number.isFinite(result)) return null

        const min = Number(conversation?.min)
        const max = Number(conversation?.max)

        return Math.max(
            Number.isFinite(min) ? min : -Infinity,
            Math.min(result, Number.isFinite(max) ? max : Infinity),
        )
    }

    changeFillingPositionX(
        conversation: {
            min: number,
            max: number
        } | null,
        _value: number,
        key: number,
        secIndex: number,
        cellIndex: number | null = null,
        rowIndex: number | null = null,
        extraIndex: number | null = null,
        grid: GridModule = this.scope.UM_STORE.getUMGrid(),
    ) {
        this.scope.debounce("changeFillingPositionX", () => {
            const sec = grid.sections[secIndex];
            const currentColl = sec.cells?.[cellIndex];
            const currentRow = currentColl?.cellsRows?.[rowIndex];
            const currentExtra = currentRow?.extras?.[extraIndex];

            const current = currentExtra || currentRow || currentColl || sec;

            const currentfilling = current.fillings[key];

            if (!currentfilling) return;

            // Пределы считаем здесь, а не в панели: за время debounce сетка могла пересобраться
            const value = this.clampPosition(_value, conversation ?? {
                min: 0,
                max: current.width - currentfilling.width,
            });
            if (value === null) return;

            this.selectCell(secIndex, cellIndex, rowIndex, extraIndex, currentfilling?.id ?? key);

            if (currentfilling?.isProfile?.isBottomHiTechProfile) {
                this.scope.callAlert("info", "Г-образный профиль нельзя перемещать!")
                return;
            }

            const prevValue = currentfilling.position.x; //Предыдущее значение
            const prevValueLeft = currentfilling.distances?.left ?? this.calcDistanceLeft(currentfilling, current); //Предыдущее значение

            let delta = value - prevValueLeft
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
                this.setDistanceLeft(currentfilling, current, value)
            } else {
                this.scope.callAlert("error", `Нельзя изменить позицию на ${+_value}`)
                currentfilling.position.x = prevValue;
                this.setDistanceLeft(currentfilling, current, prevValueLeft)
            }

            currentfilling.sector = tmpSector;

            if (currentfilling.fasade)
                this.scope.FASADES.EXTERNAL_FASADES.calcDrawersFasades(secIndex, false, grid)

            this.scope.reset(grid)
        }, 1000)
    };

    // Единая система отсчёта позиции по вертикали — distances.bottom: расстояние в мм
    // от дна сегмента (секции/ячейки/ряда/субъячейки), в котором лежит наполнение, до его низа.
    // В ней же работает 2D-слой (Shape.drawBoundaryDistances), 3D-сборка (BuildUniversalModule)
    // и поле "Позиция" в панели, поэтому min/max считаем здесь без привязки к cell.position.y
    // (та координата абсолютная — от пола модуля, включая цоколь и дно).
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
                }
                break;
            case "min":
                result = 0 - (filling.isProfile ? grid.moduleThickness : 0)
                if (filling.fasade) {
                    result = result - (grid.moduleThickness - 2) + filling.fasade.manufacturerOffset
                }
                break;
        }

        return result
    }

    // Позиция наполнения в системе distances.bottom. distances считает 2D-слой при отрисовке;
    // пока его не было (например, сразу после загрузки конфига) — выводим из координат сетки.
    getAbsolutePositionY(
        filling: FillingObject,
        cell: GridSection | GridCell | GridCellsRow | GridRowExtra,
        grid: GridModule = this.scope.UM_STORE.getUMGrid(),
    ) {
        if (filling.distances) {
            return filling.distances.bottom
        }

        return this.calcDistanceBottom(filling, cell, grid)
    }

    // Пересчёт distances.bottom из координат: filling.position.y — координата верха наполнения
    // в системе 2D-слоя (от верха модуля вниз), cell.position.y — низ сегмента от пола модуля.
    // Поправка на "без дна": позиции сегментов по-прежнему считаются с толщиной дна,
    // а 2D-слой рисует секцию от верха модуля, поэтому низ сегмента оказывается ниже
    calcDistanceBottom(
        filling: FillingObject,
        cell: GridSection | GridCell | GridCellsRow | GridRowExtra,
        grid: GridModule = this.scope.UM_STORE.getUMGrid(),
    ) {
        const noBottomShift = grid.noBottom ? grid.moduleThickness : 0

        return grid.height - cell.position.y - (filling.position.y + filling.height) + noBottomShift
    }

    // Отступ от левого края сегмента: по горизонтали координаты сетки и 2D-слоя считаются
    // от левого края модуля, поэтому достаточно вычесть левую границу сегмента
    calcDistanceLeft(
        filling: FillingObject,
        cell: GridSection | GridCell | GridCellsRow | GridRowExtra,
    ) {
        return filling.position.x - (cell.position.x - cell.width / 2)
    }

    private setDistanceLeft(
        filling: FillingObject,
        cell: GridSection | GridCell | GridCellsRow | GridRowExtra,
        left: number,
    ) {
        if (!filling.distances) return

        filling.distances.left = left
        filling.distances.right = cell.width - filling.width - left
    }

    // Записывает вертикальные отступы наполнения. 2D-слой пересчитает их при следующей отрисовке,
    // но до неё значением пользуются панель, сборка 3D и сохранение конфига
    private setDistanceBottom(
        filling: FillingObject,
        cell: GridSection | GridCell | GridCellsRow | GridRowExtra,
        bottom: number,
    ) {
        if (!filling.distances) return

        filling.distances.bottom = bottom
        filling.distances.top = cell.height - filling.height - bottom
    }

    changeFillingPositionY(
        conversation: {
            min: number,
            max: number
        } | null,
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
            const sec = grid.sections[secIndex];
            const currentColl = sec.cells?.[cellIndex];
            const currentRow = currentColl?.cellsRows?.[rowIndex];
            const currentExtra = currentRow?.extras?.[extraIndex];

            const current = currentExtra || currentRow || currentColl || sec;

            const currentfilling = current.fillings[key];

            if (!currentfilling) return;

            // Пределы считаем здесь, а не в панели: за время debounce сетка могла пересобраться
            const value = this.clampPosition(_value, conversation ?? {
                min: this.calcMinMaxPositionY("min", currentfilling, current, grid),
                max: this.calcMinMaxPositionY("max", currentfilling, current, grid),
            });
            if (value === null) return;

            // item = filling.id (1-based), а не key (0-based индекс массива)
            this.selectCell(secIndex, cellIndex, rowIndex, extraIndex, currentfilling?.id ?? key);

            if (currentfilling?.isProfile?.isBottomHiTechProfile) {
                this.scope.callAlert("info", `Г-образный профиль нельзя перемещать`)
                return;
            }

            const prevValue = currentfilling.position.y; //Предыдущее значение
            const prevValueBottom = this.getAbsolutePositionY(currentfilling, current, grid); //Предыдущее значение

            // distances.bottom растёт вверх, position.y (система 2D-слоя) — вниз, поэтому знак обратный
            let delta = +value - prevValueBottom
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

            const isOuterDrawer = this.OUTER_DRAWER_IDS.includes(currentfilling?.productGroupID)
            const isInnerDrawer = this.INNER_DRAWER_IDS.includes(currentfilling?.productGroupID)

            // Набор фигур для проверки коллизии должен совпадать с тем, что видит перетаскивание
            // (setupDraggable): внешний ящик не сталкивается со своим наполнением, а внутренний
            // живёт в пространстве фасада внешнего и сталкивается только с другими внутренними.
            let originalShapes = null
            if (pixiSector?.shapes && (isOuterDrawer || (isInnerDrawer && currentfilling.innerDrawerConstraint))) {
                originalShapes = pixiSector.shapes
                pixiSector.shapes = isOuterDrawer
                    ? pixiSector.shapes.filter(s => !this.INNER_DRAWER_IDS.includes(s.data?.productGroupID))
                    : pixiSector.shapes.filter(s => this.INNER_DRAWER_IDS.includes(s.data?.productGroupID))
            }

            // Проверяем коллизию
            const check = this.scope.SHAPE_ADJUSTER.checkToCollision(pixiSector, false, fillingData);

            // Позиция, которая реально применится: запрошенная либо ближайшая допустимая.
            // Ближайшую ищем по тому же набору фигур, что и коллизию, поэтому shapes восстанавливаем после
            let appliedY = null

            if (check) {
                appliedY = newValue
            } else {
                const tmpPos = {
                    x: fillingData.position.x,
                    y: newValue,
                }
                fillingData.position.y = prevValue;
                if (fillingData.distances) {
                    fillingData.distances.bottom = prevValueBottom;
                }
                const closestPos = this.scope.SHAPE_ADJUSTER.getClosestPosition(pixiSector, fillingData, tmpPos)

                if (closestPos) {
                    appliedY = closestPos.y
                    this.scope.callAlert("info", `Позиция ${+_value} занята — наполнение сдвинуто в ближайшую свободную`)
                } else {
                    this.scope.callAlert("error", `Нельзя изменить позицию на ${+_value}`)
                }
            }

            if (originalShapes !== null) {
                pixiSector.shapes = originalShapes
            }

            // Без допустимой позиции наполнение остаётся там, где было
            const resultY = appliedY !== null ? appliedY : prevValue
            const appliedDelta = prevValue - resultY //Насколько наполнение сдвинулось вверх

            currentfilling.position.y = resultY;

            // Запрошенное значение применяем как есть, подобранное — пересчитываем из фактической позиции
            let resultBottom = prevValueBottom
            if (appliedY !== null) {
                resultBottom = check ? value : this.calcDistanceBottom(currentfilling, current, grid)
            }

            this.setDistanceBottom(currentfilling, current, resultBottom)

            // Для внешних ящиков: перемещаем только вложенные ящики этого конкретного внешнего
            if (isOuterDrawer && appliedDelta !== 0) {
                current.fillings.forEach(innerFilling => {
                    if (this.INNER_DRAWER_IDS.includes(innerFilling?.productGroupID) &&
                        innerFilling.innerDrawerConstraint?.outerDrawerGroupId === currentfilling.innerDrawerGroupId) {
                        innerFilling.position.y = (innerFilling.position.y || 0) - appliedDelta
                        if (innerFilling.distances) {
                            innerFilling.distances.bottom = (innerFilling.distances.bottom || 0) + appliedDelta
                        }
                        if (innerFilling.innerDrawerConstraint) {
                            innerFilling.innerDrawerConstraint.startY = resultY - innerFilling.innerDrawerConstraint.height
                        }
                    }
                })
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

            this.selectCell(secIndex, cellIndex, rowIndex, null, key);

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
                const newAvailableHeight = this.getInnerDrawerSpace(currentfilling, newValue)
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

        // Если после сдвига зазор сверху всё ещё меньше минимального — сдвигаем ящик вниз
        // const topDeficit = minTopGap - newTop;
        // if (filling.distances && topDeficit > 0) {
        //     newPositionY = newPositionY + topDeficit;
        //     newTop = newTop + topDeficit;
        //     newBottom = Math.max(0, newBottom - topDeficit);
        // }

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
            if (!this.INNER_DRAWER_IDS.includes(f.productGroupID)) continue
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
            this.deleteFilling(secIndex, idx, ci, ri, ei, grid, false)
        }

        const removed = toDelete.length > 0

        // Обновляем constraint и переукладываем оставшиеся ящики от тела вверх с отступами
        const newStartY = outerDrawer.position.y - newAvailableHeight
        const currentFillings = container.fillings

        const remaining = currentFillings.filter(f =>
            this.INNER_DRAWER_IDS.includes(f.productGroupID) &&
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

    // Контейнер, у которого есть вложенные, собственного наполнения не хранит: 2D рисует
    // содержимое вложенных, а оставшиеся записи становятся невидимыми и нередактируемыми.
    // В 3D и в корзину они при этом попадали — отсюда «фантомные» полки. Чистим их,
    // чтобы сетка вылечивалась при первом же пересчёте
    cleanupOrphanFillings(grid: GridModule) {
        const clear = (
            segment: any,
            secIndex: number,
            cellIndex: number | null,
            rowIndex: number | null,
            extraIndex: number | null,
        ) => {
            if (!segment?.fillings?.length) return

            for (let i = segment.fillings.length - 1; i >= 0; i--) {
                this.deleteFilling(secIndex, i, cellIndex, rowIndex, extraIndex, grid, false)
            }
        }

        grid.sections?.forEach((section, secIndex) => {
            if (section.cells?.length) clear(section, secIndex, null, null, null)

            section.cells?.forEach((cell, cellIndex) => {
                if (cell.cellsRows?.length) clear(cell, secIndex, cellIndex, null, null)

                cell.cellsRows?.forEach((row, rowIndex) => {
                    if (row.extras?.length) clear(row, secIndex, cellIndex, rowIndex, null)
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
                const filling = segment.fillings[i];
                // Группы из FILLINGS_WIDTH_UNRESTRICTED_GROUPS разрешены в широких областях,
                // поэтому расширение секции их не снимает
                if (FILLINGS_WIDTH_UNRESTRICTED_GROUPS.includes(+filling?.productGroupID)) {
                    continue;
                }
                if (filling?.type !== 'tsarga') {
                    this.deleteFilling(secIndex, i, cellIndex, rowIndex, extraIndex, grid, false);
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

    // Габариты модуля правятся и при установленном наполнении, поэтому после каждого
    // пересчёта сетки наполнение нужно привести к новым размерам сегментов: позиции
    // в сетке сдвинулись, а наполнение осталось на старых координатах и уезжало за
    // пределы модуля. Сначала подгоняем, и только если место не нашлось — удаляем
    cleanupInvalidFillings(grid: GridModule) {
        let removed = 0
        const touchedSections = new Set<number>()

        const processSegment = (
            segment: any,
            secIndex: number,
            cellIndex: number | null,
            rowIndex: number | null,
            extraIndex: number | null,
        ) => {
            if (!segment?.fillings?.length) {
                return
            }

            const loopZones = this.scope.LOOPS.getLoopZones(grid.sections[secIndex])

            // Удаляем в обратном порядке чтобы не сбивать индексы
            for (let i = segment.fillings.length - 1; i >= 0; i--) {
                const filling = segment.fillings[i]

                if (!filling || this.isFillingPlacedByOwner(filling)) {
                    continue
                }

                if (this.getFillingRejectReason(filling, segment, grid)) {
                    this.deleteFilling(secIndex, i, cellIndex, rowIndex, extraIndex, grid, false)
                    removed++
                    touchedSections.add(secIndex)
                    continue
                }

                if (this.refitFilling(filling, segment, secIndex, grid, loopZones)) {
                    touchedSections.add(secIndex)
                }
            }
        }

        grid.sections?.forEach((section, secIndex) => {
            processSegment(section, secIndex, null, null, null)
            section.cells?.forEach((cell, cellIndex) => {
                processSegment(cell, secIndex, cellIndex, null, null)
                cell.cellsRows?.forEach((row, rowIndex) => {
                    processSegment(row, secIndex, cellIndex, rowIndex, null)
                    row.extras?.forEach((extra, extraIndex) => {
                        processSegment(extra, secIndex, cellIndex, rowIndex, extraIndex)
                    })
                })
            })
        })

        // Раскладка фасадов ящиков и ошибки петель считаются от позиций тел наполнения,
        // поэтому пересчитываем их только там, где наполнение реально поменялось
        touchedSections.forEach(secIndex => {
            const section = grid.sections?.[secIndex]

            if (!section) {
                return
            }

            if (section.fasadesDrawers?.length || section.hiTechProfiles?.length) {
                this.scope.FASADES.EXTERNAL_FASADES.calcDrawersFasades(secIndex, false, grid)
            }

            this.scope.LOOPS.checkLoopsCollision(secIndex, grid)
        })

        if (removed) {
            this.scope.callAlert("warning", `Наполнение не поместилось в новые габариты и было удалено (${removed} шт.)`)
        }
    }

    // Позицию этих объектов задаёт не сегмент: встраиваемый ящик двигается вместе со своим
    // внешним, царга — часть конструктива секции
    private isFillingPlacedByOwner(filling: FillingObject) {
        return filling.type === 'tsarga' || !!filling.innerDrawerConstraint
    }

    // Причина, по которой наполнение больше нельзя оставить в сегменте. Набор проверок
    // повторяет установку (addFilling / createFillingDataToCheck): после изменения габаритов
    // наполнение должно проходить их так же, как при добавлении. null — наполнение валидно
    private getFillingRejectReason(filling: FillingObject, segment: any, grid: GridModule): string | null {
        // Наполнение из списка исключений ставится без ограничений по размерам области
        if (FILLINGS_RESTRICTION_EXCEPTIONS.includes(+filling.product)) {
            return null
        }

        if (segment.height <= UM_PARAMS.MIN_SECTION_TO_FILLINGS_HEIGHT) {
            return "segment"
        }

        // У полок и вертикальных разделителей своей высоты нет — их тянет по сегменту updateFilling
        const isStretched = filling.isVerticalItem || filling.type === 'shelf' || filling.type === 'glass_shelf'
        if (!isStretched && !filling.isProfile && filling.height > segment.height) {
            return "height"
        }

        // Допустимый диапазон позиций схлопнулся: у ящика с фасадом он учитывает и фасад,
        // который в низкий сегмент может не поместиться даже при влезающем теле
        if (!isStretched && !filling.isProfile) {
            const min = this.calcMinMaxPositionY("min", filling, segment, grid)
            const max = this.calcMinMaxPositionY("max", filling, segment, grid)

            if (max < min) {
                return "fit"
            }
        }

        const product = this.scope.APP?.CATALOG?.PRODUCTS?.[filling.product]

        // Товара нет в каталоге (например, снят с производства) — габариты проверить нечем,
        // такое наполнение разбирает резолвер удалённых материалов, а не уборка
        if (!product) {
            return null
        }

        // Как и при установке (createFillingDataToCheck): глубину проверяем только у того,
        // что ставится поперёк модуля — вертикальный разделитель её не занимает
        const isSlidingDoors = grid.fasades?.length ? 100 : 0
        if (!filling.isVerticalItem && product.ACTUAL_DEPT && product.ACTUAL_DEPT > grid.depth - isSlidingDoors) {
            return "depth"
        }

        if (UM_DRAWERS_IDS.UNIVERSAL.includes(+filling.productGroupID)) {
            const minDepth = product.SIZE_EDIT_DEPTH?.length
                ? Math.min(...product.SIZE_EDIT_DEPTH) + 7
                : 0

            if (grid.depth < minDepth) {
                return "depth"
            }
        }

        return null
    }

    // Возвращает наполнение в границы сегмента и подгоняет глубину. Эталон вертикальной
    // позиции — distances.bottom (отступ от дна своего сегмента): сам сегмент после
    // пересчёта мог сместиться, поэтому координату 2D-слоя выводим из отступа заново
    private refitFilling(
        filling: FillingObject,
        segment: any,
        secIndex: number,
        grid: GridModule,
        loopZones: LoopZone[],
    ): boolean {
        let changed = this.refitFillingDepth(filling, grid)

        // Г-образный профиль стоит на дне модуля, а не в сегменте: его высоту задаёт цоколь
        if (filling.isProfile?.isBottomHiTechProfile) {
            const bottomProfileY = grid.height - grid.horizont - filling.height

            if (filling.position.y !== bottomProfileY) {
                filling.position.y = bottomProfileY
                changed = true
            }

            return changed
        }

        const min = this.calcMinMaxPositionY("min", filling, segment, grid)
        const max = this.calcMinMaxPositionY("max", filling, segment, grid)

        // Где наполнение стоит сейчас, считаем по координатам сетки: distances пересчитывает
        // 2D-слой при отрисовке, и после пересчёта сегментов они описывают прежнюю геометрию
        const actual = this.calcDistanceBottom(filling, segment, grid)

        // Вышло за сегмент — возвращаем на прежний отступ от дна (distances.bottom, эталон
        // позиции), ужатый до новых границ. Округляем в точности distances — целые мм
        let bottom = (actual < min || actual > max)
            ? Math.round(Math.max(min, Math.min(filling.distances?.bottom ?? actual, max)))
            : actual

        const freeBottom = this.findBottomOutOfLoops(filling, segment, grid, loopZones, bottom, min, max)
        if (freeBottom !== null) {
            bottom = Math.round(freeBottom)
        }

        // Наполнение в границах и петлям не мешает — не трогаем его вовсе: иначе каждый
        // reset сдвигал бы его на погрешность между координатами сетки и 2D-слоя
        if (bottom === actual) {
            return changed
        }

        const positionY = Math.round(this.calcPositionYFromBottom(filling, segment, grid, bottom))

        if (positionY !== filling.position.y) {
            const delta = filling.position.y - positionY //Насколько наполнение сдвинулось вверх

            filling.position.y = positionY
            this.shiftInnerDrawers(filling, segment, delta)

            if (filling.fasade) {
                filling.fasade.position.y = grid.height - (filling.position.y + filling.height + filling.fasade.manufacturerOffset)
                this.syncDrawerFasade(secIndex, filling, grid)
            }

            changed = true
        }

        this.setDistanceBottom(filling, segment, bottom)

        return changed
    }

    // Обратное преобразование calcDistanceBottom: из отступа от дна сегмента в координату
    // 2D-слоя (отсчёт от верха модуля вниз)
    private calcPositionYFromBottom(
        filling: FillingObject,
        segment: any,
        grid: GridModule,
        bottom: number,
    ) {
        const noBottomShift = grid.noBottom ? grid.moduleThickness : 0

        return grid.height - segment.position.y - bottom - filling.height + noBottomShift
    }

    // Низ наполнения от пола модуля — система, в которой заданы зоны петель
    private calcAbsoluteBottom(segment: any, grid: GridModule, bottom: number) {
        const noBottomShift = grid.noBottom ? grid.moduleThickness : 0

        return segment.position.y + bottom - noBottomShift
    }

    private calcBottomFromAbsolute(segment: any, grid: GridModule, absoluteBottom: number) {
        const noBottomShift = grid.noBottom ? grid.moduleThickness : 0

        return absoluteBottom - segment.position.y + noBottomShift
    }

    // Глубина наполнения привязана к глубине модуля: регулируемое тянется за ней,
    // универсальный ящик встаёт только в размер из собственного списка SIZE_EDIT_DEPTH
    private refitFillingDepth(filling: FillingObject, grid: GridModule): boolean {
        const product = this.scope.APP?.CATALOG?.PRODUCTS?.[filling.product]

        if (!product) {
            return false
        }

        let depth = null

        if (UM_DRAWERS_IDS.UNIVERSAL.includes(+filling.productGroupID)) {
            const current = filling.depth ?? filling.size?.z

            if (current > grid.depth - 7) {
                depth = this.getUniversalDrawerSizes(product, grid).depth ?? null
            }
        }
        else if (product.SIZE_EDIT_DEPTH_MAX) {
            depth = grid.depth

            const moduleProductInfo = this.scope.APP.CATALOG.PRODUCTS[grid.productID]
            if (moduleProductInfo?.moduleType?.CODE === "wardrobe") {
                depth -= 100
            }
        }

        if (depth === null || depth === undefined || filling.size?.z === depth) {
            return false
        }

        if (filling.size) {
            filling.size.z = depth
        }

        if (filling.depth !== undefined) {
            filling.depth = depth
        }

        return true
    }

    // Встраиваемые ящики живут в пространстве фасада внешнего и двигаются вместе с ним
    private shiftInnerDrawers(filling: FillingObject, segment: any, delta: number) {
        if (!delta || !this.OUTER_DRAWER_IDS.includes(filling.productGroupID)) {
            return
        }

        segment.fillings?.forEach(inner => {
            if (!this.INNER_DRAWER_IDS.includes(inner?.productGroupID)) {
                return
            }

            if (inner.innerDrawerConstraint?.outerDrawerGroupId !== filling.innerDrawerGroupId) {
                return
            }

            inner.position.y = (inner.position.y || 0) - delta

            if (inner.distances) {
                inner.distances.bottom = (inner.distances.bottom || 0) + delta
            }

            if (inner.innerDrawerConstraint) {
                inner.innerDrawerConstraint.startY = filling.position.y - inner.innerDrawerConstraint.height
            }
        })
    }

    // После ресайза петли могли оказаться на наполнении. Ищем ближайшее смещение по вертикали,
    // где наполнение не задевает ни петли, ни соседей. Не нашли — возвращаем null и оставляем
    // наполнение на месте: пересечение подсветит checkLoopsCollision как ошибку петель
    private findBottomOutOfLoops(
        filling: FillingObject,
        segment: any,
        grid: GridModule,
        loopZones: LoopZone[],
        bottom: number,
        min: number,
        max: number,
    ): number | null {
        if (!loopZones?.length) {
            return null
        }

        // Полки и разделители занимают сегмент целиком, двигать их некуда
        if (filling.isVerticalItem || filling.type === 'shelf' || filling.type === 'glass_shelf' || filling.isProfile) {
            return null
        }

        if (this.scope.LOOPS.isFillingExcludedFromCollision(filling, 'loop', grid)) {
            return null
        }

        if (!this.hasLoopOverlap(filling, segment, grid, loopZones, bottom)) {
            return null
        }

        const candidates = []
        loopZones.forEach(zone => {
            candidates.push(this.calcBottomFromAbsolute(segment, grid, zone.maxY)) //Над петлёй
            candidates.push(this.calcBottomFromAbsolute(segment, grid, zone.minY - filling.height)) //Под петлёй
        })

        const fitting = candidates
            .filter(value => value >= min && value <= max)
            .filter(value => !this.hasLoopOverlap(filling, segment, grid, loopZones, value))
            .filter(value => !this.hasNeighbourOverlap(filling, segment, grid, value))
            .sort((a, b) => Math.abs(a - bottom) - Math.abs(b - bottom))

        return fitting.length ? fitting[0] : null
    }

    private hasLoopOverlap(
        filling: FillingObject,
        segment: any,
        grid: GridModule,
        loopZones: LoopZone[],
        bottom: number,
    ) {
        const absoluteBottom = this.calcAbsoluteBottom(segment, grid, bottom)
        const absoluteTop = absoluteBottom + filling.height
        const left = filling.position.x
        const right = filling.position.x + filling.width

        // Границы включены — тот же расчёт, что в LoopsManager.checkLoopsCollision
        return loopZones.some(zone =>
            zone.minY <= absoluteTop && zone.maxY >= absoluteBottom &&
            ((zone.minX <= right && zone.maxX >= right) || (zone.minX <= left && zone.maxX >= left))
        )
    }

    private hasNeighbourOverlap(filling: FillingObject, segment: any, grid: GridModule, bottom: number) {
        const top = bottom + filling.height

        return (segment.fillings ?? []).some(other => {
            if (!other || other === filling || this.INNER_DRAWER_IDS.includes(other.productGroupID)) {
                return false
            }

            const otherBottom = this.calcDistanceBottom(other, segment, grid)

            return otherBottom < top && (otherBottom + other.height) > bottom
        })
    }
}