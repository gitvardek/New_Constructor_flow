// Единый реестр: id, комбинация, скоуп, подпись. Источник правды для подсказок
// в UI и ремаппинга. Обработчиков здесь нет — они регистрируются по id там, где
// есть доступ к нужным сторам (см. commands/).
//
// Как добавить: запись сюда -> id в HOTKEY_IDS -> useHotkeys({ id, handler }).
// Подробнее — readme.md.

import type { PopupKey } from "@/components/popUp";
import { SCOPES } from "./scopes";
import type { THotkeyId, THotkeyMeta } from "../types";

export const HOTKEY_IDS = {
    /** Esc — закрыть верхнее модальное окно. */
    CLOSE_TOP_POPUP: "popup.closeTop",
    /** Delete/Backspace — удалить активную стену или проём в плане. */
    PLAN2D_DELETE_ACTIVE: "plan2d.deleteActive",
    /** Ctrl+Z — шаг назад по истории (2D и 3D). */
    HISTORY_UNDO: "history.undo",
    /** Ctrl+Y или Ctrl+Shift+Z — шаг вперёд. */
    HISTORY_REDO: "history.redo",
    /** Демо-биндинг: проверяет весь путь целиком. Снимается без следов. */
    TOGGLE_RULER: "toolbar.ruller",
    /** Копирование объекта */
    DUPLICATE_PRODUCT: "product.duplicate",
    /** Delete/Backspace — удалить выделенный товар со сцены. */
    DELETE_PRODUCT: "product.delete",
    /** Ctrl+S — сохранение проекта. */
    SAVE_PROJECT: "project.save",
} as const;

export const HOTKEYS: THotkeyMeta[] = [
    {
        id: HOTKEY_IDS.CLOSE_TOP_POPUP,
        combo: "escape",
        scope: SCOPES.POPUP,
        title: "Закрыть окно",
        description: "Закрывает последнее открытое модальное окно.",
    },
    {
        id: HOTKEY_IDS.PLAN2D_DELETE_ACTIVE,
        combo: ["delete", "backspace"],
        scope: SCOPES.PLAN_2D,
        title: "Удалить выбранное",
        description: "Активная стена или проём в плане помещения.",
    },
    {
        id: HOTKEY_IDS.HISTORY_UNDO,
        combo: "mod+z",
        scope: SCOPES.GLOBAL,
        title: "Отменить действие",
        description: "Работает там же, где кнопки истории в шапке: на /2d и /3d.",
    },
    {
        id: HOTKEY_IDS.HISTORY_REDO,
        combo: ["mod+y", "mod+shift+z"],
        scope: SCOPES.GLOBAL,
        title: "Вернуть действие",
    },
    {
        id: HOTKEY_IDS.TOGGLE_RULER,
        combo: "alt+r",
        scope: SCOPES.GLOBAL,
        title: "Отображение линейки",
        description: "Демонстрационный биндинг: та же команда, что у кнопки тулбара.",
    },
    {
        id: HOTKEY_IDS.DUPLICATE_PRODUCT,
        combo: "mod+c",
        scope: SCOPES.SCENE_3D,
        title: "Дублировать товар",
        description: "Та же команда, что у кнопки копирования в контроллере товара.",
    },
    {
        id: HOTKEY_IDS.DELETE_PRODUCT,
        combo: ["delete", "backspace"],
        scope: SCOPES.SCENE_3D,
        title: "Удалить товар",
        description: "Та же команда, что у кнопки удаления в контроллере. Откат — Ctrl+Z.",
    },
    {
        id: HOTKEY_IDS.SAVE_PROJECT,
        combo: "mod+s",
        scope: SCOPES.GLOBAL,
        title: "Сохранить проект",
        description: "Та же команда, что у кнопки в тулбаре: переход на /3d и диалог имени.",
    },
];

/**
 * Окна, которые Esc закрывать не должен: решение пользователя нельзя пропустить
 * (autosave, projectParams) либо потерялись бы введённые данные (формы).
 * Место этого признака — POPUP_CONFIG (`dismissible?: boolean`).
 */
export const ESC_LOCKED_POPUPS: ReadonlySet<PopupKey> = new Set<PopupKey>([
    "autosave",
    "projectParams",
    "formbasket",
    "technologist-form",
]);

const BY_ID: Record<THotkeyId, THotkeyMeta> = HOTKEYS.reduce((acc, meta) => {
    acc[meta.id] = meta;
    return acc;
}, {} as Record<THotkeyId, THotkeyMeta>);

export const getHotkeyMeta = (id: THotkeyId): THotkeyMeta | undefined => BY_ID[id];
