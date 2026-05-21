import { useModelState } from "@/store/appliction/useModelState";
import { useEventBus } from "@/store/appliction/useEventBus";
import { useToast } from "@/features/toaster/useToast";
import { TFasadeGroupSize } from "@/store/appliction/useModelState";
import type { Object3D } from 'three'
/**//@ts-nocheck */

import { TTotalProps, TFasadeItem, TFasadeTrueSizes, TFasadeConversation, TMillingRestrictItem, TConfig } from "@/types/types";

type TsizeData = {
    width: number
    height: number
    depth: number
}
import { UM_PARAMS } from "@/components/UMconstructor/utils/Const.ts";

export const useConversationActions = () => {

    const modelState = useModelState();
    const eventBus = useEventBus();
    const toaster = useToast();

    const onRsizeConversations = async (size: TsizeData) => {
        const curModel = modelState.getCurrentModel
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

    const createFasadeConversations = (fasadeId: number, curModel: Object3D | null): TFasadeGroupSize => {

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

        if (!groupId) return temp

        const toCheck = modelState._FASADE_SIZE_RESTRICT[section.ID];


        restrict = {
            MAX_HEIGHT: toCheck ? _FASADE_SIZE_RESTRICT[section.ID].SIZE_RESTRICT.HEIGHT : Infinity,
            MIN_HEIGHT: toCheck ? _FASADE_SIZE_RESTRICT[section.ID].SIZE_RESTRICT.MIN_HEIGHT : -Infinity,
            MAX_WIDTH: isUM ? (isSlideDoor ? UM_PARAMS.MAX_SLIDE_DOOR_WIDTH : UM_PARAMS.MAX_FASADE_WIDTH) : toCheck ? _FASADE_SIZE_RESTRICT[section.ID].SIZE_RESTRICT.WIDTH : Infinity,
            MIN_WIDTH: isUM ? (isSlideDoor ? UM_PARAMS.MIN_SLIDE_DOOR_WIDTH : UM_PARAMS.MIN_FASADE_WIDTH) : toCheck ? _FASADE_SIZE_RESTRICT[section.ID].SIZE_RESTRICT.MIN_WIDTH : -Infinity,
        }

        return restrict

    }

    const checkFasadeConversations = (fasadeId: number, size: TFasadeTrueSizes) => {
        const curModel = modelState.getCurrentModel
        const { FASADE_WIDTH, FASADE_HEIGHT } = size
        const { MAX_HEIGHT, MIN_HEIGHT, MAX_WIDTH, MIN_WIDTH } = createFasadeConversations(fasadeId, curModel)

        const check =
            FASADE_HEIGHT <= MAX_HEIGHT &&
            FASADE_HEIGHT >= MIN_HEIGHT &&
            FASADE_WIDTH <= MAX_WIDTH &&
            FASADE_WIDTH >= MIN_WIDTH;

        if (!check) {
            toaster.error(`Размер Фасада №${fasadeId + 1} не соответствует доступному размеру полотна`)
        }

        return check

    }

    const filterFasadeConversations = (fasadeNdx: number, fasadeSize: TFasadeTrueSizes) => {
        const sceneModel = modelState.getCurrentModel;
        const { FASADE } = sceneModel?.userData.PROPS;
        const { FASADE_WIDTH, FASADE_HEIGHT, isDrawer } = fasadeSize || FASADE[fasadeNdx]?.userData?.trueSize;

        const tempList = modelState.getCurrentModelFasadesData
            .map((el) => {
                const check =
                    isDrawer || (
                        FASADE_HEIGHT <= el.GROUP_SIZE.MAX_HEIGHT &&
                        FASADE_HEIGHT >= el.GROUP_SIZE.MIN_HEIGHT &&
                        FASADE_WIDTH <= el.GROUP_SIZE.MAX_WIDTH &&
                        FASADE_WIDTH >= el.GROUP_SIZE.MIN_WIDTH
                    );
                if (check) return el;
            })
            .filter(Boolean);


        return tempList;

    };

    const filterMaterialsConversations = (materialList: TFasadeConversation[], fasadeSize: TFasadeTrueSizes) => {
        const tempList = materialList.map((el) => {
            if (el.FASADES && Array.isArray(el.FASADES)) {
                let tmp_fasades = el.FASADES.map(item => {
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
            console.log(el.COLOR, el.MILLING, 'FASADE_PROPS', check)
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

    return {
        onRsizeConversations,
        createFasadeConversations,
        checkFasadeConversations,
        filterFasadeConversations,
        filterMaterialsConversations,
        checkMillingConversations,
        onResizeMillingCheck,
        expressionsReplace
    }

}