

//@ts-nocheck
import * as THREE from "three"
import * as THREEInterfases from "@/types/interfases"
import * as THREETypes from "@/types/types"

// import { RoomManager } from "../Room/RoomManager"
// import { MeshEvents } from "../Meshes/Utils/Events"

import { TrafficManager } from "../Movement/TrafficManager"

import { Environment } from "../Lights/Environment"
import { DeepDispose } from "../Utils/DeepDispose"
import { useSceneState } from "@/store/appliction/useSceneState"
import { useRoomState } from "@/store/appliction/useRoomState";
import { useRoomOptions } from '@/components/left-menu/option/roomOptions/useRoomOptons';
import { useEventBus } from '@/store/appliction/useEventBus';
import { useUniformState } from "@/store/appliction/useUniformState";
import { useModelState } from "@/store/appliction/useModelState"
import { useTransformController } from "@/components/ui/transformController/useTransformController"
import { useBasketStore } from "@/store/appStore/useBasketStore"
import {useTechnologistStorage} from "@/store/appStore/technologist/useTechnologistStorage.ts";
import { toHandlers } from "vue"

export class World {

    root: THREETypes.TApplication;
    scene: THREE.Scene;

    deepDispose: THREETypes.TDeepDispose;
    resources: any;

    sceneState: ReturnType<typeof useSceneState> = useSceneState();
    roomState: ReturnType<typeof useRoomState> = useRoomState();
    eventsStore: ReturnType<typeof useEventBus> = useEventBus();
    uniformState: ReturnType<typeof useUniformState> = useUniformState();
    roomOptions: ReturnType<typeof useRoomOptions> = useRoomOptions();
    modelState: ReturnType<typeof useModelState> = useModelState()
    transformController: ReturnType<typeof useTransformController> = useTransformController();
    basketStore: ReturnType<typeof useBasketStore> = useBasketStore()
    technologistStore: ReturnType<typeof useTechnologistStorage> = useTechnologistStorage()

    trafficManager: THREETypes.TTrafficManager | null;
    room: THREETypes.TRoomManager | null = null;
    lights: THREETypes.TAppLights;
    enviroment: any;
    // meshEvents: MeshEvents | null = null

    private onCreateRoom: () => void;
    private onSaveRoom: () => void;
    private onLoadRoom: (data: number | string) => void;

    constructor(root: THREETypes.TApplication) {

        this.root = root
        this.scene = root.scene!
        this.resources = root.resources;
        this.lights = root._lights
        this.room = root._roomManager
        this.deepDispose = root._deepDispose
        this.trafficManager = root._trafficManager

        this.onCreateRoom = this.createRoom.bind(this)
        this.onSaveRoom = this.saveRoom.bind(this)
        this.onLoadRoom = this.loadRoom.bind(this)

        this.resources.on('cubeTextureLoaded', () => {
            this.enviroment = new Environment(root)
        })
        this.vueEvents()


        if (this.roomState.getRooms.length > 0) {
            this.roomState.setLoad(false)
            const startRoomId = this.roomState.getRoomId
                ? String(this.roomState.getRoomId)
                : String(this.roomState.getRooms[0].id)
            this.loadRoom(startRoomId)
        }
        else {

            this.room?.defaultCreate()
            this.lights.setLight(this.room!._wallsGroupSize, 1, this.room!._roomObject)
        }

        /** @Для_dev */
        // this.scene.add(new THREE.AxesHelper(2000))
        // this.room!.update()
        // this.lights.setLight(this.room!._wallsGroupSize, 2)

    }

    async setRoom(roomId) {

        // this.scene.add(new THREE.AxesHelper(2000))
        this.room!.loadRoom(this.lights, roomId)
        await this.room!.update();

    }

    async createRoom(name: string) {

        this.roomState.clearTempRoomSize();
        this.roomState.clearCurrentRoomId();
        this.deepDispose.clearScene(this.scene);
        await this.setRoom();
        this.lights.setLight(this.room!._wallsGroupSize, 1, this.room!._roomObject)

        if (this.trafficManager) {
            this.trafficManager.update(this.room!)
        }

        this.saveRoom(name)
        const toAction: string[] = this.room?.save()
        this.root.userHistory.clearHistory(toAction as string[])
        this.modelState.setCurrentModel(null)
        this.transformController.setTransformControlsValue(false)
        this.basketStore.clearBasket();
        this.technologistStore.clearStorage()
        this.technologistStore.clearError()
    }

