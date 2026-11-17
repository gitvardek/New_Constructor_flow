// Пропорциональная подгонка горизонтальной раскладки сетки УМ под новую ширину
// модуля: секции, ячейки и ряды ячеек (вертикальные разделители) масштабируются,
// не становятся уже минимума, сумма сходится точно. Тогда reset() не сваливает
// дельту в последнюю секцию/ряд (при сужении она уходила в минус и разделители
// оказывались вне корпуса) и не удаляет/добавляет секции. Позиции пересчитывает reset().
//
// Нужна там, где ширину модуля задаёт не пользователь, а внешняя система:
// тумбочка следует за шириной секции гардеробной.

const sumOf = (values: number[]) => values.reduce((acc, v) => acc + v, 0);

// Доли total пропорционально weights, каждая не меньше своего минимума: доли,
// которым не хватает до минимума, фиксируются на нём, остаток заново делится
// между остальными. Если минимумы в total не помещаются — чистая пропорция.
const shareWithMinimums = (weights: number[], total: number, mins: number[]): number[] => {
    const proportional = (indices: number[], amount: number, shares: number[]) => {
        const weight = sumOf(indices.map((i) => weights[i]));
        indices.forEach((i) => {
            shares[i] = weight > 0 ? (weights[i] * amount) / weight : amount / indices.length;
        });
    };

    const shares = new Array(weights.length).fill(0);
    const all = weights.map((_, i) => i);
    if (sumOf(mins) > total) {
        proportional(all, total, shares);
        return shares;
    }

    const fixed = new Set<number>();
    for (;;) {
        const free = all.filter((i) => !fixed.has(i));
        fixed.forEach((i) => { shares[i] = mins[i]; });
        proportional(free, total - sumOf([...fixed].map((i) => mins[i])), shares);

        const violators = free.filter((i) => shares[i] < mins[i]);
        if (!violators.length) return shares;
        violators.forEach((i) => fixed.add(i));
    }
};

// Делит total пропорционально weights с нижней границей mins (число — одна для
// всех). Целые мм по методу наибольших остатков, дробный остаток (дробные
// толщины) — последнему элементу; сумма равна total. Отрицательные веса
// (сетка, испорченная прежними пересчётами) — как нулевые.
export const distributeProportionally = (weights: number[], total: number, mins: number | number[] = 0): number[] => {
    if (!weights.length) return [];

    const safe = weights.map((w) => Math.max(w || 0, 0));
    const minimums = safe.map((_, i) => Math.max((Array.isArray(mins) ? mins[i] : mins) || 0, 0));
    const raw = shareWithMinimums(safe, total, minimums);

    const result = raw.map(Math.floor);
    let rest = total - sumOf(result);

    const byRemainder = raw
        .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
        .sort((a, b) => b.fraction - a.fraction);
    for (const { index } of byRemainder) {
        if (rest < 1) break;
        result[index] += 1;
        rest -= 1;
    }

    result[result.length - 1] += rest;
    return result;
};

// minWidth — минимальная ширина секции и ряда (UM_PARAMS.MIN_SECTION_WIDTH).
// Секции нужно не меньше, чем её рядам: n * minWidth + (n - 1) * толщина.
// Возвращает false, если минимумы в новую ширину не поместились — тогда раскладка
// чисто пропорциональная и часть элементов уже минимума.
export const scaleGridWidth = (grid: any, newWidth: number, minWidth = 0): boolean => {
    const thickness = grid.moduleThickness ?? 18;
    const left = grid.leftWallThickness ?? thickness;
    const right = grid.rightWallThickness ?? thickness;
    const sections: any[] = grid.sections ?? [];

    const rowsMinWidth = (rowsCount: number) => rowsCount * minWidth + (rowsCount - 1) * thickness;
    const sectionMins = sections.map((section) => Math.max(
        minWidth,
        ...(section.cells ?? []).map((cell: any) => rowsMinWidth(cell.cellsRows?.length || 1)),
    ));

    const sectionsWidth = newWidth - left - right - (sections.length - 1) * thickness;
    const sectionWidths = distributeProportionally(sections.map((s) => s.width), sectionsWidth, sectionMins);

    sections.forEach((section, secIndex) => {
        const width = sectionWidths[secIndex];
        section.width = width;

        section.cells?.forEach((cell: any) => {
            cell.width = width;

            const rows: any[] | undefined = cell.cellsRows;
            if (!rows?.length) return;

            const rowWidths = distributeProportionally(
                rows.map((row) => row.width),
                width - (rows.length - 1) * thickness,
                minWidth,
            );
            rows.forEach((row, rowIndex) => {
                row.width = rowWidths[rowIndex];
                row.extras?.forEach((extra: any) => { extra.width = row.width; });
            });
        });
    });

    grid.width = newWidth;
    return sumOf(sectionMins) <= sectionsWidth;
};
