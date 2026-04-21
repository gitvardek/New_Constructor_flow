
// @ts-nocheck

import * as THREE from 'three'
import type { Material } from 'three';
import * as THREEInterfases from "@/types/interfases"
import * as THREETypes from "@/types/types"

import { OBB } from 'three/examples/jsm/math/OBB.js';

import { useAppData } from "@/store/appliction/useAppData"
import { useSceneState } from "@/store/appliction/useSceneState"
import { useModelState } from '@/store/appliction/useModelState';
import { useMenuStore } from '@/store/appStore/useMenuStore.ts';
import { useRoomOptions } from "@/components/left-menu/option/roomOptions/useRoomOptons";

import { Resources } from '../Utils/Resources'
import { Ruler } from '../Utils/Ruler'

import { Filters } from './Utils/Filters'

import { JsonBuilder } from './JsonProductBuilder'
import { ModelsBuilder } from './ModelsBuilder/ModelsBuilder.ts'
import { MillingBuilder } from './MillingBuilder';
import { ShowcaseBuilder } from './Showcase/ShowcaseBuilder.ts';

import { FasadeBuilder } from './FasadeBuilder';
import { TableTopBuilder } from './TableTopBuilder/TableTopBuilder.ts';
import { PaletteBuilder } from './PaletteBuilder';
import { AlumBuilder } from './AlumBuilder.ts';
import { UniformTextureBuilder } from './UniformTextureBuilder.ts';
import { BuildersHelper } from "./BuildersHelper"
import { EdgeBuilder } from './EdgeBuilder/EdgeBuilder.ts';
import { HandlesBuilder } from './Handles/Handles.ts';
import { PlinthBuilder } from './PlinthBuilder/PlinthBuilder.ts';
import { DrowerBuilder } from './Drowers/DrowerBuilder.ts';
import { ShelfBuilder } from './Shelf/ShelfBuilder.ts';
import { MirrorBuilder } from './MirrorBuilder/MirrorBuilder.ts';

export class BuildProduct extends BuildersHelper {

    root: THREETypes.TApplication;
    resources: Resources;

    project = useSceneState().getCurrentProjectParams;
    menuStore: ReturnType<typeof useMenuStore> = useMenuStore();
    roomOptions: ReturnType<typeof useRoomOptions> = useRoomOptions();
    modelState: ReturnType<typeof useModelState> = useModelState();

    ruler: THREETypes.TRuler
    filters: Filters;
    json_builder: JsonBuilder;
    models_builder: ModelsBuilder;
    milling_builder: MillingBuilder;
    showcase_builder: ShowcaseBuilder;
    handles_builder: HandlesBuilder
    fasade_builder: FasadeBuilder;
    palette_bulider: PaletteBuilder
    tabletop_builder: TableTopBuilder
    alum_builder: AlumBuilder
    edge_builder: EdgeBuilder
    plinth_builder: PlinthBuilder
    drower_builder: DrowerBuilder
    shelf_builder: ShelfBuilder
    mirror_builder: MirrorBuilder
    uniform_texture_builder: UniformTextureBuilder
    useEdgeBuilder: THREETypes.TUseEdgeBuilder


    constructor(root: THREETypes.TApplication) {
        super(root)

        this.root = root
        this.ruler = root.ruler!
        this.resources = root._resources!
        this.useEdgeBuilder = root.useEdgeBuilder
        this.disabledProducts = {};

        this.filters = new Filters(root);
        this.json_builder = new JsonBuilder(this);
        this.edge_builder = new EdgeBuilder(this);
        this.models_builder = new ModelsBuilder(this);
        this.milling_builder = new MillingBuilder(root);
        this.showcase_builder = new ShowcaseBuilder(root);
        this.palette_bulider = new PaletteBuilder(this);
        this.alum_builder = new AlumBuilder(this);
        this.uniform_texture_builder = new UniformTextureBuilder(root, this);
        this.handles_builder = new HandlesBuilder(this)
        this.fasade_builder = new FasadeBuilder(this);
        this.tabletop_builder = new TableTopBuilder(this);
        this.drower_builder = new DrowerBuilder(this)
        this.plinth_builder = new PlinthBuilder(this)
        this.shelf_builder = new ShelfBuilder(this)
        this.mirror_builder = new MirrorBuilder(this)
    }

