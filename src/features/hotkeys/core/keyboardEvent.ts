// KeyboardEvent -> канонический вид комбинации.
//
// Клавиша берётся из event.code, а не event.key: code не зависит от раскладки
// (в русской event.key для Ctrl+Z равен 'я'). Следствие для конфига — знаки
// пишутся «физически»: 'shift+1', а не '!'.

import { serializeCombo } from "./combo";

// Нажатие самого модификатора комбинацией не является.
const MODIFIER_CODES = new Set([
    "ControlLeft", "ControlRight",
    "ShiftLeft", "ShiftRight",
    "AltLeft", "AltRight",
    "MetaLeft", "MetaRight",
    "CapsLock",
]);

const CODE_ALIASES: Record<string, string> = {
    Escape: "escape",
    Delete: "delete",
    Backspace: "backspace",
    Enter: "enter",
    NumpadEnter: "enter",
    Space: "space",
    Tab: "tab",
    Home: "home",
    End: "end",
    PageUp: "pageup",
    PageDown: "pagedown",
    Insert: "insert",
    ArrowUp: "arrowup",
    ArrowDown: "arrowdown",
    ArrowLeft: "arrowleft",
    ArrowRight: "arrowright",
    Minus: "minus",
    Equal: "equal",
    NumpadSubtract: "minus",
    NumpadAdd: "equal",
    BracketLeft: "bracketleft",
    BracketRight: "bracketright",
    Backslash: "backslash",
    Semicolon: "semicolon",
    Quote: "quote",
    Comma: "comma",
    Period: "period",
    Slash: "slash",
    NumpadDivide: "slash",
    NumpadMultiply: "numpadmultiply",
    NumpadDecimal: "period",
    Backquote: "backquote",
};

/** Токен клавиши или null: нажат один модификатор либо нет ни code, ни key. */
export const eventToKeyToken = (event: KeyboardEvent): string | null => {
    const code = event.code;

    if (code) {
        if (MODIFIER_CODES.has(code)) return null;

        const alias = CODE_ALIASES[code];
        if (alias) return alias;

        if (code.startsWith("Key")) return code.slice(3).toLowerCase();
        if (code.startsWith("Digit")) return code.slice(5);
        if (code.startsWith("Numpad")) return "numpad" + code.slice(6).toLowerCase();
        if (/^F\d{1,2}$/.test(code)) return code.toLowerCase();

        return code.toLowerCase();
    }

    // Резерв: у виртуальных клавиатур и части IME code пустой
    const key = event.key;
    if (!key || key === "Dead" || key === "Unidentified") return null;
    if (["Control", "Shift", "Alt", "Meta", "CapsLock"].includes(key)) return null;

    return key.length === 1 ? key.toLowerCase() : key.toLowerCase();
};

/** null — событие хоткеем быть не может. */
export const eventToCombo = (event: KeyboardEvent): string | null => {
    const key = eventToKeyToken(event);
    if (!key) return null;

    return serializeCombo({
        key,
        ctrl: event.ctrlKey,
        alt: event.altKey,
        shift: event.shiftKey,
        meta: event.metaKey,
    });
};
