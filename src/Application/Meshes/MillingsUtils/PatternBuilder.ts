//@ts-nocheck
import * as THREE from 'three';
import * as THREETypes from "@/types/types"
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';


type TFasadeSizes = {
    FASADE_WIDTH: number,
    FASADE_HEIGHT: number,
    FASADE_DEPTH: number
}

type TRotate = {
    y: number | string,
    x: number | string,
    z: number | string
}

type TCapsulePosition = {
    x: string | number,
    y: string | number,
    z: string | number,
    offsetX: number | 0,
    offsetY: number | 0,
    offsetZ: number | 0,
    inpostOffset: number | 0,
}

type TPosition = {
    top?: boolean,
    bottom?: boolean,
    front?: number,
    left?: boolean,
    right?: boolean,
    centerVertical?: boolean
} & TCapsulePosition

type TDepth = {
    offset?: number
    size?: number
}

type TPattern = {
    type?: string
    offsetX?: number
    offsetY?: number
    offsetZ?: number
    offset?: number
    multiply?: number
    count?: number
    direction?: string
    rotation?: TRotate
    invert?: boolean
}

type TPatternCount = {
    patternX: number,
    patternY: number
}


type TConditionWidth = {
    min: number;
    max: number
}

type TConditionHeight = {
    min: number;
    max: number
}

type TExtrudeSettings = {
    steps?: number,
    depth?: number,
    bevelEnabled?: boolean,
    bevelThickness?: number,
    bevelSize?: number,
    bevelOffset?: number,
    bevelSegments?: number,
}

type TCondition = {
    width: TConditionWidth
    height: TConditionHeight
}

type TBoolParams = {
    depth?: TDepth
    position?: TPosition
    rotate?: TRotate
}

type TCapsuleParams = {
    radius: number
    length: string | number
    percent: number
    capSegments: number
    radialSegments: number
    padding: number

    condition: TCondition
    pattern: TPattern
    position: TPosition
    rotation: TRotate

}

type TFigure = {
    svg: string
    widthOffset: number
    heightOffset: number
    pattern?: TPattern
    topPosition?: boolean
    boolParams?: TBoolParams
}

type TfigureBuild = {
    type: string,
    lib: string,
    shape: THREE.ShapePath,
    extrudeSettings: TExtrudeSettings,
} & TFigure & TCapsuleParams

interface IFigureParamsItem {
    nameCondition: string;
    condition: TCondition;
    figure: TFigure
    hole: TFigure
}

interface IFigureParamsItems extends Array<IFigureParamsItem> { }

interface IMillingDataItem {
    name: string
    type: string
    lib?: string
    isCorner?: boolean
    extrudeSettings?: TExtrudeSettings
    figureParams?: IFigureParamsItems
    capsuleParams?: TCapsuleParams
}

interface IMillingDataItems extends Array<IMillingDataItem> { }

interface IPatternBuild {
    boolMesh: THREE.Mesh
    figureParams: TfigureBuild
    fasadePosition: TFasadeSizes
    type: string
}

export class PatternBuilder {

    patternData: IPatternBuild | null = null
    patternMesh: THREE.Mesh


    constructor() {
    }

    getPadding(patternData: IPatternBuild, capsuleRadius: number) {

        let { figureParams, fasadePosition } = patternData
        const { padding, pattern, boolParams } = figureParams;

        const svgPadding = boolParams?.depth?.offset ? boolParams.depth.offset * 2 : 0;

        const { FASADE_WIDTH, FASADE_HEIGHT } = fasadePosition

        const defaultWidth = FASADE_WIDTH + svgPadding;

        const defaultHeight = FASADE_HEIGHT

        // console.log(padding, '--Padding')

        const calculatePadding = (dimension: number, additional: number = 0) =>
            padding ? dimension - Math.abs(padding * 2 + additional) : dimension;

        switch (pattern?.direction) {
            case 'x':
                return {
                    x: calculatePadding(defaultWidth, capsuleRadius),
                    y: 0
                };
            case 'y':
            case 'randomY':
                return {
                    x: 0,
                    y: calculatePadding(defaultHeight, capsuleRadius)
                };
            case 'xy':

                // console.log({
                //     x: calculatePadding(defaultWidth),
                //     y: calculatePadding(defaultHeight, capsuleRadius)
                // })

                return {
                    x: calculatePadding(defaultWidth),
                    y: calculatePadding(defaultHeight, capsuleRadius)
                };
            default:
                return {
                    x: calculatePadding(defaultWidth),
                    y: 0
                };
        }

    }

