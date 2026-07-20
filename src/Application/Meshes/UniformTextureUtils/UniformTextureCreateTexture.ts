//@ts-nocheck
import * as THREE from "three";
import * as THREETypes from '@/types/types'
import * as UniformTypes from '@/types/uniformTextureTypes'
import textureUrl from '@/assets/uniform/example_small.webp';

export class UniformTextureCreateTexture {

    resources: THREETypes.TResources | null
    // backupMaterial: THREE.MeshPhongMaterial | THREE.MeshStandardMaterial | null = null
    // backupFasadId: number | null = null

    // uniformTexture = new URL('@/assets/uniform', import.meta.url).href + "/"
    private uniformTexture = ''
    private localTexture = textureUrl



    onCreateTexture: (group: UniformTypes.LevelItem[][], texture: THREE.Texture) => void

    constructor(root: THREETypes.TApplication) {
        this.resources = root._resources
        this.onCreateTexture = this.createTexture.bind(this)

    }

    setTexture(path) {
        this.uniformTexture = path
    }
    clearTexture() {
        this.uniformTexture = ''
    }

    loadTexture(callback: (group: UniformTypes.LevelItem[][], texture: THREE.Texture) => void, group: UniformTypes.LevelItem[][]) {
        // return
        // const url = `${this.uniformTexture}example_small.webp`
        const url = this.uniformTexture.length > 0 ? this.uniformTexture : this.localTexture
        const type = this.uniformTexture.length > 0 ? 'texture' : 'localTexture'

        // console.log('loadTexture')

        this.resources!.startLoading(url, type, (texture: THREE.Texture) => {

            texture.colorSpace = THREE.SRGBColorSpace

            if (callback) { callback(group, texture) }

        })

    }


    createTexture(levels: UniformTypes.LevelItem[][], texture: THREE.Texture) {


        let totalHeight = 0
        let totalLevelHeight = 0
        let totalLevelHeightCorrect = 0


        levels.forEach((level, levelNdx) => {

            const flatedLevels = this.flattenArray(level.flat())
            const maxLevelHeight = this.getMaxLevelHeight(flatedLevels)

            if (levelNdx > 0) {
                const levelHeightCorrectData = this.flattenArray(levels[levelNdx - 1].flat())
                const maxLevelHeightCorrect = this.getMaxLevelHeight(levelHeightCorrectData)

                totalLevelHeightCorrect += maxLevelHeightCorrect
                totalLevelHeight += maxLevelHeight
            }
            totalHeight += maxLevelHeight

            let totalLevelWidth = 0
            let totalLevelWidthCorrect = 0

            level.forEach((element, elementNdx, elemArray) => {
                // Проверка на распределение в колонке
                const column = element.columnItems

                let prevElementWidth = 0

                if (elementNdx > 0) {

                    const prevEl = elemArray[elementNdx - 1]

                    if ('columnItems' in prevEl) {
                        prevElementWidth = prevEl.columnItems[0].userData.trueSizes.WIDTH * 2
                    }
                    else {
                        prevElementWidth = elemArray[elementNdx - 1].userData.trueSizes.WIDTH * 2
                    }


                    totalLevelWidth += (prevElementWidth)
                    totalLevelWidthCorrect += (prevElementWidth)
                }

                if (column) {

                    let columnTotalHeight = 0

                    column.forEach((columnElement, columnElementNdx, columnElementsArray) => {
                        // console.log(columnElement, 'columnElement')
                        if (columnElementNdx > 0) {
                            const prevColumnElem = columnElementsArray[columnElementNdx! - 1]
                            const { BODY } = prevColumnElem.userData.PROPS
                            const prevColumnElemHeight = BODY.userData.trueSize.BODY_HEIGHT - 4
                            columnTotalHeight += prevColumnElemHeight
                        }


                        this.elementTexured({
                            element: columnElement,
                            elementNdx,
                            levelNdx,
                            columnTotalHeight,
                            // columnElementNdx,
                            // columnElementsArray: columnElementsArray,
                            prevElementWidth,
                            totalLevelHeight,
                            totalLevelHeightCorrect,
                            totalLevelWidth,
                            totalLevelWidthCorrect,
                            texture
                        })
                    })
                    return
                }

                this.elementTexured({
                    element,
                    levelNdx,
                    elementNdx,
                    prevElementWidth,
                    totalLevelHeight,
                    totalLevelHeightCorrect,
                    totalLevelWidth,
                    totalLevelWidthCorrect,
                    texture
                })

            })
        })

        // this.backupMaterial = null // Очищаем временные материал
        // this.backupFasadId = null // Очищаем временные id фасада


    }

