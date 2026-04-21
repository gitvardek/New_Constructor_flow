//@ts-nocheck
import * as THREE from "three"
import { FasadeTextAlignAction } from "@/types/types";
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useAppData } from './useAppData';
import { TFasadeItem } from "@/types/types";
import { MILLINGS, additionalMillingKeys, MILLING_HANDLE_KEYS, INTEGRATE_HANDE_EXEPTIONS } from '@/Application/F-millings';
import { number } from "yup";
import {UM_PARAMS} from "@/components/UMconstructor/utils/Const.ts";

export type TFasadeGroupSize = {

    MAX_HEIGHT: number,
    MAX_WIDTH: number,
    MIN_HEIGHT: number,
    MIN_WIDTH: number,

}

export interface IProductFasades {
    NAME: string,
    FASADES: number[],
    SORT: number,
    GROUP_SIZE: TFasadeGroupSize

}

interface IFasadeGroups {
    ID: number,
    NAME: string,
    SORT: number
}

interface IPalette {
    ID: number,
    NAME: string,
    TYPE: string,
    UNAME: string,
    HTML: string,
    PREVIEW_PICTURE: string | null,
    DETAIL_PICTURE: string | null
}

interface IMilling {
    ID: number,
    NAME: string,
    IBLOCK_SECTION_ID: number,
    DETAIL_PICTURE: string,
    PREVIEW_PICTURE: string,
    SORT: number,
    FACADEALIGNSELECT: number,
    PATINAOFF: number,
    MODEL: null,
    INCITY: null | string | number[],
    CITY: null | string | number[],
    delay_date: null | number,
    date_shipment: null | string | number,
    date_build: null | string | number,
    type_showcase: null | string | number[],
    fasade_type: null | string | number[],
    DENSITY: null
}

export type TMillingListItem = {
    name: string;
    imgSrc: string;
    ID: number;
    fasade_type: number[];
}