    get _currentProduct() {
        return this
    }

    //========================================================================================================

    getModel(
        product_data: THREETypes.TObject,
        loaded_props?: THREETypes.TObject,
        loaded_size?: THREETypes.TObject
    ): Promise<THREE.Object3D> {
        return new Promise((resolve) => {
            const type = this._MODELS[product_data.models[0]];

            if (type.DAE) {
                return this.models_builder.create({
                    props: this.createStartProps(product_data, loaded_props),
                    size: loaded_size
                })
                    .then(model => this.finalizeModel(model, resolve, type))
                    .catch(err => console.error('Ошибка загрузки DAE:', err));
            }

            const parentGroup = this.createPerentGroup(product_data, type, loaded_props, loaded_size);
            return this.finalizeModel(parentGroup, resolve);
        });
    }

    // FIX: был баг — onTextureLoad() вызывался немедленно вместо передачи как callback
    private finalizeModel(
        model: THREE.Object3D,
        resolve: (obj: THREE.Object3D) => void,
        type?: any
    ) {
        if (type) {
            resolve(model);
            return;
        }

        const pendingTextures = this.collectPendingTextures(model);

        if (pendingTextures.length === 0) {
            resolve(model);
            return;
        }

        let loadedCount = 0;
        const onTextureLoad = () => {
            if (++loadedCount === pendingTextures.length) {
                pendingTextures.forEach(tex => tex.removeEventListener('load', onTextureLoad));
                resolve(model);
            }
        };

        pendingTextures.forEach(tex => {
            // FIX: передаём ссылку на функцию, а не результат её вызова
            tex.image?.complete ? onTextureLoad() : tex.addEventListener('load', onTextureLoad);
        });
    }

    // Выделено из finalizeModel для читаемости и переиспользования
    private collectPendingTextures(model: THREE.Object3D): THREE.Texture[] {
        const MAP_KEYS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'lightMap'] as const;
        const textures: THREE.Texture[] = [];

        model.traverse((child) => {
            if (!(child instanceof THREE.Mesh)) return;

            const materials: THREE.Material[] = Array.isArray(child.material)
                ? child.material
                : [child.material];

            for (const mat of materials) {
                if (!mat) continue;
                for (const key of MAP_KEYS) {
                    const tex = (mat as any)[key];
                    if (tex instanceof THREE.Texture && !tex.image) {
                        textures.push(tex);
                    }
                }
            }
        });

