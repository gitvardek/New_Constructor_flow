/**
 * Правила доступности опций фасада и их значений по умолчанию.
 * Чистые функции: без Vue, стора и событий сцены — на входе данные, на выходе
 * изменения состояния (patch) и значения, которые вызывающая сторона запишет в конфиг
 */

/** Опции фасада, набор которых зависит от выбранного полотна */
export type TFasadeOptionKey = "milling" | "palette" | "patina" | "glass" | "showcase";

/** Выбранное значение для ConfigurationOption: картинка (imgSrc) или цвет палитры (hex) */
export type TOptionView = {
    name?: string;
    imgSrc?: string;
    hex?: string;
    [key: string]: unknown;
};

export type TFasadeOptionSlot = {
    /** Доступные значения: у палитры — объект по ID, у остальных опций — массив */
    list: any;
    /** Опция доступна для текущего полотна и показывается в конфигурации */
    exists: boolean;
    /** Выбранное значение */
    current: TOptionView;
};

/** Изменения состояния опций: заданные поля присваиваются, отсутствующие остаются как есть */
export type TFasadeOptionsPatch = Partial<Record<TFasadeOptionKey, Partial<TFasadeOptionSlot>>>;

export type TSurfacePatch = { current: TOptionView; selected: boolean };

/** Списки опций, собранные в сторе под полотно (getCurrent*Data) */
export type TFasadeOptionLists = {
    milling: any[];
    palette: Record<string, any>;
    patina: any[];
    glass: any[];
    showcase: any[];
};

export const FASADE_OPTION_KEYS: TFasadeOptionKey[] = ["milling", "palette", "patina", "glass", "showcase"];

/** Признак алюминиевого полотна в поле MATERIAL */
const ALUM_MATERIAL = "Alum";

/** Элемент справочника (фрезеровка, патина, стекло, витрина, полотно) → отображение с картинкой */
export const toImageView = (item: { NAME: string; PREVIEW_PICTURE: string }): TOptionView => ({
    name: item.NAME,
    imgSrc: item.PREVIEW_PICTURE,
});

/** Цвет палитры → отображение с цветом */
export const toColorView = (item: { NAME: string; HTML: string }): TOptionView => ({
    name: item.NAME,
    hex: item.HTML,
});

const findById = (list: any[] | undefined, id: string | number) => list?.find((item) => item.ID == id);

// ─── Смена фрезеровки ─────────────────────────────────────────────────────────

/**
 * Патина доступна для выбранной фрезеровки: фреза её не запрещает (PATINAOFF == 0)
 * и у полотна задан непустой список патин
 */
export const isPatinaAvailableForMilling = (
    millingPatinaOff: number | string | null | undefined,
    materialPatina: (number | null)[],
): boolean =>
    millingPatinaOff == 0 &&
    materialPatina.length > 0 &&
    materialPatina[0] != null &&
    materialPatina[0] != 0;

/**
 * Патина по умолчанию для фрезеровки: если фреза патину допускает (PATINAOFF == 0) —
 * первая патина из списка полотна, иначе патины нет (null)
 */
export const getDefaultPatinaForMilling = <T>(
    millingPatinaOff: number | string | null | undefined,
    patinaList: T[],
): T | null =>
    millingPatinaOff == 0 && patinaList.length > 0 ? patinaList[0] : null;

type TMillingRepairContext = {
    /** Фрезеровка и патина из конфига */
    millingId: number | string | null;
    patinaId: number | string | null;
    /** Списки фрезеровок и патин фасада (как в редакторе) */
    millingList: { ID: number; PATINAOFF?: number | string }[];
    patinaList: { ID: number }[];
};

/** Починка конфига, в котором фрезеровки нет в списке фрезеровок фасада */

