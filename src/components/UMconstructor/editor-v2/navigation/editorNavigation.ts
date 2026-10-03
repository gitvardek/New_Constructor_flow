// Навигация по уровням редактора внутри одного окна ("хлебные крошки"):
// Гардеробная › Тумбочка 1 › ... Корневой уровень рисует хост сам, вложенные —
// компонентом из уровня. Уход с уровня (назад, крошка, Esc) проходит через
// beforeLeave, который регистрирует сама страница уровня (setBeforeLeave).
import { computed, inject, markRaw, provide, shallowRef, type Component, type InjectionKey } from "vue";

export interface EditorLevel {
    id: string;
    title: string;
    component?: Component;
    props?: Record<string, any>;
}

type LeaveGuard = () => boolean | Promise<boolean>;

export const createEditorNavigation = (root: EditorLevel) => {
    const levels = shallowRef<EditorLevel[]>([root]);
    const guards = new Map<string, LeaveGuard>();

    const current = computed(() => levels.value[levels.value.length - 1]);
    const depth = computed(() => levels.value.length);
    const nested = computed(() => levels.value.slice(1));

    const push = (level: EditorLevel) => {
        levels.value = [...levels.value, { ...level, component: level.component && markRaw(level.component) }];
    };

    const removeTop = () => {
        const top = levels.value[levels.value.length - 1];
        guards.delete(top.id);
        levels.value = levels.value.slice(0, -1);
    };

    // Вернуться на уровень index (0 — корень). Снимает уровни сверху вниз, каждый —
    // через его beforeLeave; false — остаёмся там, где остановились.
    const goTo = async (index: number): Promise<boolean> => {
        while (levels.value.length - 1 > index) {
            const guard = guards.get(current.value.id);
            if (guard && !(await guard())) return false;
            removeTop();
        }
        return true;
    };

    const back = () => goTo(levels.value.length - 2);

    // Снять верхний уровень без проверки (после "Применить").
    const pop = () => {
        if (levels.value.length > 1) removeTop();
    };

    // Сброс к корню без проверок — при закрытии всего окна.
    const reset = () => {
        levels.value = levels.value.slice(0, 1);
        guards.clear();
    };

    const setBeforeLeave = (levelId: string, guard: LeaveGuard | null) => {
        if (guard) guards.set(levelId, guard);
        else guards.delete(levelId);
    };

    // Название корня известно только при открытии окна (имя товара).
    const setRootTitle = (title: string) => {
        levels.value = [{ ...levels.value[0], title }, ...levels.value.slice(1)];
    };

    return { levels, current, depth, nested, push, goTo, back, pop, reset, setBeforeLeave, setRootTitle };
};

export type EditorNavigation = ReturnType<typeof createEditorNavigation>;

const EDITOR_NAVIGATION_KEY: InjectionKey<EditorNavigation> = Symbol("EDITOR_NAVIGATION");

export const provideEditorNavigation = (navigation: EditorNavigation) => provide(EDITOR_NAVIGATION_KEY, navigation);

// null — компонент открыт вне окна с навигацией.
export const useEditorNavigation = (): EditorNavigation | null => inject(EDITOR_NAVIGATION_KEY, null);
