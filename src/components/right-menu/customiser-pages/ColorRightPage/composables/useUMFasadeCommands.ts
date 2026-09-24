// @ts-nocheck
import { useEventBus } from "@/store/appliction/useEventBus";
import { useConversationActions } from "../../../actions/useConversationActions";
import { useHandlesAction } from "../../FigureRightPage/Handles/useHandlesAction";

/** parent-callback редактора УМ: (значение, поле, ID цвета палитры, модель алюм. профиля) */
type TSendToCell = (value: unknown, type: string, paletteId?: unknown, alumModel?: unknown) => void;

type TUMFasadeCommandsParams = {
    sendToCell: TSendToCell;
    getElementIndex: () => number | string;
    /** Данные элемента: props.elementData или FASADE_PROPS[elementIndex] модели */
    getElementData: () => any;
    getProductData: () => any;
};

/**
 * Команды редактора фасада УМ (AdvanceCorpusMaterialRedactor) — аналог useFasadeCommands.
 * Значения пишутся не в FASADE_PROPS модели, а в материал ячейки сетки УМ через parent-callback
 * (selectOption в FasadesView / FillingsView / SidecolorsView), модель пересобирается из сетки.
 * Каждая команда — ровно один побочный эффект, порядок вызовов определяет редактор.
 * Размеры фасада (SIZES, A:Model-resize) пока остаются в редакторе
 */
export const useUMFasadeCommands = ({
    sendToCell,
    getElementIndex,
    getElementData,
    getProductData,
}: TUMFasadeCommandsParams) => {

    const eventBus = useEventBus();
    const { createFasadeConversations } = useConversationActions();
    const { setIntegratedHandleAction } = useHandlesAction();

    // ─── Материал ячейки сетки (parent-callback) ──────────────────────────────
    // selectOption пишет value.ID || value, а false / null — как null

    /** Полотно; вместе с ним — цвет палитры по умолчанию и модель алюминиевого профиля */
    const setMaterial = (material, paletteId, alumModel) => {
        sendToCell(material, "COLOR", paletteId, alumModel);
    };

    const setMilling = (value) => {
        sendToCell(value, "MILLING");
    };

    const setMillingType = (value) => {
        sendToCell(value, "MILLING_TYPE");
    };

    const setPalette = (value) => {
        sendToCell(value, "PALETTE");
    };

    const setPatina = (value) => {
        sendToCell(value, "PATINA");
    };

    /**
     * Стекло. Раньше при выборе полотна сюда же передавались null и модель профиля — все три
     * selectOption читают третий аргумент как if (palette), а модель — только для COLOR
     */
    const setGlass = (value) => {
        sendToCell(value, "GLASS");
    };

    const setShowcase = (value) => {
        sendToCell(value, "SHOWCASE");
    };

    const setType = (value) => {
        sendToCell(value, "TYPE");
    };

    // ─── Прямая запись в данные элемента ──────────────────────────────────────

    /** Патина в данных элемента без parent-callback — в сетку уходит вместе со следующим вызовом */
    const writeElementPatina = (value) => {
        getElementData().PATINA = value;
    };

    const writeElementMillingType = (value) => {
        getElementData().MILLING_TYPE = value;
    };

    /** Сброс положений ручек в FASADE_PROPS модели — только если там есть такой элемент */
    const resetModelFasadeTypes = () => {
        const elementIndex = getElementIndex();
        const { FASADE_PROPS } = getProductData().PROPS.CONFIG;

        if (elementIndex && FASADE_PROPS[elementIndex]) {
            FASADE_PROPS[elementIndex].TYPE = null;
            FASADE_PROPS[elementIndex].MILLING_TYPE = null;
        }
    };

    // ─── Ограничения размеров полотна ─────────────────────────────────────────

    /** Как и раньше, без модели: createFasadeConversations возвращает неограниченные пределы */
    const setMaterialRestrictions = (materialId) => {
        getProductData().restrictData[getElementIndex()] = createFasadeConversations(materialId);
    };

    const clearMaterialRestrictions = () => {
        getProductData().restrictData = {};
    };

    // ─── Сцена ────────────────────────────────────────────────────────────────

    /** Пересчёт опций модели после смены полотна */
    const notifyOptionsUpdate = () => {
        eventBus.emit("A:OptionsUpdate");
    };

    /** Положение ручки: "milling" — ручка фрезеровки, "integrate" — интегрированная ручка */
    const applyHandleAction = (action, type: "milling" | "integrate") => {
        setIntegratedHandleAction(action, getElementIndex(), type);
    };

    return {
        setMaterial,
        setMilling,
        setMillingType,
        setPalette,
        setPatina,
        setGlass,
        setShowcase,
        setType,
        writeElementPatina,
        writeElementMillingType,
        resetModelFasadeTypes,
        setMaterialRestrictions,
        clearMaterialRestrictions,
        notifyOptionsUpdate,
        applyHandleAction,
    };
};
