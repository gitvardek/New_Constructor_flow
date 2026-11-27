// Биндинги и их разрешение по скоупу. Без DOM: проверяется без браузера,
// события и побочные эффекты — в HotkeyDispatcher.

import { canonicalCombo } from "./combo";
import type { THotkeyBinding, TScopeId, TUnregister } from "../types";

const isDev = (): boolean => !!import.meta.env?.DEV;

export class HotkeyRegistry {
    /** scope -> combo -> биндинги. Последний важнее: см. resolve. */
    private byScope = new Map<TScopeId, Map<string, THotkeyBinding[]>>();

    register(binding: THotkeyBinding): TUnregister {
        const raw = Array.isArray(binding.combo) ? binding.combo : [binding.combo];
        const combos = raw
            .map(combo => {
                const canonical = canonicalCombo(combo);
                if (!canonical && isDev()) {
                    console.warn(`[hotkeys] некорректная комбинация "${combo}" у хоткея "${binding.id}" — биндинг пропущен`);
                }
                return canonical;
            })
            .filter((combo): combo is string => !!combo);

        if (!combos.length) return () => undefined;

        let scopeMap = this.byScope.get(binding.scope);
        if (!scopeMap) {
            scopeMap = new Map();
            this.byScope.set(binding.scope, scopeMap);
        }

        for (const combo of combos) {
            const list = scopeMap.get(combo);
            if (list) {
                this.warnConflict(binding, list[list.length - 1], combo);
                list.push(binding);
            } else {
                scopeMap.set(combo, [binding]);
            }
        }

        let released = false;
        return () => {
            if (released) return;
            released = true;
            const map = this.byScope.get(binding.scope);
            if (!map) return;

            for (const combo of combos) {
                const list = map.get(combo);
                if (!list) continue;
                const index = list.lastIndexOf(binding);
                if (index !== -1) list.splice(index, 1);
                if (!list.length) map.delete(combo);
            }

            if (!map.size) this.byScope.delete(binding.scope);
        };
    }

    /** Одно снятие на весь набор. */
    registerAll(bindings: THotkeyBinding[]): TUnregister {
        const releases = bindings.map(binding => this.register(binding));
        return () => releases.forEach(release => release());
    }

    /**
     * Кандидаты сверху вниз по скоупам, внутри скоупа — от последнего к первому.
     * Поэтому новый компонент перекрывает прежний, а при его размонтировании
     * прежний оживает сам.
     */
    resolve(combo: string, scopePath: TScopeId[]): THotkeyBinding[] {
        const found: THotkeyBinding[] = [];

        for (const scope of scopePath) {
            const list = this.byScope.get(scope)?.get(combo);
            if (!list?.length) continue;
            for (let i = list.length - 1; i >= 0; i--) found.push(list[i]);
        }

        return found;
    }

    /** Все живые биндинги — для отладки. */
    list(): THotkeyBinding[] {
        const all: THotkeyBinding[] = [];
        for (const scopeMap of this.byScope.values()) {
            for (const list of scopeMap.values()) {
                for (const binding of list) {
                    if (!all.includes(binding)) all.push(binding);
                }
            }
        }
        return all;
    }

    /** Перекрытие бывает осознанным, поэтому не ошибка — но и не молчим. */
    private warnConflict(incoming: THotkeyBinding, existing: THotkeyBinding, combo: string): void {
        if (!isDev()) return;
        console.warn(
            `[hotkeys] конфликт "${combo}" в скоупе "${incoming.scope}": `
            + `"${incoming.id}" перекрывает "${existing.id}". `
            + `Сработает "${incoming.id}", пока он зарегистрирован.`,
        );
    }
}
