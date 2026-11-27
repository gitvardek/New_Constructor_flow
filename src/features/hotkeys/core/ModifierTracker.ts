// Зажатые модификаторы (Ctrl/Alt/Shift/Meta) — это не комбинация, а состояние:
// диспетчер такие нажатия отбрасывает и keyup не слушает вовсе, а камере и
// планировщику нужно именно «зажат ли сейчас».
//
// Сброс на blur и visibilitychange: иначе alt-tab с зажатым Shift оставляет
// флаг включённым навсегда.

import type { TUnregister } from "../types";

export interface TModifierState {
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
}

type TListener = (state: Readonly<TModifierState>) => void;

const NONE: TModifierState = { ctrl: false, alt: false, shift: false, meta: false };

export class ModifierTracker {
    private current: TModifierState = { ...NONE };
    private listeners = new Set<TListener>();
    private started = false;

    private readonly onKey = (event: KeyboardEvent): void => this.apply({
        ctrl: event.ctrlKey,
        alt: event.altKey,
        shift: event.shiftKey,
        meta: event.metaKey,
    });

    private readonly onReset = (): void => this.apply({ ...NONE });

    get state(): Readonly<TModifierState> {
        return this.current;
    }

    get isStarted(): boolean {
        return this.started;
    }

    start(): void {
        if (this.started) return;
        // capture: состояние должно обновиться раньше прикладных обработчиков
        window.addEventListener("keydown", this.onKey, true);
        window.addEventListener("keyup", this.onKey, true);
        window.addEventListener("blur", this.onReset);
        document.addEventListener("visibilitychange", this.onReset);
        this.started = true;
    }

    stop(): void {
        if (!this.started) return;
        window.removeEventListener("keydown", this.onKey, true);
        window.removeEventListener("keyup", this.onKey, true);
        window.removeEventListener("blur", this.onReset);
        document.removeEventListener("visibilitychange", this.onReset);
        this.started = false;
        this.onReset();
    }

    /** Слушатели включены, пока есть хотя бы один подписчик. */
    subscribe(listener: TListener): TUnregister {
        this.listeners.add(listener);
        this.start();
        listener(this.current);

        let released = false;
        return () => {
            if (released) return;
            released = true;
            this.listeners.delete(listener);
            if (!this.listeners.size) this.stop();
        };
    }

    private apply(next: TModifierState): void {
        const prev = this.current;
        if (prev.ctrl === next.ctrl && prev.alt === next.alt
            && prev.shift === next.shift && prev.meta === next.meta) return;

        this.current = next;
        this.listeners.forEach(listener => listener(next));
    }
}
