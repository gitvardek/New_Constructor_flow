//@ts-nocheck
import * as THREE from 'three'
import * as THREETypes from "@/types/types"
import * as UniformTypes from '@/types/uniformTextureTypes'

import { UniformTextureUtils } from './UniformTextureUtils/UniformTextureUtils';


export class UniformTextureBuilder extends UniformTextureUtils {

    root: THREETypes.TApplication
    parent: THREETypes.TBuildProduct
    resources: THREETypes.TResources
    helper: THREETypes.TCustomBoxHelper


    private uniformGroups: UniformTypes.TUniform[] = []
    private temporaryGroups: THREE.Object3D[] | UniformTypes.LevelItem[][] = []
    private temporaryCheckSizesGroup: THREE.Object3D[] | UniformTypes.LevelItem[][] = []
    private groupsBoxHelper: THREE.BoxHelper[] = [];

    backupMaterial: THREE.MeshPhongMaterial | THREE.MeshStandardMaterial | null = null
    backupFasadId: number | null = null

    maxGroupWidth: number = 0
    maxGroupHeight: number = 0
    currentGroupWidth: number = 0
    currentGroupHeight: number = 0


    // private onCreateTexture: (group: UniformTypes.LevelItem[][], texture: THREE.Texture) => void

    constructor(root: THREETypes.TApplication, parent: THREETypes.TBuildProduct) {
        super(root)
        this.root = root
        this.resources = root._resources!
        this.parent = parent
        this.helper = this.root._customBoxHelper!
    }

    /** Создание группы */

    get _uniformGroups() {
        return this.uniformGroups
    }

    get _groupsBoxHelper() {
        return this.groupsBoxHelper
    }

    set _groupsBoxHelper(value) {
        this.groupsBoxHelper = value
    }

    loadUniformGroup(groups: UniformTypes.TUniformGroupMembership[]) {

        if (groups.length < 1) return;

        groups.forEach(group => {

            const { id, objects, fasadId, color } = group

            const fasad = objects[0].userData.PROPS.CONFIG.UNIFORM_TEXTURE.backupFasadId ?? fasadId
            this.backupFasadId = fasad

            const fasadeData = this.parent._FASADE[fasad]

            const maxHeight = fasadeData.MAX_HEIGHT
            const maxWidth = fasadeData.MAX_WIDTH

            this.crteateUniformGroup({ objects, id, maxHeight, maxWidth, fasadeId: fasad, groupColor: color })
            this.helper.hideGroupBox(this.groupsBoxHelper) // Скрываем helper переходящего рисунка


        })


        // let organizedLevels = this.uniformExtremes.sortObjectsByLevels(this.temporaryGroups as THREE.Object3D[])
    }

    crteateUniformGroup({ objects, id, maxHeight, maxWidth, fasadeId, groupColor }) {

        let organizedLevels, indexedParts, groupId, fasad

        if (objects) {

            organizedLevels = this.uniformExtremes.sortObjectsByLevels(objects as THREE.Object3D[])
            indexedParts = this.assignGroupIndex({ array: organizedLevels, id, groupColor })
            groupId = id
            fasad = fasadeId
        }
        else {

            organizedLevels = this.uniformExtremes.sortObjectsByLevels(this.temporaryGroups as THREE.Object3D[])

            indexedParts = this.assignGroupIndex({ array: organizedLevels, id: this.uniformGroups.length })

            groupId = this.uniformGroups.length > 0 ? this.uniformGroups[this.uniformGroups.length - 1].id + 1 : this.uniformGroups.length
            fasad = this.backupFasadId
        }


        const newGroup = {
            id: groupId,
            parts: indexedParts.group,
            fasadeId: fasad,
            groupSize: {
                maxWidth: maxWidth ?? this.maxGroupWidth,
                maxHeight: maxHeight ?? this.maxGroupHeight,
                currentWidth: this.currentGroupWidth,
                currentHeight: this.currentGroupHeight
            },
            color: indexedParts.color
        };

        // Создаём новый массив с добавленной группой
        const updatedGroups = [...this.uniformGroups, newGroup];
        this.uniformGroups = updatedGroups; // Обновляем локальное состояние


        this.createTexture.loadTexture(this.createTexture.onCreateTexture, newGroup.parts)

        this.uniformEvents.uniformState.setUniformGroups(updatedGroups); // Обновляем состояние в хранилище

        // Очищаем временные группы
        this.clearTemporaryGroups();
        //-------------------------
        this.uniformEvents.desablePreGrouping() // Отключаем предварительный выбор объектов в новую группу

        this.maxGroupWidth = 0
        this.maxGroupHeight = 0

        this.currentGroupWidth = 0
        this.currentGroupHeight = 0
        this.backupMaterial = null
        this.backupFasadId = null

    }

