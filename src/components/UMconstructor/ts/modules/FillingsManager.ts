//@ts-nocheck

import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import * as THREE from "three";
import {
    GridModule,
    FillingObject,
} from "@/components/UMconstructor/types/UMtypes.ts";
import { UM_DRAWERS_IDS, UM_PARAMS } from "../../utils/Const";
import {
    FILLING_TYPE_BY_GROUP_ID,
    classifyFillingType,
    isHiTechProfile as checkHiTechProfile,
    isBottomHiTechProfile as checkBottomHiTechProfile,
} from "./fillings/FillingTypePredicates.ts";
import FillingsCore from "./fillings/FillingsCore.ts";
import DrawerFillingHandler from "./fillings/DrawerFillingHandler.ts";
import ShelfFillingHandler from "./fillings/ShelfFillingHandler.ts";
import ProfileFillingHandler from "./fillings/ProfileFillingHandler.ts";

type TCollisionExclusionRule = {
    prop: string
    values: any[],
    collisionWith: string
    condition?: (grid: GridModule) => boolean
}

type TloopCollisionExclusion = TCollisionExclusionRule[]

// Тонкий фасад над наполнением: общая логика (обход дерева, позиционирование,
// коллизии) вынесена в FillingsCore, type-specific логика — в DrawerFillingHandler/
// ShelfFillingHandler/ProfileFillingHandler (см. план рефакторинга,
// C:\Users\MG_GO.MG\.claude\plans\iterative-launching-lerdorf.md, Фаза 1).
// Отдельного AccessoryFillingHandler нет: у аксессуаров ("any") сегодня нет
// собственной логики сверх общего пути размещения в addFilling/FillingsCore.
// Публичные имена/сигнатуры сохраняются один в один — на этот класс завязаны
// внешние вызовы из ShelvesManager/SectionsManager/ExternalFasadesManager/
// FillingsView.vue/FillingsInsertPanel.vue/ModuleSizeView.vue.
export default class FillingsManager {
    scope: UMconstructorClass
    FILLING_TYPES: Map<string, string>
    core: FillingsCore
    drawers: DrawerFillingHandler
    shelves: ShelfFillingHandler
    profiles: ProfileFillingHandler

    private loopCollisionExclusion: TloopCollisionExclusion = [
        {
            prop: 'productGroupID',
            values: [6174300, 15222587, 6513322], //2166309
            collisionWith: 'loop'
        },
        {
            // 2166308 исключается из коллизий петель только для НЕ-распашного шкафа.
            // Для распашного (RASPASHNOY_ID) — участвует в коллизии.
            prop: 'productGroupID',
            values: [2166308],
            collisionWith: 'loop',
            condition: (grid) => grid.productID !== UM_PARAMS.RASPASHNOY_ID
        }
    ]
    private readonly OUTER_DRAWER_IDS: number[] = UM_DRAWERS_IDS.OUTER
    private readonly INNER_DRAWER_IDS: number[] = UM_DRAWERS_IDS.INNER

    constructor(scope: UMconstructorClass) {
        this.scope = scope
        this.FILLING_TYPES = new Map(Object.entries(FILLING_TYPE_BY_GROUP_ID))
        this.core = new FillingsCore(scope)
        this.drawers = new DrawerFillingHandler(scope, this.core)
        this.shelves = new ShelfFillingHandler(scope, this.core)
        this.profiles = new ProfileFillingHandler(scope, this.core)
    }

    // Регистрирует правила исключения коллизий в LoopsManager.
    // Вызывается из UMconstructorClass после инициализации обоих менеджеров,
    // а также заново при каждом addFilling (см. ниже) — сохраняем существующее поведение.
    public initCollisionRules(): void {
        this.registerLoopCollisionExclusion()
    }

    registerLoopCollisionExclusion(): void {
        this.scope.LOOPS.addCollisionExclusionRule(this.loopCollisionExclusion)
    }

