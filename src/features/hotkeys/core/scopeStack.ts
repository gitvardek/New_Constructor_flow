// Стек активных скоупов, а не флаг «текущий режим»: канвас -> редактор УМ ->
// уровень -> попап. Поиск идёт сверху вниз, корневой скоуп — последним.
// Идиома как в editorNavigation.ts, но без Vue: об изменениях сообщает колбэк,
// реактивное зеркало — в useHotkeysStore.

import type { TScopeId, TUnregister } from "../types";

export interface TScopePushOptions {
    /**
     * Скоупы ниже не опрашиваются вообще, даже корневой: Delete в модалке не
     * должен удалять объект на сцене, даже если в модалке он не занят.
     */
    exclusive?: boolean;
}

interface TScopeEntry {
    token: symbol;
    scope: TScopeId;
    exclusive: boolean;
}

export const createScopeStack = (rootScope: TScopeId) => {
    const entries: TScopeEntry[] = [];
    const listeners = new Set<(path: TScopeId[]) => void>();

    /** Скоупы для поиска: сверху вниз. */
    const getActivePath = (): TScopeId[] => {
        const path: TScopeId[] = [];

        for (let i = entries.length - 1; i >= 0; i--) {
            path.push(entries[i].scope);
            if (entries[i].exclusive) return path;
        }

        path.push(rootScope);
        return path;
    };

    const notify = (): void => {
        const path = getActivePath();
        listeners.forEach(listener => listener(path));
    };

    const push = (scope: TScopeId, options: TScopePushOptions = {}): TUnregister => {
        const entry: TScopeEntry = { token: Symbol(scope), scope, exclusive: !!options.exclusive };
        entries.push(entry);
        notify();

        let released = false;
        return () => {
            if (released) return;
            released = true;
            // Снимаем свою запись, а не верхнюю: порядок размонтирования
            // не гарантирован, pop() убрал бы чужой скоуп.
            const index = entries.findIndex(item => item.token === entry.token);
            if (index === -1) return;
            entries.splice(index, 1);
            notify();
        };
    };

    const onChange = (listener: (path: TScopeId[]) => void): TUnregister => {
        listeners.add(listener);
        listener(getActivePath());
        return () => listeners.delete(listener);
    };

    /** Для отладки: что лежит в стеке, снизу вверх. */
    const inspect = (): TScopeId[] => entries.map(entry => entry.scope);

    return { push, getActivePath, onChange, inspect, rootScope };
};

export type TScopeStack = ReturnType<typeof createScopeStack>;
