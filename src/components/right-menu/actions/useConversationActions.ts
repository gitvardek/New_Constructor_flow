import { useModelState } from "@/store/appliction/useModelState";
import { useEventBus } from "@/store/appliction/useEventBus";
import { useToast } from "@/features/toaster/useToast";
import { TFasadeGroupSize } from "@/store/appliction/useModelState";
import type { Object3D } from 'three'
/**//@ts-nocheck */

import { IProductFull, TTotalProps, TFasadeItem, TFasadeTrueSizes, TFasadeConversation, TMillingRestrictItem, TConfig, TFasadeSectionItem } from "@/types/types";

type TsizeData = {
    width: number
    height: number
    depth: number
}
import { UM_PARAMS } from "@/components/UMconstructor/utils/Const.ts";
import { useUMStorage } from "@/store/appStore/UniversalModule/useUMStorage.ts";

// Сводка по глобальному применению фасада: сюда копятся товары, где фасад не применился
// (размер не подошёл для секции с ограничением). Модульный уровень — общий для всех инстансов,
// т.к. сборка идёт по товарам отдельными вызовами.
let _globalApplySkips: { product: string; index: number }[] = []
let _globalApplyFlushTimer: ReturnType<typeof setTimeout> | null = null

export const useConversationActions = () => {

    const modelState = useModelState();
    const UM_STORE = useUMStorage();
    const eventBus = useEventBus();
    const toaster = useToast();

    // Разделы каталога фасадов, недоступные низкому УМ
    const LOW_UM_PRODUCT = [3954672]
    const LOW_UM_RESTRICTED_SECTIONS = [2364160, 7535000, 7535002, 1444781]

    // fasadeId здесь — id материала фасада, как и в createFasadeConversations.
    // Высоту берём из стора УМ: пока открыт конструктор, CONFIG.SIZE хранит размер до
    // применения изменений. Вне конструктора totalHeight равен нулю, и берётся конфиг
    const isLowUmRestrictedFasade = (fasadeId: number, curModel: Object3D | null = modelState.getCurrentModel) => {
        const PROPS = curModel?.userData?.PROPS as TTotalProps

        if (!LOW_UM_PRODUCT.includes(+PROPS?.PRODUCT)) return false


        if (checkIgnore(curModel)) {
            return false
        }

        const height = Number(UM_STORE.totalHeight || PROPS?.CONFIG?.SIZE?.height)

        if (!(height < UM_PARAMS.MIN_SECTION_TO_FILLINGS_HEIGHT)) return false

        const fasadeData = (modelState._FASADE as TFasadeItem[])[fasadeId]
        const fasadeGroup = (modelState._FASADE_SECTION as TFasadeSectionItem[])[fasadeData?.IBLOCK_SECTION_ID]?.['UF_GROUP']

        return fasadeGroup ? LOW_UM_RESTRICTED_SECTIONS.includes(Number(fasadeGroup)) : false
    }

    const onRsizeConversations = async (size: TsizeData) => {

        const curModel = modelState.getCurrentModel as Object3D
        if (!curModel) return

        // Игнор размеров решается по-фасадно внутри restrictData:
        // createFasadeConversations уже вернул Infinity для секций без IGNORE_PRODUCT
        const restrictData = curModel?.userData.restrictData

        const { FASADE } = curModel?.userData.PROPS as TTotalProps;

        const { width, height } = size;

        if (Object.values(restrictData).length == 0) return;

        FASADE.forEach((_, key) => {
            const { MAX_HEIGHT, MIN_HEIGHT, MAX_WIDTH, MIN_WIDTH } = restrictData[key];
            const check =
                height <= MAX_HEIGHT &&
                height >= MIN_HEIGHT &&
                width <= MAX_WIDTH &&
                width >= MIN_WIDTH;

            if (!check) {
                eventBus.emit("A:Delite-Fasad", key);
                toaster.error(`Фасад №${key + 1} удалён`)
                toaster.error(`Размер Фасада №${key + 1} не соответствует доступному размеру полотна`)
            }
        });
    }

    // isPanel — элемент не является дверью (боковая стенка, накладка на крышку).
    // Для двери у УМ действуют константы MAX_FASADE_WIDTH/MIN_FASADE_WIDTH, для панели
    // предел задаёт размер листа из _FASADE_SIZE_RESTRICT
    const createFasadeConversations = (fasadeId: number, curModel: Object3D | null, isPanel: boolean = false): TFasadeGroupSize => {

        let restrict = {
            MAX_HEIGHT: Infinity,
            MIN_HEIGHT: -Infinity,
            MAX_WIDTH: Infinity,
            MIN_WIDTH: -Infinity,
        }

        if (!curModel) return restrict
        // const curModel = modelState.getCurrentModel
        const isUM = !!curModel?.userData?.PROPS?.CONFIG?.MODULEGRID;
        let isSlideDoor = false;

        if (isUM) {
            isSlideDoor = !!curModel.userData.PROPS.CONFIG.isSlideDoor;
        }

        const temp = {
            MAX_HEIGHT: Infinity,
            MIN_HEIGHT: -Infinity,
            MAX_WIDTH: Infinity,
            MIN_WIDTH: -Infinity,
        }

        const { _FASADE_SECTION, _FASADE_SIZE_RESTRICT, _FASADE } = modelState
        const fasadeData = (_FASADE as TFasadeItem[])[fasadeId]
        const section = _FASADE_SECTION[fasadeData?.IBLOCK_SECTION_ID];
        const groupId = section?.UF_GROUP ?? section;
        const isIgnoreSize = checkIgnore(curModel, null, fasadeId)

        // if (!groupId || isIgnoreSize) return temp
        // const toCheck = modelState._FASADE_SIZE_RESTRICT[section.ID];

        // Дверные лимиты УМ применимы только к дверям: боковая стенка и накладка
        // ограничены размером листа, поэтому для них ветка isUM пропускается
        const useDoorLimits = isUM && !isPanel

        if (!groupId || isIgnoreSize) {

            if (useDoorLimits && !isIgnoreSize) {
                temp.MAX_WIDTH = isSlideDoor ? UM_PARAMS.MAX_SLIDE_DOOR_WIDTH : UM_PARAMS.MAX_FASADE_WIDTH
                temp.MIN_WIDTH = isSlideDoor ? UM_PARAMS.MIN_SLIDE_DOOR_WIDTH : UM_PARAMS.MIN_FASADE_WIDTH
            }

            return temp
        }

        const toCheck = modelState._FASADE_SIZE_RESTRICT[section.ID];

        restrict = {
            MAX_HEIGHT: toCheck ? _FASADE_SIZE_RESTRICT[section.ID].SIZE_RESTRICT.HEIGHT : Infinity,
            MIN_HEIGHT: toCheck ? _FASADE_SIZE_RESTRICT[section.ID].SIZE_RESTRICT.MIN_HEIGHT : -Infinity,
            MAX_WIDTH: useDoorLimits ? (isSlideDoor ? UM_PARAMS.MAX_SLIDE_DOOR_WIDTH : UM_PARAMS.MAX_FASADE_WIDTH) : toCheck ? _FASADE_SIZE_RESTRICT[section.ID].SIZE_RESTRICT.WIDTH : Infinity,
            MIN_WIDTH: useDoorLimits ? (isSlideDoor ? UM_PARAMS.MIN_SLIDE_DOOR_WIDTH : UM_PARAMS.MIN_FASADE_WIDTH) : toCheck ? _FASADE_SIZE_RESTRICT[section.ID].SIZE_RESTRICT.MIN_WIDTH : -Infinity,
        }

        return restrict

    }

    const validateAndPurgeFasadeOnBuild = (
        fasadeId: number,
        fasadeIndex: number,
        trueSize: TFasadeTrueSizes,
        curmodel: Object3D,
        currentProduct: IProductFull
    ): boolean => {

        const curModel = curmodel;

        if (checkIgnore(null, currentProduct, fasadeId)) {
            return true;
        }


        if (!curModel) return false;



        const { FASADE_WIDTH, FASADE_HEIGHT } = trueSize;
        const { MAX_HEIGHT, MIN_HEIGHT, MAX_WIDTH, MIN_WIDTH } = createFasadeConversations(fasadeId, curModel);

        const check =
            FASADE_HEIGHT <= MAX_HEIGHT &&
            FASADE_HEIGHT >= MIN_HEIGHT &&
            FASADE_WIDTH <= MAX_WIDTH &&
            FASADE_WIDTH >= MIN_WIDTH;

        if (!check) {
            toaster.error(`Фасад №${fasadeIndex + 1} удалён`);
            toaster.error(`Размер Фасада №${fasadeIndex + 1} не соответствует доступному размеру полотна`);
        }

        return check;
    }

    const checkFasadeConversations = (fasadeId: number, size: TFasadeTrueSizes) => {

        const curModel = modelState.getCurrentModel as Object3D

        if (checkIgnore(curModel, null, fasadeId)) {
            return true
        }

        const { FASADE_WIDTH, FASADE_HEIGHT } = size
        // Признак панели приходит в объекте размера — так же, как isDrawer для ящиков
        const { MAX_HEIGHT, MIN_HEIGHT, MAX_WIDTH, MIN_WIDTH } = createFasadeConversations(fasadeId, curModel, !!size?.isPanel)

        // console.log(`Полоно HEIGHT: min:${MIN_HEIGHT} - max:${MAX_HEIGHT}, WIDTH: min:${MIN_WIDTH} - max:${MAX_WIDTH}`);
        // console.log(`Размер фасада: HEIGHT:${FASADE_HEIGHT}, WIDTH:${FASADE_WIDTH}`)

        const check =
            FASADE_HEIGHT <= MAX_HEIGHT &&
            FASADE_HEIGHT >= MIN_HEIGHT &&
            FASADE_WIDTH <= MAX_WIDTH &&
            FASADE_WIDTH >= MIN_WIDTH;

        // console.log(`
        //         1:${FASADE_HEIGHT <= MAX_HEIGHT}, 
        //         2:${FASADE_HEIGHT >= MIN_HEIGHT},  
        //         3:${FASADE_WIDTH <= MAX_WIDTH},  
        //         4:${FASADE_WIDTH >= MIN_WIDTH}`)

        if (!check) {
            toaster.error(`Размер Фасада №${fasadeId + 1} не соответствует доступному размеру полотна 3`)
        }

        return check

    }

    const filterFasadeConversations = (fasadeNdx: number, fasadeSize: TFasadeTrueSizes) => {
        const sceneModel = modelState.getCurrentModel as Object3D;
        const { FASADE } = sceneModel?.userData.PROPS;
        const { FASADE_WIDTH, FASADE_HEIGHT, isDrawer } = fasadeSize || FASADE[fasadeNdx]?.userData?.trueSize;

        const isSizeIgnore = checkIgnore(sceneModel)

        const tempList = modelState.getCurrentModelFasadesData
            .map((el) => {
                const check =
                    isDrawer || (
                        FASADE_HEIGHT <= el.GROUP_SIZE.MAX_HEIGHT &&
                        FASADE_HEIGHT >= el.GROUP_SIZE.MIN_HEIGHT &&
                        FASADE_WIDTH <= el.GROUP_SIZE.MAX_WIDTH &&
                        FASADE_WIDTH >= el.GROUP_SIZE.MIN_WIDTH
                    ) || isSizeIgnore;
                if (check) return el;
            })
            .filter(Boolean);


        return tempList;

    };

    const filterMaterialsConversations = (materialList: TFasadeConversation[], fasadeSize: TFasadeTrueSizes) => {
        const tempList = materialList.map((el) => {
            if (el.FASADES && Array.isArray(el.FASADES)) {
                let tmp_fasades = el.FASADES.map(item => {
                    // item — id фасада (секция), игнор решается по-секционно внутри checkFasadeConversations
                    if (checkFasadeConversations(item, fasadeSize)) {
                        return item;
                    }
                }).filter(Boolean);

                if (tmp_fasades.length)
                    return { ...el, FASADES: tmp_fasades }
            }
        })
            .filter(Boolean);


        return tempList;
    };

    const checkMillingConversations = (fasadeId: number) => {

        const { _MILLING_SIZE_RESTRICT } = modelState
        if (!fasadeId) return null

        if (checkIgnore(modelState.getCurrentModel as Object3D)) {
            return null
        }

        const match = (_MILLING_SIZE_RESTRICT as TMillingRestrictItem[]).find(
            (item) => {
                return item.FASADE.includes(fasadeId)
            }
        )

        if (!match) return null

        return match.ID
    }

    const onResizeMillingCheck = () => {

        const curModel = modelState.getCurrentModel
        // @ts-ignore
        const { FASADE, CONFIG } = curModel?.userData.PROPS as TTotalProps;
        const { FASADE_PROPS } = CONFIG as TConfig;

        FASADE_PROPS.forEach(el => {
            // @ts-ignore
            const check = checkMillingConversations(el.COLOR, el.MILLING)
        })


    }

    const expressionsReplace = <T>(obj: T, expressions: Record<string, number | string>): T => {
        if (!expressions || !Object.keys(expressions).length) return obj;

        const isObject = obj !== null && typeof obj === "object";

        const replaced = Object.entries(expressions).reduce(
            (acc, [key, value]) => acc.split(key).join(String(value ?? 0)),
            isObject ? JSON.stringify(obj) : String(obj)
        );

        return isObject ? JSON.parse(replaced) : replaced as T;
    }

    // IGNORE_PRODUCT у ограничения (FASADE_SIZE_RESTRICT) отменяет продуктовый IGNORE_SIZE
    // ТОЛЬКО для секции этого фасада. Проверяется по конкретному fasadeId.
    const isIgnoreProductSection = (fasadeId?: number): boolean => {
        if (fasadeId == null) return false
        const { _FASADE, _FASADE_SECTION, _FASADE_SIZE_RESTRICT } = modelState
        const section = _FASADE_SECTION[(_FASADE as TFasadeItem[])[fasadeId]?.IBLOCK_SECTION_ID]
        return !!section && Number(_FASADE_SIZE_RESTRICT[section?.ID]?.IGNORE_PRODUCT ?? 0) !== 0
    }

    const checkIgnore = (curModel: Object3D | null, currentProduct?: IProductFull | null, fasadeId?: number): boolean => {
        const PROPS = curModel?.userData?.PROPS as TTotalProps

        if (!PROPS && !currentProduct) {
            return false
        }

        const product = currentProduct ?? modelState._PRODUCTS[+PROPS.PRODUCT]

        // У секции с IGNORE_PRODUCT ограничения по размеру действуют даже при IGNORE_SIZE —
        // поэтому для такого фасада игнор выключаем, у остальных IGNORE_SIZE работает как обычно
        if (isIgnoreProductSection(fasadeId)) {
            return false
        }

        return Number(product?.IGNORE_SIZE ?? 0) !== 0
    }

    // Регистрирует «непримененный» глобальный фасад и показывает одну сводку (дебаунс),
    // т.к. товары собираются по очереди — иначе был бы тостер на каждый фасад
    const recordGlobalApplySkip = (product: string, index: number) => {
        _globalApplySkips.push({ product, index })
        if (_globalApplyFlushTimer) clearTimeout(_globalApplyFlushTimer)
        _globalApplyFlushTimer = setTimeout(() => {
            const count = _globalApplySkips.length
            if (count) {
                toaster.error(`Глобальный фасад не применён к ${count} фасад(ам): размер не подходит для секции с ограничением`)
            }
            _globalApplySkips = []
            _globalApplyFlushTimer = null
        }, 300)
    }

    return {
        onRsizeConversations,
        isLowUmRestrictedFasade,
        createFasadeConversations,
        validateAndPurgeFasadeOnBuild,
        checkFasadeConversations,
        filterFasadeConversations,
        filterMaterialsConversations,
        checkMillingConversations,
        onResizeMillingCheck,
        expressionsReplace,
        checkIgnore,
        recordGlobalApplySkip
    }

}