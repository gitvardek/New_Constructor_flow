//@ts-nocheck

import * as THREE from 'three';
import { toRaw } from 'vue';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { TApplication, TMoveManager } from '@/types/types';
import { useEventBus } from '@/store/appliction/useEventBus';
import { useModelState } from '@/store/appliction/useModelState';
import { useTransformController } from '@/components/ui/transformController/useTransformController';
// Интерфейс для callbacks (хуков)
interface TransformControlsCallbacks {
    onAttach?: (object: THREE.Object3D) => void;
    onDetach?: (object: THREE.Object3D) => void;
    onToggle?: (enabled: boolean) => void;
    onModeChange?: (mode: 'translate' | 'rotate' | 'scale') => void;
    onDraggingChanged?: (dragging: boolean) => void;
}

export class TransformControlsManager {
    private eventBus: ReturnType<typeof useEventBus> = useEventBus()
    private modelState: ReturnType<typeof useModelState> = useModelState();
    private transformController: ReturnType<typeof useTransformController> = useTransformController();
    private orbitControls: OrbitControls
    private moveManager: TMoveManager
    private root: TApplication
    private canvas: HTMLElement
    private scene: THREE.Scene;
    private camera: THREE.Camera;
    private renderer: THREE.WebGLRenderer;
    private callbacks: Required<TransformControlsCallbacks>; // Используем Required, чтобы свойства всегда функции
    private controls: TransformControls;
    private isEnabled: boolean = false;
    private currentTarget: THREE.Object3D | null = null;
    private disposed: boolean = false; // Флаг для предотвращения использования после dispose
    private hasChanges: boolean = false; // Гизмо сдвинуло или повернуло объект в текущем перетаскивании

    /** Зазор до стены (мм), в пределах которого сброс свободной установки прижимает объект к стене */
    private readonly WALL_SNAP_DISTANCE: number = 100

    private rotationSnapDegrees: number
    private rotationSnapRadians: number

    constructor(
        root: TApplication,
        callbacks: TransformControlsCallbacks = {}
    ) {
        this.root = root
        this.scene = root._scene!;
        this.camera = root._camera!;
        this.renderer = root._renderer;
        this.canvas = root._canvas!
        this.moveManager = root._trafficManager?.moveManager!
        this.orbitControls = root._orbitControls!

        this.rotationSnapRadians = THREE.MathUtils.degToRad(this.transformController.getControlSnapAngle)


        // Опциональные callbacks (хуки) с дефолтными пустыми функциями (теперь Required гарантирует тип)
        this.callbacks = {
            onAttach: callbacks.onAttach || (() => { }),
            onDetach: callbacks.onDetach || (() => { }),
            onToggle: callbacks.onToggle || (() => { }),
            onModeChange: callbacks.onModeChange || (() => { }),
            onDraggingChanged: callbacks.onDraggingChanged || (() => { }),
        };

        // Создаём TransformControls
        this.controls = new TransformControls(this.camera, this.canvas);
        const helper = this.controls.getHelper()
        helper.userData.isTransformGizmo = true;
        // this.controls.showZ = false
        // this.controls.showX = false

        this.scene.add(this.controls.getHelper()); // Добавляем в сцену (включая helper)
        this.applyRotationSnap();
        this.addEvents()
        // Подписываемся на встроенные события TransformControls
        this.controls.addEventListener('dragging-changed', (event) => {
            this.onDraggingChanged(event.value as boolean); // true = dragging, false = idle
        });
        // Любое изменение объекта гизмо делает его свободно установленным
        this.controls.addEventListener('objectChange', () => {
            this.hasChanges = true;
        });


    }

    // Проверка disposed в каждом методе (опционально, но предотвращает ошибки)
    private checkDisposed(): void {
        if (this.disposed) {
            throw new Error('TransformControlsManager is disposed and cannot be used.');
        }
    }

    private applyRotationSnap(): void {
        this.controls.setRotationSnap(this.rotationSnapRadians);
    }

    public setRotationSnap(degrees: number): void {
        this.rotationSnapDegrees = degrees;
        this.rotationSnapRadians = THREE.MathUtils.degToRad(degrees);
        this.applyRotationSnap();

        // Опционально: можно отправить событие отправить
        this.eventBus.emit('A:TransformRotationSnapChanged', degrees);
    }

    // Прикрепление к объекту
    attach(): void {

        const object: THREE.Object3D | null = this.modelState.getCurrentModel
        if (!object) return

        this.enable()
        this.checkDisposed();
        if (this.currentTarget === object) return; // Уже прикреплён

        this.moveManager.clearSelectVisual()

        this.detach(); // Отцепляем предыдущий, если есть
        this.controls.attach(object);

        this.currentTarget = object;
        this.callbacks.onAttach(object);

    }

