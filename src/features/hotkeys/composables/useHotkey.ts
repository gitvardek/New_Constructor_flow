// Сахар над useHotkeys для одного биндинга.

import { useHotkeys, type THotkeyInput } from "./useHotkeys";
import type { THotkeyHandler, THotkeyId, TUnregister } from "../types";

export const useHotkey = (
    id: THotkeyId,
    handler: THotkeyHandler,
    options: Omit<THotkeyInput, "id" | "handler"> = {},
): TUnregister => useHotkeys([{ id, handler, ...options }]);
