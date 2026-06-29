
// @ts-nocheck

import * as THREE from 'three'
import * as THREETypes from "@/types/types"
import { TCreateHandleParams } from '../Handles/Handles';
// import GUI from 'lil-gui';

import { useMillingAction } from '../MillingsUtils/useMillingActions';
import { useEventBus } from '@/store/appliction/useEventBus';
import { DeepDispose } from '@/Application/Utils/DeepDispose';
import { BuildProduct } from '../BuildProduct';
import { useAppData } from '@/store/appliction/useAppData';
import { useModelState } from "@/store/appliction/useModelState";
import { useUniformState } from "@/store/appliction/useUniformState";
import { useMenuStore } from '@/store/appStore/useMenuStore';
import { useRoomOptions } from '@/components/left-menu/option/roomOptions/useRoomOptons';
import { BuildersHelper } from '../BuildersHelper';


import { MILLINGS, additionalMillingKeys } from '@/Application/F-millings';
// import { directionToColor } from 'three/webgpu';
// import { VertexNormalsHelper } from "three/examples/jsm/Addons.js";
import { BuildUniversalModule } from "@/Application/Meshes/UniversalModuleUtils/BuildUniversalModule.ts";

type TRotateActions = Record<number, number>
export type TDataCreateHandle = { data: TCreateHandleParams; fasadeNdx: number }
export type TDataWithNdx = { data: number | string, fasadeNdx: number, action?: number } | { data: Record<string, any>, fasadeNdx: number, action?: number };
export type TDataWithType = { data: { [key: string]: any }, type: string }
export type TResizeModel = { data: { width: number, height: number, depth: number }, mesh?: THREE.Object3D, type?: string, fillingId?: number }

export class MeshEvents extends BuildersHelper {

    root: THREETypes.TApplication;
    scene: THREETypes.TScene
    events: ReturnType<typeof useEventBus> = useEventBus()
    uniformState: ReturnType<typeof useUniformState> = useUniformState()
    modelState: ReturnType<typeof useModelState> = useModelState()
    menuStore: ReturnType<typeof useMenuStore> = useMenuStore()
    roomOptions: ReturnType<typeof useRoomOptions> = useRoomOptions()
    trafficManager: THREETypes.TTrafficManager

    resources: THREETypes.TResources
    dispose: DeepDispose
    buildProduct: BuildProduct
    buildUMProduct: BuildUniversalModule
    buildMilling: THREETypes.TMillingBuilder
    millingActions: ReturnType<typeof useMillingAction>

    buildShowcase: THREETypes.TShowcaseBuilder
    buildPalette: THREETypes.TPaletteBulider
    buildAlum: THREETypes.TAlumBuilder
    buildUniformTexture: THREETypes.TUniformTextureBuilder
    plinthBuilder: THREETypes.TPlinthBuilder
    useEdgeBuilder: THREETypes.TUseEdgeBuilder
    handlesBuilder: THREETypes.THandlesBuilder
    private millings: any | null = MILLINGS
    private additionalMillingKeys: any | null = additionalMillingKeys
    // private cutFasadeId = [4722786, 4722787]
    // private alumTextures: string | null = alumTextures

    private _overrideMesh?: THREE.Object3D | null;

    _APP: THREETypes.TObject = useAppData().getAppData

    // millHelper = new GUI()

    private onChangeModuleTexture: (data: { [key: string]: any }) => void;
    private onChangeTotalModuleTexture: ({ data, type }: TDataWithType) => void;

    private onChangeFasade: ({ data, fasadeNdx }: TDataWithNdx) => void;
    private onChangeTotalFasadsTexture: ({ data, type }: TDataWithType) => void;

    private onChangeGlobalTopTable: ({ data, type }: TDataWithType) => void;

    private onChangePaletteColor: ({ data, fasadeNdx }: TDataWithNdx) => void;
    private onChangePaletteTotal: ({ data, type }: TDataWithType) => void;

    private onChangeGlassColor: ({ data, fasadeNdx }: TDataWithNdx) => void;

    private onChangeMilling: ({ data, fasadeNdx, action }: TDataWithNdx) => void;
    private onDeliteMilling: (fasadeNdx: number) => void;
    private onChangeMillingTotal: ({ data, type }: TDataWithType) => void;

    private onChangeShowcase: ({ data, fasadeNdx, action }: TDataWithNdx) => void;
    private onDeliteShowcase: (fasadeNdx: number) => void;

    private onDrawPatina: ({ data, fasadeNdx }: TDataWithNdx) => void;
    private onDelitePatina: (fasadeNdx: number) => void;

    private onUpdateUMModel: (data: Object) => void;
    private onToggleFasade: (value: boolean) => void;
    private onDeliteFasade: (fasad_ndx: number) => void;
    private onCreateUniformGroup: () => void
    private onDeliteUniformGroup: (id: number) => void

    private onAddHandle: ({ data, fasadeNdx }: TDataWithNdx) => void
    private onDeleteHandle: ({ data, fasadeNdx }: TDataWithNdx) => void
    private onChangeHandlePos: ({ data, fasadeNdx }: TDataWithNdx) => void
    private onChangePlinth: () => void

    private onChangeModelSize: ({ data, mesh, type }: TResizeModel) => void;
    private onCgangeRotation: (data: number) => void
    private onChangeRootModel: ({ data, mesh }) => void;
    private onChangeFillingModel: ({ data, mesh }) => void;
    private onRecountShelfs: ({ data, mesh }) => void;
    private onResizeJoinDepth: ({ data, mesh }) => void;
    private onProcessOptions: (data: Record<string, any>) => void
    private onChangeTotalHandles: (data: number) => void

    private searchElementsByType: Record<string, string> = {
        moduleTop: "element_up",
        fasadsTop: "element_up",
        moduleBottom: "element_down",
        fasadsBottom: "element_down"

    }

    private rotateActions: TRotateActions = {
        1: Math.PI,
        3: Math.PI * -0.5,
        4: Math.PI * -0.25,
        5: Math.PI * 0.5,
        7: 0
    }

    private readonly EXTRAS_Y_SIZE = new Set<number[]>([2050360, 1059832, 971222, 3140746, 77333, 14831]);

