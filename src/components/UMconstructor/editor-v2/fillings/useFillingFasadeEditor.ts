// @ts-nocheck
// Редактор фасада и ручки наполнения (ящика): что открыто, для какого
// наполнения, и запись выбора в его fasade.material. Общая логика панели
// наполнения обычного УМ (FillingsView) и редактора v2 (UMFillingsConfigPanel).
// Адрес наполнения: sec/cell/row/extra области + индекс в её fillings;
// item в состоянии — filling.id (его ждёт выбор в сторе).
import { ref } from "vue";

interface UseFillingFasadeEditorOptions {
    getEngine: () => any;
    getModule: () => any;
}

export const useFillingFasadeEditor = ({ getEngine, getModule }: UseFillingFasadeEditorOptions) => {
    const isOpenMaterialSelector = ref<boolean>(false);
    const currentFasadeMaterial = ref<any>(false);
    const isOpenHandleSelector = ref<boolean>(false);
    const currentHandle = ref<any>(false);

    const getSegment = (sec, cell, row, extra) => {
        const curSection = getModule().sections[sec];
        const curCell = curSection?.cells?.[cell];
        const curRow = curCell?.cellsRows?.[row];
        const curExtra = curRow?.extras?.[extra];
        return curExtra || curRow || curCell || curSection;
    };

    const isSameItem = (current, sec, cell, row, extra, item) =>
        current
        && sec === current.sec
        && cell === current.cell
        && row === current.row
        && extra === current.extra
        && item === current.item;

    const closeMenu = () => {
        isOpenMaterialSelector.value = false;
        isOpenHandleSelector.value = false;

        currentHandle.value = false;
        currentFasadeMaterial.value = false;
    };

    // Повторный клик по тому же наполнению закрывает редактор.
    const openFasadeSelector = (sec, cell, row, extra, fillingIndex) => {
        const fillingId = getSegment(sec, cell, row, extra)?.fillings?.[fillingIndex]?.id ?? fillingIndex;

        if (isSameItem(currentFasadeMaterial.value, sec, cell, row, extra, fillingId)) {
            closeMenu();
            return;
        }

        /** @Создание_данных_для_выбранного_фасада */
        getEngine()?.FASADES.createFacadeData();
        closeMenu();

        setTimeout(() => {
            const fillObj = getSegment(sec, cell, row, extra).fillings[fillingIndex];
            currentFasadeMaterial.value = {
                sec,
                cell,
                row,
                item: fillingId,
                extra,
                data: fillObj.fasade.material,
                fasadeSize: {
                    FASADE_WIDTH: fillObj.fasade.width,
                    FASADE_HEIGHT: fillObj.fasade.height,
                    isDrawer: true,
                },
            };
            getEngine()?.FILLINGS.selectCell(sec, cell, row, extra, fillingId);
            isOpenMaterialSelector.value = true;
        }, 10);
    };

    const openHandleSelector = (sec, cell, row, extra, fillingIndex) => {
        const fillingId = getSegment(sec, cell, row, extra)?.fillings?.[fillingIndex]?.id ?? fillingIndex;

        if (isSameItem(currentHandle.value, sec, cell, row, extra, fillingId)) {
            closeMenu();
            return;
        }

        closeMenu();

        setTimeout(() => {
            const fillObj = getSegment(sec, cell, row, extra).fillings[fillingIndex];
            const data = fillObj.fasade.material;

            if (!data.HANDLES) data.HANDLES = { id: null, position: "right" };

            currentHandle.value = { sec, cell, row, item: fillingId, extra, data };
            getEngine()?.FILLINGS.selectCell(sec, cell, row, extra, fillingId);
            isOpenHandleSelector.value = true;
        }, 10);
    };

    // item = filling.id (не индекс массива) — ищем по ID.
    const findFilling = ({ sec, cell, row, extra, item }) =>
        getSegment(sec, cell, row, extra)?.fillings?.find((filling) => filling.id === item);

    const selectHandle = (data: any, type: string) => {
        switch (type) {
            case "handle":
                currentHandle.value.data.HANDLES.id = data;
                break;
            case "position":
                currentHandle.value.data.HANDLES.position = data;
                break;
        }

        // Object.assign провоцирует Vue задетектировать изменение HANDLES через переназначение свойства
        const fillObj = findFilling(currentHandle.value);
        if (fillObj?.fasade) {
            fillObj.fasade.material = Object.assign(fillObj.fasade.material, currentHandle.value.data);
            getEngine()?.FILLINGS.syncDrawerFasade(currentHandle.value.sec, fillObj, getModule());
        }

        getEngine()?.reset();
    };

    const selectOption = (value: any, type: string, palette: any = false) => {
        currentFasadeMaterial.value.data[type] = value ? value.ID ?? value : null;
        if (palette) currentFasadeMaterial.value.data["PALETTE"] = palette;

        if (type === "COLOR") {
            if (currentFasadeMaterial.value.data[type] === getEngine()?.CONST.NO_FASADE_ID)
                currentFasadeMaterial.value.data["MANUAL_NO_FASADE"] = true;
            else delete currentFasadeMaterial.value.data["MANUAL_NO_FASADE"];
        }

        const fillObj = findFilling(currentFasadeMaterial.value);
        if (fillObj?.fasade) {
            fillObj.fasade.material = Object.assign(fillObj.fasade.material, currentFasadeMaterial.value.data);
            getEngine()?.FILLINGS.syncDrawerFasade(currentFasadeMaterial.value.sec, fillObj, getModule());
        }
    };

    // Выбрано другое наполнение — открытый для прежнего редактор закрывается.
    const closeIfOtherSelected = (selected) => {
        const current = currentFasadeMaterial.value || currentHandle.value;
        if (!current || !selected) return;

        const { sec, cell, row, extra, item } = selected;
        if (!isSameItem(current, sec, cell, row, extra, item)) closeMenu();
    };

    return {
        isOpenMaterialSelector,
        currentFasadeMaterial,
        isOpenHandleSelector,
        currentHandle,
        openFasadeSelector,
        openHandleSelector,
        selectHandle,
        selectOption,
        closeMenu,
        closeIfOtherSelected,
    };
};