export const resolveMillingRepair = ({
    millingId,
    patinaId,
    millingList,
    patinaList,
}: TMillingRepairContext): { milling: TMillingRepairContext["millingList"][number]; patinaId: number | null } | null => {
    if (millingId == null || millingList.length === 0 || findById(millingList, millingId)) {
        return null;
    }

    const milling = millingList[0];

    if (milling.PATINAOFF == 1) {
        return { milling, patinaId: null };
    }

    const selectedPatina = patinaId != null ? findById(patinaList, patinaId) : undefined;

    if (selectedPatina) {
        return { milling, patinaId: selectedPatina.ID };
    }

    return { milling, patinaId: getDefaultPatinaForMilling(milling.PATINAOFF, patinaList)?.ID ?? null };
};

// ─── Выбор полотна ────────────────────────────────────────────────────────────

type TMaterialSelectContext = {
    lists: TFasadeOptionLists;
    /** Выбранное полотно: id и поле MATERIAL */
    material: { id: number; material?: string };
    /** Позиция фасада — витрина (FASADE_POSITIONS[ndx].SHOWCASE === 1) */
    isShowcase: boolean;
    /** RESET_COLOR фасада — полотно, для которого витрина не предлагается */
    resetColor: number | null;
};

type TMaterialSelectResult = {
    patch: TFasadeOptionsPatch;
    /** Фрезеровка по умолчанию (первая в списке) — вызывающая сторона записывает её в конфиг */
    defaultMilling: any | null;
    /** Цвет палитры по умолчанию (первый в списке) — вызывающая сторона применяет его к сцене */
    defaultPaletteColor: any | null;
};

/**
 * Опции под только что выбранное полотно: какие опции доступны и какие значения
 * подставляются по умолчанию (первые элементы списков)
 */
export const resolveOptionsOnMaterialSelect = ({
    lists,
    material,
    isShowcase,
    resetColor,
}: TMaterialSelectContext): TMaterialSelectResult => {
    const isAlum = material.material?.includes(ALUM_MATERIAL);

    const millingExists = lists.milling.length > 0;
    const paletteExists = Object.keys(lists.palette).length > 0;
    const showcaseExists =
        !isAlum &&
        isShowcase &&
        material.id !== resetColor &&
        lists.showcase.length > 0;
    const glassExists = lists.glass.length > 0 && isShowcase || lists.glass.length > 0 && isAlum;

    const defaultMilling = millingExists ? lists.milling[0] : null;
    const defaultPaletteColor = paletteExists ? lists.palette[Object.keys(lists.palette)[0]] : null;

    // Патина доступна, только если её не запрещает фрезеровка по умолчанию
    const patinaExists = millingExists
        ? lists.patina.length > 0 && defaultMilling.PATINAOFF == 0
        : false;

    // Недоступные палитра и патина сохраняют прежнее выбранное значение — current не задаётся
    const palettePatch: Partial<TFasadeOptionSlot> = { list: lists.palette, exists: paletteExists };
    if (paletteExists) {
        palettePatch.current = toColorView(defaultPaletteColor);
    }

    const patinaPatch: Partial<TFasadeOptionSlot> = { list: lists.patina, exists: patinaExists };
    if (patinaExists) {
        patinaPatch.current = toImageView(lists.patina[0]);
    }

    const patch: TFasadeOptionsPatch = {
        milling: {
            list: lists.milling,
            exists: millingExists,
            current: millingExists ? toImageView(defaultMilling) : {},
        },
        palette: palettePatch,
        patina: patinaPatch,
        glass: {
            list: lists.glass,
            exists: glassExists,
            current: glassExists ? toImageView(lists.glass[0]) : {},
        },
        showcase: {
            list: lists.showcase,
            exists: showcaseExists,
            current: showcaseExists && lists.showcase.length > 0 ? toImageView(lists.showcase[0]) : {},
        },
    };

    return { patch, defaultMilling, defaultPaletteColor };
};

// ─── Восстановление из конфига ────────────────────────────────────────────────

