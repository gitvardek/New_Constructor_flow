// @ts-nocheck
import * as THREE from 'three';
import { OBB } from 'three/examples/jsm/math/OBB.js';
import { TAdjustPosition } from "@/types/types"

/**
 * OBBCollider
 * 
 * Класс для обнаружения и разрешения коллизий между OBB (Oriented Bounding Box).
 */


export class OBBCollider {
    private defaultMagnetTrashhold = 50
    private readonly defaultSteps = 30

    getCorrectPosition({ object,
        targetPosition,
        wall,
        targetRotation,
        snapHeight,
        heightClamp,
        wallStore,
        boundsStore,
        objectsBoundsStore
    }: {
        object: THREE.Object3D,
        targetPosition: THREE.Vector3,
        targetRotation?: THREE.Euler,
        wall: THREE.Object3D,
        snapHeight?: number,
        heightClamp: number

        wallStore: THREE.Object3D[],
        boundsStore: THREE.Box3,
        objectsBoundsStore: OBB[],
    }): TAdjustPosition {

        const objectBox = object.userData.obb
        const { DEPTH, HEIGHT, WIDTH } = object.userData.trueSizes
        const heightMagnetThreshold = HEIGHT < this.defaultMagnetTrashhold ? this.defaultMagnetTrashhold : HEIGHT;

        const position = this.snapToHeight(
            targetPosition,
            objectBox,
            heightClamp,
            heightMagnetThreshold);

        const objectPos = this.roomInterseck({ object, wall, position, targetRotation, wallStore, boundsStore })

        const objectsInterseck = this.objectsInterseck({ object, objectPos, objectsBoundsStore })

        return {
            position: objectsInterseck.position,
            rotation: objectsInterseck.rotation,
            quaternion: object.quaternion
        }

    }


    private roomInterseck({ object, wall, position, targetRotation, wallStore, boundsStore }:
        {
            object: THREE.Object3D;
            wall: THREE.Object3D;
            position: THREE.Vector3,
            targetRotation?: THREE.Euler,
            wallStore: THREE.Object3D[],
            boundsStore: THREE.Box3
        }
    ): { position: THREE.Vector3; rotation: THREE.Euler } {

        let adjustPosition = position.clone()

        const rotation = object.userData.PROPS.CONFIG.ROTATION ?? new THREE.Euler(0, 0, 0, 'XYZ');
        const { DEPTH, HEIGHT, WIDTH } = object.userData.trueSizes
        const roomBound = boundsStore;

        const obb = object.userData.obb;

        /** Для загрузки контента из стора при запуске приложения */

        if (!wall) {

            for (const wall of wallStore) {

                const wallOBB = wall.userData.obb;

                if (obb.intersectsOBB(wallOBB)) {

                    let correctData = this.getClampedPosition({ position: adjustPosition, rotation, wall: wall, object, obb })
                    adjustPosition = correctData.correctPosition
                    rotation.copy(correctData.correctRotation)
                    break;
                }

            }
        }
        /** Для работы после запуска приложения */
        else {

            switch (wall.userData.name) {
                case "floor":
                    this.getClampedFloorPosition(obb, wallStore, position, adjustPosition)
                    break
                default:

                    let correctData = this.getClampedPosition({ position: adjustPosition, rotation, wall, object, obb })

                    adjustPosition = correctData.correctPosition
                    rotation.copy(correctData.correctRotation)

                    break
            }
        }


        /** Проверка на положение объекта только на полу */

        adjustPosition.y = object.userData.elementType == "element_down" ? HEIGHT - 0.001 : Math.max(
            (HEIGHT - 0.001),
            Math.min(position.y, roomBound.max.y - (HEIGHT - 0.001))
        );

        // adjustPosition.y = Math.max((HEIGHT - 0.001), Math.min(position.y, roomBound.max.y - (HEIGHT - 0.001)))

        // Обновляем конфигурацию объекта
        object.userData.PROPS.CONFIG = { ...object.userData.PROPS.CONFIG, ROTATION: rotation, POSITION: adjustPosition };
        object.userData.currentWall = wall
        object.userData.obb = obb

        return { position: adjustPosition, rotation };
    }

