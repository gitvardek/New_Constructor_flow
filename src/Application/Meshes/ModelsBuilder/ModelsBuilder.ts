//@ts-nocheck
import * as THREE from "three"
import * as THREETypes from "@/types/types"
import { TBuildProduct } from "@/types/types"

import { Resources } from '../../Utils/Resources'
import { BuildProduct } from '../BuildProduct'
import { OBB } from 'three/examples/jsm/math/OBB.js';

interface CreateParams {
    url?: string;
    onLoad: (object: THREE.Object3D) => void;
    props: THREETypes.TObject;
    sizeRulers?: boolean; // Опциональный параметр, так как есть значение по умолчанию
    UMFillinig?: boolean; // Явное определение модели, как объекта наполнения УМ - им НУЖЕН ПЕРЕДАННЫЙ РАЗМЕР!
}

export class ModelsBuilder {

    parent: TBuildProduct
    resources: Resources
    ruler: THREETypes.TRuler

    constructor(parent: TBuildProduct) {
        this.parent = parent
        this.resources = parent.resources
        this.ruler = parent.ruler

    }

    public create(params: CreateParams) {
        const { url, onLoad, props, sizeRulers = true, UMFillinig = false } = params;


        const arrows = new THREE.Object3D()
        const modelData = this.parent._MODELS[props.CONFIG.MODELID]
        const path = url ?? modelData.file ?? modelData.DAE
        const PROD = this.parent._PRODUCTS[props.PRODUCT]

        console.log(modelData)

        let normolized;

        let model

        if (props.CONFIG.SIZE) {

            const { width, height, depth } = props.CONFIG.SIZE
            model = this.parent.expressionsReplace(modelData, {
                "#X#": width,
                "#Y#": height,
                "#Z#": depth,
            })
        }
        else {
            model = modelData
        }


        return new Promise((resolve, reject) => {

            this.resources.startLoading(path, model.model_type || 'DAE', (file: any) => {

                if (!file) {
                    console.error('Модель не может быть загружена', file)
                }

                const checkResizes = props.CONFIG.SIZE_EDIT ? Object.values(props.CONFIG.SIZE_EDIT).some(value => value !== null) : false

                const editSize = checkResizes || UMFillinig ? props.CONFIG.SIZE : null
                const normolized = this.normalizeUploadedModel(file, model, editSize) as THREE.Object3D;
                const { corr_z, corr_y, corr_x } = modelData
                const correction = {
                    x: corr_x ? parseFloat(corr_x) : 0,
                    y: corr_y ? parseFloat(corr_y) : 0,
                    z: corr_z ? parseFloat(corr_z) : 0
                }

                console.log(correction)

                if (model.model_type.length === 0) {

                    normolized.traverse(child => {
                        if (child instanceof THREE.Mesh) {
                            child.rotation.x = -Math.PI * 0.5;
                        }
                    })
                }

                normolized.name = 'MODEL'
                if (PROD) {
                    normolized.userData.disableRaycast = PROD.disable_raycast == 1
                }

                const aabb = new THREE.Box3().setFromObject(normolized);
                const center = new THREE.Vector3();
                aabb.getCenter(center);
                let size = aabb.getSize(center)

                normolized.userData.PROPS = props

                let obb = new OBB();
                obb = obb.fromBox3(aabb);

                normolized.userData.obb = obb
                normolized.userData.aabb = aabb

                normolized.userData.trueSizes = {
                    DEPTH: size.z * 0.5 + correction.z * 2, HEIGHT: size.y * 0.5 + correction.y * 2, WIDTH: size.x * 0.5 + correction.x * 2
                }

                // if (model.model_type.length == 0 && props.CONFIG.SIZE) {
                if (editSize) {
                    normolized.userData.trueSizes = {
                        DEPTH: props.CONFIG.SIZE.depth * 0.5, HEIGHT: props.CONFIG.SIZE.height * 0.5, WIDTH: props.CONFIG.SIZE.width * 0.5
                    }
                }

                const edge = this.parent.edge_builder.createEdge(normolized)
                normolized.add(edge)

                if (onLoad) {
                    onLoad(normolized)
                }
                else {
                    resolve(normolized)
                }

            })

        })
    }

    private normalizeUploadedModel = function (model, params, size) {
        const center = new THREE.Vector3()
        const box = this.calculateUnionBoundingBox(model);
        box.getCenter(center)
        const translateVector = new THREE.Vector3()

        const calculateTranslateVector = () => {
            translateVector.x = center.x !== 0 ? -center.x : 0
            translateVector.y = center.y !== 0 ? -center.y : 0
            translateVector.z = center.z !== 0 ? -center.z : 0
        }

        const translateGeometry = (mesh) => {
            if (mesh.geometry) {
                mesh.geometry.translate(translateVector.x, translateVector.y, translateVector.z);
                mesh.geometry.computeVertexNormals();
            }
            for (let child of mesh.children) {
                translateGeometry(child);
            }
        }

        calculateTranslateVector()
        translateGeometry(model);

        model.unionBoundingBox = this.calculateUnionBoundingBox(model);
        model.updateMatrixWorld(true)

        box.setFromObject(model);
        box.getCenter(center)

        if (params.width || params.height || params.depth)
            this.changeModelScale(model, new THREE.Vector3(
                params.width || params.scale || 1,
                params.height || params.scale || 1,
                params.depth || params.scale || 1))
        else if (size) {
            this.changeModelScale(model, new THREE.Vector3(
                size.width || params.scale || 1,
                size.height || params.scale || 1,
                size.depth || params.scale || 1))
        }
        else
            model.scale.x = model.scale.y = model.scale.z = params.scale;
        return model;
    }