    constructor(root: THREETypes.TApplication) {

        super(root)

        // console.trace('MeshEvents')

        this.root = root;
        this.scene = root._scene!;
        this.resources = root._resources!;
        this.dispose = root._deepDispose!;
        this.trafficManager = root._trafficManager!;
        this.useEdgeBuilder = root._useEdgeBuilder!;


        this.buildProduct = root._geometryBuilder!.buildProduct;
        this.buildUMProduct = root._universalGeometryBuilder!.buildProduct;

        this.onChangeModuleTexture = this.changeModuleTexture.bind(root);
        this.onChangeTotalModuleTexture = this.changeTotalModuleTexture.bind(root);

        this.onChangeFasade = this.changeFasade.bind(root);
        this.onChangeTotalFasadsTexture = this.changeTotalFasadsTexture.bind(root);

        this.onChangeGlobalTopTable = this.changeGlobalTopTable.bind(root);

        this.onChangePaletteColor = this.changePaletteColor.bind(root);
        this.onChangePaletteTotal = this.changePaletteTotal.bind(root)

        this.onChangeGlassColor = this.changeGlassColor.bind(root);

        this.onChangeMilling = this.changeMilling.bind(root);
        this.onDeliteMilling = this.deliteMilling.bind(root);
        this.onChangeMillingTotal = this.changeMillingTotal.bind(root);

        this.onChangeShowcase = this.changeShowcase.bind(root);
        this.onDeliteShowcase = this.deliteShowcase.bind(root)

        this.onDrawPatina = this.drawPatina.bind(root);
        this.onDelitePatina = this.delitePatina.bind(root);

        this.onCreateUniformGroup = this.сreateUniformGroup.bind(root);
        this.onDeliteUniformGroup = this.deliteUniformGroup.bind(root);

        this.onUpdateUMModel = this.updateUMModel.bind(root);

        this.onToggleFasade = this.toggleFasade.bind(root);
        this.onDeliteFasade = this.deliteFasade.bind(root);

        this.onAddHandle = this.addHandle.bind(root);
        this.onDeleteHandle = this.deleteHandle.bind(root);
        this.onChangeHandlePos = this.changeHandlePos.bind(root);
        this.onChangePlinth = this.changePlinth.bind(root)

        this.onChangeModelSize = this.changeModelSize.bind(root);
        this.onCgangeRotation = this.changeRotation.bind(root);
        this.onChangeRootModel = this.changeRootModel.bind(root);

        this.onRecountShelfs = this.recountShelfs.bind(root)
        this.onResizeJoinDepth = this.resizeJoinDepth.bind(root)
        this.onProcessOptions = this.processOptions.bind(root)
        this.onChangeTotalHandles = this.changeTotalHandles.bind(root)

        this.addVueEvents();

        this.buildMilling = this.buildProduct.milling_builder;
        this.buildPalette = this.buildProduct.palette_bulider;
        this.buildShowcase = this.buildProduct.showcase_builder;
        this.buildAlum = this.buildProduct.alum_builder;
        this.buildUniformTexture = this.buildProduct.uniform_texture_builder;
        this.handlesBuilder = this.buildProduct.handles_builder;
        this.plinthBuilder = this.buildProduct.plinth_builder

        // this.millingActions = useMillingAction(this.buildProduct.milling_builder)
    }

    get _currentMesh() {
        return this._overrideMesh ?? this.trafficManager._currentObject;
    }

    set _currentMesh(mesh: THREE.Object3D | undefined | null) {
        this._overrideMesh = mesh;
    }

    async resetFasade({ fasadeNdx, incomingModel, totalFasad, remove = false }: { fasadeNdx: number, incomingModel?: any, totalFasad?: THREE.Object3D, remove: boolean }) {


        const fTypeMap: Record<string, keyof THREETypes.TOptionsMap> = {
            element_up: 'fasadsTop',
            element_down: 'fasadsBottom'

        }
        const product = totalFasad ?? this._currentMesh

        if (!product) return;

        const { PROPS } = product.userData
        const { CONFIG, FASADE, FASADE_DEFAULT } = PROPS
        const { FASADE_PROPS, ELEMENT_TYPE } = CONFIG
        const defaultConfig: THREETypes.TDefaultOptionsConfig = this.buildProduct.getDefaultOptionsConfig();
        const fasadeExist = FASADE[fasadeNdx]
        const curGlobalOptions: THREETypes.TOptionsMap = this.roomOptions.getGlobalOptions
        const globalMilling = curGlobalOptions[fTypeMap[ELEMENT_TYPE]] ? curGlobalOptions[fTypeMap[ELEMENT_TYPE]].milling : null

        const rebuild = (fasadeNdx) => {
            this.buildProduct.fasade_builder.updateFasade(
                {
                    props: PROPS,
                    model_data: this._MODELS[CONFIG.MODELID],
                    fasadeNdx,
                    incomingModel,
                    defaultConfig,
                    remove
                })
        }

        if (fasadeExist) {
            rebuild(fasadeNdx)
        }

        if (incomingModel) return
    }

    //------------------
    /** @Цвет_корпуса  */
    //------------------

    async catchChangeModuleTexture(data: { [key: string]: any }, currentMesh?: THREE.Object3D) {

        const product = currentMesh ?? this._currentMesh;
        const { CONFIG, SHELF, BODY, JSON_FILLINGS } = product.userData.PROPS;
        const { ID } = CONFIG;
        const productData = this._PRODUCTS[ID];

        [BODY, ...(SHELF ?? []), ...(JSON_FILLINGS ?? [])].forEach((obj) => {
            if (obj instanceof THREE.Object3D) {
                obj?.traverse((child: THREE.Object3D) => {
                    // Пропускаем меш чертежа
                    if ((child.userData && child.userData.edge) || child.parent?.userData?.edge) return


                    if (child instanceof THREE.Mesh) {

                        if (productData.productType === this.buildProduct.project.mirror_type) {
                            this.buildProduct.mirror_builder.createMirrorMaterial(child, data)
                            return;
                        }

                        if (productData.element_type === "element_room") {
                            const geometry = child.geometry
                            const { width: x, height: y } = geometry.parameters
                            const { comand } = geometry.userData

                            const material = this.createNishaMaterial(data.TEXTURE ?? data.texture, { x, y }, comand);
                            child.material = material;
                            child.material.needsUpdate = true;
                            return;
                        }

                        this.changeColor({ object: child, url: data.TEXTURE ?? data.texture });
                    }
                })
            }
        }
        );

        CONFIG.MODULE_COLOR = data.ID;
    }

    async changeModuleTexture(data: { [key: string]: any }) {

        if (!this._currentMesh) return;
        await this.catchChangeModuleTexture(data)
        this.events.emit('U:ChangeModule')

    }

    changeTotalModuleTexture({ data, type }: TDataWithType) {

        const currentType = this.searchElementsByType[type] /**@Тип_элемента -- @верхний / @нижний */
        const elementsList = this.scene.getObjectsByProperty('elementType', currentType) /** @Находим все элементы выбранного типа */

        if (Array.isArray(elementsList) && elementsList[0]) {
            elementsList.forEach(async (el) => {
                console.log(el)

                const { PROPS } = el.userData
                const { PRODUCT } = PROPS
                const currentProduct = this._PRODUCTS[PRODUCT]

                const includeIncomeFasade = currentProduct.MODULECOLOR.includes(data.ID);

                if (includeIncomeFasade) {
                    await this.catchChangeModuleTexture(data, el)
                }
            })
        }
    }

