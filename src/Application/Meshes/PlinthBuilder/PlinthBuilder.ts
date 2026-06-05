//@ts-nocheck
import * as THREE from 'three'
import { TJSONBuilder, TBuildProduct, TSize, TDeepDispose, TEdgeBuilder, IProductFull, TModelData, TPlinthActions } from '@/types/types'
import { IProduct } from '@/types/interfases'

type TPlinthData = {
    width: number,
    plinthProd: any,
    plinthModel: any,
    material: THREE.Material,
    startPosition: any,
    key?: string,
    legsHeight: number
}


export class PlinthBuilder {
    private buildProduct: TBuildProduct
    private jsonBuilder: TJSONBuilder
    private edgeBuilder: TEdgeBuilder
    private deepDispose: TDeepDispose
    private scene: THREE.Scene
    private defPlinthHeight: number = 100
    private offset: number = 20
    private positionMap = {
        front: 'width',
        back: 'width',
        left: 'depth',
        right: 'depth',

    }

    constructor(parent: TBuildProduct) {
        this.scene = parent.scene
        this.deepDispose = parent.root._deepDispose!
        this.buildProduct = parent
        this.jsonBuilder = parent.json_builder
        this.edgeBuilder = parent.edge_builder
    }

    private checkHavePLinth(props: IProductFull) {
        const model: number[] | null[] = props.CONFIG.MODELID
        const inProdModel = this.buildProduct._MODELS[model]
        const jsonPlinth = inProdModel.json.plinth

        if (model && inProdModel && jsonPlinth) {
            return jsonPlinth
        }
        return false
    }

    public buildPlinth(props: any, legsHeight: number) {
        // const { PLINTH_MESH } = props
        const plinthParent = new THREE.Object3D()
        const plinthActions = props.CONFIG.PLINTH_ACTIONS
        const sizes: TSize = { ...props.CONFIG.SIZE };

        this.createPlinthMesh(props, plinthActions, sizes, plinthParent, legsHeight)
        props.PLINTH_MESH = (plinthParent)
        return plinthParent

    }

    private createPlinthMesh(props: any, plinthActions: TPlinthActions, size: TSize, plinthParent: THREE.Object3D, legsHeight: number) {

        const product: IProductFull = this.buildProduct._PRODUCTS[props.PRODUCT]
        const { id, plinthSurfase } = this.buildProduct.getDefaultOptionsConfig().plinth


        const material = this.createMaterial(plinthSurfase);
        const defaultPlinth = id ?? Object.values(this.buildProduct._PLINTH)[0]
        const plinthProd = this.buildProduct._PRODUCTS[defaultPlinth];
        const plinthModel = this.buildProduct._MODELS[plinthProd.models[0]];

        const startPosition = this.buildProduct.getStartPosition(size);
        const havePlinth = this.checkHavePLinth(props);
        const plinthConfigs = this.getPlinthConfigs(size);
        let totalPlinthWidth = 0
        let plinthList = []

        if (havePlinth) {

            Object.values(havePlinth).forEach(el => {

                const position = this.buildProduct.getExec(el.position);
                const rotation = this.buildProduct.getExec(el.rotation);
                const plinthWidth = this.buildProduct.calculateFromString(el.width)

                const model = this.createPlinth({ width: plinthWidth, plinthProd, plinthModel, material, startPosition, legsHeight });
                model.position.set(position.x, startPosition.y, position.z);
                model.rotation.set(rotation.x, rotation.y, rotation.z);

                totalPlinthWidth += model.userData.PLINTH_WIDTH

                plinthParent.add(model);
            });

            try {
                plinthActions.front.plinthWidth = totalPlinthWidth
            }
            catch (e) {
                console.error(`Ошибка метода << createPlinthMesh >> ${e}`)
            }

            return;
        }

        Object.entries(plinthActions).forEach(([key, item]) => {
            // if (!item.value) return;

            const config = plinthConfigs[key as keyof typeof plinthConfigs];
            if (!config) return;

            const sizeKey = this.positionMap[key];
            const startSize = size[sizeKey];
            const plinthWidth = startSize - config.widthOffset;

            const model = this.createPlinth({ width: plinthWidth, plinthProd, plinthModel, material, startPosition, key, legsHeight });


            model.position.set(config.posX, startPosition.y, config.posZ);
            model.rotation.set(0, config.rotY, 0);

            model.visible = item.value
            item.plinthWidth = model.userData.PLINTH_WIDTH


            plinthParent.add(model);
        });

        plinthParent.userData.PLINTH_LIST = plinthList
    }

    private createPlinth({
        width,
        plinthProd,
        plinthModel,
        material,
        startPosition,
        key,
        legsHeight
    }: TPlinthData): THREE.Object3D {

        const expressions = {
            "#X#": width,
            "#Y#": legsHeight ?? plinthProd.height,
            "#Z#": plinthProd.depth,
        };

        const convertedData = { ...this.buildProduct.expressionsReplace(plinthModel.json, expressions), material };

        const model = this.jsonBuilder.createMesh({ data: convertedData });
        const edgeBody = this.edgeBuilder.createEdge(model)
        const defEdge = this.edgeBuilder.createVisibleEdge(model)
        model.add(edgeBody, defEdge)
        model.castShadow = true
        model.name = 'PLINTH';
        model.userData.type = key || 'front'
        model.position.setY(startPosition.y);

        const aabb = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        aabb.getSize(size);
        model.userData.PLINTH_WIDTH = size.x

        return model;
    }

    private getPlinthConfigs(size: TSize) {
        const depthHalf = size.depth * 0.5;
        const widthHalf = size.width * 0.5
        const offset = this.offset;

        return {
            front: {
                widthOffset: 0,
                posX: 0,
                posZ: depthHalf - offset * 1.8,
                rotY: 0
            },
            left: {
                widthOffset: offset,
                posX: -widthHalf + offset * 0.5,
                posZ: -offset * 0.5,
                rotY: Math.PI * 0.5
            },
            right: {
                widthOffset: offset,
                posX: widthHalf - offset * 0.5,
                posZ: -offset * 0.5,
                rotY: Math.PI * 0.5
            }
        };
    }

    private createMaterial(plinthSurfase: number) {
        const material = new THREE.MeshStandardMaterial()

        if (plinthSurfase != null) {
            const surface = this.buildProduct._FASADE[plinthSurfase]
            const texture = surface.TEXTURE

            this.buildProduct.resources.startLoading(texture, 'texture', (file) => {
                if (file instanceof THREE.Texture) {
                    file.colorSpace = THREE.SRGBColorSpace;
                    material.map = file;
                    material.map.wrapS = material.map.wrapT = THREE.MirroredRepeatWrapping;
                    material.map.repeat.set(1, 1)
                    material.map.offset.set(0.5, 0.5);
                    material.needsUpdate = true
                }
            })
            return material
        }


        material.color.set("#ffffff");
        material.transparent = true;
        material.opacity = 0.5;
        material.depthWrite = true;
        return material
    }

    public updatePlinth(parent: THREE.Object3D) {
        const { PROPS } = parent.userData
        const { PLINTH_MESH, CONFIG } = PROPS
        const { PLINTH_ACTIONS, SIZE } = CONFIG
        this.deepDispose.clearParent(PLINTH_MESH)
        this.createPlinthMesh(PROPS, PLINTH_ACTIONS, SIZE, PLINTH_MESH)
    }
}