// Один экземпляр ядра на приложение, на уровне модуля, а не в Pinia: стор
// обернул бы классы в reactive-прокси (на них тут уже ловили падения), да и
// композициям не нужен Pinia ради реестра. Прецедент — useFullscreen.ts.

import { ref } from "vue";
import { HotkeyDispatcher } from "./core/HotkeyDispatcher";
import { HotkeyRegistry } from "./core/HotkeyRegistry";
import { ModifierTracker } from "./core/ModifierTracker";
import { createScopeStack } from "./core/scopeStack";
import { SCOPES } from "./registry/scopes";

/** Глобальный выключатель всей системы. */
export const hotkeysEnabled = ref(true);

export const registry = new HotkeyRegistry();

export const scopeStack = createScopeStack(SCOPES.GLOBAL);

/** Зажатые модификаторы. Запускается сам, пока есть подписчики. */
export const modifiers = new ModifierTracker();

export const dispatcher = new HotkeyDispatcher({
    registry,
    scopeStack,
    isEnabled: () => hotkeysEnabled.value,
});