    //------------------
    /** @Изменение_поверхности_фасада  */
    //------------------

    async catchFasadeChange({ data, fasadeNdx, mesh }: TDataWithNdx) {

        const meshData = mesh ?? this._currentMesh

        // const product = this._currentMesh;
        const drowMode = this.menuStore.getDrowModeValue

        const { CONFIG, FASADE, FASADE_DEFAULT, ELEMENT_TYPE } = meshData.userData.PROPS;
        const { FASADE_PROPS, UNIFORM_TEXTURE } = CONFIG;

        const incomingModel = data.MODEL;
        const fasade = FASADE[fasadeNdx] ?? FASADE_DEFAULT[fasadeNdx];
        const fasadeProp = FASADE_PROPS[fasadeNdx];

        fasadeProp.COLOR = data.ID
        if (fasadeProp.MANUAL_NO_FASADE)
            delete fasadeProp.MANUAL_NO_FASADE

        fasadeProp.ALUM = incomingModel;

        if (UNIFORM_TEXTURE.group !== null) {
            this.removeFromUniformGroup(meshData);
        }

        await this.resetFasade({ fasadeNdx, incomingModel, totalFasad: meshData });

        this.buildProduct.fasade_builder.applyFasadeChange({
            data,
            fasadeNdx,
            fasadeProp,
            fasade,
            fasadeDefault: FASADE_DEFAULT[fasadeNdx],
            incomingModel,
            CONFIG,
        });

        if (drowMode) {
            const edgeMeshID = FASADE[fasadeNdx].userData.edgeID
            const edgeMesh = FASADE[fasadeNdx].parent.getObjectById(edgeMeshID)
            this.useEdgeBuilder.drawingMode(drowMode, FASADE[fasadeNdx])
            this.useEdgeBuilder.drawingMode(drowMode, edgeMesh)
        }
    }

    private removeFromUniformGroup(product: THREE.Object3D) {
        this.buildUniformTexture.removeFromUniformGroup(product);
    }

    public async changeFasade({ data, fasadeNdx }: TDataWithNdx) {

        if (!this._currentMesh) return;

        await this.catchFasadeChange({ data, fasadeNdx })
        this.events.emit('U:ChangeFasade')
    }

    public async changeTotalFasadsTexture({ data, palitte, milling, type }: TDataWithType) {

        const currentType = this.searchElementsByType[type];

        const elementsList = this.scene.getObjectsByProperty('elementType', currentType);

        if (!Array.isArray(elementsList) || elementsList.length === 0) {
            return;
        }

        // Ждём обработки ВСЕХ элементов и ВСЕХ их фасадов
        await Promise.all(
            elementsList.map(async (el) => {
                const { PROPS } = el.userData;
                const { CONFIG, FASADE, PRODUCT } = PROPS;
                const { FASADE_PROPS, FASADE_POSITIONS } = CONFIG;
                const currentProduct = this._PRODUCTS[PRODUCT];
                const currentFasade = this._FASADE[data.ID];

                const includeIncomeFasade = currentProduct.FACADE.includes(data.ID);
                const includeIncomMilling = milling ? currentProduct.MILLING.includes(milling.ID) : false;

                if (FASADE.length === 0) return;

                // Обрабатываем все фасады последовательно или параллельно
                await Promise.all(
                    FASADE.map(async (fasade, fasadeNdx) => {
                        const { SHOWCASE } = FASADE_POSITIONS[fasadeNdx];

                        if (data.ID == 7397 || !includeIncomeFasade) {
                            await this.catchDeliteFasade(fasadeNdx, el);
                        } else {
                            await this.catchFasadeChange({ data, fasadeNdx, mesh: el });

                            if (palitte) {
                                await this.changePaletteColor({ data: palitte, fasadeNdx, mesh: el });
                            }

                            if (milling && SHOWCASE === 0) {
                                let action = null;

                                if (milling.fasade_type && milling.fasade_type[0] !== null) {
                                    const fType = FASADE_POSITIONS[fasadeNdx].FASADE_TYPE;
                                    const prepare = milling.fasade_type.filter(el => fType.includes(el));
                                    action = this.modelState.getCurrentMillingActionMap(prepare[0], milling.ID) ?? null;
                                    FASADE_PROPS[fasadeNdx].MILLING_TYPE = prepare[0] ?? null;
                                }

                                await this.catchChangeMilling({ data: milling.ID, fasadeNdx, action, mesh: el });
                            }
                        }
                    })
                );
            })
        );

        // Только здесь — всё гарантированно завершено
        setTimeout(() => {
            this.events.emit('A:GlobalParamsSelect');
        }, 10)
    }

    //------------------
    /** @Цвет_палитры  */
    //------------------

    async catchChangePaletteColor({ data, fasadeNdx, mesh }: TDataWithNdx) {

        const meshData = mesh ?? this._currentMesh

        if (!meshData) return;

        const props = meshData.userData.PROPS
        const { FASADE, CONFIG } = props
        const { FASADE_PROPS } = CONFIG
        const fasade = FASADE[fasadeNdx]
        const fasadeProps = FASADE_PROPS[fasadeNdx]

        // console.log({ data, fasadeNdx }, 'PALLIT')

        this.buildPalette.createPaletteColor({ fasade, data, fasadeProps })
    }

    async changePaletteColor({ data, fasadeNdx, mesh }: TDataWithNdx) {

        const meshData = mesh ?? this._currentMesh

        if (!meshData) return;

        const props = meshData.userData.PROPS
        const { FASADE, CONFIG } = props
        const { FASADE_PROPS } = CONFIG
        const patina = FASADE_PROPS[fasadeNdx]?.PATINA

        // console.log(data, 'data')

        await this.catchChangePaletteColor({ data, fasadeNdx, mesh: meshData } as TDataWithNdx)
        if (patina) {

            await this.catchDrawPatina({ data: patina, fasadeNdx, mesh: meshData })
        }
        // console.log(FASADE_PROPS[fasadeNdx].PATINA, 'FASADE')
        this.events.emit("U:ChangePaletteColor")

    }

    changePaletteTotal({ data, type, fasade }: TDataWithType) {

        const currentType = this.searchElementsByType[type];
        const elementsList = this.scene.getObjectsByProperty('elementType', currentType);

        if (Array.isArray(elementsList) && elementsList.length > 0) {
            elementsList.forEach((el) => {

                const { FASADE, CONFIG } = el.userData.PROPS
                const { FASADE_PROPS } = CONFIG

                if (FASADE.length > 0) {
                    FASADE.forEach(async (_fasade, fasadeNdx) => {
                        // this._currentMesh = el;
                        await this.changePaletteColor({ data: data.ID, fasadeNdx, mesh: el });
                        // this._currentMesh = null

                        // FASADE_PROPS[fasadeNdx].PATINA = 475428
                    });
                }
            });
        }
    }

