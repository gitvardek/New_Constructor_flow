// Валидатор высоты распашного шкафа (UM_PARAMS.RASPASHNOY_ID) при загрузке
// проекта: сохранённая высота ниже каталожного минимума поднимается до него.
// Пересчёт — отдельным движком УМ (как сессия тумбочки, cabinet/session):
// высоты секций, фасады, петли и наполнение тянет только reset(), без него
// корпус станет выше секций.
//@ts-nocheck

import { toRaw } from "vue";
import type { Application } from "@/Application/Core/Application.ts";
import { createUMEngine, disposeUMEngine } from "@/components/UMconstructor/ts/createUMEngine.ts";
import { cloneUMData } from "@/components/UMconstructor/editor-v2/session/cloneUMData.ts";
import { UM_PARAMS } from "@/components/UMconstructor/utils/Const.ts";
import { saveUMGrid } from "@/components/UMconstructor/utils/PixiMethods.ts";
import { useModelState } from "@/store/appliction/useModelState.ts";

/** Сетка распашного из сохранённых PROPS; null — другой товар или пустая сетка. */
const getRaspashnoyGrid = (PROPS: any) => {
    const grid = PROPS?.CONFIG?.MODULEGRID;
    if (!grid?.sections?.length) return null;

    const productID = Number(grid.productID ?? PROPS.CONFIG.ID ?? PROPS.PRODUCT);
    return productID === UM_PARAMS.RASPASHNOY_ID ? grid : null;
};

// Минимум из КАТАЛОГА, а не из сохранённого CONFIG.SIZE_EDIT: загруженные PROPS
// идут в сборку как есть (BuildProduct.createPerentGroup), и SIZE_EDIT в них —
// снимок на момент сохранения, т.е. мог отстать от текущего минимума бэка.
const getMinHeight = (CONFIG: any): number | null => {
    const fromCatalog = Number(useModelState()._PRODUCTS[UM_PARAMS.RASPASHNOY_ID]?.SIZE_EDIT_HEIGHT_MIN);
    const min = Number.isFinite(fromCatalog) && fromCatalog > 0
        ? fromCatalog
        : Number(CONFIG?.SIZE_EDIT?.SIZE_EDIT_HEIGHT_MIN);

    return Number.isFinite(min) && min > 0 ? min : null;
};

/**
 * Правит PROPS на месте. Возвращает новую высоту, если правил, иначе null:
 * вызывающий по ней синхронизирует запись content (своя копия CONFIG.SIZE).
 */
export const validateRaspashnoyHeight = (root: Application, PROPS: any): number | null => {
    const grid = getRaspashnoyGrid(PROPS);
    if (!grid) return null;

    const { CONFIG } = PROPS;
    const minHeight = getMinHeight(CONFIG);
    const height = Number(grid.height ?? CONFIG.SIZE?.height);

    if (!minHeight || !Number.isFinite(height) || height >= minHeight) return null;

    // Высота без пересчёта сетки хуже прежних данных (корпус выше секций),
    // поэтому на любом сбое откатываем всё, что успели записать.
    const prev = { height: grid.height, SIZE: CONFIG.SIZE, EXPRESSIONS: CONFIG.EXPRESSIONS };
    const revert = () => {
        grid.height = prev.height;
        CONFIG.SIZE = prev.SIZE;
        CONFIG.EXPRESSIONS = prev.EXPRESSIONS;
    };

    const engine = createUMEngine(root, "raspashnoy-height");
    try {
        const size = { width: grid.width, height: minHeight, depth: grid.depth };

        // Габариты для reset() движок берёт из стора, а не из сетки (см. UMconstructorClass.reset)
        engine.UM_STORE.setUMData(PROPS);
        engine.UM_STORE.totalWidth = size.width;
        engine.UM_STORE.totalHeight = size.height;
        engine.UM_STORE.totalDepth = size.depth;

        grid.height = minHeight;
        CONFIG.SIZE = { ...CONFIG.SIZE, ...size };

        // Порядок как в BuildUniversalModule.createProductBody: формулы позиций
        // фасадов читают CONFIG.EXPRESSIONS, а там осталась прежняя высота.
        engine.BUILDER.getProductSize(CONFIG, { ...useModelState()._PRODUCTS[UM_PARAMS.RASPASHNOY_ID], ...size });

        // Цоколь — из сетки: в старых сохранениях CONFIG.HORIZONT мог не
        // записаться, и getProductSize подставил бы стандартные 78.
        if (grid.horizont != null) CONFIG.EXPRESSIONS["#HORIZONT#"] = grid.horizont;

        engine.UM_STORE.setUMGrid(grid);
        // Габарит сменился не из поля ввода — наполнение подгоняем тем же путём
        engine.RESIZE.markResized();

        // Итог берём и из стора: при внутреннем перезапуске (updateFasades ->
        // reset) наружу возвращается false, а финальная сетка лежит там.
        // Своя же сетка в ответе означает, что пересчёт сорвался на полпути.
        const fixedGrid = engine.reset(grid) || engine.UM_STORE.getUMGrid();
        if (!fixedGrid?.sections?.length || toRaw(fixedGrid) === grid || Number(fixedGrid.height) !== minHeight) {
            console.warn("Распашной шкаф: высота ниже минимума, но сетка не пересчиталась", grid);
            revert();
            return null;
        }

        // Как в RoomManager.save: сетка из стора может быть реактивным прокси
        CONFIG.MODULEGRID = saveUMGrid(cloneUMData(fixedGrid));

        console.warn(`Распашной шкаф: высота ${height} мм поднята до минимальной ${minHeight} мм`);
        engine.callAlert(
            "warning",
            `Высота распашного шкафа увеличена до ${minHeight} мм: сохранённая была меньше минимально допустимой`,
        );

        return minHeight;
    } catch (error) {
        console.error("Распашной шкаф: ошибка валидации высоты", error);
        revert();
        return null;
    } finally {
        // Снимает отложенную отрисовку reset() — до 2D дело не доходит
        disposeUMEngine(engine);
    }
};
