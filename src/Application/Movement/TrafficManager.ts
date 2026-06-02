//@ts-nocheck

import * as THREE from "three"
import { toRaw } from 'vue';
// import * as THREEInterfases from "@/types/interfases"
import * as THREETypes from "@/types/types"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
// import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'

import { useEventBus } from '@/store/appliction/useEventBus';
import { useModelState } from '@/store/appliction/useModelState';

import { DragAndDropManager } from "./DragAndDropManager";
import { MoveManager } from "./MoveManager";

import { CustomBoxHelper } from "../Utils/BoxHelperCustom";
import { DeepDispose } from '../Utils/DeepDispose';
import { UniversalGeometryBuilder } from "@/Application/Meshes/UniversalModuleUtils/UniversalGeometryBuilder.ts";
import { useBasketStore } from "@/store/appStore/useBasketStore";
import { useMenuStore } from "@/store/appStore/useMenuStore";

export class TrafficManager {

    root: THREETypes.TApplication
    canvas: HTMLElement;
    scene: THREE.Scene;
    render: THREETypes.TRenderer

    events: ReturnType<typeof useEventBus> = useEventBus()
    modelState: ReturnType<typeof useModelState> = useModelState()
    menuStore: ReturnType<typeof useMenuStore> = useMenuStore()

    raycaster: THREE.Raycaster = new THREE.Raycaster()
    mouse: THREE.Vector2 = new THREE.Vector2()
    camera: THREE.Camera | null = null
    controls: OrbitControls | null = null
    room: THREETypes.TRoomManager
    geometryBuilder: THREETypes.TGeometryBuilder
    universalGeometryBuilder: THREETypes.UniversalGeometryBuilder;

    despose: DeepDispose
    dragAndDropManager: DragAndDropManager
    moveManager: MoveManager | null = null
    //boxHelper: CustomBoxHelper
    boxHelper: THREETypes.TCustomBoxHelper
    currentObject: THREE.Object3D | null = null
    ruler: THREETypes.Ruler
    rulerLines: THREE.Object3D[] = [];
    rullerSizeLines: THREE.Object3D[] = [];

    private onRemoveFromRoom: ({ model }: { model: THREE.Object3D | undefined }) => void;
    private onClearSelectObject: () => void

    // constructor(canvas: HTMLElement, scene: THREE.Scene, room: RoomManager, camera: THREE.Camera, controls: OrbitControls) {

    constructor(root: THREETypes.TApplication, room: THREETypes.TRoomManager) {

        this.root = root
        this.render = root._renderClass
        this.controls = root._orbitControls
        this.canvas = root._canvas;
        this.scene = root._scene;
        this.camera = root._camera
        this.room = room

        this.ruler = root._ruler

        this.ruler.setParams(
            {
                scene: root._scene,
                room,
                rulerLines: this.rulerLines,
                rullerSizeLines: this.rullerSizeLines
            })

        this.despose = new DeepDispose()
        this.boxHelper = root._customBoxHelper
        this.geometryBuilder = root.geometryBuilder
        this.universalGeometryBuilder = root.universalGeometryBuilder
        //this.dragAndDropManager = new DragAndDropManager(this.canvas, this.scene, this.room, this.camera as THREE.Camera, this.mouse, this.raycaster, this.boxHelper, this)

        this.dragAndDropManager = new DragAndDropManager(root, this.mouse, this.raycaster, this)
        this.moveManager = new MoveManager({ root, mouse: this.mouse, raycaster: this.raycaster, trafficManager: this })

        this.vueEvents()
    }

    get _currentObject() {
        return this.currentObject
    }

    set _currentObject(object) {

        /** Получаем выбранный объект */

        this.currentObject = object
        // 

        if (object) {

            this.events.emit("A:Selected", {
                object: object,
                roomContant: this.room._roomContant
            })

            console.log('OBJ_', object);
            console.log('OBJ_PROPS', object.userData.PROPS);
            console.log('OBJ_CONFIG', object.userData.PROPS.CONFIG);

            // console.log('object.userData.PROPS.PRODUCT', object.userData.PROPS.PRODUCT)
            console.log('PROD', this.root.geometryBuilder?.buildProduct._PRODUCTS[object.userData.PROPS.PRODUCT])
            // Обновление корзины при простом выборе/перемещении не требуется

            if (object.userData.elementType !== 'raspil' && !object.userData.PROPS?.RAYCAST) {
                const product = this.root.geometryBuilder?.buildProduct._PRODUCTS[object.userData.PROPS.PRODUCT];
                // this.modelState.createCurrentModelFasadesData(product.FACADE);
                this.modelState.createCurrentModuleData(product.MODULECOLOR)
            }

            if(object.userData.elementType === 'element_room'){
                // console.log(this.modelState._WALL)
            }
        }
        else {

            this.events.emit("A:ClearSelected", { object: null, roomContant: this.room._roomContant });
            this.modelState.clearCurrentModelFasadesData()
            // this.menuStore.closeAllMenus();
        }

    }

