// @ts-nocheck
import { toRaw } from 'vue';

import * as THREE from 'three';
import * as THREEInterfases from "@/types/interfases"
import * as THREETypes from "@/types/types"
import * as UniformTypes from '@/types/uniformTextureTypes'

import { OBB } from 'three/examples/jsm/math/OBB.js';
import { OBBCollider } from './OBBCollider';
import { OBBHelper } from '../Utils/CalculateBoundingBox';
// import { Capsule } from 'three/addons/math/Capsule.js';
// import { VertexNormalsHelper } from "three/examples/jsm/Addons.js";

import { useEventBus } from '@/store/appliction/useEventBus';
import { useRoomState } from '@/store/appliction/useRoomState';
import { useModelState } from '@/store/appliction/useModelState';
import { useSceneState } from '@/store/appliction/useSceneState';
import { useUniformState } from "@/store/appliction/useUniformState";

import { SetObject } from '../Utils/SetObject';
import { GeometryBuilder } from '../Meshes/GeometryBuilder';
import { Room } from './Room';
import { UniversalGeometryBuilder } from "@/Application/Meshes/UniversalModuleUtils/UniversalGeometryBuilder.ts";
import { saveUMGrid } from "@/components/UMconstructor/utils/PixiMethods.ts";
// import CreateShape from '../2DScene/CreateShape';


export class RoomManager extends Room {

    private eventsStore: ReturnType<typeof useEventBus> = useEventBus()
    private roomState: ReturnType<typeof useRoomState> = useRoomState()
    private modelState: ReturnType<typeof useModelState> = useModelState()
    private uniformState: ReturnType<typeof useUniformState> = useUniformState()
    private OBBCollider: OBBCollider = new OBBCollider()
    private OBBHealper: OBBHelper = new OBBHelper()

    // createShape: CreateShape
    root: THREETypes.TApplication
    scene: THREE.Scene
    setObject: SetObject | null
    geometryBuilder: GeometryBuilder | null
    universalGeometryBuilder: UniversalGeometryBuilder | null
    uniformTextureBuilder: THREETypes.TUniformTextureBuilder
    contant: { [key: string]: any } = {};
    heightClamp: number = useSceneState().getStartHeightClamp
    heightLine: THREE.Object3D[] = []
    totalObbBounds: OBB[] = []
    totalAABBBounds: THREE.Box3[] = []
    duplicateSwitch: boolean = false

    constructor(root: THREETypes.TApplication) {

        super(root, root._lights)
        this.root = root
        this.scene = root.scene!
        this.setObject = root.setObject!
        this.geometryBuilder = root.geometryBuilder
        this.universalGeometryBuilder = root.universalGeometryBuilder
        this.uniformTextureBuilder = root.geometryBuilder?.buildProduct.uniform_texture_builder!

        // this.createShape = new CreateShape(root.canvas, root.camera.instance as THREE.Camera, root.scene, root)

        this.addVueEvents()
    }

    get _roomTotalContant() {
        return Object.values(this.contant)
    }

    /** Для линейки -------------------------------------------- */

    get _rulerContant() {
        return Object.values(this.contant)
    }

    set _rulerContant(value: boolean | THREE.Object3D[]) {
        this._roomTotalContant.forEach(object => {
            if (object.userData?.current) {
                object.userData.current = value
                return
            }
        });
    }

    get _roomTotalBounds() {
        return this.totalAABBBounds

    }

    setRoomTotalBounds() {

        let boundsArray: THREE.Box3[] = []

        const intersects = this._rulerContant as THREE.Object3D[];

        intersects.forEach(object => {

            if (!object.userData?.current && object.visible && !object.userData.disableRaycast) {
                const box = new THREE.Box3().setFromObject(object);
                const boxTop = new THREE.Box3().setFromObject(object);
                box.max.y = 3000;
                box.min.y = 0

                boundsArray.push(box);
                boundsArray.push(boxTop);
            }

        });

        this.totalAABBBounds = boundsArray
    }

    createTotalObbBounds() {

        this.totalObbBounds = []
        const intersects = this._roomTotalContant as THREE.Object3D[];

        intersects.forEach(object => {

            if (!object.userData?.current && object.visible) {
                
                const center = object.userData.aabb.getCenter(new THREE.Vector3())
                const obb = object.userData.obb.clone()
                // obb.center.copy(object.position)
                obb.center.copy(center)
                obb.rotation.setFromMatrix4(object.matrixWorld);

                /** @Визуализация_OBB */

                // const OBBH = this.OBBHealper.add(obb)
                // this.scene.add(OBBH)

                this.totalObbBounds.push(obb);
            }
        });

    }

