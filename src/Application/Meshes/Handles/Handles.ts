//@ts-nocheck
import * as THREE from 'three'
import { TResources, TBuildProduct, TModelData, TDeepDispose } from '@/types/types'
import { TFasadeProp } from '@/types/types';
import { useEventBus } from "@/store/appliction/useEventBus";


export type TCreateHandleParams = {
    id: number;
    model: number;
}
enum FileType {
    DAE = 'DAE',
    FBX = 'FBX',
    GLTF = 'GLTF',
    OBJ = 'OBJ',
    STL = 'STL',
    THREE_DS = '3DS',
    UNKNOWN = 'UNKNOWN'
}

type TPositionMap = Record<number, { col: number; row: number; rotation: number }>

export class HandlesBuilder {

    private parent: TBuildProduct
    private resources: TResources
    private dispose: TDeepDispose
    private scene: THREE.Scene
    private eventBus: ReturnType<typeof useEventBus> = useEventBus();
    public clearId = 69920
    private positionMap: TPositionMap = {
        0: { col: -1, row: 1, rotation: Math.PI / 2 },   // лево-верх
        1: { col: 0, row: 1, rotation: 0 },             // центр-верх
        2: { col: 1, row: 1, rotation: -Math.PI / 2 },  // право-верх
        3: { col: -1, row: 0, rotation: Math.PI / 2 },   // лево-центр
        4: { col: 0, row: 0, rotation: 0 },             // центр
        5: { col: 1, row: 0, rotation: -Math.PI / 2 },  // право-центр
        6: { col: -1, row: -1, rotation: Math.PI / 2 },  // лево-низ
        7: { col: 0, row: -1, rotation: 0 },            // центр-низ
        8: { col: 1, row: -1, rotation: -Math.PI / 2 }  // право-низ
    }

    constructor(parent: TBuildProduct) {
        this.parent = parent

        this.scene = parent.root._scene!
        this.resources = parent.root._resources!
        this.dispose = parent.root._deepDispose!
    }

    public async createHandle(params: TCreateHandleParams, fasade: THREE.Object3D, fasadeData: TFasadeProp): Promise<THREE.Object3D | null> {
        const { id, model } = params;


        const startAction = fasadeData.HANDLES.position ?? 4
        const handleData: TModelData = this.parent._MODELS[model]
        const { file, scale } = handleData

        let scaleVector = new THREE.Vector3(scale, scale, scale)

        this.deliteHandle(fasade)

        if (id === this.clearId) return null

        const modelType = this.getFileType(file)

        if (modelType == 'UNKNOWN') return null

        const handleModel: THREE.Object3D = await this.resources.startLoading(file, modelType) as THREE.Object3D;
        const aabb = new THREE.Box3().setFromObject(handleModel);
        handleModel.userData.aabb = aabb

        this.normalizeHandlePivot(handleModel, fasade, modelType, handleData, scaleVector)


        if (!handleModel) return null

        await this.getHandlesPosition(startAction, handleModel, fasade)


        handleModel.name = 'HANDLE'

        if (modelType != 'UNKNOWN') {
            fasade.add(handleModel)
        }

        return handleModel
    }

    public async getHandlesPosition(
        action: number,
        handleMesh: THREE.Object3D,
        fasadeMesh: THREE.Object3D,
    ) {
        const trueSize = fasadeMesh.userData?.trueSize;
        if (!trueSize) {
            console.warn('fasadeMesh.userData.trueSize отсутствует');
            return;
        }
        const { FASADE_WIDTH, FASADE_HEIGHT, FASADE_DEPTH } = trueSize;

        // Получаем размеры ручки (если их нет — вычисляем)
        let handlSize: THREE.Vector3 | undefined = handleMesh.userData?.size;
        if (!handlSize) {
            const tempBox = new THREE.Box3().setFromObject(handleMesh);
            handlSize = new THREE.Vector3();
            tempBox.getSize(handlSize);
            handleMesh.userData = { ...(handleMesh.userData || {}), size: handlSize };
        }

        const W = handlSize.x;
        const H = handlSize.y;
        const offset = 25; // мм

        const cfg = this.positionMap[action];
        if (!cfg) {
            console.warn('Неверный action для ручки:', action);
            return;
        }

        const halfWidth = FASADE_WIDTH / 2;
        const halfHeight = FASADE_HEIGHT / 2;

        // Проекция размеров ручки на оси X/Y после поворота (полная ширина/высота AABB)
        const theta = cfg.rotation;
        const projW = Math.abs(W * Math.cos(theta)) + Math.abs(H * Math.sin(theta));
        const projH = Math.abs(W * Math.sin(theta)) + Math.abs(H * Math.cos(theta));
        const halfExtX = projW / 2;
        const halfExtY = projH / 2;

        // Вычисляем координаты центра ручки с учётом отступа и проекции (чтобы край ручки был не ближе offset)
        let posX = 0;
        if (cfg.col === -1) posX = -halfWidth + offset + halfExtX;
        else if (cfg.col === 1) posX = halfWidth - offset - halfExtX;
        else posX = 0;

        let posY = 0;
        if (cfg.row === 1) posY = halfHeight - offset - halfExtY;
        else if (cfg.row === -1) posY = -halfHeight + offset + halfExtY;
        else posY = 0;

        // Z оставляем как было в normalizeHandlePivot (или пересчитываем аналогично)
        const posZ = (FASADE_DEPTH / 2) + handlSize.z * 0.55;

        // Применяем позицию и поворот
        handleMesh.position.set(posX, posY, posZ);
        handleMesh.rotation.set(0, 0, 0);
        handleMesh.rotateZ(theta);

        // Проверка выхода за границы фасада (AABB по X/Y)
        const outLeft = (posX - halfExtX) < -halfWidth;
        const outRight = (posX + halfExtX) > halfWidth;
        const outBottom = (posY - halfExtY) < -halfHeight;
        const outTop = (posY + halfExtY) > halfHeight;

        if (outLeft || outRight || outTop || outBottom) {
            // подробности для отладки
            console.warn('Ручка выходит за пределы дверцы', {
                action,
                posX, posY,
                halfExtX, halfExtY,
                halfWidth, halfHeight
            });
            alert(`Ручка выходит за пределы дверцы (action=${action}). Проверь размеры ручки или увеличь фасад/сдвинь позицию.`);
        }
    }