    /** удаление группы */
    deliteUniformGroup(id: number) {
        // Создаём новый массив без удалённой группы

        let updatedGroups = this.uniformGroups.map(element => {


            if (element.id === id && element.parts.length > 0) {

                const flatedUniformGroup = this.createTexture.flattenArray(element.parts.flat())

                // console.log(flatedUniformGroup, 'DEL GROUP')

                flatedUniformGroup.forEach((item) => {

                    this.groupsBoxHelper = this.helper.removeGroupBox(item, this.groupsBoxHelper)

                    const { CONFIG } = item!.userData.PROPS
                    const { UNIFORM_TEXTURE } = CONFIG

                    UNIFORM_TEXTURE.group = null
                    UNIFORM_TEXTURE.level = null
                    UNIFORM_TEXTURE.index = null
                    UNIFORM_TEXTURE.column_index = null
                    // UNIFORM_TEXTURE.backupFasadId = null
                    UNIFORM_TEXTURE.color = null


                    this.restoreFasadeTexture(item) //Восстанавливаем материал

                })
            }

            return element
        }).filter((group) => {
            return group.id !== id
        });

        this.uniformGroups = updatedGroups; // Обновляем локальное состояние
        this.uniformEvents.uniformState.setUniformGroups(updatedGroups); // Обновляем состояние в хранилище

    }

    /** Подготовка к группированию */

    async preGrouping(product: THREE.Object3D) {

        const { CONFIG, FASADE } = product.userData.PROPS
        const { UNIFORM_TEXTURE, FASADE_PROPS } = CONFIG

        const start = this.createUniformFasadesData(product)

        const fasadeListLimit = start.filter((element) => element.NAME === 'Шпон Вардек 19мм')[0].FASADES

        const limited = FASADE_PROPS.reduce((acc, el) => {

            acc.push(fasadeListLimit.includes(el.COLOR))
            return acc
        }, []).includes(true)


        const fasaded = FASADE_PROPS.filter((element) => element.COLOR !== null && element.COLOR !== 7397).length > 0

        let totalHeight = 0
        let totalWidth = 0
        let levelsWidth: number[] = []


        if (UNIFORM_TEXTURE.group != null) {
            alert(`Объект уже принадлежит группе ${UNIFORM_TEXTURE.group + 1}`)
            return
        }

        if (!(this.temporaryGroups.length > 0) && !fasaded) {
            alert(`Для создания новой группы, у первого выбранного элемента должен быть фасад`)
            return
        }

        if (!limited && this.backupFasadId === null) {
            alert(`Переходящий рисунок можно создать только для материалов из списка Шпон Вардек 19мм`)
            return
        }

        this.backupFasadId = this.backupFasadId ?? FASADE_PROPS.filter(element => parseInt(element.COLOR) !== 7397)[0].COLOR  // Создаём общий индекс материала фасада
        const rootFasadeData = this.parent._FASADE[this.backupFasadId as number]

        if (rootFasadeData.MAX_WIDTH === null) {
            alert(`Выбранный фасад не может иметь переходящий рисунок`)
            this.backupFasadId = null
            return
        }

        this.backupMaterial = this.backupMaterial ?? await this.getBackupTexture(rootFasadeData) as THREE.MeshPhongMaterial | THREE.MeshStandardMaterial | null; // Создаём общий материала фасада
        const bigTexturePath = rootFasadeData.BIG_PICTURE ?? ''
        this.createTexture.setTexture(bigTexturePath)

        this.maxGroupHeight = rootFasadeData.MAX_HEIGHT ?? this.maxGroupHeight
        this.maxGroupWidth = rootFasadeData.MAX_WIDTH ?? this.maxGroupWidth


        const updatedGroups = (this.temporaryGroups as THREE.Object3D[]).filter((element) => {
            return element.uuid !== product.uuid
        });

        const preUpdatedGroups = (this.temporaryCheckSizesGroup as THREE.Object3D[]).filter((element) => {
            return element.uuid !== product.uuid
        });

        // Проверка по Height и Width 

        if (preUpdatedGroups.length === this.temporaryCheckSizesGroup.length) {
            // Если объект не был удален, добавляем его в массив
            (this.temporaryCheckSizesGroup as THREE.Object3D[]).push(product);
        } else {
            // Если объект был удален, обновляем массив
            this.temporaryCheckSizesGroup = preUpdatedGroups as THREE.Object3D[];
        }

        const preLevaled = this.uniformExtremes.sortObjectsByLevels(this.temporaryCheckSizesGroup as THREE.Object3D[])

        preLevaled.forEach(level => {
            this.createTexture.getMaxLevelWidth(level)
            levelsWidth.push(this.createTexture.getMaxLevelWidth(level))
            totalHeight += this.createTexture.getMaxLevelHeight(level)
        })

        // console.log(levelsWidth)

        totalWidth = Math.max(...levelsWidth);

        // console.log(totalWidth, totalHeight, '--TTWH')
        // console.log(this.maxGroupHeight, this.maxGroupWidth, '--MMWH')


        //--------------------------------------------------------------------------------------------------

        if (totalHeight > this.maxGroupHeight || totalWidth > this.maxGroupWidth) {

            alert(`Допустимая высота и ширина элементов не должна превышать высота: ${this.maxGroupHeight} см, ширина: ${this.maxGroupWidth},
                 сечас высота составляет ${this.currentGroupHeight} см, ширина ${this.currentGroupWidth} `)

            this.temporaryCheckSizesGroup = this.temporaryGroups
            return
        }

        if (updatedGroups.length === this.temporaryGroups.length) {
            // Если объект не был удален, добавляем его в массив
            (this.temporaryGroups as THREE.Object3D[]).push(product);
        } else {
            // Если объект был удален, обновляем массив
            this.temporaryGroups = updatedGroups as THREE.Object3D[];
        }

        this.currentGroupHeight = totalHeight
        this.currentGroupWidth = totalWidth
        // console.log(this.temporaryGroups)
        this.uniformEvents.uniformState.setPreGroup(this.temporaryGroups.length); // Отправляем значение для отображения кнопки "создать"

    }