    get _sizes() {
        return this.root._sizes
    }

    get _camera() {
        return this.root._camera
    }

    public checkSelect(value) {
        if (value == null) {
            this.modelState.clearCurrentModelFasadesData()
            this.menuStore.closeAllMenus();
        }
    }

    async update(room: THREETypes.TRoomManager) {

        this.room = room
        this.rulerLines = []

        this.currentObject = null
        this.boxHelper._boxHelperCheck = null
        this.raycaster = new THREE.Raycaster();

        this.dragAndDropManager.updateRoomData(room)
        this.moveManager.updateRoomData(room)

        // this.ruler.update(room, this.rulerLines, this.rullerSizeLines)
    }


    removeFromRoom({ product }: { product?: Event | THREE.Object3D | string | numer } = {}) {

        const removeObj = product ?? this._currentObject
        if (!removeObj) return

        if (removeObj instanceof THREE.Object3D) {
            const prod = toRaw(removeObj)
            const { RASPIL_LIST } = prod.userData.PROPS

            if (RASPIL_LIST.length > 0) {
                RASPIL_LIST.forEach(elem => {
                    this.room.remove(elem.id)
                    const meshInScene = this.scene.getObjectByProperty('id', elem.id) as THREE.Object3D
                    this.despose.clearObject(meshInScene, this.scene)
                    this.boxHelper.removeBoxHelper()
                    this.ruler.clearRuler();
                    this.currentObject = null
                })
            }

            this.room.remove(removeObj.id)
            this.despose.clearObject(removeObj, this.scene)
            this.boxHelper.removeBoxHelper()
            this.ruler.clearRuler();
            this.currentObject = null
            // Синхронизируем корзину: удаляем товар, соответствующий удалённому объекту сцены
            try {
                const basketStore = useBasketStore();
                basketStore.removeItem('scene', String((removeObj as any).id));
            } catch (e) {
                console.warn('Basket sync remove failed', e)
            }

            this.modelState.setCurrentModel(null)
            this.events.emit("U:RemoveModel")
            return
        }

        this.room.remove(removeObj.id)
        this.despose.clearObject(removeObj, this.scene)
        this.boxHelper.removeBoxHelper()
        this.ruler.clearRuler();
        this.currentObject = null
        this.events.emit("U:RemoveModel")
        // Синхронизируем корзину для случая, когда пришёл не Object3D
        try {
            const basketStore = useBasketStore();
            basketStore.removeItem('scene', String((removeObj as any).id));
        } catch (e) {
            console.warn('Basket sync remove failed', e)
        }

    }

    vueEvents() {

        this.onRemoveFromRoom = (model) => {
            this.removeFromRoom(model)
            this.events.emit("A:RemoveModelSuccses");
        }

        this.events.on('A:RemoveModel', this.onRemoveFromRoom);
        this.events.on('A:RemoveModelFromBasket', (payload: any) => {
            let target = payload?.product;

            if (!(target instanceof THREE.Object3D)) {
                const basketId = payload?.basketId || payload?.BASKETID || payload?.id || payload;

                // 1) Пробуем взять напрямую из RoomManager.contant по ключу id
                if (!target && basketId && this.room && this.room.contant) {
                    const byId = (this.room.contant as any)[`${basketId}`];
                    if (byId) target = byId;
                }

                // 2) Пробуем найти в сцене по id
                if (!target && basketId && this.scene) {
                    const byScene = this.scene.getObjectByProperty('id', basketId as any) as THREE.Object3D | undefined;
                    if (byScene) target = byScene;
                }
            }

            this.removeFromRoom({ product: target });
        });

    }

    removeVueEvents() {
        this.events.off('A:RemoveModel', this.onRemoveFromRoom);

    }

}