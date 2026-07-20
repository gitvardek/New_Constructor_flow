//@ts-nocheck
import * as THREE from "three"
import * as THREEInterfases from "@/types/interfases"
import * as THREETypes from "@/types/types"

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// import { useAppContext } from "@/store/useAppContext"
import { useSceneState } from "@/store/appliction/useSceneState"
import { useEventBus } from "@/store/appliction/useEventBus";

import { Sizes } from "../Utils/Sizes"

type TCameraExtremum = {
    min: number,
    max: number
}

export class Camera {

    eventBuss: ReturnType<typeof useEventBus> = useEventBus()
    sizes: Sizes
    canvas: HTMLElement
    parent: THREETypes.TApplication

    scene: THREE.Scene
    instance: THREE.Camera | any = null
    controls: OrbitControls | null = null
    params: THREEInterfases.ICameraData
    // ortoParams: THREEInterfases.IOrtoCameraData
    ortoCamera: boolean = false
    screenSpacePanning: boolean = false
    keybordListeners: TKeybordListeners
    cameraExtremum: TCameraExtremum = {
        min: -16000,
        max: 16000
    }

    private onKeyDown: (event) => void;
    private onKeyUp: (event) => void
    private onSetPosition: (value: any) => void

    private cameraPositions = [
        { pos: new THREE.Vector3(5000, 8000, -8000), target: new THREE.Vector3(0, 0, 0) },
        { pos: new THREE.Vector3(8000, 1500, 0), target: new THREE.Vector3(0, 1500, 0) },
        { pos: new THREE.Vector3(-5000, 8000, -8000), target: new THREE.Vector3(0, 0, 0) },

        { pos: new THREE.Vector3(0, 5000, -10000), target: new THREE.Vector3(0, 0, 0) },
        { pos: new THREE.Vector3(0, 12000, 0), target: new THREE.Vector3(0, 0, 0) },
        { pos: new THREE.Vector3(0, 5000, 10000), target: new THREE.Vector3(0, 0, 0) },

        { pos: new THREE.Vector3(5000, 8000, 8000), target: new THREE.Vector3(0, 0, 0) },
        { pos: new THREE.Vector3(-8000, 1500, 0), target: new THREE.Vector3(0, 1500, 0) },
        { pos: new THREE.Vector3(-5000, 8000, 8000), target: new THREE.Vector3(0, 0, 0) },
    ]


    constructor(parent: THREETypes.TApplication) {

        this.parent = parent
        this.keybordListeners = parent.keybordListeners
        this.sizes = parent.sizes
        this.canvas = parent.canvas
        this.params = useSceneState().getStartCameraData
        // this.ortoParams = useSceneState().getStartOrtoCameraData
        this.scene = parent.scene

        this.onKeyDown = this.keyDown.bind(this)
        this.onKeyUp = this.keyUp.bind(this)
        this.onSetPosition = this.setPosition.bind(this)

        this.setInstance();
        this.setOrbitControls();
        this.setupKeys()
        this.vueEvents()
    }

    get _controls() {
        return this.controls
    }

    get _instanse() {
        return this.instance
    }

    setupKeys() {
        this.keybordListeners.addKeydownCallback(this.onKeyDown)
        this.keybordListeners.addKeyupCallback(this.onKeyUp)
    }

    keyDown(event) {

        if (event.ctrlKey || event.metaKey) {

            this.controls.screenSpacePanning = true
            // console.log('screenSpacePanning TRUE')
        }
    }

    keyUp(event) {

        if (!event.ctrlKey || !event.metaKey) {
            this.controls.screenSpacePanning = false
            // console.log('screenSpacePanning FALSE')
        }

    }

    screenPanningChange() {
        this.screenSpacePanning = !this.screenSpacePanning
    }

    setInstance(): void {
        this.instance = new THREE.PerspectiveCamera(this.params.fov, this.sizes.width / this.sizes.height, this.params.near, this.params.far)
        this.instance.position.set(...this.params.position)
        this.instance.lookAt(this.params.target.x, this.params.target.y, this.params.target.z)
        this.scene.add(this.instance)
        this.resize()
    }

    setOrbitControls(): void {

        this.controls = new OrbitControls(this.instance as THREE.Camera, this.canvas)

        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.2
        this.controls.target.set(this.params.target.x, this.params.target.y, this.params.target.z)
        this.controls.maxDistance = 15000
        this.controls.minDistance = 3000
        this.controls.enableRotate = true;
        this.controls.minZoom = 10;
        this.controls.maxZoom = 50;
        this.controls.screenSpacePanning = false
    }

    setPosition(value): void {

        // Если нажата центральная кнопка (action 4), устанавливаем камеру напротив самой широкой стены
        if (value === 4) {
            this.alignCameraToWidestWall()
            return
        }
        
        this.instance.position.copy(this.cameraPositions[value].pos)
        this.controls.target.set(...this.cameraPositions[value].target)
        this.controls?.update()
    }

    resetOrbitControls(): void {
        if (this.controls instanceof OrbitControls) {
            this.controls.dispose();
            this.controls = null
            this.setOrbitControls();
        }
    }