    getCount(pattern: TPattern, padding: { x?: number, y?: number }, boolMeshSize: any, startBoolMeshSize: any) {
        const { offsetX, offset, offsetY, count } = pattern;

        let marginY
        const marginX = offsetX ? startBoolMeshSize.x + offsetX : 0
        // const marginY = offsetY ? boolMeshSize.y + offsetY : 0
        switch (pattern?.direction) {
            case 'y':
            case 'randomY':
                marginY = offsetY ? startBoolMeshSize.x + offsetY : 0;
                break;
            default:
                marginY = offsetY ? boolMeshSize.y + offsetY : 0;
                break;
        }

        const calculatePattern = (containerLength?: number, itemLength?: number) =>
            containerLength && itemLength ? this.calculateFit({ containerLength, itemLength }) : 0;

        let patternX = calculatePattern(padding.x, marginX);
        let patternY = calculatePattern(padding.y, marginY);

        if (count) {
            patternX *= count;
            patternY *= count;
        }

        return { patternX, patternY };
    }

    createPatternGeometry({ boolMesh, count, patternData, position, boolMeshSize, startBoolMeshSize }: { boolMesh: THREE.Mesh, count: TPatternCount, patternData: TPattern, position: TFasadeSizes, boolMeshSize: any, startBoolMeshSize: any }) {

        let { offsetX, offsetY, offsetZ, rotation, direction } = patternData;

        let marginY

        switch (patternData?.direction) {
            case 'y':
            case 'randomY':
                marginY = offsetY ? startBoolMeshSize.x + offsetY : 0;
                break;
            default:
                marginY = offsetY ? boolMeshSize.y + offsetY : 0;
        }


        const marginX = offsetX ? startBoolMeshSize.x + offsetX : 0
        const marginZ = offsetZ ? boolMeshSize.z + offsetZ : 0

        // const marginX = offsetX 
        // const marginY = offsetY 
        // const marginZ = offsetZ 


        let geometry = boolMesh.geometry.clone();
        geometry.center()

        const fasadeWidth = position.FASADE_WIDTH * 0.5;
        const fasadeHeight = position.FASADE_HEIGHT * 0.5;
        // const randomCorner = this.getRandomInt(-Math.PI, Math.PI)
        const geometries = [];

        switch (patternData.type) {
            case 'flat':
                for (let i = 0; i < count.patternX; i++) {
                    for (let ii = 0; ii < count.patternY; ii++) {


                        const randomCorner = this.getRandomInt(-Math.PI, Math.PI);
                        const randomX = this.getRandomInt(-fasadeWidth, fasadeWidth);
                        const randomY = this.getRandomInt(-fasadeHeight, fasadeHeight);
                        const randomOffsetY = this.getRandomInt(randomY, randomY * 2);

                        const cloneGeometry = geometry.clone();

                        // Создаем матрицу смещения
                        const offsetMatrix = new THREE.Matrix4();

                        if (direction) {

                            switch (direction) {
                                case 'x':
                                    offsetMatrix.makeTranslation(i * marginX, 0, 0);
                                    break;
                                case 'y':
                                    offsetMatrix.makeTranslation(0, i * marginY, 0);
                                    break;
                                case 'z':
                                    offsetMatrix.makeTranslation(0, 0, i * marginZ);
                                    break;
                                case 'xy':
                                    offsetMatrix.makeTranslation(i * marginX, ii * marginY, 0);
                                    break;
                                case 'random':
                                    offsetMatrix.makeTranslation(randomX, randomY, 0);
                                    break;
                                case 'randomY':
                                    offsetMatrix.makeTranslation(0, randomOffsetY, 0);
                                    break;
                                default:
                                    offsetMatrix.makeTranslation(i * marginX, 0, 0);
                            }
                        }

                        else {

                            offsetMatrix.makeTranslation(i * marginX, 0, 0);
                        }

                        if (rotation) {

                            if (rotation.x) {
                                cloneGeometry.rotateX(rotation.x as number)
                            }
                            if (rotation.y) {
                                cloneGeometry.rotateY(rotation.y as number)
                            }
                            if (rotation.z) {
                                switch (rotation.z) {
                                    case 'random':
                                        cloneGeometry.rotateZ(randomCorner);
                                        break;
                                    default:
                                        cloneGeometry.rotateZ(rotation.z as number)
                                }
                            }
                        }

                        // Применяем смещение
                        cloneGeometry.applyMatrix4(offsetMatrix);

                        // Добавляем в массив
                        geometries.push(cloneGeometry);

                    }
                }
                break;

            default:
                let counter
                if (count.patternX > 0) {
                    counter = count.patternX
                }
                else {
                    counter = count.patternY
                }

                for (let i = 0; i < counter; i++) {

                    const randomCorner = this.getRandomInt(-Math.PI, Math.PI);
                    const randomX = this.getRandomInt(-fasadeWidth, fasadeWidth);
                    const randomY = this.getRandomInt(-fasadeHeight, fasadeHeight);
                    const randomOffsetY = this.getRandomInt(randomY, randomY * 2);

                    const cloneGeometry = geometry.clone();

                    // Создаем матрицу смещения
                    const offsetMatrix = new THREE.Matrix4();

                    if (direction) {

                        switch (direction) {
                            case 'x':
                                offsetMatrix.makeTranslation(i * marginX, 0, 0);
                                break;
                            case 'y':
                                offsetMatrix.makeTranslation(0, i * marginY, 0);
                                break;
                            case 'z':
                                offsetMatrix.makeTranslation(0, 0, i * marginZ);
                                break;
                            case 'random':
                                offsetMatrix.makeTranslation(randomX, randomY, 0);
                                break;
                            case 'randomY':
                                offsetMatrix.makeTranslation(0, randomOffsetY, 0);
                                break;
                            default:
                                offsetMatrix.makeTranslation(i * marginX, 0, 0);
                        }
                    }

                    else {

                        offsetMatrix.makeTranslation(i * marginX, 0, 0);
                    }

                    if (rotation) {

                        if (rotation.x) {
                            cloneGeometry.rotateX(rotation.x as number)
                        }
                        if (rotation.y) {
                            cloneGeometry.rotateY(rotation.y as number)
                        }
                        if (rotation.z) {
                            switch (rotation.z) {
                                case 'random':
                                    cloneGeometry.rotateZ(randomCorner);
                                    break;
                                default:
                                    cloneGeometry.rotateZ(rotation.z as number)
                            }
                        }
                    }

                    // Применяем смещение
                    cloneGeometry.applyMatrix4(offsetMatrix);

                    // Добавляем в массив
                    geometries.push(cloneGeometry);

                }
                break;

        }

        // Объединяем все геометрии
        const mergedGeometry = mergeGeometries(geometries);

        // mergedGeometry.computeVertexNormals();
        // Создаем материал и mesh
        return mergedGeometry
    }

