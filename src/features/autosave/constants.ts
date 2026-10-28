/** Префикс ключа снапшота в localStorage, к нему добавляется ID пользователя */
export const AUTOSAVE_KEY_PREFIX = 'vardek:autosave'

/** Версия формата снапшота: снапшоты других версий не восстанавливаются */
export const AUTOSAVE_VERSION = 1

/** Пауза после правки перед записью снапшота */
export const AUTOSAVE_DEBOUNCE_MS = 5_000

/** Страховочная периодическая запись, срабатывает только при наличии незаписанных правок */
export const AUTOSAVE_INTERVAL_MS = 60_000

/** Правки в первые секунды после старта и загрузки проекта снапшот не создают: это не работа пользователя */
export const AUTOSAVE_WARMUP_MS = 5_000

/** Снапшот старше этого срока к восстановлению не предлагается */
export const AUTOSAVE_TTL_MS = 7 * 24 * 60 * 60 * 1000

/** Порог размера снапшота: лимит localStorage около 5 МБ, оставляем запас */
export const AUTOSAVE_SIZE_LIMIT = 4_500_000

/**
 * События шины, которые не меняют данные проекта: выделение, камера, скриншоты, режимы UI.
 * Список чёрный, а не белый: незнакомое событие лучше записать лишний раз, чем потерять правку.
 */
export const AUTOSAVE_IGNORED_EVENTS: ReadonlySet<string> = new Set([
    'A:Save',
    'A:Load',
    'A:Create',
    'A:ContantLoaded',
    'A:Selected',
    'A:ClearSelected',
    'A:MouseDown',
    'A:MouseUp',
    'A:Move',
    'A:FocusOnObject',
    'A:ChangeCameraPos',
    'A:DrawingMode',
    'A:ToggleRulerVisibility',
    'A:Take3DScreenshot',
    'A:3DScreenshotCreated',
    'A:ScreenPrint',
    'A:TransformMode_On',
    'A:TransformMode_Off',
    'A:TransformSetMode',
    'A:TransformSetRotationSnap',
    'A:TransformRotationSnapChanged',
    'A:GlobalTransformMode_Off',
    'A:SelectFromBasket',
    'A:SelectModelOption',
    'A:SelectPlinth',
    'A:GlobalParamsSelect',
    'A:GlobalParapsSelect',
    'A:Toggle-Uniform-Mode',
    'A:Uniform-Mode-Toggled',
    'A:Disable-Uniform-Mode',
    'A:Pre-Create-Uniform-Group',
    'A:Cancel-Uniform-Group',
    'A:close-modal-custom',
    'C2D:Ready',
])
