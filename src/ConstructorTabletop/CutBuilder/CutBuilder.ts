//@ts-nocheck
import * as THREE from "three"
import * as THREETypes from "@/types/types"
import { OBB } from 'three/examples/jsm/math/OBB.js';
import { CSG } from 'three-csg-ts';
import * as BufferGeometry from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { DeepDispose } from '@/Application/Utils/DeepDispose';
import { BuildersHelper } from "../../Application/Meshes/BuildersHelper";
import { useMenuStore } from '@/store/appStore/useMenuStore.ts';
import { useModelState } from "@/store/appliction/useModelState";

type TTextureData = {

    src: string,
    width: number,
    height: number,
    size: number

}

class TableTopCreator extends BuildersHelper {
    menuStore: ReturnType<typeof useMenuStore> = useMenuStore()
    modelState: ReturnType<typeof useModelState> = useModelState()

    root: THREETypes.TApplication
    roomManager: THREETypes.TRoomManager
    moveManager: THREETypes.TMoveManager
    dispose: DeepDispose = new DeepDispose()
    quality: number = 32
    boolHeight: number = 100
    ruler: THREETypes.TRuler
    events: THREETypes.TMeshEvents
    edgeBuilder: THREETypes.TEdgeBuilder

    constructor(root: THREETypes.TApplication) {
        super(root)
        this.root = root
        this.roomManager = root._roomManager as THREETypes.TRoomManager
        this.moveManager = root._trafficManager?.moveManager!
        this.ruler = root._ruler!
        this.events = root.meshEvents!
        this.edgeBuilder = root._geometryBuilder?.buildProduct.edge_builder
    }

    public async create(raspil: THREETypes.TObject, object: THREE.Object3D, groupId: number) {


        const meshes: THREE.Object3D[] = []
        // Создаём временную группу
        const group = new THREE.Group();

        this.moveManager.clearSelectVisual()

        let id = null

        if (object.userData.elementType !== 'raspil') {
            object.visible = false
            id = groupId
        }

        if (object.userData.groupId) {


            const parent: THREE.Object3D = this.root._scene?.getObjectByProperty('id', object.userData.groupId)!;


            const { USLUGI, KROMKA } = parent.userData.PROPS.CONFIG
            const { BODY_WIDTH, BODY_HEIGHT } = parent.userData.PROPS.BODY.userData.trueSize


            await this.events.changeModelSize({
                data: { width: BODY_WIDTH, height: BODY_HEIGHT, depth: raspil.canvasHeight }, mesh: parent, type: 'raspil'
            })

            const textureData = this._PRODUCTS[parent.userData.globalData].texture
            let { RASPIL_LIST } = parent.userData.PROPS

            RASPIL_LIST.forEach(mesh => {

                const meshInScene = this.root._scene?.getObjectByProperty('id', mesh.id) as THREE.Object3D
                this.roomManager.remove(meshInScene.id)
                this.dispose.clearObject(meshInScene, this.root._scene!)
            })


            const raspilCount = parent.userData.PROPS.RASPIL_COUNT = RASPIL_LIST.length
            RASPIL_LIST.length = 0

            await this.createGroup(raspil, group, meshes, parent, parent.id, USLUGI, KROMKA)
            this.addToScene({ meshes, group, object: parent, raspilCount, textureData })

            parent.userData.PROPS.RASPIL = meshes[0].userData.PROPS.RASPIL

            return
        }



        let { RASPIL_LIST, CONFIG } = object.userData.PROPS
        const { USLUGI, KROMKA } = CONFIG

        RASPIL_LIST.forEach((mesh: THREE.Mesh) => {
            const meshInScene = this.root._scene?.getObjectByProperty('id', mesh.id) as THREE.Object3D
            if (meshInScene) {
                this.roomManager.remove(meshInScene.id)
                this.dispose.clearObject(meshInScene, this.root._scene!)
            }

        })

        const { BODY_WIDTH, BODY_HEIGHT } = object.userData.PROPS.BODY.userData.trueSize

        await this.events.changeModelSize({
            data: { width: BODY_WIDTH, height: BODY_HEIGHT, depth: raspil.canvasHeight }, mesh: object, type: 'raspil'
        })

        await this.createGroup(raspil, group, meshes, object, id, USLUGI, KROMKA)

        const textureData = this._PRODUCTS[object.userData.globalData].texture

        this.addToScene({ meshes, group, object, textureData })
    }


