// Группы наполнения товара сессии для "Вставки": FILLING_SECTION товара ->
// разделы каталога -> товары. Товару проставляется groupID — по нему
// FillingsManager выбирает обработчик.
import type UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";

export interface FillingGroup {
    groupName: string;
    groupID: number;
    items: any[];
}

export const getFillingGroups = (engine: UMconstructorClass): FillingGroup[] => {
    // APP — данные приложения (useAppData().getAppData), тип в классе движка объявлен как стор.
    const { CATALOG } = engine.APP as any;
    const product = CATALOG.PRODUCTS[engine.UM_STORE.getUMData()?.PRODUCT];

    return Object.keys(product?.FILLING_SECTION ?? {})
        .map((groupID) => {
            const group = CATALOG.SECTIONS[groupID];
            if (!group?.PRODUCTS) return null;

            return {
                groupName: group.NAME,
                groupID: group.ID,
                items: group.PRODUCTS
                    .map((itemId: number) => {
                        const element = itemId ? CATALOG.PRODUCTS[itemId] : null;
                        if (element) element.groupID = group.ID;
                        return element;
                    })
                    .filter(Boolean),
            };
        })
        .filter(Boolean) as FillingGroup[];
};
