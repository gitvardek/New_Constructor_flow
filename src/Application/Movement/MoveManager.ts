// @ts-nocheck

import * as THREE from "three";
import * as THREETypes from "@/types/types"
import { OBB } from 'three/examples/jsm/math/OBB.js';

import { GeometryBuilder } from "../Meshes/GeometryBuilder";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { CustomBoxHelper } from "../Utils/BoxHelperCustom";

import { useEventBus } from "@/store/appliction/useEventBus";
import { useModelState } from "@/store/appliction/useModelState";
import { useTransformController } from "@/components/ui/transformController/useTransformController";
import { useUniformState } from "@/store/appliction/useUniformState";

import { OBBHelper } from "../Utils/CalculateBoundingBox";
import { UniformModeHandler } from "../Utils/UniformModeHandler";

export class MoveManager {

    eventBus: ReturnType<typeof useEventBus> = useEventBus();
    // modelState: ReturnType<typeof useModelState> = useModelState();
    private transformController: ReturnType<typeof useTransformController> = useTransformController();
    uniformState: ReturnType<typeof useUniformState> = useUniformState();
    uniformEvents: THREETypes.TUniformTextureEvents

    keybordListeners: TKeybordListeners
    root: THREETypes.TApplication
    canvas: HTMLElement | null = null;
    scene: THREE.Scene | null = null;
    raycaster: THREE.Raycaster | null = null;
    mouse: THREE.Vector2 | null = null;
    camera: THREE.Camera | null = null;
    controls: OrbitControls
    trafficManager: THREETypes.TrafficManager
    objectFactory: GeometryBuilder
    geometryBuilder: GeometryBuilder
    uniformTextureBuilder: THREETypes.TUniformTextureBuilder
    ruler: THREETypes.TRuler

    roomManager: THREETypes.TRoomManager
    boxHelper: CustomBoxHelper

    selectedObject: THREE.Object3D | null = null;
    obbHelper: OBBHelper = new OBBHelper()
    startPos: THREE.Vector3 = new THREE.Vector3()
    uniformModeHandler: UniformModeHandler
    leftDown: boolean = false

    // rulerLines: THREE.Object3D[] = []

    private onMouseDownBound: (event: MouseEvent) => void;
    private onMouseMoveBound: (event: MouseEvent) => void;
    private onMouseUpBound: (event: MouseEvent) => void;
    private onWheelBound: (event: WheelEvent) => void;

    private onTouchStartBound: (event: TouchEvent) => void;
    private onTouchMoveBound: (event: TouchEvent) => void;
    private onTouchEndBound: (event: TouchEvent) => void;

    private onKeyDown: (event) => void;
    private extention: ''



    // private unionMode: boolean = false
    // private preGrouping: boolean = false
    // private groupAddition: boolean = false

    constructor(
        {
            root,
            mouse,
            raycaster,
            trafficManager
        }: {
            root: THREETypes.TApplication,
            mouse: THREE.Vector2,
            raycaster: THREE.Raycaster,
            trafficManager: TrafficManager
        }) {


        this.canvas = root._canvas;
        this.scene = root._scene;
        this.camera = root._camera;
        this.controls = root._orbitControls
        this.trafficManager = trafficManager
        this.roomManager = root._roomManager;
        this.keybordListeners = root.keybordListeners

        this.raycaster = raycaster;
        this.mouse = mouse;
        this.geometryBuilder = root._geometryBuilder
        this.uniformTextureBuilder = this.geometryBuilder.buildProduct.uniform_texture_builder // Переходящий рисунок
        this.uniformEvents = this.uniformTextureBuilder.uniformEvents
        this.boxHelper = root._customBoxHelper
        this.ruler = root._ruler

        // Инициализируем обработчик режима переходящего рисунка
        this.uniformModeHandler = new UniformModeHandler(
            this.uniformEvents,
            this.uniformState,
            this.boxHelper,
            this.trafficManager,
            this.uniformTextureBuilder
        )

        this.onMouseDownBound = this.onMouseDown.bind(this)
        this.onMouseMoveBound = this.onMouseMove.bind(this)
        this.onMouseUpBound = this.onMouseUp.bind(this)
        this.onWheelBound = this.onWheel.bind(this)

        this.onTouchStartBound = this.onTouchStart.bind(this)
        this.onTouchMoveBound = this.onTouchMove.bind(this)
        this.onTouchEndBound = this.onTouchEnd.bind(this)

        this.onKeyDown = this.keyDown.bind(this)

        this.setupModelMove();
        this.addVueEvents();
        this.setupKeys();

    }

