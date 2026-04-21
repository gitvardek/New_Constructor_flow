//@ts-nocheck

import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import * as THREE from "three";
import {
    GridModule,
    TSelectedCell,
    DrawerFasadeObject,
    FillingObject,
    MANUFACTURER
} from "@/components/UMconstructor/types/UMtypes.ts";
import {TFasadeProp} from "@/types/types.ts";

export default class FillingsManager {
    scope: UMconstructorClass
    FILLING_TYPES: Map<string, string>

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

    existFilling(grid: GridModule) {
        let check = false;
        if (grid) {
            grid.sections?.forEach(section => {

                if (section.cells.length > 0) {
                    section.cells.forEach(cell => {

                        if(cell.cellsRows?.length > 0) {
                            cell.cellsRows?.forEach((cellRow) => {

                                if(cellRow.extras?.length > 0) {
                                    cellRow.extras?.forEach((extra) => {
                                        if(extra.fillings?.length > 0) {
                                            check = true;
                                        }
                                    })
                                }

                                if(cellRow.fillings?.length > 0) {
                                    check = true;
                                }
                            })
                        }

                        if(cell.fillings?.length > 0) {
                            check = true;
                        }
                    })
                }

                if(section.fillings?.length > 0) {
                    check = true;
                }
            })

            return check;
        }
        else {
            return check;
        }
    }

    updateFilling(
        value: number,
        currentfilling: FillingObject,
        type: string,
        grid: GridModule = this.scope.UM_STORE.getUMGrid(),
    ) {
        const {sec, cell, row, extra, item} = currentfilling
        const {MAX_SECTION_WIDTH, MIN_SECTION_WIDTH} = this.scope.CONST

        const section = grid.sections[sec];
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
        this.scope.selectCell("fillings", <TSelectedCell>{sec, cell, row, extra, item});
    };

    createFillingDataToCheck(
        product,
        currentSpace,
        grid: GridModule = this.scope.UM_STORE.getUMGrid(),
        isVerticalItem = false,
        isDrawer = false
    ) {

        let width = product.width
        let height = product.height
        let isSlidingDoors = grid.fasades ? 100 : 0

        if (!isVerticalItem && (height > currentSpace.height || product.ACTUAL_DEPT > grid.depth - isSlidingDoors)) {
            return false
        }

        if (isVerticalItem) {
            height = currentSpace.height;
        } else if (width !== currentSpace.width)
            width = currentSpace.width;

        let tempFilling = {
            width,
            height,
            data: product,
            isVerticalItem,
            isDrawer,
        };

        return this.scope.RENDER_REF.checkPositionFillingToCreate(tempFilling);
    };

