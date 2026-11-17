// @ts-nocheck
// Редактор сегмента фасада: что открыто (материал, ручка, подъёмные
// механизмы), для какого сегмента, и запись выбора в его material. Общая
// логика панели фасадов обычного УМ (FasadesView) и редактора v2 (UMFasadesPanel).
// Адрес сегмента: sec (null — раздвижные двери модуля), cell — дверь, row — сегмент.
import { ref } from "vue";
import { LOOPSIDE } from "@/components/UMconstructor/types/UMtypes.ts";
import { useMechanism } from "@/components/right-menu/customiser-pages/RailsRightPage/Mechanism/useMechanism";

interface UseFasadeEditorOptions {
    getEngine: () => any;
    getModule: () => any;
}

export const useFasadeEditor = ({ getEngine, getModule }: UseFasadeEditorOptions) => {
    const { createMeckhanizmList } = useMechanism();

    const isOpenMaterialSelector = ref<boolean>(false);
    const currentFasadeMaterial = ref<any>(false);
    const currentFasadeSize = ref<any>(false);

    const isOpenHandleSelector = ref<boolean>(false);
    const currentHandle = ref<any>(false);

    const isOpenMechanizm = ref<boolean>(false);
    const mechanismList = ref<any[]>([]);
    const currentElement = ref<any>(null);
    const currentSegment = ref<any>(null);

    const resetMechanism = () => {
        isOpenMechanizm.value = false;
        mechanismList.value = [];
        currentElement.value = null;
        currentSegment.value = null;
    };

    const closeMenu = () => {
        isOpenMaterialSelector.value = false;
        isOpenHandleSelector.value = false;

        currentHandle.value = false;
        currentFasadeMaterial.value = false;
        currentFasadeSize.value = false;

        resetMechanism();
    };

    const getDoor = (sec: number | null, cell: number) =>
        sec === null ? getModule().fasades[cell] : getModule().sections[sec].fasades[cell];

    const isSameSegment = (current, sec, cell, row) =>
        current && sec === current.sec && cell === current.cell && row === current.row;

    // Метка как в списке сегментов. Номером сегмента внутри двери фасады
    // нумеровать нельзя: у "Сегмент №1.2.2" получалось "фасад 2".
    const getSegmentLabel = (sec: number | null, cell: number, door: any[], segment: any) => {
        if (sec !== null) return `${sec + 1}.${cell + 1}.${segment.id}`;
        if (door.length > 1) return `${cell + 1}.${segment.id}`;
        return `${cell + 1}`;
    };

    // Повторный клик по тому же сегменту закрывает редактор.
    const openFasadeSelector = (sec: number | null, cell: number | null = null, row: number | null = null) => {
        isOpenMaterialSelector.value = false;
        resetMechanism();

        if (isOpenHandleSelector.value) closeMenu();

        const engine = getEngine();
        const productId = engine.UM_STORE.getUMData().PRODUCT;
        const exeptModel = engine.MODEL_STATE._FASADE_EXCEPTIONS[productId];

        /** @Создание_данных_для_выбранного_фасада */
        engine.FASADES.createFacadeData(exeptModel ? cell : row === null ? undefined : row);

        if (isSameSegment(currentFasadeMaterial.value, sec, cell, row)) {
            closeMenu();
            return;
        }

        setTimeout(() => {
            const door = getDoor(sec, cell);
            const data = door[row];
            currentFasadeMaterial.value = {
                sec,
                cell,
                row,
                label: getSegmentLabel(sec, cell, door, data),
                data: data.material,
            };
            currentFasadeSize.value = { FASADE_WIDTH: data.width, FASADE_HEIGHT: data.height };
            engine.FASADES.selectCell(sec, cell, row);
            isOpenMaterialSelector.value = true;
        }, 10);
    };

    const openHandleSelector = (sec: number | null, cell: number | null = null, row: number | null = null) => {
        isOpenHandleSelector.value = false;
        isOpenMaterialSelector.value = false;
        resetMechanism();

        if (isSameSegment(currentHandle.value, sec, cell, row)) {
            closeMenu();
            return;
        }

        setTimeout(() => {
            const data = getDoor(sec, cell)[row];
            currentHandle.value = { sec, cell, row, data: data.material };
            getEngine().FASADES.selectCell(sec, cell, row);
            isOpenHandleSelector.value = true;
        }, 10);
    };

    const selectHandle = (data: any, type: string) => {
        switch (type) {
            case "handle":
                currentHandle.value.data.HANDLES.id = data;
                break;
            case "position":
                currentHandle.value.data.HANDLES.position = data;
                break;
        }

        // RENDER_REF — ref у сырого движка, экземпляр Render2D у реактивного.
        const engine = getEngine();
        const render = engine?.RENDER_REF?.value ?? engine?.RENDER_REF;
        render?.renderGrid(getModule());
    };

    const selectOption = (value: any, type: string, palette: any = false, alum: number | null = null) => {
        const engine = getEngine();
        const module = getModule();

        currentFasadeMaterial.value.data[type] = value ? value.ID || value : null;
        if (palette) currentFasadeMaterial.value.data["PALETTE"] = palette;

        if (type === "COLOR") {
            currentFasadeMaterial.value.data["ALUM"] = alum;
            if (currentFasadeMaterial.value.data[type] === engine?.CONST.NO_FASADE_ID)
                currentFasadeMaterial.value.data["MANUAL_NO_FASADE"] = true;
            else delete currentFasadeMaterial.value.data["MANUAL_NO_FASADE"];
        }

        const { sec, cell, row } = currentFasadeMaterial.value;
        const segment = getDoor(sec, cell)[row];
        segment.material = Object.assign(segment.material, currentFasadeMaterial.value.data);

        // Петли сегмента разделённого фасада зависят от материала: без материала сегмента
        // фактически нет и петли ему не назначаются. Как только материал выбран (или снят),
        // пересчитываем петли секции — calcLoops сам вернёт loopsSide, сброшенный в none
        if (type === "COLOR" && sec !== null) {
            engine?.LOOPS.syncSplitLoopside(sec, cell, row, module);
            engine?.LOOPS.calcLoops(sec, module);
            const render = engine?.RENDER_REF?.value ?? engine?.RENDER_REF;
            render?.renderGrid(module);
        }
    };

    // Стороны открывания сегмента; у модуля без петель — только "нет".
    // В списке LoopsManager бывают пустые места.
    const getLoopsideList = (secIndex: number, doorIndex: number, module: any, segment: number) => {
        const list = getEngine()?.LOOPS.getLoopsideList(secIndex, doorIndex, module, segment);

        if (module.noLoops) {
            const noneItem = list?.find((item) => item?.ID === LOOPSIDE["none"]);
            return noneItem ? [noneItem] : [];
        }
        return list?.filter(Boolean) ?? [];
    };

    // false — смену отклонили (боковому профилю не осталось бы стенки).
    const setLoopside = (secIndex: number, segment: any, side: number | string, doorIndex: number, module: any): boolean => {
        closeMenu();
        return getEngine()?.FASADES.changeLoopside(secIndex, segment, side, doorIndex, module) !== false;
    };

    const createMechanizmList = (segment: any) => {
        const { height, width, material } = segment;
        const { PRODUCT } = getEngine().UM_STORE.getUMData();

        const tempData = {
            userData: {
                UM: true,
                PROPS: {
                    PRODUCT,
                    CONFIG: {
                        FASADE_PROPS: Object.assign(material, { UMSIZES: { height, width } }),
                        SIZE: { height, width },
                        MECHANISM: material.MECHANISM,
                        MECHANISM_TEMP: [],
                    },
                },
            },
        };

        mechanismList.value = createMeckhanizmList(tempData);
        currentElement.value = tempData.userData.PROPS.CONFIG;
        currentSegment.value = material;

        isOpenMechanizm.value = true;
        isOpenHandleSelector.value = false;
        isOpenMaterialSelector.value = false;
    };

    // Выбран другой сегмент — открытый для прежнего редактор закрывается.
    const closeIfOtherSelected = (selected) => {
        if (!selected) return;
        const { sec, cell, row } = selected;

        if (currentFasadeMaterial.value && !isSameSegment(currentFasadeMaterial.value, sec, cell, row)) {
            closeMenu();
        } else if (currentHandle.value && !isSameSegment(currentHandle.value, sec, cell, row)) {
            closeMenu();
        }
    };

    return {
        isOpenMaterialSelector,
        currentFasadeMaterial,
        currentFasadeSize,
        isOpenHandleSelector,
        currentHandle,
        isOpenMechanizm,
        mechanismList,
        currentElement,
        currentSegment,
        openFasadeSelector,
        openHandleSelector,
        selectHandle,
        selectOption,
        closeMenu,
        getLoopsideList,
        setLoopside,
        createMechanizmList,
        closeIfOtherSelected,
    };
};
