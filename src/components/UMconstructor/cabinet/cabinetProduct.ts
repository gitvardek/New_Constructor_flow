// Товар тумбочки — обычный товар УМ из каталога (приходит с бэка в группах
// наполнения гардеробной, "Универсальная тумба" 15389606), редактируется движком
// УМ во вложенной сессии.
import { useModelState } from "@/store/appliction/useModelState.ts";
import { isWardrobeSystemProduct } from "@/components/UMconstructor/wardrobe/WardrobeSystem.ts";
import { TEST_CABINET_DATA } from "./cabinetData.ts";

// Черновой референс (до прихода товара с бэка). На него ссылаются тумбочки,
// созданные раньше, — для них он регистрируется в каталоге по требованию.
export const DRAFT_CABINET_PRODUCT_ID: number = TEST_CABINET_DATA.ID;

// Товары тумб в каталоге. moduleType у них с бэка не гарантирован, поэтому, как
// UM_LIST в DragAndDropManager, — явный список id.
export const CABINET_PRODUCT_IDS: number[] = [15389606];

// Тумба среди товаров наполнения: id из списка или товар УМ (moduleType — признак,
// по которому DragAndDropManager выбирает сборщик УМ). У штанг его нет.
export const isCabinetProduct = (product: any): boolean => {
    const id = Number(product?.ID ?? product?.id);
    if (CABINET_PRODUCT_IDS.includes(id)) return true;
    return !!product?.moduleType && !isWardrobeSystemProduct(id);
};

// Обязательные поля товара УМ, которые бэк у тумбы может не прислать: без
// FASADE_POSITION не строится стартовая сетка (createUMgrid) и не
// пересчитываются фасады. Пришедшие значения не трогаем.
const CABINET_PRODUCT_DEFAULTS = {
    FASADE_POSITION: ["4174520"],
    moduleType: { CODE: "universal" },
};

// Пустые списки бэк присылает как [null].
const applyCabinetProductDefaults = (product: any) => {
    if (!product.FASADE_POSITION?.filter(Boolean).length) {
        product.FASADE_POSITION = [...CABINET_PRODUCT_DEFAULTS.FASADE_POSITION];
    }
    if (!product.moduleType) product.moduleType = { ...CABINET_PRODUCT_DEFAULTS.moduleType };
    return product;
};

// Запись каталога товара тумбочки. Каталог один на приложение (modelState._PRODUCTS,
// APP.CATALOG.PRODUCTS и Globals сборщиков ссылаются на один объект), поэтому
// недостающие поля дописываются в саму запись — их видят и сборщик, и менеджеры УМ.
export const getCabinetProduct = (productId?: number) => {
    const products = useModelState()._PRODUCTS;
    if (productId && products[productId]) return applyCabinetProductDefaults(products[productId]);

    if (!products[DRAFT_CABINET_PRODUCT_ID]) products[DRAFT_CABINET_PRODUCT_ID] = TEST_CABINET_DATA;
    return products[DRAFT_CABINET_PRODUCT_ID];
};
