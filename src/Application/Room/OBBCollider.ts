// @ts-nocheck
import * as THREE from 'three';
import { OBB } from 'three/examples/jsm/math/OBB.js';
import { TAdjustPosition } from "@/types/types"

/**
 * OBBCollider
 * 
 * Класс для обнаружения и разрешения коллизий между OBB (Oriented Bounding Box).
 */


/**
 * Смещение центра габарита относительно origin объекта, развёрнутое в мир.
 * Какой именно центр нужен, задаёт key:
 *   obbCenter   — парный к userData.obb.halfSize (вся сборка);
 *   clampCenter — парный к trueSizes / BODY-размерам.
 * Поля нет (модели-GLB и прочее не из BuildProduct) — нулевой вектор, то есть
 * прежнее поведение «центр габарита = origin».
 */
export function getCenterOffset(
    object: THREE.Object3D,
    rotation: THREE.Euler,
    key: 'obbCenter' | 'clampCenter',
): THREE.Vector3 {
    const local = object.userData?.[key] as THREE.Vector3 | undefined
    return local ? local.clone().applyEuler(rotation) : new THREE.Vector3()
}

/**
 * Смещение центра OBB от origin объекта — парное к userData.obb.halfSize.
 * У моделей без obbCenter (GLB) берём живой AABB: другого источника нет.
 */
export function getObbCenterOffset(object: THREE.Object3D, rotation: THREE.Euler = object.rotation): THREE.Vector3 {
    if (object.userData?.obbCenter) return getCenterOffset(object, rotation, 'obbCenter')
    if (!object.userData?.aabb) return new THREE.Vector3()
    return object.userData.aabb.getCenter(new THREE.Vector3()).sub(object.position)
}

export class OBBCollider {
    private defaultMagnetTrashhold = 50
    private readonly sweepStep = 15          // шаг трассы коллизии, мм
    private readonly maxSweepSteps = 128     // потолок шагов на один кадр
    private readonly contactPrecision = 0.1  // остаточный зазор в касании, мм
    private readonly UM_LIST: number[] = [3954672, 1942652, 5168676, 6469966]

    getCorrectPosition({ object,
        targetPosition,
        wall,
        targetRotation,
        snapHeight,
        heightClamp,
        wallStore,
        boundsStore,
        objectsBoundsStore,
        drag = false
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
        drag?: boolean,
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

        const objectsInterseck = this.objectsInterseck({ object, objectPos, objectsBoundsStore, drag })

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
        const { PRODUCT } = object.userData.PROPS
        const { DEPTH, HEIGHT, WIDTH } = object.userData.trueSizes
        const roomBound = boundsStore;

        const obb = object.userData.obb;


        /** Объект установлен гизмо: поворот задал пользователь — не трогаем его, только выталкиваем OBB из стен */

        if (object.userData.PROPS.CONFIG.FREE_TRANSFORM) {
            this.getClampedFloorPosition(obb, wallStore, position, adjustPosition, getCenterOffset(object, object.rotation, 'obbCenter'))
        }

        /** Для загрузки контента из стора при запуске приложения */

        else if (!wall) {

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
                    this.getClampedFloorPosition(obb, wallStore, position, adjustPosition, getCenterOffset(object, object.rotation, 'obbCenter'))
                    break
                default:

                    let correctData = this.getClampedPosition({ position: adjustPosition, rotation, wall, object, obb })

                    adjustPosition = correctData.correctPosition
                    rotation.copy(correctData.correctRotation)

                    break
            }
        }

        // console.log(object)

        /** Проверка на положение объекта только на полу */
        const elementPosition = object.userData.elementType == "element_down" && !this.UM_LIST.includes(PRODUCT)
        const verticalHalfSize = this.getVerticalHalfSize(object, rotation)

        adjustPosition.y = elementPosition ? verticalHalfSize - 0.001 : Math.max(
            (verticalHalfSize - 0.001),
            Math.min(position.y, roomBound.max.y - (verticalHalfSize - 0.001))
        );

        // Обновляем конфигурацию объекта
        object.userData.PROPS.CONFIG = { ...object.userData.PROPS.CONFIG, ROTATION: rotation, POSITION: adjustPosition };
        object.userData.currentWall = wall
        object.userData.obb = obb

        return { position: adjustPosition, rotation };
    }