    private getClampedPosition({ position, rotation, wall, object, obb, floor }: { position: THREE.Vector3, rotation: THREE.Euler, wall: THREE.Object3D, object: THREE.Object3D, obb: OBB, floor?: boolean }) {

        let correctPosition = position.clone()
        const correctRotation = rotation.clone()
        const wallCoordinates = wall.userData.coordinates


        const { PROPS } = object.userData
        const { CONFIG, TABLETOP, BODY } = PROPS
        const { POSITION, ROTATION } = CONFIG
        const { DEPTH, HEIGHT, WIDTH } = object.userData.trueSizes

        let BODY_WIDTH, BODY_DEPTH

        if (BODY instanceof THREE.Object3D) {
            BODY_WIDTH = BODY.userData.trueSize.BODY_WIDTH * 0.5
            BODY_DEPTH = BODY.userData.trueSize.BODY_DEPTH * 0.5
        }

        const correctSize = BODY_DEPTH ?? DEPTH;
        const currentWidth = BODY_WIDTH ?? WIDTH


        if (!wallCoordinates) {


            let correct = ROTATION.clone()
            correct.y += Math.PI / 2;

            return {
                correctPosition: POSITION,
                correctRotation: ROTATION,
            }
        }

        const wallNormal = wall.userData.plane.normal.clone().normalize();
        const distanceToPlane = wall.userData.plane.distanceToPoint(correctPosition);

        const side = this.getFacingSideFromOBB(object, wall, obb);

        let trueExtremePoint = this.findClosestPoint(position, wallCoordinates[0], wallCoordinates[1]).clone()
        // let trueCenterPoint = this.findClosestPoint(obb.center, wallCoordinates[0], wallCoordinates[1]).clone()

        const vectorToCenter = new THREE.Vector3().subVectors(wall.userData.center, trueExtremePoint).normalize();
        // const vectorFromCenter = new THREE.Vector3().subVectors(obb.center, trueExtremePoint).normalize();

        trueExtremePoint.y = position.y
        // trueCenterPoint.y = position.y

        const distanceToExtrene = trueExtremePoint.distanceTo(position)
        // const distanceFromExtrene = trueCenterPoint.distanceTo(obb.center)

        // const extrem = Math.pow(distanceFromExtrene, 2) < Math.pow(obb.halfSize.x, 2) + Math.pow(obb.halfSize.z, 2)

        if (distanceToExtrene === 0) {
            return {
                correctPosition: POSITION,
                correctRotation: ROTATION,
            }
        }

        if (distanceToExtrene <= currentWidth) {
            let correction
            if (!floor) {
                correction = vectorToCenter.clone().multiplyScalar(currentWidth - distanceToExtrene);
                correctPosition.add(correction);
            }
        }

        if (distanceToPlane <= correctSize) {
            let correction = wallNormal.clone().multiplyScalar(correctSize - distanceToPlane - 0.5);
            correctPosition.add(correction);
        }


        if (wall.userData.name != "floor") {
            !wall.rotation.equals(correctRotation) ? correctRotation.copy(wall.rotation) : ''
        }

        return {
            correctPosition,
            correctRotation
        }
    }

    /** @Простое решение */
    // private getClampedFloorPosition(movingObb: OBB,
    //     walls: THREE.Object3D[],
    //     newPosition: THREE.Vector3,
    //     oldPosition: THREE.Vector3,
    //     adjustPosition: THREE.Vector3,

    // ) {
    //     const offset = new THREE.Vector3().subVectors(newPosition, oldPosition);

    //     // Клонируем и сдвигаем OBB
    //     const movedObb = movingObb.clone();
    //     movedObb.center.add(offset);

    //     for (const wall of walls) {
    //         if (wall.userData.name === 'floor') continue;

    //         const wallObb = wall.userData.obb as OBB;
    //         if (movedObb.intersectsOBB(wallObb)) {

    //             // Столкновение — возвращаем старую позицию
    //             adjustPosition.copy(oldPosition.clone());
    //             return
    //         }
    //     }

    //     adjustPosition.copy(newPosition.clone())
    // }

