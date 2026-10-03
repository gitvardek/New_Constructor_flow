// Допустимые размеры универсального ящика из его товара: глубины из
// SIZE_EDIT_DEPTH (не глубже модуля минус 50 мм), высоты — ключи DROWER_FASADE_HEIGHT.
import type UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";

const UNIVERSAL_DEPTH_RESERVE = 50;

const getFillingProduct = (engine: UMconstructorClass, filling: any) =>
    (engine.APP as any)?.CATALOG?.PRODUCTS?.[filling.product];

export const getUniversalDepthOptions = (engine: UMconstructorClass, grid: any, filling: any): number[] => {
    const product = getFillingProduct(engine, filling);
    if (!product?.SIZE_EDIT_DEPTH?.length) return [];

    const maxAllowed = (grid?.depth ?? 0) - UNIVERSAL_DEPTH_RESERVE;
    return product.SIZE_EDIT_DEPTH.filter((depth: number) => depth <= maxAllowed);
};

export const getUniversalHeightOptions = (engine: UMconstructorClass, filling: any): number[] => {
    const product = getFillingProduct(engine, filling);
    return Object.keys(product?.DROWER_FASADE_HEIGHT ?? {}).map(Number);
};