    private createSections(path, xOffset = 0, yOffset = 0) {
        const shape = new THREE.Shape();


        // let lastPoint = new THREE.Vector2();

        path.forEach(({ action, data }) => {

            switch (action) {
                case "moveTo":
                    shape.moveTo(data[0] + xOffset, data[1] + yOffset);
                    break;
                case "lineTo":
                    shape.lineTo(data[0] + xOffset, data[1] + yOffset);
                    break;
                case "quadraticCurveTo":
                    shape.quadraticCurveTo(
                        data[0] + xOffset, data[1] + yOffset,
                        data[2] + xOffset, data[3] + yOffset
                    );
                    break;
                case "arcTo":
                    // Three.js не поддерживает arcTo напрямую, эмулируем через дуги
                    const [x1, y1, x2, y2, radius] = data;
                    const startAngle = Math.atan2(y1 - shape.currentPoint.y, x1 - shape.currentPoint.x);
                    const endAngle = Math.atan2(y2 - y1, x2 - x1);
                    shape.absarc(
                        x1 + xOffset, y1 + yOffset, radius,
                        startAngle, endAngle, false
                    );
                    break;
                case "closePath":
                    shape.closePath();
                    break;
            }
        });


        return shape;
    }

    async createGroup(raspil: any, group: THREE.Group, meshes: THREE.Object3D[], object: THREE.Object3D, groupId: number | null, uslugi, kromka, color) {
        const prodId = object.userData.PROPS.PRODUCT
        const prodTexture = this.modelState._PRODUCTS[prodId].texture
        let kromkaMaterial = null

        // const material = object.userData.PROPS.BODY.userData.MATERIAL

        const material = new THREE.MeshStandardMaterial()
        const tableTopMaterial = await this.getMaterial({
            material,
            url: prodTexture.src,
            texture_size: {
                width: prodTexture.width,
                height: prodTexture.height
            }
        }
        )

        const material2 = new THREE.MeshStandardMaterial()
        if (kromka) {
            const cromkaData = this.modelState._HEM[kromka]
            await this.getMaterial({
                material: material2,
                url: cromkaData.DETAIL_PICTURE,
                texture_size: {
                    width: 512,
                    height: 512
                }
            })

        }
        else {
            material2.map = tableTopMaterial
            material2.needsUpdate = true;
        }

        raspil.data.forEach((col, colNdx) => {
            col.forEach((row, ndx) => {

                const { path, xOffset, yOffset, disabled } = row;

                const sectorID = `f${(~~(Math.random() * 1e8)).toString(16)}`

                const size = {
                    width: row.width,
                    depth: raspil.modelHeight,
                    height: row.height
                };

                const shape = this.createSections(path, xOffset, yOffset);
                let geometry = new THREE.ExtrudeGeometry(shape, {
                    depth: raspil.modelHeight,
                    bevelEnabled: false,
                    material: 0,
                    extrudeMaterial: 1
                    // bevelThickness: 10, // Толщина фаски
                    // bevelSize: 10, // Размер фаски
                    // bevelSegments: 10
                });

                geometry.computeBoundingBox();
                const boundingBox = geometry.boundingBox;
                const geometryCenter = new THREE.Vector3();
                boundingBox.getCenter(geometryCenter);

                const originalPosition = new THREE.Vector3(row.width * 0.5 + xOffset, 0, row.height * 0.5 + yOffset);

                geometry.translate(-geometryCenter.x, -geometryCenter.y, -geometryCenter.z);
                geometry.rotateX(Math.PI * 0.5);

                let mesh = new THREE.Mesh(geometry, [material, material2]);
                // let mesh = new THREE.Mesh(geometry, material);

                if (!disabled) {
                    const edge = this.edgeBuilder.createEdge(mesh);
                    const defaultEdge = this.edgeBuilder.createVisibleEdge(mesh)
                    mesh.add(defaultEdge)
                    mesh.add(edge)
                }

                mesh.name = 'raspilPart'
                mesh.visible = !disabled
                mesh.userData.DISABLED = disabled

                mesh.position.set(
                    originalPosition.x,
                    originalPosition.y,
                    originalPosition.z
                );

                if (row.holes.length > 0 || 'radius' in row.roundCut) {

                    let boolResult = this.createShape(row, mesh, material, material2)
                    mesh = boolResult
                    mesh.position.set(
                        originalPosition.x,
                        originalPosition.y,
                        originalPosition.z
                    );
                    if ('radius' in row.roundCut) {
                        mesh.updateMatrix()
                        mesh.geometry.center()
                        mesh.position.set(
                            originalPosition.x,
                            originalPosition.y,
                            originalPosition.z
                        );
                    }

                    // mesh.material = material

                }

                row.sectorId = sectorID
                mesh.sectorId = sectorID

                if (row.position) {

                    mesh.userData.position = new THREE.Vector3(row.position.x, row.position.y, row.position.z)
                    mesh.userData.rotation = new THREE.Euler(row.rotation._x, row.rotation._y, row.rotation._z, 'XYZ')

                }
                else {
                    mesh.userData.position = null
                    mesh.userData.rotation = null
                }

                this.createCollisionData(mesh, size, raspil, groupId, row.roundCut, uslugi);
                this.addArrowSize(mesh, row)

                meshes.push(mesh);
                group.add(mesh); // Добавляем в группу

                row.position = null
                row.rotation = null
            });
        });

        this.centeredGroup(group);

        // // Копируем положение и вращение
        group.quaternion.copy(object.quaternion);
        group.position.copy(object.position);

        group.updateMatrixWorld();

    }

