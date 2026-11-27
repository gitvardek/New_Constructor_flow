// Публичный API системы хоткеев.

export { useHotkeys, type THotkeyInput } from "./composables/useHotkeys";
export { useHotkey } from "./composables/useHotkey";
export { useHotkeyScope, type TUseHotkeyScopeOptions } from "./composables/useHotkeyScope";
export { useHotkeyCommands } from "./commands/useHotkeyCommands";
export { useHotkeysStore } from "./useHotkeysStore";
export { registerById } from "./registerById";

export { SCOPES, type TAppScope } from "./registry/scopes";
export { HOTKEYS, HOTKEY_IDS, ESC_LOCKED_POPUPS, getHotkeyMeta } from "./registry/hotkeys.config";

export { formatCombo, canonicalCombo, isMac } from "./core/combo";
export { modifiers } from "./runtime";
export type { TModifierState } from "./core/ModifierTracker";
export { isTypingTarget, hasOpenNativeDialog } from "./guards";

export type {
    THotkeyBinding,
    THotkeyContext,
    THotkeyHandler,
    THotkeyId,
    THotkeyMeta,
    TParsedCombo,
    TScopeId,
    TUnregister,
} from "./types";
