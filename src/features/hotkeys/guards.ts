// Условия, при которых хоткей не срабатывает.

// На этих типах input текста нет — хоткеи должны работать
const NON_TEXT_INPUT_TYPES = new Set([
    "button", "checkbox", "color", "file", "image", "radio", "range", "reset", "submit",
]);

/** Фокус в поле, куда пользователь печатает. */
export const isTypingTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) return false;

    // contenteditable прежний обработчик 2D не учитывал
    if (target.isContentEditable) return true;

    const tag = target.tagName;
    if (tag === "TEXTAREA" || tag === "SELECT") return true;

    if (tag === "INPUT") {
        const type = (target as HTMLInputElement).type?.toLowerCase() ?? "text";
        return !NON_TEXT_INPUT_TYPES.has(type);
    }

    return false;
};

/**
 * Modal.vue построен на <dialog>, и Esc там гасит сам браузер (событие cancel).
 * Пока диалог открыт, свой Esc не навязываем — сработало бы дважды.
 */
export const hasOpenNativeDialog = (): boolean =>
    !!document.querySelector("dialog[open]");
