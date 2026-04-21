//@ts-nocheck

import * as THREETypes from "@/types/types"
import { GlobalsData } from "./Globals"
import { useAppData } from "@/store/appliction/useAppData"
import { useSceneState } from "@/store/appliction/useSceneState"
import { useModelState } from "@/store/appliction/useModelState"
import { unwatchFile } from "fs"

import { TFasadeProp, IProductFull, FasadeTextAlignAction } from "@/types/types"

export class Filters extends GlobalsData {

    root: THREETypes.TApplication
    trafficManager: THREETypes.TTrafficManager | null = null

    private project = useSceneState().getCurrentProjectParams;
    private modelState = useModelState()

    constructor(root: THREETypes.TApplication) {
        super();
        this.root = root
    }

    filterProductFasade(items) {

        const groupedFasades = {};

        items.forEach(facadeId => {
            const facade = this._FASADE[facadeId];

            if (!facade) return;

            const section = this._FASADE_SECTION[facade.IBLOCK_SECTION_ID];
            if (!section || !section.UF_GROUP) return;

            const groupId = section.UF_GROUP;

            if (!groupedFasades[groupId]) {
                groupedFasades[groupId] = [];
            }


            groupedFasades[groupId].push(facadeId);

        });

        // Формирование итогового массива
        const result = Object.entries(this._FASADE_GROUPS).map(([groupId, group]) => ({
            NAME: group.NAME,
            FASADES: groupedFasades[groupId] || [],
        })).filter(group => group.FASADES.length > 0 && group.NAME !== 'Без фасада');

    }

    filteFasadeColor(items: THREETypes.TObject) {
        return items.filter((colorId: number) => this._FASADE[colorId]).sort((a, b) => a.SORT - b.SORT);
    }