    clearTotalObbBounds() {
        this.totalObbBounds = []
    }

    get _totalObbBounds() {
        return this.totalObbBounds
    }

    /**-------------------------------------------------------- */

    get _roomContant() {
        return this.contant
    }

    set _roomContant(value) {
        this.contant[`${value.id}`] = value
    }


    adjustPositionWithRaycasting(
        { object,
            targetPosition,
            wall,
            targetRotation,
            snapHeight
        }: {
            object: THREE.Object3D,
            targetPosition: THREE.Vector3,
            targetRotation?: THREE.Euler,
            wall: THREE.Object3D,
            snapHeight?: number
        }): THREETypes.TAdjustPosition {


        const position = this.OBBCollider.getCorrectPosition({
            object,
            targetPosition,
            wall,
            targetRotation,
            snapHeight,
            heightClamp: this.heightClamp,
            wallStore: this._roomTotal,
            boundsStore: this._roomBounds,
            objectsBoundsStore: this._totalObbBounds,
        })

        return position
    }

    /** Функция примагничивания объекта к стене */

    drawSnapHeightLines(snapHeight: number): void {
        this.disposeSnapHeightLines();

        const lineMaterial = new THREE.LineDashedMaterial({
            color: 0x444444,
            dashSize: 100,
            gapSize: 100,
            linewidth: 20,
            scale: 2.5,
            transparent: true,
            opacity: 0.5,
            depthTest: true,
            depthWrite: true
        });

        for (const wall of this._roomWalls) {
            // Предполагаем, что wall — это THREE.Mesh с геометрией
            const geometry = wall.geometry;
            const vertices = [];

            // Получаем вершины геометрии в локальных координатах
            const positionAttribute = geometry.getAttribute('position');
            const vertex = new THREE.Vector3();

            // Список уникальных точек в плоскости XZ (игнорируем Y)
            const uniquePoints = new Map();

            for (let i = 0; i < positionAttribute.count; i++) {
                vertex.fromBufferAttribute(positionAttribute, i);
                // Преобразуем локальные координаты в мировые
                vertex.applyMatrix4(wall.matrixWorld);

                // Создаем ключ для уникальности точки в плоскости XZ
                const key = `${vertex.x.toFixed(6)},${vertex.z.toFixed(6)}`;
                if (!uniquePoints.has(key)) {
                    uniquePoints.set(key, new THREE.Vector3(vertex.x, snapHeight, vertex.z));
                }
            }

            // Получаем массив уникальных точек
            let points = Array.from(uniquePoints.values());

            // Сортируем точки для создания замкнутого контура (если стена замкнутая)
            if (points.length > 2) {
                points = this.sortPointsClockwise(points);
            }

            // Добавляем первую точку в конец, чтобы замкнуть линию
            if (points.length > 0) {
                points.push(points[0]);
            }

            // Создаем геометрию линии
            const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(lineGeometry, lineMaterial);
            line.computeLineDistances(); // Для пунктирной линии
            line.renderOrder = 1;

            this.scene.add(line);
            this.heightLine.push(line);
        }
    }

    // Вспомогательный метод для сортировки точек по часовой стрелке
    sortPointsClockwise(points: THREE.Vector3[]): THREE.Vector3[] {
        // Находим центр масс
        const centroid = new THREE.Vector3();
        for (const point of points) {
            centroid.add(point);
        }
        centroid.divideScalar(points.length);

        // Сортируем точки по углу относительно центра
        return points.sort((a, b) => {
            const angleA = Math.atan2(a.z - centroid.z, a.x - centroid.x);
            const angleB = Math.atan2(b.z - centroid.z, b.x - centroid.x);
            return angleA - angleB;
        });
    }

    disposeSnapHeightLines() {

        if (this.heightLine.length > 0) {

            this.heightLine.forEach(line => {
                this.scene.remove(line)
                line.traverse(children => {
                    if (children instanceof THREE.Mesh) {
                        children.geometry.dispose();
                        (children.material as THREE.Material).dispose();
                    }
                })
            })
        }

        this.heightLine = [];

    }