    onDraggingChanged(value: boolean) {

        if (value) {
            this.orbitControls.enabled = false
        }
        else {
            this.orbitControls.enabled = true
            // Перетаскивание гизмо закончено — фиксируем результат
            if (this.hasChanges && this.currentTarget) {
                this.commitFreeTransform(this.currentTarget)
            }
        }
    }

    // Отцепление от объекта
    detach(): void {
        // this.checkDisposed();
        if (!this.currentTarget) return;

        if (this.hasChanges) {
            this.commitFreeTransform(this.currentTarget)
        }
        else {
            this.syncTransform(this.currentTarget)
        }

        this.controls.detach();
        this.callbacks.onDetach(this.currentTarget);
        this.currentTarget = null;
    }

    totalDetach() {
        this.isEnabled = false;
        this.controls.enabled = false;
        this.controls.detach();
        this.currentTarget = null;
        this.hasChanges = false;
    }

    /** Переносит положение объекта в CONFIG и данные коллизий */
    private syncTransform(object: THREE.Object3D): void {
        const { CONFIG } = object.userData.PROPS

        object.updateMatrixWorld(true)

        // Копии, а не ссылки: коллайдер меняет CONFIG.ROTATION через rotation.copy(),
        // а ресайз — позицию через position.set(POSITION), и это задевало бы сам объект
        CONFIG.POSITION = object.position.clone()
        CONFIG.ROTATION = object.rotation.clone()

        object.userData.targetPosition = object.position.clone()
        object.userData.MOUSE_POSITION = this.moveManager.getMousePos(object.position)
        // По aabb строится OBB объекта для коллизий соседей — без пересчёта они сталкивались бы с его старым местом
        object.userData.aabb = new THREE.Box3().setFromObject(object)
        object.userData.obb.center.copy(object.position)
        object.userData.obb.rotation.setFromMatrix4(object.matrixWorld)
    }

    /** Фиксирует установку гизмо: коллайдер больше не поворачивает объект к стенам */
    private commitFreeTransform(object: THREE.Object3D): void {
        this.hasChanges = false
        this.syncTransform(object)

        object.userData.PROPS.CONFIG.FREE_TRANSFORM = true
        this.transformController.setFreeTransform(true)

        this.eventBus.emit('U:PositionChanged')
    }

    /** Снимает свободную установку: объект получает поворот ближайшей стены и снова к ней притягивается */
    resetFreeTransform(): void {
        const object: THREE.Object3D | null = toRaw(this.modelState.getCurrentModel)
        if (!object?.userData.PROPS?.CONFIG.FREE_TRANSFORM) {
            return
        }

        const roomManager = this.root._roomManager
        const { CONFIG } = object.userData.PROPS

        delete CONFIG.FREE_TRANSFORM
        this.transformController.setFreeTransform(false)

        const wall = this.findNearestWall(object.position, roomManager._roomWalls)
        // Зазор меряем до поворота: важно, насколько близко к стене объект стоит сейчас
        const snapToWall = !!wall && this.getWallGap(object, wall) <= this.WALL_SNAP_DISTANCE

        if (wall) {
            CONFIG.ROTATION = wall.rotation.clone()
            object.rotation.copy(wall.rotation)
            object.updateMatrixWorld(true)
            object.userData.obb.rotation.setFromMatrix4(object.matrixWorld)
        }

        // Точка на плоскости стены — туда же целится перетаскивание мышью по стене,
        // коллайдер затем отодвигает объект на его глубину
        const targetPosition = snapToWall
            ? wall.userData.plane.projectPoint(object.position, new THREE.Vector3())
            : object.position.clone()

        const adjusted = roomManager.adjustPositionWithRaycasting({
            object,
            targetPosition,
            wall: snapToWall ? wall : roomManager._roomFloor
        })

        object.position.copy(adjusted.position)
        object.rotation.copy(adjusted.rotation)

        this.syncTransform(object)
        // Цель на стене: при ресайзе глубины коллайдер снова прижмёт объект задней стенкой
        object.userData.targetPosition = targetPosition

        this.root._customBoxHelper?.updateBoxHelper()
        this.eventBus.emit('U:PositionChanged')
    }

