//@ts-nocheck

import FasadesManager from "@/components/UMconstructor/ts/modules/FasadesManager.ts";
import {UM_PARAMS} from "./../utils/Const.ts";
import FillingsManager from "@/components/UMconstructor/ts/modules/FillingsManager.ts";
import ProfilesManager from "@/components/UMconstructor/ts/modules/ProfilesManager.ts";
import SidecolorsManager from "@/components/UMconstructor/ts/modules/SidecolorsManager.ts";
import SectionsManager from "@/components/UMconstructor/ts/modules/SectionsManager.ts";
import LoopsManager from "@/components/UMconstructor/ts/modules/LoopsManager.ts";
import {useUMStorage} from "@/store/appStore/UniversalModule/useUMStorage.ts";
import {useAppData} from "@/store/appliction/useAppData.ts";
import {useToast} from "@/features/toaster/useToast.ts";
import {Ref, ref} from "vue";

import {saveUMGrid, ShapeAdjuster} from "@/components/UMconstructor/utils/PixiMethods.ts";
import {
    alertType,
    constructorMode,
    FillingObject,
    GridCell,
    GridCellsRow,
    GridModule,
    GridRowExtra,
    GridSection, TSelectedCell
} from "./../types/UMtypes.ts";
import {TTotalProps} from "@/types/types.ts";

import * as THREE from "three";
import {FasadeObject, LOOPSIDE} from "@/types/constructor2d/interfaсes.ts";
import {TFasadeProp} from "@/types/types.ts";
import {UniversalGeometryBuilder} from "@/Application/Meshes/UniversalModuleUtils/UniversalGeometryBuilder.ts";
import OptionsManager from "@/components/UMconstructor/ts/modules/OptionsManager.ts";
import {useModelState} from "@/store/appliction/useModelState.ts";
import Render2D from "@/components/UMconstructor/views/Render2D.vue";
import {Application} from "@/Application/Core/Application.ts";
import UMconstructor from "@/components/UMconstructor/UMconstructor.vue";

export default class UMconstructorClass {
    UM_STORE: ReturnType<typeof useUMStorage> = useUMStorage();
    APP: ReturnType<typeof useAppData> = useAppData().getAppData;
    MODEL_STATE: ReturnType<typeof useModelState> = useModelState();
    CONST: typeof UM_PARAMS
    BUILDER: ReturnType<typeof UniversalGeometryBuilder.buildProduct>;
    AlERT: ReturnType<typeof useToast> = useToast();
    FASADES: FasadesManager
    FILLINGS: FillingsManager
    LOOPS: LoopsManager
    PROFILES: ProfilesManager
    SECTIONS: SectionsManager
    SIDECOLORS: SidecolorsManager
    SHAPE_ADJUSTER: ShapeAdjuster
    OPTIONS: OptionsManager
    RENDER_REF: Ref<typeof Render2D | undefined> = ref<typeof Render2D>()
    ALERT_FOOTER_REF: Ref = ref()
    DEBOUNCES: {}

    constructor() {
        this.CONST = UM_PARAMS
        this.BUILDER = new UniversalGeometryBuilder(<Application>{}).buildProduct

        this.FASADES = new FasadesManager(this)
        this.FILLINGS = new FillingsManager(this)
        this.LOOPS = new LoopsManager(this)
        this.PROFILES = new ProfilesManager(this)
        this.SECTIONS = new SectionsManager(this)
        this.SIDECOLORS = new SidecolorsManager(this)
        this.SHAPE_ADJUSTER = new ShapeAdjuster({scope: this})
        this.OPTIONS = new OptionsManager(this)
        this.DEBOUNCES = {}
    }

    selectCell(type: constructorMode, newSelected: TSelectedCell) {
        this.UM_STORE.setSelected(type, newSelected);
        this.RENDER_REF.selectCell( type, newSelected);
    };