    // save(): string[] {

    //     const convert = Object.values(this.contant)
    //         .filter(item => item.userData.elementType !== 'raspil')
    //         .map(item => {
    //             return {
    //                 id: item.userData.globalData,
    //                 position: item.position.clone(),
    //                 rotation: item.rotation.clone(),
    //                 obb: item.userData.obb,
    //                 data: this.convertProps(item),
    //                 type: item.userData.elementType,
    //                 size: item.userData.PROPS.CONFIG.SIZE

    //             }

    //         });
    //     const result = JSON.stringify(convert)

    //     return result
    // }

    saveSingle(item: THREE.Object3D, duplicate: boolean = false): any {

        if (item.userData.elementType === 'raspil') {
            return null; // или бросить ошибку, если не нужно сохранять
        }

        const data = {
            id: item.userData.PROPS.PRODUCT,
            basketId: item.userData.basketId,
            position: item.position.clone(),
            rotation: item.rotation.clone(),
            obb: item.userData.obb,
            data: this.convertProps(item, duplicate),
            type: item.userData.elementType,
            size: item.userData.PROPS.CONFIG.SIZE
        }

        if (duplicate) {
            return JSON.stringify(data)
        }

        return data;
    }

    save(): string {
        const convert = Object.values(this.contant)
            .filter(item => item.userData.elementType !== 'raspil')
            .map(item => this.saveSingle(item))
            .filter(Boolean); // убираем null, если они есть

        return JSON.stringify(convert);
    }

    convertProps(product: THREETypes.TObject, duplicate: boolean) {

        const { PROPS } = product.userData;
        if (duplicate) {
            PROPS.CONFIG.UNIFORM_TEXTURE = {
                group: null,
                level: null,
                index: null,
                column_index: null,
                backupFasadId: null,
                color: null
            }
        }

        const saveData = {
            ...PROPS,
            ARROWS: null,
            BODY: null,
            BODY_DEFAULT: null,
            LEG: [],
            SHELF: [],
            FASADE: [],
            FASADE_DEFAULT: [],
            TABLETOP: {},
            DRAWERS: {},
            JSON_FILLINGS: [],
            PLINTH_MESH: []
        };

        const raspilList = saveData.RASPIL_LIST ?? [];
        const raspilData = saveData.RASPIL?.data;

        if (Array.isArray(raspilList) && raspilList.length && raspilData) {
            for (const elem of raspilList) {
                if (!elem || !elem.sectorId) continue;

                const result = this.findElementsBySectorId(raspilData, elem.sectorId);
                if (!result) continue;

                // Создаём клон, если нужно сохранить чистоту
                result.position = elem.position?.clone?.() ?? null;
                result.rotation = elem.rotation?.clone?.() ?? null;
            }
        }

        if (saveData.CONFIG?.MODULEGRID) {
            let MODULEGRID = Object.assign({}, saveData.CONFIG.MODULEGRID)
            try {
                MODULEGRID = JSON.stringify(MODULEGRID)
            }
            catch (e) {
                saveData.CONFIG.MODULEGRID = saveUMGrid(saveData.CONFIG.MODULEGRID)
            }
        }

        return saveData;
    }

    /** Удаление объекта из сцены */

    remove(id: number) {
        const product = this.contant[id]
        if (product.userData.PROPS.CONFIG.UNIFORM_TEXTURE.group !== null) {
            this.uniformTextureBuilder.removeFromUniformGroup(product)
        }

        delete this.contant[id]
    }

    async update(loadData?: string[]) {
        const curRoomId = this.roomState.getRoomId

        this.contant = {}
        let data = loadData ?? this.roomState.getCurrentRoomData(curRoomId)?.content
        if (!data) return

        let count;

        count = await this.loadData(data as string[])
        const parse = typeof data === 'string' ? JSON.parse(data) : data

        if (count === parse.length) {
            this.roomState.setLoad(true)
            this.eventBus.emit('A:ContantLoaded')
        }

        const uniformGroups: UniformTypes.TUniformGroupMembership[] = toRaw(this.uniformState.getUniformGroupMembership) // Получаем доступ непосредственно к объектам, убирая proxy от VUE
        this.uniformTextureBuilder.clearUniformGroups()
        this.uniformTextureBuilder.loadUniformGroup(uniformGroups)
        this.uniformState.clearUniformGroupMembership();
    }

