// Наполнение секции УМ плоским списком: сама секция и все вложенные области
// (ячейки, вертикальные и горизонтальные ячейки) в порядке сетки.
import type { CellLevel, CellPath } from "../grid/cellPath.ts";

export interface FillingLocation {
    // Секция у наполнения задана всегда.
    path: CellPath & { sec: number };
    level: CellLevel;
    // Область сетки, в fillings которой лежит наполнение.
    area: any;
    filling: any;
    // Индекс в area.fillings — его ждут методы FillingsManager.
    index: number;
}

export const collectSectionFillings = (grid: any, sec: number): FillingLocation[] => {
    const section = grid?.sections?.[sec];
    if (!section) return [];

    const result: FillingLocation[] = [];
    const collect = (level: CellLevel, area: any, path: FillingLocation["path"]) => {
        area?.fillings?.forEach((filling: any, index: number) => result.push({ level, area, path, filling, index }));
    };

    collect("section", section, { sec, cell: null, row: null, extra: null });
    section.cells?.forEach((cell: any, cellIndex: number) => {
        collect("cell", cell, { sec, cell: cellIndex, row: null, extra: null });
        cell.cellsRows?.forEach((row: any, rowIndex: number) => {
            collect("row", row, { sec, cell: cellIndex, row: rowIndex, extra: null });
            row.extras?.forEach((extra: any, extraIndex: number) => {
                collect("extra", extra, { sec, cell: cellIndex, row: rowIndex, extra: extraIndex });
            });
        });
    });

    return result;
};