    public async deliteHandle(fasade: THREE.Object3D) {
        if (!fasade) return
        fasade.traverse(children => {
            if (children.name === 'HANDLE') {
                this.dispose.clearObject(children, this.scene)
            }
        })
    }

    public restoreDefaultHandleData(fasadeData: TFasadeProp) {
        const handlerPosition = fasadeData.HANDLES.drawer ? 4 : 0
        return {
            id: this.clearId,
            position: handlerPosition,
            drawer: fasadeData.HANDLES.drawer
        }
    }

    private normalizeHandlePivot(handleMesh: THREE.Object3D, fasadeMesh: THREE.Object3D, modelType: string, handleData: TModelData, scaleVector: THREE.Vector3) {
        const { FASADE_DEPTH } = fasadeMesh.userData.trueSize
        const { aabb } = handleMesh.userData
        const center = new THREE.Vector3();
        const size = new THREE.Vector3();
        aabb.getSize(size);
        aabb.getCenter(center);
        handleMesh.position.sub(center);

        const handleMaterial = this.createHandleMaterial(handleData)
        handleMesh.scale.copy(scaleVector);

        handleMesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                if (modelType === 'DAE') {
                    child.scale.copy(scaleVector);
                    if (handleMesh) {
                        child.material = handleMaterial
                        child.material.needsUpdate = true
                    }
                }
                else {
                    child.updateWorldMatrix(true, false);

                    if (child.geometry && child.geometry.isBufferGeometry) {
                        child.geometry.applyMatrix4(child.matrixWorld);
                    }
                    child.matrix.identity();
                    child.position.set(0, 0, 0);
                    child.rotation.set(0, 0, 0);
                    child.scale.set(1, 1, 1);
                }
                child.receiveShadow = true;
                child.castShadow = true;
            }
        });
        const box = new THREE.Box3().setFromObject(handleMesh);
        handleMesh.userData.aabb = box

        const handlSize = new THREE.Vector3()
        box.getSize(handlSize)
        const handleCenter = new THREE.Vector3();
        box.getCenter(handleCenter);
        handleMesh.userData.size = handlSize
        handleMesh.userData.center = handleCenter

        handleMesh.position.z = FASADE_DEPTH * 0.5 + handlSize.z * 0.6
    }

    private createHandleMaterial(model: TModelData) {
        const materialMap: Record<string, Function> = {
            'MeshPhongMaterial': () => new THREE.MeshStandardMaterial({
                color: "#" + model.color,
                roughness: model.shininess || 0,
                // metalness: "#ffffff",
                emissive: "#000000",
            })
        }
        const materialCreator = materialMap[model.material]
        if (materialCreator) {
            return materialCreator();
        }
        return null


    }

    private getFileType(filePath: string): FileType {
        const extension = filePath?.toLowerCase().split('.').pop()?.trim();
        if (!extension) return FileType.UNKNOWN;

        const extensionMap: Record<string, FileType> = {
            'dae': FileType.DAE,
            'fbx': FileType.FBX,
            'gltf': FileType.GLTF,
            'glb': FileType.GLTF,
            'obj': FileType.OBJ,
            'stl': FileType.STL,
            '3ds': FileType.THREE_DS
        };

        return extensionMap[extension] || FileType.UNKNOWN;
    }

}

