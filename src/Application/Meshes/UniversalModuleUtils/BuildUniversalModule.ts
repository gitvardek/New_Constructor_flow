// @ts-nocheck 

import * as THREE from 'three'
import * as THREETypes from "@/types/types"
import { OBB } from 'three/examples/jsm/math/OBB.js';

import {
    GridModule, LOOPSIDE
} from "@/types/constructor2d/interfaсes.ts";

import { useSceneState } from "@/store/appliction/useSceneState"
import { useModelState } from '@/store/appliction/useModelState';

import { BuildProduct } from "../BuildProduct"
import { _URL } from "@/types/constants";
import { CSG } from "three-csg-ts";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";

export class BuildUniversalModule extends BuildProduct {

    project = useSceneState().getCurrentProjectParams;
    modelState = useModelState();

    heightCorrect: number = 0

    constructor(root: THREETypes.TApplication) {
        super(root);
    }

    createProductBody(perent_group: THREE.Object3D, _size?: {
        width: number,
        height: number,
        depth: number
    }, moduleParams?: GridModule) {

        // Режим чертежа
        const drowMode = this.menuStore.getDrowModeValue
        //---------------

        const total = new THREE.Object3D();
        const edgeBody = new THREE.Object3D()

        const { PROPS } = perent_group.userData
        const { CONFIG } = PROPS;

        const defaultConfig: THREETypes.TDefaultOptionsConfig = this.getDefaultOptionsConfig();

        const productId = CONFIG.ID
        const productInfo = this._PRODUCTS[productId];
        const bodyExceptions = this.project.default_overlay_id
        const activeOptions = [...CONFIG.OPTIONS].filter(opt => opt.active)

        PROPS.FASADE = []
        PROPS.FASADE_DEFAULT = []

        const modelData = this._MODELS[CONFIG.MODELID]

        const MODULEGRID = moduleParams || Object.keys(PROPS.CONFIG.MODULEGRID)?.length ? PROPS.CONFIG.MODULEGRID : false;


        // console.log(MODULEGRID, '===== MODULEGRID =====')

        const size = _size ? _size : MODULEGRID ? {
            width: MODULEGRID.width,
            height: MODULEGRID.height,
            depth: MODULEGRID.depth
        } : null

        const modelSize = size ?? PROPS.CONFIG.SIZE;
        total.userData.prodSize = modelSize


        if (size) {
            CONFIG.SIZE = size
            this.getProductSize(CONFIG, Object.assign({}, productInfo, size))
        }

        let heightCorrect = 0;
        const adjustHeight = (value: number, type: string) => {
            heightCorrect += type === "top" ? -value : value;
            return heightCorrect;
        };

        if (!modelData) return

        const data = this.createModelData(modelData, PROPS, modelSize);
        const curBodyExceptions = bodyExceptions?.includes(modelData.id)

        let optionsLegs = 0
        for (let i = 0; i < activeOptions.length; i++) {
            let option = this._OPTION[+activeOptions[i].id]

            switch (+option.ID) {
                /*                case 7250452:   //Деревянная царга
                                    PROPS.CONFIG.TSARGA = {TYPE: 'wood', COLOR: PROPS.CONFIG.MODULE_COLOR}
                                    break;
                                case 7250589:   //Металлическая царга
                                    PROPS.CONFIG.TSARGA = {TYPE: 'metal', COLOR: 79065}
                                    break;*/
                //case 4621257:   //Опора регулируемая - не является ножкой этого типа
                case 4621238:   //Опора 100 мм
                case 4621240:   //Опора 150 мм
                    optionsLegs = option.NAME.toLowerCase().includes(150) ? 150 : 100
                    break;
                case 5738924:   //Без дна
                    data.json.items = data.json.items.filter(item => item.id !== 'bottom')
                    break;
                default:
                    break;
            }
        }

        if (PROPS.CONFIG.EXPRESSIONS['#HORIZONT#'] === 0) {
            data.json.items = data.json.items.filter(item => item.id !== 'plinth')
        }

        const legsHeight = this._PRODUCTS[productId]?.leg_length || optionsLegs
        const baseY = legsHeight * 0.5;

        // Сборка частей
        const { body, tempMaterial, move } = !this.isEmpty(modelData)
            ? this.createBody(data, PROPS, defaultConfig)
            : { body: null, tempMaterial: null, move: null };

        const shelf = this._SHELF_POSITION[productId]
            ? this.shelf_builder.createShelfs(PROPS, this._SHELF_POSITION[productId], tempMaterial, move)
            : null;

        const legs = legsHeight
            ? this.buildLegs(PROPS, data, total, legsHeight)
            : null;

        const plinth = legsHeight > 0
            ? this.plinth_builder.buildPlinth(PROPS, legsHeight)
            : null;

        if (MODULEGRID) {
            this.parseModulegrid(MODULEGRID, PROPS)
            this.buildModulegrid(PROPS, total, body, baseY)
            this.calcSubElementsAdditives(PROPS)
        }

        if (CONFIG.LOOPS && Object.keys(CONFIG.LOOPS)?.length) {
            let loopsMesh = this.createLoop(productInfo, PROPS, baseY)
            total.add(loopsMesh)
        }

        /** Добавляем фасад */
        const fasade = Object.keys(CONFIG.FASADE_PROPS).length
            ? this.fasade_builder.getFasade({
                props: PROPS,
                isUMmodule: !!MODULEGRID,
                defaultConfig,
                curBodyExceptions
            })
            : null;

        /** Добавляем стреки размеров */
        const arrows = this.addArrowSize({ object: body, props: PROPS })

        // Вычисление высот
        // const legsHeight = legs ? this.calculateHeight(legs) : 0;
        const bodyHeight = body ? this.calculateHeight(body) : 0;
        // const tableTopHeight = tableTop ? this.calculateHeight(tableTop) : 0;

        // Позиционирование

        if (legs) legs.position.y = baseY;
        if (plinth) plinth.position.y = 0;
        if (body) {
            body.position.set(move.x, move.y, move.z)
            body.position.y = baseY;
            body.visible = !curBodyExceptions;
        }
        if (shelf) shelf.position.y = baseY;
        if (fasade) fasade.position.y = baseY;
        // if (tableTop) {
        //     tableTop.position.y = baseY + bodyHeight * 0.5 + tableTopHeight * 0.5;
        // }
        arrows.position.copy(body?.position);
        arrows.position.y = baseY;

        const getTotalGroup = () => {
            if (curBodyExceptions) {
                return [body, shelf, fasade, arrows]
            }
            return [plinth, legs, body, shelf, fasade, arrows]
        }

        const totalGroup = getTotalGroup()

        // Добавление в итоговую группу
        totalGroup
            .filter(Boolean)
            .forEach((part) => {
                total.add(part as THREE.Object3D)
            });

        //---------------------------
        /** @Для корректной коллизии */
        //---------------------------

        const tempTotal = new THREE.Object3D();
        const exept = new THREE.Object3D();

        [legs?.clone(), body?.clone(), shelf?.clone()]
            .filter(Boolean)
            .forEach(part => tempTotal.add(part));

        [legs?.clone(), body?.clone(), plinth?.clone()].filter(Boolean)
            .forEach(part => exept.add(part));

        const sourceForBounds = curBodyExceptions ? exept : tempTotal;
        if (sourceForBounds) {
            this.setBounds(total, sourceForBounds);
        }

        if (drowMode) {
            this.useEdgeBuilder.drawingMode(drowMode, total)
        }

        return total;
    };