    /** Добавление индекса группы продукту */

    assignGroupIndex(
        {
            array,
            id,
            fasadId,
            groupColor
        }: {
            array: UniformTypes.LevelItem[][],
            id: number,
            fasadId?: number,
            groupColor?: string
        }): { group: UniformTypes.LevelItem[][], color: string } {
        // Создаём цвет группы или присваиваем
        const color = groupColor ?? this.createRandomColor()

        array.forEach((level, levelNdx) => {

            level.forEach((item, itemNdx) => {

                if ('columnItems' in item) {

                    item.columnItems.forEach((product: THREE.Object3D, column_index: number) => {
                        // product.userData.backupFasadId = this.createTexture.backupFasadId ?? product.userData.backupFasadId // Присваиваем индекс материала фасада
                        const { CONFIG } = product.userData.PROPS
                        const { UNIFORM_TEXTURE } = CONFIG
                        UNIFORM_TEXTURE.group = id
                        UNIFORM_TEXTURE.level = levelNdx
                        UNIFORM_TEXTURE.index = itemNdx
                        UNIFORM_TEXTURE.column_index = column_index
                        UNIFORM_TEXTURE.backupFasadId = UNIFORM_TEXTURE.backupFasadId ?? this.backupFasadId ?? fasadId
                        UNIFORM_TEXTURE.color = color

                        if (!('groupBoxHelper' in product.userData)) {
                            this.helper.createGroupBox({ object: product, color, store: this.groupsBoxHelper })
                        }
                        else if (product.userData.groupBoxHelper === null) {
                            this.helper.createGroupBox({ object: product, color, store: this.groupsBoxHelper })
                        }
                    })
                }

                else {
                    // item.userData.backupFasadId = this.createTexture.backupFasadId ?? item.userData.backupFasadId // Присваиваем индекс материала фасада
                    const { CONFIG } = item.userData.PROPS
                    const { UNIFORM_TEXTURE } = CONFIG
                    UNIFORM_TEXTURE.group = id
                    UNIFORM_TEXTURE.level = levelNdx
                    UNIFORM_TEXTURE.index = itemNdx
                    UNIFORM_TEXTURE.column_index = null
                    UNIFORM_TEXTURE.backupFasadId = UNIFORM_TEXTURE.backupFasadId ?? this.backupFasadId ?? fasadId
                    UNIFORM_TEXTURE.color = color


                    if (!('groupBoxHelper' in item.userData)) {
                        this.helper.createGroupBox({ object: item, color, store: this.groupsBoxHelper })
                    }
                    else if (item.userData.groupBoxHelper === null) {
                        this.helper.createGroupBox({ object: item, color, store: this.groupsBoxHelper })
                    }
                }

            })
        });

        return { group: array, color }
    }

    // Создание массива подходящих фасадов 

