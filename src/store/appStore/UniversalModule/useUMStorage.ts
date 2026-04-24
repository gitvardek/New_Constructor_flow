import {computed, ref} from 'vue'
import {defineStore} from "pinia";
import {TConfig, TTotalProps} from "@/types/types.ts";
import {canvasConfig, constructorMode, GridModule, TSelectedCell} from "@/components/UMconstructor/types/UMtypes.ts";

const defaultCanvas = <canvasConfig>{
    canvasHeight: 720,
    canvasWidth: 600,
}

const defaultSelectedCell = <TSelectedCell>{sec: 0, cell: null, row: null, extra: null}
const defaultSelectedFilling = <TSelectedCell>{sec: 0, cell: null, row: null, extra: null, item: null}
const defaultSelectedFasade = <TSelectedCell>{sec: 0, cell: null, row: null}

export const useUMStorage = defineStore('um-data', () => {
    const UM_GRID = ref<GridModule>(<GridModule>{})
    const UM_DATA = ref<TTotalProps>(<TTotalProps>{})
    const UM_CASH_GRID = ref<GridModule>(<GridModule>{})
    const UM_CASH_CONFIG = ref<TConfig>(<TConfig>{})
    const UM_CANVAS_PROPS = ref<canvasConfig>(defaultCanvas)

    const loadUM = ref<boolean>(false)

    const selectedCell = ref<TSelectedCell>(defaultSelectedCell);
    const selectedFasade = ref<TSelectedCell>(defaultSelectedFasade);
    const selectedFilling = ref<TSelectedCell>(defaultSelectedFilling);

    const totalHeight = ref<number>(0);
    const totalWidth = ref<number>(0);
    const totalDepth = ref<number>(0);
    const onHorizont = ref<boolean>(true);
    const onSideProfile = ref<boolean>(false);
    const noBottom = ref<boolean>(false);
    const onWallModule = ref<boolean>(false);
    const noLoops = ref<boolean>(false);
    const noBackwall = ref<boolean>(false);

    const setUMGrid = (value: GridModule) => {
        if (value)
            UM_GRID.value = value
        else
            UM_GRID.value = <GridModule>{}
    }
    const setUMData = (value: TTotalProps) => {
        if (value)
            UM_DATA.value = value
        else
            UM_DATA.value = <TTotalProps>{}
    }
    const setUMCashConfig = (value: TConfig) => {
        if (value)
            UM_CASH_CONFIG.value = value
        else
            UM_CASH_CONFIG.value = <TConfig>{}
    }
    const setUMCashGrid = (value: GridModule) => {
        if (value)
            UM_CASH_GRID.value = value
        else
            UM_CASH_GRID.value = <GridModule>{}
    }

    const getUMGrid = () => {
        return UM_GRID.value
    }

    const getUMData = () => {
        return UM_DATA.value
    }

    const getUMCashConfig = () => {
        return UM_CASH_CONFIG.value
    }

    const getUMCashGrid = () => {
        return UM_CASH_GRID.value
    }


    const setCanvasConfig = (config: canvasConfig) => {
        if (config)
            UM_CANVAS_PROPS.value = config
        else
            UM_CANVAS_PROPS.value = defaultCanvas
    }

    const getCanvasConfig = () => {
        return UM_CANVAS_PROPS.value
    }

    const setSelected = (type: constructorMode, newSelected: TSelectedCell) => {
        const {sec, cell, row, extra, item} = newSelected || {};

        const validateValue = (value: any) => {
            if (value !== undefined)
                return value;
            else
                return null;
        }

        switch (type) {
            case "fasades":
                selectedFasade.value = newSelected ?
                    <TSelectedCell>{sec: validateValue(sec), cell: validateValue(cell), row: validateValue(row)} :
                    defaultSelectedFasade
                break;
            case "module":
                selectedCell.value = newSelected ?
                    <TSelectedCell>{
                        sec: validateValue(sec),
                        cell: validateValue(cell),
                        row: validateValue(row),
                        extra: validateValue(extra)
                    } :
                    defaultSelectedCell
                break;
            case "fillings":
                selectedFilling.value = newSelected ?
                    <TSelectedCell>{
                        sec: validateValue(sec),
                        cell: validateValue(cell),
                        row: validateValue(row),
                        extra: validateValue(extra),
                        item: validateValue(item)
                    } :
                    defaultSelectedFilling
                break;
        }
    }

    const getSelected = (type: constructorMode) => {
        switch (type) {
            case "fasades":
                return selectedFasade.value
            case "module":
                return selectedCell.value
            case "fillings":
                return selectedFilling.value
        }
    }

    const setLoad = (value: boolean) => {
        loadUM.value = value;
    }

    const getLoad = computed(() => {
        return loadUM.value
    })

    const clearStorage = () => {
        UM_GRID.value = <GridModule>{}
        UM_DATA.value = <TTotalProps>{}
        UM_CASH_GRID.value = <GridModule>{}
        UM_CASH_CONFIG.value = <TConfig>{}
        UM_CANVAS_PROPS.value = defaultCanvas

        loadUM.value = false

        selectedCell.value = defaultSelectedCell;
        selectedFasade.value = defaultSelectedFasade;
        selectedFilling.value = defaultSelectedFilling;

        totalHeight.value = 0;
        totalWidth.value = 0;
        totalDepth.value = 0;
        onHorizont.value = true;
        onSideProfile.value = false;
        noBottom.value = false;
        onWallModule.value = false;
        noLoops.value = false;
        noBackwall.value = false;
    }

    return {
        clearStorage,
        setLoad,
        getLoad,
        totalHeight,
        noBackwall,
        totalWidth,
        totalDepth,
        onHorizont,
        onSideProfile,
        noBottom,
        onWallModule,
        noLoops,
        setUMGrid,
        setUMData,
        setUMCashConfig,
        setUMCashGrid,
        getUMGrid,
        getUMData,
        getUMCashConfig,
        getUMCashGrid,
        setCanvasConfig,
        getCanvasConfig,
        setSelected,
        getSelected,
    }
})