type TConfigRestoreContext = {
    lists: TFasadeOptionLists;
    /** Сохранённые значения фасада (FASADE_PROPS[ndx]) */
    fasadeProps: {
        MILLING: number | null;
        PALETTE: number | null;
        PATINA: number | null;
        GLASS: number | null;
        SHOWCASE: number | null;
        ALUM: unknown;
        COLOR: number | null;
    };
    /** Полотно фасада из справочника (_FASADE[COLOR]) */
    material: { NAME: string; PREVIEW_PICTURE: string; PALETTE?: (number | null)[]; PATINA?: (number | null)[] };
    /** Выбранная фрезеровка из справочника (_APP.MILLING[MILLING]) */
    millingItem: { PATINAOFF: number | string } | undefined;
    /** Позиция фасада — витрина (FASADE_POSITIONS[ndx].SHOWCASE === 1) */
    isShowcase: boolean;
    /** ID полотна «Без фасада» */
    noFasadeId: number;
};

type TConfigRestoreResult = {
    patch: TFasadeOptionsPatch;
    surface: TSurfacePatch | null;
};

/**
 * Опции при открытии редактора: доступность и выбранные значения по сохранённому конфигу.
 * Рассчитано на начальное состояние редактора — не заданные в patch поля остаются начальными
 */
export const resolveOptionsFromConfig = ({
    lists,
    fasadeProps,
    material,
    millingItem,
    isShowcase,
    noFasadeId,
}: TConfigRestoreContext): TConfigRestoreResult => {
    const { MILLING, PALETTE, PATINA, GLASS, SHOWCASE, ALUM, COLOR } = fasadeProps;
    const patch: TFasadeOptionsPatch = {};

    const millingExists = lists.milling.length > 0;

    /** @Фрезеровка */
    if (millingExists) {
        patch.milling = { list: lists.milling, exists: true };
    }

    /** @Витрины */
    if (isShowcase && ALUM == null && COLOR != noFasadeId) {
        patch.showcase = { list: lists.showcase, exists: lists.showcase.length > 0 };
    }

    /** @Палитра */
    if (material.PALETTE?.[0]) {
        patch.palette = { list: lists.palette, exists: Object.keys(lists.palette).length > 0 };
    }

    /** @Патина — и для витрин: там она хранится только в конфиге (для заказа и цены), без отрисовки */
    if (material.PATINA?.[0] && millingExists) {
        patch.patina = {
            list: lists.patina,
            // Фрезеровки из конфига нет в справочнике — патина недоступна (раньше здесь падал весь редактор)
            exists: lists.patina.length > 0 && millingItem?.PATINAOFF == 0,
        };
    }

    /** @Стёкла */
    if (
        isShowcase && lists.glass.length > 0 ||
        lists.glass.length > 0 && ALUM !== null
    ) {
        patch.glass = { list: lists.glass, exists: lists.glass.length > 0 };
    }

    // Текущие выбранные значения
    const setCurrent = (key: TFasadeOptionKey, current: TOptionView) => {
        patch[key] = { ...patch[key], current };
    };

    /** Выбранное значение опции — элемент списка с сохранённым в конфиге ID */
    const setCurrentIfFound = (key: Exclude<TFasadeOptionKey, "palette">, id: number) => {
        const item = findById(lists[key], id);

        if (item) {
            setCurrent(key, toImageView(item));
        }
    };

    if (MILLING) {
        setCurrentIfFound("milling", MILLING);
    }
    if (PALETTE && lists.palette[PALETTE]) {
        setCurrent("palette", toColorView(lists.palette[PALETTE]));
    }
    if (PATINA) {
        setCurrentIfFound("patina", PATINA);
    }
    if (SHOWCASE) {
        setCurrentIfFound("showcase", SHOWCASE);
    }
    if (GLASS) {
        setCurrentIfFound("glass", GLASS);
    }

    const surface = COLOR && material
        ? { current: toImageView(material), selected: true }
        : null;

    return { patch, surface };
};