    createUniformFasadesData(element) {

        const product = this.parent._PRODUCTS[element.userData.globalData].FACADE

        this.uniformEvents.modelState.clearCurrentModelFasadesData(); // Очищаем предыдущие данные
        this.uniformEvents.modelState.createCurrentModelFasadesData({ data: product }) // Создаём новые данные

        const fasades = this.uniformEvents.modelState.getCurrentModelFasadesData  // Получаем новые данные
        const fasadesClone = JSON.parse(JSON.stringify(fasades)) as {
            NAME: string,
            FASADES: number[],
        }[] // Клонируем


        this.uniformEvents.modelState.clearCurrentModelFasadesData();

        const uniformedFasadesData = fasadesClone
            .reduce<{
                NAME: string,
                FASADES: number[],
            }[]>((acc, item) => {
                // return acc.concat(item.FASADES)
                const filtered = item.FASADES.filter(element => {
                    return this.parent._FASADE[element].MAX_HEIGHT !== null
                })

                if (filtered.length > 0) {
                    const correctedResult = [{
                        NAME: item.NAME,
                        FASADES: filtered
                    }];
                    return acc.concat(correctedResult);
                }

                return acc

            }, [])

        return uniformedFasadesData
    }

    /** Добавить к группе */
    addToUniformGroup(product: THREE.Object3D, group?: number) {
        // console.log('ADD')

        let totalHeight = 0
        let totalWidth = 0
        let levelsWidth: number[] = []

        const { CONFIG, FASADE } = product.userData.PROPS
        const { UNIFORM_TEXTURE } = CONFIG

        const groupId = this.uniformEvents._groupIdToCorrect ?? group

        let currentGroup = this.uniformGroups.find(group => {
            return group.id === groupId
        })

        let groupSize = currentGroup!.groupSize
        let fasadeId = currentGroup!.fasadeId
        let color = currentGroup!.color


        const { maxWidth, maxHeight, currentWidth, currentHeight } = groupSize


        /**Проверки-------------------- */

        // -------- На принадлежность группе ------------

        if (UNIFORM_TEXTURE.group !== null) {
            alert(`Объект уже пренадлежит группе ${UNIFORM_TEXTURE.group + 1}`)
            return
        }

        // -------- На соответствие максимальным размерам  ------------

        let preFlated: THREE.Object3D[] | UniformTypes.LevelItem[] | null = [...this.createTexture.flattenArray(currentGroup!.parts.flat())].sort()
        preFlated.push(product)

        const preLevaled = this.uniformExtremes.sortObjectsByLevels(preFlated as THREE.Object3D[])

        preLevaled.forEach(level => {
            this.createTexture.getMaxLevelWidth(level)
            levelsWidth.push(this.createTexture.getMaxLevelWidth(level))
            totalHeight += this.createTexture.getMaxLevelHeight(level)
        })

        totalWidth = Math.max(...levelsWidth);


        if (totalHeight > maxHeight || totalWidth > maxWidth) {
            alert(`Допустимая высота и ширина элементов не должна превышать высота: ${maxHeight} см, ширина: ${maxWidth}, сечас высота составляет ${currentHeight} см, ширина ${currentWidth} см `)
            return
        }

        preFlated = null

        /**-------------------------------------------- */


        let flatedUniformGroup = this.createTexture.flattenArray(currentGroup!.parts.flat())

        flatedUniformGroup = [...flatedUniformGroup, product]

        const organizedLevels = this.uniformExtremes.sortObjectsByLevels(flatedUniformGroup as THREE.Object3D[])
        const indexedParts = this.assignGroupIndex(
            {
                array: organizedLevels,
                id: groupId,
                fasadId: fasadeId,
                groupColor: color
            })

        // console.log(indexedParts, '1')
        // console.log(indexedParts[0], 'arrayWithOriginals')


        currentGroup!.parts = indexedParts.group

        // console.log(currentGroup.parts, currentGroup, 'parts_2')

        groupSize.currentHeight = totalHeight
        groupSize.currentWidth = totalWidth

        this.createTexture.loadTexture(this.createTexture.onCreateTexture, indexedParts.group)

    }