    createPatternMesh(patternData: IPatternBuild) {

        let { boolMesh, figureParams, fasadePosition, type } = patternData

        const { FASADE_WIDTH, FASADE_HEIGHT, FASADE_DEPTH } = fasadePosition

        // console.log(boolMesh, 'boolMesh')

        const startBoolMeshSize = boolMesh.userData.startSize

        const aabb = new THREE.Box3().setFromObject(boolMesh)
        const boolMeshSize = new THREE.Vector3();
        aabb.getSize(boolMeshSize);

        // console.log(boolMeshSize, 'boolMeshSize')

        let pattern = patternData.figureParams.pattern as TPattern;
        let capsuleRadius = ((patternData?.figureParams?.radius ?? 0) * 2);
        let padding = this.getPadding(patternData, capsuleRadius);
        let count = this.getCount(pattern, padding, boolMeshSize, startBoolMeshSize)

        let patternGeometry = this.createPatternGeometry(
            {
                boolMesh: boolMesh,
                count: count,
                patternData: pattern,
                position: patternData.fasadePosition,
                boolMeshSize,
                startBoolMeshSize

            })

        const patternMaterial = new THREE.MeshPhongMaterial({ color: 0xff00ff, transparent: true, opacity: 0.1 });
        // const patternMaterial = new THREE.MeshPhongMaterial({ color: 0xff00ff });
        const patternMesh = new THREE.Mesh(patternGeometry, patternMaterial)

        // patternMesh.position.set(0, 0, 0)
        patternMesh.rotation.copy(boolMesh.rotation)
        let patternPosition: THREE.Vector3 | number = new THREE.Vector3().copy(boolMesh.position);
        patternMesh.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(patternMesh);
        const vector = new THREE.Vector3();
        const size = box.getSize(vector);

        switch (type) {
            case "capsule":
                let correctX = FASADE_WIDTH - (size.x / figureParams.pattern.count)
                let correctY = FASADE_HEIGHT - size.y - figureParams.padding

                switch (figureParams.position.x) {
                    case 'left':
                        patternPosition.x = patternPosition.x - (correctX * 0.5 - figureParams.radius)
                        break;
                    case 'right':
                        patternPosition.x = patternPosition.x + (correctX * 0.5 - figureParams.radius)
                        break;
                    default:
                        patternPosition.x = 0
                }
                switch (figureParams.position.y) {
                    case 'top':
                        patternPosition.y = correctY * 0.5 - figureParams.radius
                        break;
                    case 'bottom':
                        patternPosition.y = -correctY * 0.5 + figureParams.radius
                        break;
                    default:
                        patternPosition.y = 0
                }

                break;

            case 'svg':

                patternMesh.geometry.center();
                patternPosition.x = 0
                patternPosition.y = 0
                patternPosition.z = FASADE_DEPTH - boolMeshSize.z * 0.5

                if (figureParams.position) {

                    let { x, y, z, offsetX = 0, offsetY = 0, offsetZ = 0, inpostOffset = 0 } = figureParams.position

                    if (x) {
                        switch (x) {
                            case 'right':
                                patternPosition.x += (size.x * 0.5 + offsetX)
                                break;
                            case 'left':
                                patternPosition.x -= (size.x * 0.5 + offsetX)
                                break;
                            default:
                                patternPosition.x += (x + offsetX)
                                break;
                        }
                    }

                    if (z) {
                        switch (z) {
                            default:
                                patternPosition.z += z
                                break;
                        }
                    }

                    if (y) {
                        switch (y) {
                            case 'top':
                                patternPosition.y += (size.y * 0.5 + offsetY)
                                break;
                            case 'bottom':
                                patternPosition.y -= (size.y * 0.5 + offsetY)
                                break;
                            case "inpostTop":
                                patternPosition.y = FASADE_HEIGHT * 0.5 - size.y * 0.5 - inpostOffset + offsetY
                                break
                            case "inpostBottom":
                                patternPosition.y = -FASADE_HEIGHT * 0.5 + size.y * 0.5 + inpostOffset + offsetY
                                break
                            default:
                                patternPosition.y += (y + offsetY)
                                break;
                        }
                    }
                }
        }

        patternMesh.position.copy(patternPosition)
        // patternMesh.position.z += fasadeDepth + 4
        patternMesh.updateMatrixWorld(true)

        return patternMesh;
    }

    calculateFit({ containerLength, itemLength }: { containerLength: number, itemLength: number }) {

        if (itemLength <= 0 || containerLength <= 0) {
            return 0; // Невозможно разместить фигуры
        }

        // Количество элементов, которые помещаются в контейнер
        let count = Math.floor((containerLength) / itemLength);

        if (count < 1 && count > 0) {
            count = 1
        }

        return count;
    }

    getRandomInt(min: number, max: number) {
        const minCeiled = Math.ceil(min);
        const maxFloored = Math.floor(max);
        return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled);
    }

} 