    saveRoom(name: string) {


        if (!this.roomState.getRoomId) {
            const roomId = Date.now().toString()
            // console.log('Комнаты ещё нет')
            const contant = this.room!.save() as string[]

            this.roomState.addRoom({
                id: roomId, // Присваиваем id 
                label: name ?? `Комната N:${this.roomState.rooms.length + 1}`,
                params: this.roomState.getCurrentRoomParams as THREEInterfases.IWallSizes,
                content: contant,
                basket: JSON.stringify({
                    scene: this.basketStore.mainConstructor,
                    catalog: this.basketStore.mainCatalog
                })
            })
            // this.basketStore.clearBasket();

            const newrooms = this.roomState.getRooms
            this.sceneState.updateProjectParams({ rooms: newrooms })
            this.roomState.setCurrentRoomId(roomId)
            return
        }

        // console.log('Комната уже существует')

        const contant = this.room!.save() as string[]
        const roomId = String(this.roomState.getRoomId)
        // const roomParams = this.roomState.getCurrentRoomData(roomId)?.size as THREEInterfases.IWallSizes
        const roomParams = this.roomState.getCurrentRoomParams as THREEInterfases.IWallSizes
        const basket = JSON.stringify({
            scene: this.basketStore.mainConstructor,
            catalog: this.basketStore.mainCatalog
        })
        this.roomState.updateRoom(roomId, contant, roomParams, basket)
        const rooms = this.roomState.getRooms
        this.sceneState.updateProjectParams({ rooms: rooms })

    }

    async loadRoom(roomId: number | string) {
        this.uniformState.clearUniformGroupMembership();
        this.uniformState.clearUniformGroupsStors()
        this.roomState.clearCurrentRoomId()
        this.roomState.clearTempRoomSize()
        this.modelState.setCurrentModel(null)
        this.transformController.setTransformControlsValue(false)

        /** Добавляем ID комнаты в хранилище */
        this.roomState.setCurrentRoomId(roomId);

        this.deepDispose.clearScene(this.scene);

        await this.setRoom(roomId);
        this.lights.setLight(this.room!._wallsGroupSize, 1, this.room!._roomObject)
        await this.trafficManager!.update(this.room!)

        // if (this.roomState.getCurrentRoomData(roomId)?.params.wall) {
        //     const wallTextureId = this.roomState.getCurrentRoomData(roomId)?.params.wall
        //     this.room!.updateWallMaterial(wallTextureId)
        // }

        const toAction: string[] = this.room?.save()
        this.root.userHistory.clearHistory(toAction as string[])

        const invValue = this.roomOptions.getRefractionValue
        if (this.enviroment) this.enviroment.toggleRefraction(invValue)

        const roomWithBasket = this.roomState.rooms.find(el => String(el.id) === String(roomId));
        const basketRaw = roomWithBasket?.basket;
        if (basketRaw) {
            try {
                const basket = JSON.parse(basketRaw);
                // console.log('basket', basket);
                if (basket) this.basketStore.loadBasket(basket)
            } catch (err) {
                console.warn('Не удалось распарсить корзину комнаты', err);
            }
        }

    }

    vueEvents() {

        this.onCreateRoom = (name?: string) => {
            this.createRoom(name)
        }

        this.onSaveRoom = (name?: string) => {
            this.saveRoom(name)
        }

        this.onLoadRoom = (value) => {
            this.loadRoom(value)
        }

        this.eventsStore.on('A:Create', this.onCreateRoom);
        this.eventsStore.on('A:Save', this.onSaveRoom)
        this.eventsStore.on('A:Load', this.onLoadRoom)

    }

    removeVueEvents() {
        this.eventsStore.off('A:Create', this.onCreateRoom);
        this.eventsStore.off('A:Save', this.onSaveRoom)
        this.eventsStore.off('A:Load', this.onLoadRoom)

        this.room?.removeVueEvents();
        this.trafficManager?.moveManager.dispose();
        this.trafficManager?.removeVueEvents();
        this.trafficManager?.dragAndDropManager.dispose();

        this.lights = null
        this.enviroment = null
        this.room = null;
        this.trafficManager = null
    }
}
