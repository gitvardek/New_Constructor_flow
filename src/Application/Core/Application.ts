//@ts-nocheck
import * as THREE from "three"

import { Sizes } from "../Utils/Sizes"
import { Time } from "../Utils/Time"
import { Camera } from "./Camera";
import { Renderer } from "./Renderer";
import { World } from "./World";

import { CustomBoxHelper } from "@/Application/Utils/BoxHelperCustom";
import { RoomManager } from "../Room/RoomManager"
import { AppLights } from "../Lights/Lights"
import { TrafficManager } from "../Movement/TrafficManager"
import { TransformControlsManager } from "../Utils/TransformControlsManager";

import { GeometryBuilder } from '../Meshes/GeometryBuilder';
import { TableTopCreator } from "../../ConstructorTabletop/CutBuilder/CutBuilder";
import { MeshEvents } from "../Meshes/Utils/Events"
import { SetObject } from "../Utils/SetObject";
import { Ruler } from "../Utils/Ruler";
import { SystemInfo } from "../Utils/SystemInfo";
import { KeybordListeners } from "../Utils/KeybordListeners";
import { UserHistory } from "../Utils/UserHistory";
import { UseEdgeBuilder } from "../Meshes/EdgeBuilder/useEdgeBuilder";


import { useEventBus } from '../../store/appliction/useEventBus';
import { useAppData } from "@/store/appliction/useAppData";
import { useMenuStore } from "@/store/appStore/useMenuStore";
import { useModelState } from "@/store/appliction/useModelState";
import { DeepDispose } from "../Utils/DeepDispose"

// import { MeshEvents } from '../Meshes/Utils/Events';

import { Resources } from "../Utils/Resources";
import { ENVIROMENT_MAP } from "../F-mockapi";
import { UniversalGeometryBuilder } from "@/Application/Meshes/UniversalModuleUtils/UniversalGeometryBuilder.ts";
import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass";
export class Application {

    // private static instance: Application;
    /** Хранилища */
    eventBus: ReturnType<typeof useEventBus> = useEventBus();
    appData: ReturnType<typeof useAppData> = useAppData();
    menuStore: ReturnType<typeof useMenuStore> = useMenuStore();
    userHistory: UserHistory<string[]> = new UserHistory();
    modelState: ReturnType<typeof useModelState> = useModelState()
    // meshEvents: MeshEvents | null = null

    private canvas: HTMLElement | null;
    private sizes: Sizes | null = null;
    private time: Time | null = null;
    private scene: THREE.Scene | null = null;
    private camera: Camera | null = null;
    private renderer: Renderer | null = null;
    private resources: Resources | null = null
    private deepDispose: DeepDispose | null = null
    private transformControlsManager: TransformControlsManager | null = null
    private enviromentData: { [key: string]: any } | null = ENVIROMENT_MAP[0]

    private world: World | null = null;
    private geometryBuilder: GeometryBuilder | null
    private universalGeometryBuilder: UniversalGeometryBuilder | null
    private universalModuleConstructor: UMconstructorClass | null
    private tableTopCreator: TableTopCreator | null
    private room: RoomManager | null
    private trafficManager: TrafficManager | null
    private lights: AppLights | null
    private useEdgeBuilder: UseEdgeBuilder | null

    private meshEvents: MeshEvents | null = null
    private setObject: SetObject | null = null
    private ruler: Ruler | null = null
    private systemInfo: SystemInfo | null = null
    private keybordListeners: KeybordListeners | null = null
    private customBoxHelper: CustomBoxHelper | null = null

    constructor(canvas: HTMLElement) {
        // (window as any).aplication = this // Для разработки

        /** Инициализация */

        // THREE.Cache.enabled = true
        this.systemInfo = new SystemInfo()
        this.keybordListeners = new KeybordListeners(this)
        this.resources = new Resources();
        this.deepDispose = new DeepDispose()
        this.canvas = canvas

        this.sizes = new Sizes(canvas)
        this.time = new Time()
        this.scene = new THREE.Scene()
        this.camera = new Camera(this)
        this.renderer = new Renderer(this)

        this.lights = new AppLights(this)

        this.useEdgeBuilder = new UseEdgeBuilder(this)

        this.customBoxHelper = new CustomBoxHelper(this);
        this.ruler = new Ruler(this);
        this.geometryBuilder = new GeometryBuilder(this);
        this.universalGeometryBuilder = new UniversalGeometryBuilder(this);
        this.universalModuleConstructor = new UMconstructorClass(this)

        // this.meshEvents = new MeshEvents(this);

        this.setObject = new SetObject(this);

        // this.lights = new AppLights(this)
        this.room = new RoomManager(this)

        this.trafficManager = new TrafficManager(this, this.room)
        this.transformControlsManager = new TransformControlsManager(this)
        this.meshEvents = new MeshEvents(this);


        this.world = new World(this)

        this.tableTopCreator = new TableTopCreator(this)

        this.resources.startLoading(this.enviromentData!.texture, this.enviromentData!.type)

        // /** Привязка методов */

        this.resize = this.resize.bind(this)
        this.update = this.update.bind(this)

        this.sizes.on('resize', this.resize)
        this.time.on('tick', this.update)

        this.vueEvents()
        // this.checkLostContext()
    }

    get _appData() {
        return this.appData.getAppData
    }

    get _camera() {
        return this.camera!.instance
    }

    get _orbitControls() {
        return this.camera!.controls
    }

    get _renderClass() {
        return this.renderer
    }

    get _renderer() {
        return this.renderer!.instance
    }

    get _scene() {
        return this.scene
    }

    get _canvas() {
        return this.canvas
    }

    get _sizes() {
        return this.sizes
    }

    get _resources() {
        return this.resources
    }

