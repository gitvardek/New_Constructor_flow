// @ts-nocheck

import * as THREE from 'three'

type TTsargaData = {
    PRODUCT_ID: number
    MATERIAL_ID: number
    WIDTH: number
    POSITION: number  // центр ячейки/строки в координатах сетки (от левого края = 0)
}

type TFillingTsargaParams = {
    shelfPosition: THREE.Vector3
    sizeModule: { width: number; height: number; depth: number }
    tsargaData: TTsargaData
    PROPS: any
    group: THREE.Object3D
    moduleThickness: number
    isSlidingDoors?: number,
    fillingSize: THREE.Vector3
}

export class TsargaBuilder {
    private parent: any

    constructor(parent: any) {
        this.parent = parent
    }

    /**
     * Добавляет царгу для обычного модуля через json.items (CONFIG.TSARGA).
     * Вызывается из applyBodyOverrides до json_builder.createMesh.
     */
    applyModuleTsarga(
        data: any,
        TSARGA: any,
        moduleThickness: number,
        startPos: THREE.Vector3,
        size: { width: number; height: number; depth: number }
    ): void {
        const isMetalTsarga = TSARGA.TYPE === 'metal'

        const backItem = isMetalTsarga
            ? {
                id: 'horizontallineback',
                type: 'object',
                geometry: {
                    type: 'BoxGeometry',
                    opt: { x: size.width - moduleThickness * 2, y: 15, z: 15 },
                },
                rotation: { x: 0, y: 0, z: 0 },
                position: {
                    x: 0,
                    y: startPos.y + size.height - 15 / 2,
                    z: startPos.z + 15 / 2,
                },
            }
            : {
                id: 'horizontallineback',
                type: 'object',
                geometry: {
                    type: 'BoxGeometry',
                    opt: { x: size.width - moduleThickness * 2, y: 30, z: moduleThickness },
                },
                rotation: { x: 0, y: 0, z: 0 },
                position: {
                    x: 0,
                    y: startPos.y + size.height - 15,
                    z: startPos.z + moduleThickness / 2,
                },
            }

        const frontItem = {
            id: 'horizontallinefront',
            type: 'link',
            link: 'horizontallineback',
            rotation: { x: 0, y: 0, z: 0 },
            position: {
                x: 0,
                y: isMetalTsarga
                    ? startPos.y + size.height - 15 / 2
                    : startPos.y + size.height - 15,
                z:
                    startPos.z +
                    size.depth -
                    (isMetalTsarga ? 15 / 2 : moduleThickness / 2),
            },
        }

        data.json.items.push(backItem, frontItem)
        data.json.items = data.json.items.filter((item: any) => item.id !== 'top')
    }

    /**
     * Создаёт 2 BoxGeometry (задний и передний край) под полкой в UM-модуле.
     * Вызывается из buildModulegrid для каждого filling с tsarga-объектом.
     */

    /** TO DO
     * Царги теперь не превязаны к полкам, нужно либо переписать логику  отрисовки, либо корректировать передачу  в филинги  BuildUniversalModule
     */
    createFillingTsarga({
        shelfPosition,
        sizeModule,
        tsargaData,
        PROPS,
        group,
        moduleThickness,
        isSlidingDoors = 0,
        fillingSize
    }: TFillingTsargaParams): void {
        const fillingHeight = fillingSize.y + 1
        const tsargaHeight = 18
        const tsargaWidth = tsargaData.WIDTH

        if (tsargaWidth <= 0) return

        // POSITION хранится в координатах сетки (от левого края = 0),
        // переводим в локальное пространство модуля (центр = 0)
        const tsargaX = -sizeModule.width / 2 + tsargaData.POSITION
        const tsargaY = shelfPosition.y - fillingHeight

        const material = new THREE.MeshPhysicalMaterial({
            color: 0xaaaaaa,
            metalness: 0.9,
            roughness: 0.4,
            clearcoat: 0.3,         // Добавляет защитный блестящий слой
            clearcoatRoughness: 0.1
        })

        const geometry = new THREE.BoxGeometry(tsargaWidth, tsargaHeight, moduleThickness)

        const backZ = -sizeModule.depth / 2 + moduleThickness / 2
        const frontZ = sizeModule.depth / 2 - moduleThickness / 2 - isSlidingDoors

        const backMesh = new THREE.Mesh(geometry, material)
        backMesh.position.set(tsargaX, tsargaY, backZ)
        backMesh.receiveShadow = true
        backMesh.castShadow = true
        backMesh.name = 'tsarga_back'
        backMesh.userData = {
            isTsarga: true,
            PRODUCT_ID: tsargaData.PRODUCT_ID,
            MATERIAL_ID: tsargaData.MATERIAL_ID,
            WIDTH: tsargaData.WIDTH,
        }

        const frontMesh = new THREE.Mesh(geometry, material.clone())
        frontMesh.position.set(tsargaX, tsargaY, frontZ)
        frontMesh.receiveShadow = true
        frontMesh.castShadow = true
        frontMesh.name = 'tsarga_front'
        frontMesh.userData = { ...backMesh.userData }

        const edgeBack = this.parent.edge_builder.createEdge(backMesh);
        const deffEdgeBack = this.parent.edge_builder.createVisibleEdge(backMesh);

        const edgeFront = this.parent.edge_builder.createEdge(frontMesh);
        const deffEdgeFront = this.parent.edge_builder.createVisibleEdge(frontMesh);

        group.add(backMesh, frontMesh, edgeBack, deffEdgeBack, edgeFront, deffEdgeFront)
    }
}
