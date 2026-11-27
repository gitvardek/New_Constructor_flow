// Регистрация на время жизни вызывающего effect scope: снятие автоматическое.

import { getCurrentScope, onScopeDispose } from "vue";
import { registry } from "../runtime";
import { useHotkeysStore } from "../useHotkeysStore";
import { getHotkeyMeta } from "../registry/hotkeys.config";
import type { THotkeyBinding, THotkeyHandler, THotkeyId, TUnregister } from "../types";

/**
 * Комбинация и скоуп берутся из реестра по id — остаётся только обработчик.
 * Явные combo/scope — путь для локальных хоткеев, не нужных в общем реестре.
 */
export interface THotkeyInput extends Partial<Omit<THotkeyBinding, "id" | "handler">> {
    id: THotkeyId;
    handler: THotkeyHandler;
}

export const useHotkeys = (inputs: THotkeyInput[]): TUnregister => {
    const store = useHotkeysStore();

    const bindings = inputs.reduce<THotkeyBinding[]>((acc, input) => {
        const meta = getHotkeyMeta(input.id);
        const combo = input.combo ?? store.getCombo(input.id);
        const scope = input.scope ?? meta?.scope;

        if (!combo || !scope) {
            if (import.meta.env?.DEV) {
                console.warn(
                    `[hotkeys] хоткей "${input.id}" не зарегистрирован: `
                    + `нет ${!combo ? "комбинации" : "скоупа"}. `
                    + `Добавьте запись в registry/hotkeys.config.ts или передайте значение явно.`,
                );
            }
            return acc;
        }

        acc.push({ ...input, combo, scope });
        return acc;
    }, []);

    const unregister = registry.registerAll(bindings);

    if (getCurrentScope()) onScopeDispose(unregister);

    return unregister;
};
