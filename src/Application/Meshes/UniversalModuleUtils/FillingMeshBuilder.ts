// @ts-nocheck

// Строит меши наполнения (полки/ящики/профили/царга/боковой профиль) из
// PROPS.CONFIG.SECTIONS, подготовленного ModulegridParser. Знает только про
// наполнение, не про корпус — единственная точка соприкосновения с
// "коробочной" частью сборки — вызов GeometrySubtractor для пропилов под
// профиль, который делается через builder.geometry_subtractor, а не напрямую.

import * as THREE from 'three'
import * as THREETypes from "@/types/types"

export class FillingMeshBuilder {
    private builder: any

    constructor(builder: any) {
        this.builder = builder
    }

    buildModulegrid(PROPS: THREETypes.TObject, group: THREE.Object3D, moduleBody: THREE.Object3D, baseOffset: Number = 0) {

        PROPS.JSON_FILLINGS = []
        const moduleThickness = PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"] || 18
        const noBottom = !!PROPS.CONFIG.MODULEGRID?.noBottom
        const full_horizont_height = (noBottom ? 0 : moduleThickness) + PROPS.CONFIG.EXPRESSIONS['#HORIZONT#']
        const subGeometries = []
        const isSlidingDoors = PROPS.CONFIG.MODULEGRID?.fasades ? 100 : 0

        Object.entries(PROPS.CONFIG.SECTIONS).forEach(([secIndex, section]) => {

            if (section.fillings?.length) {

                section.fillings.map((filling) => {
                    if (filling.type === 'tsarga') {
                        const sizeModule = PROPS.CONFIG.SIZE;
                        const shelfPosition = new THREE.Vector3(0, sizeModule.height / 2 - moduleThickness / 2 + baseOffset, 0);
                        this.builder.tsarga_builder.createFillingTsarga({
                            shelfPosition,
                            sizeModule,
                            tsargaData: filling,
                            PROPS,
                            group,
                            moduleThickness,
                            isSlidingDoors,
                            fillingSize: new THREE.Vector3(section.size.x, moduleThickness, section.size.z)
                        });
                        return;
                    }

                    const productInfo = this.builder._PRODUCTS[filling.product]

                    if (!productInfo)
                        return

                    const onLoad = (productFilling, isModel = true) => {

                        if (filling.isProfile)
                            productFilling.userData.isProfile = true

                        let sizeModule = PROPS.CONFIG.SIZE
                        let start_position = this.builder.getStartPosition(sizeModule)

                        if (isModel) {
                            const box = new THREE.Box3().setFromObject(productFilling);
                            const size = box.getSize(new THREE.Vector3());

                            productFilling.userData.trueSizes = {
                                BODY_WIDTH: size.x,
                                BODY_HEIGHT: size.y,
                                BODY_DEPTH: size.z,
                            }

                            productFilling.scale.x = filling.size.x / productFilling.userData.trueSizes.BODY_WIDTH
                            productFilling.scale.y = filling.size.y / productFilling.userData.trueSizes.BODY_HEIGHT
                            productFilling.scale.z = filling.size.z / productFilling.userData.trueSizes.BODY_DEPTH
                        }
                        else {
                            if (!filling.position.z)
                                filling.position.z = sizeModule.depth - filling.size.z / 2 - (isSlidingDoors / 2 || 0);
                        }

                        /** Проверка на корректировку положения по глубине */
                        const isCorrectZPos = this.builder.correctPosZGroups.includes(filling.productGroupID)
                        //-------------------------------------------------------------------------------------

                        start_position.add(filling.position)
                        start_position.y += filling.size.y / 2 + full_horizont_height + baseOffset

                        if (isCorrectZPos) {
                            // start_position.z = sizeModule.depth / 2 - filling.size.z / 2 - (sizeModule.depth - filling.size.z)
                            start_position.z = sizeModule.depth / 2 - filling.size.z / 2 - this.builder.fillingOffset
                        }


                        productFilling.position.copy(start_position)

                        if (!isModel) {
                            PROPS.JSON_FILLINGS.push(productFilling)
                            const edge = this.builder.edge_builder.createEdge(productFilling);
                            const deffEdge = this.builder.edge_builder.createVisibleEdge(productFilling);
                            const clonePos = productFilling.position.clone()
                            edge.position.set(clonePos.x, clonePos.y, clonePos.z)
                            deffEdge.position.set(clonePos.x, clonePos.y, clonePos.z)
                            group.add(productFilling, edge, deffEdge)


                            if (filling.tsarga) {
                                this.builder.tsarga_builder.createFillingTsarga({
                                    shelfPosition: start_position.clone(),
                                    sizeModule,
                                    tsargaData: filling.tsarga,
                                    PROPS,
                                    group,
                                    moduleThickness,
                                    isSlidingDoors,
                                    fillingSize: filling.size
                                })
                            }
                        }

                        group.add(productFilling)

                        if (filling.isProfile) {

                            let tmp_clone = productFilling.clone()
                            tmp_clone.position.y -= baseOffset
                            subGeometries.push(tmp_clone)
                        }
                    }

                    const filling_size = { width: filling.size.x, height: filling.size.y, depth: filling.size.z }
                    const data = this.builder.createModelData(this.builder._MODELS[productInfo.models[0]], PROPS, filling_size);

                    let productFilling
                    if (data.DAE) {
                        this.builder.models_builder.create({ onLoad, props: { CONFIG: { MODELID: data.ID || data.id, SIZE: filling_size } }, sizeRulers: false, UMFillinig: true })
                    } else {
                        productFilling = this.createSubProductObject(filling, data, PROPS)
                        onLoad(productFilling, false)
                    }
                })
            }

            if (section.tsarga) {
                const sizeModule = PROPS.CONFIG.SIZE;
                const shelfPosition = new THREE.Vector3(0, sizeModule.height / 2 - moduleThickness / 2 + baseOffset, 0);
                this.builder.tsarga_builder.createFillingTsarga({
                    shelfPosition,
                    sizeModule,
                    tsargaData: section.tsarga,
                    PROPS,
                    group,
                    moduleThickness,
                    isSlidingDoors,
                    fillingSize: new THREE.Vector3(section.size.x, moduleThickness, section.size.z)
                });
            }
        })

        if (PROPS.CONFIG['SIDEPROFILE']) {
            const filling = PROPS.CONFIG['SIDEPROFILE']
            const productInfo = this.builder._PRODUCTS[filling.product]

            if (!productInfo)
                return

            const filling_size = { width: filling.size.x, height: filling.size.y, depth: filling.size.z }
            const data = this.builder.createModelData(this.builder._MODELS[productInfo.models[0]], PROPS, filling_size);

            const onLoad = (productFilling, isModel = true) => {

                if (filling.isProfile)
                    productFilling.userData.isProfile = true

                let sizeModule = PROPS.CONFIG.SIZE
                let start_position = this.builder.getStartPosition(sizeModule)

                if (filling.rotation) {
                    productFilling.rotation.x = filling.rotation.x;
                    productFilling.rotation.y = filling.rotation.y;
                    productFilling.rotation.z = filling.rotation.z;
                }

                productFilling.userData.trueSizes = {
                    BODY_WIDTH: filling.size.x,
                    BODY_HEIGHT: filling.size.y,
                    BODY_DEPTH: filling.size.z,
                }

                filling.position.z = sizeModule.depth - filling.size.z / 2;

                start_position.add(filling.position)
                start_position.y += filling.size.x / 2 + baseOffset

                productFilling.position.copy(start_position)

                productFilling.updateMatrix()
                productFilling.updateMatrixWorld()

                const edge = this.builder.edge_builder.createEdge(productFilling);
                const clonePos = productFilling.position.clone()
                edge.position.set(clonePos.x, clonePos.y, clonePos.z)

                group.add(productFilling, edge)

                let tmp_clone = productFilling.clone()
                tmp_clone.position.y -= baseOffset
                subGeometries.push(tmp_clone)
            }

            let productFilling = this.createSubProductObject(filling, data, PROPS)
            onLoad(productFilling, false)
        }

        if (subGeometries.length) {
            this.builder.geometry_subtractor.subtractGeometry(moduleBody, subGeometries)
        }

        return
    }

    createSubProductObject(filling: Object, data: THREETypes.TObject, props: THREETypes.TObject) {

        let textureUrl = filling.isProfile ? this.builder._COLOR[props.CONFIG['PROFILECOLOR']].TEXTURE :
            this.builder._FASADE[filling.color ||
                filling.material ||
                props.CONFIG['MODULE_COLOR']].TEXTURE
        let body = this.builder.json_builder.createMesh({ data, textureUrl })

        body.position.set(eval(data.corr_x), eval(data.corr_y), eval(data.corr_z));

        body.matrixWorldNeedsUpdate = true
        body.name = "BODY"
        body.userData.MATERIAL = data.json?.material.type || null

        const box = new THREE.Box3().setFromObject(body);
        const size = box.getSize(new THREE.Vector3());

        body.userData.trueSizes = {
            BODY_WIDTH: size.x,
            BODY_HEIGHT: size.y,
            BODY_DEPTH: size.z,
        }

        return body
    };
}