    // --- Делегация в FillingsCore (общая для всех типов наполнения логика) ---

    existFilling(...args: Parameters<FillingsCore["existFilling"]>) {
        return this.core.existFilling(...args)
    }

    updateFilling(...args: Parameters<FillingsCore["updateFilling"]>) {
        return this.core.updateFilling(...args)
    }

    checkLoopsCollision(...args: Parameters<FillingsCore["checkLoopsCollision"]>) {
        return this.core.checkLoopsCollision(...args)
    }

    selectCell(...args: Parameters<FillingsCore["selectCell"]>) {
        return this.core.selectCell(...args)
    }

    createFillingDataToCheck(...args: Parameters<FillingsCore["createFillingDataToCheck"]>) {
        return this.core.createFillingDataToCheck(...args)
    }

    syncDrawerFasade(...args: Parameters<FillingsCore["syncDrawerFasade"]>){
        return this.core.syncDrawerFasade(...args)
    }

    clearFillings(...args: Parameters<FillingsCore["clearFillings"]>) {
        return this.core.clearFillings(...args)
    }

    getFillingObject(...args: Parameters<FillingsCore["getFillingObject"]>) {
        return this.core.getFillingObject(...args)
    }

    calcMinMaxPositionY = (...args: Parameters<FillingsCore["calcMinMaxPositionY"]>) => {
        return this.core.calcMinMaxPositionY(...args)
    }

    getAbsolutePositionY(...args: Parameters<FillingsCore["getAbsolutePositionY"]>) {
        return this.core.getAbsolutePositionY(...args)
    }

    getLocalPositionY(...args: Parameters<FillingsCore["getLocalPositionY"]>) {
        return this.core.getLocalPositionY(...args)
    }

    changeFillingPositionX(...args: Parameters<FillingsCore["changeFillingPositionX"]>) {
        return this.core.changeFillingPositionX(...args)
    }

    changeFillingPositionY(...args: Parameters<FillingsCore["changeFillingPositionY"]>) {
        return this.core.changeFillingPositionY(...args)
    }

    updateSecAfterDelete(...args: Parameters<FillingsCore["updateSecAfterDelete"]>) {
        return this.core.updateSecAfterDelete(...args)
    }

    cleanupOversizedFillings(...args: Parameters<FillingsCore["cleanupOversizedFillings"]>) {
        return this.core.cleanupOversizedFillings(...args)
    }

    // --- Оркестрация размещения/удаления наполнения: генерика вперемешку с
    // короткими вызовами в drawers/shelves/profiles там, где раньше был
    // инлайновый код на конкретный тип (см. DrawerFillingHandler.ts,
    // ShelfFillingHandler.ts, ProfileFillingHandler.ts) ---

    getInnerDrawerSpace(outerDrawer: any, fasadeHeight?: number): number {
        if (!outerDrawer.fasade) return outerDrawer.height
        const height = fasadeHeight ?? outerDrawer.fasade.height
        return height - outerDrawer.fasade.manufacturerOffset - outerDrawer.height
    };