    setupModelMove() {
        // Для мышиных событий
        this.canvas.addEventListener('mousedown', this.onMouseDownBound, false);
        this.canvas.addEventListener('mousemove', this.onMouseMoveBound, false);
        this.canvas.addEventListener('mouseup', this.onMouseUpBound, false);
        this.canvas.addEventListener('wheel', this.onWheelBound, false);

        // Для сенсорных событий (мобильные устройства)
        this.canvas.addEventListener('touchstart', this.onTouchStartBound, false);
        this.canvas.addEventListener('touchmove', this.onTouchMoveBound, false);
        this.canvas.addEventListener('touchend', this.onTouchEndBound, false);
    }

    private onMouseDown(event: MouseEvent) {
        if (this.transformController.getTransformControlsValue) {
            return
        }

        this.eventBus.emit('A:MouseDown');
        switch (event.button) {
            case 0:
                this.leftDown = true
                this.handleInteractionStart(event.clientX, event.clientY);
                break;
            case 1:
            case 2:
                this.clearSelectObject()
                break;

        }
    }

    private onMouseMove(event: MouseEvent) {
        this.handleInteractionMove(event.clientX, event.clientY);
    }

    private onMouseUp(event: MouseEvent) {


        this.handleInteractionEnd();

        switch (event.button) {
            case 1:
            case 2:
                if (this.leftDown) {
                    this.clearSelectVisual()
                }
                break;

        }


        this.leftDown = false
    }

    private onWheel(event: WheelEvent) {
        if (this.transformController.getTransformControlsValue) {

            return
        }
        this.clearSelectObject()
    }

    private onTouchStart(event: TouchEvent) {

        const touch = event.touches[0];  // Получаем первое касание
        this.handleInteractionStart(touch.clientX, touch.clientY);
    }

    private onTouchMove(event: TouchEvent) {
        const touch = event.touches[0];  // Получаем первое касание
        this.handleInteractionMove(touch.clientX, touch.clientY);
    }

    private onTouchEnd(event: TouchEvent) {
        this.handleInteractionEnd();
    }

    // Универсальная функция для начала взаимодействия (мышь или касание)
    private handleInteractionStart(clientX: number, clientY: number) {


        this.boxHelper._boxHelperCheck ? this.boxHelper.removeBoxHelper() : ''
        this.updateMousePosition(clientX, clientY);
        this.selectObject();

        if (this.selectedObject && !this.uniformTextureBuilder._unionMode) {
            // // Создаём линию разметки высоты
            this.roomManager.drawSnapHeightLines(this.roomManager.heightClamp)
        }

    }

    // Универсальная функция для перемещения объекта (мышь или касание)
    public handleInteractionMove(clientX: number, clientY: number) {
        if (this.uniformEvents._unionMode) return
        // console.log(this.selectedObject)
        if (this.selectedObject) {

            this.updateMousePosition(clientX, clientY);
            this.moveSelectedObject();
            this.eventBus.emit('A:Move', false);
        }
    }

    // Универсальная функция для завершения взаимодействия (мышь или касание)
    private handleInteractionEnd() {
        this.roomManager.disableDuplicateProd()
        /**Проверка на выбранный объект и режим выбора группы */
        if (this.selectedObject && !this.uniformEvents._unionMode) {

            const { CONFIG } = this.selectedObject.userData.PROPS

            CONFIG.POSITION = this.selectedObject.position
            CONFIG.ROTATION = this.selectedObject.rotation

            this.selectedObject.userData.MOUSE_POSITION = this.getMousePos(this.selectedObject.position)

            this.eventBus.emit('A:Move', true);
            if (!this.selectedObject.position.equals(this.startPos)) {
                this.eventBus.emit('U:PositionChanged');
            }
            this.startPos = new THREE.Vector3();
        }
        this.controls.enabled = true;
        this.selectedObject = null;
        // Срываем линию высоты
        this.roomManager.disposeSnapHeightLines();
    }

    private updateMousePosition(clientX: number, clientY: number) {
        this.mouse.x = ((clientX - this.canvas.getBoundingClientRect().left) / this.canvas.clientWidth) * 2 - 1;
        this.mouse.y = -((clientY - this.canvas.getBoundingClientRect().top) / this.canvas.clientHeight) * 2 + 1;
    }

