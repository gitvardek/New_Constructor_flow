// Скоупы приложения, от общего к узким. Скоуп не «включается» флагом — его
// кладёт в стек (useHotkeyScope) тот компонент, который его представляет.

export const SCOPES = {
    /** Корневой: опрашивается последним, если не перекрыт exclusive-скоупом. */
    GLOBAL: "global",
    /** Планировщик помещения, маршрут /2d (Constructor2D). */
    PLAN_2D: "plan2d",
    /** Сцена, маршрут /3d (Application). */
    SCENE_3D: "scene3d",
    /** Окно редактора модуля (УМ, гардеробная система, тумбочка). */
    UM_EDITOR: "umEditor",
    /** Модальное окно поверх всего — кладётся как exclusive. */
    POPUP: "popup",
} as const;

export type TAppScope = typeof SCOPES[keyof typeof SCOPES];