    // private _createShape(row, parent, material_1, material_2) {
    //     const { xOffset, yOffset, width, height, holes } = row;

    //     let startGeometry = CSG.fromMesh(parent);
    //     let material = new THREE.MeshPhongMaterial({
    //         color: this.getRandomHexColor(),
    //         side: THREE.DoubleSide,
    //         wireframe: true
    //     });

    //     holes.forEach(hole => {
    //         if (hole) {
    //             let geometry, mesh

    //             switch (hole.type) {
    //                 case 'circle':
    //                     geometry = new THREE.CylinderGeometry(hole.radius * 0.5, hole.radius * 0.5, this.boolHeight, this.quality)
    //                     break
    //                 case 'rect':
    //                     geometry = new THREE.BoxGeometry(hole.width, this.boolHeight, hole.height)
    //                     break
    //             }

    //             mesh = new THREE.Mesh(geometry);
    //             this.holePositioning(mesh, width, height, xOffset, yOffset, hole)
    //             startGeometry = startGeometry.subtract(CSG.fromMesh(mesh));
    //         }
    //     })


    //     if ('radius' in row.roundCut) {

    //         let geometry, mesh;
    //         const { x, y, radius } = row.roundCut

    //         geometry = new THREE.CylinderGeometry(radius * 0.5, radius * 0.5, this.boolHeight, this.quality)
    //         mesh = new THREE.Mesh(geometry, material);
    //         this.holePositioning(mesh, width, height, xOffset, yOffset, { x, y })
    //         startGeometry = startGeometry.intersect(CSG.fromMesh(mesh));
    //     }
    //     // return startBrush
    //     return CSG.toMesh(startGeometry, new THREE.Matrix4())
    // }