    // Выбор Объекта 
    private selectObject() {
        this.roomManager._rulerContant = false

        this.raycaster.setFromCamera(this.mouse, this.camera);


        const intersects = this.raycaster.intersectObjects(this.roomManager._roomTotalContant);

        if (intersects.length > 0) {


            const point = intersects[0].point;
            const firstObject = intersects[0].object;

            // Выключаем OrbitContrrol
            this.controls.enabled = false

            // Если это GLTF-модель, выбираем её как цель
            const check = this.getRootObject(firstObject);

            // if (check.userData.elementType === "element_room") return
            if (!check.visible) return

            this.selectedObject = check

            this.selectedObject.userData.aabb = this.trafficManager.geometryBuilder.buildProduct.computeAABB(this.selectedObject)

            this.selectedObject.userData.current = true
            this.startPos = this.selectedObject.position.clone() /** @Для_тригера_изменения_позиции */

            this.roomManager.createTotalObbBounds() /** @Формируем_данные_для_коллизии */

            this.selectedObject.userData.MOUSE_POSITION = this.getMousePos(point)

            /** Переходящий рисунок */
            if (this.uniformEvents._unionMode) {
                /** предварительный выбор объектов в новую группу */
                if (this.uniformEvents._preGroup) {
                    this.uniformTextureBuilder.preGrouping(this.selectedObject)
                    this.boxHelper.createSelectGroup(this.selectedObject)
                }
                /** добавление объекта в группу */
                if (this.uniformEvents._groupAddition) {

                    this.boxHelper.clearSelect()
                    this.uniformEvents.desablePreGrouping()
                    this.uniformTextureBuilder.clearTemporaryGroups()

                    this.uniformTextureBuilder.addToUniformGroup(this.selectedObject)
                }
                /** Удаление объекта из группы */
                if (this.uniformEvents._degrouping) {

                    this.boxHelper.clearSelect()
                    this.uniformEvents.desablePreGrouping()
                    this.uniformTextureBuilder.clearTemporaryGroups()

                    this.uniformTextureBuilder.removeFromUniformGroup(this.selectedObject)
                }

                return
            }

            // Проверяем наличие BoxHelper 
            !this.boxHelper._boxHelperCheck ? this.boxHelper.addBoxHelper(this.selectedObject) : '';
            // Передаём данные выбранного объекта для events
            this.trafficManager._currentObject = this.selectedObject
            this.roomManager.setRoomTotalBounds()

            // Создаём линейку до объектов
            this.ruler.drawRulerToObjects(this.selectedObject)
            // Передаём координаты мыши для отрисовкм меню
            this.trafficManager._camera.updateProjectionMatrix();

            return
        }

        this.trafficManager.checkSelect(null)
        this.clearSelectObject()
        return
    }

    private getRootObject(object: THREE.Object3D): THREE.Object3D {
        let root = object;
        while (root.parent && root.parent.type !== 'Scene') {
            root = root.parent;
        }

        return root;
    }

    private moveSelectedObject() {

        if (this.unionMode) return

        if (!this.roomManager._roomFloor || !this.selectedObject) return;

        // this.eventBus.emit('A:Move')

        // Устанавливаем луч для получения пересечения
        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Пересекаем луч с полом и стенами
        const intersects = this.raycaster.intersectObjects([...this.roomManager._roomWalls, this.roomManager._roomFloor]);

        // console.log(this.selectedObject.userData.disableMove)

        if (intersects.length > 0 && !this.selectedObject.userData.PROPS.DISABLE_MOVE) {

            const point = intersects[0].point; // Точка пересечения с полом или стеной
            const surface = intersects[0].object // стена

            // this.selectedObject.userData.aabb = this.trafficManager.geometryBuilder.buildProduct.computeAABB(this.selectedObject)
            this.selectedObject.userData.aabb = new THREE.Box3().setFromObject(this.selectedObject);

            const adjustedPosition = this.roomManager.adjustPositionWithRaycasting({
                object: this.selectedObject, targetPosition: point, wall: surface
            });

            this.selectedObject.position.copy(adjustedPosition.position);
            this.selectedObject.rotation.copy(adjustedPosition.rotation);
            this.selectedObject.userData.targetPosition = point

            this.selectedObject.userData.obb.center.copy(this.selectedObject.position)

            this.selectedObject.userData.obb.rotation.setFromMatrix4(this.selectedObject.matrixWorld);

            this.selectedObject.userData.PROPS.CONFIG.ROTATION = this.selectedObject.rotation;

            this.boxHelper.updateBoxHelper();

        }

        // Обновляем линейку
        this.ruler.drawRulerToObjects(this.selectedObject)
    }

