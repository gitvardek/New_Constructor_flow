//@ts-nocheck

import * as THREE from "three"
import * as THREEInterfases from "@/types/interfases"
import * as THREETypes from "@/types/types"
import { OBB } from 'three/examples/jsm/math/OBB.js';

import { Resources } from "../Utils/Resources";
import { useAppData } from "@/store/appliction/useAppData";
import { useMenuStore } from '@/store/appStore/useMenuStore.ts';

export class WallBuilder {

    resources: Resources
    ruler: THREETypes.TRuler

    private appData: ReturnType<typeof useAppData>
    private menuStore: ReturnType<typeof useMenuStore>
    private floorTextureData: Record<string | number, any>
    private wallTextureData: Record<string | number, any>

    private textureDataMap: Record<string, Record<string | number, any>>

    constructor(root: THREETypes.TApplication) {
        this.resources = root._resources
        this.ruler = root._ruler!
        this.appData = useAppData()
        this.menuStore = useMenuStore()

        this.floorTextureData = this.appData.getAppData.FLOOR
        this.wallTextureData = this.appData.getAppData.WALL

        this.textureDataMap = {
            wall: this.wallTextureData,
            floor: this.floorTextureData,
        }
    }

    createMesh(
        GeometryClass: new (...args: any[]) => THREE.BufferGeometry,
        dimensions: number[],
        position: THREEInterfases.IPosition,
        rotation: THREEInterfases.IRotationEuler,
        side: THREE.Side | number,
        type: string,
        textureId: number | string
    ) {

        const material = this.createMaterial(side, type, textureId, dimensions);
        const geometry = new GeometryClass(...dimensions);
        const mesh = new THREE.Mesh(geometry, material);

        mesh.receiveShadow = true;
        mesh.position.set(position.x as number, position.y as number, position.z as number)
        mesh.rotation.set(rotation._x, rotation._y, rotation._z, rotation._order);

        const tempMesh = mesh.clone()

        tempMesh.updateMatrix()
        tempMesh.geometry.applyMatrix4(mesh.matrix);
        //  Сбрасываем трансформации меша
        tempMesh.position.set(0, 0, 0);
        tempMesh.rotation.set(0, 0, 0);
        tempMesh.scale.set(1, 1, 1);
        tempMesh.matrix.identity();

        this.addArrowSize(mesh, tempMesh)

        geometry.computeBoundingBox();

        mesh.userData.dimensions = dimensions

        mesh.userData.obb = new OBB().fromBox3(
            mesh.geometry.boundingBox as THREE.Box3
        )

        mesh.userData.plane = this.convertPlaneGeometryToPlane(mesh);

        /** Получаем перпендикулярный вектор нормали */

        let normal = mesh.userData.plane.normal.clone().normalize();
        let perpendicular = this.findPerpendicularVector(normal);


        /** Получаем координаты x, z стены */

        let verBuffer = mesh.geometry.getAttribute('position').array
        let vertices = []

        for (let i = 0; i < verBuffer.length; i += 3) {
            const x = verBuffer[i];
            const y = verBuffer[i + 1];
            const z = verBuffer[i + 2];
            vertices.push(new THREE.Vector3(x, y, z));
        }

        let positionVertices: [] = []

        vertices.forEach((item, key) => {

            const vertex = new THREE.Vector3();

            vertex.fromBufferAttribute(mesh.geometry.getAttribute('position'), key);

            mesh.localToWorld(vertex);

            if (vertex.y > 0) return

            positionVertices.push(vertex)

        })

        const vector = new THREE.Vector3().subVectors(positionVertices[0], positionVertices[1]).normalize();
        const center = new THREE.Vector3().addVectors(positionVertices[0], positionVertices[1]).multiplyScalar(0.5);

        mesh.userData.coordinates = positionVertices
        mesh.userData.perpendicular = perpendicular
        mesh.userData.middleVector = vector
        mesh.userData.center = center
        mesh.userData.elementType = 'ROOM'
        mesh.elementType = 'element_room'
        mesh.name = 'wall'

        return mesh;
    }

    createPlaneWall(width: number, height: number, position: THREEInterfases.IPosition, rotation: THREEInterfases.IRotationEuler, side: number, textureId: string | number) {
        let wallmesh = this.createMesh(THREE.PlaneGeometry, [width, height], position, rotation, side, 'wall', textureId);
        return wallmesh;
    }

    /** Создание пола */

