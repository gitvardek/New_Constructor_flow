import * as THREE from 'three'
import * as THREETypes from "@/types/types"
import { TJSONBuilder, TBuildProduct, TSize, TDeepDispose, TEdgeBuilder } from '@/types/types'
import { IProduct } from '@/types/interfases'



/**
 * Класс для создания и управления столешницей
 */
export class TableTopBuilder {
    private buildProduct: TBuildProduct
    private jsonBuilder: TJSONBuilder
    private edgeBuilder: TEdgeBuilder
    // private root: TApplication
    private deepDispose: TDeepDispose
    private scene: THREE.Scene
    private readonly depthCorrect: number = 30

    constructor(parent: TBuildProduct) {
        // this.root = parent.root
        this.scene = parent.scene
        this.deepDispose = parent.root._deepDispose!
        this.buildProduct = parent
        this.jsonBuilder = parent.json_builder
        this.edgeBuilder = parent.edge_builder
    }

    private createMaterial(tableProduct: IProduct): THREE.Material {
        let material: THREE.MeshStandardMaterial | THREE.MeshPhongMaterial

        if (tableProduct.NAME != "Без столешницы") {
            material = new THREE.MeshStandardMaterial()
            const texture = tableProduct.texture

            this.buildProduct.resources.startLoading(texture.src, 'texture', (file) => {
                if (file instanceof THREE.Texture) {
                    file.colorSpace = THREE.SRGBColorSpace;
                    material.map = file;
                    material.map.wrapS = material.map.wrapT = THREE.RepeatWrapping;
                    material.map.repeat.set(
                        1 / texture.width,
                        1 / texture.height
                    );
                    material.map.offset.set(0.5, 0.5);
                    material.map.rotation = Math.PI * 0.5;
                    material.visible = true
                    material.needsUpdate = true
                }
            })

        } else {
            material = new THREE.MeshPhongMaterial()
            material.color.set("#ffffff");
            material.transparent = true;
            material.opacity = 0;
            material.depthWrite = true;
            material.visible = false
        }

        return material;
    }

    private buildExpressions(
        baseExpr: Record<string, any>,
        sizes: TSize,
        params: IProduct,
        width?: number,
        depth?: number
    ) {
        return {
            ...baseExpr,
            "#MHEIGHT#": params.height,
            "#MODUL_HEIGHT#": params.height,
            "#MODUL_MHEIGHT#": params.height,
            "#MDEPTH#": params.depth,
            "#MODUL_DEPTH#": depth ?? sizes.depth,
            "#MODUL_MDEPTH#": params.depth,
            "#MODUL_MWIDTH#": sizes.width,
            "#MODUL_WIDTH#": width ?? sizes.width,
            "#MWIDTH#": sizes.width,
            "#X#": width ?? sizes.width,
            "#Y#": params.height,
            "#Z#": depth ?? sizes.depth,
        };
    }

    createTableTop({ props, incomeModel = null }
        : {
            props: THREETypes.TObject,
            model_data?: THREETypes.TObject,
            incomeModel?: number | null | string
        }
    ) {
        if (!props.CONFIG.HAVETABLETOP) return;
        const savedTableTopId = props.CONFIG.TABLETOP_ID

        const defTableTopModel = this.buildProduct.getDefaultOptionsConfig().tableTop.id

        const defModel: number | string = incomeModel ?? savedTableTopId ?? defTableTopModel;

        const tableProduct = this.buildProduct._PRODUCTS[defModel];
        const tableModelId = tableProduct.models[0];
        const tableModel = this.buildProduct._MODELS[tableModelId];

        const sizes = { ...props.CONFIG.SIZE, depth: props.CONFIG.SIZE.depth + this.depthCorrect };
        const material = this.createMaterial(tableProduct);

        console.log(sizes, 'sizes')

        const expr = this.buildExpressions(props.CONFIG.EXPRESSIONS, sizes, tableProduct);

        const tableOptions = {
            ...this.buildProduct.expressionsReplace(tableModel.json, expr),
            material
        };

           console.log(tableOptions, 'tableOptions')

        const tableBody = this.jsonBuilder.createMesh({ data: tableOptions, parent_size: sizes, isTopTable: true })

        tableBody.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.userData.name = 'TABLETOP'
                const pos = new THREE.Vector3(this.depthCorrect * 0.5, 0, 0)
                child.geometry.translate(pos)
                child.geometry.computeBoundingBox()
            }
        });

        const edge = this.edgeBuilder.createEdge(tableBody)
        const defEdge = this.edgeBuilder.createVisibleEdge(tableBody)

        if (tableProduct.NAME != "Без столешницы") {
            tableBody.add(edge, defEdge)
        }

        tableBody.name = 'tableTop';
        props.TABLETOP = tableBody;

        return tableBody;
    }

    updateTableTop(parent: THREE.Object3D, data: IProduct) {
        const { PROPS } = parent.userData
        const position = PROPS.TABLETOP.userData.withoutTopHeight

        this.deepDispose.clearObject(PROPS.TABLETOP, this.scene);
        PROPS.TABLETOP = null;
        const newTableTop = this.createTableTop({ props: PROPS, incomeModel: data.ID }) as THREE.Object3D
        const tableHeigt = this.buildProduct.calculateHeight(newTableTop)

        // Корректируем высоту
        newTableTop.userData.withoutTopHeight = position
        newTableTop.position.y = position + tableHeigt * 0.5

        parent.children[0].add(newTableTop)
        PROPS.TABLETOP = newTableTop
        // Сохраняем ID модели столешницы
        PROPS.CONFIG.TABLETOP_ID = data.ID
    }
}
