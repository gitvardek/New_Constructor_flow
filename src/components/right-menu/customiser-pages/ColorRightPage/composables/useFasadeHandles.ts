// @ts-nocheck
import { ref } from "vue";
import { useModelState } from "@/store/appliction/useModelState";
import { useAppData } from "@/store/appliction/useAppData";
import { useEventBus } from "@/store/appliction/useEventBus";
import { useHandlesAction } from "../../FigureRightPage/Handles/useHandlesAction";

/**
 * Положение интегрированной ручки (тип фасада, FASADE_PROPS.TYPE) и положение ручки
 * фрезеровки (FASADE_PROPS.MILLING_TYPE) — списки для LoopPositionSelect и запись в конфиг
 */
export const useFasadeHandles = (getFasadeNdx: () => number, getProductData: () => any) => {

    const modelState = useModelState();
    const eventBus = useEventBus();
    const _APP = useAppData().getAppData;
    const { getIntegratedHandleControllerData, setIntegratedHandleAction } = useHandlesAction();

    /** Типы фасада (интегрированная ручка) */
    const fasadeTypesList = ref<Array>([]);
    const isFasadeTypesExist = ref<boolean>(false);

    /** Положения ручки фрезеровки */
    const fasadeHandleList = ref<Array>([]);
    const isFasadeHandleExist = ref<boolean>(false);

    const getConfig = () => getProductData().PROPS.CONFIG;
    const getFasadeProps = () => getConfig().FASADE_PROPS[getFasadeNdx()];

    /** Скрыть типы фасада без изменения конфига */
    const hideIntegratedTypes = () => {
        isFasadeTypesExist.value = false;
        fasadeTypesList.value = {};
    };

    /** Скрыть типы фасада и сбросить TYPE в конфиге */
    const resetIntegratedTypes = () => {
        hideIntegratedTypes();
        getFasadeProps().TYPE = null;
    };

    /** Скрыть положения ручки фрезеровки без изменения конфига */
    const hideMillingHandles = () => {
        isFasadeHandleExist.value = false;
        fasadeHandleList.value = {};
    };

    /** Скрыть положения ручки фрезеровки и сбросить MILLING_TYPE в конфиге */
    const resetMillingHandles = () => {
        hideMillingHandles();
        getFasadeProps().MILLING_TYPE = null;
    };

    /** Типы фасада под новое полотно: первый тип становится выбранным */
    const applyIntegratedTypes = () => {
        const fasadeTypes = modelState.getCurrentFasadeTypesData;
        isFasadeTypesExist.value = fasadeTypes.length > 0;

        if (!isFasadeTypesExist.value) {
            fasadeTypesList.value = {};
            getFasadeProps().TYPE = null;
            return;
        }

        const typeList = getIntegratedHandleControllerData(fasadeTypes, getFasadeNdx(), "integrate");

        getFasadeProps().TYPE = typeList[0].id;
        fasadeTypesList.value = typeList;
    };

    /** Положения ручки под выбранную фрезеровку: первое положение становится выбранным */
    const applyMillingHandles = (milling) => {
        const fasadeProps = getFasadeProps();

        if (!milling.fasade_type || milling.fasade_type[0] === null) {
            resetMillingHandles();
            return;
        }

        const typeList = getIntegratedHandleControllerData(milling, getFasadeNdx(), "milling");

        if (!typeList) {
            console.warn('typeList is undefined or null');
            return;
        }

        if (typeList.length > 0) {
            isFasadeHandleExist.value = true;
            fasadeHandleList.value = typeList;
            fasadeProps.MILLING_TYPE = typeList[0].id ?? null;
        } else {
            resetMillingHandles();
        }
    };

    /** Восстановление списков из сохранённого конфига при открытии редактора */
    const restoreHandles = ({ TYPE, MILLING_TYPE, MILLING }) => {
        const fasadeNdx = getFasadeNdx();

        if (TYPE) {
            const fasadeTypes = modelState.getCurrentFasadeTypesData;
            isFasadeTypesExist.value = fasadeTypes.length > 0;
            fasadeTypesList.value = getIntegratedHandleControllerData(fasadeTypes, fasadeNdx, "integrate");
        }

        if (MILLING_TYPE && MILLING) {
            fasadeHandleList.value = getIntegratedHandleControllerData(_APP.MILLING[MILLING], fasadeNdx, "milling");
            isFasadeHandleExist.value = true;
        }
    };

    /** Выбор положения ручки фрезеровки в LoopPositionSelect */
    const onChangeMillingHandlePos = (action, id) => {
        const { FASADE_POSITIONS } = getConfig();
        const fasadeNdx = getFasadeNdx();
        const isShowcase = FASADE_POSITIONS[fasadeNdx].SHOWCASE === 1;

        getFasadeProps().MILLING_TYPE = id ?? null;

        if (isShowcase) {
            eventBus.emit("A:ChangeShowcaseMilling");
            return;
        }
        setIntegratedHandleAction(action, fasadeNdx, "milling");
    };

    /** Выбор типа фасада (положения интегрированной ручки) в LoopPositionSelect */
    const onChangeIntegratedHandlePos = (action, id) => {
        getFasadeProps().TYPE = id ?? null;

        setIntegratedHandleAction(action, getFasadeNdx(), "integrate");
    };

    return {
        fasadeTypesList,
        isFasadeTypesExist,
        fasadeHandleList,
        isFasadeHandleExist,
        hideIntegratedTypes,
        resetIntegratedTypes,
        hideMillingHandles,
        resetMillingHandles,
        applyIntegratedTypes,
        applyMillingHandles,
        restoreHandles,
        onChangeMillingHandlePos,
        onChangeIntegratedHandlePos,
    };
};
