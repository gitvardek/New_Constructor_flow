// Адрес области сетки УМ: секция -> ячейка (по полкам) -> вертикальная ячейка
// (ряд, по разделителям) -> горизонтальная ячейка (уровень внутри ряда).
// null — уровень не задан, как в выборе стора (TSelectedCell).

export interface CellPath {
    sec: number | null;
    cell: number | null;
    row: number | null;
    extra: number | null;
}

export type CellLevel = "section" | "cell" | "row" | "extra";

const isSet = (index: number | null | undefined): index is number => index !== null && index !== undefined;

// Составной номер для панелей и подписей: { sec: 0, cell: 1, row: 0 } -> "1.2.1".
export const formatCellPath = ({ sec, cell, row, extra }: CellPath): string =>
    [sec, cell, row, extra]
        .filter(isSet)
        .map((index) => index + 1)
        .join(".");

const LEVEL_LABELS: Record<Exclude<CellLevel, "section">, string> = {
    cell: "Ячейка",
    row: "Вертикальная ячейка",
    extra: "Горизонтальная ячейка",
};

// Подпись области: "Секция тумбочки 1", "Ячейка 1.2", "Вертикальная ячейка 1.2.1".
export const formatAreaTitle = (level: CellLevel, path: CellPath, sectionLabel: string): string =>
    level === "section" ? `${sectionLabel} ${(path.sec ?? 0) + 1}` : `${LEVEL_LABELS[level]} ${formatCellPath(path)}`;

// Подпись самой глубокой существующей области адреса (выбор стора может
// указывать глубже, чем есть в сетке); "" — секции нет.
export const formatSelectionTitle = (grid: any, path: CellPath, sectionLabel: string): string => {
    const resolved = resolveCellPath(grid, path);
    if (!resolved) return "";

    const { level } = resolved;
    return formatAreaTitle(level, {
        sec: path.sec,
        cell: level === "section" ? null : path.cell,
        row: level === "row" || level === "extra" ? path.row : null,
        extra: level === "extra" ? path.extra : null,
    }, sectionLabel);
};

// Самая глубокая существующая область по адресу и её уровень; null — секции нет.
export const resolveCellPath = (grid: any, { sec, cell, row, extra }: CellPath): { level: CellLevel; area: any } | null => {
    const section = isSet(sec) ? grid?.sections?.[sec] : null;
    if (!section) return null;

    const cellArea = isSet(cell) ? section.cells?.[cell] : null;
    if (!cellArea) return { level: "section", area: section };

    const rowArea = isSet(row) ? cellArea.cellsRows?.[row] : null;
    if (!rowArea) return { level: "cell", area: cellArea };

    const extraArea = isSet(extra) ? rowArea.extras?.[extra] : null;
    if (!extraArea) return { level: "row", area: rowArea };

    return { level: "extra", area: extraArea };
};
