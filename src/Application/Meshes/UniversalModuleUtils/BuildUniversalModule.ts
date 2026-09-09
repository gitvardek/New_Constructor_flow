// @ts-nocheck 

import * as THREE from 'three'
import * as THREETypes from "@/types/types"
import { OBB } from 'three/examples/jsm/math/OBB.js';

import {
    GridModule, LOOPSIDE
} from "@/components/UMconstructor/types/UMtypes.ts";

import { useSceneState } from "@/store/appliction/useSceneState"
import { useModelState } from '@/store/appliction/useModelState';

import { UM_PARAMS, WITH_TSARGA } from '@/components/UMconstructor/utils/Const';
import { BuildProduct } from "../BuildProduct"
import { _URL } from "@/types/constants";
import { CSG } from "three-csg-ts";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import { TFasadeProp } from "@/types/types";

import { ModulegridParser } from "./ModulegridParser";
import { FillingMeshBuilder } from "./FillingMeshBuilder";
import { AdjacencyCalculator } from "./AdjacencyCalculator";
import { GeometrySubtractor } from "./GeometrySubtractor";
import { LoopBuilder } from "./LoopBuilder";

export class BuildUniversalModule extends BuildProduct {

    project = useSceneState().getCurrentProjectParams;
    modelState = useModelState();

    heightCorrect: number = 0

    private readonly correctPosZGroups: number[] = [2166309]
    private readonly fillingOffset: number = 50
    private readonly UM_PARAMS: ReturnType<typeof UM_PARAMS> = UM_PARAMS

    // Продукто-агностичная часть сборки (не знает про корпус/стенки) —
    // компонуется через инъекцию this, тем же паттерном, что уже
    // используют edge_builder/tsarga_builder/models_builder в BuildProduct.
    // Переиспользуема будущими типами товара без корпуса (см. SESSION_CONTEXT.md).
    modulegrid_parser: ModulegridParser
    filling_mesh_builder: FillingMeshBuilder
    adjacency_calculator: AdjacencyCalculator

    // "Коробочная" часть сборки — специфична для товаров со сплошным телом.
    geometry_subtractor: GeometrySubtractor
    loop_builder: LoopBuilder

    constructor(root: THREETypes.TApplication) {
        super(root);

        this.modulegrid_parser = new ModulegridParser(this)
        this.filling_mesh_builder = new FillingMeshBuilder(this)
        this.adjacency_calculator = new AdjacencyCalculator(this)
        this.geometry_subtractor = new GeometrySubtractor(this)
        this.loop_builder = new LoopBuilder(this)
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
            ? this.createBody(data, PROPS, defaultConfig, modelSize)
            : { body: null, tempMaterial: null, move: null };

        const shelf = this._SHELF_POSITION[productId]
            ? this.shelf_builder.createShelfs(PROPS, this._SHELF_POSITION[productId], tempMaterial, move)
            : null;

        const legs = legsHeight
            ? this.leg_builder.buildLegs(PROPS, data, total, legsHeight)
            : null;

        const plinth = legsHeight > 0
            ? this.plinth_builder.buildPlinth(PROPS, legsHeight, defaultConfig)
            : null;

        if (MODULEGRID) {
            this.modulegrid_parser.parseModulegrid(MODULEGRID, PROPS)
            this.filling_mesh_builder.buildModulegrid(PROPS, total, body, baseY)
            this.adjacency_calculator.calcSubElementsAdditives(PROPS)
        }

        if (CONFIG.LOOPS && Object.keys(CONFIG.LOOPS)?.length) {
            let loopsMesh = this.loop_builder.createLoop(productInfo, PROPS, baseY)
            total.add(loopsMesh)
        }

        /** Добавляем фасад */
        const fasade = Object.keys(CONFIG.FASADE_PROPS).length
            ? this.fasade_builder.buildAllFasades({
                props: PROPS,
                isUMmodule: !!MODULEGRID,
                defaultConfig,
                curBodyExceptions
            })
            : null;

        console.log(fasade, 'FFFFF')

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
            this.setBounds(total, sourceForBounds, size, CONFIG);
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

        CONFIG.MODULEGRID = <GridModule>{}

        if (product_data.BACKWALL?.length && product_data.BACKWALL?.[0]) {
            CONFIG.BACKWALL = <TFasadeProp>{ SHOW: true }
            CONFIG.BACKWALL.COLOR = this.filters.filterModuleColor(product_data.BACKWALL)[0] || CONFIG["MODULE_COLOR"];
        }

        if (product_data.SIDEWALL?.length && product_data.SIDEWALL?.[0]) {
            CONFIG.LEFTSIDECOLOR = <TFasadeProp>{ COLOR: false }
            CONFIG.RIGHTSIDECOLOR = <TFasadeProp>{ COLOR: false }
        }

        CONFIG.TOPFASADECOLOR = <TFasadeProp>{ COLOR: 7397, SHOW: false }

        if (product_data.moduleType?.CODE !== "wardrobe") {
            CONFIG.LOOPS = {}
        }
        else {
            CONFIG.isSlideDoor = true
        }

        if (this._APP.CATALOG.SECTIONS[product_data.OPTIONSECTION_ID].TYPE.toLowerCase().includes("hitech"))
            CONFIG.isHiTech = true

        if (product_data.moduleType?.CODE === "restricted")
            CONFIG.isRestrictedModule = true

        let option = CONFIG.OPTIONS.find(item => +item.id === 8390271)
        if (product_data.SIDEWALL?.[0] && option && !option.active) {
            option.active = true
        }

        return CONFIG
    }

}