    addFilling(
        _product: any,
        productGroupID: number,
        grid: GridModule = this.scope.UM_STORE.getUMGrid(),
    ) {

        console.log(_product, '_product')

        if (!this.drawers.validateUniversalDrawerDepth(_product, productGroupID, grid)) {
            return;
        }

        const product = Object.assign({}, _product);
        product.productGroupID = productGroupID;
        const { sec, cell, row, extra } = this.scope.UM_STORE.getSelected("module")
        const isHiTechProfile = checkHiTechProfile(product, this.scope.APP)
        const isBottomHiTechProfile = checkBottomHiTechProfile(isHiTechProfile, product, this.scope.APP)
        const PROPS = this.scope.UM_STORE.getUMData();

        let name = product.NAME?.toLowerCase()
        let _type = classifyFillingType(name, productGroupID, this.FILLING_TYPES)

        const isVerticalItem = _type === "vertical_shelf"

        const currentSection = grid.sections[sec];

        if (!currentSection) {
            this.scope.callAlert("warning", "Необходимо выбрать секцию");
            return;
        }

        if (!this.drawers.validateFullWidthDrawerPlacement(productGroupID, cell, row, extra, currentSection)) {
            return;
        }

        if (this.INNER_DRAWER_IDS.includes(productGroupID) && grid.productID !== UM_PARAMS.RASPASHNOY_ID) {
            this.drawers.addInnerDrawer(product, productGroupID, grid, sec, cell, row, extra, _type)
            return
        }

        const currentCell = currentSection.cells?.[cell];
        const currentRow = currentCell?.cellsRows?.[row];
        const currentExtra = currentRow?.extras?.[extra];

        let currentModuleSegment = currentExtra || currentRow || currentCell || currentSection

        if (currentModuleSegment.width > UM_PARAMS.FILLINGS_MAX_WIDTH) {
            this.scope.callAlert("error", `Нельзя добавить наполнение: ширина области (${currentModuleSegment.width} мм) превышает ${UM_PARAMS.FILLINGS_MAX_WIDTH} мм`)
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

        if (!this.profiles.validatePlacement(isHiTechProfile, isBottomHiTechProfile, grid, row, extra)) {
            return;
        }

        let currentFillingsArray = []

        this.shelves.normalizeDimensions(product, _type, grid)

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
            const profileGeometry = this.profiles.computeProfileGeometry(product, isBottomHiTechProfile, grid, PROPS, startFillingData, currentSection, width)
            width = profileGeometry.width
            height = profileGeometry.height
            profileData = profileGeometry.profileData
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


        if (UM_DRAWERS_IDS.UNIVERSAL.includes(productGroupID) && product.DROWER_FASADE_HEIGHT) {
            const heightOptions = Object.keys(product.DROWER_FASADE_HEIGHT).map(Number);
            const firstHeight = heightOptions[0];
            if (firstHeight !== undefined) {
                fillingObject.height = firstHeight;
                fillingObject.size.y = firstHeight;
            }
            const maxAllowedDepth = grid.depth - 7;
            const availableDepths = (product.SIZE_EDIT_DEPTH ?? []).filter((d: number) => d <= maxAllowedDepth);
            const firstDepth = availableDepths[0];
            if (firstDepth !== undefined) {
                fillingObject.depth = firstDepth;
                fillingObject.size.z = firstDepth;
            }
        }

        if (isHiTechProfile) {
            this.profiles.finalizeProfile(fillingObject, profileData, sec, currentSection, currentFillingsArray, grid)
        } else
            currentFillingsArray.push(fillingObject);

        if (product.MIN_FASADE_SIZE) {
            this.drawers.attachFasade(fillingObject, product, productGroupID, sec, cell, row, currentSection, grid, startFillingData)
        }

        this.scope.LOOPS.addCollisionExclusionRule(this.loopCollisionExclusion)

        this.scope.reset(grid)
        this.selectCell(sec, cell, row, extra, null);
    };

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
            this.drawers.beforeDeleteFasade(curItemFasade, sec, grid)
        }

        if (curItemProfile) {
            this.profiles.beforeDeleteProfile(curItemProfile, sec)
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
            this.drawers.cascadeDeleteInnerDrawers(curItem, curRow)
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

    // --- Делегация в DrawerFillingHandler (специфичные для ящиков операции) ---

    changeDrawerFasade(...args: Parameters<DrawerFillingHandler["changeDrawerFasade"]>) {
        return this.drawers.changeDrawerFasade(...args)
    }

    changeUniversalDepth(...args: Parameters<DrawerFillingHandler["changeUniversalDepth"]>) {
        return this.drawers.changeUniversalDepth(...args)
    }

    changeUniversalHeight(...args: Parameters<DrawerFillingHandler["changeUniversalHeight"]>) {
        return this.drawers.changeUniversalHeight(...args)
    }
}
