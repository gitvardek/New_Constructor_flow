/**
   Номер сегмента сетки — тот же, которым он подписан на схеме: секция.ячейка[.ряд][.доп] (пример «1.1 1»).
 
   Схема (Render2D) и правая панель (FillingsView) берут номер отсюда: по нему пользовательнаходит в списке ящик, выбранный на схеме
 */
export const getSegmentLabel = ({
    sectionIndex = null,
    cellIndex = null,
    rowIndex = null,
    extraIndex = null,
    itemIndex = null,
}: {
    sectionIndex?: number | null;
    cellIndex?: number | null;
    rowIndex?: number | null;
    extraIndex?: number | null;
    itemIndex?: number | null;
}): string => {
    // Наполнение секции без ячеек тоже получает ячейку в номере: ячейка у него не задана,
    // и её место занимает первая
    let label =
        sectionIndex === null
            ? `${(cellIndex ?? 0) + 1}`
            : `${sectionIndex + 1}.${(cellIndex ?? 0) + 1}`;

    if (rowIndex !== null) {
        label += `.${rowIndex + 1}`;
    }

    if (extraIndex !== null) {
        label += `.${extraIndex + 1}`;
    }

    if (itemIndex !== null) {
        label += ` ${itemIndex}`;
    }

    return label;
};