    //------------------
    /** @Алюминевая_поверхнорсть  */
    //------------------

    createAlumColor({ data, fasadeNdx }: TDataWithNdx) {
        if (!this._currentMesh) return;

        const props = this._currentMesh.userData.PROPS
        const { FASADE, CONFIG } = props
        const { FASADE_PROPS } = CONFIG
        const fasade = FASADE[fasadeNdx]

        this.buildAlum.createAlum({ fasade, data })
    }

    //------------------
    /** @Стекло_витринн  */
    //------------------

    async catchChangeGlassColor({ data, fasadeNdx }: TDataWithNdx) {
        if (!this._currentMesh) return;

        const props = this._currentMesh.userData.PROPS
        const { FASADE, CONFIG } = props
        const { FASADE_PROPS } = CONFIG
        const fasade = FASADE[fasadeNdx]

        this.buildShowcase.changeGlassColor({ fasade, glassId: data })

        FASADE_PROPS[fasadeNdx].GLASS = data
    }


    async changeGlassColor({ data, fasadeNdx }: TDataWithNdx) {

        if (!this._currentMesh) return;

        await this.catchChangeGlassColor({ data, fasadeNdx })
        this.events.emit("U:ChangeGlassColor")

    }

    //------------------
    /** @Фрезеровка  */
    //------------------

    async catchChangeMilling({ data, fasadeNdx, action, mesh }: TDataWithNdx) {

        const meshData = mesh ?? this._currentMesh

        const props = meshData.userData.PROPS
        const { FASADE, FASADE_DEFAULT, CONFIG } = props
        const { FASADE_POSITIONS, FASADE_PROPS } = CONFIG

        const fasade: THREE.Mesh = FASADE[fasadeNdx]
        const defaultGeometry = FASADE_DEFAULT[fasadeNdx]
        const patina = FASADE_PROPS[fasadeNdx]?.PATINA

        let millingData;

        if (action) {
            millingData = action
        } else {
            millingData = this.modelState.getCurrentMillingMap(data)
        }

        const fasadePosition = {
            FASADE_WIDTH: eval(FASADE_POSITIONS[fasadeNdx].FASADE_WIDTH),
            FASADE_HEIGHT: eval(FASADE_POSITIONS[fasadeNdx].FASADE_HEIGHT),
            FASADE_DEPTH: eval(FASADE_POSITIONS[fasadeNdx].FASADE_DEPTH)
        };


        this.buildMilling.createMillingFasade(fasade, fasadePosition, millingData, defaultGeometry, patina);

        FASADE_PROPS[fasadeNdx].MILLING = data
        FASADE_PROPS[fasadeNdx].SHOW = fasade.visible

    }

    async changeMilling({ data, fasadeNdx, action }: TDataWithNdx) {
        if (!this._currentMesh) return;

        await this.catchChangeMilling({ data, fasadeNdx, action })

        this.events.emit("U:ChangeMilling")
    }

    async deliteMilling(fasadeNdx: number) {
        if (!this._currentMesh) return;
        const product = this._currentMesh
        const { PROPS } = product.userData
        const { CONFIG, FASADE, PRODUCT, FASADE_DEFAULT } = PROPS
        const { FASADE_PROPS } = CONFIG
        const fasade = FASADE_PROPS[fasadeNdx]
        const firstMilling = this.modelState.createCurrentMillingData({ fasadeId: fasade.COLOR, productId: PRODUCT, fasadeNdx })[0]

        await this.changeMilling({ data: firstMilling.ID, fasadeNdx })
        fasade.PATINA = Object.values(this.modelState._PATINA)[0].ID
        // fasade.MILLING = firstMilling.ID
        fasade.MILLING_TYPE = null
    }

    changeMillingTotal({ data, type, fasade }: TDataWithType) {

        const currentType = this.searchElementsByType[type];
        const elementsList = this.scene.getObjectsByProperty('elementType', currentType);

        if (Array.isArray(elementsList) && elementsList.length > 0) {
            elementsList.forEach((el) => {
                const { FASADE } = el.userData.PROPS
                const { FASADE_POSITIONS, PRODUCT_SHOWCASE, FASADE_PROPS } = el.userData.PROPS.CONFIG
                if (PRODUCT_SHOWCASE) return

                if (FASADE.length > 0) {
                    FASADE.forEach(async (_fasade, fasadeNdx) => {
                        this._currentMesh = el;
                        let action = null

                        if (data.fasade_type && data.fasade_type[0] !== null) {
                            const fType = FASADE_POSITIONS[fasadeNdx].FASADE_TYPE
                            const prepare = data.fasade_type.filter(el => {
                                return fType.includes(el)
                            })
                            action = this.modelState.getCurrentMillingActionMap(prepare[0], data.ID) ?? null
                            FASADE_PROPS[fasadeNdx].MILLING_TYPE = prepare[0] ?? null

                        }
                        FASADE_PROPS[fasadeNdx].PATINA = 475428

                        await this.catchChangeMilling({ data: data.ID, fasadeNdx, action });
                        this._currentMesh = null
                    });
                }
            });
        }
    }

    //------------------
    /** @Патина  */
    //------------------

    async catchDrawPatina({ data, fasadeNdx, mesh }: TDataWithNdx) {

        const meshData = mesh ?? this._currentMesh

        if (!meshData) return;

        const props = meshData.userData.PROPS

        const { FASADE, CONFIG } = props
        const { FASADE_PROPS } = CONFIG
        const fasade = FASADE[fasadeNdx]

        const fasadeGeometry = fasade.geometry
        const startMaterial = fasade.userData.millingMaterial

        const patinaResult = this.buildMilling.patinaBuilder.createPatinaColor({ geometry: fasadeGeometry, patinaId: data, startMaterial })
        if (patinaResult) {
            fasade.geometry = patinaResult.geometry
            fasade.material = patinaResult.material
            fasade.material.needsUpdate = true
        }

        // const helper = new VertexNormalsHelper(fasade, 100, 0xff00ff);
        // this.scene.add(helper);

        // console.log(material)

        FASADE_PROPS[fasadeNdx].PATINA = data
    }

    async drawPatina({ data, fasadeNdx, mesh }: TDataWithNdx) {

        const meshData = mesh ?? this._currentMesh

        if (!meshData) return;
        await this.catchDrawPatina({ data, fasadeNdx, mesh: meshData })
        this.events.emit("U:DrawPatina")

    }

    public delitePatina(fasadeNdx: number) {
        if (!this._currentMesh) return;
        const product = this._currentMesh
        const { PROPS } = product.userData
        const { CONFIG, FASADE, FASADE_DEFAULT } = PROPS
        const { FASADE_PROPS } = CONFIG
        const fasade = FASADE_PROPS[fasadeNdx]
        fasade.PATINA = null
        const color = fasade.PALETTE
        this.changePaletteColor({ data: color, fasadeNdx })

        // this.changeMilling({ data: fasade.MILLING, fasadeNdx })

    }