export const useModelState = defineStore('ModelState', () => {

    const appStore = useAppData()
    const _APP = computed(() => appStore.getAppData || {})

    const _COLOR = computed(() => _APP.value.COLOR || [])
    const _FASADE = computed(() => _APP.value.FASADE || [])
    const _FASADESIZE = computed(() => _APP.value.FASADESIZE || [])
    const _FASADENUMBERSIZE = computed(() => _APP.value.FASADENUMBERSIZE || [])
    const _FASADE_SECTION = computed(() => _APP.value.FASADE_SECTION || [])
    const _FASADE_POSITION = computed(() => _APP.value.FASADE_POSITION || [])
    const _FASADE_GROUPS = computed<IFasadeGroups>(() => _APP.value.FASADE_GROUPS || {})
    const _FASADE_SIZE_RESTRICT = computed(() => _APP.value.FASADE_SIZE_RESTRICT || {})
    const _FASADE_TYPE = computed(() => _APP.value.FASADETYPE || [])
    const _FILLING = computed(() => _APP.value.FILLING || [])
    const _PRODUCTS = computed(() => _APP.value.CATALOG?.PRODUCTS || [])
    const _PALETTE = computed(() => _APP.value.PALETTE || [])
    const _PLINTH = computed(() => _APP.value.PLINTH || [])
    const _PROFILE = computed(() => _APP.value.PROFILE || [])
    const _MILLING = computed(() => _APP.value.MILLING || [])
    const _MODELS = computed(() => _APP.value.MODELS || [])
    const _SHOWCASE = computed(() => _APP.value.SHOWCASE || [])
    const _GLASS = computed(() => _APP.value.GLASS || [])
    const _PATINA = computed(() => _APP.value.PATINA || [])
    const _HANDLES = computed(() => _APP.value.HANDLES || [])
    const _HEM = computed(() => _APP.value.HEM || [])
    const _WALL = computed(() => _APP.value.WALL || [])

    // console.log(_FASADE_SIZE_RESTRICT.value, '=== 🔥 _FASADE_SIZE_RESTRICT 🔥 ===')



    const currentModel = ref<THREE.Object3D | null>(null)
    const currentRaspilParent = ref<THREE.Object3D | null>(null)

    const currentModulData = ref<any>(null)

    const currentBackwallData = ref<any>(null)

    const currentSidewallData = ref<any>(null)

    const currentTopfasadeData = ref<any>(null)

    const currentModelFasadesData = ref<IProductFasades[]>([])

    const currentPaletteData = ref<{ [key: string]: IPalette }>({})

    const currentMillingData = ref<IMilling[]>([])

    const currentShowcaseData = ref<number[]>([])

    const currentFasadeTypesData = ref<number[]>([])

    const currentGlassData = ref<number[]>([])

    const currentPatinaData = ref<number[]>([])

    const transformControls = ref<boolean>(false)
    const transformControlsName = ref<string>("Позиционирование")
    const transformControlSnapAngles = ref<number[]>([1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50]);
    const currentControlSnapAngle = ref<number>(1)

    const setCurrentModel = (object: THREE.Object3D | any) => {

        currentModel.value = object
        if (!object) {
            currentRaspilParent.value = null
        }
    }

    const getCurrentModel = computed(() => {
        // return currentModel.value?.userData || currentModel.value
        return currentModel.value
        //return currentModel.value?.userData
    })

    const setCurrentRaspilParent = (object: THREE.Object3D | any) => {
        currentRaspilParent.value = object
    }

    const getCurrentRaspilParent = computed(() => {
        return currentRaspilParent.value
    })

    const getModels = computed(() => _APP.value.CATALOG?.PRODUCTS || [])

    // const getModels = computed(() => {
    //     return models.value
    // })

    /** ------- Работа с Модулем -------- */

    const createCurrentModuleData = (value: number[], def: boolean = false) => {

        const validFacadeIds = value.filter(id => _FASADE.value[id]);

        const groupedFasades = validFacadeIds.reduce((acc, facadeId) => {
            const facade = _FASADE.value[facadeId];
            if (!facade) return acc;

            const section = _FASADE_SECTION.value[facade.IBLOCK_SECTION_ID];
            if (!section?.UF_GROUP) return acc;

            const groupId = section.UF_GROUP;
            if (!acc[groupId]) acc[groupId] = [];
            acc[groupId].push(facadeId);

            return acc;
        }, {} as Record<string, number[]>);


        const result = Object.values(_FASADE_GROUPS.value)
            .map(group => ({
                NAME: group.NAME,
                FASADES: groupedFasades[group.ID] || [],
                SORT: group.SORT,
            }))
            .filter(group => group.FASADES.length > 0)
            .sort((a, b) => a.SORT - b.SORT);

        if (def) return result;
        currentModulData.value = result;

    }

    const createFlatModuleData = (value: number[]) => {

        const validIds = value.filter(id => _FASADE.value[id]);

        const sortCache = new Map<number, number>();

        validIds.forEach(facadeId => {
            const facade = _FASADE.value[facadeId];
            if (!facade) return;

            const section = _FASADE_SECTION.value[facade.IBLOCK_SECTION_ID];
            const groupId = section?.UF_GROUP;
            const group = groupId ? _FASADE_GROUPS.value[groupId] : null;

            sortCache.set(facadeId, group?.SORT ?? 99999);
        });

        return validIds.sort((a, b) => {
            return (sortCache.get(a) ?? 99999) - (sortCache.get(b) ?? 99999);
        });
    }

    const getCurrentModuleData = computed(() => {
        return currentModulData.value
    })

    /** ------- Задняя стенка -------- */

    const createCurrentBackwallData = (productId: number) => {
        const productInfo = _PRODUCTS.value[productId]

        if (productInfo.BACKWALL?.length && productInfo.BACKWALL[0]) {
            const validFacadeIds = productInfo.BACKWALL.filter(id => _FASADE.value[id]);

            const groupedFasades = validFacadeIds.reduce((acc, facadeId) => {
                const facade = _FASADE.value[facadeId];
                if (!facade) return acc;

                const section = _FASADE_SECTION.value[facade.IBLOCK_SECTION_ID];
                if (!section?.UF_GROUP) return acc;

                const groupId = section.UF_GROUP;
                if (!acc[groupId]) acc[groupId] = [];
                acc[groupId].push(facadeId);

                return acc;
            }, {} as Record<string, number[]>);


            const result = Object.values(_FASADE_GROUPS.value)
                .map(group => ({
                    NAME: group.NAME,
                    FASADES: groupedFasades[group.ID] || [],
                    SORT: group.SORT,
                }))
                .filter(group => group.FASADES.length > 0)
                .sort((a, b) => a.SORT - b.SORT);

            currentBackwallData.value = result;
        }
    }

    const getCurrentBackwallData = computed(() => {
        return currentBackwallData.value
    })

    /** ------- Боковые стенки -------- */

    const createCurrentSidewallData = (productId: number) => {

        const productInfo = _PRODUCTS.value[productId]

        if (productInfo.SIDEWALL?.length && productInfo.SIDEWALL[0]) {
            const groupedFasades = productInfo.SIDEWALL.reduce((acc, facadeId) => {
                const facade = _FASADE.value[facadeId];
                if (!facade) return acc;

                const section = _FASADE_SECTION.value[facade.IBLOCK_SECTION_ID];
                if (!section?.UF_GROUP) return acc;

                const groupId = section.UF_GROUP;
                if (!acc[groupId]) acc[groupId] = [];
                acc[groupId].push(facadeId);

                return acc;
            }, {} as Record<string, number[]>);


            const result = Object.values(_FASADE_GROUPS.value)
                .map(group => ({
                    NAME: group.NAME,
                    FASADES: groupedFasades[group.ID] || [],
                    SORT: group.SORT,
                }))
                .filter(group => group.FASADES.length > 0)
                .sort((a, b) => a.SORT - b.SORT);

            currentSidewallData.value = result;
        }
    }

    const getCurrentSidewallData = computed(() => {
        return currentSidewallData.value
    })

    /** ------- Накладка на крышку -------- */

    /*const createCurrentTopfasadeData = (value: number[]) => {

        const colorMap = new Set();
        const colorsList = value.filter((colorId: number) => _FASADE.value[colorId]);

        colorsList.forEach(color => {
            if (_FASADE.value[color] !== undefined) {
                colorMap.add(_FASADE.value[color]);
            }
        });
        currentTopfasadeData.value = Array.from(colorMap)
    }

    const getCurrentTopfasadeData = computed(() => {
        return currentTopfasadeData.value
    })*/



    /** ------- Работа с Цоколем -------- */

    const createTotalPlinthData = () => {
        let percept = {}
        const result = Object.entries(_PLINTH.value).map(([key, el]) => {
            return percept[key] = _PRODUCTS.value[el]
        }).filter(Boolean)

        // console.log(percept)

        // const filtered = Object.values(_PLINTH).map(el => {
        //     return _PRODUCTS.value[el]
        // })


        return percept
    }

    const createTotalPlinthColorData = (plinthId) => {
        if (!_PLINTH.value[plinthId]) return []

        const { FACADE } = _PRODUCTS.value[plinthId]
        const filter = FACADE.map(el => {
            return _FASADE.value[el] ?? null
        }).filter(Boolean)

        return filter


    }

    /** ------- Работа с фасадами -------- */

    const createCurrentModelFasadesData = ({ data, def, fasadeNdx, productId }: { data: number[], def?: boolean, fasadeNdx?: number, productId?: number }) => {
        const defaultFasade = def ?? false

        const groupedFasades: Record<string, number> = {};
        let exception = !defaultFasade ? 'Без фасада' : ''
        let haveShowCase = null;


        if (fasadeNdx !== undefined && productId !== undefined) {

            let fasadePosData = null;
            const product = _PRODUCTS.value[productId]

            console.log(product, 'product')

            if (!product.FASADE_POSITION || product.FASADE_POSITION.length == 0) {
                return []
            }


            const positionId = product.FASADE_POSITION[fasadeNdx]

            if (positionId) {
                fasadePosData = _FASADE_POSITION.value[positionId]
                haveShowCase = fasadePosData.glass == 1
            }

        }

        const isUM = !!getCurrentModel.value?.userData?.PROPS?.CONFIG?.MODULEGRID;
        let isSlideDoor = false;
        if (isUM) {
            isSlideDoor = !!getCurrentModel.value.userData.PROPS.CONFIG.isSlideDoor;
        }

        data.forEach(facadeId => {
            const facade = _FASADE.value[facadeId];
            // console.log(facade)

            if (!facade) return;
            const hasGlass = _FASADE.value[facadeId].GLASS_ONLY == 1

            const section = _FASADE_SECTION.value[facade.IBLOCK_SECTION_ID];

            if (!section || !section.UF_GROUP) return;

            const groupId: string = section.UF_GROUP;

            if (!groupedFasades[groupId]) {

                const restrict = _FASADE_SIZE_RESTRICT.value[section.ID]

                groupedFasades[groupId] = {

                    id: [], size: {
                        MAX_HEIGHT: restrict ? _FASADE_SIZE_RESTRICT.value[section.ID].SIZE_RESTRICT.HEIGHT : Infinity,
                        MAX_WIDTH: isUM ? (isSlideDoor ? UM_PARAMS.MAX_SLIDE_DOOR_WIDTH : UM_PARAMS.MAX_FASADE_WIDTH) : restrict ? _FASADE_SIZE_RESTRICT.value[section.ID].SIZE_RESTRICT.WIDTH : Infinity,
                        MIN_HEIGHT: restrict ? _FASADE_SIZE_RESTRICT.value[section.ID].SIZE_RESTRICT.MIN_HEIGHT : -Infinity,
                        MIN_WIDTH: isUM ? (isSlideDoor ? UM_PARAMS.MIN_SLIDE_DOOR_WIDTH : UM_PARAMS.MIN_FASADE_WIDTH) : restrict ? _FASADE_SIZE_RESTRICT.value[section.ID].SIZE_RESTRICT.MIN_WIDTH : -Infinity,
                    },
                };
            }


            if (!haveShowCase && hasGlass) return

            groupedFasades[groupId]['id'].push(facadeId);

        });

        // Формирование итогового массива
        const result = Object.entries(_FASADE_GROUPS.value).map(([groupId, group]) => {
                return {
                    NAME: group.NAME,
                    FASADES: groupedFasades[groupId] ? groupedFasades[groupId].id : [],
                    SORT: group.SORT,
                    GROUP_SIZE: groupedFasades[groupId] ? groupedFasades[groupId].size : null,

                }
            }


        ).filter(group => group.FASADES.length > 0 && group.NAME !== exception).sort((a, b) => a.SORT - b.SORT);

        if (defaultFasade) {
            return result
        }

        currentModelFasadesData.value = result
    }

    const createFlatFasadeData = ({ data, def, fasadeNdx }) => {
        const list = createCurrentModelFasadesData({ data, def, fasadeNdx })
        const flated = list?.map(el => el.FASADES).flat()
        return flated

    }

    const clearCurrentModelFasadesData = () => {
        currentModelFasadesData.value = []
    }

    const getCurrentModelFasadesData = computed(() => {
        return currentModelFasadesData.value
    })

    /** Палитра */
    const createCurrentPaletteData = (value: number | string) => {

        let result = {}
        if (!_FASADE.value[value]) return result
        if (_FASADE.value[value].PALETTE.length && _FASADE.value[value].PALETTE[0] != null) {
            result = Object.keys(_PALETTE.value)
                .filter(
                    (key) =>
                        _PALETTE.value[key].TYPE ===
                        _FASADE.value[value].PALETTE[0]
                )
                .reduce((obj, key) => {
                    obj[key] = _PALETTE.value[key];
                    return obj;
                }, {});

            currentPaletteData.value = result

            return result
        }

        currentPaletteData.value = result
        return result
    }

    const getCurrentPaletteData = computed(() => {
        return currentPaletteData.value
    })

    /** Фрезеровки */
    const createCurrentMillingData = ({ fasadeId, productId, fasadeNdx }): TMillingListItem[] | [] => {

        let result = []
        if (fasadeId == 7397) {
            currentMillingData.value = []
            return []
        }

        const product = _PRODUCTS.value[productId]
        const positionId = product.FASADE_POSITION[fasadeNdx]

        const fasadePosData = _FASADE_POSITION.value[positionId]

        const haveShowCase = fasadePosData?.glass == 1
        const sideColors = ["LEFTSIDECOLOR", "RIGHTSIDECOLOR"]

        // if (_FASADE.value[fasadeId].ATTACH_MILLINGS.length && _FASADE.value[fasadeId].ATTACH_MILLINGS[0] != null && !haveShowCase) {
        if ((_FASADE.value[fasadeId].ATTACH_MILLINGS.length && _FASADE.value[fasadeId].ATTACH_MILLINGS[0] != null) || (sideColors.includes(fasadeNdx) && _FASADE.value[fasadeId].ATTACH_MILLINGS_SIDE?.[0])) {

            let millings: IMilling[] = []
            let fasadeMilling: number[]
            if(sideColors.includes(fasadeNdx) && _FASADE.value[fasadeId].ATTACH_MILLINGS_SIDE?.[0]){
                fasadeMilling = _FASADE.value[fasadeId].ATTACH_MILLINGS_SIDE
            }
            else {
                fasadeMilling = _FASADE.value[fasadeId].ATTACH_MILLINGS
            }

            let percept = {}
            let prodMilling: number[] = _PRODUCTS.value[productId].MILLING

            fasadeMilling.filter(mill => _MILLING.value[mill] != undefined).map((mill) => {
                percept[mill] = _MILLING.value[mill]
            })

            prodMilling.filter(mill => percept[mill] != undefined).map((mill) => { millings.push(percept[mill]) })

            millings.sort((a, b) => a.SORT - b.SORT)

            result = millings.sort((a, b) => a.SORT - b.SORT)

            currentMillingData.value = result

            return result
        }


        currentMillingData.value = result
        return result
    }

    const createTotalMillingList = (fasadeId): TMillingListItem[] | [] => {

        if (!_FASADE.value[fasadeId]) return []

        if (_FASADE.value[fasadeId].ATTACH_MILLINGS.length && _FASADE.value[fasadeId].ATTACH_MILLINGS[0] != null) {
            let millings: IMilling[] = []
            let fasadeMilling: number[] = _FASADE.value[fasadeId].ATTACH_MILLINGS
            let percept = {}
            const result = fasadeMilling.filter(mill => _MILLING.value[mill] != undefined).map((mill) => {
                return percept[mill] = _MILLING.value[mill]
            }).filter(Boolean)

            result.sort((a, b) => a.SORT - b.SORT)

            return result
        }
        return []

    }

    const getCurrentMillingMap = (data) => {

        const millingKey = additionalMillingKeys[data];
        const millingMapData = MILLINGS[millingKey] ?? MILLINGS[data] ?? MILLINGS[2462671];
        return millingMapData;
    }

    const getCurrentMillingActionMap = (data, millingId) => {

        if (!data || !INTEGRATE_HANDE_EXEPTIONS.includes(millingId)) return null

        const prepare = _FASADE_TYPE.value[data].CODE
        const actionKey = FasadeTextAlignAction[prepare]
        const mapKey = additionalMillingKeys[millingId] ?? millingId
        const map = MILLING_HANDLE_KEYS[mapKey]

        return map[actionKey]
    }

    const getCurrentMillingData = computed(() => {
        return currentMillingData.value
    })

    const setMillingId = (fasadeId, id) => {

        const { FASADE_PROPS } = currentModel.value?.userData.PROPS.CONFIG
        const modulePart = currentModel.value?.userData.PROPS.CONFIG[fasadeId]
        if (modulePart)
            modulePart.MILLING = id
        else
            FASADE_PROPS[fasadeId].MILLING = id
    }

    const getFasadDataType = (millingId) => {
        const data = _MILLING[millingId]
        const result = data.fasade_type
            .map((item) => _FASADE_TYPE[item])
            .filter(Boolean);

        return result;
    };

    /** Витрины */
    const createCurrentShowcaseData = ({ fasadeId, productId, fasadeNdx }) => {

        const product = _PRODUCTS.value[productId]
        const prodShowcases = product.type_showcase
        const positionId = product.FASADE_POSITION[fasadeNdx]
        const fasadePosData = _FASADE_POSITION.value[positionId]
        const haveShowCase = fasadePosData?.glass == 1
        let prepare = [];

        if (!haveShowCase) {
            currentShowcaseData.value = []
            return
        }

        const defaultShowcase = prodShowcases[0] ?? 1013628

        if (prodShowcases.length > 0 && prodShowcases[0] !== null) {
            prepare = prodShowcases.map(el => {
                return _SHOWCASE.value[el]
            }).filter(Boolean)

            currentShowcaseData.value = prepare
            return
        } else {
            prepare = [1013628]
        }

    }

    const getCurrentShowcaseData = computed(() => {
        return currentShowcaseData.value
    })

    /** Типы фасада */
    const createCurrentFasadeTypesData = ({ fasadeId, productId }) => {
        const incomeTypes = _FASADE.value[fasadeId].fasade_type

        const productPositions = _PRODUCTS.value[productId].FASADE_POSITION

        const defaultTypes = productPositions.reduce((acc, index) =>
                acc.concat(_FASADE_POSITION.value[index]?.fasade_type || []),
            []);


        const filtered = incomeTypes.filter(item => defaultTypes.includes(item))
        const result = filtered.map(item => _FASADE_TYPE.value[item]).filter(Boolean);

        currentFasadeTypesData.value = result

        return result

    }

    const getCurrentFasadeTypesData = computed(() => {
        return currentFasadeTypesData.value
    })

    const getCurrentFasadeTypesAction = (data) => {

        const prepare = _FASADE_TYPE.value[data]
        if (!prepare) return null

        const actionKey = FasadeTextAlignAction[prepare.CODE]
        return actionKey
    }

    /** Стёкла */
    const createCurrentGlassData = ({ fasadeId, productId }) => {

        const incomeGlass = _FASADE.value[fasadeId].ATTACH_GLASS
        const productGlass = _PRODUCTS.value[productId].GLASS
        let glassArray = incomeGlass.filter(item => productGlass.includes(item)).sort((a, b) => a.SORT - b.SORT)

        const currentClass = glassArray.reduce((acc, index) =>
                acc.concat(_GLASS.value[index] || []),
            []);

        currentGlassData.value = currentClass;
        return currentClass
    }

    const getCurrentGlassData = computed(() => {
        return currentGlassData.value
    })


    /** Патина */

    const createCurrentPatinaData = ({ fasadeId, productId }) => {

        if (_PRODUCTS.value[productId].type_showcase.length && _PRODUCTS.value[productId].type_showcase[0] !== null) {
            return
        }

        const incomePatina = _FASADE.value[fasadeId].PATINA
        const currentPataina = incomePatina.filter(key => _PATINA.value.hasOwnProperty(key)).map(key => _PATINA.value[key])

        currentPatinaData.value = currentPataina
    }

    const getCurrentPatinaData = computed(() => {
        return currentPatinaData.value
    })

    /** @Опции */

    const getOptions = (option: number[]) => {
        let filtered = []
        const curOptionsList = option
            .map(el => this._OPTION[el])
            .filter(Boolean);

        for (const el in this._OPTIONS_GROUP) {

            filtered.push({
                NAME: this._OPTIONS_GROUP[el].NAME,
                CONTANT: curOptionsList.filter(opt => opt.GROUP == el)
            })
        }

        filtered = filtered.filter(item => {
            if (item.CONTANT.length > 0) return item

        })

        return filtered

    }


    //================== helpers ==================

    const expressionsReplace = (obj: any, expressions: THREETypes.TObject) => {

        if (!expressions || !Object.keys(expressions).length) return obj;

        let objStr: THREETypes.TObject | string | number = obj;

        // Преобразуем объект в строку, если это объект
        if (typeof obj == "object") {
            objStr = JSON.stringify(obj);
        }

        // Заменяем выражения
        Object.entries(expressions).forEach(([k, v]) => {
            if (typeof objStr != "number") {
                objStr = objStr.split(k).join(v);
            }
        });

        // Возвращаем объект или строку
        if (typeof obj == "object") {
            return JSON.parse(objStr as string);
        } else {
            return objStr;
        }
    };

    const calculateFromString = (expression) => {
        try {
            const func = new Function("return " + expression);
            return func();
        } catch (error) {
            console.log(expression, '---"Недопустимое выражение!"')

            return "Недопустимое выражение!";
        }
    }

    return {
        _APP,
        _FASADE,
        _PRODUCTS,
        _PROFILE,
        _HEM,
        _FASADE_TYPE,
        _FASADE_POSITION,
        _FASADE_SIZE_RESTRICT,
        _FASADE_SECTION,
        _FILLING,
        _MILLING,
        _MODELS,
        _PALETTE,
        _PATINA,
        _WALL,

        getModels,

        setCurrentModel,
        getCurrentModel,
        createCurrentModelFasadesData,
        createFlatFasadeData,
        clearCurrentModelFasadesData,
        getCurrentModelFasadesData,
        setCurrentRaspilParent,
        getCurrentRaspilParent,

        createCurrentPaletteData,
        getCurrentPaletteData,

        createCurrentMillingData,
        createTotalMillingList,
        getCurrentMillingData,
        setMillingId,
        getCurrentMillingMap,
        getCurrentMillingActionMap,

        createCurrentShowcaseData,
        getCurrentShowcaseData,

        createCurrentFasadeTypesData,
        getCurrentFasadeTypesData,
        getCurrentFasadeTypesAction,

        createCurrentGlassData,
        getCurrentGlassData,

        createCurrentPatinaData,
        getCurrentPatinaData,

        createCurrentModuleData,
        createFlatModuleData,
        getCurrentModuleData,

        createCurrentBackwallData,
        getCurrentBackwallData,

        createCurrentSidewallData,
        getCurrentSidewallData,

        /*createCurrentTopfasadeData,
        getCurrentTopfasadeData,*/

        createTotalPlinthData,
        createTotalPlinthColorData,

        getOptions,


        /** Helpers */
        expressionsReplace,
        calculateFromString
    }

});