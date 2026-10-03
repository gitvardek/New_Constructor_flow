// Можно ли вставить наполнение в выбранную область ("module"-выбор стора):
// слишком широкая или низкая область, универсальный ящик при тонких стенках.
// Общая логика "Вставки" обычного УМ (FillingsInsertPanel) и редактора v2.
import { computed } from "vue";
import { FILLINGS_RESTRICTION_EXCEPTIONS, UM_DRAWERS_IDS, UM_PARAMS } from "@/components/UMconstructor/utils/Const.ts";
import { resolveCellPath } from "../grid/cellPath.ts";

interface UseFillingInsertRulesOptions {
    getEngine: () => any;
    getModule: () => any;
}

export const useFillingInsertRules = ({ getEngine, getModule }: UseFillingInsertRulesOptions) => {
    const selectedArea = computed(() => {
        const { sec = null, cell = null, row = null, extra = null } = getEngine()?.UM_STORE.getSelected("module") ?? {};
        return resolveCellPath(getModule(), { sec, cell, row, extra })?.area ?? null;
    });

    const isFillingWidthRestricted = computed(() => (selectedArea.value?.width ?? 0) > UM_PARAMS.FILLINGS_MAX_WIDTH);

    const isFillingHeightRestricted = computed(
        () => (selectedArea.value?.height ?? 0) <= UM_PARAMS.MIN_SECTION_TO_FILLINGS_HEIGHT,
    );

    // Универсальный ящик — только при стенках не тоньше 18 мм.
    const isUniversalDrawerBlocked = computed(() => !getEngine()?.FILLINGS.drawers.isUniversalDrawerAllowed(getModule()));

    const isFillingBlocked = (groupID: string | number, filling?: any) => {
        if (FILLINGS_RESTRICTION_EXCEPTIONS.includes(+filling?.ID)) return false;

        return isFillingWidthRestricted.value
            || isFillingHeightRestricted.value
            || (UM_DRAWERS_IDS.UNIVERSAL.includes(+groupID) && isUniversalDrawerBlocked.value);
    };

    return {
        selectedArea,
        isFillingWidthRestricted,
        isFillingHeightRestricted,
        isFillingBlocked,
    };
};