    debounce(timerKey: string, callback: Function, wait: number) {
        if (this.DEBOUNCES[timerKey]) {
            clearTimeout(this.DEBOUNCES[timerKey])
        }

        this.DEBOUNCES[timerKey] = setTimeout(() => {
            callback();
            delete this.DEBOUNCES[timerKey]
        }, wait)
    }

    createUMgrid(productData: TTotalProps, size: {width: number, height: number, depth: number}) {
        if (productData) {
            const {
                MIN_FASADE_HEIGHT,
                MIN_FASADE_WIDTH,
                MAX_FASADE_WIDTH,
                MAX_SLIDE_DOOR_WIDTH,
                MIN_SLIDE_DOOR_WIDTH,
            } = this.CONST;

            const PROPS = productData.PROPS;
            const {width, height, depth} = size;
            let result

            if (!PROPS.CONFIG.MODULEGRID || !Object.keys(PROPS.CONFIG.MODULEGRID).length) {

                let FASADE = PROPS.CONFIG.FASADE_POSITIONS[0]
                let FASADE_PROPS = PROPS.CONFIG.FASADE_PROPS[0]
                let fasadeColor = this.APP.FASADE[FASADE_PROPS.COLOR]
                let fasadePosition = this.APP.FASADE_POSITION[FASADE_PROPS.POSITION];
                fasadePosition = this.BUILDER.expressionsReplace(fasadePosition,
                    Object.assign(PROPS.CONFIG.EXPRESSIONS,
                        {
                            "#X#": width,
                            "#Y#": height - PROPS.CONFIG.EXPRESSIONS["#HORIZONT#"],
                            "#Z#": depth,
                        }))

                const isSlidingDoors = PROPS.CONFIG.isSlideDoor;
                let fasades;

                let section: GridSection = {
                    number: 1,
                    width: width - PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"] * 2,
                    height: height - PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"] * 2 - PROPS.CONFIG.EXPRESSIONS["#HORIZONT#"],
                    cells: [],
                    type: "section",
                    position: new THREE.Vector2(PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"] + (width - PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"] * 2) / 2,
                        PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"] + PROPS.CONFIG.EXPRESSIONS["#HORIZONT#"]),
                }

                let _module: GridModule = {
                    width,
                    height,
                    depth,
                    moduleColor: PROPS.CONFIG.MODULE_COLOR,
                    moduleThickness: PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"] || 18,
                    leftWallThickness: PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"] || 18,
                    rightWallThickness: PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"] || 18,
                    horizont: PROPS.CONFIG.EXPRESSIONS["#HORIZONT#"] || 0,
                    sections: [section],
                    type: "module",
                    productID: productData.globalData,
                    isSlidingDoors,
                }

                if(PROPS.CONFIG.isHiTech)
                    _module.isHiTech = true

                if(PROPS.CONFIG.isRestrictedModule)
                    _module.isRestrictedModule = true

                result = _module

                if (isSlidingDoors) {
                    let FASADE_PROPS_2 = PROPS.CONFIG.FASADE_PROPS[1]

                    fasadePosition = this.FASADES.calcSlideDoor(FASADE_PROPS.POSITION, 1)
                    let fasadePosition2 = this.FASADES.calcSlideDoor(FASADE_PROPS_2.POSITION, 2)

                    fasades = [
                        [
                            <FasadeObject>{
                                id: 1,
                                width: fasadePosition.FASADE_WIDTH,
                                height: fasadePosition.FASADE_HEIGHT,
                                position: new THREE.Vector3(fasadePosition.POSITION_X, fasadePosition.POSITION_Y, fasadePosition.POSITION_Z),
                                material: <TFasadeProp>{
                                    ...FASADE_PROPS
                                },
                                type: "fasade",
                                minY: MIN_FASADE_HEIGHT,
                                maxY: fasadeColor.MAX_HEIGHT || fasadePosition.FASADE_HEIGHT,
                                maxX: MAX_SLIDE_DOOR_WIDTH,
                                minX: MIN_SLIDE_DOOR_WIDTH
                            }
                        ],
                        [
                            <FasadeObject>{
                                id: 2,
                                width: fasadePosition2.FASADE_WIDTH,
                                height: fasadePosition2.FASADE_HEIGHT,
                                position: new THREE.Vector3(fasadePosition2.POSITION_X, fasadePosition2.POSITION_Y, fasadePosition2.POSITION_Z),
                                material: <TFasadeProp>{
                                    ...FASADE_PROPS_2
                                },
                                type: "fasade",
                                minY: MIN_FASADE_HEIGHT,
                                maxY: fasadeColor.MAX_HEIGHT || fasadePosition2.FASADE_HEIGHT,
                                maxX: MAX_SLIDE_DOOR_WIDTH,
                                minX: MIN_SLIDE_DOOR_WIDTH
                            }
                        ]
                    ]
                    _module.fasades = fasades
                }
                else {

                    if(_module.isRestrictedModule) {
                        let fasade_width = (FASADE.FASADE_WIDTH / 2) - 2
                        fasades = [
                            [
                                <FasadeObject>{
                                    id: 1,
                                    width: fasade_width,
                                    height: FASADE.FASADE_HEIGHT,
                                    position: new THREE.Vector2(FASADE.POSITION_X, FASADE.POSITION_Y),
                                    material: <TFasadeProp>{
                                        ...FASADE_PROPS
                                    },
                                    loopsSide: LOOPSIDE["left"],
                                    type: "fasade",
                                    minY: MIN_FASADE_HEIGHT,
                                    maxY: fasadeColor.MAX_HEIGHT || parseInt(eval(fasadePosition.FASADE_HEIGHT)),
                                    maxX: fasadeColor.MAX_WIDTH || MAX_FASADE_WIDTH,
                                    minX: MIN_FASADE_WIDTH
                                }
                            ],
                            [
                                <FasadeObject>{
                                    id: 1,
                                    width: fasade_width,
                                    height: FASADE.FASADE_HEIGHT,
                                    position: new THREE.Vector2(FASADE.POSITION_X + fasade_width + 4 , FASADE.POSITION_Y),
                                    material: <TFasadeProp>{
                                        ...FASADE_PROPS
                                    },
                                    loopsSide: LOOPSIDE["right"],
                                    type: "fasade",
                                    minY: MIN_FASADE_HEIGHT,
                                    maxY: fasadeColor.MAX_HEIGHT || parseInt(eval(fasadePosition.FASADE_HEIGHT)),
                                    maxX: fasadeColor.MAX_WIDTH || MAX_FASADE_WIDTH,
                                    minX: MIN_FASADE_WIDTH
                                }
                            ]
                        ];
                    }
                    else
                                            console.log('TYT_2')
                        fasades = [
                            [
                                <FasadeObject>{
                                    id: 1,
                                    width: FASADE.FASADE_WIDTH,
                                    height: FASADE.FASADE_HEIGHT - _module.horizont,
                                    position: new THREE.Vector2(FASADE.POSITION_X, FASADE.POSITION_Y),
                                    material: <TFasadeProp>{
                                        ...FASADE_PROPS
                                    },
                                    loopsSide: LOOPSIDE["left"],
                                    type: "fasade",
                                    minY: MIN_FASADE_HEIGHT,
                                    maxY: fasadeColor.MAX_HEIGHT || parseInt(eval(fasadePosition.FASADE_HEIGHT)),
                                    maxX: fasadeColor.MAX_WIDTH || MAX_FASADE_WIDTH,
                                    minX: MIN_FASADE_WIDTH
                                }
                            ]
                        ];

                    section.fasades = fasades
                    this.LOOPS.calcLoops(0, _module)
                    section.loopsSides = {0: LOOPSIDE["left"]}
                }

            }
            else 
                result = PROPS.CONFIG.MODULEGRID

            return result
        }
        else
            return false
    }

    getMinMaxModuleSize(productData: TTotalProps, _dimension: string, _minmax: string) {
        const dimension = _dimension.toUpperCase()
        const minmax = _minmax.toUpperCase()

        return +productData.CONFIG.SIZE_EDIT[`SIZE_EDIT_` + dimension + `_` + minmax];
    }

    setRenderRef(ref: Ref){
        this.RENDER_REF = ref
    }

    setAlertRef(ref: Ref){
        this.ALERT_FOOTER_REF = ref
    }

    callAlert(type: alertType, message: string){
        if(type)
            this.AlERT[type](message, this.ALERT_FOOTER_REF)
    }

    setShapeAdjuster(SHAPE_ADJUSTER: ShapeAdjuster){
        this.SHAPE_ADJUSTER = SHAPE_ADJUSTER
    }

    updateHorizont(value){
        this.debounce('horizont', () => {
            const PROPS = this.UM_STORE.getUMData();
            const grid = this.UM_STORE.getUMGrid()

            let delta = parseInt(value) - PROPS.CONFIG.EXPRESSIONS["#HORIZONT#"]
            grid.sections.forEach((section, secIndex) => {
                section.position.y += delta
                section.fasades.forEach((door) => {
                    door.forEach((segment) => {
                        segment.position.y += delta;
                    })
                })
            })

            grid.horizont = PROPS.CONFIG.HORIZONT = PROPS.CONFIG.EXPRESSIONS["#HORIZONT#"] = parseInt(value);
            this.reset();
        }, 1000)
    };

    updateTotalHeight(value) {
        this.debounce('totalHeight', () => {
            const grid = this.UM_STORE.getUMGrid()

            grid.height = this.UM_STORE.totalHeight = parseInt(value);
            //this.RENDER_REF.updateTotalHeight(value);
            this.RENDER_REF.updateTotalSize(value, "height");

            this.checkSideColorsConversations()
            this.reset();
            this.RENDER_REF.selectCell("module", 0, null);

        }, 1000)
    };

    updateTotalWidth(value){
        this.debounce('totalWidth', () => {
            const grid = this.UM_STORE.getUMGrid()

            grid.width = this.UM_STORE.totalWidth = parseInt(value);

            //this.RENDER_REF.updateTotalWidth(value);
            this.RENDER_REF.updateTotalSize(value, "width");
            this.reset(grid);
            this.RENDER_REF.selectCell("module", 0, null);

        }, 1000)
    };

    updateTotalDepth(value) {
        this.debounce('totalDepth', () => {
            const grid = this.UM_STORE.getUMGrid()

            grid.depth = this.UM_STORE.totalDepth = parseInt(value)
            const PROPS = this.UM_STORE.getUMData();

            PROPS.CONFIG.SIZE.depth = parseInt(value);
            this.checkSideColorsConversations()
            this.reset();
        }, 1000)
    };

    checkSideColorsConversations(){
        const PROPS = this.UM_STORE.getUMData();
        let {CONFIG} = PROPS

        if(CONFIG['RIGHTSIDECOLOR']?.COLOR) {
            let check = this.FASADES.FASADES_CONVERSATION.checkFasadeConversations(CONFIG['RIGHTSIDECOLOR'].COLOR, {
                FASADE_WIDTH: this.UM_STORE.totalDepth,
                FASADE_HEIGHT: this.UM_STORE.totalHeight
            })

            if (!check) {
                CONFIG['RIGHTSIDECOLOR'] = { COLOR: false }
                this.callAlert("error", "Цвет правого бока сброшен, размер не соответствует!")
            }
        }

        if(CONFIG['LEFTSIDECOLOR']?.COLOR) {
            let check = this.FASADES.FASADES_CONVERSATION.checkFasadeConversations(CONFIG['LEFTSIDECOLOR'].COLOR, {
                FASADE_WIDTH: this.UM_STORE.totalDepth,
                FASADE_HEIGHT: this.UM_STORE.totalHeight
            })

            if (!check) {
                CONFIG['LEFTSIDECOLOR'] = { COLOR: false }
                this.callAlert("error", "Цвет левого бока сброшен, размер не соответствует!")
            }
        }
    }

    initSideProfile(grid: GridModule = this.UM_STORE.getUMGrid()) {
        if (!grid.profilesConfig?.sideProfile) {

            const product = this.APP.CATALOG.PRODUCTS[6513251] //C - образный профиль
            const productData = this.UM_STORE.getUMData()
            let profileData = {}

            if (!grid.profilesConfig) {
                grid.profilesConfig = {COLOR: product.COLOR[0] != null ? product.COLOR[0] : grid.moduleColor}
                grid.profilesConfig.colorsList = [...product.COLOR]
                productData.CONFIG['PROFILECOLOR'] = grid.profilesConfig.COLOR
            }

            profileData.COLOR = grid.profilesConfig?.COLOR ? grid.profilesConfig?.COLOR : grid.moduleColor

            let typeProfile = product.NAME.toLowerCase().split("-")[0].replace(/\s/g, '')
            if (typeProfile !== "c" && typeProfile !== "l")
                typeProfile = typeProfile.split(",").pop().replace(/\s/g, '')

            profileData.isProfile = true
            profileData.TYPE_PROFILE = typeProfile
            profileData.offsetFasades = typeProfile == "c" ? 36 : typeProfile == "l" ? 38 : 0
            profileData.manufacturerOffset = typeProfile == "c" ? -18.5 : typeProfile == "l" ? -19.5 : 0
            profileData.size = {x: grid.height, y: product.height, z: product.depth}
            profileData.product = 6513251

            profileData.side = LOOPSIDE[grid.sections[0].loopsSides[0]]?.includes("left") ? "left" : "right"
            const profileSidesMap = {
                "right": new THREE.Vector2( -profileData.manufacturerOffset - profileData.size.y / 2, 0),
                "left": new THREE.Vector2( grid.width + profileData.manufacturerOffset + profileData.size.y / 2, 0),
            }
            const profileRotationMap = {
                "right": Math.PI / 2,
                "left": -Math.PI / 2,
            }

            profileData.position = profileSidesMap[profileData.side];
            profileData.rotation = new THREE.Vector3(0, 0, profileRotationMap[profileData.side]);

            grid.profilesConfig.sideProfile = profileData
            this.UM_STORE.onSideProfile = true
        }
        else {
            delete grid.profilesConfig.sideProfile
            this.UM_STORE.onSideProfile = false
        }

        this.reset(grid)
    }

    reset(grid: GridModule = this.UM_STORE.getUMGrid()) {

        this.UM_STORE.setLoad(true)

        const PROPS = this.UM_STORE.getUMData();
        const {
            MIN_SECTION_HEIGHT,
            MIN_SECTION_WIDTH,
            MAX_SECTION_WIDTH,
        } = this.CONST;

        let moduleGrid = saveUMGrid(grid)

        moduleGrid.moduleColor = PROPS.CONFIG.MODULE_COLOR;
        moduleGrid.moduleThickness =  this.APP.FASADE[moduleGrid.moduleColor]?.DEPTH || 18;
        moduleGrid.horizont = PROPS.CONFIG.EXPRESSIONS["#HORIZONT#"] || 0;
        delete moduleGrid.errors

        const leftWidth = this.APP.FASADE[PROPS.CONFIG.LEFTSIDECOLOR?.COLOR]?.DEPTH || moduleGrid.moduleThickness;
        const rightWidth = this.APP.FASADE[PROPS.CONFIG.RIGHTSIDECOLOR?.COLOR]?.DEPTH || moduleGrid.moduleThickness;

        moduleGrid.leftWallThickness = leftWidth
        moduleGrid.rightWallThickness = rightWidth
        let NOBOTTOM = this.OPTIONS.checkOptionWithoutBottom(moduleGrid)

        let sectionsTotalWidth = moduleGrid.width - leftWidth - rightWidth - (moduleGrid.sections.length - 1) * moduleGrid.moduleThickness;
        let sectionsTotalHeight = moduleGrid.height - moduleGrid.moduleThickness * (NOBOTTOM ? 1 : 2) - moduleGrid.horizont;

        let deltaHeight = sectionsTotalHeight - moduleGrid.sections[0].height;  //Величина, на которую нужно увеличить высоту секций
        let newSectionsArray = <GridSection>[]

        let startPositionSections = new THREE.Vector2(leftWidth, moduleGrid.horizont + moduleGrid.moduleThickness)
        let module = grid
        try {
            const recalcSection = (section, positionSections) => {

                let newSection = <GridSection>{...section, position: new THREE.Vector2(section.position.x, section.position.y)}
                newSection.position.copy(positionSections.clone())
                newSection.position.x += newSection.width / 2

                if (newSection.cells?.length) {
                    let newCellsArray = <GridCell>[]
                    let positionCells = newSection.position.clone()

                    let lastCellHeight = newSection.height

                    let tmpCells = newSection.cells.slice().reverse()
                    for (let i = 0; i < tmpCells.length; i++) {
                        let newCell = <GridCell>{...tmpCells[i], position: new THREE.Vector2(tmpCells[i].position.x, tmpCells[i].position.y)}

                        newCell.width = newSection.width;
                        newCell.position.copy(positionCells.clone())

                        if(newCell.position.y - moduleGrid.moduleThickness > newSection.height){
                            break;
                        }

                        lastCellHeight -= newCell.height

                        if (i === tmpCells.length - 1 || lastCellHeight <= 0) {
                            newCell.height += lastCellHeight

                            if(newCell.height < MIN_SECTION_HEIGHT){
                                newCellsArray[newCellsArray.length - 1].height += newCell.height + moduleGrid.moduleThickness
                                break;
                            }
                        }
                        else {
                            lastCellHeight -= moduleGrid.moduleThickness
                        }

                        if (newCell.cellsRows?.length) {
                            let newCellsRowArray = <GridCellsRow>[]
                            let positionCellsRow = new THREE.Vector2(newCell.position.x - newCell.width / 2, newCell.position.y)

                            newCell.cellsRows.forEach((row, rowIndex) => {
                                let newRow = <GridCellsRow>{...row, position: new THREE.Vector2(row.position.x, row.position.y)}

                                newRow.position.copy(positionCellsRow.clone())
                                newRow.position.x += newRow.width / 2
                                newRow.height = newCell.height;

                                if (newRow.fillings?.length) {
                                    newRow.fillings = <FillingObject>[...newRow.fillings]
                                    newRow.fillings.forEach((filling, index) => {
                                        if(filling.isVerticalItem){
                                            this.FILLINGS.updateFilling(newRow.height, filling, 'height', moduleGrid)
                                        }
                                        else {
                                            if(filling.isProfile) {
                                                this.FILLINGS.updateFilling((moduleGrid.profilesConfig.onSectionSize || filling.isProfile.isBottomHiTechProfile) ? newSection.width : moduleGrid.width, filling, 'width', moduleGrid)
                                            }
                                            else
                                                this.FILLINGS.updateFilling(newRow.width, filling, 'width', moduleGrid, moduleGrid)
                                        }


                                    })
                                }

                                newCellsRowArray.push(newRow)
                                positionCellsRow.x += newRow.width + moduleGrid.moduleThickness

                                if (row.extras?.length) {
                                    let newRowExtrasArray = <GridRowExtra>[]
                                    let positionRowExtras = new THREE.Vector2(newRow.position.x, newRow.position.y)
                                    let lastExtraHeight = newRow.height

                                    let extras = row.extras.slice().sort((a, b) => a.position.y - b.position.y)
                                    for (let j = 0; j < extras.length; j++) {
                                        let extra = extras[j]

                                        let newExtra = <GridRowExtra>{...extra, position: new THREE.Vector2(extra.position.x, extra.position.y)}

                                        newExtra.position.copy(positionRowExtras.clone())
                                        newExtra.width = newRow.width;

                                        lastExtraHeight -= newExtra.height

                                        if (j === extras.length - 1 || lastExtraHeight <= 0) {
                                            newExtra.height += lastExtraHeight

                                            if(newExtra.height < MIN_SECTION_HEIGHT){
                                                newRowExtrasArray[newRowExtrasArray.length - 1].height += newExtra.height + moduleGrid.moduleThickness
                                                break;
                                            }
                                        }
                                        else {
                                            lastExtraHeight -= moduleGrid.moduleThickness
                                        }

                                        if (newExtra.fillings?.length) {
                                            newExtra.fillings = <FillingObject>[...newExtra.fillings]
                                            newExtra.fillings.forEach((filling, index) => {
                                                if(filling.isVerticalItem) {
                                                    this.FILLINGS.updateFilling(newExtra.height, filling, 'height', moduleGrid)
                                                }
                                                else {
                                                    if(filling.isProfile) {
                                                        this.FILLINGS.updateFilling((moduleGrid.profilesConfig.onSectionSize || filling.isProfile.isBottomHiTechProfile) ? newSection.width : moduleGrid.width, filling, 'width', moduleGrid)
                                                    }
                                                    else
                                                        this.FILLINGS.updateFilling(newExtra.width, filling, 'width', moduleGrid)
                                                }
                                            })
                                        }

                                        newRowExtrasArray.push(newExtra)
                                        positionRowExtras.y += newExtra.height + moduleGrid.moduleThickness
                                    }

                                    newRow.extras = newRowExtrasArray.slice().sort((a, b) => b.position.y - a.position.y)
                                }
                            })

                            let cellsRowWidthSum = 0;
                            newCellsRowArray.forEach((row, rowIndex) => {
                                cellsRowWidthSum += row.width;
                            })
                            cellsRowWidthSum += (newCellsRowArray.length - 1) * moduleGrid.moduleThickness;

                            let deltaWidth = newCell.width - cellsRowWidthSum;   //Величина, на которую нужно изменить ширину последней ячейки
                            if (deltaWidth !== 0){
                                let lastRow = newCellsRowArray[newCellsRowArray.length - 1]
                                lastRow.width += deltaWidth
                                lastRow.position.x += -deltaWidth / 2

                                if (lastRow.fillings?.length) {
                                    lastRow.fillings = <FillingObject>[...lastRow.fillings]
                                    lastRow.fillings.forEach((filling, index) => {
                                        if(filling.isVerticalItem) {
                                            this.FILLINGS.updateFilling(lastRow.height, filling, 'height', moduleGrid)
                                        }
                                        else {
                                            if (filling.isProfile) {
                                                this.FILLINGS.updateFilling((moduleGrid.profilesConfig.onSectionSize || filling.isProfile.isBottomHiTechProfile) ? newSection.width : moduleGrid.width, filling, 'width', moduleGrid)
                                            } else
                                                this.FILLINGS.updateFilling(lastRow.width, filling, 'width', moduleGrid)
                                        }
                                    })
                                }
                            }

                            newCell.cellsRows = newCellsRowArray.slice()
                        }

                        positionCells.y += newCell.height + moduleGrid.moduleThickness

                        if (newCell.fillings?.length) {
                            newCell.fillings = <FillingObject>[...newCell.fillings]
                            newCell.fillings.forEach((filling, index) => {
                                if(filling.isVerticalItem) {
                                    this.FILLINGS.updateFilling(newCell.height, filling, 'height', moduleGrid)
                                }
                                else {
                                    if (filling.isProfile) {
                                        this.FILLINGS.updateFilling((moduleGrid.profilesConfig.onSectionSize || filling.isProfile.isBottomHiTechProfile) ? newSection.width : moduleGrid.width, filling, 'width', moduleGrid)
                                    } else
                                        this.FILLINGS.updateFilling(newCell.width, filling, 'width', moduleGrid)
                                }
                            })
                        }

                        newCellsArray.push(newCell)
                    }

                    newSection.cells = newCellsArray.slice().sort((a, b) => b.position.y - a.position.y)
                }

                positionSections.x += newSection.width + moduleGrid.moduleThickness

                if (newSection.fillings?.length) {
                    newSection.fillings = <FillingObject>[...newSection.fillings]
                    newSection.fillings.forEach((filling, index) => {
                        if(filling.isVerticalItem) {
                            this.FILLINGS.updateFilling(newSection.height, filling, 'height', moduleGrid)
                        }
                        else {
                            if (filling.isProfile) {
                                this.FILLINGS.updateFilling((moduleGrid.profilesConfig.onSectionSize || filling.isProfile.isBottomHiTechProfile) ? newSection.width : moduleGrid.width, filling, 'width', moduleGrid)
                            } else
                                this.FILLINGS.updateFilling(newSection.width, filling, 'width', moduleGrid)
                        }
                    })
                }

                return newSection
            }

            moduleGrid.sections.forEach((section, secIndex) => {
                section.height += deltaHeight;

                let newSection = recalcSection(section, startPositionSections)
                newSectionsArray.push(newSection)
            })

            moduleGrid.sections = newSectionsArray.slice()

            let sectionsWidthSum = 0;
            moduleGrid.sections.forEach((section, secIndex) => {
                sectionsWidthSum += section.width;
            })

            let deltaWidth = sectionsTotalWidth - sectionsWidthSum;
            if(deltaWidth !== 0) {
                let lastSection = moduleGrid.sections[moduleGrid.sections.length - 1];
                lastSection.position.x = lastSection.position.x - lastSection.width / 2 + (lastSection.width + deltaWidth) / 2
                lastSection.width += deltaWidth

                if (lastSection.width > MAX_SECTION_WIDTH) {
                    let countSections = Math.floor(lastSection.width / MAX_SECTION_WIDTH);
                    this.SECTIONS.addSection?.({grid: moduleGrid, secIndex: moduleGrid.sections.length - 1, count: countSections})
                }
                else if (lastSection.width < MIN_SECTION_WIDTH) {
                    while (moduleGrid.sections[moduleGrid.sections.length - 1].width < MIN_SECTION_WIDTH) {
                        this.SECTIONS.deleteSection?.(moduleGrid, moduleGrid.sections.length - 1)
                    }
                }
                else {
                    startPositionSections.copy(lastSection.position.clone())
                    startPositionSections.x -= lastSection.width / 2
                    moduleGrid.sections[moduleGrid.sections.length - 1] = recalcSection(lastSection, startPositionSections)
                }
            }
            else if(moduleGrid.sections.length < 2 && sectionsWidthSum > MAX_SECTION_WIDTH) {
                let countSections = Math.floor(moduleGrid.sections[0].width / MAX_SECTION_WIDTH);
                this.SECTIONS.addSection?.({grid: moduleGrid, secIndex: 0, count: countSections})
            }

            module = <GridModule>{
                ...moduleGrid,
                width: this.UM_STORE.totalWidth,
                height: this.UM_STORE.totalHeight,
                depth: this.UM_STORE.totalDepth,
            }

            module = this.FASADES.updateFasades(module)
        }
        catch(error){
            console.error(error)
            this.callAlert("error", "Ошибка расчёта модуля!")
        }

        if(module) {
            this.UM_STORE.setUMGrid(module)

            this.debounce("renderGrid", () => {
                this.RENDER_REF.renderGrid(module)
                this.UM_STORE.setLoad(false)
            }, 100)

            return module
        }
        else
            return false
    };
}