    resize(): void {
        let aspect = this.sizes.width / this.sizes.height;
        this.instance!.aspect = aspect;

        // if (this.ortoCamera) {
        //     this.instance!.left = (this.sizes.width / -2) * 0.01;
        //     this.instance!.right = (this.sizes.width / 2) * 0.01;
        //     this.instance!.top = (this.sizes.height / 2) * 0.01;
        //     this.instance!.bottom = (this.sizes.height / -2) * 0.01
        // } else {
        //     this.instance!.aspect = aspect;
        // }
        this.instance?.updateProjectionMatrix()
    }

    update() {
        if (this.instance instanceof THREE.OrthographicCamera) return
        this.instance.position.x = THREE.MathUtils.clamp(this.instance.position.x, this.cameraExtremum.min, this.cameraExtremum.max)
        this.instance.position.z = THREE.MathUtils.clamp(this.instance.position.z, this.cameraExtremum.min, this.cameraExtremum.max)
        this.instance.position.y = THREE.MathUtils.clamp(this.instance.position.y, this.cameraExtremum.min, this.cameraExtremum.max)


        this.controls!.update()
    }

    removeCamera() {
    }

    /**
     * Находит самую широкую стену в комнате
     */
    private findWidestWall(): THREE.Object3D | null {
        const roomManager = this.parent._roomManager
        if (!roomManager || !roomManager._roomWalls || roomManager._roomWalls.length === 0) {
            return null
        }

        const walls = roomManager._roomWalls
        let widestWall: THREE.Object3D | null = null
        let maxWidth = 0

        for (const wall of walls) {
            let width = 0

            // Пытаемся получить ширину из userData.dimensions
            if (wall.userData?.dimensions && Array.isArray(wall.userData.dimensions)) {
                // dimensions обычно [width, height] для PlaneGeometry
                width = wall.userData.dimensions[0] || 0
            }

            // Если не получилось, вычисляем из bounding box
            if (width === 0 && wall instanceof THREE.Object3D) {
                const box = new THREE.Box3().setFromObject(wall)
                const size = new THREE.Vector3()
                box.getSize(size)
                
                // Для стены ширина - это наибольший размер по X или Z (горизонтальные оси)
                // Высота обычно по Y
                width = Math.max(size.x, size.z)
            }

            if (width > maxWidth) {
                maxWidth = width
                widestWall = wall
            }
        }

        return widestWall
    }

    /**
     * Устанавливает камеру напротив самой широкой стены в комнате
     * Камера будет расположена так, чтобы смотреть прямо на центр стены
     */
    private alignCameraToWidestWall(): void {
        const widestWall = this.findWidestWall()
        
        if (!widestWall) {
            console.warn('Не найдены стены в комнате')
            // Fallback на стандартную позицию для action 4
            this.instance.position.copy(this.cameraPositions[4].pos)
            this.controls.target.set(...this.cameraPositions[4].target)
            this.controls?.update()
            return
        }

        // Получаем нормаль стены
        const wallNormal = widestWall.userData?.plane?.normal
        if (!wallNormal) {
            console.warn('Не удалось получить нормаль стены')
            // Fallback на стандартную позицию для action 4
            this.instance.position.copy(this.cameraPositions[4].pos)
            this.controls.target.set(...this.cameraPositions[4].target)
            this.controls?.update()
            return
        }

        const normal = new THREE.Vector3().copy(wallNormal).normalize()

        // Получаем центр стены
        const box = new THREE.Box3().setFromObject(widestWall)
        const wallCenter = new THREE.Vector3()
        box.getCenter(wallCenter)

        // Получаем размеры стены для вычисления оптимального расстояния
        const wallSize = new THREE.Vector3()
        box.getSize(wallSize)
        const wallWidth = Math.max(wallSize.x, wallSize.z)
        const wallHeight = wallSize.y

        // Расстояние от стены до камеры зависит от размера стены
        // Используем формулу, чтобы стена хорошо помещалась в поле зрения
        const cameraDistance = Math.max(wallWidth * 1.5, wallHeight * 2, 6000)
        
        // Высота камеры - на уровне центра стены
        const cameraHeight = wallCenter.y

        // Позиция камеры: от центра стены в направлении, противоположном нормали
        // Нормаль указывает наружу от стены, поэтому инвертируем её, чтобы смотреть на стену
        const cameraOffset = normal.clone().multiplyScalar(-cameraDistance)
        const cameraPosition = new THREE.Vector3()
            .copy(wallCenter)
            .add(cameraOffset)
        
        // Устанавливаем высоту камеры на уровне центра стены
        cameraPosition.y = cameraHeight

        // Target камеры - центр стены
        const targetPosition = wallCenter.clone()

        // Устанавливаем позицию камеры
        this.instance.position.copy(cameraPosition)
        
        // Устанавливаем target для OrbitControls
        this.controls.target.copy(targetPosition)
        
        // Обновляем контролы
        this.controls.update()

        // console.log('Камера установлена напротив самой широкой стены', {
        //     wallCenter: wallCenter.toArray(),
        //     cameraPosition: cameraPosition.toArray(),
        //     targetPosition: targetPosition.toArray(),
        //     normal: normal.toArray(),
        //     wallWidth,
        //     wallHeight,
        //     cameraDistance
        // })
    }

    vueEvents() {

        this.onSetPosition = (value) => {
            this.setPosition(value)
        }

        this.eventBuss.on('A:ChangeCameraPos', this.onSetPosition)

    }

}