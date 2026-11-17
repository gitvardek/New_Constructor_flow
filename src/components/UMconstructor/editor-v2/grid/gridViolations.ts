// Нарушения сетки УМ, видимые без 2D: ширины секций/рядов меньше минимума и
// флаги error на фасадах и наполнении — их выставляет reset()
// (FasadesManager.updateFasades, ExternalFasadesManager, FillingsCore.updateFilling).
// Ошибки петель (grid.errors) считаются только при 2D-отрисовке — здесь их нет.

export type GridViolation = "section-width" | "row-width" | "fasade" | "filling";

const hasFlagged = (items: any): boolean =>
    Array.isArray(items) && items.flat(2).some((item: any) => item?.error === true);

// minWidth — минимальная ширина секции и ряда (UM_PARAMS.MIN_SECTION_WIDTH).
export const findGridViolations = (grid: any, minWidth: number): GridViolation[] => {
    const found = new Set<GridViolation>();
    const checkFillings = (owner: any) => {
        if (hasFlagged(owner?.fillings)) found.add("filling");
    };

    if (hasFlagged(grid?.fasades)) found.add("fasade");

    (grid?.sections ?? []).forEach((section: any) => {
        if (section.width < minWidth) found.add("section-width");
        if (hasFlagged(section.fasades) || hasFlagged(section.fasadesDrawers)) found.add("fasade");
        checkFillings(section);

        section.cells?.forEach((cell: any) => {
            checkFillings(cell);
            cell.cellsRows?.forEach((row: any) => {
                if (row.width < minWidth) found.add("row-width");
                checkFillings(row);
                row.extras?.forEach(checkFillings);
            });
        });
    });

    return [...found];
};