    private getClampedFloorPosition(
        movingObb: OBB,
        walls: THREE.Object3D[],
        attemptedPosition: THREE.Vector3,
        adjustPosition: THREE.Vector3,
    ) {
        const correctedObb = movingObb.clone();
        correctedObb.center.copy(attemptedPosition);

        const EPSILON = 1e-4;

        for (let i = 0; i < 5; i++) { // максимум 5 итераций
            let anyCorrection = false;

            for (const wall of walls) {
                if (wall.userData.name === 'floor') continue;
                const wallObb = wall.userData.obb as OBB;
                const normal = wall.userData.plane?.normal;
                if (!normal) continue;

                if (!correctedObb.intersectsOBB(wallObb)) continue;

                const pushDir = normal.clone().negate().normalize();

                const localDir = pushDir.clone().applyMatrix3(correctedObb.rotation.clone().transpose());
                const absLocalDir = new THREE.Vector3(
                    Math.abs(localDir.x), Math.abs(localDir.y), Math.abs(localDir.z)
                );
                const distanceToSurface = correctedObb.halfSize.dot(absLocalDir);
                const distanceToPlane = wall.userData.plane.distanceToPoint(correctedObb.center);

                if (distanceToPlane < distanceToSurface - EPSILON) {
                    const correction = normal.clone().multiplyScalar(distanceToSurface - distanceToPlane);
                    correctedObb.center.add(correction);         // сразу применяем
                    adjustPosition.add(correction);              // сохраняем общее смещение
                    anyCorrection = true;
                    break; // пересчитаем после сдвига
                }
            }

            if (!anyCorrection) break;
        }
    }

    private getFacingSideFromOBB(object: THREE.Object3D, wall: THREE.Mesh, obb: OBB): string {

        // Нормаль стены
        const wallNormal = wall.userData.plane.normal.clone().normalize();

        // Направления сторон OBB
        const sides: { [key: string]: number } = {
            forward: new THREE.Vector3(0, 0, 1).applyMatrix4(object.matrixWorld).dot(wallNormal),
            backward: new THREE.Vector3(0, 0, -1).applyMatrix4(object.matrixWorld).dot(wallNormal),
            left: new THREE.Vector3(-1, 0, 0).applyMatrix4(object.matrixWorld).dot(wallNormal),
            right: new THREE.Vector3(1, 0, 0).applyMatrix4(object.matrixWorld).dot(wallNormal),
            up: new THREE.Vector3(0, 1, 0).applyMatrix4(object.matrixWorld).dot(wallNormal),
            down: new THREE.Vector3(0, -1, 0).applyMatrix4(object.matrixWorld).dot(wallNormal),
        }

        // Определяем сторону с максимальным скалярным произведением (по модулю)

        const closestSide = Object.keys(sides).reduce((a, b) => {
            return Math.abs(sides[a]) > Math.abs(sides[b]) ? a : b;
        });

        return closestSide;
    }

    private snapToHeight(
        position: THREE.Vector3,
        objectBox: THREE.Box3,
        snapHeight: number,
        threshold: number,
    ): THREE.Vector3 {

        const adjustedPosition = new THREE.Vector3(position.x, position.y, position.z)

        // Получаем размеры объекта
        const size = objectBox.halfSize.y;
        const checkSize = objectBox.halfSize.y < this.defaultMagnetTrashhold ? this.defaultMagnetTrashhold : objectBox.halfSize.y

        const objectTop = objectBox.center.y + checkSize;
        const objectBottom = objectBox.center.y - checkSize;

        /** Ограничиваем отслеживание пересечения со стенами */

        if (position.y >= snapHeight - threshold && position.y <= snapHeight + threshold) {

            // Примагничивание верхней части объекта
            if (Math.abs(objectTop - snapHeight) <= threshold) {
                adjustedPosition.y = snapHeight - size;
            }
            // Примагничивание нижней части объекта
            if (Math.abs(objectBottom - snapHeight) <= threshold) {
                adjustedPosition.y = snapHeight + size;
            }
        }

        return adjustedPosition;
    }

