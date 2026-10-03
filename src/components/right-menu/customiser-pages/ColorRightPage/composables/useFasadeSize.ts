// @ts-nocheck
import { computed, ref } from "vue";
import { useModelState } from "@/store/appliction/useModelState";
import { useAppData } from "@/store/appliction/useAppData";
import { useEventBus } from "@/store/appliction/useEventBus";
import { TFasadeSize } from "@/types/types";

/** Ширина нестандартного фасада, вводимая вручную, и её допустимые пределы */
export type TIncomeFasadeSize = {
    width: number | null;
    min: number | null;
    max: number | null;
};

/**
 * Типоразмер фасада: список доступных размеров позиции, выбранный размер
 * и ручной ввод ширины для нестандартных размеров
 */
export const useFasadeSize = (getFasadeNdx: () => number) => {

    const modelState = useModelState();
    const eventBus = useEventBus();
    const _APP = useAppData().getAppData;

    const sizeList = ref<TFasadeSize[]>([]);
    const currentSize = ref<TFasadeSize | null>(null);
    const incomeSize = ref<TIncomeFasadeSize>({ width: null, min: null, max: null });

    const isSizeListExist = computed(() => sizeList.value.length > 0);

    // Модель фиксируется при инициализации, как и в редакторе: дальнейшие правки
    // относятся к той модели, для которой редактор был открыт
    let productData = null;
    const getProductData = () => productData;

    // Пересобираем от размера, заданного пользователем, а пока его не меняли — от
    // каталожного. Текущий SIZE брать нельзя: у моделей, где ширина задана выражением
    // от #MWIDTH#, он хранит уже пересчитанное значение и правки накручивались бы
    const getBaseModelSize = () => {
        const { PROPS } = getProductData();
        const { width, height, depth } = PROPS.CONFIG.SIZE_BASE ?? _APP.CATALOG.PRODUCTS[PROPS.PRODUCT];

        return { width, height, depth };
    };

    const emitModelResize = () => {
        eventBus.emit("A:Model-resize", {
            data: getBaseModelSize(),
            type: "resize",
        });
    };

    const createSizeList = (): TFasadeSize[] => {
        const fasadeNdx = getFasadeNdx();
        const { FASADE_SIZE, FASADE_PROPS } = getProductData().PROPS.CONFIG;

        const sizesParentKey = Object.keys(FASADE_SIZE);

        if (sizesParentKey.length == 0) {
            return [];
        }

        const parentKey = parseInt(sizesParentKey[fasadeNdx]);

        const sizesKeys = Object.values(_APP.FASADENUMBERSIZE[parentKey]).flat();
        const curSizeId = FASADE_PROPS[fasadeNdx].SIZES.id;

        const sizesData = sizesKeys
            .map((el) => {
                _APP.FASADESIZE[el].active = _APP.FASADESIZE[el].ID == curSizeId;
                return _APP.FASADESIZE[el];
            })
            .sort((a, b) => a.SORT - b.SORT);

        currentSize.value = sizesData.find((el) => el.active) ?? null;

        return sizesData;
    };

    /** Заполнение списка размеров и ручной ширины из текущей конфигурации фасада */
    const initSize = () => {
        productData = modelState.getCurrentModel.userData;
        sizeList.value = createSizeList();

        const curSize = getProductData().PROPS.CONFIG.FASADE_PROPS[getFasadeNdx()].SIZES;

        incomeSize.value = {
            width: curSize?.params?.FASADE_WIDTH ?? null,
            min: curSize?.params?.min ?? null,
            max: curSize?.params?.max ?? null,
        };
    };

    /** Выбор типоразмера из списка */
    const changeFasadeSize = (data: TFasadeSize) => {
        const fasadeNdx = getFasadeNdx();
        currentSize.value = data;

        const { FASADE_PROPS, FASADE_SIZE } = getProductData().PROPS.CONFIG;
        const curFasade = FASADE_PROPS[fasadeNdx];
        const curSize = curFasade.SIZES;
        const positionList = Object.values(FASADE_SIZE)[fasadeNdx];
        const curPositionId = positionList[data.ID].ID;
        const defaultWidth = Object.values(positionList)[0]?.FASADE_WIDTH;

        const incomePosition = _APP.FASADE_POSITION[curPositionId];
        const isIncomeWidth = isNaN(parseInt(incomePosition.FASADE_WIDTH));

        curSize.id = data.ID;
        curFasade.POSITION = curPositionId;

        if (isIncomeWidth) {

            if (incomeSize.value.width === null) {
                incomeSize.value.width = parseInt(defaultWidth);
            }

            incomeSize.value.min = data.SIZE_EDIT_WIDTH_MIN;
            incomeSize.value.max = data.SIZE_EDIT_WIDTH_MAX;

            curSize.params.FASADE_WIDTH = incomeSize.value.width;
            curSize.params.min = data.SIZE_EDIT_WIDTH_MIN;
            curSize.params.max = data.SIZE_EDIT_WIDTH_MAX;
        } else {
            incomeSize.value.width = null;
            incomeSize.value.min = null;
            incomeSize.value.max = null;
            curSize.params = {
                FASADE_WIDTH: parseInt(incomePosition.FASADE_WIDTH),
                min: null,
                max: null,
            };
        }

        emitModelResize();
    };

    /** Ручной ввод ширины нестандартного фасада */
    const updateFasadeWidth = (width: string | number) => {
        incomeSize.value.width = width;

        const curSize = getProductData().PROPS.CONFIG.FASADE_PROPS[getFasadeNdx()].SIZES;
        curSize.params.FASADE_WIDTH = width;

        emitModelResize();
    };

    const resetSize = () => {
        sizeList.value = [];
        currentSize.value = null;
        incomeSize.value = { width: null, min: null, max: null };
    };

    return {
        sizeList,
        currentSize,
        incomeSize,
        isSizeListExist,
        initSize,
        changeFasadeSize,
        updateFasadeWidth,
        resetSize,
    };
};
