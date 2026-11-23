// Разбор комбинаций из строки ('mod+shift+z') в канонический вид:
// ctrl+alt+shift+meta, затем клавиша. Это и есть ключ реестра, поэтому
// 'shift+mod+Z' и 'Mod+Shift+z' — одна запись.

import type { TParsedCombo } from "../types";

const MODIFIER_TOKENS = new Set([
    "mod", "ctrl", "control", "alt", "option", "shift", "meta", "cmd", "command", "win",
]);

// Чтобы в конфиге можно было писать привычно ('esc', 'del', 'up').
const KEY_ALIASES: Record<string, string> = {
    esc: "escape",
    del: "delete",
    ins: "insert",
    return: "enter",
    spacebar: "space",
    " ": "space",
    up: "arrowup",
    down: "arrowdown",
    left: "arrowleft",
    right: "arrowright",
    plus: "equal",
    "-": "minus",
    "=": "equal",
};

// Подмена для тестов: null — определять по браузеру.
let macOverride: boolean | null = null;

export const setMacPlatform = (value: boolean | null): void => {
    macOverride = value;
};

export const isMac = (): boolean => {
    if (macOverride !== null) return macOverride;
    if (typeof navigator === "undefined") return false;
    // navigator.platform устарел, но userAgentData есть не во всех браузерах
    const platform = (navigator as any).userAgentData?.platform ?? navigator.platform ?? "";
    return /mac|iphone|ipad|ipod/i.test(platform);
};

export const normalizeKeyToken = (token: string): string => {
    const key = token.trim().toLowerCase();
    return KEY_ALIASES[key] ?? key;
};

/**
 * 'mod+shift+z' -> { key: 'z', ctrl: true, shift: true, ... }.
 * `mod` — Cmd на macOS и Ctrl на остальных системах.
 * null — запись некорректна (нет клавиши или их больше одной).
 */
export const parseCombo = (combo: string): TParsedCombo | null => {
    const parts = combo.split("+").map(part => part.trim().toLowerCase()).filter(Boolean);
    if (!parts.length) return null;

    const parsed: TParsedCombo = { key: "", ctrl: false, alt: false, shift: false, meta: false };
    const mac = isMac();

    for (const part of parts) {
        if (!MODIFIER_TOKENS.has(part)) {
            // Две клавиши в комбинации — ошибка записи, а не «последняя важнее»
            if (parsed.key) return null;
            parsed.key = normalizeKeyToken(part);
            continue;
        }

        switch (part) {
            case "mod":
                if (mac) parsed.meta = true;
                else parsed.ctrl = true;
                break;
            case "ctrl":
            case "control":
                parsed.ctrl = true;
                break;
            case "alt":
            case "option":
                parsed.alt = true;
                break;
            case "shift":
                parsed.shift = true;
                break;
            default:
                // meta / cmd / command / win
                parsed.meta = true;
        }
    }

    return parsed.key ? parsed : null;
};

/** Канонический порядок: ctrl, alt, shift, meta, затем клавиша. */
export const serializeCombo = (parsed: TParsedCombo): string => {
    const parts: string[] = [];
    if (parsed.ctrl) parts.push("ctrl");
    if (parsed.alt) parts.push("alt");
    if (parsed.shift) parts.push("shift");
    if (parsed.meta) parts.push("meta");
    parts.push(parsed.key);
    return parts.join("+");
};

/** Строка из конфига -> ключ реестра. null — запись некорректна. */
export const canonicalCombo = (combo: string): string | null => {
    const parsed = parseCombo(combo);
    return parsed ? serializeCombo(parsed) : null;
};

const DISPLAY_MODIFIERS: Record<string, string> = {
    ctrl: "Ctrl",
    alt: "Alt",
    shift: "Shift",
    meta: "Meta",
};

const DISPLAY_MODIFIERS_MAC: Record<string, string> = {
    ctrl: "⌃",
    alt: "⌥",
    shift: "⇧",
    meta: "⌘",
};

const DISPLAY_KEYS: Record<string, string> = {
    escape: "Esc",
    delete: "Delete",
    backspace: "Backspace",
    enter: "Enter",
    space: "Space",
    tab: "Tab",
    arrowup: "↑",
    arrowdown: "↓",
    arrowleft: "←",
    arrowright: "→",
    pageup: "PageUp",
    pagedown: "PageDown",
    minus: "-",
    equal: "=",
    comma: ",",
    period: ".",
    slash: "/",
};

/** Человеческий вид для тултипов и окна «Горячие клавиши». */
export const formatCombo = (combo: string): string => {
    const parsed = parseCombo(combo);
    if (!parsed) return combo;

    const mac = isMac();
    const modifiers = mac ? DISPLAY_MODIFIERS_MAC : DISPLAY_MODIFIERS;
    const parts: string[] = [];

    if (parsed.ctrl) parts.push(modifiers.ctrl);
    if (parsed.alt) parts.push(modifiers.alt);
    if (parsed.shift) parts.push(modifiers.shift);
    if (parsed.meta) parts.push(modifiers.meta);

    const key = parsed.key;
    parts.push(DISPLAY_KEYS[key] ?? (key.length === 1 ? key.toUpperCase() : key.replace(/^f(\d+)$/, "F$1")));

    return parts.join(mac ? "" : " + ");
};