    private changeModelScale = (model, scale_vector = new THREE.Vector3(1, 1, 1)) => {
        const scaleVector = new THREE.Vector3()
        const box = model.unionBoundingBox
        scaleVector.subVectors(box.max, box.min)
        scaleVector.x = scale_vector.x / Math.abs(scaleVector.x)
        scaleVector.y = scale_vector.y / Math.abs(scaleVector.y)
        scaleVector.z = scale_vector.z / Math.abs(scaleVector.z)

        const scaleGeometry = (mesh) => {
            if (mesh.geometry) {
                mesh.geometry.scale(scaleVector.x, scaleVector.y, scaleVector.z)
            }
            for (let child of mesh.children)
                scaleGeometry(child)
        }

        scaleGeometry(model)

        model.unionBoundingBox = this.calculateUnionBoundingBox(model);
        model.updateMatrixWorld(true)
    }


    private calculateUnionBoundingBox = (group) => {
        let boundingBox = new THREE.Box3();
        if (group.geometry) {
            group.geometry.computeBoundingBox();
            boundingBox = group.geometry.boundingBox.clone();
            if (boundingBox?.min?.length() === Infinity || boundingBox?.max?.length() === Infinity) {
                return null;
            }
        }

        for (let child of group.children) {
            let childBoundingBox = this.calculateUnionBoundingBox(child)
            if (childBoundingBox)
                boundingBox.union(childBoundingBox);
        }

        if (!group.geometry)
            group.unionBoudingBox = boundingBox

        return boundingBox;
    }


    /** ============ */

    public async refillModelFromSource(
        targetGroup: THREE.Object3D,
        newSizes: { width: number; height: number; depth: number },
    ): Promise<void> {
        if (!targetGroup?.userData?.PROPS) {
            console.warn('refillModelFromSource: no PROPS in userData');
            return;
        }

        const props = { ...targetGroup.userData.PROPS } as THREETypes.TObject;
        const oldPosition = targetGroup.position.clone();
        const oldRotation = targetGroup.rotation.clone();
        const oldScale = targetGroup.scale.clone();

        // 1. Обновляем размеры в props (важно для expressionsReplace)
        if (!props.CONFIG.SIZE) props.CONFIG.SIZE = { width: 0, height: 0, depth: 0 };

        props.CONFIG.SIZE.width = newSizes.width;
        props.CONFIG.SIZE.height = newSizes.height;
        props.CONFIG.SIZE.depth = newSizes.depth;

        // 2. Очищаем содержимое targetGroup
        while (targetGroup.children.length > 0) {
            const child = targetGroup.children[0];
            targetGroup.remove(child);
            child.traverse((obj: any) => {
                obj.geometry?.dispose();
                if (Array.isArray(obj.material)) obj.material.forEach((m: any) => m.dispose());
                else obj.material?.dispose();
            });
        }

        // 3. Создаём временную модель с новыми размерами
        const tempModel = await this.create({
            props,
            sizeRulers: false
        }) as THREE.Object3D;

        // 4. Копируем ВСЕХ детей из tempModel → в targetGroup
        while (tempModel.children.length > 0) {
            const child = tempModel.children[0];
            tempModel.remove(child);     // отсоединяем от временной
            targetGroup.add(child);      // прикрепляем к основной
        }


        // 5. Восстанавливаем позицию/поворот (на случай, если create() их сбросил)
        targetGroup.position.copy(oldPosition);
        targetGroup.rotation.copy(oldRotation);
        targetGroup.scale.copy(oldScale);

        // 6. Пересчитываем всё, что зависит от геометрии
        const aabb = new THREE.Box3().setFromObject(targetGroup);
        const center = new THREE.Vector3();
        aabb.getCenter(center);
        const sizeVec = aabb.getSize(new THREE.Vector3());

        targetGroup.userData.trueSizes = {
            WIDTH: newSizes.width * 0.5,
            HEIGHT: newSizes.height * 0.5,
            DEPTH: newSizes.depth * 0.5,
        };

        // // OBB и AABB
        targetGroup.userData.aabb = aabb;
        const obb = new OBB().fromBox3(aabb);
        targetGroup.userData.obb = obb;

        targetGroup.updateMatrixWorld(true);
    }
}

