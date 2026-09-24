import { reactive } from "vue";
import {
    FASADE_OPTION_KEYS,
    TFasadeOptionKey,
    TFasadeOptionSlot,
    TFasadeOptionsPatch,
    TOptionView,
    TSurfacePatch,
} from "../domain/fasadeOptions";

const createEmptySlot = (key: TFasadeOptionKey): TFasadeOptionSlot => ({
    list: key === "palette" ? {} : [],
    exists: false,
    current: {},
});

/**
 * Состояние редактора фасада: полотно и зависящие от него опции.
 * Объекты слотов никогда не заменяются — сброс и patch меняют их поля на месте,
 */
export const useFasadeOptionsState = () => {

    /** Полотно: выбранное значение и признак, что полотно задано (показывается блок конфигурации) */
    const surface = reactive<{ current: TOptionView; selected: boolean }>({
        current: {},
        selected: false,
    });

    const fasadeOptions = reactive<Record<TFasadeOptionKey, TFasadeOptionSlot>>({
        milling: createEmptySlot("milling"),
        palette: createEmptySlot("palette"),
        patina: createEmptySlot("patina"),
        glass: createEmptySlot("glass"),
        showcase: createEmptySlot("showcase"),
    });

    /** Применить изменения из правил (domain/fasadeOptions): заданные поля присваиваются, остальные не трогаются */
    const applyOptionsPatch = (patch: TFasadeOptionsPatch) => {
        FASADE_OPTION_KEYS.forEach((key) => {
            if (patch[key]) {
                Object.assign(fasadeOptions[key], patch[key]);
            }
        });
    };

    const applySurfacePatch = (patch: TSurfacePatch) => {
        Object.assign(surface, patch);
    };

    /** Скрыть все опции, не трогая списки и выбранные значения */
    const hideOptions = () => {
        FASADE_OPTION_KEYS.forEach((key) => {
            fasadeOptions[key].exists = false;
        });
    };

    /** Полный сброс состояния */
    const resetOptionsState = () => {
        surface.current = {};
        surface.selected = false;

        FASADE_OPTION_KEYS.forEach((key) => {
            Object.assign(fasadeOptions[key], createEmptySlot(key));
        });
    };

    return {
        surface,
        fasadeOptions,
        applyOptionsPatch,
        applySurfacePatch,
        hideOptions,
        resetOptionsState,
    };
};