    private createShape(row: any, parent: THREE.Mesh, material_1: THREE.Material, material_2: THREE.Material): THREE.Mesh {
        const { xOffset, yOffset, width, height, holes } = row;

        let startGeometry = CSG.fromMesh(parent);
        let material = new THREE.MeshPhongMaterial({
            color: this.getRandomHexColor(),
            side: THREE.DoubleSide,
            wireframe: true
        });

        holes.forEach(hole => {
            if (hole) {
                let geometry, mesh

                switch (hole.type) {
                    case 'circle':
                        geometry = new THREE.CylinderGeometry(hole.radius * 0.5, hole.radius * 0.5, this.boolHeight, this.quality)
                        break
                    case 'rect':
                        geometry = new THREE.BoxGeometry(hole.width, this.boolHeight, hole.height)
                        break
                }
                mesh = new THREE.Mesh(geometry);
                this.holePositioning(mesh, width, height, xOffset, yOffset, hole)
                startGeometry = startGeometry.subtract(CSG.fromMesh(mesh));
            }
        })


        if ('radius' in row.roundCut) {

            let geometry, mesh;
            const { x, y, radius } = row.roundCut

            geometry = new THREE.CylinderGeometry(radius * 0.5, radius * 0.5, this.boolHeight, this.quality)
            mesh = new THREE.Mesh(geometry, material);
            this.holePositioning(mesh, width, height, xOffset, yOffset, { x, y })
            mesh.updateMatrixWorld(true);
            startGeometry = startGeometry.intersect(CSG.fromMesh(mesh));
        }

        const resultMesh = CSG.toMesh(startGeometry, new THREE.Matrix4())

        let preGeometry = resultMesh.geometry as THREE.BufferGeometry;

        preGeometry.computeVertexNormals();
        preGeometry = BufferGeometry.mergeVertices(preGeometry, 0.0001);

        preGeometry.clearGroups();

        const normals = preGeometry.attributes.normal;
        const indices = preGeometry.index;


        if (!indices) {
            //  просто возвращаем с одним материалом
            return new THREE.Mesh(preGeometry, material_1);
        }

        if (normals && indices) {
            let horizontalStart: number | null = null;
            let horizontalCount = 0;

            for (let i = 0; i < indices.count; i += 3) {
                const vertexIndex = indices.array[i];
                const ny = normals.array[vertexIndex * 3 + 1];
                const isHorizontal = Math.abs(ny) < 0.999;

                if (isHorizontal) {
                    if (horizontalStart === null) horizontalStart = i;
                    horizontalCount += 3;
                } else {
                    if (horizontalStart !== null) {
                        preGeometry.addGroup(horizontalStart, horizontalCount, 1); // material_2 — горизонтальные
                        horizontalStart = null;
                        horizontalCount = 0;
                    }
                }
            }
            if (horizontalStart !== null) {
                preGeometry.addGroup(horizontalStart, horizontalCount, 1);
            }
        }

        preGeometry.addGroup(0, indices.count, 0);


        // Создаём новый финальный меш с двумя материалами
        const finalMesh = new THREE.Mesh(preGeometry, [material_1, material_2]);

        // Копируем трансформацию от оригинального parent (позиция, поворот, масштаб)
        finalMesh.position.copy(parent.position);
        finalMesh.rotation.copy(parent.rotation);
        finalMesh.scale.copy(parent.scale);
        finalMesh.updateMatrixWorld();

        return finalMesh;
    }

    private holePositioning(mesh, width, height, xOffset, yOffset, hole) {

        const marginW = hole.width ? hole.width * 0.5 : 0
        const marginH = hole.height ? hole.height * 0.5 : 0

        mesh.position.set(
            ((-width * 0.5 - xOffset) + hole.x + marginW), 0, ((-height * 0.5 - yOffset) + hole.y + marginH)
        );

        mesh.updateMatrix()
        mesh.geometry.applyMatrix4(mesh.matrix);
        //  Сбрасываем трансформации меша
        mesh.position.set(0, 0, 0);
        mesh.rotation.set(0, 0, 0);
        mesh.scale.set(1, 1, 1);
        mesh.matrix.identity();

        // this.root._scene?.add(mesh)
    }