    get _transformControlsManager() {
        return this.transformControlsManager
    }

    get _deepDispose() {
        return this.deepDispose
    }

    get _trafficManager() {
        return this.trafficManager
    }

    get _geometryBuilder() {
        return this.geometryBuilder
    }

    get _systemInfo() {
        return this.systemInfo
    }

    get _customBoxHelper() {
        return this.customBoxHelper
    }

    get _roomManager() {
        return this.room
    }

    get _lights() {
        return this.lights
    }

    get _ruler() {
        return this.ruler
    }

    get _setObject() {
        return this.setObject
    }

    get _universalGeometryBuilder() {
        return this.universalGeometryBuilder
    }

    get _universalModuleConstructor() {
        return this.universalModuleConstructor
    }

    get _tableTopCreator() {
        return this.tableTopCreator
    }

    get _useEdgeBuilder() {
        return this.useEdgeBuilder
    }
    /** singleton для PROD */

    // public static getInstance(canvas: HTMLElement): Application {
    //     if (!Application.instance) {
    //         Application.instance = new Application(canvas)
    //     }
    //     return Application.instance;
    // }

    private resize() {
        this.camera!.resize()
        this.renderer!.resize()
    }

    public refreshViewer() {
        this.resize()
        this.sizes?.getNewSize()
    }

    private update() {

        this.camera!.update()
        this.renderer!.update()
        this.transformControlsManager!.update()
    }

    public destroy() {
        try {
            // Отключаем слушатели событий
            if (this.keybordListeners) {
                try {
                    this.keybordListeners.removeKeyListeners();
                } catch (error) {
                    console.warn('Ошибка при удалении слушателей клавиатуры:', error);
                }
            }

            if (this.transformControlsManager) {
                try {
                    this.transformControlsManager.dispose()
                } catch (error) {
                    console.warn('Ошибка при уничтожении transformControlsManager:', error);
                }

            }

            if (this.sizes) {
                try {
                    this.sizes.off('resize');
                    this.sizes.destroy();
                } catch (error) {
                    console.warn('Ошибка при уничтожении sizes:', error);
                }
            }

            if (this.time) {
                try {
                    this.time.off('tick');
                    this.time.tickStop();
                } catch (error) {
                    console.warn('Ошибка при остановке time:', error);
                }
            }

            // Удаляем события компонентов
            if (this.camera) {
                try {
                    this.camera.removeCamera();
                } catch (error) {
                    console.warn('Ошибка при удалении камеры:', error);
                }
            }

            if (this.world) {
                try {
                    this.world.removeVueEvents();
                } catch (error) {
                    console.warn('Ошибка при удалении событий мира:', error);
                }
            }

            if (this.renderer) {
                try {
                    this.renderer.removeVueEvents();
                } catch (error) {
                    console.warn('Ошибка при удалении событий рендерера:', error);
                }
            }

            if (this.meshEvents) {
                try {
                    this.meshEvents.removeVueEvents();
                } catch (error) {
                    console.warn('Ошибка при удалении событий мешей:', error);
                }
            }

            // Очищаем сцену и историю
            if (this.deepDispose && this.scene) {
                try {
                    this.deepDispose.clearTotal(this.scene);
                } catch (error) {
                    console.warn('Ошибка при очистке сцены:', error);
                }
            }

            if (this.userHistory) {
                try {
                    this.userHistory.clearHistory();
                } catch (error) {
                    console.warn('Ошибка при очистке истории:', error);
                }
            }

            // Очищаем ссылки
            this.keybordListeners = null;
            this.meshEvents = null;
            this.enviromentData = null;
            this.setObject = null;
            this.resources = null;
            this.sizes = null;
            this.time = null;
            this.scene = null;
            this.camera = null;
            this.renderer = null;
            this.geometryBuilder = null;
            this.world = null;
            this.canvas = null;
            this.deepDispose = null;
        } catch (error) {
            console.error('Ошибка при уничтожении приложения:', error);
        }
    }

    // checkLostContext() {
    //     this.canvas.addEventListener('webglcontextlost', (event) => {
    //         event.preventDefault();
    //         console.log('WebGL context lost');
    //     }, false);
    // }

    public udateCamera(value: boolean) {
        this.camera!.ortoCamera = value
        this.camera!.setInstance()
        this.renderer!.camera = this.camera!.instance
        this.renderer!.setInstance()
    }

    private vueEvents() {

        this.eventBus.onEmitCalled(async (event) => {
            // console.log(`🔥 emit вызван: "${event}"`);

            if (this.userHistory.checkEvent(event)) {
                // console.log(`🔥 emit вызван: "${event}"`);

                const toAction: string[] = this.room?.save()!
                this.userHistory!.addAction(toAction)
            }
        });
        this.eventBus.on('A:PrevAction', () => {
            const prev = this.userHistory!.undo()
            this.modelState.setCurrentModel(null)

            console.log(JSON.parse(prev), 'prev')

            if (prev) {
                this.deepDispose!.clearExceptEssential(this.scene!)
                this.room?.update(prev)
            }

        })
        this.eventBus.on('A:NextAction', () => {
            const next = this.userHistory!.redo()
            this.modelState.setCurrentModel(null)
            if (next) {
                this.deepDispose!.clearExceptEssential(this.scene!)
                this.room?.update(next)
            }
        })

        this.eventBus.on('A:DrawingMode', (value: boolean) => {
            this.useEdgeBuilder?.drawingMode(value)

        })

        this.eventBus.on('A:ToggleRulerVisibility', (value: boolean) => {
            this.ruler?.toggleRulerVisibility(value)
        })
    }

    public getAction(action: string) {
        return {
            save: () => this.room?.save()
        }

    }
}