    elementTexured({
        element,
        elementNdx,
        levelNdx,
        columnTotalHeight = 0,
        columnElementsArray,
        columnElementNdx,
        prevElementWidth,
        totalLevelHeight,
        totalLevelHeightCorrect,
        totalLevelWidth,
        totalLevelWidthCorrect,
        texture }: UniformTypes.TElementTexuredProps
    ) {
        // return

        // console.log(elementNdx, '--elementNdx')

        let totalWidth = 0
        let totalHeight = 0
        let correctWidth = 0
        let correctHeight = 0

        const { CONFIG, FASADE, BODY } = element.userData.PROPS
        const { FASADE_PROPS } = CONFIG
        const { BODY_WIDTH, BODY_HEIGHT } = BODY.userData.trueSize

        // Проверка на смешанные типы в одном объекте
        const hasDefaultType = FASADE.some(obj => obj.userData.partPosition.TYPE_POSITION === 'col');
        const hasStringType = FASADE.some(obj => obj.userData.partPosition.TYPE_POSITION === 'row');
        const hasMixedTypes = hasDefaultType && hasStringType;

        if (hasMixedTypes) {
            // Особая обработка для смешанных типов
            // console.log('hasMixedTypes');

            // Сортируем фасады по типу для более предсказуемой обработки
            const sortedFasades = [...FASADE].sort((a, b) => {
                const typeA = a.userData.partPosition.FASADE_NUMBER;
                const typeB = b.userData.partPosition.FASADE_NUMBER;
                return typeA - typeB
            });


            // Обрабатываем отсортированные фасады
            let totalWidthToString = 0;
            let totalHeightToString = 0;
            let correctWidthToString = 0;
            let correctHeightToString = 0;

            let totalWidthToDefault = 0;
            let totalHeightToDefault = 0;
            let correctWidthToDefault = 0;
            let correctHeightToDefault = 0;

            if (elementNdx > 0) {
                totalWidthToDefault += (BODY_WIDTH)
                correctWidthToDefault += (prevElementWidth)
            }

            sortedFasades.forEach((fasade, fasadeNdx, fasadeArray) => {
                const { FASADE_HEIGHT, FASADE_WIDTH } = fasade.userData.trueSize;
                const { TYPE_POSITION } = fasade.userData.partPosition
                const firstFasade = fasadeArray[0].userData.trueSize.FASADE_HEIGHT

                // fasade.userData.backupMaterial = this.backupMaterial ?? fasade.userData.backupMaterial;

                if (TYPE_POSITION === "row") {

                    if (totalWidthToString === 0) totalWidthToString = FASADE_WIDTH;
                    if (totalHeightToString === 0) totalHeightToString = FASADE_HEIGHT;

                }

                if (TYPE_POSITION === "col") {

                    if (totalWidthToDefault === 0) totalWidthToDefault = FASADE_WIDTH;
                    if (totalHeightToDefault === 0) totalHeightToDefault = firstFasade;

                }

                let prevWidthToString, prevHeightToString, prevHeightToDefault;

                if (fasadeNdx > 0 && TYPE_POSITION === "col") {

                    // console.log('--DEFAULT')
                    // console.log(totalHeightToDefault, '--totalHeightToDefault')

                    prevHeightToDefault = fasadeArray[fasadeNdx - 1].userData.trueSize.FASADE_HEIGHT

                    correctHeightToDefault += prevHeightToDefault
                    totalHeightToDefault += FASADE_HEIGHT

                    // console.log(totalHeightToDefault, 'prevHeightToDefault')
                }

                if (fasadeNdx > 0 && TYPE_POSITION === "row") {

                    prevWidthToString = fasadeArray[fasadeNdx - 1].userData.trueSize.FASADE_WIDTH;
                    prevHeightToString = fasadeArray[fasadeNdx - 1].userData.trueSize.FASADE_HEIGHT;

                    correctWidthToString += prevWidthToString;
                    correctHeightToString += prevHeightToString;

                    totalWidthToString += FASADE_WIDTH;
                    totalHeightToString += FASADE_HEIGHT;
                }


                this.textured({
                    fasade,
                    fasadeNdx,
                    levelNdx,
                    fasadeArray: sortedFasades,
                    productBody: BODY,
                    texture,
                    elementNdx,
                    hasMixedTypes,

                    totalWidth,
                    totalHeight,
                    correctWidth,
                    correctHeight,

                    totalLevelHeight,
                    totalLevelHeightCorrect,
                    totalLevelWidth,
                    totalLevelWidthCorrect,


                    totalWidthToString,
                    totalHeightToString,
                    correctWidthToString,
                    correctHeightToString,


                    totalWidthToDefault,
                    totalHeightToDefault,
                    correctWidthToDefault,
                    correctHeightToDefault,

                    columnTotalHeight

                });

                fasade.visible = true;
            });

            // console.log(totalHeightToDefault, 'MIX')
        }
        if ((hasStringType || hasStringType && FASADE.length < 2) && !hasMixedTypes) {

            // console.log('hasStringType')

            FASADE.forEach((fasade, fasadeNdx, fasadeArray) => {

                const { FASADE_HEIGHT, FASADE_WIDTH } = fasade.userData.trueSize

                // fasade.userData.backupMaterial = this.backupMaterial ?? fasade.userData.backupMaterial

                if (totalWidth === 0) totalWidth = FASADE_WIDTH;
                if (totalHeight === 0) totalHeight = FASADE_HEIGHT;


                let prevWidth, prevHeight

                if (fasadeNdx > 0) {

                    prevWidth = fasadeArray[fasadeNdx - 1].userData.trueSize.FASADE_WIDTH
                    prevHeight = fasadeArray[fasadeNdx - 1].userData.trueSize.FASADE_HEIGHT

                    correctWidth += prevWidth
                    correctHeight += prevHeight

                    totalWidth += FASADE_WIDTH
                    totalHeight += FASADE_HEIGHT
                }

                this.textured({
                    fasade,
                    fasadeNdx,
                    levelNdx,
                    fasadeArray,
                    productBody: BODY,
                    texture,
                    hasMixedTypes,

                    totalWidth,
                    totalHeight,
                    correctWidth,
                    correctHeight,


                    totalLevelHeight,
                    totalLevelHeightCorrect,
                    totalLevelWidth,
                    totalLevelWidthCorrect,
                    elementNdx,

                    columnTotalHeight
                })

                fasade.visible = true
            })

        }
        if (hasDefaultType && !hasMixedTypes) {

            // console.log('hasDefaultType')

            const sortedFasades = [...FASADE].sort((a, b) => {
                const typeA = a.userData.partPosition.FASADE_NUMBER;
                const typeB = b.userData.partPosition.FASADE_NUMBER;
                return typeB - typeA
            });

            if (elementNdx > 0) {
                totalWidth += BODY_WIDTH
                correctWidth += prevElementWidth
            }

            sortedFasades.forEach((fasade, fasadeNdx, fasadeArray) => {

                const { FASADE_HEIGHT, FASADE_WIDTH } = fasade.userData.trueSize
                // fasade.userData.backupMaterial = this.backupMaterial ?? fasade.userData.backupMaterial

                if (totalWidth === 0) totalWidth = FASADE_WIDTH;
                if (totalHeight === 0) totalHeight = FASADE_HEIGHT;

                // console.log(totalHeight, '--COOOOL')

                let prevHeight

                if (fasadeNdx > 0) {
                    prevHeight = fasadeArray[fasadeNdx - 1].userData.trueSize.FASADE_HEIGHT
                    correctHeight += prevHeight
                    totalHeight += FASADE_HEIGHT
                }

                // console.log(totalLevelHeightCorrect, totalLevelHeight, '--DEFCORR')

                this.textured({
                    fasade,
                    fasadeNdx,
                    levelNdx,
                    productBody: BODY,
                    fasadeArray: FASADE,
                    texture,
                    hasMixedTypes,

                    totalWidth,
                    totalHeight,
                    correctWidth,
                    correctHeight,

                    totalLevelHeight,
                    totalLevelHeightCorrect,
                    totalLevelWidth,
                    totalLevelWidthCorrect,
                    elementNdx,

                    columnTotalHeight
                })

                fasade.visible = true
            })
        }

        FASADE_PROPS.forEach(fasade => {
            fasade.SHOW = true
        })
    }

