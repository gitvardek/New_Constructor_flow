// Реактивная витрина: стек скоупов, выключатель, реестр с переопределениями.
// Само ядро — в runtime.ts.

import { defineStore } from "pinia";
import { computed, readonly, ref } from "vue";
import { dispatcher, hotkeysEnabled, registry, scopeStack } from "./runtime";
import { formatCombo } from "./core/combo";
import { HOTKEYS, getHotkeyMeta } from "./registry/hotkeys.config";
import type { THotkeyId, THotkeyMeta, TScopeId } from "./types";

// Зеркало стека. Подписка на уровне модуля: стек один.
const activeScopes = ref<TScopeId[]>(scopeStack.getActivePath());
scopeStack.onChange(path => {
    activeScopes.value = path;
});

// Точка расширения для ремаппинга: хранения и UI нет, живут в памяти сессии.
const overrides = ref<Record<THotkeyId, string | string[]>>({});

export const useHotkeysStore = defineStore("hotkeys", () => {
    const start = (): void => dispatcher.start();
    const stop = (): void => dispatcher.stop();

    const getCombo = (id: THotkeyId): string | string[] | undefined =>
        overrides.value[id] ?? getHotkeyMeta(id)?.combo;

    const setCombo = (id: THotkeyId, combo: string | string[]): void => {
        overrides.value[id] = combo;
    };

    const resetCombo = (id: THotkeyId): void => {
        delete overrides.value[id];
    };

    /** Реестр с переопределениями — для подсказок в UI. */
    const hotkeys = computed<THotkeyMeta[]>(() =>
        HOTKEYS.map(meta => ({ ...meta, combo: overrides.value[meta.id] ?? meta.combo })),
    );

    /** Подпись для тултипа: «Отменить действие (Ctrl + Z)». */
    const describe = (id: THotkeyId): string => {
        const meta = getHotkeyMeta(id);
        if (!meta) return "";

        const combo = overrides.value[id] ?? meta.combo;
        const first = Array.isArray(combo) ? combo[0] : combo;
        return first ? `${meta.title} (${formatCombo(first)})` : meta.title;
    };

    /** Для отладки: что зарегистрировано прямо сейчас. */
    const describeRegistered = () =>
        registry.list().map(binding => ({
            id: binding.id,
            scope: binding.scope,
            combo: binding.combo,
        }));

    return {
        enabled: hotkeysEnabled,
        activeScopes: readonly(activeScopes),
        hotkeys,

        start,
        stop,
        getCombo,
        setCombo,
        resetCombo,
        describe,
        describeRegistered,
    };
});