    addToScene({
        meshes,
        group,
        object,
        raspilCount,
        textureData
    }: {
        meshes: THREE.Mesh[] | [],
        group: THREE.Group,
        object: THREE.Object3D,
        raspilCount?: number,
        textureData?: TTextureData
    }) {
        const RASPIL_COUNT = raspilCount ?? object.userData.PROPS.RASPIL_COUNT
        const resultData = []

        meshes.forEach(mesh => {
            const worldPosition = new THREE.Vector3();
            mesh.getWorldPosition(worldPosition);
            // Получаем мировую ориентацию (если нужно сохранить поворот/масштаб)
            const worldQuaternion = new THREE.Quaternion();
            mesh.getWorldQuaternion(worldQuaternion);

            mesh.geometry.computeBoundingBox();
            const boundingBox = mesh.geometry.boundingBox;
            const geometryCenter = new THREE.Vector3();
            boundingBox!.getCenter(geometryCenter); // Центр геометрии в локальных координатах

            const worldGeometryCenter = geometryCenter.clone().applyMatrix4(mesh.matrixWorld);

            this.root._scene?.add(mesh); // Добавляем меш напрямую на сцену
            this.roomManager._roomContant = mesh


            if (mesh.userData.position && mesh.userData.rotation && RASPIL_COUNT === meshes.length) {

                mesh.position.copy(mesh.userData.position);
                mesh.rotation.copy(mesh.userData.rotation);
            } else {

                mesh.position.copy(worldGeometryCenter);
                mesh.quaternion.copy(worldQuaternion);
            }

            mesh.castShadow = true
            mesh.receiveShadow = true
            // mesh.visible = 

            // const params = { material: mesh.material, url: textureData?.src, texture_size: { width: textureData?.width, height: textureData?.height }, rotation: Math.PI * 0.5 }
            // // this.getTexture(params)

            this.root._resources?.startLoading(textureData?.src!, 'texture', (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace
                mesh.material.map = texture
                mesh.material.map.wrapS = mesh.material.map.wrapT = THREE.RepeatWrapping;
                mesh.material.map.repeat.set(
                    1 / textureData!.width,
                    1 / textureData!.height
                );

                mesh.material.map.center.set(0.5, 0.5); // Центр вращения
                mesh.material.map.rotation = Math.PI;
                mesh.material.needsUpdate = true;
            })

            // mesh.material.map.center.set(0.5, 0.5); // Центр вращения
            // mesh.material.map.rotation = Math.PI;
            // mesh.material.needsUpdate = true;

            mesh.userData.aabb = new THREE.Box3().setFromObject(mesh)

            resultData.push({
                id: mesh.id,
                sectorId: mesh.sectorId,
                position: mesh.position,
                rotation: mesh.rotation
            })

        })

        // Удаляем временную группу
        group.children = []
        this.root._scene?.remove(group)


        if (object.children.length > 0) {
            this.dispose.clearParent(object)
        }


        object.userData.PROPS.RASPIL_LIST = resultData
        object.userData.PROPS.RASPIL_COUNT = meshes.length

    }

    private centeredGroup(group: THREE.Group) {
        const box = new THREE.Box3();
        const center = new THREE.Vector3(); // Создаем вектор для центра

        // Расширяем Box3 для всех детей группы
        group.children.forEach((mesh: THREE.Object3D) => {
            box.expandByObject(mesh);
        });

        // Получаем центр Bounding Box
        box.getCenter(center);

        // Смещаем группу так, чтобы её центр совпадал с центром Bounding Box
        group.position.sub(center);

        // Корректируем позиции детей относительно нового центра группы
        group.children.forEach((mesh: THREE.Object3D) => {
            mesh.position.sub(center);
        });

    }

    private getRandomHexColor() {
        return `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`;
    }

    private createCollisionData(mesh: THREE.Object3D, { width, depth, height }: { width: number, depth: number, height: number }, raspil: [], groupId: number | null, roundCut: THREETypes.TObject, uslugi) {
        const data = {
            DEPTH: roundCut.radius ? roundCut.radius * 0.5 : height * 0.5,
            HEIGHT: depth * 0.5,
            WIDTH: roundCut.radius ? roundCut.radius * 0.5 : width * 0.5
        }

        const aabb = new THREE.Box3().setFromObject(mesh);
        const obb = new OBB().fromBox3(aabb);

        mesh.userData.trueSizes = data


        mesh.userData.elementType = 'raspil'

        mesh.userData.PROPS = {
            CONFIG: {
                UNIFORM_TEXTURE: {
                    group: null
                },
                USLUGI: uslugi
            },
            RASPIL: raspil,
            // DISABLED: mesh.visible
        }

        if (groupId != null) {
            mesh.userData.groupId = groupId
            mesh.userData.PROPS.groupId = groupId
        }

        mesh.userData.obb = obb
    }

    public applyMovements(paraent: THREE.Object3D) {
        const { PROPS } = paraent.userData
        const { RASPIL, RASPIL_LIST } = PROPS
        const { data } = RASPIL

        RASPIL_LIST.forEach((elem: THREE.Mesh) => {

            const result = this.findElementsBySectorId(data, elem.sectorId)
            result.position = elem.position.clone()
            result.rotation = elem.rotation.clone()

        })
    }

    /** Создание стрелок размеров модели */

    private addArrowSize(object: THREE.Mesh, row: THREETypes.TObject) {
        const { xOffset, yOffset, width, height, holes } = row;
        const arrows = new THREE.Object3D()
        let ruler = this.ruler.drawRullerObjects(object)



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

        arrows.position.x = (-width * 0.5 - xOffset)
        arrows.position.z = (-height * 0.5 - yOffset)

        arrows.name = "ARROWS"
        object.userData.PROPS.ARROWS = arrows


        object.add(arrows)
    };


}

export { TableTopCreator }
