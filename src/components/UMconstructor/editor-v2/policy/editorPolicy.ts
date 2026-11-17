// Политика редактора УМ v2: чем продукт отличается в общих панелях (названия и
// т.п.). Корень редактора задаёт её через provideEditorPolicy; без него —
// значения обычного УМ.
import { inject, provide, type InjectionKey } from "vue";

export interface EditorPolicy {
    // Название секции в панелях: "Секция 1", "Секция тумбочки 1".
    sectionLabel: string;
}

export const DEFAULT_EDITOR_POLICY: EditorPolicy = {
    sectionLabel: "Секция",
};

const EDITOR_POLICY_KEY: InjectionKey<EditorPolicy> = Symbol("UM_EDITOR_POLICY");

export const provideEditorPolicy = (policy: EditorPolicy) => provide(EDITOR_POLICY_KEY, policy);

export const useEditorPolicy = (): EditorPolicy => inject(EDITOR_POLICY_KEY, DEFAULT_EDITOR_POLICY);