    async loadSingle(data: any): Promise<number> {

        const model = typeof data === 'string' ? JSON.parse(data) : data;

        let count = 0;
        const point = model.position as THREE.Vector3;
        const rotation = model.rotation as THREE.Euler;
        const loadData = model.data ?? '';
        const size = model.size ?? '';

        if (!this._PRODUCTS[model.id]) {
            console.log(`❌ Товара c ID:${model.id} нет в списке PRODUCTS`)
            return 1
        }
        try {

            /** @Загрузка_модели */

            let builder = loadData.CONFIG?.MODULEGRID ? this.universalGeometryBuilder : this.geometryBuilder;

            const object = await builder!.createModel(
                this.modelState.getModels[model.id] as THREEInterfases.IModelsData,
                loadData,
                size
            );

            /** @Создаём_объект_в_сцене */

            await this.setObject!.create({
                object,
                rotate: rotation,
                point,
            });

            /** @Столешница */

            if (loadData?.RASPIL_LIST?.length > 0) {
                console.log(loadData.RASPIL,object )

                await this.root.tableTopCreator?.create(loadData.RASPIL, object, object.id);
            }

            return 1;
        } catch (error) {
            console.error('Ошибка загрузки модели:', model.id, error);
            return 1; // всё равно считаем обработанным
        }

    }

    async loadData(data: string | string[]): Promise<number> {

        let counts = 0;
        const parse = typeof data === 'string' ? JSON.parse(data) : data;

        const results = await Promise.all(
            parse.map(item => this.loadSingle(item))
        );

        return results.reduce((sum, val) => sum + val, 0);
    }

    async duplicateProd() {
        const curProd = this.root._trafficManager._currentObject
        if (!curProd) return
        try {
            curProd.userData.current = false
        }
        catch (e) {
            console.log('❌ Контекст userData.current потерян')
        }
        const { MOUSE_POSITION } = curProd.userData

        const saved = await this.saveSingle(curProd, true)
        await this.loadSingle(saved)
        this.createTotalObbBounds()
        this.root._trafficManager?.moveManager?.setSelectObj(this.root._trafficManager._currentObject)


        document.addEventListener('mousemove', this.addMouseEvent, false)

        this.eventBus.emit('A:Duplicated')
        this.duplicateSwitch = true


    }

    private bindMouseEvent(event: MouseEvent) {
        this.root._trafficManager?.moveManager?.handleInteractionMove(event.clientX, event.clientY)
    }

    public disableDuplicateProd() {
        document.removeEventListener('mousemove', this.addMouseEvent, false)
        if (this.duplicateSwitch) {
            this.eventBus.emit('U:Duplicated')
            this.duplicateSwitch = false
        }
    }


    addVueEvents() {

        this.boundWallMaterial = (material) => {

            this.updateWallMaterial(material);
        };

        this.boundFloorMaterial = (material) => {

            this.updateFloorMaterial(material);
        };

        this.boundHeightClampValue = (value: number) => {
            this.heightClamp = value
        }

        this.boundDuplicateProd = () => {
            this.duplicateProd()
        }


        this.eventBus.on('A:ChangeWallTexture', this.boundWallMaterial)

        this.eventBus.on('A:ChangeFloorTexture', this.boundFloorMaterial)

        this.eventBus.on('A:Height-clamp', this.boundHeightClampValue)

        this.eventBus.on('A:Duplicate', this.boundDuplicateProd)

    }

    removeVueEvents() {

        if (this.boundSetSize) {
            this.eventBus.off('A:Room-resize', this.boundSetSize);
            this.boundSetSize = null;
        }
        if (this.boundWallMaterial) {
            this.eventBus.off('A:ChangeWallTexture', this.boundWallMaterial);
            this.boundWallMaterial = null;
        }
        if (this.boundFloorMaterial) {
            this.eventBus.off('A:ChangeFloorTexture', this.boundFloorMaterial);
            this.boundFloorMaterial = null;
        }
        if (this.boundHeightClampValue) {
            this.eventBus.off('A:Height-clamp', this.boundHeightClampValue);
            this.heightClamp = useSceneState().getStartHeightClamp;
        }

        this.geometryBuilder = null
        this.setObject = null
        this.geometryBuilder = null
    }


}