    /** Ближайшая к точке стена по расстоянию до её отрезка на полу */
    private findNearestWall(position: THREE.Vector3, walls: THREE.Object3D[]): THREE.Object3D | null {
        const point = new THREE.Vector3(position.x, 0, position.z)
        const segment = new THREE.Line3()
        const closest = new THREE.Vector3()

        let nearest: THREE.Object3D | null = null
        let minDistance = Infinity

        for (const wall of walls) {
            const { coordinates, plane } = wall.userData
            if (!plane || !coordinates || coordinates.length < 2) {
                continue
            }

            segment.start.set(coordinates[0].x, 0, coordinates[0].z)
            segment.end.set(coordinates[1].x, 0, coordinates[1].z)
            segment.closestPointToPoint(point, true, closest)

            const distance = closest.distanceTo(point)
            if (distance < minDistance) {
                minDistance = distance
                nearest = wall
            }
        }

        return nearest
    }

    /** Зазор между ближайшей к стене гранью OBB объекта и плоскостью стены */
    private getWallGap(object: THREE.Object3D, wall: THREE.Object3D): number {
        const { obb } = object.userData
        const { plane } = wall.userData

        // Нормаль стены в локальных осях OBB — по ней проецируем полуразмеры
        const localNormal = plane.normal.clone().applyMatrix3(obb.rotation.clone().transpose())
        const extent = obb.halfSize.x * Math.abs(localNormal.x)
            + obb.halfSize.y * Math.abs(localNormal.y)
            + obb.halfSize.z * Math.abs(localNormal.z)

        return plane.distanceToPoint(object.position) - extent
    }

    // Включение (enabled = true)
    enable(): void {
        // this.checkDisposed();
        if (this.isEnabled) return;
        this.isEnabled = true;
        this.controls.enabled = true;
        if (this.currentTarget) {
            this.attach(this.currentTarget); // Переприкрепляем, если был отцеплён
        }
        this.callbacks.onToggle(true);
    }

    // Выключение (enabled = false)
    disable(): void {
        // this.checkDisposed();
        if (!this.isEnabled) return;
        this.isEnabled = false;
        this.controls.enabled = false;
        this.detach(); // Автоматически отцепляем при выключении
        this.callbacks.onToggle(false);
    }

    // Переключение состояния
    toggle(): void {
        this.checkDisposed();
        if (this.isEnabled) {
            this.disable();
        } else {
            this.enable();
        }
    }

    // Переключение режима (translate, rotate, scale)
    setMode(mode: 'translate' | 'rotate' | 'scale'): void {
        // this.checkDisposed();
        if (this.isEnabled && this.currentTarget) {
            this.controls.setMode(mode);
            if (mode === 'rotate') {
                this.applyRotationSnap();
            } else {
                this.controls.setRotationSnap(null);
            }
            // this.callbacks.onModeChange(mode);
        }
    }

    // Обновление в анимационном цикле
    update(): void {
        if (this.disposed) return; // Не throw, чтобы анимация не падала

        this.controls.update();
    }

    // Getter для прямого доступа к TransformControls (если нужно)
    getControls(): TransformControls {
        this.checkDisposed();
        return this.controls;
    }

    // Очистка ресурсов
    dispose(): void {
        if (this.disposed) return;
        this.disable(); // Выключаем перед dispose
        this.controls.dispose();
        this.scene.remove(this.controls);
        this.currentTarget = null;
        this.disposed = true;
        // НЕ трогаем callbacks — они остаются функциями для типизации
    }

    // Getter для состояния enabled (для внешнего использования, напр. обновление UI)
    get _isEnabled(): boolean {
        return this.isEnabled;
    }

    addEvents() {
        const onAttach = () => {
            this.attach()
        }
        const onDisable = () => {
            this.disable()
        }

        const onTotalDetach = () => {
            this.totalDetach()
        }

        const onSetMode = (value) => {
            this.setMode(value)
        }

        const onSetRotationSnap = (degrees: number) => {
            this.setRotationSnap(degrees);
        };

        const onReset = () => {
            this.resetFreeTransform()
        }


        this.eventBus.on("A:TransformSetMode", onSetMode)
        this.eventBus.on("A:TransformMode_On", onAttach)
        this.eventBus.on("A:TransformMode_Off", onDisable)
        this.eventBus.on("A:GlobalTransformMode_Off", onDisable)
        
        this.eventBus.on("A:Load", onTotalDetach)
        this.eventBus.on("A:Create", onTotalDetach)
        this.eventBus.on("A:NextAction", onTotalDetach)
        this.eventBus.on("A:PrevAction", onTotalDetach)
        this.eventBus.on("A:TransformSetRotationSnap", onSetRotationSnap);
        this.eventBus.on("A:TransformReset", onReset);

    }
}