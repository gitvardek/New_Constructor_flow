// Допустимые размеры универсального ящика из его товара: глубины — единый список
// движка (DrawerFillingHandler.getUniversalDepthOptions: SIZE_EDIT_DEPTH в пределах
// глубины корпуса минус UM_PARAMS.UNIVERSAL_DRAWER_DEPTH_RESERVE), по нему же
// работают установка и подгонка под габариты; высоты — ключи DROWER_FASADE_HEIGHT.
import type UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";

const getFillingProduct = (engine: UMconstructorClass, filling: any) =>
    (engine.APP as any)?.CATALOG?.PRODUCTS?.[filling.product];

export const getUniversalDepthOptions = (engine: UMconstructorClass, grid: any, filling: any): number[] => {
    const product = getFillingProduct(engine, filling);

    return (engine as any)?.FILLINGS?.drawers?.getUniversalDepthOptions(product, grid) ?? [];
};

export const getUniversalHeightOptions = (engine: UMconstructorClass, filling: any): number[] => {
    const product = getFillingProduct(engine, filling);
    return Object.keys(product?.DROWER_FASADE_HEIGHT ?? {}).map(Number);
};