    textured(
        { fasade,
            fasadeNdx,
            fasadeArray,
            productBody,
            texture,
            elementNdx,
            hasMixedTypes,

            totalWidth = 0,
            totalHeight = 0,
            correctWidth = 0,
            correctHeight = 0,

            totalLevelHeight = 0,
            totalLevelHeightCorrect = 0,
            totalLevelWidth = 0,
            totalLevelWidthCorrect = 0,

            totalWidthToString = 0,
            totalHeightToString = 0,
            correctWidthToString = 0,
            correctHeightToString = 0,


            totalWidthToDefault = 0,
            totalHeightToDefault = 0,
            correctWidthToDefault = 0,
            correctHeightToDefault = 0,

            columnTotalHeight = 0,
            levelNdx = 0,


        }: UniformTypes.TTextureProp) {

        const { TYPE_POSITION, WIDTH, FASADE_NUMBER } = fasade.userData.partPosition
        const { FASADE_HEIGHT, FASADE_WIDTH } = fasade.userData.trueSize

        const fasadeCount = fasadeArray.length
        const correctCount = 0.00025
        const textureScale = 0.0005

        // const correctCount = 0.00015
        // const textureScale = 0.0003

        const correctOffset = 8 // Отстум между фасадами "распил"

        let startedWidth: number,
            startedHeight: number,
            continuedWidth: number,
            continuedHeightColumn: number,
            continuedHeightString: number;
        const columnCorrect = columnTotalHeight * 2

        // Базовые расчеты, общие для всех типов

        // const startHeight =  totalLevelHeight + totalLevelHeightCorrect + columnCorrect;
        const startCorrect = elementNdx > 0 ? totalLevelWidthCorrect : 0;
        const startHeightCorrect = levelNdx > 0 ? FASADE_HEIGHT : 0

        // console.log(startHeightCorrect, levelNdx, 'levelNdx')

        const startWidth = FASADE_WIDTH + totalLevelWidth;
        const startHeight = FASADE_HEIGHT + totalLevelHeight + totalLevelHeightCorrect + columnCorrect;

        // Расчет смещения в зависимости от типа и смешанности типов
        if (hasMixedTypes) {


            if (TYPE_POSITION === 'col') {

                startedWidth = (startCorrect * correctCount) + (startWidth * correctCount)
                startedHeight = (startHeight * correctCount)

                if (fasadeNdx > 0) {

                    /** РАБОТАЕТ, но нужно проверить на модулях с несколькими паттернами */
                    continuedHeightColumn = (correctHeightToDefault + totalLevelHeightCorrect) * correctCount + (totalHeightToDefault + totalLevelHeightCorrect) * correctCount
                    continuedWidth = (totalLevelWidthCorrect + FASADE_WIDTH) * correctCount + (totalLevelWidth) * correctCount;
                }
            }

            if (TYPE_POSITION === 'row') {

                startedWidth = (startCorrect * correctCount) + (startWidth * correctCount);
                startedHeight = (startHeight * correctCount);

                continuedWidth = (correctWidthToString + totalLevelWidthCorrect + correctOffset) * correctCount + (totalWidthToString + totalLevelWidth) * correctCount;

                continuedHeightColumn = (correctHeightToString + totalLevelWidthCorrect) * correctCount + (totalHeightToString + totalLevelHeightCorrect) * correctCount;
                continuedHeightString = startHeight * correctCount;
            }
        }

        if (TYPE_POSITION === 'col' && !hasMixedTypes) {

            startedWidth = (startCorrect * correctCount) + (startWidth * correctCount)
            startedHeight = (startHeight * correctCount)

            if (fasadeNdx > 0) {
                continuedHeightColumn = (correctHeight + totalLevelHeightCorrect) * correctCount + (totalHeight + totalLevelHeightCorrect) * correctCount
                continuedWidth = (totalLevelWidthCorrect + FASADE_WIDTH) * correctCount + (totalLevelWidth) * correctCount;
            }
        }

        if ((TYPE_POSITION === 'row' || fasadeCount < 2) && !hasMixedTypes) {

            startedWidth = (startCorrect * correctCount) + (startWidth * correctCount)
            startedHeight = (startHeight * correctCount)

            continuedWidth = (correctWidth + totalLevelWidthCorrect + correctOffset) * correctCount + (totalWidth + totalLevelWidth) * correctCount;

            continuedHeightColumn = (correctHeight + totalLevelWidthCorrect) * correctCount + (totalHeight + totalLevelHeightCorrect) * correctCount
            continuedHeightString = startHeight * correctCount
        }

        fasade.traverse(children => {
            if (children instanceof THREE.Mesh) {
                const cloned = children.material.clone();
                cloned.map = texture.clone();

                if (children.material) {
                    const materials = Array.isArray(children.material) ? children.material : [children.material];

                    materials.forEach(material => {
                        ['map', 'lightMap', 'bumpMap', 'normalMap', 'specularMap'].forEach(mapType => {
                            if (material[mapType]) material[mapType].dispose();
                        });
                        material.dispose();
                    });
                }
                // Применение текстуры с учетом смешанных типов
                if (hasMixedTypes) {
                    // Логика для смешанных типов
                    if (TYPE_POSITION === 'col') {
                        if (fasadeNdx === 0) {
                            cloned.map.matrix.setUvTransform(startedWidth, startedHeight, textureScale, textureScale, 0, 0, 0);
                        } else {
                            cloned.map.matrix.setUvTransform(continuedWidth, continuedHeightColumn, textureScale, textureScale, 0, 0, 0);
                        }
                    }

                    if (TYPE_POSITION === 'row') {
                        if (fasadeNdx === 0) {
                            cloned.map.matrix.setUvTransform(startedWidth, startedHeight, textureScale, textureScale, 0, 0, 0);
                        } else {
                            cloned.map.matrix.setUvTransform(continuedWidth, continuedHeightString, textureScale, textureScale, 0, 0, 0);
                        }
                    }
                }

                if ((TYPE_POSITION === 'row' || fasadeCount < 2) && !hasMixedTypes) {
                    // Логика для STRING или одиночных фасадов
                    if (fasadeNdx === 0) {
                        cloned.map.matrix.setUvTransform(startedWidth, startedHeight, textureScale, textureScale, 0, 0, 0);
                    } else {
                        cloned.map.matrix.setUvTransform(continuedWidth, continuedHeightString, textureScale, textureScale, 0, 0, 0);
                    }
                }

                if (TYPE_POSITION === 'col' && !hasMixedTypes) {
                    // Логика для DEFAULT
                    if (fasadeNdx === 0) {
                        cloned.map.matrix.setUvTransform(startedWidth, startedHeight, textureScale, textureScale, 0, 0, 0);
                    } else {
                        // cloned.map.matrix.setUvTransform(continuedWidth, correctHeight * correctCount + totalHeight * correctCount, textureScale, textureScale, 0, 0, 0);
                        cloned.map.matrix.setUvTransform(continuedWidth, continuedHeightColumn, textureScale, textureScale, 0, 0, 0);
                    }
                }

                cloned.map.matrixAutoUpdate = false;
                cloned.needsUpdate = true;
                // cloned.map.wrapS = cloned.map.wrapT = THREE.RepeatWrapping;
                children.material = cloned;
                children.material.needsUpdate = true;
            }
        });

        return correctWidth;
    }