        return textures;
    }

    //========================================================================================================

    /** Создание данных модели */
    createPerentGroup(
        product_data: THREETypes.TObject,
        type: THREETypes.TObject,
        loadedProps?: THREETypes.TObject,
        loaded_size?: THREETypes.TObject
    ) {


        const parent_group = new THREE.Object3D();
        const props: THREETypes.TObject = loadedProps ?? this.createStartProps(product_data);

        parent_group.userData.PROPS = props;
        parent_group.product_id = product_data.ID

        if (type.DAE) return parent_group;

        const product = loaded_size
            ? this.createProductBody(parent_group, loaded_size, false, true)
            : this.createProductBody(parent_group);

        parent_group.add(product as THREE.Object3D);

        // const aabb = new THREE.Box3().setFromObject(parent_group);
        // const obb = new OBB().fromBox3(aabb);

        const aabb = product?.userData.aabb;
        const obb = product?.userData.obb;
        const productSize = new THREE.Vector3();
        aabb.getSize(productSize);


        parent_group.userData.elementType = product_data.element_type;
        parent_group.elementType = product_data.element_type;
        parent_group.userData.trueSizes = product.userData.trueSizes ?? {
            DEPTH: productSize.z * 0.5,
            HEIGHT: productSize.y * 0.5,
            WIDTH: productSize.x * 0.5,
        };
        parent_group.userData.disableRaycast = product_data.disable_raycast == 1;
        parent_group.userData.disableMove = false

        parent_group.userData.aabb = product.userData.aabb ?? aabb;
        parent_group.userData.obb = product.userData.obb ?? obb;
        parent_group.userData.restrictData = {};

        return parent_group;
    }

    createStartProps(product_data: THREEInterfases.IProduct, loadedProps?: THREETypes.TObject) {
        const props: THREETypes.TTotalProps = {
            ARROWS: [],
            BODY: [],
            CONFIG: {},
            DRAWERS: {},
            EXPRESSIONS: {},
            FASADE: [],
            FASADE_DEFAULT: [],
            GLASS: {},
            HANDLES: {},
            HIDDENCHILDREN: {},
            HIDDEN: false,
            JSON_FILLINGS: [],
            LEG: {},
            MILLINGS: [],
            PRODUCT: product_data.ID,
            PLINTH_MESH: null,
            RASPIL: [],
            RASPIL_LIST: [],
            RASPIL_COUNT: 0,
            SHELF: [],
            SEPARATED: [],
            SECTIONSOBJ: [],
            SECTIONCONTROL: [],
            TABLETOP: null,
            NAME: product_data.NAME,
        };

        props.CONFIG = this.createProductObject(product_data, props, loadedProps);
        return props;
    }

    private createProductObject(
        product_data: THREEInterfases.IProduct,
        props: THREETypes.TObject,
        loadedProps?: THREETypes.TObject
    ): THREETypes.TConfig {
        const isDae = this._MODELS[product_data.models[0]].DAE;

        const {
            element_type, ID, models, width, height, depth,
            tabletop, FASADE_SIZES, FACADE, MODULECOLOR,
            type_showcase, USLUGI, leg_length, OPTION, SHELFQUANT
        } = product_data;

        // Определяем тип элемента
        const elType: THREETypes.TElementType =
            (element_type === null && Number.isInteger(leg_length)) ? "element_down" : element_type;

        const PARAMS: THREETypes.TConfig = {
            // DISABLE_MOVE: false,
            ELEMENT_TYPE: elType,
            ID,
            FASADE_PROPS: [],
            FASADE_SIZE: {},
            FASADE_POSITIONS: [],
            FASADE_TYPE: [],
            FILLING: null,
            FILLING_LIST: [],
            HANDLES: {},
            HANDLES_POSITION: {},
            HAVETABLETOP: tabletop != null && this.project.table_top_type_auto,
            TABLETOP_ID: null,
            HIDE_FASADE: false,
            HIDDEN: false,
            MODELID: models[0],
            MODEL: models,
            MODULE_COLOR: null,
            MECHANISM: null,
            MECHANISM_TEMP: [],
            SIZE: { width, height, depth },
            SIZE_EDIT: {
                SIZE_EDIT_WIDTH_MIN: null,
                SIZE_EDIT_WIDTH_MAX: null,
                SIZE_EDIT_HEIGHT_MIN: null,
                SIZE_EDIT_HEIGHT_MAX: null,
                SIZE_EDIT_DEPTH_MIN: null,
                SIZE_EDIT_DEPTH_MAX: null,
                SIZE_EDIT_STEP_HEIGHT: null,
                SIZE_EDIT_STEP_DEPTH: null,
                SIZE_EDIT_STEP_WIDTH: null,
                SIZE_EDIT_JOINDEPTH_MIN: null,
                SIZE_EDIT_JOINDEPTH_MAX: null,
            },
            SHOWCASE: [],
            SHELFQUANT: { max: SHELFQUANT ?? null, current: SHELFQUANT ? 0 : null },
            POSITION: null,
            PLINTH_ACTIONS: {},
            PRODUCT_SHOWCASE: null,
            UNIFORM_TEXTURE: {
                group: null, level: null, index: null,
                column_index: null, backupFasadId: null, color: null,
            },
            OPTIONS: [],
            USLUGI: [],
            PROFILE: [],
            KROMKA: null,
            SIZEEDITJOINDEPTH: product_data.SIZE_EDIT_JOINDEPTH_MIN ? 310 : null,
            DAE: isDae,
        };

        // Все дополнительные данные заполняем только если не DAE-модель
        if (!isDae) {
            if (product_data.FILLING.length && product_data.FILLING[0]) {
                const filling_list = this.filters.filterFilling(this._FILLING, {
                    PR: PARAMS,
                    ID: product_data.FILLING,
                });
                PARAMS.FILLING = PARAMS.FILLING ?? filling_list[0]?.ID;
                PARAMS.FILLING_LIST = product_data.FILLING;
            }

            if (this._PRODUCTS[ID].leg_length) {
                PARAMS.PLINTH_ACTIONS = this.createPlinthParams(this._PRODUCTS[ID].models);
            }

            if (OPTION.length && OPTION[0] !== null) {
                PARAMS.OPTIONS = this.filters.filterOption(OPTION);
            }

            if (FASADE_SIZES?.length) {
                PARAMS.FASADE_SIZE = this.filters.filterFasadeSizer(FASADE_SIZES, product_data) as any[];
            }

            if (FACADE?.[0]) {
                this.filters.filterFasadePosition(PARAMS, product_data);
            }

            if (MODULECOLOR?.[0] != null) {
                PARAMS.MODULE_COLOR = this.filters.filterModuleColor(MODULECOLOR)[0];
            }

            if (type_showcase?.[0] != null) {
                PARAMS.SHOWCASE = [...type_showcase];
                PARAMS.PRODUCT_SHOWCASE = type_showcase[0];
            }

            if (USLUGI?.[0] != null) {
                const { uslugi, profile } = this.filters.filterUslugi(USLUGI, product_data);
                PARAMS.PROFILE = profile;
                PARAMS.USLUGI = uslugi;
                props.RASPIL = this.createStartTopTableCutData(uslugi, product_data);
            }
        }

        PARAMS.SIZE = loadedProps ? loadedProps.CONFIG.SIZE : this.getProductSize(PARAMS, product_data);
        PARAMS.SIZE_EDIT = { ...this.getSizeEdit(product_data, PARAMS) };

        return PARAMS;
    }

    /** Создание тела продукта */
    public createProductBody(
        parentGroup: THREE.Object3D,
        size?: { width: number; height: number; depth: number } | null,
        resize: boolean = false,
        isLoad: false
    ) {
        const drowMode = this.menuStore.getDrowModeValue;
        const total = new THREE.Object3D();

        const { PROPS } = parentGroup.userData;
        const { CONFIG } = PROPS;
        const defaultConfig: THREETypes.TDefaultOptionsConfig = this.getDefaultOptionsConfig();

        PROPS.FASADE = [];
        PROPS.FASADE_DEFAULT = [];
        PROPS.SHELF = [];
        PROPS.ARROWS = [];
        PROPS.BODY = [];

        const productId = CONFIG.ID;
        const modelData = this._MODELS[CONFIG.MODELID];
        const modelSize = size ?? CONFIG.SIZE;
        const bodyExceptions = this.project.default_overlay_id;
        const legsHeight = this._PRODUCTS[productId]?.leg_length;
        const fasadeProps = Object.values(CONFIG.FASADE_PROPS);
        const shelfCount = CONFIG.SHELFQUANT.max;

        // Обновляем размер в конфиге
        if (size) {
            PROPS.CONFIG.SIZE = resize
                ? this.getProductSize(CONFIG, size)
                : size;
        }

        total.userData.prodSize = PROPS.CONFIG.SIZE;

        if (!modelData) return;

        const data = this.createModelData(modelData, PROPS, modelSize);
        const curBodyExceptions = bodyExceptions?.includes(modelData.id);

        const { body, tempMaterial, move } = !this.isEmpty(modelData)
            ? this.createBody(data, PROPS, defaultConfig, modelSize)
            : { body: null, tempMaterial: null, move: null };

        const shelf = shelfCount
            ? this.shelf_builder.buildShelves(PROPS, tempMaterial)
            : this._SHELF_POSITION[productId]
                ? this.shelf_builder.createShelfs(PROPS, this._SHELF_POSITION[productId], tempMaterial, move)
                : null;

        const legs = legsHeight ? this.buildLegs(PROPS, data, total) : null;
        const plinth = legsHeight > 0 ? this.plinth_builder.buildPlinth(PROPS, legsHeight) : null;

        const fasade = fasadeProps.length
            ? this.fasade_builder.getFasade({ props: PROPS, defaultConfig, curBodyExceptions, isLoad })
            : null;

        const hasDrawers = fasadeProps.length > 0 && fasadeProps.some(item => item.DRAWER.drawer);
        const drower = hasDrawers ? this.drower_builder.createDrowers({ props: PROPS }) : null;

        const arrows = this.addArrowSize({ object: body, props: PROPS, group: total });

        // Позиционирование по Y
        const baseY = legsHeight * 0.5;
        const parts: Array<[THREE.Object3D | null, number]> = [
            [legs, baseY],
            [body, baseY],
            [shelf, baseY],
            [fasade, baseY],
            [drower, baseY],
            [plinth, 0],
            [arrows, baseY],
        ];

        parts.forEach(([part, y]) => {
            if (!part) return;
            part.position.y = y;
        });

        if (body) {
            body.position.set(move.x, baseY, move.z);
            body.visible = !curBodyExceptions;
            // body.updateMatrixWorld(true);
        }

        if (arrows) arrows.position.copy(body?.position ?? new THREE.Vector3());

        // Формируем итоговую группу в зависимости от исключений
        const totalParts = curBodyExceptions
            ? [body, shelf, fasade, arrows, plinth]
            : [plinth, legs, body, shelf, fasade, drower, arrows];

        totalParts.filter(Boolean).forEach(part => total.add(part as THREE.Object3D));

        // Источник для вычисления коллизий
        const tempTotal = new THREE.Object3D();
        const exept = new THREE.Object3D();

        [legs?.clone(), body?.clone(), shelf?.clone(), fasade?.clone()]
            .filter(Boolean)
            .forEach(part => tempTotal.add(part));

        [legs?.clone(), body?.clone(), plinth?.clone()]
            .filter(Boolean)
            .forEach(part => exept.add(part));

        const sourceForBounds = curBodyExceptions ? exept : tempTotal;

        if (sourceForBounds) this.setBounds(total, sourceForBounds);

        if (drowMode) this.useEdgeBuilder.drawingMode(drowMode, total);

        return total;
    }

    /** Создание тела модели */
    private createBody(
        data: THREETypes.TObject,
        props: THREETypes.TObject,
        defaultConfig: THREETypes.TDefaultOptionsConfig,
        modelSize
    ) {
        const { CONFIG } = props;
        const { ELEMENT_TYPE, MODULE_COLOR, ID } = CONFIG;
        const { defModuleTop, defModuleBottom, moduleTop, moduleBottom } = defaultConfig;
        const product = this._PRODUCTS[ID];
        const texture = product.texture;

        const defaultColors = this.modelState.createFlatModuleData(product.MODULECOLOR);
        const materislExist = defaultColors.includes(MODULE_COLOR);/** Проверка на существование материала по ID */


        const isRoomElement = product.element_type === "element_room"
        const wallTextureId = isRoomElement && CONFIG.MODULE_COLOR === null
            ? parseInt(this.root._roomManager._currentWallTextureId)
            : CONFIG.MODULE_COLOR

        const resolveColorId = (): string => {
            // const defaultColors = this.modelState.createFlatModuleData(product.MODULECOLOR);
            const isDefault = MODULE_COLOR === this.project.default_module_color || MODULE_COLOR === defaultColors[0];

            const resolveForType = (defColor: string, globalFlag: boolean): string => {
                const materislExist = defaultColors.includes(MODULE_COLOR);

                const isAvailable = product.MODULECOLOR.includes(defColor);

                return (defColor && isDefault && isAvailable) || (globalFlag && isAvailable)
                    ? defColor
                    : MODULE_COLOR;
            };

            switch (ELEMENT_TYPE) {
                case "element_down": return resolveForType(defModuleBottom, moduleBottom.global);
                case "element_up": return resolveForType(defModuleTop, moduleTop.global);
                default: return MODULE_COLOR;
            }
        };

        const moduleColorId = !materislExist ? defaultColors[0] : texture?.src && !this._FASADE[MODULE_COLOR]
            ? MODULE_COLOR
            : resolveColorId();

        CONFIG.MODULE_COLOR = isRoomElement ? wallTextureId : moduleColorId;

        console.log(moduleColorId, '❌ === isRoomElement === ❌')

        const moduleColorObject = isRoomElement ?
            this._WALL[wallTextureId] :
            this._FASADE[moduleColorId]

        const moduleColor = isRoomElement ?
            moduleColorObject.texture :
            moduleColorObject?.TEXTURE;

        const isTopTable = texture?.src && !moduleColor;

        // console.log(isTopTable, moduleColorObject, '❌ === MODULE_COLOR === ❌')

        // Применяем кастомные перекрытия элементов через вспомогательный метод
        this.applyBodyOverrides(data, CONFIG, moduleColorObject);

        const body = this.json_builder.createMesh({
            data: { ...data, ...modelSize },
            textureUrl: moduleColor,
            left: CONFIG.LEFTSIDECOLOR?.SHOW ? Object.assign({}, CONFIG.LEFTSIDECOLOR) : undefined,
            right: CONFIG.RIGHTSIDECOLOR?.SHOW ? Object.assign({}, CONFIG.RIGHTSIDECOLOR) : undefined,
            back: CONFIG.BACKWALL?.SHOW ? Object.assign({}, CONFIG.BACKWALL) : undefined,
            top: CONFIG.TOPFASADECOLOR?.SHOW ? Object.assign({}, CONFIG.TOPFASADECOLOR) : undefined,
            tsarga: CONFIG.TSARGA ? Object.assign({}, CONFIG.TSARGA) : undefined,
            isTopTable,
            isRoomElement
        });

        body.add(this.edge_builder.createEdge(body));

        if (isTopTable) {

            const { geometryType } = body.userData;
            const textureSize = {
                width: geometryType === "ExtrudeGeometry" ? texture.width : 1,
                height: geometryType === "ExtrudeGeometry" ? texture.height : 1,
            };
            body.children.forEach((child) => {
                if (!(child instanceof THREE.Mesh)) return;
                const params: any = { material: child.material, url: texture.src, texture_size: textureSize };
                if (geometryType === "ExtrudeGeometry") params.rotation = Math.PI * 0.5;
                this.getTexture(params);
                body.userData.MATERIAL = child.material;
            });
        }

        if (product.productType === this.project.mirror_type) {
            body.traverse(el => {
                if (el instanceof THREE.Mesh && !el.userData.edge) {
                    this.mirror_builder.createMirrorMaterial(el, moduleColor);
                }
            });
        }

        body.matrixWorldNeedsUpdate = true;
        body.name = "BODY";
        body.userData.MATERIAL_TYPE = data.json.material.type;

        const move = new THREE.Vector3(eval(data.corr_x) ?? 0, 0, eval(data.corr_z) ?? 0);
        props.BODY = body;

        const size = new THREE.Box3().setFromObject(body).getSize(new THREE.Vector3());

        body.userData.trueSize = {
            BODY_WIDTH: size.x ?? 0,
            BODY_HEIGHT: size.y ?? 0,
            BODY_DEPTH: size.z ?? 0,
        };

        props.BODY_DEFAULT = body.clone();
        return { body, tempMaterial: body.children[0]?.material, move };
    }

    /**
     * Модифицирует json.items в data на основе TOPFASADECOLOR, TSARGA, BACKWALL и т.д.
     * Выделено из createBody для снижения его сложности.
     */
    private applyBodyOverrides(
        data: THREETypes.TObject,
        CONFIG: THREETypes.TConfig,
        moduleColor: any
    ) {
        const { TOPFASADECOLOR, TSARGA, BACKWALL } = CONFIG;
        const moduleThickness = this._FASADE[CONFIG.FASADE_PROPS[0]?.COLOR]?.DEPTH || moduleColor?.DEPTH || 18;
        const startPos = this.getStartPosition(CONFIG.SIZE);

        if (TOPFASADECOLOR?.SHOW) {
            const top = this._FASADE[TOPFASADECOLOR.COLOR];
            const topFasade_width = CONFIG.SIZE.width;
            const topFasade_depth = CONFIG.SIZE.depth + moduleThickness;
            const topFasade_thickness = top.DEPTH;

            Object.assign(TOPFASADECOLOR, {
                width: topFasade_width,
                depth: topFasade_depth,
                thickness: topFasade_thickness,
            });

            data.json.items.push({
                id: 'top_fasade',
                type: "object",
                geometry: {
                    type: "BoxGeometry",
                    opt: { x: topFasade_width, y: topFasade_thickness, z: topFasade_depth },
                },
                rotation: { x: 0, y: 0, z: 0 },
                position: {
                    x: 0,
                    y: startPos.y + CONFIG.SIZE.height + top.DEPTH / 2,
                    z: startPos.z + CONFIG.SIZE.depth / 2 + moduleThickness / 2,
                },
            });
        }

        if (TSARGA) {
            const isMetalTsarga = TSARGA.TYPE === 'metal';
            const backItem = isMetalTsarga
                ? {
                    id: "horizontallineback",
                    type: "object",
                    geometry: {
                        type: "BoxGeometry",
                        opt: { x: CONFIG.SIZE.width - moduleThickness * 2, y: 15, z: 15 },
                    },
                    rotation: { x: 0, y: 0, z: 0 },
                    position: {
                        x: 0,
                        y: startPos.y + CONFIG.SIZE.height - 15 / 2,
                        z: startPos.z + 15 / 2,
                    },
                }
                : {
                    id: "horizontallineback",
                    type: "object",
                    geometry: {
                        type: "BoxGeometry",
                        opt: { x: CONFIG.SIZE.width - moduleThickness * 2, y: 30, z: moduleThickness },
                    },
                    rotation: { x: 0, y: 0, z: 0 },
                    position: {
                        x: 0,
                        y: startPos.y + CONFIG.SIZE.height - 15,
                        z: startPos.z + moduleThickness / 2,
                    },
                };

            const frontItem = {
                id: "horizontallinefront",
                type: "link",
                link: "horizontallineback",
                rotation: { x: 0, y: 0, z: 0 },
                position: {
                    x: 0,
                    y: isMetalTsarga
                        ? startPos.y + CONFIG.SIZE.height - 15 / 2
                        : startPos.y + CONFIG.SIZE.height - 15,
                    z: startPos.z + CONFIG.SIZE.depth - (isMetalTsarga ? 15 / 2 : moduleThickness / 2),
                },
            };

            data.json.items.push(backItem, frontItem);
            data.json.items = data.json.items.filter(item => item.id !== 'top');
        }

        if (BACKWALL && !BACKWALL.SHOW) {
            data.json.items = data.json.items.filter(item => item.id !== 'back');
        }
    }

    /** Создание ножек модели */
    private buildLegs(
        props: THREETypes.TObject,
        model_data: THREETypes.TObject,
        group: THREE.Object3D,
        custom_leg_length?: number
    ) {
        const size = props.CONFIG.SIZE;
        const leg_length = custom_leg_length ?? this.modelState.getModels[props.PRODUCT].leg_length;
        const legs = new THREE.Object3D();
        const start_position = this.getStartPosition(size);

        const leg_position = model_data.json.legs ?? this.getLegPositions(start_position, size, model_data);

        Object.values(leg_position as THREETypes.TObject[]).forEach((position) => {
            const leg = this.createLeg(leg_length);
            leg.position.set(position.x, position.y, position.z);
            legs.add(leg);
        });

        legs.name = 'LEGS';
        props.LEG = legs;
        return legs;
    }

    // FIX: убрана мутация входного параметра start_position — теперь работаем с копией
    private getLegPositions(
        start_position: THREETypes.TObject,
        size: THREETypes.TObject,
        model: THREETypes.TObject
    ) {
        const corr_x = model ? eval(model.corr_x) : 0;
        const corr_y = model ? eval(model.corr_y) : 0;
        const corr_z = model ? eval(model.corr_z) : 0;

        const x = start_position.x + corr_x;
        const y = start_position.y + corr_y;
        const z = start_position.z + corr_z;

        const leg_position: { [key: string]: { x: number; y: number; z: number } } = {
            '1': { x: x + 70, y, z: z + 70 },
            '2': { x: x + size.width - 70, y, z: z + 70 },
            '3': { x: x + size.width - 70, y, z: z + size.depth - 70 },
            '4': { x: x + 70, y, z: z + size.depth - 70 },
        };

        if (model?.json?.sixLegs) {
            leg_position['5'] = { x: x + size.width / 2, y, z: z + 70 };
            leg_position['6'] = { x: x + size.width / 2, y, z: z + size.depth - 70 };
        }

        return leg_position;
    }

    private createLeg(leg_length: number) {
        const material = new THREE.MeshPhongMaterial({
            emissive: "#000000",
            color: "#000000",
            reflectivity: 0.05,
        });

        const topGeometry = new THREE.CylinderGeometry(14, 14, leg_length, 8);
        const bottomGeometry = new THREE.CylinderGeometry(25, 25, 20, 12);
        topGeometry.computeBoundingBox();
        bottomGeometry.computeBoundingBox();

        const group = new THREE.Object3D();
        const top = new THREE.Mesh(topGeometry, material);
        const bottom = new THREE.Mesh(bottomGeometry, material);

        top.castShadow = true;
        bottom.castShadow = true;

        top.position.setY(-(leg_length / 2));
        bottom.position.setY(-leg_length + 10);

        // Запекаем трансформации в геометрию и сбрасываем позиции
        [top, bottom].forEach(mesh => {
            mesh.updateMatrix();
            mesh.geometry.applyMatrix4(mesh.matrix);
            mesh.position.set(0, 0, 0);
        });

        group.add(top, bottom, this.edge_builder.createEdge(top), this.edge_builder.createEdge(bottom));
        return group;
    }

    /** Создание стрелок размеров модели */
    private addArrowSize({
        group,
        object,
        props,
    }: {
        group: THREE.Object3D;
        object: THREE.Object3D;
        props: THREETypes.TObject;
    }) {
        const arrows = new THREE.Object3D();
        const rulerObjects = this.ruler.drawRullerObjects(object, group);
        const isVisible = this.menuStore.getRulerVisibility;

        rulerObjects.forEach(item => {
            Object.values(item).forEach(obj => {
                if (!isVisible) {
                    obj.visible = false;
                    obj.traverse(child => { child.visible = false; });
                }
                arrows.add(obj);
            });
        });

        arrows.name = "ARROWS";
        props.ARROWS = arrows;
        return arrows;
    }

    private setBounds(target: THREE.Object3D, source: THREE.Object3D) {
        const aabb = new THREE.Box3().setFromObject(source);
        const obb = new OBB().fromBox3(aabb);
        const size = new THREE.Vector3();
        aabb.getSize(size);

        target.userData.trueSizes = {
            DEPTH: size.z * 0.5,
            HEIGHT: size.y * 0.5,
            WIDTH: size.x * 0.5,
        };
        target.userData.aabb = aabb;
        target.userData.obb = obb;
    }

    /** Дефолтные глобальные значения цвета фасада/модуля */
    getDefaultOptionsConfig(): THREETypes.TDefaultOptionsConfig {
        const { moduleTop, moduleBottom, fasadsTop, fasadsBottom, tableTop, plinth } =
            this.roomOptions.getGlobalOptions;

        return {
            defModuleTop: moduleTop.id ?? this.project.default_module_color_top,
            defModuleBottom: moduleBottom.id ?? this.project.default_module_color_bottom,
            defFasadeTop: fasadsTop.id ?? this.project.default_fasade_top,
            defFasadeBottom: fasadsBottom.id ?? this.project.default_fasade_bottom,
            deffShowcase: this.project.default_showcase,
            defMilling: this.project.default_milling,
            defPatina: this.project.default_patina,
            moduleTop,
            moduleBottom,
            fasadsTop,
            fasadsBottom,
            tableTop,
            plinth,
        };
    }
}