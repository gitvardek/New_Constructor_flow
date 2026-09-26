export const UM_PARAMS = {
    TOTAL_LENGTH: 3000, // Общая длина в миллиметрах
    TOTAL_HEIGHT: 1200, // Общая высота в миллиметрах
    CONST_MAX_AREA_WIDTH: 800, // Максимальная ширина области в пикселях
    CONST_MAX_AREA_HEIGHT: 500, // Максимальная высота области в пикселях
    MIN_SECTION_WIDTH: 114, // Минимальная ширина секции

    MIN_SECTION_HEIGHT: 100, // Минимальная высота секции
    MIN_SECTION_TO_FILLINGS_HEIGHT: 250,// Минимальная высота секции c наполнением
    MAX_SECTION_WIDTH: 900, // Максимальная ширина секции без царги


    MAX_SECTION_WIDTH_TSARGA: 1200,  // Максимальная ширина секции с царгой

    MIN_FASADE_HEIGHT: 145,
    MIN_FASADE_WIDTH: 126,
    MAX_FASADE_WIDTH: 600,
    FASADES_MIN_GAP: 4, // Минимальный зазор между соседними фасадами по вертикали (мм)
    MIN_SLIDE_DOOR_WIDTH: 600,
    MAX_SLIDE_DOOR_WIDTH: 1300,
    MIN_HOLE_SIZE_MM: 100, // Минимальный размер отверстия в мм
    MAX_HOLE_SIZE_MM: 1000, // Максимальный размер отверстия в мм,
    NO_FASADE_ID: 7397,
    ERROR_MATERIAL_ID: 6004285,
    BACKGROUND_COLOR: "#FFFFFF",
    HOLE_OFFSET: 10,// Отступ от краёв
    SECTOR_PADDING: 0,

    RASPASHNOY_ID: 1942652, // ID распашного шкафа

    MIN_TSARGA_WIDTH: 900, // Минимальная ширина царги
    MAX_TSARGA_WIDTH: 1200,  // Максимальная ширина царги
    INNER_DRAWER_GAP: 30,        // Отступ от тела внешнего ящика и между внутренними ящиками (мм)
    INNER_DRAWER_FACADE_GAP: 45,  // Отступ от крайнего внутреннего ящика до фасада внешнего ящика (мм)
    FILLINGS_MAX_WIDTH: 900,//Максимальная ширина секции при которой можно добавить наполнение

    GLASS_SHELF_MAX_WIDTH: 900//Максимальная ширина секции при которой можно добавить стеклянную полку
}

export const UM_DRAWERS_IDS = {
    INNER: [15222587, 2166308],
    OUTER: [5726092, 6560591],
    UNIVERSAL: [15309443]
}

// Наполнение, которое можно добавлять без ограничений по ширине и высоте области
export const FILLINGS_RESTRICTION_EXCEPTIONS = [6513263];

export const WITH_TSARGA = [3954672];

// Модули, которые ставятся на сцену без фасадов: цвет фасада из настроек комнаты
// им не подставляется. 5168676 — шкаф-купе ЭКО
export const WITHOUT_START_FASADE = [5168676];

// Опции, дающие модулю собственную царгу: 7250589 — металлическая, 7250452 — деревянная.
// Геометрию обеих строит TsargaBuilder.applyModuleTsarga по CONFIG.TSARGA, различаются они
// только материалом. Для сетки поведение у них общее: раз царга модуля уже есть, верхнюю
// внутреннюю царгу под крышкой не ставим, иначе она дублируется
export const MODULE_TSARGA_OPTIONS = [7250589, 7250452];

// Конструктивная полка между ячейками. Тип выбирается при добавлении и хранится
// признаком glassShelf у ячейки, под которой полка стоит: стеклянная уходит в 3D
// и в корзину как glass_shelf и материал корпуса не получает
export const SHELF_PRODUCTS = {
    ldsp: 5975548,
    glass: 3124181,
};

// Стекло тоньше корпуса и от его материала не зависит
export const GLASS_SHELF_THICKNESS = 6;

