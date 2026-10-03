// Отдельный экземпляр движка УМ для вложенной сессии редактора (тумбочка
// внутри гардеробной и т.п.). Основной экземпляр создаёт Application и держит
// всё время жизни приложения; вложенный — создаётся на время сессии и
// обязательно закрывается disposeUMEngine.
import type { Application } from "@/Application/Core/Application.ts";
import UMconstructorClass from "./UMconstructorClass.ts";
import { createUMStorage, disposeUMStorage } from "@/store/appStore/UniversalModule/useUMStorage.ts";

let sessionCounter = 0;

export const createUMEngine = (root: Application, sessionName: string): UMconstructorClass =>
    new UMconstructorClass(root, { store: createUMStorage(`${sessionName}-${++sessionCounter}`), isolatedModel: true });

export const disposeUMEngine = (engine: UMconstructorClass) => {
    engine.dispose();
    disposeUMStorage(engine.UM_STORE);
};
