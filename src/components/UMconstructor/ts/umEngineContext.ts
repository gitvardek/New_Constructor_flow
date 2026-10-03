// Движок УМ (UMconstructorClass), в дереве которого смонтирован компонент.
// Корень редактора (MainView/WardrobeMainView) делает provideUMEngine; общие
// компоненты, которые живут и вне редактора (AdvanceCorpusMaterialRedactor),
// берут стор через useUMEngineStorage — внутри редактора это стор его сессии,
// снаружи основной.
import { hasInjectionContext, inject, provide, type InjectionKey } from "vue";
import type UMconstructorClass from "./UMconstructorClass.ts";
import { useUMStorage, type UMStorage } from "@/store/appStore/UniversalModule/useUMStorage.ts";
import { useModelState } from "@/store/appliction/useModelState.ts";

export const UM_ENGINE_KEY: InjectionKey<UMconstructorClass> = Symbol("UM_ENGINE");

export const provideUMEngine = (engine: UMconstructorClass) => provide(UM_ENGINE_KEY, engine);

export const useUMEngineStorage = (): UMStorage => inject(UM_ENGINE_KEY, null)?.UM_STORE ?? useUMStorage();

// Контекст для общих компонентов правого меню (материал, ручки, опции, проверки
// размеров фасадов): внутри редактора УМ — модель (getModel) и стор его движка,
// вне — выбранный 3D-объект и основной стор. Вне setup (классы, сторы)
// контекста нет — тоже выбранный объект.
// isolated — вложенная сессия (тумбочка): её объекта на сцене нет, события
// 3D-сцене не шлются, объект собирается из конфига при применении.
export const useUMEditorContext = () => {
    const engine = hasInjectionContext() ? inject(UM_ENGINE_KEY, null) : null;
    const modelState = useModelState();

    return {
        getModel: (): any => (engine ? engine.getModel() : modelState.getCurrentModel),
        store: engine?.UM_STORE ?? useUMStorage(),
        isolated: !!engine?.SESSION_MODEL,
    };
};

export const useUMEditorModel = (): (() => any) => useUMEditorContext().getModel;
