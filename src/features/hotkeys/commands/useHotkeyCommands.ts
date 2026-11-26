// Мост между реестром хоткеев и командами приложения: логики в хоткее нет, он
// вызывает то же, что кнопка (для тулбара — буквально тот же
// QuickActionItem.action). Устанавливается один раз в DefaultLayout.vue.

import { useRoute } from "vue-router";
import { usePopupStore } from "@/store/appStore/popUpsStore";
import { useQuickActionsToolbar, type ActionKey } from "@/features/quickActions/useQuickActionsToolbar";
import { useHotkeys } from "../composables/useHotkeys";
import { useHotkeysStore } from "../useHotkeysStore";
import { hasOpenNativeDialog } from "../guards";
import { ESC_LOCKED_POPUPS, HOTKEY_IDS } from "../registry/hotkeys.config";

export const useHotkeyCommands = () => {
    const store = useHotkeysStore();
    const popupStore = usePopupStore();
    const route = useRoute();

    // Вторая копия рефов тулбара; слушателей композиция не навешивает, так что
    // побочных эффектов нет. Станет хоткеев больше — поднять список в стор.
    const { actions } = useQuickActionsToolbar();

    const runAction = (key: ActionKey): boolean => {
        const action = actions.find(item => item.key === key);
        if (!action) {
            if (import.meta.env?.DEV) console.warn(`[hotkeys] команда тулбара "${key}" не найдена`);
            return false;
        }
        action.action();
        return true;
    };

    useHotkeys([
        {
            id: HOTKEY_IDS.CLOSE_TOP_POPUP,
            handler: () => {
                // Нативный <dialog> (Modal.vue) гасит Esc сам — отдаём ему
                if (hasOpenNativeDialog()) return false;

                const key = popupStore.topPopup;
                if (!key) return false;
                // Окна с решением пользователя и формы Esc не закрывает
                if (ESC_LOCKED_POPUPS.has(key)) return false;

                popupStore.closePopup(key);
            },
        },
        {
            // ДЕМО. Снять: этот блок + запись TOGGLE_RULER в hotkeys.config.ts
            id: HOTKEY_IDS.TOGGLE_RULER,
            // Кнопка линейки есть только на /3d
            enabled: () => route.path === "/3d",
            handler: () => {
                runAction("ruller");
            },
        },
    ]);

    return {
        start: store.start,
        stop: store.stop,
    };
};
