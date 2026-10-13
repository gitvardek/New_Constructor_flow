// @ts-nocheck
import { computed } from "vue";

import { useModelState } from "@/store/appliction/useModelState";
import { useEventBus } from "@/store/appliction/useEventBus";
import { useToast } from "@/features/toaster/useToast";

import { useConversationActions } from "../../../actions/useConversationActions";

/** ID полотна «Без фасада» */
const NO_FASADE_ID = 7397;

/**
 * «Применить ко всем»: отделка текущего фасада переносится на остальные фасады объекта.
 * Здесь считаются только список подходящих фасадов, ограничения размеров и сообщения
 * пользователю, саму отделку применяет сцена (MeshEvents.applyFasadeToProduct) — там
 * порядок записей в конфиг и отрисовки общий с глобальной сменой полотна
 */
export const useApplyToAllFasades = (getFasadeNdx: () => number, getProductData: () => any) => {

    const modelState = useModelState();
    const eventBus = useEventBus();
    const toaster = useToast();
    const { createFasadeConversations, checkIgnore } = useConversationActions();

    /** Фасадов у объекта больше одного — отделку есть куда переносить */
    const isApplyToAllVisible = computed(
        () => (getProductData()?.PROPS?.FASADE?.length ?? 0) > 1,
    );

    /**
     * У текущего фасада нет полотна: «Без фасада» тоже переносится — фасады снимаются
     * со всех позиций. Намеренно не computed: конфиг фасада пишет сцена, в обход
     * реактивности Vue, и закэшированное значение осталось бы от прежнего полотна
     */
    const isNoFasadeSelected = () => {
        const color = getProductData()?.PROPS?.CONFIG?.FASADE_PROPS?.[getFasadeNdx()]?.COLOR;

        return !color || color == NO_FASADE_ID;
    };

    /**
     * Фасад принимает полотно: оно есть в списке полотен его позиции и фасад проходит
     * по размеру — те же две проверки, что фильтруют список полотен в редакторе
     */
    const isMaterialAllowedFor = (fasadeNdx, fasade, materialId, limits, ignoreSize) => {
        const { PRODUCT, CONFIG } = getProductData().PROPS;

        // Список полотен позиции: учитывает витринные полотна (GLASS_ONLY) и исключения
        // продукта. Полотно не из списка FasadeBuilder.updateFasade заменяет на «Без фасада»,
        // поэтому такие фасады не трогаем вовсе
        const allowed = modelState.createFlatFasadeData({
            data: modelState._PRODUCTS[PRODUCT].FACADE,
            def: true,
            fasadeNdx,
            productId: PRODUCT,
            fasadeCount: CONFIG.FASADE_PROPS.length,
        }) ?? [];

        if (!allowed.includes(materialId)) {
            return false;
        }

        const { FASADE_WIDTH, FASADE_HEIGHT, isDrawer } = fasade?.userData?.trueSize ?? {};

        // Ящики размером полотна не ограничены — так же их пропускает filterFasadeConversations
        if (isDrawer || ignoreSize) {
            return true;
        }

        return (
            FASADE_HEIGHT <= limits.MAX_HEIGHT &&
            FASADE_HEIGHT >= limits.MIN_HEIGHT &&
            FASADE_WIDTH <= limits.MAX_WIDTH &&
            FASADE_WIDTH >= limits.MIN_WIDTH
        );
    };

    /** Фасады объекта, которым подходит полотно текущего фасада, и пропущенные */
    const resolveTargets = () => {
        const sourceNdx = getFasadeNdx();
        const { FASADE, CONFIG, PRODUCT } = getProductData().PROPS;
        const targets: number[] = [];
        const skipped: number[] = [];

        // Снятие фасада доступно любой позиции — проверять нечего
        if (isNoFasadeSelected()) {
            FASADE.forEach((_fasade, ndx) => {
                if (ndx !== sourceNdx) {
                    targets.push(ndx);
                }
            });

            return { targets, skipped };
        }

        const materialId = CONFIG.FASADE_PROPS[sourceNdx]?.COLOR;
        const curModel = modelState.getCurrentModel;

        // Пределы размера полотна одни на весь объект: полотно и продукт у фасадов общие
        const limits = createFasadeConversations(materialId, curModel);
        const ignoreSize = checkIgnore(curModel);

        FASADE.forEach((fasade, ndx) => {
            if (ndx === sourceNdx) {
                return;
            }

            if (isMaterialAllowedFor(ndx, fasade, materialId, limits, ignoreSize)) {
                targets.push(ndx);
                return;
            }

            skipped.push(ndx);
        });

        // Список полотен в сторе собран для открытого фасада, а проверка позиций его перебила:
        // возвращаем на место, по нему редактор фильтрует полотна (filterFasadeConversations)
        modelState.createCurrentModelFasadesData({
            data: modelState._PRODUCTS[PRODUCT].FACADE,
            fasadeNdx: sourceNdx,
            productId: PRODUCT,
        });

        return { targets, skipped };
    };

    /**
     * Ограничения размеров по полотну для изменённых фасадов — те же записи, что делает
     * редактор при выборе полотна (useFasadeCommands.setMaterialRestrictions): по ним
     * onRsizeConversations проверяет фасады при изменении размеров модели
     */
    const applyRestrictions = (targets: number[], isNoFasade: boolean) => {
        const productData = getProductData();

        // Полотен у объекта не осталось — ограничений тоже: так же поступает редактор
        // при снятии одного фасада (clearMaterialRestrictions)
        if (isNoFasade) {
            productData.restrictData = {};
            return;
        }

        const { FASADE, CONFIG } = productData.PROPS;
        const materialId = CONFIG.FASADE_PROPS[getFasadeNdx()]?.COLOR;

        if (!productData.restrictData) {
            productData.restrictData = {};
        }

        targets.forEach((ndx) => {
            productData.restrictData[ndx] = createFasadeConversations(materialId, FASADE[ndx]);
        });
    };

    const fasadeNumbers = (list: number[]) => list.map((ndx) => `№${ndx + 1}`).join(", ");

    /** «применена к 1 фасаду» / «к 2 фасадам» */
    const fasadeWordTo = (count: number) =>
        count % 10 === 1 && count % 100 !== 11 ? "фасаду" : "фасадам";

    /** «снято с 1 фасада» / «с 2 фасадов» */
    const fasadeWordFrom = (count: number) =>
        count % 10 === 1 && count % 100 !== 11 ? "фасада" : "фасадов";

    const applyToAll = () => {
        if (!isApplyToAllVisible.value) {
            return;
        }

        const isNoFasade = isNoFasadeSelected();
        const { targets, skipped } = resolveTargets();

        if (skipped.length > 0) {
            toaster.warning(
                `Полотно недоступно для фасадов: ${fasadeNumbers(skipped)} — они не изменены`,
            );
        }

        if (targets.length === 0) {
            return;
        }

        applyRestrictions(targets, isNoFasade);

        eventBus.emit("A:ApplyFasadeToProduct", { fasadeNdx: getFasadeNdx(), targets });

        toaster.success(
            isNoFasade
                ? `Полотно снято с ${targets.length} ${fasadeWordFrom(targets.length)}`
                : `Конфигурация применена к ${targets.length} ${fasadeWordTo(targets.length)}`,
        );
    };

    return { isApplyToAllVisible, applyToAll };
};
