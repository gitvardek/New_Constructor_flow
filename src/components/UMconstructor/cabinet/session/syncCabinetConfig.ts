// Конфиг УМ тумбочки без редактора на экране. У новой (конфига нет) — стартовая
// сетка без цоколя, у существующей — подгонка под текущие габариты секции.
// Тот же путь, что у редактора: сессия -> prepareEditorGrid -> reset. Результат
// пишется в тумбочку без пересчёта гардеробной — вызывается из него
// (WardrobeGridReset), чтобы 2D-редактор и 3D всегда получали актуальный конфиг.
//
// Если содержимое не вписалось в новую ширину (findGridViolations: секции/ряды
// уже минимума, ошибки фасадов/наполнения):
//   1) содержимое укладывается заново пропорционально, с минимумами (scaleGridWidth);
//   2) не помогло — содержимое сбрасывается: стартовая сетка, материалы корпуса
//      и опции сохраняются;
//   3) нарушает и пустая тумбочка (сброс ничего не даёт) — остаётся вариант 1.
//
// reset() откладывает только отрисовку (debounce с RENDER_REF) — dispose сессии
// её снимает, до 2D дело не доходит.
import type UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import { prepareEditorGrid } from "@/components/UMconstructor/editor-v2/session/prepareEditorGrid.ts";
import { findGridViolations, type GridViolation } from "@/components/UMconstructor/editor-v2/grid/gridViolations.ts";
import { createCabinetEditSession, type CabinetEditSession } from "./cabinetEditSession.ts";

interface Attempt {
    session: CabinetEditSession;
    grid: any;
    violations: GridViolation[];
}

// Сетка тумбочки в сессии с проверкой нарушений; null — собрать не удалось
// (сессия тогда уже закрыта).
const buildAttempt = (
    wardrobeEngine: UMconstructorClass,
    wardrobeGrid: any,
    secIndex: number,
    cabinetId: number,
    resetContent: boolean,
): Attempt | null => {
    let session: CabinetEditSession;
    try {
        session = createCabinetEditSession({ wardrobeEngine, wardrobeGrid, secIndex, cabinetId, resetContent });
    } catch (error) {
        console.error(error);
        return null;
    }

    try {
        const { engine } = session;
        const created = prepareEditorGrid(engine, session.productData, {
            prepareGrid: (grid) => session.prepareGrid(engine, grid),
        });
        if (created) engine.UM_STORE.setUMGrid(created);
        const grid = created && engine.reset(created);
        if (!grid) {
            session.dispose();
            return null;
        }

        const violations = findGridViolations(grid, engine.CONST.MIN_SECTION_WIDTH);
        return { session, grid, violations };
    } catch (error) {
        console.error(error);
        session.dispose();
        return null;
    }
};

const commit = ({ session, grid }: Attempt) => {
    session.writeBack(grid);
    session.dispose();
};

// false — не удалось собрать сетку; прежний конфиг не трогается.
export const syncCabinetConfig = (
    wardrobeEngine: UMconstructorClass,
    wardrobeGrid: any,
    secIndex: number,
    cabinetId: number,
): boolean => {
    const hadContent = !!wardrobeGrid.sections[secIndex]?.wardrobeFilling
        ?.find((item: any) => item.id === cabinetId)?.cabinet?.config;

    const fitted = buildAttempt(wardrobeEngine, wardrobeGrid, secIndex, cabinetId, false);
    if (!fitted) return false;
    if (!fitted.violations.length || !hadContent) {
        commit(fitted);
        return true;
    }

    const empty = buildAttempt(wardrobeEngine, wardrobeGrid, secIndex, cabinetId, true);
    if (empty && !empty.violations.length) {
        fitted.session.dispose();
        commit(empty);
        wardrobeEngine.callAlert(
            "warning",
            `Содержимое тумбочки в секции ${secIndex + 1} сброшено: не вписывалось в новую ширину`,
        );
        return true;
    }

    // Пустая тумбочка тоже нарушает условия — сброс не поможет, оставляем содержимое.
    empty?.session.dispose();
    commit(fitted);
    console.warn("Тумбочка не вписалась в новую ширину секции", fitted.violations);
    wardrobeEngine.callAlert(
        "warning",
        `Тумбочка в секции ${secIndex + 1} не вписалась в новую ширину — проверьте её в редакторе`,
    );
    return true;
};