    //------------------
    /** @Витрина  */
    //------------------

    public changeShowcase({ data, fasadeNdx, action, mesh }: TDataWithNdx) {

        const meshData = mesh ?? this._currentMesh
        if (!meshData) return;

        const props = meshData.userData.PROPS
        const { FASADE, FASADE_DEFAULT, CONFIG } = props
        const { FASADE_POSITIONS, FASADE_PROPS } = CONFIG

        const fasade: THREE.Mesh = FASADE[fasadeNdx]
        const defaultGeometry = FASADE_DEFAULT[fasadeNdx]
        const curFasadeData = FASADE_PROPS[fasadeNdx]
        const { ALUM } = curFasadeData

        const fasadePosition = {
            FASADE_WIDTH: eval(FASADE_POSITIONS[fasadeNdx].FASADE_WIDTH),
            FASADE_HEIGHT: eval(FASADE_POSITIONS[fasadeNdx].FASADE_HEIGHT),
            FASADE_DEPTH: eval(FASADE_POSITIONS[fasadeNdx].FASADE_DEPTH)
        };

        this.buildShowcase.createShowcase({
            fasade,
            fasadePosition,
            data,
            defaultGeometry,
            alum: ALUM,
            curFasadeData,
            action
        });

        FASADE_PROPS[fasadeNdx].SHOW = fasade.visible
        FASADE_PROPS[fasadeNdx].GLASS = FASADE_PROPS[fasadeNdx].GLASS ?? '76033'

    }

    public deliteShowcase(fasadeNdx: number) {
        if (!this._currentMesh) return;
        const product = this._currentMesh
        const { PROPS } = product.userData
        const { CONFIG, FASADE, FASADE_DEFAULT } = PROPS
        const { FASADE_PROPS } = CONFIG
        const fasade = FASADE_PROPS[fasadeNdx]

        this.changeMilling({ data: '1013628', fasadeNdx })
        fasade.SHOWCASE = 1013628

    }

    //------------------
    /** @Переходящий_рисунок  */
    //------------------

    public сreateUniformGroup() {

        this.buildUniformTexture.crteateUniformGroup({})
        this.uniformState.setPreGroup(0)
        /** Очищаем helper для выделения объектов */
        this.root._customBoxHelper?.clearSelect()
    }

    public deliteUniformGroup(id: number) {

        this.buildUniformTexture.deliteUniformGroup(id)
    }

    //------------------
    /** @Стандартная_столешница  */
    //------------------

    public changeGlobalTopTable({ data, type }: TDataWithType) {

        const elementsList = this.scene.getObjectsByProperty('name', type) /** @Находим все элементы выбранного типа */

        if (Array.isArray(elementsList) && elementsList[0]) {
            elementsList.forEach(el => {
                const parent = this.getRootObject(el)
                this.buildProduct.tabletop_builder.updateTableTop(parent, data)
            })
        }
    }

    //------------------
    /** @Методы_работы_с_фасадом  */
    //------------------

    // Скрыть фасад
    public toggleFasade(value: number) {

        if (!this._currentMesh) return;

        const product = this._currentMesh

        const { FASADE, CONFIG } = product.userData.PROPS
        const { FASADE_PROPS } = CONFIG
        if (FASADE.length === 0) return

        FASADE.forEach((el, key) => {

            if (FASADE_PROPS[key].COLOR === 7397) return
            el.visible = !el.visible
            FASADE_PROPS[key].SHOW = el.visible

        })

    }

    // Удалить фасад

    public async catchDeliteFasade(fasadeNdx: number, el: THREE.Object3D) {

        // console.log('==== ❌ catchDeliteFasade ❌ ====')

        const drowMode = this.menuStore.getDrowModeValue
        const product = el ?? this._currentMesh

        const { PROPS } = product.userData
        const { CONFIG, FASADE, FASADE_DEFAULT } = PROPS
        const { FASADE_PROPS, UNIFORM_TEXTURE } = CONFIG

        if (UNIFORM_TEXTURE.group !== null) {
            this.buildUniformTexture.removeFromUniformGroup(product)
        }

        await this.resetFasade({ fasadeNdx, totalFasad: el, remove: true })
        if (drowMode) {

            const edgeMeshID = FASADE[fasadeNdx].userData.edgeID
            const edgeMesh = FASADE[fasadeNdx].parent.getObjectById(edgeMeshID)
            this.useEdgeBuilder.drawingMode(drowMode, FASADE[fasadeNdx])
            this.useEdgeBuilder.drawingMode(drowMode, edgeMesh)
        }

    }

    public async deliteFasade(fasadeNdx: number) {
        if (!this._currentMesh) return;
        await this.catchDeliteFasade(fasadeNdx)
        this.events.emit("U:DeliteFasad")
    }

    public async processOptions(data) {

        if (!data) return
        const { NAME, ID, cutSize } = data.option
        // const isCutFasade = this.cutFasadeId.includes(parseInt(ID))
        if (!this._currentMesh) return;
        // if (!cutSize) return
        const { FASADE, FASADE_DEFAULT } = this._currentMesh.userData.PROPS;
        // this.buildProduct.fasade_builder.createCutFasade({ mesh: FASADE, defaultMesh: FASADE_DEFAULT, data })
        this.buildProduct.fasade_builder.processOptions({ mesh: FASADE, defaultMesh: FASADE_DEFAULT, data })

    }

    //------------------
    /** @Универсальный_модуль  */
    //------------------