    /** Половина высоты объекта по мировой вертикали с учётом наклона */
    private getVerticalHalfSize(object: THREE.Object3D, rotation: THREE.Euler): number {
        const { HEIGHT } = object.userData.trueSizes
        const { halfSize } = object.userData.obb
        const matrix = new THREE.Matrix4().makeRotationFromEuler(rotation).elements

        // Строка Y матрицы поворота — вклад каждой локальной оси в мировую вертикаль.
        // Горизонтальные полуразмеры берём из OBB: у УМ в trueSizes DEPTH и WIDTH не заполнены
        return Math.abs(matrix[1]) * halfSize.x + Math.abs(matrix[5]) * HEIGHT + Math.abs(matrix[9]) * halfSize.z
    }

    private getClampedPosition({ position, rotation, wall, object, obb, floor }: { position: THREE.Vector3, rotation: THREE.Euler, wall: THREE.Object3D, object: THREE.Object3D, obb: OBB, floor?: boolean }) {

        let correctPosition = position.clone()
        // Поворот, с которым объект ВСТАНЕТ: у стены его задаёт сама стена.
        // Нужен ДО расчётов — им разворачивается смещение центра габарита.
        // Раньше присваивание стояло в конце функции, результат тот же.
        const correctRotation = wall.userData.name != "floor" ? wall.rotation.clone() : rotation.clone()
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

        // Расстояние до плоскости стены — от ЦЕНТРА габарита, а не от origin
        // объекта: они совпадают только у симметричной геометрии (см.
        // getCenterOffset).
        const centerOffset = getCenterOffset(object, correctRotation, 'clampCenter')
        const centerPosition = position.clone().add(centerOffset)

        // А вдоль стены — только КАСАТЕЛЬНАЯ часть смещения. distanceToExtrene
        // ниже это 3D-расстояние до КОНЦА стены, и нормальная составляющая
        // (у гардеробной системы это вся её глубина) раздувала бы его: клампинг
        // срабатывал позже, и модуль заходил за угол в боковую стену.
        const lateralPosition = position.clone().add(centerOffset.clone().projectOnPlane(wallNormal))

        const distanceToPlane = wall.userData.plane.distanceToPoint(centerPosition);

        const side = this.getFacingSideFromOBB(object, wall, obb);

        let trueExtremePoint = this.findClosestPoint(lateralPosition, wallCoordinates[0], wallCoordinates[1]).clone()
        // let trueCenterPoint = this.findClosestPoint(obb.center, wallCoordinates[0], wallCoordinates[1]).clone()

        const vectorToCenter = new THREE.Vector3().subVectors(wall.userData.center, trueExtremePoint).normalize();
        // const vectorFromCenter = new THREE.Vector3().subVectors(obb.center, trueExtremePoint).normalize();

        trueExtremePoint.y = lateralPosition.y
        // trueCenterPoint.y = position.y

        const distanceToExtrene = trueExtremePoint.distanceTo(lateralPosition)
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
        centerOffset: THREE.Vector3 = new THREE.Vector3(),
    ) {
        const correctedObb = movingObb.clone();
        // Центр OBB, а не origin объекта: halfSize здесь от всей сборки, и
        // центр должен быть её же (см. getCenterOffset).
        correctedObb.center.copy(attemptedPosition).add(centerOffset);

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
            // console.log('point1')
            return point1; // Ближе к первой точке
        } else {
            // console.log('point2')
            return point2; // Ближе ко второй точке
        }
    }

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────
    /** @Методы_отслеживания_пересечения_с_объектами */
    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────
    objectsInterseck({
        object,
        objectPos,
        objectsBoundsStore,
        drag = false
    }: {
        object: THREE.Object3D,
        objectPos: { position: THREE.Vector3, rotation: THREE.Euler },
        objectsBoundsStore: OBB[],
        drag?: boolean
    }) {

        const rotation = objectPos.rotation.clone()
        const fromPos = object.position.clone()
        const toPos = objectPos.position.clone()

        /** RAYCAST — объект-призрак, ни с чем не сталкивается */
        if (object.userData.PROPS.RAYCAST || !objectsBoundsStore.length) {
            return { position: toPos, rotation }
        }

        const testOBB = object.userData.obb.clone()
        testOBB.rotation.setFromMatrix4(object.matrixWorld)

        // Тестовый OBB ставим по центру габарита, а не по origin объекта
        const centerOffset = getObbCenterOffset(object, rotation)

        const center = new THREE.Vector3()
        const setCenter = (point: THREE.Vector3) => {
            center.copy(point).add(centerOffset)
            if (center.y < 0) center.y = 0
            testOBB.center.copy(center)
            return center
        }

        // Габариты, внутри которых объект уже оказался (drop, дубликат, ресайз):
        // из них разрешаем только выход. Совсем отключать их нельзя — объект
        // проходил бы такого соседа насквозь, пока не выйдет за его пределы.
        setCenter(fromPos)
        const trapped = new Map<OBB, number>()
        for (const bound of objectsBoundsStore) {
            if (testOBB.intersectsOBB(bound)) trapped.set(bound, center.distanceTo(bound.center))
        }

        const collides = (point: THREE.Vector3): boolean => {
            const position = setCenter(point)
            return objectsBoundsStore.some(bound => {
                if (!testOBB.intersectsOBB(bound)) return false
                const escapeFrom = trapped.get(bound)
                return escapeFrom === undefined || position.distanceTo(bound.center) < escapeFrom
            })
        }

        // Цель свободна — ставим объект сразу туда: соседа можно обойти с любой стороны
        if (!collides(toPos)) return { position: toPos, rotation }

        // Не перетаскивание (ресайз, гизмо): объект остаётся на месте, подводить его
        // к занятой цели нельзя. Но пока объект не в сцене (drop, загрузка), его
        // position — сырая точка курсора на стене, и оставаться на ней нельзя.
        if (!drag) return { position: object.parent ? fromPos : toPos, rotation }

        let position = this.sweep(fromPos, toPos, collides)

        // Остаток хода раскладываем по осям — это и есть скольжение вдоль соседа
        for (const axis of ['x', 'y', 'z'] as const) {
            if (position[axis] === toPos[axis]) continue

            const axisTarget = position.clone()
            axisTarget[axis] = toPos[axis]
            position = this.sweep(position, axisTarget, collides)
        }

        return { position, rotation }
    }

    /**
     * Самая дальняя свободная точка на отрезке from→to.
     * Шаг трассы — в мировых единицах, а не доля хода: при далёкой камере кадр
     * даёт перемещение в сотни мм, и объект застревал в один шаг от соседа.
     */
    private sweep(from: THREE.Vector3, to: THREE.Vector3, collides: (point: THREE.Vector3) => boolean): THREE.Vector3 {

        const move = to.clone().sub(from)
        const distance = move.length()
        if (distance <= this.contactPrecision) return to.clone()

        const steps = Math.min(Math.ceil(distance / this.sweepStep), this.maxSweepSteps)
        const point = new THREE.Vector3()

        let safe = 0        // доля хода, заведомо свободная
        let blocked = 0     // доля хода, заведомо занятая
        let hit = false

        for (let i = 1; i <= steps; i++) {
            const t = i / steps

            if (collides(point.copy(from).addScaledVector(move, t))) {
                blocked = t
                hit = true
                break
            }
            safe = t
        }

        if (!hit) return to.clone()

        // Уточнение до касания: без него зазор равен шагу трассы
        while ((blocked - safe) * distance > this.contactPrecision) {
            const middle = (safe + blocked) * 0.5
            collides(point.copy(from).addScaledVector(move, middle)) ? blocked = middle : safe = middle
        }

        return from.clone().addScaledVector(move, safe)
    }

}
