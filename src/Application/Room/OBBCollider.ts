// @ts-nocheck
import * as THREE from 'three';
import { OBB } from 'three/examples/jsm/math/OBB.js';
import { TAdjustPosition } from "@/types/types"
import { SNAP_CONFIG } from './SnapConfig';
import { getUMGridFromConfig } from "@/components/UMconstructor/wardrobe/WardrobeSystem.ts";

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
 * Поворот объекта в мире, матрицей 4×4 и без масштаба.
 * OBB.rotation заполняется через Matrix3.setFromMatrix4, а тот забирает весь
 * левый верхний угол матрицы: matrixWorld с масштабом ≠ 1 ложился поверх
 * halfSize, который уже в мировых миллиметрах, и бокс перекашивало.
 */
export function getWorldRotationMatrix(object: THREE.Object3D): THREE.Matrix4 {
    return new THREE.Matrix4().makeRotationFromQuaternion(
        object.getWorldQuaternion(new THREE.Quaternion())
    )
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
    private readonly floorTolerance = 1      // отрыв от пола, с которого УМ считается поднятым, мм
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
        testOBB.rotation.setFromMatrix4(getWorldRotationMatrix(object))

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

        const targetFree = !collides(toPos)

        // Не перетаскивание (ресайз, гизмо): объект остаётся на месте, подводить его
        // к занятой цели нельзя. Но пока объект не в сцене (drop, загрузка), его
        // position — сырая точка курсора на стене, и оставаться на ней нельзя.
        if (!drag) return { position: targetFree || !object.parent ? toPos : fromPos, rotation }

        let position = toPos

        if (!targetFree) {
            position = this.sweep(fromPos, toPos, collides)

            // Остаток хода раскладываем по осям — это и есть скольжение вдоль соседа
            for (const axis of ['x', 'y', 'z'] as const) {
                if (position[axis] === toPos[axis]) continue

                const axisTarget = position.clone()
                axisTarget[axis] = toPos[axis]
                position = this.sweep(position, axisTarget, collides)
            }
        }

        return {
            position: this.snapToNeighbours({ object, position, testOBB, center: setCenter(position), bounds: objectsBoundsStore, collides }),
            rotation
        }
    }

    /**
     * Stuking: объект довыравнивается по соседям, с которыми оказался в контакте —
     * схлопывает до нуля горизонтальный зазор и ставит свои грани вровень с их
     * гранями. Верх вдобавок ловится за верх любого модуля сцены — этому магниту
     * контакт не нужен. По каждой оси применяется одно смещение, и только если
     * оно не создаёт пересечения.
     */
    private snapToNeighbours({ object, position, testOBB, center, bounds, collides }: {
        object: THREE.Object3D,
        position: THREE.Vector3,
        testOBB: OBB,
        center: THREE.Vector3,
        bounds: OBB[],
        collides: (point: THREE.Vector3) => boolean,
    }): THREE.Vector3 {

        if (!SNAP_CONFIG.stuking || !bounds.length) return position

        // center живёт в замыкании collides — считаем от снимка
        const selfCenter = center.clone()
        const delta = new THREE.Vector3()
        const up = new THREE.Vector3(0, 1, 0)

        // Горизонтальные оси объекта; у наклонённого гизмо одна из них может выродиться
        const horizontal = (x: number, z: number) => {
            const axis = new THREE.Vector3(x, 0, z).applyMatrix3(testOBB.rotation).setY(0)
            return axis.lengthSq() > 0.01 ? axis.normalize() : null
        }

        const width = horizontal(1, 0)
        const depth = horizontal(0, 1)
        const axes = [width, depth, up].filter(Boolean) as THREE.Vector3[]

        /** Проекция вектора до центра соседа на ось */
        const distance = (bound: OBB, axis: THREE.Vector3) => delta.subVectors(bound.center, selfCenter).dot(axis)
        /** Зазор между габаритами вдоль оси; отрицательный — габариты перекрываются */
        const gap = (bound: OBB, axis: THREE.Vector3) =>
            Math.abs(distance(bound, axis)) - this.projectRadius(testOBB, axis) - this.projectRadius(bound, axis)

        // Соседи в контакте: ни по одной оси не расходимся больше порога. Их может
        // быть несколько — модуль под рядом навесных касается сразу двух
        const contacts = bounds.filter(bound => axes.every(axis => gap(bound, axis) <= SNAP_CONFIG.threshold))

        /** Зазор схлопываем, только если по остальным осям габариты перекрываются */
        const gapShift = (bound: OBB, axis: THREE.Vector3 | null) => {
            if (!axis) return 0

            const value = gap(bound, axis)

            if (value <= 0 || value > SNAP_CONFIG.threshold) return 0
            if (axes.some(other => other !== axis && gap(bound, other) >= 0)) return 0

            return Math.sign(distance(bound, axis)) * (value - this.contactPrecision)
        }

        /** Одноимённые грани вровень: из двух сторон берём ту, что ближе */
        const faceShift = (bound: OBB, axis: THREE.Vector3 | null) => {
            if (!axis) return 0

            const radius = this.projectRadius(testOBB, axis) - this.projectRadius(bound, axis)
            const to = distance(bound, axis)
            const value = Math.abs(to + radius) <= Math.abs(to - radius) ? to + radius : to - radius

            return Math.abs(value) <= SNAP_CONFIG.faceThreshold ? value : 0
        }

        /** Верх на уровень верха любого модуля сцены: контакт тут не нужен */
        const topShift = (bound: OBB) => {
            const value = distance(bound, up) + this.projectRadius(bound, up) - this.projectRadius(testOBB, up)

            return Math.abs(value) <= SNAP_CONFIG.topThreshold ? value : 0
        }

        let result = position

        /** По оси одно смещение: наименьшее из подходящих и не создающее пересечения */
        const apply = (axis: THREE.Vector3 | null, shifts: number[]) => {
            const shift = shifts.filter(Boolean).sort((a, b) => Math.abs(a) - Math.abs(b))[0]
            if (!axis || shift === undefined) return

            const next = result.clone().addScaledVector(axis, shift)
            if (!collides(next)) result = next
        }

        apply(width, contacts.flatMap(bound => [gapShift(bound, width), faceShift(bound, width)]))
        apply(depth, contacts.map(bound => gapShift(bound, depth)))
        apply(up, this.isFloorElement(object, selfCenter.y - this.projectRadius(testOBB, up))
            ? []
            : [...contacts.map(bound => faceShift(bound, up)), ...bounds.map(topShift)])

        return result
    }

    /**
     * Напольный модуль: вертикально выравнивать нечего, он прижат к полу.
     * Тип берём из CONFIG — у модулей, опознанных по ножкам, userData.elementType пустой.
     * Поднятый УМ — исключение: по высоте он свободен (roomInterseck не прижимает
     * его к полу), а стоящий на полу отрывался бы от него, выравнивая верх с соседом.
     */
    private isFloorElement(object: THREE.Object3D, bottom: number): boolean {
        if ((object.userData.PROPS?.CONFIG?.ELEMENT_TYPE ?? object.userData.elementType) !== 'element_down') return false

        return !this.isUniversalModule(object) || bottom <= this.floorTolerance
    }

    /** УМ и всё, что собрал его движок: непустая сетка в CONFIG (MODULEGRID или WARDROBEGRID) */
    private isUniversalModule(object: THREE.Object3D): boolean {
        const { grid } = getUMGridFromConfig(object.userData.PROPS?.CONFIG)

        return !!Object.keys(grid ?? {}).length
    }

    /** Радиус габарита вдоль оси: проекция полуразмеров OBB на неё */
    private projectRadius(obb: OBB, axis: THREE.Vector3): number {
        const r = obb.rotation.elements

        return Math.abs(axis.x * r[0] + axis.y * r[1] + axis.z * r[2]) * obb.halfSize.x
            + Math.abs(axis.x * r[3] + axis.y * r[4] + axis.z * r[5]) * obb.halfSize.y
            + Math.abs(axis.x * r[6] + axis.y * r[7] + axis.z * r[8]) * obb.halfSize.z
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
