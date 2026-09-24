// @ts-nocheck
import { useEventBus } from "@/store/appliction/useEventBus";
import { useModelState } from "@/store/appliction/useModelState";
import { INTEGRATE_HANDE_EXEPTIONS } from "@/Application/F-millings";
import { useOptions } from "../../RailsRightPage/useOptions";
import { useHandlesAction } from "../../FigureRightPage/Handles/useHandlesAction";
import { useConversationActions } from "../../../actions/useConversationActions";
import { useFasadeMaterialActions } from "../../../actions/useFasadeMaterialActions";

/**
 * Команды редактора фасада: все записи в конфиг фасада (FASADE_PROPS, restrictData)
 * и все события сцены. Каждая команда — ровно один побочный эффект, порядок вызовов
 * определяет редактор. Размеры и положения ручек — в useFasadeSize / useFasadeHandles
 */
export const useFasadeCommands = (getFasadeNdx: () => number, getProductData: () => any) => {

    const eventBus = useEventBus();
    const modelState = useModelState();
    const { resetGlobal } = useOptions();
    const { getIntegratedHandleControllerData } = useHandlesAction();
    const { createFasadeConversations, checkMillingConversations } = useConversationActions();
    const { applyFasadePatina } = useFasadeMaterialActions();

    const getFasadeProps = () => getProductData().PROPS.CONFIG.FASADE_PROPS[getFasadeNdx()];

    /** Позиция фасада — витрина: фрезеровка и патина там только в конфиге, без отрисовки */
    const isShowcasePosition = () =>
        getProductData().PROPS.CONFIG.FASADE_POSITIONS[getFasadeNdx()]?.SHOWCASE === 1;

    // ─── Полотно ──────────────────────────────────────────────────────────────

    /** Смена полотна в сцене. Вызывается последней: applyFasadeChange читает MILLING/TYPE/MILLING_TYPE */
    const changeMaterial = (material) => {
        eventBus.emit("A:ChangeFasade", { data: material, fasadeNdx: getFasadeNdx() });
    };

    /** Удаление полотна («Без фасада») */
    const removeMaterial = () => {
        eventBus.emit("A:Delite-Fasad", getFasadeNdx());
    };

    /** Ограничение фрезеровок по размеру для полотна */
    const setMillingConversation = (materialId: number) => {
        getFasadeProps().MILLING_CONVERSATION = checkMillingConversations(materialId);
    };

    /** Ограничения размеров полотна — по ним onRsizeConversations проверяет фасад при ресайзе */
    const setMaterialRestrictions = (materialId: number) => {
        const fasadeNdx = getFasadeNdx();
        const productData = getProductData();

        productData.restrictData[fasadeNdx] = createFasadeConversations(
            materialId, productData.PROPS.FASADE[fasadeNdx]
        );
    };

    /** Сброс ограничений размеров полотна (всех фасадов модели — как и раньше) */
    const clearMaterialRestrictions = () => {
        getProductData().restrictData = {};
    };

    /** Сброс механизмов и пересчёт видимости опций модели под полотна фасадов */
    const resetGlobalOptions = () => {
        resetGlobal();
    };

    // ─── Фрезеровка ───────────────────────────────────────────────────────────

    /** Запись фрезеровки в конфиг без перерисовки */
    const setMilling = (millingId: number) => {
        getFasadeProps().MILLING = millingId;
    };

    /** Перерисовка фрезеровки в сцене (catchChangeMilling сам пишет MILLING и рисует текущую PATINA) */
    const changeMilling = (millingId: number, action = null) => {
        eventBus.emit("A:ChangeMilling", {
            data: millingId,
            fasadeNdx: getFasadeNdx(),
            action,
        });
    };

    /**
     * Выбор фрезеровки в MillingRedactor (перенесено из него без изменений): запись в конфиг,
     * на витрине — только пересчёт корзины, иначе перерисовка. Для фрезеровок-исключений
     * с интегрированной ручкой action берётся по первому допустимому типу фасада
     */
    const selectMilling = (milling: { ID: number; fasade_type?: (number | null)[] }) => {
        const fasadeNdx = getFasadeNdx();
        let action = null;

        /** @Применение_типа_фасадов_с_инегрированной_ручкой */
        const prepare = getIntegratedHandleControllerData(milling, fasadeNdx);

        if (prepare.length > 0 && INTEGRATE_HANDE_EXEPTIONS.includes(milling.ID)) {
            action = modelState.getCurrentMillingActionMap(prepare[0].id, milling.ID);
        }

        setMilling(milling.ID);

        // На витрине фрезеровка только в конфиге — отрисовку пропускаем
        if (isShowcasePosition()) {
            notifyShowcaseMillingChanged();
            return;
        }

        changeMilling(milling.ID, action);
    };

    /** Удаление фрезеровки: сцена ставит первую фрезеровку и патину по умолчанию */
    const removeMilling = () => {
        eventBus.emit("A:DeliteMilling", getFasadeNdx());
    };

    /** Фрезеровка витрины изменилась (только конфиг) — пересчёт корзины */
    const notifyShowcaseMillingChanged = () => {
        eventBus.emit("A:ChangeShowcaseMilling");
    };

    // ─── Палитра ──────────────────────────────────────────────────────────────

    /** Запись цвета палитры в конфиг (сцена при отрисовке пишет его и сама) */
    const setPalette = (colorId: number) => {
        getFasadeProps().PALETTE = colorId;
    };

    const changePaletteColor = (colorId: number) => {
        eventBus.emit("A:ChangePaletteColor", {
            data: colorId,
            fasadeNdx: getFasadeNdx(),
        });
    };

    // ─── Патина ───────────────────────────────────────────────────────────────

    /** Запись патины в конфиг без перерисовки */
    const setPatina = (patinaId: number | null) => {
        getFasadeProps().PATINA = patinaId;
    };

    /** Установка патины: на витрине — только конфиг, на обычном фасаде — с отрисовкой */
    const applyPatina = (patinaId: number) => {
        applyFasadePatina(patinaId, getFasadeNdx());
    };

    /** Удаление патины: PATINA = null и повторное применение палитры в сцене */
    const removePatina = () => {
        eventBus.emit("A:DelitePatina", getFasadeNdx());
    };

    // ─── Стекло и витрина ─────────────────────────────────────────────────────

    const changeGlassColor = (glassId: number) => {
        eventBus.emit("A:ChangeGlassColor", {
            data: glassId,
            fasadeNdx: getFasadeNdx(),
        });
    };

    /**
     * Витрина: запись в конфиг и отрисовка построителем витрин — тем же путём, что выбор
     * в ShowcaseRedactor. Не через фрезеровку: catchChangeMilling записал бы ID витрины в MILLING
     */
    const changeShowcase = (showcaseId: number) => {
        getFasadeProps().SHOWCASE = showcaseId;
        eventBus.emit("A:ChangeShowcase", {
            data: showcaseId,
            fasadeNdx: getFasadeNdx(),
        });
    };

    return {
        changeMaterial,
        removeMaterial,
        setMillingConversation,
        setMaterialRestrictions,
        clearMaterialRestrictions,
        resetGlobalOptions,
        setMilling,
        selectMilling,
        changeMilling,
        removeMilling,
        notifyShowcaseMillingChanged,
        setPalette,
        changePaletteColor,
        setPatina,
        applyPatina,
        removePatina,
        changeGlassColor,
        changeShowcase,
    };
};
