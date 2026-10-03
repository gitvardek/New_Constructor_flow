// Стартовая сетка редактора УМ и флаги стора из неё. Общая часть для редактора
// на экране (useUMEditorLifecycle) и пересчёта без UI (cabinet/session/syncCabinetConfig).
import type UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import type { canvasConfig, GridModule } from "@/components/UMconstructor/types/UMtypes.ts";

export interface PrepareEditorGridOptions {
    canvasHeight?: number;
    canvasWidth?: number;
    // Правка только что созданной сетки до первого reset.
    prepareGrid?: (grid: GridModule) => void;
}

// productData — { PROPS, globalData }, как universalModuleData.PROPS у основного редактора.
// false — сетку создать не удалось.
export const prepareEditorGrid = (
    engine: UMconstructorClass,
    productData: any,
    { canvasHeight = 720, canvasWidth = 600, prepareGrid }: PrepareEditorGridOptions = {},
): GridModule | false => {
    const store = engine.UM_STORE;
    store.setCanvasConfig(<canvasConfig>{ canvasHeight, canvasWidth });

    const { CONFIG } = productData.PROPS;
    store.totalHeight = CONFIG.MODULEGRID?.height || CONFIG.SIZE.height || canvasHeight;
    store.totalWidth = CONFIG.MODULEGRID?.width || CONFIG.SIZE.width || canvasWidth;
    store.totalDepth = CONFIG.MODULEGRID?.depth || CONFIG.SIZE.depth || 0;

    const created = engine.createUMgrid(productData, {
        width: store.totalWidth,
        height: store.totalHeight,
        depth: store.totalDepth,
    });
    if (!created) return false;

    // Флаги сетки, которых нет в типе GridModule (пишутся опциями модуля).
    const grid = created as GridModule & Record<string, any>;
    prepareGrid?.(grid);

    store.noLoops = !!grid.noLoops;
    store.noBottom = !!grid.noBottom;
    store.noBackwall = !!grid.noBackwall;
    store.onHorizont = (grid.horizont ?? 0) > 0;
    store.onSideProfile = !!grid.profilesConfig?.sideProfile;
    store.onWallModule = !!grid.onWallModule;

    return grid;
};
