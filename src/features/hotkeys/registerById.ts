// Регистрация хоткея без Vue — для движков (Application, Constructor2D).
// Комбинация и скоуп берутся из реестра по id. Переопределения из
// useHotkeysStore не применяются: стор — часть Vue-слоя.

import { registry } from "./runtime";
import { getHotkeyMeta } from "./registry/hotkeys.config";
import type { THotkeyBinding, THotkeyHandler, THotkeyId, TUnregister } from "./types";

export const registerById = (
    id: THotkeyId,
    handler: THotkeyHandler,
    options: Partial<Omit<THotkeyBinding, "id" | "handler">> = {},
): TUnregister => {
    const meta = getHotkeyMeta(id);
    const combo = options.combo ?? meta?.combo;
    const scope = options.scope ?? meta?.scope;

    if (!combo || !scope) {
        if (import.meta.env?.DEV) {
            console.warn(`[hotkeys] "${id}" нет в registry/hotkeys.config.ts — биндинг пропущен`);
        }
        return () => undefined;
    }

    return registry.register({ ...options, id, handler, combo, scope });
};