    createProductObject(product_data: THREETypes.TObject, props) {
        const CONFIG = super.createProductObject(product_data, props)

        let firstSectionSize = new THREE.Vector3(CONFIG.SIZE.width - CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"] * 2,
            CONFIG.SIZE.height - CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"] * 2 - CONFIG.EXPRESSIONS["#HORIZONT#"],
            CONFIG.SIZE.depth - CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"])

        CONFIG.SECTIONS = {
            1: {
                fillings: [],
                size: firstSectionSize,
                position: new THREE.Vector3(CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"] + firstSectionSize.x / 2,
                    CONFIG.EXPRESSIONS["#HORIZONT#"] + CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"],
                    CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"] + firstSectionSize.z / 2),
            }
        }

        CONFIG.MODULEGRID = {}

        if (product_data.BACKWALL?.length && product_data.BACKWALL?.[0]) {
            CONFIG.BACKWALL = { SHOW: true }
            CONFIG.BACKWALL.COLOR = this.filters.filterModuleColor(product_data.BACKWALL)[0] || CONFIG["MODULE_COLOR"];
        }

        if (product_data.SIDEWALL?.length && product_data.SIDEWALL?.[0]) {
            CONFIG.LEFTSIDECOLOR = { COLOR: false }
            CONFIG.RIGHTSIDECOLOR = { COLOR: false }
        }

        CONFIG.TOPFASADECOLOR = { COLOR: 7397, SHOW: false }

        if (product_data.moduleType.CODE !== "wardrobe") {
            CONFIG.LOOPS = {}
        }
        else {
            CONFIG.isSlideDoor = true
        }

        if (this._APP.CATALOG.SECTIONS[product_data.OPTIONSECTION_ID].TYPE.toLowerCase().includes("hitech"))
            CONFIG.isHiTech = true

        if (product_data.moduleType.CODE === "restricted")
            CONFIG.isRestrictedModule = true

        let option = CONFIG.OPTIONS.find(item => +item.id === 8390271)
        if (product_data.SIDEWALL?.[0] && option && !option.active) {
            option.active = true
        }

        return CONFIG
    }

    parseModulegrid(product_data: THREETypes.TObject, PROPS: Object) {
        const OLD_SECTIONS = PROPS.CONFIG.SECTIONS
        const OLD_FASADES = PROPS.CONFIG.FASADE_POSITIONS
        PROPS.CONFIG.FASADE_POSITIONS = []
        PROPS.CONFIG.FASADE_PROPS = []
        PROPS.CONFIG.SECTIONS = {}

        if (PROPS.CONFIG.LOOPS)
            PROPS.CONFIG.LOOPS = {}

        const full_horizont_height = PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"] + PROPS.CONFIG.EXPRESSIONS['#HORIZONT#']

        if (product_data.profilesConfig) {
            PROPS.CONFIG['PROFILECOLOR'] = product_data.profilesConfig.COLOR

            if (product_data.profilesConfig.sideProfile)
                PROPS.CONFIG['SIDEPROFILE'] = product_data.profilesConfig.sideProfile
            else
                delete PROPS.CONFIG['SIDEPROFILE']
        }

        const isSlidingDoors = product_data.fasades ? 100 : 0

        product_data.sections.forEach((section, secIndex) => {

            let sectionSize = new THREE.Vector3(section.width, section.height,
                product_data.depth - PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"])
            const prevSection = PROPS.CONFIG.SECTIONS[secIndex] || false;
            const nextSection = product_data.sections[secIndex + 1] || false;

            PROPS.CONFIG.SECTIONS[secIndex + 1] = {
                fillings: [],
                size: sectionSize,
                position: new THREE.Vector3((prevSection ? prevSection.position.x + prevSection.size.x / 2 : 0) + (prevSection ? PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"] : product_data.leftWallThickness) + sectionSize.x / 2,
                    PROPS.CONFIG.EXPRESSIONS["#HORIZONT#"] + PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"],
                    (PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"] + sectionSize.z) / 2)
            }

            const curSection = PROPS.CONFIG.SECTIONS[secIndex + 1]

            if (nextSection)
                curSection.fillings.push({  //Добавляем разделитель секций, как товар наполнения
                    position: new THREE.Vector3(curSection.position.x + curSection.size.x / 2 + PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"] / 2,
                        curSection.position.y - full_horizont_height, curSection.position.z - (isSlidingDoors / 2 || 0)),
                    size: new THREE.Vector3(PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"], curSection.size.y, product_data.depth - isSlidingDoors), // curSection.size.z
                    product: 5820274,
                    material: PROPS.CONFIG.MODULE_COLOR,
                    id: curSection.fillings.length + 1,
                    type: 'section_partition',
                })

            let cells = [...section.cells].reverse()
            cells?.forEach((cell, cellIndex) => {

                if (cellIndex > 0)
                    curSection.fillings.push({  //Добавляем полку, как товар наполнения
                        position: new THREE.Vector3(cell.position.x, cell.position.y - PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"] - full_horizont_height,
                            curSection.position.z - (isSlidingDoors / 2 || 0)),
                        size: new THREE.Vector3(cell.width, PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"], product_data.depth - isSlidingDoors), // curSection.size.z
                        product: 4263392,
                        id: curSection.fillings.length + 1,
                        material: PROPS.CONFIG.MODULE_COLOR,
                        type: 'shelf',
                    })

                cell.cellsRows?.forEach((row, rowIndex) => {

                    if (rowIndex > 0)
                        curSection.fillings.push({  //Добавляем верт. полку, как товар наполнения
                            position: new THREE.Vector3(row.position.x - row.width / 2 - PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"] / 2,
                                row.position.y - full_horizont_height,
                                curSection.position.z - (isSlidingDoors / 2 || 0)),
                            size: new THREE.Vector3(PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"], cell.height, product_data.depth - isSlidingDoors), // curSection.size.z
                            product: 5820266,
                            id: curSection.fillings.length + 1,
                            material: PROPS.CONFIG.MODULE_COLOR,
                            type: 'vertical_shelf',
                        })

                    row.extras?.slice().sort((a, b) => a.position.y - b.position.y).forEach((extra, extraIndex) => {
                        if (extraIndex > 0)
                            curSection.fillings.push({  //Добавляем полку, как товар наполнения
                                position: new THREE.Vector3(extra.position.x, extra.position.y - PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"] - full_horizont_height,
                                    curSection.position.z - (isSlidingDoors / 2 || 0)),
                                size: new THREE.Vector3(row.width, PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"], product_data.depth - isSlidingDoors), // curSection.size.z
                                product: 4263392,
                                id: curSection.fillings.length + 1,
                                material: PROPS.CONFIG.MODULE_COLOR,
                                type: 'shelf',
                            })

                        extra.fillings?.forEach((filling) => {
                            let z_pos = filling.type !== "any" ? product_data.depth - filling.size.z / 2 - (isSlidingDoors || 0) : curSection.position.z - (isSlidingDoors || 0)

                            let fillingPos = new THREE.Vector3(
                                filling.isVerticalItem ? extra.position.x - extra.width / 2 + filling.distances.left + filling.width / 2 : extra.position.x,
                                extra.position.y + filling.distances.bottom - full_horizont_height,
                                z_pos
                            )

                            let newFilling = {
                                ...filling,
                                position: fillingPos,
                                id: curSection.fillings.length + 1,
                            }

                            if (!filling.isProfile && !["glass_shelf", 'any'].includes(filling.type))
                                newFilling.material = PROPS.CONFIG.MODULE_COLOR

                            curSection.fillings.push(newFilling)
                        })
                    })

                    row.fillings?.forEach((filling) => {
                        let z_pos = filling.type !== "any" ? product_data.depth - filling.size.z / 2 - (isSlidingDoors || 0) : curSection.position.z - (isSlidingDoors || 0)

                        let fillingPos = new THREE.Vector3(
                            filling.isVerticalItem ? row.position.x - row.width / 2 + filling.distances.left + filling.width / 2 : row.position.x,
                            row.position.y + filling.distances.bottom - full_horizont_height,
                            z_pos
                        )

                        let newFilling = {
                            ...filling,
                            position: fillingPos,
                            id: curSection.fillings.length + 1,
                        }

                        if (!filling.isProfile && !["glass_shelf", 'any'].includes(filling.type))
                            newFilling.material = PROPS.CONFIG.MODULE_COLOR

                        curSection.fillings.push(newFilling)
                    })
                })

                cell.fillings?.forEach((filling) => {
                    let z_pos = filling.type !== "any" ? product_data.depth - filling.size.z / 2 - (isSlidingDoors || 0) : curSection.position.z - (isSlidingDoors || 0)

                    let fillingPos = new THREE.Vector3(
                        filling.isVerticalItem ? cell.position.x - cell.width / 2 + filling.distances.left + filling.width / 2 : cell.position.x,
                        cell.position.y + filling.distances.bottom - full_horizont_height,
                        z_pos
                    )

                    let newFilling = {
                        ...filling,
                        position: fillingPos,
                        id: curSection.fillings.length + 1,
                    }

                    if (!filling.isProfile && !["glass_shelf", 'any'].includes(filling.type))
                        newFilling.material = PROPS.CONFIG.MODULE_COLOR

                    curSection.fillings.push(newFilling)
                })
            })

            section.fillings?.forEach((filling) => {
                let z_pos = filling.type !== "any" ? product_data.depth - filling.size.z / 2 - (isSlidingDoors || 0) : curSection.position.z - (isSlidingDoors || 0)

                let fillingPos = new THREE.Vector3(
                    filling.isVerticalItem ? curSection.position.x - curSection.size.x / 2 + filling.distances.left + filling.width / 2 : curSection.position.x,
                    curSection.position.y + filling.distances.bottom - full_horizont_height,
                    z_pos
                )

                let newFilling = {
                    ...filling,
                    position: fillingPos,
                    id: curSection.fillings.length + 1,
                }

                if (!filling.isProfile && !["glass_shelf", 'any'].includes(filling.type))
                    newFilling.material = PROPS.CONFIG.MODULE_COLOR

                curSection.fillings.push(newFilling)
            })

            let allFasades = []
            section.fasades?.forEach((door, doorID) => {
                let tmp = []
                door.forEach((fasade, fasadeID) => {
                    fasade.section = secIndex + 1
                    fasade.door = doorID + 1
                    tmp.push(fasade)
                })
                allFasades.push(...tmp)
            })

            if (section.fasadesDrawers)
                allFasades.push(...section.fasadesDrawers)

            allFasades.sort((a, b) => a.id - b.id)

            allFasades.forEach((fasade, fasadeID) => {
                if (!fasade.error) {
                    let tmp = {
                        ...OLD_FASADES[0],
                        FASADE_WIDTH: fasade.width,
                        FASADE_HEIGHT: fasade.height,
                        POSITION_X: fasade.position.x,
                        POSITION_Y: fasade.position.y,  //(PROPS.CONFIG.EXPRESSIONS["#HORIZONT#"]) + 2,
                        POSITION_Z: PROPS.CONFIG.SIZE.depth + 2,
                        FASADE_NUMBER: PROPS.CONFIG.FASADE_POSITIONS.length,
                        SECTION: fasade.section || fasade.sec || 1,
                        DOOR: fasade.door || fasade.cellIndex || null,
                        SEGMENT: fasade.id || fasade.key || null,
                    }
                    if (fasade.item)
                        tmp.drawer = fasade.item

                    PROPS.CONFIG.FASADE_POSITIONS.push(tmp)
                    PROPS.CONFIG.FASADE_PROPS.push(fasade.material)
                }
            })

            if (section.loops && PROPS.CONFIG.LOOPS)
                PROPS.CONFIG.LOOPS[secIndex + 1] = section.loops
            else {
                delete section.loops
                delete section.loopsSides
            }

        })

        if (product_data.fasades) {
            let allFasades = []
            product_data.fasades?.forEach((door, doorID) => {
                allFasades.push(...door)
            })

            allFasades.forEach((fasade, fasadeID) => {
                if (!fasade.error) {
                    PROPS.CONFIG.FASADE_POSITIONS.push({
                        ...OLD_FASADES[0],
                        FASADE_WIDTH: fasade.width,
                        FASADE_HEIGHT: fasade.height,
                        POSITION_X: fasade.position.x,
                        POSITION_Y: fasade.position.y,  //(PROPS.CONFIG.EXPRESSIONS["#HORIZONT#"]) + 2,
                        POSITION_Z: fasade.position.z,
                        FASADE_NUMBER: PROPS.CONFIG.FASADE_POSITIONS.length,
                    })
                    PROPS.CONFIG.FASADE_PROPS.push(fasade.material)
                }
            })
        }
    }

    subtractGeometry(mainMesh: THREETypes.TObject, subGeometries: Array) {

        let subGeometriesCSG = subGeometries.map((_subGeometry) => {
            const parentGeometry = _subGeometry.clone()

            if (parentGeometry.children[0] && parentGeometry.children[0].geometry) {
                // Клонируем вычитаемый меш
                let childMesh = parentGeometry.children[0].clone()

                const { BODY_WIDTH, BODY_HEIGHT, BODY_DEPTH } = parentGeometry.userData.trueSizes

                let childGeometry = new THREE.BoxGeometry(Math.ceil(BODY_WIDTH), Math.ceil(BODY_HEIGHT), Math.ceil(BODY_DEPTH))
                childGeometry.computeBoundingBox()
                childGeometry.computeBoundingSphere()

                childMesh.geometry = childGeometry
                childMesh.rotation.copy(parentGeometry.rotation)
                childMesh.position.copy(parentGeometry.position)

                childMesh.updateMatrix()
                childMesh.geometry.applyMatrix4(childMesh.matrix)

                childMesh.position.set(0, 0, 0);
                childMesh.rotation.set(0, 0, 0);
                childMesh.scale.set(1, 1, 1);
                childMesh.matrix.identity();

                // Возвращаем BSP-структуру для вычитаемой геометрии
                return CSG.fromMesh(childMesh)
            }
            else {
                // Клонируем вычитаемый меш
                let childMesh = parentGeometry.clone()

                const { BODY_WIDTH, BODY_HEIGHT, BODY_DEPTH } = parentGeometry.userData.trueSizes

                let childGeometry = new THREE.BoxGeometry(Math.ceil(BODY_WIDTH), Math.ceil(BODY_HEIGHT), Math.ceil(BODY_DEPTH))
                childGeometry.computeBoundingBox()
                childGeometry.computeBoundingSphere()

                childMesh.geometry = childGeometry
                childMesh.rotation.copy(parentGeometry.rotation)
                childMesh.position.copy(parentGeometry.position)

                childMesh.updateMatrix()
                childMesh.geometry.applyMatrix4(childMesh.matrix)

                childMesh.position.set(0, 0, 0);
                childMesh.rotation.set(0, 0, 0);
                childMesh.scale.set(1, 1, 1);
                childMesh.matrix.identity();

                // Возвращаем BSP-структуру для вычитаемой геометрии
                return CSG.fromMesh(childMesh)
            }

        })

        mainMesh.children.forEach(child => {
            if (child.geometry) {
                // Клонируем базовую геометрию
                let startMesh = child.clone();
                let startGeometry = startMesh.geometry.clone();
                startGeometry.computeBoundingSphere()

                startMesh.geometry = startGeometry
                startMesh.updateMatrix()
                startMesh.geometry.applyMatrix4(startMesh.matrix)

                startMesh.position.set(0, 0, 0);
                startMesh.rotation.set(0, 0, 0);
                startMesh.scale.set(1, 1, 1);
                startMesh.matrix.identity();

                // Создаём BSP-структуру для базовой геометрии
                let csgStartGeometry = CSG.fromMesh(startMesh);

                subGeometriesCSG.forEach((csgChildGeometry) => {
                    csgStartGeometry = csgStartGeometry.subtract(csgChildGeometry);
                })

                // Преобразуем обратно в геометрию
                let newGeometry = CSG.toGeometry(csgStartGeometry, new THREE.Matrix4());
                let directVector = new THREE.Vector3().subVectors(newGeometry.boundingSphere.center, startGeometry.boundingSphere.center)
                newGeometry.center()

                if (directVector.x !== 0 || directVector.y !== 0 || directVector.z !== 0)
                    newGeometry.translate(directVector.x, directVector.y, directVector.z)

                // Создаём UV-развёртку
                this.planarUV(newGeometry);

                // Освобождаем старую геометрию
                child.geometry.dispose();
                child.geometry = null;

                child.geometry = newGeometry;

                // Очистка памяти
                newGeometry.dispose();
                newGeometry = null;

                startMesh.geometry.dispose();
                startMesh = null;
            }
        })
    }

    buildModulegrid(PROPS: THREETypes.TObject, group: THREE.Object3D, moduleBody: THREE.Object3D, baseOffset: Number = 0) {

        PROPS.JSON_FILLINGS = []
        const full_horizont_height = PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"] + PROPS.CONFIG.EXPRESSIONS['#HORIZONT#']
        const subGeometries = []
        const isSlidingDoors = PROPS.CONFIG.MODULEGRID?.fasades ? 100 : 0

        Object.entries(PROPS.CONFIG.SECTIONS).forEach(([secIndex, section]) => {

            if (section.fillings?.length) {

                section.fillings.map((filling) => {
                    const productInfo = this._PRODUCTS[filling.product]

                    if (!productInfo)
                        return

                    const onLoad = (productFilling, isModel = true) => {

                        if (filling.isProfile)
                            productFilling.userData.isProfile = true

                        let sizeModule = PROPS.CONFIG.SIZE
                        let start_position = this.getStartPosition(sizeModule)

                        if (isModel) {
                            const box = new THREE.Box3().setFromObject(productFilling);
                            const size = box.getSize(new THREE.Vector3());

                            productFilling.userData.trueSizes = {
                                BODY_WIDTH: size.x,
                                BODY_HEIGHT: size.y,
                                BODY_DEPTH: size.z,
                            }

                            productFilling.scale.x = filling.size.x / productFilling.userData.trueSizes.BODY_WIDTH
                            productFilling.scale.y = filling.size.y / productFilling.userData.trueSizes.BODY_HEIGHT
                            productFilling.scale.z = filling.size.z / productFilling.userData.trueSizes.BODY_DEPTH
                        }
                        else {
                            if (!filling.position.z)
                                filling.position.z = sizeModule.depth - filling.size.z / 2 - (isSlidingDoors / 2 || 0);
                        }

                        start_position.add(filling.position)
                        start_position.y += filling.size.y / 2 + full_horizont_height + baseOffset

                        productFilling.position.copy(start_position)

                        if (!isModel) {
                            PROPS.JSON_FILLINGS.push(productFilling)
                            const edge = this.edge_builder.createEdge(productFilling);
                            const clonePos = productFilling.position.clone()
                            edge.position.set(clonePos.x, clonePos.y, clonePos.z)
                            group.add(productFilling, edge)
                        }

                        group.add(productFilling)

                        if (filling.isProfile) {

                            let tmp_clone = productFilling.clone()
                            tmp_clone.position.y -= baseOffset
                            subGeometries.push(tmp_clone)
                        }
                    }

                    const filling_size = { width: filling.size.x, height: filling.size.y, depth: filling.size.z }
                    const data = this.createModelData(this._MODELS[productInfo.models[0]], PROPS, filling_size);

                    let productFilling
                    if (data.DAE) {
                        this.models_builder.create({ onLoad, props: { CONFIG: { MODELID: data.ID || data.id, SIZE: filling_size } }, sizeRulers: false, UMFillinig: true })
                    } else {
                        productFilling = this.createSubProductObject(filling, data, PROPS)
                        onLoad(productFilling, false)
                    }
                })
            }
        })

        if (PROPS.CONFIG['SIDEPROFILE']) {
            const filling = PROPS.CONFIG['SIDEPROFILE']
            const productInfo = this._PRODUCTS[filling.product]

            if (!productInfo)
                return

            const filling_size = { width: filling.size.x, height: filling.size.y, depth: filling.size.z }
            const data = this.createModelData(this._MODELS[productInfo.models[0]], PROPS, filling_size);

            const onLoad = (productFilling, isModel = true) => {

                if (filling.isProfile)
                    productFilling.userData.isProfile = true

                let sizeModule = PROPS.CONFIG.SIZE
                let start_position = this.getStartPosition(sizeModule)

                if (filling.rotation) {
                    productFilling.rotation.x = filling.rotation.x;
                    productFilling.rotation.y = filling.rotation.y;
                    productFilling.rotation.z = filling.rotation.z;
                }

                productFilling.userData.trueSizes = {
                    BODY_WIDTH: filling.size.x,
                    BODY_HEIGHT: filling.size.y,
                    BODY_DEPTH: filling.size.z,
                }

                filling.position.z = sizeModule.depth - filling.size.z / 2;

                start_position.add(filling.position)
                start_position.y += filling.size.x / 2 + baseOffset

                productFilling.position.copy(start_position)

                productFilling.updateMatrix()
                productFilling.updateMatrixWorld()

                const edge = this.edge_builder.createEdge(productFilling);
                const clonePos = productFilling.position.clone()
                edge.position.set(clonePos.x, clonePos.y, clonePos.z)

                group.add(productFilling, edge)

                let tmp_clone = productFilling.clone()
                tmp_clone.position.y -= baseOffset
                subGeometries.push(tmp_clone)
            }

            let productFilling = this.createSubProductObject(filling, data, PROPS)
            onLoad(productFilling, false)
        }

        if (subGeometries.length) {
            this.subtractGeometry(moduleBody, subGeometries)
        }

        return
    }

    createSubProductObject(filling: Object, data: THREETypes.TObject, props: THREETypes.TObject) {
        let textureUrl = filling.isProfile ? this._COLOR[props.CONFIG['PROFILECOLOR']].TEXTURE : this._FASADE[filling.color || filling.material || props.CONFIG['MODULE_COLOR']].TEXTURE
        let body = this.json_builder.createMesh({ data, textureUrl })

        body.position.set(eval(data.corr_x), eval(data.corr_y), eval(data.corr_z));
        body.matrixWorldNeedsUpdate = true
        body.name = "BODY"
        body.userData.MATERIAL = data.json?.material.type || null

        const box = new THREE.Box3().setFromObject(body);
        const size = box.getSize(new THREE.Vector3());

        body.userData.trueSizes = {
            BODY_WIDTH: size.x,
            BODY_HEIGHT: size.y,
            BODY_DEPTH: size.z,
        }

        return body
    };

    createLoop(product, PROPS, baseOffset: Number = 0) {
        const parentModel = this._MODELS[product.models[0]];
        // const model = this._MODELS[parentModel.loop_model];
        const model = this._MODELS[parentModel.loop_model].id;

        const loopPosition = this._LOOP_POSITION[parentModel.loop_position];
        let allLoopsMesh = new THREE.Object3D();

        let size = PROPS.CONFIG.SIZE
        let start_position = this.getStartPosition(size)

        const create = (dae, secIndex, doorKey, loopCoord) => {
            console.log(loopCoord, 'LOOPP COORD')


            let loopGroup = new THREE.Object3D();

            let box = new THREE.Box3().setFromObject(dae);
            let loop_size = new THREE.Vector3();
            box.getSize(loop_size)
            let loop = {};
            loop.width = loop_size.x;
            loop.height = loop_size.y;
            loop.depth = loop_size.z;

            console.log(loop.width)

            const loopside = loopCoord.side
            const rightSide = LOOPSIDE[loopside] === 'right' || LOOPSIDE[loopside] === 'right_on_partition'
            const top = LOOPSIDE[loopside] === 'top'

            let section = PROPS.CONFIG.SECTIONS[secIndex];

            const leftPosition = section.position.x - section.size.x / 2 + Math.round((loop.width + loopPosition.CORRECTION_X) / 2)
            const rightPosition = section.position.x + section.size.x / 2 - Math.round((loop.width + loopPosition.CORRECTION_X) / 2)

            if (LOOPSIDE[loopside] === 'none')
                return false

            loopCoord.coords.forEach((coord) => {
                let position;
                let loopMesh = new THREE.Object3D();



                let rotation = new THREE.Vector3(
                    Math.PI / 2,
                    rightSide ? Math.PI : 0,
                    0,
                );

                if (top) {
                    position = new THREE.Vector3(
                        coord[1] + loop.width,
                        coord[0] + loop.width * 0.25,
                        rightSide ?
                            PROPS.CONFIG.SIZE.depth + loopPosition.RIGHT_CORRECTION_Z :
                            PROPS.CONFIG.SIZE.depth + loopPosition.CORRECTION_Z,
                    );


                    rotation = new THREE.Vector3(
                        Math.PI * 0.5,
                        Math.PI + Math.PI * 0.5,
                        0,
                    );

                }
                else {
                    position = new THREE.Vector3(
                        rightSide ? rightPosition : leftPosition,
                        coord,
                        rightSide ?
                            PROPS.CONFIG.SIZE.depth + loopPosition.RIGHT_CORRECTION_Z :
                            PROPS.CONFIG.SIZE.depth + loopPosition.CORRECTION_Z,
                    );
                }

                position.z -= loop_size.z / 2 - 10

                loopMesh.rotation.set(rotation.x, rotation.y, rotation.z);

                position.add(start_position);
                position.y += baseOffset
                loopMesh.position.copy(position);

                loopMesh.add(dae.clone());
                loopGroup.add(loopMesh);
            })

            return loopGroup
        }

        const onLoad = (loopModel) => {
            Object.entries(PROPS.CONFIG.LOOPS).forEach(([secIndex, section]) => {
                // Добавляет петли
                section.forEach((door, doorKey) => {
                    door.forEach((fasadeLoop, fasadeLoopKey) => {
                        let loopMesh = create(loopModel.clone(), secIndex, fasadeLoopKey, fasadeLoop)
                        // loopMesh.traverse((child) => {
                        //     if (child instanceof THREE.Object3D) {
                        //         const edge = this.edge_builder.createEdge(child);
                        //         const clonePos = child.position.clone()

                        //         edge.position.set(clonePos.x, clonePos.y, clonePos.z)
                        //         edge.rotation.copy(child.rotation)
                        //         child.add(edge)
                        //     }
                        // })

                        if (loopMesh)
                            allLoopsMesh.add(loopMesh)
                    });
                });
            })
        }

        this.models_builder.create({ onLoad, props: { CONFIG: { MODELID: model } }, sizeRulers: false })

        return allLoopsMesh
    };

    calcSubElementsAdditives(PROPS) {
        const fasadeThickness = this._FASADE[PROPS.CONFIG.MODULE_COLOR]?.DEPTH || 18

        Object.entries(PROPS.CONFIG.SECTIONS).forEach(([sectionNumber, sectionConf]) => {
            if (sectionConf.fillings)
                Object.entries(sectionConf.fillings).forEach(([elementNumber, element]) => {
                    element.ADDITIVES = {}
                })
        })

        Object.entries(PROPS.CONFIG.SECTIONS).forEach(([sectionNumber, sectionConf]) => {
            if (sectionConf.fillings) {
                const sectionSize = { width: sectionConf.size.x, height: sectionConf.size.y, depth: sectionConf.size.z }
                Object.entries(sectionConf.fillings).forEach(([_elementNumber, element]) => {
                    const product = this.filters.filterProductInfo(element.product)
                    const elementNumber = +_elementNumber + 1
                    if (!product)
                        return

                    const PRODUCT_TYPE = this._PRODUCTS_TYPES[product.productType]?.CODE || false;

                    if (element.position) {

                        let leftObj, rightObj, bottomObj, topObj;

                        let positionX = element.position.x - fasadeThickness
                        let positionY = element.position.y

                        let sectionPos = sectionConf.position.x;

                        let leftPos = sectionPos - sectionSize.width / 2 - fasadeThickness,
                            rightPos = sectionPos + sectionSize.width / 2 - fasadeThickness,
                            bottomPos = 0,
                            topPos = sectionSize.height

                        if (!["vertical_shelf", "section_partition"].includes(element.type)) {
                            positionX = element.position.x

                            Object.entries(PROPS.CONFIG.SECTIONS[sectionNumber].fillings)?.filter(([key, item]) => item.type === "vertical_shelf")
                                .sort(([key1, item1], [key2, item2]) => {
                                    return item1.POSITION - item2.POSITION
                                })
                                .forEach(([key, object]) => {
                                    if (elementNumber != object.id && (positionY < object.position.y + object.size.y && positionY > object.position.y)) {
                                        let objPos = object.position.x

                                        if ((objPos + object.size.x / 2 <= positionX) && (objPos + object.size.x / 2 >= leftPos)) {
                                            leftObj = object
                                            leftPos = objPos + object.size.x / 2
                                        }

                                        if ((objPos - object.size.x / 2 >= positionX) && (objPos - object.size.x / 2 <= rightPos)) {
                                            rightObj = object
                                            rightPos = objPos - object.size.x / 2
                                        }
                                    }
                                })

                            let relative_posY = positionY + (element.type !== 'drawer' ? element.size.y / 2 : 0) - (element.fasade?.manufacturerOffset || 0)
                            if (leftObj) {
                                let relative_pos = leftObj.size.y - ((leftObj.position.y + leftObj.size.y) - relative_posY)

                                leftObj.ADDITIVES[elementNumber || element.id || element.product] = {
                                    id_subelement: element.product,
                                    additive_position: relative_pos,
                                    orientation: "right",
                                    section: +sectionNumber,
                                }

                                element.ADDITIVES[leftObj.id || leftObj.product] = {
                                    id_subelement: leftObj.product,
                                    additive_position: relative_pos,
                                    orientation: "left",
                                    section: +sectionNumber,
                                }

                                delete element.ADDITIVES["left"]

                            }
                            else {
                                if (PROPS.CONFIG.SECTIONS[+sectionNumber - 1]?.fillings?.[0] && PROPS.CONFIG.SECTIONS[+sectionNumber - 1].fillings[0].type === "section_partition") {
                                    leftObj = PROPS.CONFIG.SECTIONS[+sectionNumber - 1].fillings[0]
                                    let relative_pos = leftObj.size.y - ((leftObj.position.y + leftObj.size.y) - relative_posY)

                                    element.ADDITIVES[`${+sectionNumber - 1}_${leftObj.id || leftObj.product}`] = {
                                        id_subelement: leftObj.product,
                                        additive_position: relative_pos,
                                        orientation: "left",
                                        section: +sectionNumber - 1,
                                    }
                                    delete element.ADDITIVES["left"]

                                    leftObj.ADDITIVES[`${+sectionNumber}_${elementNumber || element.id || element.product}`] = {
                                        id_subelement: element.product,
                                        additive_position: relative_pos,
                                        orientation: "right",
                                        section: +sectionNumber,
                                    }
                                } else
                                    element.ADDITIVES["left"] = {
                                        id_subelement: false,
                                        additive_position: relative_posY,
                                        orientation: "left"
                                    }
                            }

                            if (rightObj) {
                                let relative_pos = rightObj.size.y - ((rightObj.position.y + rightObj.size.y) - relative_posY)

                                let righAdditiveName = elementNumber || element.id || element.product;
                                rightObj.ADDITIVES[righAdditiveName] = {
                                    id_subelement: element.product,
                                    additive_position: relative_pos,
                                    orientation: "left",
                                    section: +sectionNumber,
                                }

                                element.ADDITIVES[rightObj.id || rightObj.product] = {
                                    id_subelement: rightObj.product,
                                    additive_position: relative_pos,
                                    orientation: "right",
                                    section: +sectionNumber,
                                }

                                delete element.ADDITIVES["right"]

                            }
                            else {
                                if (PROPS.CONFIG.SECTIONS[+sectionNumber + 1] && PROPS.CONFIG.SECTIONS[+sectionNumber].fillings[0].type === "section_partition") {
                                    rightObj = PROPS.CONFIG.SECTIONS[+sectionNumber].fillings[0]
                                    let relative_pos = rightObj.size.y - ((rightObj.position.y + rightObj.size.y) - relative_posY)

                                    element.ADDITIVES[`${sectionNumber}_${rightObj.id || rightObj.product}`] = {
                                        id_subelement: rightObj.product,
                                        additive_position: relative_pos,
                                        orientation: "right",
                                        section: +sectionNumber,
                                    }
                                    delete element.ADDITIVES["right"]

                                    rightObj.ADDITIVES[`${sectionNumber}_${elementNumber || element.id || element.product}`] = {
                                        id_subelement: element.product,
                                        additive_position: relative_pos,
                                        orientation: "left",
                                        section: +sectionNumber,
                                    }
                                } else
                                    element.ADDITIVES["right"] = {
                                        id_subelement: false,
                                        additive_position: relative_posY,
                                        orientation: "right"
                                    }
                            }

                            element.VALUE = relative_posY

                        }
                        else {

                            Object.entries(PROPS.CONFIG.SECTIONS[sectionNumber].fillings)?.filter(([key, item]) => item.type === "shelf")
                                .sort(([key1, item1], [key2, item2]) => {
                                    return item1.POSITION - item2.POSITION
                                })
                                .forEach(([key, object]) => {
                                    let objRelPos = object.position.x - fasadeThickness
                                    let objHeight = object.fasade?.size?.y || object.size.y
                                    if (elementNumber != object.id && (positionX < objRelPos + object.size.x / 2 && positionX > objRelPos - object.size.x / 2)) {
                                        let objPos = object.position.y - (object.fasade?.manufacturerOffset || 0)
                                        if (objPos + objHeight <= positionY && objPos + objHeight >= bottomPos) {
                                            bottomObj = object
                                            bottomPos = objPos + objHeight
                                        }

                                        if (objPos >= positionY && objPos <= topPos) {
                                            topObj = object
                                            topPos = objPos
                                        }
                                    }
                                })

                            let relative_posX = positionX - (sectionConf.position.x - sectionSize.width / 2) + fasadeThickness
                            if (bottomObj) {
                                let bottomObjPositionX = bottomObj.position.x - bottomObj.size.x / 2 - fasadeThickness
                                let relative_pos = relative_posX - (bottomObjPositionX - leftPos)

                                bottomObj.ADDITIVES[elementNumber || element.id || element.product] = {
                                    id_subelement: element.product,
                                    additive_position: relative_pos,
                                    orientation: "top",
                                    section: +sectionNumber,
                                }

                                element.ADDITIVES[bottomObj.id || bottomObj.product] = {
                                    id_subelement: bottomObj.product,
                                    additive_position: relative_pos,
                                    orientation: "bottom",
                                    section: +sectionNumber,
                                }

                                delete element.ADDITIVES["bottom"]

                            } else {
                                element.ADDITIVES["bottom"] = {
                                    id_subelement: false,
                                    additive_position: positionX,
                                    orientation: "bottom"
                                }
                            }

                            if (topObj) {
                                let topObjPositionX = topObj.position.x - topObj.size.x / 2 - fasadeThickness
                                let relative_pos = relative_posX - (topObjPositionX - leftPos)

                                topObj.ADDITIVES[elementNumber || element.id || element.product] = {
                                    id_subelement: element.product,
                                    additive_position: relative_pos,
                                    orientation: "bottom",
                                    section: +sectionNumber,
                                }

                                element.ADDITIVES[topObj.id || topObj.product] = {
                                    id_subelement: topObj.product,
                                    additive_position: relative_pos,
                                    orientation: "top",
                                    section: +sectionNumber,
                                }

                                delete element.ADDITIVES["top"]

                            } else {
                                element.ADDITIVES["top"] = {
                                    id_subelement: false,
                                    additive_position: positionX,
                                    orientation: "top"
                                }
                            }

                            element.VALUE = positionX
                        }

                    }
                })
            }
        })
    }

}