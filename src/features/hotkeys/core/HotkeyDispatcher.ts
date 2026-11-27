// Единственный слушатель клавиатуры в приложении: window, фаза capture —
// раньше обработчиков на компонентах и на канвасах 2D/3D.

import { eventToCombo } from "./keyboardEvent";
import { isTypingTarget } from "../guards";
import type { HotkeyRegistry } from "./HotkeyRegistry";
import type { TScopeStack } from "./scopeStack";

export interface THotkeyDispatcherOptions {
    registry: HotkeyRegistry;
    scopeStack: TScopeStack;
    /** Глобальный выключатель — например, пока грузится проект. */
    isEnabled?: () => boolean;
    /** По умолчанию window; другая цель нужна для тестов. */
    target?: Window | Document;
}

export class HotkeyDispatcher {
    private started = false;
    private readonly onKeyDown: (event: KeyboardEvent) => void;

    constructor(private readonly options: THotkeyDispatcherOptions) {
        this.onKeyDown = (event: KeyboardEvent) => this.handle(event);
    }

    get isStarted(): boolean {
        return this.started;
    }

    start(): void {
        if (this.started) return;
        this.target.addEventListener("keydown", this.onKeyDown as EventListener, true);
        this.started = true;
    }

    stop(): void {
        if (!this.started) return;
        this.target.removeEventListener("keydown", this.onKeyDown as EventListener, true);
        this.started = false;
    }

    private get target(): Window | Document {
        return this.options.target ?? window;
    }

    private handle(event: KeyboardEvent): void {
        if (this.options.isEnabled && !this.options.isEnabled()) return;

        // Набор через IME (в старых браузерах — keyCode 229): это ввод символа
        if (event.isComposing || event.keyCode === 229) return;

        const combo = eventToCombo(event);
        if (!combo) return;

        const candidates = this.options.registry.resolve(combo, this.options.scopeStack.getActivePath());
        if (!candidates.length) return;

        const typing = isTypingTarget(event.target);

        for (const binding of candidates) {
            if (binding.enabled && !binding.enabled()) continue;
            if (event.repeat && !binding.allowRepeat) continue;
            if (typing && !binding.allowInInput) continue;

            const handled = binding.handler({
                event,
                combo,
                id: binding.id,
                scope: binding.scope,
            });

            // Явный false — «не моё»: событие не трогаем, ищем дальше
            if (handled === false) continue;

            if (binding.preventDefault !== false) event.preventDefault();
            if (binding.stopPropagation) event.stopPropagation();
            return;
        }
    }
}
