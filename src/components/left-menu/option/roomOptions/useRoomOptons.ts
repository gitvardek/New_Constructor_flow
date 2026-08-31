
//@ts-nocheck

import { defineStore } from 'pinia';
import { ref, computed, watch, reactive } from 'vue';
import { TOptionsMap, TLightRange, TQuality, TQualityValue, TFasadeItem, TPalitte, TOptionItem, TTextureActionMap } from '@/types/types';
import { IRoom } from '@/types/interfases';

import { useAppData } from "@/store/appliction/useAppData";
import { useModelState } from '@/store/appliction/useModelState';
import { useSceneState } from '@/store/appliction/useSceneState';
import { useRoomState } from '@/store/appliction/useRoomState';
import { useFigureRightPage } from '@/utils/useFigureRightPage';
import { useWallHeightStore } from '@/store/constructor2d/store/useWallHeightStore';



export const useRoomOptions = defineStore('RoomOptions', () => {

    // const APP = useAppData();

    const appStore = useAppData()
    const APP = computed(() => appStore.getAppData || {})
    const _WALL = computed(() => APP.value.WALL || {})
    const _FLOOR = computed(() => APP.value.FLOOR || {})
    const _HANDLES = computed(() => APP.value.HANDLES || {})

    const sceneState = useSceneState();
    const modelState = useModelState()
    const roomState = useRoomState();
    const handleMethods = useFigureRightPage();


    const startParams = computed(() => sceneState.getStartProjectParams)
    // const currentSceneParams = sceneState.getCurrentProjectParams

    const shadowValue = ref<boolean>(false);
    const refractionValue = ref<boolean>(false);
    const startHeightClamp = ref<number | string>(startParams.value?.height_clamp);
    const emptyTableTopId = ref<string | number>('69919');

    const lightRange = ref<TLightRange>({
        pointLight: startParams.value.lights.pointLight.intensity,
        ambientLight: startParams.value.lights.ambientLight.intensity
    })

    const quality = ref<TQuality[]>([{
        lable: "Низкое",
        value: "low",
        active: true,
    },
    {
        lable: "Среднее",
        value: "medium",
        active: false,
    },
    {
        lable: "Высокое",
        value: "hight",
        active: false,
    }

    ],)

    const palittKey: Record<keyof TOptionsMap, string> = {
        fasadsTop: 'default_palit_top',
        fasadsBottom: 'default_palit_bottom'
    }

    const mllingKeys: Record<keyof TOptionsMap, string> = {
        fasadsTop: 'default_milling_top',
        fasadsBottom: 'default_milling_bottom'
    }

    const plinthKey: Record<keyof TOptionsMap, string> = {
        plinth: 'default_plinth_color',
    }

    const defaultIds: Record<keyof TOptionsMap, string> = {
        moduleTop: 'default_module_color',
        moduleBottom: 'default_module_color',
        fasadsTop: 'default_fasade_color',
        fasadsBottom: 'default_fasade_color',
        wall: 'default_wall',
        floor: 'default_floor',
        tableTop: 'default_table_model',
        plinth: 'default_plinth_body',
        handles: 'default_handles'
    }

    /** Для сохранения проекта */
    const defaultSaveIds: Record<keyof TOptionsMap, string> = {
        moduleTop: 'default_module_color_top',
        moduleBottom: 'default_module_color_bottom',
        fasadsTop: 'default_fasade_top',
        fasadsBottom: 'default_fasade_bottom',
        wall: 'default_wall',
        floor: 'default_floor',
        tableTop: 'default_table_model',
        plinth: 'default_plinth_body',
        handles: 'default_handles'
    }

    // Вместо статичной деструктуризации:
    let defaultWall = ref(startParams.value?.default_wall)
    let defaultFloor = ref(startParams.value?.default_floor)
    let defaultModuleTop = ref(startParams.value?.default_module_color)
    let defaultModuleBottom = ref(startParams.value?.default_module_color)
    let defaultFasadeTop = ref(startParams.value?.default_fasade_color)
    let defaultFasadeBottom = ref(startParams.value?.default_fasade_color)
    let defaultTableTop = ref(startParams.value?.default_table_model)
    let defaultPalitTop = ref(startParams.value?.default_palit_top)
    let defaultPalitBottom = ref(startParams.value?.default_palit_bottom)
    let defaultMillingBottom = ref(startParams.value?.default_milling_bottom)
    let defaultMillingTop = ref(startParams.value?.default_milling_top)
    let defaultPlinthBody = ref(startParams.value?.default_plinth_body)
    let defaultPlinthColor = ref(startParams.value?.default_plinth_color)
    let defaultHandles = ref(startParams.value?.default_handles)

    const globalOptions = ref<TOptionsMap>({
        wall: {
            id: defaultWall.value,
            global: false,
            title: "Оформление стен",
            label: 'Для всех комнат',
            prefix: 'wall',
        },
        floor: {
            id: defaultFloor.value,
            global: false,
            title: "Оформление пола",
            label: 'Для всех комнат',
            prefix: 'floor',
        },
        moduleTop: {
            id: defaultModuleTop.value,
            global: false,
            title: "Цвет корпуса (верхний)",
            label: 'Для всех комнат',
            prefix: 'moduleTop',
        },
        moduleBottom: {
            id: defaultModuleBottom.value,
            global: false,
            title: "Цвет корпуса (нижний)",
            label: 'Для всех комнат',
            prefix: 'moduleBottom',
        },
        fasadsTop: {
            id: defaultFasadeTop.value,
            palitte: defaultPalitTop.value,
            milling: defaultMillingTop.value,
            global: false,
            title: "Тип фасада (верхний)",
            label: 'Для всех комнат',
            prefix: 'fasadsTop',
            palitteTitle: 'Цвет Палитры',
            millingTitle: 'Тип Фрезеровки'
        },
        fasadsBottom: {
            id: defaultFasadeBottom.value,
            palitte: defaultPalitBottom.value,
            milling: defaultMillingBottom.value,
            global: false,
            title: "Тип фасада (нижний)",
            label: 'Для всех комнат',
            prefix: 'fasadsBottom',
            palitteTitle: 'Цвет Палитры',
            millingTitle: 'Тип Фрезеровки'
        },
        tableTop: {
            id: defaultTableTop.value,
            global: false,
            title: "Тип столешницы",
            label: 'Для всех комнат'
        },
        plinth: {
            id: defaultPlinthBody.value,
            plinthSurfase: defaultPlinthColor.value,
            global: false,
            title: 'Тип цокольных планок',
            label: 'Для всех комнат',
            plinthTitle: 'Тип фасада цокольных планок',
            prefix: 'plinth',
        },

        handles: {
            id: defaultHandles.value,
            global: false,
            title: "Тип ручек",
            label: 'Для всех комнат'
        },


    });

    //------------------------------------------------------------------------------------------



    const apllyProjectWall = (value: number) => {
        const rooms: IRoom[] = roomState.rooms

        rooms.forEach((room: IRoom) => {
            room.params.wall = value;
        });
    }

    const apllyProjectFloor = (value: number) => {
        const rooms = roomState.rooms

        rooms.forEach((room) => {
            room.params.floor = value;
        });
    }

    const getWallsTextures = () => {
        return APP.value.WALL
    }

    const getFloorTextures = () => {
        return APP.value.FLOOR
    }

    const getDefaultModuleData = () => {
        const colorMap: number[] = []
        const [key, value] = Object.entries(modelState._PRODUCTS)[0]
        const fasade = value.MODULECOLOR

        for (const el in modelState._PRODUCTS) {
            const product = modelState._PRODUCTS[el];

            if (Array.isArray(product.MODULECOLOR) && product.MODULECOLOR[0] != null) {
                product.MODULECOLOR.forEach((color: number) => {
                    if (modelState._FASADE[color] !== undefined && !colorMap.includes(color)) {
                        colorMap.push(color)
                    }
                });
            }
        }

        const defaultModuleData = modelState.createCurrentModuleData(colorMap, true)

        return defaultModuleData
    }

    const getDefaultFasadeData = () => {
        const PRODUCTS = APP.value.CATALOG.PRODUCTS
        const [key, value] = Object.entries(PRODUCTS)[0]
        const fasade = value.FACADE
        const defaultFasadData = modelState.createCurrentModelFasadesData({ data: fasade, def: true })
        return defaultFasadData
    }

    const getDefaultTotalPlinthData = () => {
        return modelState.createTotalPlinthData()
    }

    const getTotalPlinthColorData = (id: number | string) => {
        return modelState.createTotalPlinthColorData(id)
    }

    const getDefaultPalitData = (id: number | string): TPalitte[] => {
        return Object.values(modelState.createCurrentPaletteData(id))
    }

    const getDefaultMillingData = (fasadeId: number | string) => {
        return modelState.createTotalMillingList(fasadeId)
    }

    const getDefaultTableTopData = () => {
        const tableTopIds = ['7292933', '7358837', '7358946', '7360269', '4066731'];
        const { CATALOG: { SECTIONS, PRODUCTS } } = APP.value;

        const relevantSections = Object.entries(SECTIONS).filter(([key]) => tableTopIds.includes(key));

        const allProducts = relevantSections.flatMap(([, { PRODUCTS: prods }]) =>
            Array.isArray(prods) ? prods : []
        );

        const uniqueProductIds = [...new Set([...allProducts, emptyTableTopId.value])];
        const defaultTableTopData = uniqueProductIds.map(id => PRODUCTS[id]).sort((a, b) => { a.SORT - b.SORT }).reverse();

        return defaultTableTopData
    }

    const getDefaultHandlresData = () => {
        return handleMethods.createDefaultHandleList();
    }

    //--------------------------------------------------
    /** @Работа_с_настройками_освещения */
    //--------------------------------------------------

    const setShadowValue = (value: boolean) => {
        shadowValue.value = value
    }

    const getShadowValue = computed(() => {
        return shadowValue.value
    })

    const setLightRange = (type: keyof TLightRange, value: number | string) => {
        lightRange.value[type] = value
    }

    const getAmbientLightRange = computed(() => {
        return lightRange.value.ambientLight
    })

    const getPointLightRange = computed(() => {
        return lightRange.value.pointLight
    })

    //--------------------------------------------------
    /** @Высота_примагничивания */
    //--------------------------------------------------

    const setHeightClamp = (value: number | string | null) => {
        // По умолчанию примагничиваем к потолку
        const curValue = value ?? useWallHeightStore().wallHeightMm * 10
        startHeightClamp.value = curValue
    }

    const getHeightClamp = computed(() => {

        const roomHeight = useWallHeightStore().wallHeightMm * 10
        const value = Number(startHeightClamp.value)

        if (!roomHeight || !Number.isFinite(value)) return startHeightClamp.value

        return Math.min(value, roomHeight)
    })

    //--------------------------------------------------
    /** @Работа_с_отраженниями */
    //--------------------------------------------------

    const setRefractionValue = (value: boolean) => {
        refractionValue.value = value
    }

    const getRefractionValue = computed(() => {
        return refractionValue.value
    })

    //--------------------------------------------------
    /** @Качество_теней */
    //--------------------------------------------------

    const setQuality = (type: TQualityValue) => {
        quality.value.forEach((el: TQuality) => {
            el.active = el.value === type;
        })
    }

    const getQuality = computed(() => {
        return quality.value
    })

    //--------------------------------------------------
    /** @Работа_с_опциями */
    //--------------------------------------------------

    const updateOption = (
        type: keyof TOptionsMap,
        value: string | number | { data: string | number, type: string },
    ) => {
        globalOptions.value[type]!.id =
            typeof value === 'object' && 'data' in value ? value.data : value;

        switch (type) {
            case "wall":
                if (globalOptions.value[type].global) {
                    apllyProjectWall(value as number);
                }
                break;

            case "floor":
                if (globalOptions.value[type].global) {
                    apllyProjectFloor(value as number);
                }
                break;
        }

    };

    const resetGlobalOptions = () => {
        const startParams = sceneState.getStartProjectParams

        for (const key in globalOptions.value) {
            const optionKey = key as keyof TOptionsMap
            const palitt = palittKey[optionKey]
            const milling = mllingKeys[optionKey]
            const plinth = plinthKey[optionKey]

            try {
                const option = globalOptions.value[optionKey]
                if (!option) continue

                option.id = startParams[defaultIds[optionKey]]
                option.global = false

                if (palitt) {
                    option.palitte = startParams[palitt]
                }
                if (milling) {
                    option.milling = startParams[milling]
                }
                if (plinth) {
                    option.plinthSurfase = startParams[plinth]
                }

            } catch (error) {
                console.warn('Стартовые параметры не найдены', error);
            }
        }
    }

    const updateOptionGlobal = (type: keyof TOptionsMap, value: boolean) => {
        if (globalOptions.value[type]) {
            globalOptions.value[type].global = value
        }

    }

    const getGlobalOptions = computed(() => {

        return globalOptions.value
    })

    const setGlobalPalitte = (id: number | string | null, type: keyof TTextureActionMap) => {
        const option = globalOptions.value[type];
        if (option) {
            option.palitte = id;
        }
    };

    const setGlobalMilling = (id: number | string | null, type: keyof TTextureActionMap) => {
        const option = globalOptions.value[type];

        if (option) {
            option.milling = id;
        }
    };

    const setGlobalPlinth = (id: number | string | null, type: keyof TTextureActionMap) => {
        const option = globalOptions.value[type];

        if (option) {
            option.plinthSurfase = id;
        }
    };

    const saveSceneParams = () => {

        const clone = JSON.parse(JSON.stringify(sceneState.getCurrentProjectParams))
        for (let param in globalOptions.value) {
            const sceneParam = defaultSaveIds[param]

            clone[sceneParam] = globalOptions.value[param].id

            switch (param) {
                case 'fasadsTop':
                    clone.default_milling_top = globalOptions.value[param].milling
                    clone.default_palit_top = globalOptions.value[param].palitte
                    break
                case 'fasadsBottom':
                    clone.default_milling_bottom = globalOptions.value[param].milling
                    clone.default_palit_bottom = globalOptions.value[param].palitte
                    break
                case 'plinth':
                    clone.default_plinth_color = globalOptions.value[param].plinthSurfase
                    break
            }

        }

        return clone
    }

    watch(startParams, (newParams) => {

        globalOptions.value = {
            wall: {
                id: newParams.default_wall,
                global: false,
                title: "Оформление стен",
                label: 'Для всех комнат',
                prefix: 'wall',
            },
            floor: {
                id: newParams.default_floor,
                global: false,
                title: "Оформление пола",
                label: 'Для всех комнат',
                prefix: 'floor',
            },
            moduleTop: {
                id: newParams.default_module_color_top ?? startParams.value.default_module_color,
                global: false,
                title: "Цвет корпуса (верхний)",
                label: 'Для всех комнат',
                prefix: 'moduleTop',
            },
            moduleBottom: {
                id: newParams.default_module_color_bottom ?? startParams.value.default_module_color,
                global: false,
                title: "Цвет корпуса (нижний)",
                label: 'Для всех комнат',
                prefix: 'moduleBottom',
            },
            fasadsTop: {
                id: newParams.default_fasade_top ?? startParams.value.default_fasade_color,
                palitte: newParams.default_palit_top,
                palitteData: getDefaultPalitData(newParams.default_fasade_top ?? startParams.value.default_fasade_top),
                milling: newParams.default_milling_top,
                millingData: getDefaultMillingData(newParams.default_fasade_top ?? startParams.value.default_fasade_color),
                global: false,
                title: "Тип фасада (верхний)",
                label: 'Для всех комнат',
                prefix: 'fasadsTop',
                palitteTitle: 'Цвет Палитры',
                millingTitle: 'Тип Фрезеровки'
            },
            fasadsBottom: {
                id: newParams.default_fasade_bottom ?? startParams.value.default_fasade_color,
                palitte: newParams.default_palit_bottom,
                palitteData: getDefaultPalitData(newParams.default_fasade_bottom ?? startParams.value.default_fasade_bottom),
                milling: newParams.default_milling_bottom,
                millingData: getDefaultMillingData(newParams.default_fasade_bottom ?? startParams.value.default_fasade_color),
                global: false,
                title: "Тип фасада (нижний)",
                label: 'Для всех комнат',
                prefix: 'fasadsBottom',
                palitteTitle: 'Цвет Палитры',
                millingTitle: 'Тип Фрезеровки'
            },
            tableTop: {
                id: newParams.default_table_model,
                global: false,
                title: "Тип столешницы",
                label: 'Для всех комнат'
            },
            plinth: {
                id: newParams.default_plinth_body,
                plinthSurfase: newParams.default_plinth_color,
                plinthData: getTotalPlinthColorData(newParams.default_plinth_body),
                global: false,
                title: 'Тип цокольных планок',
                label: 'Для всех комнат',
                plinthTitle: 'Тип фасада цокольных планок',
                prefix: 'plinth',
            },
            handles: {
                id: newParams.default_handles ?? startParams.value.default_handles,
                global: false,
                title: "Тип ручек",
                label: 'Для всех комнат'
            },

        }
    })

    return {
        _WALL,
        _FLOOR,

        getWallsTextures,
        getFloorTextures,

        apllyProjectWall,
        apllyProjectFloor,

        getDefaultModuleData,
        getDefaultFasadeData,
        getDefaultTableTopData,
        getDefaultPalitData,
        getDefaultMillingData,
        getDefaultTotalPlinthData,
        getDefaultHandlresData,
        getTotalPlinthColorData,

        getGlobalOptions,
        updateOption,
        updateOptionGlobal,
        resetGlobalOptions,

        setShadowValue,
        setRefractionValue,
        setLightRange,
        setHeightClamp,
        setQuality,
        setGlobalPalitte,
        setGlobalMilling,
        setGlobalPlinth,

        getShadowValue,
        getRefractionValue,
        getAmbientLightRange,
        getPointLightRange,
        getHeightClamp,
        getQuality,

        saveSceneParams

    };
});