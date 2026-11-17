// Тип горизонтального разделителя (ЛДСП / стекло), выбранный в панели добавления
// SectionElementAdder. Состояние общее для всех её экземпляров и живёт вне них:
// в SectionsView панель продублирована в ветках "секция с ячейками" и "секция без
// ячеек", поэтому добавление первой полки в пустую секцию переключает ветку и
// перемонтирует панель — локальный ref исчезал бы вместе с экземпляром.
import { ref } from "vue";

export type ShelfType = "ldsp" | "glass";

export const shelfType = ref<ShelfType>("ldsp");

// Выбор запоминается в пределах одного модуля: открыли другой — снова ЛДСП.
let lastProductID: number | null = null;

export const syncShelfTypeWithModule = (productID?: number | null) => {
    if (productID == null || productID === lastProductID) {
        return;
    }

    lastProductID = productID;
    shelfType.value = "ldsp";
};
