// @ts-nocheck
import * as THREE from 'three';
import { OBB } from 'three/examples/jsm/math/OBB.js';

export function separateArrows(object: THREE.Object3D, box: THREE.Box3) {
    object.traverse((child) => {
        // Пропускаем ArrowHelper и его дочерние элементы
        if (child instanceof THREE.ArrowHelper || child.type === 'Line' || child.type === 'Cone') {
            return; // Игнорируем ArrowHelper
        }

        // Увеличиваем Bounding Box для всех других объектов
        if (child instanceof THREE.Object3D && child.visible) {
            box.expandByObject(child); // Расширяем Bounding Box объектом
        }
    });
}

export class OBBHelper {

    helper: THREE.Object3D | null = null

    add(obb: OBB, color: string = '#6385ff') {

        const geometry = new THREE.BoxGeometry(obb.halfSize.x * 2, obb.halfSize.y * 2, obb.halfSize.z * 2);
        const material = new THREE.MeshBasicMaterial({ color, wireframe: true });
        this.helper = new THREE.Mesh(geometry, material);
        this.helper.userData.obb = obb

        const matrix4 = new THREE.Matrix4();
        matrix4.setFromMatrix3(obb.rotation); // Fills upper-left 3x3 rotation part of Matrix4

        // Extract quaternion (rotation) from the Matrix4
        const quaternion = new THREE.Quaternion();
        quaternion.setFromRotationMatrix(matrix4);

        // Устанавливаем центр OBB
        this.helper.position.copy(obb.center);

        this.helper.quaternion.copy(quaternion);

        return this.helper;

    }

    update() {
        this.helper!.position.copy(this.helper!.userData.obb.center);
    }

    updateOBB(object) {
        // Инициализация min и max для OBB
        let min = new THREE.Vector3(Infinity, Infinity, Infinity);
        let max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);

        // Обход всех дочерних мешей
        object.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                // Убедитесь, что мировая матрица обновлена
                child.updateMatrixWorld(true);

                // Получение геометрии и преобразование вершин в мировые координаты
                const geometry = child.geometry;
                geometry.computeBoundingBox(); // Убедитесь, что локальный bounding box обновлен
                const vertices = geometry.attributes.position.array;

                for (let i = 0; i < vertices.length; i += 3) {
                    const vertex = new THREE.Vector3(
                        vertices[i],
                        vertices[i + 1],
                        vertices[i + 2]
                    );
                    // Преобразование вершины в мировые координаты
                    vertex.applyMatrix4(child.matrixWorld);

                    // Обновление min и max для OBB
                    min.min(vertex);
                    max.max(vertex);
                }
            }
        });

        // Создание OBB
        const obb = new THREE.Box3(min, max);
        return obb;
    }

}



