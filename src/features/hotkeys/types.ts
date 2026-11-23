// Ядро (core/*) не знает ни про Vue, ни про Pinia, поэтому типы в терминах
// DOM: тем же ядром могут пользоваться движки (Application, Constructor2D).

/** Идентификатор скоупа. Прикладные значения — в registry/scopes.ts. */
export type TScopeId = string;

/** Ключ в реестре: по нему же идут подсказки и ремаппинг. */
export type THotkeyId = string;

/** Разобранная комбинация. `mod` уже приведён к ctrl/meta по текущей ОС. */
export interface TParsedCombo {
    key: string;
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
}

export interface THotkeyContext {
    event: KeyboardEvent;
    /** Канонический вид сработавшей комбинации, например 'ctrl+shift+z'. */
    combo: string;
    id: THotkeyId;
    scope: TScopeId;
}

/**
 * Явный `false` — «не моё, передай дальше»: диспетчер уходит в нижние скоупы и
 * не трогает событие. Синхронный намеренно: у промиса не спросить «моё/не моё»
 * до того, как событие уйдёт дальше.
 */
export type THotkeyHandler = (ctx: THotkeyContext) => boolean | void;

export interface THotkeyBinding {
    id: THotkeyId;
    /** Одна комбинация или несколько синонимов (например 'delete' и 'backspace'). */
    combo: string | string[];
    scope: TScopeId;
    handler: THotkeyHandler;
    /** preventDefault после успешной обработки. По умолчанию true. */
    preventDefault?: boolean;
    /**
     * stopPropagation после обработки. По умолчанию false: ловим на capture,
     * и глушение сломало бы @keydown внутри компонентов.
     */
    stopPropagation?: boolean;
    /** Работать, когда фокус в поле ввода. По умолчанию false. */
    allowInInput?: boolean;
    /** Работать на автоповторе при удержании клавиши. По умолчанию false. */
    allowRepeat?: boolean;
    /** false — биндинг как будто не зарегистрирован. */
    enabled?: () => boolean;
}

/** Запись реестра: документация, подсказки в UI, ремаппинг. */
export interface THotkeyMeta {
    id: THotkeyId;
    combo: string | string[];
    scope: TScopeId;
    /** Короткая подпись для UI. */
    title: string;
    description?: string;
}

/** Снятие регистрации — биндинга или скоупа. Идемпотентно. */
export type TUnregister = () => void;
