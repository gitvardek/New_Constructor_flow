// Держит скоуп в стеке, пока жив компонент (или пока активно условие). Так
// модалка или канвас объявляют: «пока я на экране, хоткеи ищутся у меня».

import { getCurrentScope, onScopeDispose, toValue, watch, type MaybeRefOrGetter } from "vue";
import { scopeStack } from "../runtime";
import type { TScopeId, TUnregister } from "../types";

export interface TUseHotkeyScopeOptions {
    /** Глушить скоупы ниже — поведение модального окна. */
    exclusive?: boolean;
    /** Условие активности. Без него скоуп кладётся сразу при вызове. */
    active?: MaybeRefOrGetter<boolean>;
}

export const useHotkeyScope = (scope: TScopeId, options: TUseHotkeyScopeOptions = {}) => {
    let release: TUnregister | null = null;

    const enter = (): void => {
        if (release) return;
        release = scopeStack.push(scope, { exclusive: options.exclusive });
    };

    const leave = (): void => {
        release?.();
        release = null;
    };

    if (options.active === undefined) {
        enter();
    } else {
        watch(
            () => toValue(options.active),
            isActive => (isActive ? enter() : leave()),
            { immediate: true },
        );
    }

    if (getCurrentScope()) onScopeDispose(leave);

    return { enter, leave };
};