    public updateUMModel(data: object) {

        if (!this._currentMesh)
            return

        const { PROPS } = this._currentMesh!.userData
        const { CONFIG } = PROPS
        const { POSITION, UNIFORM_TEXTURE } = CONFIG

        // const position = this._currentMesh!.userData.PROPS.CONFIG.POSITION as THREE.Vector3

        /** Очищаем родительский объект */
        this.dispose.clearParent(this._currentMesh as THREE.Object3D)
        let size = { width: data.width, height: data.height, depth: data.depth }

        /** Пересоздаём по новым параметрам */
        let body = this.buildUMProduct.createProductBody(this._currentMesh as THREE.Object3D, size, data);

        /** Добавляем к родителю */
        this._currentMesh?.add(body as THREE.Object3D);
        this._currentMesh?.position.set(POSITION.x, POSITION.y, POSITION.z)
        this._currentMesh?.updateMatrixWorld(true);

        const aabb = new THREE.Box3().setFromObject(this._currentMesh);
        size = new THREE.Vector3()
        aabb.getSize(size);

        /** Для корректного примагничивания к стенам */
        this._currentMesh.userData.trueSizes = {
            DEPTH: size.depth * 0.5, HEIGHT: size.y * 0.5, WIDTH: size.width * 0.5
        }
        /** Пересоздаём UNIFORM_TEXTURE*/
        if (UNIFORM_TEXTURE.group !== null) {

            const uniformGroupCash = { ...UNIFORM_TEXTURE }

            const currentUniformGroup = this.buildUniformTexture._uniformGroups.find(group => {
                return group.id === uniformGroupCash.group
            })

            if (currentUniformGroup?.parts.flat().length < 2) {
                this.buildUniformTexture.removeFromUniformGroup(this._currentMesh)
                this.buildUniformTexture.loadUniformGroup([{
                    objects: [this._currentMesh],
                    id: uniformGroupCash.group,
                    fasadId: uniformGroupCash.backupFasadId
                }])
            }
            else {
                this.buildUniformTexture.removeFromUniformGroup(this._currentMesh)
                this.buildUniformTexture.addToUniformGroup(this._currentMesh, uniformGroupCash.group)
                /** Скрываем helper переходящего рисунка */
            }

            this.root._customBoxHelper.hideGroupBox(this.buildUniformTexture._groupsBoxHelper)


        }

        //Применение позиционирования после изменений

        const adjustedPosition = this.root._roomManager!.adjustPositionWithRaycasting({
            object: this._currentMesh,
            targetPosition: this._currentMesh.userData.targetPosition,
            wall: this._currentMesh.userData.currentWall
        });

        this._currentMesh.position.copy(adjustedPosition.position);
        this._currentMesh.rotation.copy(adjustedPosition.rotation);

        const center = new THREE.Vector3();
        this._currentMesh.userData.aabb.getCenter(center);
        this._currentMesh.userData.obb.center.copy(center);
        /** @Корректная_коллизия */
        const { SIZE } = this._currentMesh?.userData.PROPS.CONFIG

        this._currentMesh.userData.obb.halfSize.x = data.width * 0.5;
        this._currentMesh.userData.obb.halfSize.y = data.height * 0.5;

        this.root._customBoxHelper!.updateBoxHelper();

    }

    //------------------
    /** @Изменение_размеров_модели  */
    //------------------

    public async changeModelSize({ data, mesh, type, fillingId }: TResizeModel) {
        const currentMesh = mesh ?? this._currentMesh;
        if (!currentMesh) return;

        if (currentMesh.name === 'MODEL') {
            await this.buildProduct.models_builder.refillModelFromSource(
                currentMesh,
                { width: data.width, height: data.height, depth: data.depth },
                type
            );
            this.root._customBoxHelper!.updateBoxHelper();
            return;
        }

        console.log('<<<<<changeModelSize>>>>>')

        const { PROPS } = currentMesh.userData;
        const { CONFIG, PRODUCT } = PROPS;
        const { POSITION, UNIFORM_TEXTURE, SIZE, SIZE_OFFSET } = CONFIG as THREETypes.TConfig;
        const fasadeSize = type === 'resize';

        if (fillingId !== undefined) {
            const product = this._PRODUCTS[PRODUCT];
            CONFIG.FILLING = fillingId;
            CONFIG.OPTIONS = this.buildProduct.filters.filterOption(product.OPTION);
            this.buildProduct.filters.filterFasadePosition(CONFIG, product);
        }

        this.dispose.clearParent(currentMesh as THREE.Object3D);

        // Пересоздаём по новым параметрам
        const body = this.buildProduct.createProductBody(currentMesh as THREE.Object3D, data, fasadeSize);
        currentMesh.add(body as THREE.Object3D);
        currentMesh.position.set(POSITION.x, POSITION.y, POSITION.z);
        currentMesh.updateMatrixWorld(true);

        currentMesh.userData.trueSizes = {
            DEPTH: fasadeSize ? SIZE.depth * 0.5 : data.depth * 0.5,
            HEIGHT: body.userData.trueSizes.HEIGHT,
            WIDTH: fasadeSize ? SIZE.width * 0.5 : (data.width + SIZE_OFFSET.width) * 0.5,
        };

        // Пересоздаём UNIFORM_TEXTURE
        if (UNIFORM_TEXTURE.group !== null) {
            const uniformGroupCash = { ...UNIFORM_TEXTURE };
            const currentUniformGroup = this.buildUniformTexture._uniformGroups.find(
                g => g.id === uniformGroupCash.group
            );

            this.buildUniformTexture.removeFromUniformGroup(currentMesh);

            if (currentUniformGroup?.parts.flat().length < 2) {
                this.buildUniformTexture.loadUniformGroup([{
                    objects: [currentMesh],
                    id: uniformGroupCash.group,
                    fasadId: uniformGroupCash.backupFasadId,
                }]);
            } else {
                this.buildUniformTexture.addToUniformGroup(currentMesh, uniformGroupCash.group);
            }

            this.root._customBoxHelper.hideGroupBox(this.buildUniformTexture._groupsBoxHelper);
        }

        const adjusted = this.root._roomManager!.adjustPositionWithRaycasting({
            object: currentMesh,
            targetPosition: currentMesh.userData.targetPosition,
            wall: currentMesh.userData.currentWall,
        });

        currentMesh.position.copy(adjusted.position);
        currentMesh.rotation.copy(adjusted.rotation);

        const center = new THREE.Vector3();
        currentMesh.userData.aabb.getCenter(center);
        currentMesh.userData.obb.center.copy(center);

        currentMesh.userData.obb.halfSize.x = fasadeSize ? SIZE.width * 0.5 : (data.width + SIZE_OFFSET.width) * 0.5;
        currentMesh.userData.obb.halfSize.z = fasadeSize ? SIZE.depth * 0.5 : data.depth * 0.5;

        if (PROPS.FASADE.length === 0 || this.EXTRAS_Y_SIZE.has(PRODUCT)) {
            currentMesh.userData.obb.halfSize.y = data.height * 0.5;
        }

        this.root._customBoxHelper!.updateBoxHelper();

        if (type !== 'raspil') {
            this.events.emit('U:Model-resize');
        }
    }

    //------------------
    /** @Изменение_позиционирования_модели  */
    //------------------

    public async changeRootModel({ data, mesh }) {
        if (!this._currentMesh) return

        const currentMesh = mesh ? mesh : this._currentMesh
        const { PROPS } = currentMesh.userData
        const { CONFIG } = PROPS
        const { POSITION, UNIFORM_TEXTURE, OPTIONS, FASADE_PROPS } = CONFIG
        const product = this._PRODUCTS[PROPS.PRODUCT]
        const { width, height, depth } = CONFIG.SIZE;
        const clone = FASADE_PROPS.map(el => el)


        CONFIG.MODELID = data
        this.buildProduct.filters.filterFasadePosition(CONFIG, product)
        this.buildProduct.filters.filterFasadeSizer(product.FASADE_SIZES, product)

        CONFIG.FASADE_PROPS = clone

        this.changeModelSize({ data: { width, height, depth } })

    }