    addFilling(
        _product: any,
        productGroupID: number,
        grid: GridModule = this.scope.UM_STORE.getUMGrid(),
    ) {

        const product = Object.assign({}, _product);
        const {sec, cell, row, extra} = this.scope.UM_STORE.getSelected("module")
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
        const currentCell = currentSection.cells?.[cell];
        const currentRow = currentCell?.cellsRows?.[row];
        const currentExtra = currentRow?.extras?.[extra];

        let currentModuleSegment = currentExtra || currentRow || currentCell || currentSection

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
            if(grid.profilesConfig?.sideProfile) {
                this.scope.callAlert("error", "Нельзя добавить горизонтальный профиль вместе с боковым!")
                return;
            }
            if(row || extra) {
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
                grid.profilesConfig = {COLOR: product.COLOR[0] != null ? product.COLOR[0] : grid.moduleColor}
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
        };


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
            if (!currentSection.fasadesDrawers)
                currentSection.fasadesDrawers = []

            const leftWidth = grid.leftWallThickness || grid.moduleThickness;
            const rightWidth = grid.rightWallThickness || grid.moduleThickness;

            const correctSectionFasadeWidth =
                grid.sections.length > 1 ?
                    sec > 0 && sec < grid.sections.length - 1 ? currentSection.width + grid.moduleThickness - 4 :
                        currentSection.width + ((sec == 0 ? leftWidth : rightWidth) - 2) + (grid.moduleThickness / 2 - 2) :
                    grid.width - 4;

            let baseFasade = grid.sections[sec]?.fasades?.[0]?.[0] || grid.sections[0]?.fasades?.[0]?.[0] || currentSection.fasadesDrawers?.[0]

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
                    HANDLES: {...baseFasade.material.HANDLES}
                },
                type: "fasade",
                manufacturerOffset,
                item: fillingObject.id,
                sec,
                cell,
                row,
            }


            currentSection.fasadesDrawers.push(fillingObject.fasade);
            this.scope.FASADES.EXTERNAL_FASADES.calcDrawersFasades(sec, false, grid)
            this.scope.callAlert('warning', 'Проверьте корректность рассчитанной позиции ящика!')
        }

        this.selectCell(sec, cell, row, extra, currentFillingsArray.length - 1);
        this.scope.reset(grid)
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
        const curCell = curSection.cells?.[cell];
        const curRow = curCell?.cellsRows?.[row];
        const curExtra = curRow?.extras?.[extra];

        const currentSpace = curExtra || curRow || curCell || curSection;

        return currentSpace.fillings[item];
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

        if (curItemFasade || curItemProfile) {
            if (!sec.fasadesDrawers?.length)
                delete sec.fasadesDrawers

            if (!sec.hiTechProfiles?.length)
                delete sec.hiTechProfiles

            this.scope.FASADES.EXTERNAL_FASADES.calcDrawersFasades(secIndex, false, grid)
        }

        if (reset)
            this.scope.reset(grid)
    };

    changeFillingPositionX(
        event: Event,
        _value: number,
        key: number,
        secIndex: number,
        cellIndex: number | null = null,
        rowIndex: number | null = null,
        extraIndex: number | null = null,
        grid: GridModule = this.scope.UM_STORE.getUMGrid(),
    ) {
        this.scope.debounce("changeFillingPositionX", () => {
            let value = Math.min(+_value, +event.target.max);
            value = Math.max(+value, +event.target.min);

            this.selectCell(secIndex, cellIndex, rowIndex, extraIndex, key);

            const sec = grid.sections[secIndex];
            const currentColl = sec.cells?.[cellIndex];
            const currentRow = currentColl?.cellsRows?.[rowIndex];
            const currentExtra = currentRow?.extras?.[extraIndex];

            const current = currentExtra || currentRow || currentColl || sec;

            const currentfilling = current.fillings[key];

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

    changeFillingPositionY(
        event: Event,
        _value: number,
        key: number,
        secIndex: number,
        cellIndex: number | null = null,
        rowIndex: number | null = null,
        extraIndex: number | null = null,
        grid: GridModule = this.scope.UM_STORE.getUMGrid(),
    ) {
        this.scope.debounce("changeFillingPositionY", () => {
            let value = Math.min(+_value, +event.target.max);
            value = Math.max(+value, +event.target.min);

            this.selectCell(secIndex, cellIndex, rowIndex, extraIndex, key);

            const sec = grid.sections[secIndex];
            const currentColl = sec.cells?.[cellIndex];
            const currentRow = currentColl?.cellsRows?.[rowIndex];
            const currentExtra = currentRow?.extras?.[extraIndex];

            const current = currentExtra || currentRow || currentColl || sec;

            const currentfilling = current.fillings[key];

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
            if(currentfilling.fasade){
                tmpFasade = currentfilling.fasade
                delete currentfilling.fasade
            }

            delete currentfilling.sector

            const fillingData = JSON.parse(JSON.stringify(currentfilling));
            fillingData.position.y = newValue;
            fillingData.sector = tmpSector;

            if(tmpFasade)
                fillingData.fasade = tmpFasade;

            const pixiSector = current.sector;

            // Проверяем коллизию
            const check = this.scope.SHAPE_ADJUSTER.checkToCollision(pixiSector, false, fillingData);

            if (check) {
                currentfilling.position.y = newValue;
                currentfilling.distances.bottom = +value
            } else {
                this.scope.callAlert("error", `Нельзя изменить позицию на ${+_value}`)
                currentfilling.position.y = prevValue;
                currentfilling.distances.bottom = prevValueBottom;
            }

            currentfilling.sector = tmpSector;

            if(tmpFasade)
                currentfilling.fasade = tmpFasade;

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
            }
            else {
                this.scope.LOOPS.checkLoopsCollision(secIndex, grid)
            }

            this.scope.reset(grid)
        }, 1000)
    };

    changeDrawerFasade(
        event: Event,
        value: number,
        key: number,
        secIndex: number,
        cellIndex: number | null = null,
        rowIndex: number | null = null,
        grid: GridModule = this.scope.UM_STORE.getUMGrid(),
    ) {
        this.scope.debounce("changeDrawerFasade", () => {
            this.selectCell(secIndex, cellIndex, rowIndex, null, key);

            const sec = grid.sections[secIndex];
            const currentColl = sec.cells?.[cellIndex];
            const currentRow = currentColl?.cellsRows?.[rowIndex] || currentColl || sec;

            const currentfilling = currentRow.fillings[key];

            if (!currentfilling?.fasade) {
                this.scope.callAlert("error", `У элемента нет фасада!`)
                return
            }

            const prevValue = currentfilling.fasade.height; //Предыдущее значение
            const newValue = +value

            let tmpSector = currentfilling.sector
            let tmpFasade = currentfilling.fasade

            delete currentfilling.sector
            delete currentfilling.fasade

            const fillingData = JSON.parse(JSON.stringify(currentfilling));
            fillingData.sector = tmpSector;
            fillingData.fasade = tmpFasade;
            fillingData.fasade.height = newValue;

            const pixiSector = currentRow.sector;

            // Проверяем коллизию
            const check = this.scope.SHAPE_ADJUSTER.checkToCollision(pixiSector, false, fillingData);

            currentfilling.sector = tmpSector;
            currentfilling.fasade = tmpFasade;
            if (check) {
                currentfilling.fasade.height = newValue;
            } else {
                currentfilling.fasade.height = prevValue;
                this.scope.callAlert('error',"Ошибка! Размер фасада слишком велик!")
                this.scope.callAlert('warning', 'Проверьте корректность позиции ящика!')
            }

            this.scope.FASADES.EXTERNAL_FASADES.calcDrawersFasades(secIndex, false, grid)
            this.scope.reset(grid)
        }, 1000)
    };
}