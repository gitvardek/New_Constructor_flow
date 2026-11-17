// @ts-nocheck

// Построение мешей петель (навесов) для дверей/фасадов модуля. Специфично
// для "коробочных" товаров с дверными фасадами — открытая система без
// фасадов эту сборку просто не вызывает.

import * as THREE from 'three'
import { LOOPSIDE } from "@/components/UMconstructor/types/UMtypes.ts";

export class LoopBuilder {
    private builder: any

    constructor(builder: any) {
        this.builder = builder
    }

    createLoop(product, PROPS, baseOffset: Number = 0) {
        const parentModel = this.builder._MODELS[product.models[0]];
        // const model = this.builder._MODELS[parentModel.loop_model];
        const model = this.builder._MODELS[parentModel.loop_model].id;

        const loopPosition = this.builder._LOOP_POSITION[parentModel.loop_position];
        let allLoopsMesh = new THREE.Object3D();

        let size = PROPS.CONFIG.SIZE
        let start_position = this.builder.getStartPosition(size)

        const create = (dae, secIndex, doorKey, loopCoord) => {

            let loopGroup = new THREE.Object3D();

            let box = new THREE.Box3().setFromObject(dae);
            let loop_size = new THREE.Vector3();
            box.getSize(loop_size)
            let loop = {};
            loop.width = loop_size.x;
            loop.height = loop_size.y;
            loop.depth = loop_size.z;


            const loopside = loopCoord.side
            const rightSide = LOOPSIDE[loopside] === 'right' || LOOPSIDE[loopside] === 'right_on_partition'
            const top = LOOPSIDE[loopside] === 'top'

            let section = PROPS.CONFIG.SECTIONS[secIndex];

            const leftPosition = section.position.x - section.size.x / 2 + Math.round((loop.width + loopPosition.CORRECTION_X) / 2)
            const rightPosition = section.position.x + section.size.x / 2 - Math.round((loop.width + loopPosition.CORRECTION_X) / 2)

            if (LOOPSIDE[loopside] === 'none')
                return false

            loopCoord.coords.forEach((coord) => {
                let position;
                let loopMesh = new THREE.Object3D();



                let rotation = new THREE.Vector3(
                    Math.PI / 2,
                    rightSide ? Math.PI : 0,
                    0,
                );

                if (top) {
                    position = new THREE.Vector3(
                        coord[1] + loop.width,
                        coord[0] + loop.width * 0.25,
                        rightSide ?
                            PROPS.CONFIG.SIZE.depth + loopPosition.RIGHT_CORRECTION_Z :
                            PROPS.CONFIG.SIZE.depth + loopPosition.CORRECTION_Z,
                    );


                    rotation = new THREE.Vector3(
                        Math.PI * 0.5,
                        Math.PI + Math.PI * 0.5,
                        0,
                    );

                }
                else {
                    position = new THREE.Vector3(
                        rightSide ? rightPosition : leftPosition,
                        coord,
                        rightSide ?
                            PROPS.CONFIG.SIZE.depth + loopPosition.RIGHT_CORRECTION_Z :
                            PROPS.CONFIG.SIZE.depth + loopPosition.CORRECTION_Z,
                    );
                }

                position.z -= loop_size.z / 2

                loopMesh.rotation.set(rotation.x, rotation.y, rotation.z);

                position.add(start_position);
                position.y += baseOffset
                loopMesh.position.copy(position);

                loopMesh.add(dae.clone());
                loopGroup.add(loopMesh);
            })

            return loopGroup
        }

        const onLoad = (loopModel) => {
            Object.entries(PROPS.CONFIG.LOOPS).forEach(([secIndex, section]) => {
                // Добавляет петли
                section.forEach((door, doorKey) => {
                    door.forEach((fasadeLoop, fasadeLoopKey) => {
                        let loopMesh = create(loopModel.clone(), secIndex, fasadeLoopKey, fasadeLoop)
                        // loopMesh.traverse((child) => {
                        //     if (child instanceof THREE.Object3D) {
                        //         const edge = this.builder.edge_builder.createEdge(child);
                        //         const clonePos = child.position.clone()

                        //         edge.position.set(clonePos.x, clonePos.y, clonePos.z)
                        //         edge.rotation.copy(child.rotation)
                        //         child.add(edge)
                        //     }
                        // })

                        if (loopMesh)
                            allLoopsMesh.add(loopMesh)
                    });
                });
            })
        }

        this.builder.models_builder.create({ onLoad, props: { CONFIG: { MODELID: model } }, sizeRulers: false })

        return allLoopsMesh
    };
}
