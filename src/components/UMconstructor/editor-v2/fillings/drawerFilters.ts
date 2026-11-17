// Фильтры ящиков УМ для "Вставки": свойства товара FILTER_UM_BRAND /
// FILTER_UM_DEPTH / FILTER_UM_HEIGHT (приходят из каталога вместе с товаром,
// см. FillingsManager.addFilling). Применяются только к группам из
// UM_DRAWERS_IDS, на полки/профили/аксессуары не влияют.
//
// Пустая строка в выборе = "Все" (фильтр по полю не задан).
import { UM_DRAWERS_IDS } from "../../utils/Const";

export const DRAWER_FILTER_ALL = "";

export type DrawerFilterKey = "FILTER_UM_BRAND" | "FILTER_UM_DEPTH" | "FILTER_UM_HEIGHT";

export interface DrawerFilterField {
    key: DrawerFilterKey;
    label: string;
}

export const DRAWER_FILTER_FIELDS: DrawerFilterField[] = [
    { key: "FILTER_UM_BRAND", label: "Производитель" },
    { key: "FILTER_UM_DEPTH", label: "Глубина" },
    { key: "FILTER_UM_HEIGHT", label: "Высота" },
];

export type DrawerFilterState = Record<DrawerFilterKey, string>;

export const createDrawerFilterState = (): DrawerFilterState => ({
    FILTER_UM_BRAND: DRAWER_FILTER_ALL,
    FILTER_UM_DEPTH: DRAWER_FILTER_ALL,
    FILTER_UM_HEIGHT: DRAWER_FILTER_ALL,
});

const DRAWER_GROUP_IDS = [
    ...UM_DRAWERS_IDS.INNER,
    ...UM_DRAWERS_IDS.OUTER,
    ...UM_DRAWERS_IDS.UNIVERSAL,
];

export const isDrawerGroup = (groupID: string | number) => DRAWER_GROUP_IDS.includes(+groupID);

// Значение свойства может прийти скаляром, объектом каталога ({ VALUE }/{ NAME })
// или списком (товар попадает сразу в несколько значений фильтра) — приводим к
// списку строк. Пустые значения отбрасываются: товар без свойства не совпадёт
// ни с одним выбранным фильтром.
export const getDrawerFilterValues = (item: any, key: DrawerFilterKey): string[] => {
    const raw = item?.[key];
    const list = Array.isArray(raw) ? raw : [raw];

    return list
        .map((entry) => {
            const value = entry !== null && typeof entry === "object" ? (entry.VALUE ?? entry.NAME ?? entry.value) : entry;
            return value === null || value === undefined ? "" : String(value).trim();
        })
        .filter(Boolean);
};

// skipKey — поле, чей выбор не учитывается (нужно для каскада: список значений
// самого поля строится по товарам, прошедшим ОСТАЛЬНЫЕ фильтры, иначе в нём
// остался бы один уже выбранный пункт).
export const matchesDrawerFilters = (item: any, state: DrawerFilterState, skipKey?: DrawerFilterKey): boolean =>
    DRAWER_FILTER_FIELDS.every(({ key }) => {
        if (key === skipKey || state[key] === DRAWER_FILTER_ALL) return true;
        return getDrawerFilterValues(item, key).includes(state[key]);
    });

export const filterDrawerItems = (items: any[], state: DrawerFilterState): any[] =>
    items.filter((item) => matchesDrawerFilters(item, state));

// Числа сортируем по величине (450 < 500 < 1000), текст — по алфавиту.
const compareFilterValues = (a: string, b: string): number => {
    const numberA = Number.parseFloat(a);
    const numberB = Number.parseFloat(b);

    if (!Number.isNaN(numberA) && !Number.isNaN(numberB) && numberA !== numberB) return numberA - numberB;
    return a.localeCompare(b, "ru");
};

export const getDrawerFilterOptions = (
    items: any[],
    state: DrawerFilterState,
    key: DrawerFilterKey,
): { value: string; text: string }[] => {
    const values = new Set<string>();

    items.forEach((item) => {
        if (matchesDrawerFilters(item, state, key))
            getDrawerFilterValues(item, key).forEach((value) => values.add(value));
    });

    return [...values].sort(compareFilterValues).map((value) => ({ value, text: value }));
};