    filterFasadePosition(params: THREETypes.TObject, product: THREETypes.TObject) {

        const { FASADE_PROPS, ELEMENT_TYPE, FASADE_SIZE, FILLING, MODELID, MODEL } = params

        FASADE_PROPS.length = 0;

        let sortFasadePositionList = [];
        const fasadePositionList = product.FASADE_POSITION

        if (!fasadePositionList) return

        const fasadeSorted = fasadePositionList.sort((a, b) => this._FASADE_POSITION[a].FASADE_NUMBER - this._FASADE_POSITION[b].FASADE_NUMBER);
        console.log(fasadeSorted, '=== fasadeSorted ===')
        const fasadeTypeSorted = fasadeSorted.reduce((acc, index) =>
            acc.concat(this._FASADE_POSITION[index]?.fasade_type || []),
            []);


        params.FASADE_TYPE = fasadeTypeSorted

        const hasDrower = fasadeSorted.some(el => {
            return this._FASADE_POSITION[el].drawer
        })

        if (Object.keys(FASADE_SIZE).length > 0) {
            Object.values(FASADE_SIZE).forEach((el, key) => {
                sortFasadePositionList.push(Object.values(el)[0])
            })
        }
        else {
            sortFasadePositionList = fasadeSorted
        }

        //Фильтрация фасадов на принадлежность текущей компоновке
        if (FILLING)
            sortFasadePositionList = sortFasadePositionList.filter((value, index) => {


                let fasade = this._FASADE_POSITION[value]

                if (fasade.filling.length && fasade.filling[0]) {
                    if (fasade.filling.includes(FILLING))
                        return value
                }
                else
                    return value
            })

        sortFasadePositionList.forEach((fasade: number, key: number) => {


            const curFasade = fasade.ID ? fasade.ID : fasade
            const fasadePosition = this._FASADE_POSITION[curFasade]
            const fasadePositionType = fasadePosition.fasade_type
            let handlerPosition = null

            const prodTypeData = this._FASADETYPE[params.FASADE_TYPE[key]]
            const fasTypeData = this._FASADETYPE[fasadePositionType[0]]

            const handleInDorPosition = () => {

                if (!ELEMENT_TYPE && product.fasade_type.length > 1 && MODEL.length == 1) return 0

                if (sortFasadePositionList.length < 2 || params.FASADE_TYPE.includes(null)) {
                    return FasadeTextAlignAction[fasTypeData.CODE]
                }

                if (hasDrower && key % 2 !== 0 && ELEMENT_TYPE.includes('up')) return 8
                if (hasDrower && key % 2 === 0 && ELEMENT_TYPE.includes('up')) return 6

                if (!hasDrower && key % 2 === 0 && ELEMENT_TYPE.includes('up')) return 8
                if (!hasDrower && key % 2 !== 0 && ELEMENT_TYPE.includes('up')) return 6

                if (hasDrower && key % 2 !== 0 && ELEMENT_TYPE.includes('down')) return 2
                if (hasDrower && key % 2 === 0 && ELEMENT_TYPE.includes('down')) return 0

                if (!hasDrower && key % 2 === 0 && ELEMENT_TYPE.includes('down')) return 2
                if (!hasDrower && key % 2 !== 0 && ELEMENT_TYPE.includes('down')) return 0

            }

            if (fasTypeData && fasTypeData.CODE) {
                handlerPosition = fasadePosition.drawer ? FasadeTextAlignAction[fasTypeData.CODE] : handleInDorPosition()
            }

            const fasadeNumber = fasadePosition.FASADE_NUMBER - 1

            const fasad = FASADE_PROPS[fasadeNumber]?.TYPE ?? this.project.default_fasade_color ?? 7397;
            const handles = this.project.default_handles
            const sizes = fasade.FASADE_SIZE ?? null

            const fasadeProps: TFasadeProp = {
                /** --- FASADE_PROPS ---*/
                COLOR: this.project.default_fasade_color!,
                SHOW: false,
                POSITION: fasadePosition.ID,
                RESET_COLOR: fasad,
                MILLING: null,
                MILLING_TYPE: null,
                PALETTE: null,
                SHOWCASE: null,
                ALUM: null,
                GLASS: null,
                PATINA: null,
                TYPE: null,
                HANDLES: {
                    id: handles!,
                    position: handlerPosition,
                    drawer: fasadePosition.drawer
                },
                SIZES: {
                    id: sizes,
                    params: {}
                },
                DRAWER: {
                    drawer: fasadePosition.drawer,
                    buildIn: fasadePosition.built_in
                },
                MECHANISM: null,
            }

            FASADE_PROPS.push(fasadeProps)
        })

    }

    filterFilling(items: number[], product: IProductFull) {
        let tmp = [];

        if (product.ID != undefined) {
            for (let i in items) {
                let item = items[i];

                if (
                    product.ID.indexOf(item.ID) != -1
                )
                    tmp.push(item);
            }
        }
        return tmp.sort(function (a, b) {
            return a.SORT - b.SORT;
        });

    };

    filterFasadeSizer(items: number[], product: IProductFull) {

        const fasadeSize = this._FASADESIZE;
        const fasadeNumberSize = this._FASADENUMBERSIZE;

        const result: Record<number | string, number[]> = {};


        // Перебираем все элементы массива items
        items.forEach((size, ndx) => {


            if (size === null) return

            // Для каждого размера проходим по фасадным элементам
            Object.entries(fasadeNumberSize[size]).forEach(([key, fasadeSizeIds]: any[]) => {

                // Фильтруем только те фасадные элементы, которые существуют в fasadeSize
                const validFasadeIds = fasadeSizeIds.filter((fasadeSizeId: any) => fasadeSize[fasadeSizeId]);
                if (!validFasadeIds.length > 0) return

                // Если ключ уже существует, используем существующий массив, иначе создаем новый
                result[size] = result[key] || [];
                // Добавляем отфильтрованные фасады в массив
                result[size].push(...validFasadeIds);
                // Сортируем массив по полю SORT
                result[size].sort((a: any, b: any) => fasadeSize[a].SORT - fasadeSize[b].SORT);

            });

            const convert = this.groupSizers(result[size], product)
            result[size] = convert
        });


        return result;


        // const result = items
        //     // Преобразуем объект в массив и разворачиваем его, получая плоский массив значений
        //     .flatMap(size => {
        //         // Получаем массив фасадов для данного размера, если он существует
        //         return fasadeNumberSize[size]?.[number as number] || [];
        //     })
        //     // Фильтруем элементы, оставляя только те, у которых существует ID фасада
        //     .filter(fasadeSizeId => fasadeSize[fasadeSizeId])
        //     // Сортируем фасады по их значению сортировки (SORT)
        //     .sort((a, b) => fasadeSize[a].SORT - fasadeSize[b].SORT);
        //     console.log(result, 'result-2')

        // return result;
    }

