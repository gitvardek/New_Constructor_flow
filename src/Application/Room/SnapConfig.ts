// Параметры режима stuking: примагничивание объектов друг к другу при
// перетаскивании — горизонтальный зазор и выравнивание верхов. UI нет: значения
// правятся здесь, режим переключается хоткеем Alt+S (HOTKEY_IDS.TOGGLE_STUKING,
// регистрация в MoveManager).

export const SNAP_CONFIG = {
    /** Режим включён при старте приложения */
    stuking: true,
    /** Горизонтальный зазор до соседа, который схлопывается до нуля, мм */
    threshold: 50,
    /** Разница верхов, при которой объект встаёт на уровень соседа, мм */
    topThreshold: 50,
}

export const toggleStuking = (): boolean => (SNAP_CONFIG.stuking = !SNAP_CONFIG.stuking)