    //------------------
    /** @Изменение_компановки_модели  */
    //------------------

    public async changeFillingModel({ data, mesh }) {

        if (!this._currentMesh) return

        const currentMesh = mesh ? mesh : this._currentMesh
        const { PROPS } = currentMesh.userData
        const { CONFIG } = PROPS

        const product = this._PRODUCTS[PROPS.PRODUCT]
        const { width, height, depth } = CONFIG.SIZE;


        CONFIG.FILLING = data;
        CONFIG.OPTIONS = this.buildProduct.filters.filterOption(product.OPTION);
        // CONFIG.SHELFQUANT.current
        this.buildProduct.filters.filterFasadePosition(CONFIG, product)
        // this.buildProduct.filters.filterFasadeSizer(product.FASADE_SIZES, product)

        this.changeModelSize({ data: { width, height, depth }})

    }

    //------------------
    /** @Изменение_количества_полок  */
    //------------------

    public async recountShelfs({ data, mesh }) {

        const currentMesh = mesh ? mesh : this._currentMesh
        if (!currentMesh) return

        const { PROPS } = currentMesh.userData
        const { CONFIG } = PROPS
        const { POSITION, UNIFORM_TEXTURE, OPTIONS, FASADE_PROPS, SHELFQUANT } = CONFIG
        const { width, height, depth } = CONFIG.SIZE;
        SHELFQUANT.current = data

        this.changeModelSize({ data: { width, height, depth } })

    }

    //------------------
    /** @Изменение_размера  */
    //------------------

    public async resizeJoinDepth({ data, mesh }) {

        const currentMesh = mesh ? mesh : this._currentMesh
        if (!currentMesh) return

        const { PROPS } = currentMesh.userData
        const { CONFIG } = PROPS
        const { POSITION, UNIFORM_TEXTURE, OPTIONS, FASADE_PROPS, SHELFQUANT } = CONFIG
        const { width, height, depth } = CONFIG.SIZE;

        CONFIG.SIZEEDITJOINDEPTH = data
        this.changeModelSize({ data: { width, height, depth }, type: "resize" })
    }

    //------------------
    /** @Вращение  */
    //------------------

    public async changeRotation(actionId: number) {

        const currentMesh = this._currentMesh
        if (!currentMesh) return

        const curAction = this.rotateActions[actionId]
        if (actionId === 4) {
            currentMesh.rotation.y += curAction
            this.root._customBoxHelper?.updateBoxHelper()
            return
        }
        currentMesh.rotation.y = curAction

        this.root._customBoxHelper?.updateBoxHelper()

    }

    //------------------
    /** @Ручки  */
    //------------------

    public async createHandle({ data, fasadeNdx }: TDataCreateHandle) {
        if (!this._currentMesh) return;
        const product = this._currentMesh;

        const { CONFIG, FASADE, FASADE_DEFAULT } = product.userData.PROPS;
        const { FASADE_PROPS, UNIFORM_TEXTURE } = CONFIG;
        const curFasadData = FASADE_PROPS[fasadeNdx]
        const curFasadeMesh = FASADE[fasadeNdx]

        await this.handlesBuilder.createHandle(data, curFasadeMesh, curFasadData)
        // curFasadData.HANDLES.id = data.id

    }

    public async addHandle({ data, fasadeNdx }: TDataCreateHandle) {
        if (!this._currentMesh)
            return;

        if (typeof fasadeNdx === 'number') {
            await this.createHandle({ data, fasadeNdx })
            this.events.emit('U:AddHandle')
        }

    }

    public async removeHandle({ data, fasadeNdx }: TDataWithNdx) {

        if (!this._currentMesh || !data) return;
        const product = this._currentMesh;
        const { FASADE, CONFIG } = product.userData.PROPS;
        const { FASADE_PROPS } = CONFIG;
        const curFasadeMesh = FASADE[fasadeNdx]
        const curFasad = FASADE_PROPS[fasadeNdx]

        await this.handlesBuilder.deleteHandle(curFasadeMesh)
        curFasad.HANDLES.id = data.ID
    }

    public async deleteHandle({ data, fasadeNdx }: TDataWithNdx) {
        if (!this._currentMesh || !data) return;
        await this.removeHandle({ data, fasadeNdx });
        this.events.emit('U:RemoveHandle')

    }

    public async changeHandlePos({ data, fasadeNdx }: TDataWithNdx) {
        if (!this._currentMesh) return;
        const product = this._currentMesh;
        const { FASADE, CONFIG } = product.userData.PROPS;
        const { FASADE_PROPS } = CONFIG;

        const curFasadData = FASADE_PROPS[fasadeNdx]
        const curFasadeMesh = FASADE[fasadeNdx]
        const handle = curFasadeMesh.getObjectByProperty('name', 'HANDLE')

        await this.handlesBuilder.getHandlesPosition(data, handle, curFasadeMesh);
        curFasadData.HANDLES.position = data
    }

    public async changeTotalHandles(data) {

        const topElements: THREE.Object3D[] = this.scene.getObjectsByProperty('elementType', "element_up");
        const bottomElements: THREE.Object3D[] = this.scene.getObjectsByProperty('elementType', "element_down");
        const totalElements: THREE.Object3D[] = [...topElements, ...bottomElements]


        await this.buildProduct.handles_builder.changeTotalHandles(totalElements, data);
        setTimeout(() => {
            this.events.emit('A:GlobalParamsSelect');
        }, 10)
    }

    //------------------
    /** @Плинтусы  */
    //------------------

    async changePlinth() {
        const elType = 'element_down'
        const elementsList = this.scene.getObjectsByProperty('elementType', elType) /** @Находим все элементы выбранного типа */
        elementsList.forEach((el: THREE.Object3D) => {
            this.plinthBuilder.updatePlinth(el)
        })
    }