    /** Удалить из группы */
    removeFromUniformGroup(product: THREE.Object3D) {
        // console.log('REMOVE')

        if (this.uniformGroups.length < 1) return

        const { CONFIG, FASADE } = product.userData.PROPS
        const { UNIFORM_TEXTURE } = CONFIG

        const groupId = this.uniformEvents._groupIdToCorrect ?? UNIFORM_TEXTURE.group

        let currentGroup = this.uniformGroups.find(group => {
            return group.id === groupId
        })


        const flatedUniformGroup = this.createTexture.flattenArray(currentGroup!.parts.flat())

        if (UNIFORM_TEXTURE.level === null) return


        // Убираем объект из уровня
        const updatedGroups = (flatedUniformGroup as THREE.Object3D[]).filter((element) => {
            return element.uuid !== product.uuid
        });

        // Если в уровне нет объектов, удаляем уровень
        if (updatedGroups.length < 1) {
            this.deliteUniformGroup(groupId)
            return
        }

        // Пересоздаём уровень
        const organizedLevels = this.uniformExtremes.sortObjectsByLevels(updatedGroups as THREE.Object3D[])
        const indexedParts = this.assignGroupIndex(
            {
                array: organizedLevels,
                id: groupId
            })

        currentGroup!.parts = indexedParts.group

        UNIFORM_TEXTURE.group = null
        UNIFORM_TEXTURE.level = null
        UNIFORM_TEXTURE.index = null
        UNIFORM_TEXTURE.column_index = null
        UNIFORM_TEXTURE.color = null

        this.groupsBoxHelper = this.helper.removeGroupBox(product, this._groupsBoxHelper)


        // Воccтанавливаем изначальный материал
        this.restoreFasadeTexture(product);
        // Пересобираем группу
        this.createTexture.loadTexture(this.createTexture.onCreateTexture, indexedParts.group);




    }

    async restoreFasadeTexture(product: THREE.Object3D) {

        const { CONFIG, FASADE } = product.userData.PROPS
        const { FASADE_PROPS, UNIFORM_TEXTURE } = CONFIG
        // const backupMaterial =  await this.getBackupTexture(this.parent._FASADE[UNIFORM_TEXTURE.backupFasadId])

        FASADE.forEach(async (fasade: THREE.Object3D) => {
            // const backupMaterial = fasade.userData.backupMaterial.clone()
            const backupMaterial = await this.getBackupTexture(this.parent._FASADE[UNIFORM_TEXTURE.backupFasadId])


            fasade.traverse(children => {
                if (children instanceof THREE.Mesh && children.material) {
                    if (children.userData.type === 'glass') return
                    const materials = Array.isArray(children.material) ? children.material : [children.material];

                    materials.forEach(material => {
                        ['map', 'lightMap', 'bumpMap', 'normalMap', 'specularMap'].forEach(mapType => {
                            if (material[mapType]) material[mapType].dispose();
                        });
                        material.dispose();
                    });

                    children.material = backupMaterial;
                    children.material.needsUpdate = true;
                }
            });

        })

        FASADE_PROPS.forEach(prop => {
            prop.COLOR = UNIFORM_TEXTURE.backupFasadId
        })

        UNIFORM_TEXTURE.group = null
        UNIFORM_TEXTURE.level = null
        UNIFORM_TEXTURE.index = null
        UNIFORM_TEXTURE.column_index = null
        // Убираем ID фасада после очистки
        UNIFORM_TEXTURE.backupFasadId = null

    }

    async createBackupTexture(data) {

        const { TEXTURE, TEXTURE_HEIGHT, TEXTURE_WIDTH } = data;

        return new Promise((resolve, reject) => {

            this.parent.resources.startLoading(TEXTURE, 'texture', (file) => {
                if (file === false) {
                    reject(new Error('Failed to load texture'));
                    return;
                }

                const material = new THREE.MeshStandardMaterial();
                file.colorSpace = THREE.SRGBColorSpace;
                material.map = file;

                material.map!.wrapS = material.map!.wrapT = THREE.RepeatWrapping;
                material.map!.repeat.set(
                    1 / TEXTURE_WIDTH,
                    1 / TEXTURE_HEIGHT
                );
                material.map!.offset.set(0.5, 0.5);

                // Разрешаем Promise с созданным материалом
                resolve(material);
            });
        });
    }

    async getBackupTexture(data) {
        try {
            const material = await this.createBackupTexture(data);
            // console.log('Material created:', material);
            return material

        } catch (error) {
            console.error('Error creating backup texture:', error);
        }
    }

    clearTemporaryGroups() {
        this.temporaryGroups = []
        this.temporaryCheckSizesGroup = []
    }

    clearUniformGroups() {
        this.uniformGroups = []
        this.helper.clearGroupBoxStore(this.groupsBoxHelper)
        this.maxGroupWidth = 0
        this.maxGroupHeight = 0
        this.currentGroupWidth = 0
        this.currentGroupHeight = 0
    }


    createRandomColor() {

        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);

        // Возвращение цвета в формате RGB
        return `rgb(${r}, ${g}, ${b})`;
    }

}