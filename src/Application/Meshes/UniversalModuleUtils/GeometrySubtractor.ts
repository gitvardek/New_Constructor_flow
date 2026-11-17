// @ts-nocheck

// CSG-вычитание геометрии (например пропилов под боковой профиль) из тела
// модуля. Осмысленно только когда у товара есть собственное сплошное тело
// (стенки/дно/крыша) — специфично для "коробочных" модулей, в отличие от
// ModulegridParser/FillingMeshBuilder/AdjacencyCalculator, которые не знают
// про корпус вовсе.

import * as THREE from 'three'
import * as THREETypes from "@/types/types"
import { CSG } from "three-csg-ts";

export class GeometrySubtractor {
    private builder: any

    constructor(builder: any) {
        this.builder = builder
    }

    subtractGeometry(mainMesh: THREETypes.TObject, subGeometries: Array) {

        let subGeometriesCSG = subGeometries.map((_subGeometry) => {
            const parentGeometry = _subGeometry.clone()

            if (parentGeometry.children[0] && parentGeometry.children[0].geometry) {
                // Клонируем вычитаемый меш
                let childMesh = parentGeometry.children[0].clone()

                const { BODY_WIDTH, BODY_HEIGHT, BODY_DEPTH } = parentGeometry.userData.trueSizes

                let childGeometry = new THREE.BoxGeometry(Math.ceil(BODY_WIDTH), Math.ceil(BODY_HEIGHT), Math.ceil(BODY_DEPTH))
                childGeometry.computeBoundingBox()
                childGeometry.computeBoundingSphere()

                childMesh.geometry = childGeometry
                childMesh.rotation.copy(parentGeometry.rotation)
                childMesh.position.copy(parentGeometry.position)

                childMesh.updateMatrix()
                childMesh.geometry.applyMatrix4(childMesh.matrix)

                childMesh.position.set(0, 0, 0);
                childMesh.rotation.set(0, 0, 0);
                childMesh.scale.set(1, 1, 1);
                childMesh.matrix.identity();

                // Возвращаем BSP-структуру для вычитаемой геометрии
                return CSG.fromMesh(childMesh)
            }
            else {
                // Клонируем вычитаемый меш
                let childMesh = parentGeometry.clone()

                const { BODY_WIDTH, BODY_HEIGHT, BODY_DEPTH } = parentGeometry.userData.trueSizes

                let childGeometry = new THREE.BoxGeometry(Math.ceil(BODY_WIDTH), Math.ceil(BODY_HEIGHT), Math.ceil(BODY_DEPTH))
                childGeometry.computeBoundingBox()
                childGeometry.computeBoundingSphere()

                childMesh.geometry = childGeometry
                childMesh.rotation.copy(parentGeometry.rotation)
                childMesh.position.copy(parentGeometry.position)

                childMesh.updateMatrix()
                childMesh.geometry.applyMatrix4(childMesh.matrix)

                childMesh.position.set(0, 0, 0);
                childMesh.rotation.set(0, 0, 0);
                childMesh.scale.set(1, 1, 1);
                childMesh.matrix.identity();

                // Возвращаем BSP-структуру для вычитаемой геометрии
                return CSG.fromMesh(childMesh)
            }

        })

        mainMesh.children.forEach(child => {
            if (child.geometry) {
                // Клонируем базовую геометрию
                let startMesh = child.clone();
                let startGeometry = startMesh.geometry.clone();
                startGeometry.computeBoundingSphere()

                startMesh.geometry = startGeometry
                startMesh.updateMatrix()
                startMesh.geometry.applyMatrix4(startMesh.matrix)

                startMesh.position.set(0, 0, 0);
                startMesh.rotation.set(0, 0, 0);
                startMesh.scale.set(1, 1, 1);
                startMesh.matrix.identity();

                // Создаём BSP-структуру для базовой геометрии
                let csgStartGeometry = CSG.fromMesh(startMesh);

                subGeometriesCSG.forEach((csgChildGeometry) => {
                    csgStartGeometry = csgStartGeometry.subtract(csgChildGeometry);
                })

                // Преобразуем обратно в геометрию
                let newGeometry = CSG.toGeometry(csgStartGeometry, new THREE.Matrix4());
                let directVector = new THREE.Vector3().subVectors(newGeometry.boundingSphere.center, startGeometry.boundingSphere.center)
                newGeometry.center()

                if (directVector.x !== 0 || directVector.y !== 0 || directVector.z !== 0)
                    newGeometry.translate(directVector.x, directVector.y, directVector.z)

                // Создаём UV-развёртку
                this.builder.planarUV(newGeometry);

                // Освобождаем старую геометрию
                child.geometry.dispose();
                child.geometry = null;

                child.geometry = newGeometry;

                // Очистка памяти
                newGeometry.dispose();
                newGeometry = null;

                startMesh.geometry.dispose();
                startMesh = null;
            }
        })
    }
}