    filterModuleColor(items: THREETypes.TObject) {
        // return items.filter((colorId: number) => this._FASADE[colorId]);

        const validIds = items.filter((id: number) => this._FASADE[id]);

        // Один раз проходим по всем фасадам и сохраняем их SORT группы
        const sortCache = new Map<number, number>();

        validIds.forEach(facadeId => {
            const facade = this._FASADE[facadeId];
            if (!facade) return;

            const section = this._FASADE_SECTION[facade.IBLOCK_SECTION_ID];
            const groupId = section?.UF_GROUP;
            const group = groupId ? this._FASADE_GROUPS[groupId] : null;

            sortCache.set(facadeId, group?.SORT ?? 99999);
        });

        // Теперь сортировка — просто чтение из Map (O(1))
        return validIds.sort((a, b) => {
            return (sortCache.get(a) ?? 99999) - (sortCache.get(b) ?? 99999);
        });
    }

    filterUslugi(product_uslugi: number[], product_data: IProductFull) {

        const profileExept = 251698 // - U-угол: дефолтное  значение 
        const getFilteredData = (data, profile = false) => {
            const filtered = data.filter(el => this._USLUGI[el])

            return filtered.reduce((acc, el) => {
                const visible = this._USLUGI[el].ID != 98683 // ID Услуги распил
                let value = profile && el === profileExept
                acc.push({ ...this._USLUGI[el], visible: visible, value: value })
                return acc

            }, [])
        }

        const uslugi = getFilteredData(product_uslugi)
        const profile = getFilteredData(product_data.profile, true)

        return { uslugi, profile }

    }

    filterOption(option: number[]) {

        let curOptionsList = option
            .map(el => this._OPTION[el])
            .filter(Boolean);

        const result = curOptionsList.map(el => {

            const groupName = el.GROUP ?? ''
            return { id: el.ID, active: false, group: groupName, section: el.IBLOCK_SECTION_ID?.[0], close: el.CLOSE_OTHER_OPTIONS, visible: true }
        })

        return result
    }

    groupSizers(el: number[], product: IProductFull) {
        const fasadePos = product.FASADE_POSITION

        const maped = el.map(size => {
            const key = fasadePos.find(pos => this._FASADE_POSITION[pos].FASADE_SIZE === size)
            return this._FASADE_POSITION[key]

        })

        const result = maped.reduce((object, value, index) => {
            return { ...object, [value.FASADE_SIZE]: value };
        }, {});

        return result
    }

    filterProductInfo(id) {
        let info = this._PRODUCTS[id]

        if (!info) {
            info = this.disabledProducts[id]

            if (info?.ALTERNATIVE_PRODUCT?.[0]) {
                for (let i = 0; i < info.ALTERNATIVE_PRODUCT.length; i++) {
                    if (this._PRODUCTS[info.ALTERNATIVE_PRODUCT[i]]) {
                        info = this._PRODUCTS[info.ALTERNATIVE_PRODUCT[i]]
                        break;
                    }
                }
            }

        }

        if (info)
            info = Object.assign({}, info)

        return info;
    }

} 