    public clearSelectObject() {

        if (!this.trafficManager._currentObject) return

        this.boxHelper.removeBoxHelper()
        /** Убираем линейку */
        this.ruler.clearRuler()
        // Убираем выбранный объект 
        this.trafficManager._currentObject = null

        if (this.uniformEvents._unionMode) {
            this.boxHelper.clearSelect()
            this.uniformEvents.desablePreGrouping()
            this.uniformTextureBuilder.clearTemporaryGroups()
            this.uniformEvents.desableGroupAddition()
            this.uniformEvents.desableDegrouping()
        }

    }

    public clearSelectVisual() {
        this.boxHelper.removeBoxHelper()
        this.ruler.clearRuler()
    }

    dispose() {
        this.canvas.removeEventListener('mousedown', this.onMouseDownBound, false);
        this.canvas.removeEventListener('mousemove', this.onMouseMoveBound, false);
        this.canvas.removeEventListener('mouseup', this.onMouseUpBound, false);
        this.canvas.removeEventListener('wheel', this.onWheelBound, false);

        this.canvas.removeEventListener('touchstart', this.onTouchStartBound, false);
        this.canvas.removeEventListener('touchmove', this.onTouchMoveBound, false);
        this.canvas.removeEventListener('touchend', this.onTouchEndBound, false);
        // document.removeEventListener('keyup', this.onKeyUp, false);

        this.canvas = null;
        this.scene = null;
        this.raycaster = null;
        this.mouse = null;
        this.camera = null;
    }

    updateRoomData(roomManager: THREETypes.TRoomManager) {
        this.selectedObject = null
        this.roomManager = roomManager

        /** Сбрасываем состояния переходящего рисунка */
        this.uniformEvents.desableUnionMode()
        this.uniformEvents.desablePreGrouping()
        this.uniformEvents.desableGroupAddition()
        // this.uniformTextureBuilder.clearTemporaryGroups()
        // this.uniformTextureBuilder.clearUniformGroups()
    }

    updateControl(controls: OrbitControls) {
        this.controls = controls
    }

    public setSelectObj(value) {
        this.selectedObject = value
    }

    public getMousePos(point) {
        return {
            x: point.clone().project(this.camera).x * this.trafficManager._sizes.width * 0.5,
            y: point.clone().project(this.camera).y * this.trafficManager._sizes.height * -0.5,
        }

    }

    checkMove() {
        return false
    }

    setupKeys() {
        this.keybordListeners.addKeydownCallback(this.onKeyDown)
    }

    keyDown(event) {

        // return

        if (event.repeat) return

        // if (event.shiftKey) {
        //     this.uniformModeHandler.toggleUniformMode()
        //     this.selectedObject = null

        //     // Эмитим событие для синхронизации состояния UI
        //     this.eventBus.emit('A:Uniform-Mode-Toggled', {
        //         uniformMode: this.uniformEvents._unionMode,
        //         showGroupsManager: false 
        //     })
        // }

    }

    addVueEvents() {
        this.eventBus.emit('A:Move', () => {
            this.checkMove()
        })

        this.eventBus.on('A:Pre-Create-Uniform-Group', () => {
            this.uniformEvents.enablePreGrouping()
            this.uniformEvents.desableGroupAddition()
            this.uniformEvents.desableDegrouping()


        })

        this.eventBus.on('A:Add-To-Uniform-Group', (groupId) => {

            this.uniformEvents.enableGroupAddition(groupId)
            this.uniformEvents.desablePreGrouping()

        })

        this.eventBus.on('A:Remove-From-Uniform-Group', (groupId) => {

            this.uniformEvents.enableDegrouping(groupId)
            this.uniformEvents.desablePreGrouping()

        })

        this.eventBus.on('A:Toggle-Uniform-Mode', (options = {}) => {
            this.uniformModeHandler.toggleUniformMode()
            this.selectedObject = null

            // Эмитим событие обратно для синхронизации состояния UI
            this.eventBus.emit('A:Uniform-Mode-Toggled', {
                uniformMode: this.uniformEvents._unionMode,
                showGroupsManager: options.showGroupsManager || false
            })
        })

        this.eventBus.on('A:Disable-Uniform-Mode', () => {
            this.uniformModeHandler.disableUniformMode()
            this.selectedObject = null

            // Эмитим событие обратно для синхронизации состояния UI
            this.eventBus.emit('A:Uniform-Mode-Toggled', {
                uniformMode: false,
                showGroupsManager: false
            })
        })

        this.eventBus.on('A:ClearSelected', () => {
            this.clearSelectObject()
        });
    }

}