    private findClosestPoint(middlePoint, point1, point2) {
        // Вычисляем расстояния
        const distanceToPoint1 = middlePoint.distanceTo(point1);
        const distanceToPoint2 = middlePoint.distanceTo(point2);

        // Сравниваем расстояния
        if (distanceToPoint1 < distanceToPoint2) {
            return point1; // Ближе к первой точке
        } else {
            return point2; // Ближе ко второй точке
        }
    }

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────
    /** @Методы_отслеживания_пересечения_с_объектами */
    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────
    /** @Простое */
    // objectsInterseck({ object, objectPos }: { object: THREE.Object3D }) {


    //     const tempBox3 = object.userData.aabb.clone();
    //     // const delta = position.clone().sub(object.position).multiplyScalar(0.99);
    //     const delta = objectPos.position.clone().sub(object.position)
    //     tempBox3.translate(delta)
    //     const center = new THREE.Vector3()
    //     tempBox3.getCenter(center)

    //     const prodOBB = object.userData.obb.clone()
    //     prodOBB.center.copy(center)
    //     prodOBB.rotation.setFromMatrix4(object.matrixWorld);

    //     const prepareData = {
    //         position: objectPos.position.clone(),
    //         rotation: objectPos.rotation.clone(),
    //     }

    //     for (let product in this._totalObbBounds) {
    //         let single = this._totalObbBounds[product]

    //         if (prodOBB.intersectsOBB(single)) {
    //             const direction = center.clone().sub(object.position).normalize().multiplyScalar(-1);
    //             // prepareData.position = object.position.clone().add(direction.multiplyScalar(0.001));
    //             prepareData.position = object.position.clone()
    //         }

    //     }

    //     return prepareData
    // }
    /** @Без_скольжения */
    // objectsInterseck({
    //     object,
    //     objectPos,
    //     objectsBoundsStore
    // }: {
    //     object: THREE.Object3D,
    //     objectPos: { position: THREE.Vector3, rotation: THREE.Euler },
    //     objectsBoundsStore: OBB[]
    // }) {
    //     const aabb = object.userData.aabb.clone();
    //     const obb = object.userData.obb.clone();
    //     const matrixWorld = object.matrixWorld.clone();

    //     const direction = objectPos.position.clone().sub(object.position);
    //     const steps = 20;

    //     let finalSafePosition = object.position.clone(); // стартовая позиция

    //     let lastTestWasCollision = false;

    //     for (let i = 1; i <= steps; i++) {
    //         const t = i / steps;
    //         const testPosition = object.position.clone().add(direction.clone().multiplyScalar(t));

    //         const offset = testPosition.clone().sub(object.position);
    //         const testBox = aabb.clone().translate(offset);

    //         const center = new THREE.Vector3();
    //         testBox.getCenter(center);

    //         const testOBB = obb.clone();
    //         testOBB.center.copy(center);
    //         if (testOBB.center.y < 0) testOBB.center.y = 0
    //         testOBB.rotation.setFromMatrix4(matrixWorld);

    //         let hasCollision = false;
    //         for (const bound of objectsBoundsStore) {

    //             if (testOBB.intersectsOBB(bound)) {

    //                 hasCollision = true;
    //                 break;
    //             }
    //         }

    //         if (hasCollision) {
    //             lastTestWasCollision = true;
    //             break;
    //         } else {
    //             finalSafePosition.copy(testPosition);
    //         }
    //     }

    //     // После цикла дополнительно проверим — может финальная позиция безопасна?
    //     if (lastTestWasCollision) {
    //         const finalOffset = objectPos.position.clone().sub(object.position);
    //         const finalBox = aabb.clone().translate(finalOffset);

    //         const finalCenter = new THREE.Vector3();
    //         finalBox.getCenter(finalCenter);

    //         const finalOBB = obb.clone();
    //         finalOBB.center.copy(finalCenter);
    //         finalOBB.rotation.setFromMatrix4(matrixWorld);

    //         let isFinalClear = true;
    //         for (const bound of objectsBoundsStore) {
    //             if (finalOBB.intersectsOBB(bound)) {
    //                 isFinalClear = false;
    //                 break;
    //             }
    //         }

    //         if (isFinalClear) {
    //             finalSafePosition.copy(objectPos.position); // можно использовать конечную!
    //         }
    //     }

