// Жизненный цикл редактора УМ поверх движка сессии: сетка и флаги стора — до
// монтирования (prepareEditorGrid), первый пересчёт и автовыбор — после. Та же
// последовательность, что в MainView/WardrobeMainView (они пока держат свою
// копию), кроме флагов: там они выставляются после монтирования панелей, а
// ModuleSizeView читает их на монтировании и по watch запускает updateHorizont.
import { nextTick, onBeforeMount, onMounted, ref, watch, type Ref } from "vue";
import type UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import type { GridModule } from "@/components/UMconstructor/types/UMtypes.ts";
import { prepareEditorGrid, type PrepareEditorGridOptions } from "./prepareEditorGrid.ts";

interface Options extends PrepareEditorGridOptions {
    engine: UMconstructorClass;
    // { PROPS, globalData } — как universalModuleData.PROPS у основного редактора.
    productData: any;
    visualizationRef: Ref<any>;
    onError: () => void;
}

export const useUMEditorLifecycle = ({ engine, productData, visualizationRef, onError, ...gridOptions }: Options) => {
    const store = engine.UM_STORE;
    const module = ref<GridModule | false>(false);

    const autoSelectDeepest = () => {
        const grid = store.getUMGrid();
        const section = grid?.sections?.[0];
        if (!section) return;

        const firstCell = section.cells?.[0];
        const firstRow = firstCell?.cellsRows?.[0];
        const cell = firstCell ? 0 : null;
        const row = firstRow ? 0 : null;
        const extra = firstRow?.extras?.length ? 0 : null;

        engine.selectCell("fillings", { sec: 0, cell, row, extra, item: null });
    };

    onBeforeMount(() => {
        module.value = prepareEditorGrid(engine, productData, gridOptions);
        if (!module.value) onError();
    });

    onMounted(async () => {
        if (!module.value) return;

        store.setUMGrid(module.value);
        engine.setRenderRef(visualizationRef);
        engine.reset(store.getUMGrid());

        await nextTick();
        autoSelectDeepest();
    });

    watch(() => store.getUMGrid(), (grid) => {
        module.value = grid;
    });

    return { module };
};