    createFloorFromWalls(

        walls: THREEInterfases.IWallData[],
        textureId: number | string) {

        const points: THREE.Vector2[] = [];

        walls.forEach((wall: THREEInterfases.IWallData) => {
            const halfWidth = wall.width / 2;
            const rotation = wall.rotation._y; // Угол поворота стены вокруг оси Y

            // Вычисляем начальные и конечные точки на плоскости y=0
            const startPoint = new THREE.Vector2(
                (wall.position.x as number - Math.cos(rotation) * halfWidth),
                wall.position.z as number - Math.sin(rotation) * -halfWidth
            );

            const endPoint = new THREE.Vector2(
                wall.position.x as number + Math.cos(rotation) * halfWidth,
                wall.position.z as number + Math.sin(rotation) * -halfWidth
            );

            // Добавляем начальную и конечную точки каждой стены в массив
            points.push(startPoint, endPoint);
        });

        // Создаем форму (Shape) для пола на основе вычисленных точек
        const shape = new THREE.Shape();
        shape.moveTo(points[0].x, points[0].y);

        // Добавляем остальные точки
        for (let i = 1; i < points.length; i++) {
            shape.lineTo(points[i].x, points[i].y);
        }

        // Замыкаем контур
        shape.lineTo(points[0].x, points[0].y);

        // Создаем геометрию для пола на основе формы
        const geometry = new THREE.ShapeGeometry(shape);
        const material = this.createMaterial(1, 'floor', textureId);

        // Создаем Mesh для пола
        const floorMesh = new THREE.Mesh(geometry, material);
        floorMesh.receiveShadow = true;

        // Устанавливаем пол на уровень Y = 0 и поворачиваем его
        floorMesh.position.y = 0;
        floorMesh.rotateX(Math.PI * 0.5);

        // Обновляем матрицы
        floorMesh.updateMatrixWorld(true);

        geometry.computeBoundingBox();

        // Вычисляем boundingBox с учетом всех трансформаций
        const boundingBox = new THREE.Box3().setFromObject(floorMesh);

        // Получаем центр и размеры с учетом всех трансформаций
        const center = new THREE.Vector3();
        boundingBox.getCenter(center);

        const size = new THREE.Vector3();
        boundingBox.getSize(size);

        // Создаем OBB на основе вычисленных значений
        const obb = new OBB(center, size.multiplyScalar(0.5));

        obb.applyMatrix4(floorMesh.matrixWorld);

        floorMesh.userData.obb = obb;
        floorMesh.userData.name = 'floor'

        floorMesh.userData.plane = this.convertPlaneGeometryToPlane(floorMesh)
        floorMesh.userData.elementType = 'ROOM'
        floorMesh.elementType = 'element_room'

        return floorMesh;
    }

    private createMaterial(
        side: THREE.Side | number,
        type: string,
        textureId: number | string,
        dimensions?: number[]
    ): THREE.MeshPhysicalMaterial {

        const material = new THREE.MeshPhysicalMaterial({
            metalness: 0.5,
            roughness: 0.5,
            clearcoat: 0,
            clearcoatRoughness: 0.6,
            side: side as THREE.Side,
        });

        if (textureId) {
            this.loadTexture(type, textureId, material, dimensions);
        } else {
            material.color = new THREE.Color(this.defaultColors[type] ?? '#ffffff');
            if (!this.defaultColors[type]) {
                console.warn(`Неизвестный тип материала: ${type}`);
            }
        }

        return material;
    }

    private loadTexture(
        type: string,
        textureId: number | string,
        material: THREE.MeshPhysicalMaterial,
        dimensions?: number[]
    ): void {
        const textureData = this.textureDataMap[type];

        if (!textureData?.[textureId]) {
            console.warn(`Неизвестный тип или id текстуры: ${type} / ${textureId}`);
            return;
        }

        this.resources.startLoading(textureData[textureId].texture, 'texture', (file) => {
            if (!(file instanceof THREE.Texture)) return;

            file.colorSpace = THREE.SRGBColorSpace;
            material.color = new THREE.Color('#ffffff');
            material.map = file;
            material.map.wrapS = material.map.wrapT = THREE.RepeatWrapping;
            material.map.repeat.set(
                dimensions ? dimensions[0] / 1000 : 0.001,
                dimensions ? dimensions[1] / 1000 : 0.001
            );
            material.needsUpdate = true;
        });
    }
    // Обновляем текстуру
    updateTexture(mesh: THREE.Mesh, type: string, textureId: string | number, dimensions: number[]): void {
        const material = mesh.material as THREE.MeshPhysicalMaterial;

        if (!material) {
            console.warn("У объекта нет материала для обновления.");
            return;
        }

        this.loadTexture(type, textureId, material, dimensions);
    }

    // Создаёь PLANE для обработки коллизии

    convertPlaneGeometryToPlane(object: THREE.Object3D): THREE.Plane {
        // Получаем нормаль в локальном пространстве PlaneGeometry (по умолчанию (0, 0, 1))
        const localNormal = new THREE.Vector3(0, 0, 1);

        // Преобразуем нормаль в мировое пространство
        const worldNormal = localNormal.applyQuaternion(object.quaternion).normalize();

        // Позиция объекта в мировом пространстве
        const worldPosition = new THREE.Vector3();
        object.getWorldPosition(worldPosition);

        // Вычисляем `constant` для плоскости (расстояние от начала координат)
        const constant = -worldNormal.dot(worldPosition);

        // Создаем плоскость
        return new THREE.Plane(worldNormal, constant);
    }

    findPerpendicularVector(normal) {
        // Убедимся, что нормаль нормализована
        // Убедимся, что нормаль нормализована
        const normalizedNormal = normal.clone().normalize();

        // Выбираем вспомогательный вектор
        let helper;
        if (Math.abs(normalizedNormal.y) < 0.9) {
            helper = new THREE.Vector3(0, 1, 0); // Используем ось Y, если нормаль не направлена почти вертикально
        } else {
            helper = new THREE.Vector3(1, 0, 0); // В противном случае используем ось X
        }

        // Векторное произведение: результат гарантированно перпендикулярен нормали
        const perpendicular = new THREE.Vector3().crossVectors(normalizedNormal, helper).normalize();

        return perpendicular;
    }

    private addArrowSize(object: THREE.Mesh, tempMesh: THREE.Mesh) {
        const arrows = new THREE.Object3D()
        let ruler = this.ruler.drawRullerObjects(tempMesh)

        ruler.forEach(item => {
            for (let i in item) {
                if (!this.menuStore.getRulerVisibility) {
                    item[i].visible = false
                    item[i].traverse(child => {
                        child.visible = false;
                    });
                }
                arrows.add(item[i])
            }
        })


        arrows.name = "ARROWS"
        // object.userData.PROPS.ARROWS = arrows


        object.add(arrows)
    };

}