    addVueEvents() {

        this.onChangeModuleTexture = (data) => {
            this.changeModuleTexture(data);
        }

        this.onChangeTotalModuleTexture = ({ data, type }) => {
            this.changeTotalModuleTexture({ data, type })
        }

        this.onChangeFasade = ({ data, fasadeNdx }) => {
            this.changeFasade({ data, fasadeNdx });
        }

        this.onChangeTotalFasadsTexture = ({ data, palitte, milling, type }) => {
            this.changeTotalFasadsTexture({ data, palitte, milling, type })
        }

        this.onChangeGlobalTopTable = ({ data, type }) => {
            this.changeGlobalTopTable({ data, type })
        }

        this.onChangePaletteColor = ({ data, fasadeNdx }) => {
            this.changePaletteColor({ data, fasadeNdx });
        }

        this.onChangePaletteTotal = ({ data, type }) => {
            this.changePaletteTotal({ data, type })
        }

        this.onChangeGlassColor = ({ data, fasadeNdx }) => {
            this.changeGlassColor({ data, fasadeNdx });
        }

        this.onChangeMilling = ({ data, fasadeNdx, action }) => {
            this.changeMilling({ data, fasadeNdx, action });
        }

        this.onDeliteMilling = (fasadeNdx) => {
            this.deliteMilling(fasadeNdx);
        }

        this.onChangeMillingTotal = ({ data, type }) => {
            this.changeMillingTotal({ data, type })
        }

        this.onChangeShowcase = ({ data, fasadeNdx, action }) => {
            this.changeShowcase({ data, fasadeNdx, action });
        }

        this.onDeliteShowcase = (fasadeNdx) => {
            this.deliteShowcase(fasadeNdx)
        }

        this.onDrawPatina = (data) => {
            this.drawPatina(data);
        }

        this.onDelitePatina = (fasadeNdx) => {
            this.delitePatina(fasadeNdx);
        }

        this.onCreateUniformGroup = () => {
            this.сreateUniformGroup();
        }

        this.onDeliteUniformGroup = (id) => {
            this.deliteUniformGroup(id);
        }

        this.onChangeModelSize = (data) => {
            this.changeModelSize(data)
        }

        this.onToggleFasade = (value) => {
            this.toggleFasade(value);
        }

        this.onDeliteFasade = (fasad_ndx) => {
            this.deliteFasade(fasad_ndx)
        }

        this.onUpdateUMModel = (data) => {
            this.updateUMModel(data)
        }

        this.onAddHandle = (data) => {
            this.addHandle(data)
        }

        this.onDeleteHandle = (fasad_ndx) => {
            this.deleteHandle(fasad_ndx)
        }

        this.onChangeHandlePos = (data) => {
            this.changeHandlePos(data)
        }

        this.onChangePlinth = () => {
            this.changePlinth()
        }

        this.onCgangeRotation = (data) => {
            this.changeRotation(data)
        }

        this.onChangeRootModel = ({ data, mesh }) => {
            this.changeRootModel({ data, mesh })
        }

        this.onChangeFillingModel = ({ data, mesh }) => {
            this.changeFillingModel({ data, mesh })
        }

        this.onRecountShelfs = ({ data, mesh }) => {
            this.recountShelfs({ data, mesh })
        }

        this.onResizeJoinDepth = ({ data, mesh }) => {
            this.resizeJoinDepth({ data, mesh })
        }

        this.onProcessOptions = (data) => {
            this.processOptions(data)
        }

        this.onChangeTotalHandles = (data) => {
            this.changeTotalHandles(data)
        }

        this.events.on('A:ChangeModuleTexture', this.onChangeModuleTexture);
        this.events.on('A:ChangeModuleTotalTexture', this.onChangeTotalModuleTexture);

        this.events.on('A:ChangeFasade', this.onChangeFasade);

        this.events.on('A:ChangeFasadsTopTexture', this.onChangeTotalFasadsTexture)
        this.events.on('A:ChangeFasadsBottomTexture', this.onChangeTotalFasadsTexture)

        this.events.on("A:ChangeTableTop", this.onChangeGlobalTopTable)

        this.events.on('A:ChangePaletteColor', this.onChangePaletteColor);
        this.events.on('A:ChangePaletteTotal', this.onChangePaletteTotal)

        this.events.on('A:ChangeGlassColor', this.onChangeGlassColor);

        this.events.on('A:ChangeMilling', this.onChangeMilling);
        this.events.on('A:DeliteMilling', this.onDeliteMilling);
        this.events.on('A:ChangeMillingTotal', this.onChangeMillingTotal)

        this.events.on('A:ChangeShowcase', this.onChangeShowcase);
        this.events.on("A:DeliteShowcase", this.onDeliteShowcase)

        this.events.on('A:DrawPatina', this.onDrawPatina);
        this.events.on('A:DelitePatina', this.onDelitePatina);

        this.events.on('A:Create-Uniform-Group', this.onCreateUniformGroup);
        this.events.on('A:Delite-Uniform-Group', this.onDeliteUniformGroup);

        this.events.on('A:Model-resize', this.onChangeModelSize)
        this.events.on('A:Toggle-Fasad', this.onToggleFasade)

        this.events.on('A:Delite-Fasad', this.onDeliteFasade)

        this.events.on('A:UM-update', this.onUpdateUMModel)

        this.events.on('A:AddHandle', this.onAddHandle)
        this.events.on('A:DeleteHandle', this.onDeleteHandle)
        this.events.on('A:ChangeHandlePose', this.onChangeHandlePos)
        this.events.on('A:ChangePlinthColor', this.onChangePlinth)

        this.events.on('A:RotateModel', this.onCgangeRotation);

        this.events.on('A:ChangeRootModel', this.onChangeRootModel);
        this.events.on('A:ChangeFilling', this.onChangeFillingModel);

        this.events.on('A:RecountShelfs', this.onRecountShelfs);

        this.events.on('A:ResizeJoinDepth', this.onResizeJoinDepth);
        this.events.on('A:SelectModelOption', this.onProcessOptions);
        this.events.on('A:ChangeHandlesTotal', this.onChangeTotalHandles)



    }

    removeVueEvents() {
        this.events.off('A:ChangeModuleTexture', this.onChangeModuleTexture);
        this.events.off('A:ChangeModuleTotalTexture', this.onChangeModuleTexture);

        this.events.off('A:ChangeFasade', this.onChangeFasade);
        this.events.off('A:ChangePaletteColor', this.onChangePaletteColor);
        this.events.off('A:ChangeGlassColor', this.onChangeGlassColor);

        this.events.off("A:ChangeTableTop", this.onChangeGlobalTopTable)

        this.events.off('A:ChangeMilling', this.onChangeMilling);
        this.events.off('A:DeliteMilling', this.onDeliteMilling);

        this.events.off('A:ChangeShowcase', this.onChangeShowcase);

        this.events.off('A:DrawPatina', this.onDrawPatina);
        this.events.off('A:DelitePatina', this.onDelitePatina);

        this.events.off('A:Create-Uniform-Group', this.onCreateUniformGroup);
        this.events.off('A:Delite-Uniform-Group', this.onDeliteUniformGroup);

        this.events.off('A:Model-resize', this.onChangeModelSize)
        this.events.off('A:UM-update', this.onUpdateUMModel)
        this.events.off('A:Toggle-Fasad', this.onToggleFasade)
        this.events.off('A:Delite-Fasad', this.onDeliteFasade)

        this.events.off('A:AddHandle', this.onAddHandle)
        this.events.off('A:DeleteHandle', this.onDeleteHandle)

        // this.alumTextures = null
        this.millings = null
    }

}