    //     return {
    //         position: finalSafePosition,
    //         rotation: objectPos.rotation.clone()
    //     };
    // }
    /** @С_скольжением */
    objectsInterseck({
        object,
        objectPos,
        objectsBoundsStore
    }: {
        object: THREE.Object3D,
        objectPos: { position: THREE.Vector3, rotation: THREE.Euler },
        objectsBoundsStore: OBB[]
    }) {

        const aabb = object.userData.aabb.clone();
        const obb = object.userData.obb.clone();
        const matrixWorld = object.matrixWorld.clone();

        const fromPos = object.position.clone();          // старт
        const toPos = objectPos.position.clone();       // цель
        const moveDir = toPos.clone().sub(fromPos);       // вектор перемещения

        const steps = 20;                                 // дискретизация
        let finalSafePosition = fromPos.clone();          // последняя безопасная
        let lastSafeY = fromPos.y;                // последняя безопасная Y

        let collided = false;                           // факт столкновения на трассе
        let collidedOBB: OBB | null = null;
        const defCollided = object.userData.disableRaycast         // с кем столкнулись

        //  1. Пошаговый прогон

        for (let i = 1; i <= this.defaultSteps; i++) {
            const t = i / this.defaultSteps;
            const testPos = fromPos.clone().add(moveDir.clone().multiplyScalar(t));

            // переносим AABB в тестовую точку
            const offset = testPos.clone().sub(fromPos);
            const testBox = aabb.clone().translate(offset);

            // строим OBB для проверки
            const center = new THREE.Vector3();
            testBox.getCenter(center);

            const testOBB = obb.clone();
            testOBB.center.copy(center);
            if (testOBB.center.y < 0) testOBB.center.y = 0;
            testOBB.rotation.setFromMatrix4(matrixWorld);

            // проверяем пересечения
            let hasCollision = false;
            for (const bound of objectsBoundsStore) {
                if (testOBB.intersectsOBB(bound) && !defCollided) {
                    hasCollision = true;
                    collidedOBB = bound;
                    break;
                }
            }

            if (hasCollision) {
                collided = true;
                break;                    // прерываем трассу на первом столкновении
            } else {
                finalSafePosition.copy(testPos);
                lastSafeY = testPos.y;
            }
        }

        // 2. Конечная позиция – может быть чистой

        if (collided) {
            const finalOffset = toPos.clone().sub(fromPos);
            const finalBox = aabb.clone().translate(finalOffset);

            const finalCenter = new THREE.Vector3();
            finalBox.getCenter(finalCenter);

            const finalOBB = obb.clone();
            finalOBB.center.copy(finalCenter);
            finalOBB.rotation.setFromMatrix4(matrixWorld);

            let finalIsClear = true;
            for (const bound of objectsBoundsStore) {
                if (finalOBB.intersectsOBB(bound)) {
                    finalIsClear = false;
                    break;
                }
            }

            if (finalIsClear) {
                // вся цель свободна – берём её
                return {
                    position: toPos.clone(),
                    rotation: objectPos.rotation.clone()
                };
            }
        }

        // 3. «Скольжение» – оставляем X/Z, фиксируем Y

        if (collided && collidedOBB) {
            // Позиция: конечные XZ + последний безопасный Y
            const slidePos = new THREE.Vector3(toPos.x, lastSafeY, toPos.z);

            const offset = slidePos.clone().sub(fromPos);
            const slideBox = aabb.clone().translate(offset);

            const slideCenter = new THREE.Vector3();
            slideBox.getCenter(slideCenter);

            const slideOBB = obb.clone();
            slideOBB.center.copy(slideCenter);
            slideOBB.rotation.setFromMatrix4(matrixWorld);

            let slideClear = true;
            for (const bound of objectsBoundsStore) {
                if (slideOBB.intersectsOBB(bound)) {
                    slideClear = false;
                    break;
                }
            }

            if (slideClear) {
                return {
                    position: slidePos,
                    rotation: objectPos.rotation.clone()
                };
            }
        }

        // 4. Ни цель, ни скольжение не подошли – остаемся на finalSafePosition

        return {
            position: finalSafePosition,
            rotation: objectPos.rotation.clone()
        };
    }

}