    flattenArray(arr: UniformTypes.LevelItem[]) {
        return arr.reduce((acc, item) => {
            // Проверяем, есть ли свойство columnItems в объекте
            if ('columnItems' in item && Array.isArray(item.columnItems)) {
                // Если есть вложенный массив, рекурсивно обрабатываем его
                acc.push(...this.flattenArray(item.columnItems));
            } else {
                // Иначе добавляем объект в аккумулятор
                acc.push(item);
            }
            return acc;
        }, [] as UniformTypes.LevelItem[]); // Явно указываем тип аккумулятора
    }

    flatedArrayToWidth = (arr: UniformTypes.LevelItem[]) => {

        return arr.reduce((acc, item) => {

            if ('columnItems' in item && Array.isArray(item.columnItems)) {
                // Если есть вложенный массив, рекурсивно обрабатываем его
                const maxWidth = item.columnItems.sort((a, b) => {
                    return a.userData.PROPS.BODY.userData.trueSize.BODY_WIDTH - b.userData.PROPS.BODY.userData.trueSize.BODY_WIDTH
                })[0]

                acc.push(...this.flatedArrayToWidth([maxWidth]));
            } else {
                // Иначе добавляем объект в аккумулятор
                acc.push(item);
            }
            return acc;
        }, [] as UniformTypes.LevelItem[]).flat();
    }

    getMaxLevelHeight(level) {

        const flatedLevel = this.flattenArray(level)

        const maxHeight = flatedLevel.sort((a, b) => {
            const height1 = a.userData.PROPS.BODY.userData.trueSize.BODY_HEIGHT;
            const height2 = b.userData.PROPS.BODY.userData.trueSize.BODY_HEIGHT;
            return height2 - height1
        })[0].userData.PROPS.BODY.userData.trueSize.BODY_HEIGHT - 4

        return maxHeight
    }

    getMaxLevelWidth(level) {

        const flatedLevel = this.flatedArrayToWidth(level)

        let totalLevelWidth = 0
        // console.log(flatedLevel, '--flatedLevel')
        flatedLevel.forEach(item => {
            totalLevelWidth += item.userData.PROPS.BODY.userData.trueSize.BODY_WIDTH - 4
        })
        return totalLevelWidth
    }

}