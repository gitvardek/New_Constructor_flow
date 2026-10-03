// @ts-nocheck
// Материалы корпуса УМ: части (корпус, задняя и боковые стенки, накладка на
// крышку, профили), списки материалов для них и запись выбора в CONFIG сессии
// и сетку. Общая логика панели материалов обычного УМ (SidecolorsView) и
// редактора v2 (UMMaterialsPanel).
//
// Списки материалов — по товару сессии (не по выбранному 3D-объекту: во
// вложенной сессии это другой товар) и без записи в общие списки стора.
import { computed, ref } from "vue";
import { useAppData } from "@/store/appliction/useAppData.ts";
import { useModelState } from "@/store/appliction/useModelState.ts";
import { useOptions } from "@/components/right-menu/customiser-pages/RailsRightPage/useOptions.ts";
import type { TFasadeTrueSizes, TFasadeProp, TToptableUMProp } from "@/types/types.ts";

export type ModuleMaterialPart =
    | "MODULE_COLOR"
    | "BACKWALL"
    | "LEFTSIDECOLOR"
    | "RIGHTSIDECOLOR"
    | "TOPFASADECOLOR"
    | "PROFILECOLOR";

const MODULE_MATERIAL_PARTS: ModuleMaterialPart[] = [
    "MODULE_COLOR",
    "BACKWALL",
    "LEFTSIDECOLOR",
    "RIGHTSIDECOLOR",
    "TOPFASADECOLOR",
    "PROFILECOLOR",
];

export const MODULE_MATERIAL_NAMES: Record<ModuleMaterialPart, string> = {
    MODULE_COLOR: "Цвет корпуса",
    BACKWALL: "Задняя стенка",
    LEFTSIDECOLOR: "Левая стенка",
    RIGHTSIDECOLOR: "Правая стенка",
    TOPFASADECOLOR: "Накладка на крышку",
    PROFILECOLOR: "Профили",
};

// Опция "Эксцентрики": обязательна, пока у стенки свой цвет.
const ECCENTRIC_OPTION_ID = 8390271;
const NO_FASADE_ID = 7397;

type CatalogType = "FASADE" | "PALETTE" | "MILLING" | "FASADETYPE" | "GLASS" | "PATINA" | "COLOR";

interface UseModuleMaterialsOptions {
    getEngine: () => any;
    getModule: () => any;
    // PROPS сессии (UM_STORE.getUMData()).
    getProductData: () => any;
    // После записи выбора — обновить зависящие от материалов опции.
    onChange?: () => void;
}

export const useModuleMaterials = ({ getEngine, getModule, getProductData, onChange }: UseModuleMaterialsOptions) => {
    const APP = useAppData().getAppData;
    const modelState = useModelState();
    const { checkActive } = useOptions();

    const currentPart = ref<ModuleMaterialPart | false>(false);
    const materialList = ref(null);
    const elementSize = ref<TFasadeTrueSizes | false>(false);
    const toptableMode = ref<boolean>(false);
    const toptableProductsList = ref<any[]>([]);

    const getMaterialInfo = (type: CatalogType, materialID: number) => APP[type]?.[materialID];

    // Части с текущими материалами: { [part]: { COLOR: <запись каталога>, ... } }.
    const materialParts = computed(() => {
        const objectData = getProductData();
        const module = getModule();
        const result = {};
        if (!objectData?.CONFIG || !module) return result;

        MODULE_MATERIAL_PARTS.forEach((item) => {
            if (!objectData.CONFIG[item]) return;

            if (typeof objectData.CONFIG[item] === "object") {
                const tmpObj = {};
                Object.entries(objectData.CONFIG[item]).forEach(([key, value]) => {
                    const name = key === "COLOR" ? "FASADE" : key;
                    tmpObj[key] = getMaterialInfo(name, value);
                });

                if (Object.keys(tmpObj).length > 0) result[item] = tmpObj;
            } else {
                result[item] = { COLOR: getMaterialInfo("FASADE", objectData.CONFIG[item]) };
            }
        });

        if (module.profilesConfig) {
            result["PROFILECOLOR"] = { COLOR: getMaterialInfo("COLOR", module.profilesConfig.COLOR) };
        }

        if (module.isRestrictedModule || module.fasades) {
            delete result["TOPFASADECOLOR"];
        }

        if (module.noBottom) {
            delete result["BACKWALL"];
        }

        return result;
    });

    const getToptableList = () => {
        if (toptableProductsList.value.length > 0) return toptableProductsList.value;

        const { SECTIONS, PRODUCTS } = getEngine().APP.CATALOG;
        toptableProductsList.value = Object.values(SECTIONS)
            .filter((section) => section.NAME.toLowerCase().includes("столешницы"))
            .map((section) => {
                const list = section.PRODUCTS || [];
                if (list.length > 0) return { NAME: section.NAME, PRODUCTS: list.map((product) => PRODUCTS[product]) };
            })
            .filter((product) => product);

        return toptableProductsList.value;
    };

    const createFacadeData = (fasadeIndex?: number) => {
        const productId = getProductData().PRODUCT;
        const { FACADE } = modelState._PRODUCTS[productId];
        modelState.createCurrentModelFasadesData({ data: FACADE, fasadeNdx: fasadeIndex, productId });
    };

    const getMaterialsList = () => {
        const productId = getProductData().PRODUCT;

        switch (currentPart.value) {
            case "MODULE_COLOR":
                materialList.value = modelState.createCurrentModuleData(modelState._PRODUCTS[productId]?.MODULECOLOR ?? [], true);
                break;
            case "BACKWALL":
                materialList.value = modelState.createCurrentBackwallData(productId, getEngine().UM_STORE.onWallModule, true);
                break;
            case "RIGHTSIDECOLOR":
            case "LEFTSIDECOLOR":
                materialList.value = modelState.createCurrentSidewallData(productId, true);
                break;
            case "PROFILECOLOR":
                materialList.value = getModule().profilesConfig.colorsList.map((colorID) => getMaterialInfo("COLOR", colorID));
                break;
            case "TOPFASADECOLOR":
                if (toptableMode.value) {
                    materialList.value = getToptableList();
                    break;
                }
                createFacadeData();
                materialList.value = modelState.getCurrentModelFasadesData;
                break;
            default:
                createFacadeData();
                materialList.value = modelState.getCurrentModelFasadesData;
                break;
        }

        return materialList.value;
    };

    const changeTopMaterialsList = (isToptable: boolean = false) => {
        if (isToptable) materialList.value = getToptableList();
        else getMaterialsList();
    };

    const closePart = () => {
        currentPart.value = false;
        materialList.value = null;
    };

    // Повторный выбор той же части закрывает её.
    const openPart = (part: ModuleMaterialPart) => {
        if (part == currentPart.value) {
            closePart();
            return;
        }

        currentPart.value = part;
        if (getProductData().CONFIG[part]?.TABLE) {
            toptableMode.value = true;
        }

        getMaterialsList();
    };

    // Текущее значение части и размер детали для проверки лимитов листа.
    const currentValue = computed(() => {
        const objectData = getProductData();
        const module = getModule();
        let result = {};

        switch (currentPart.value) {
            case "RIGHTSIDECOLOR":
            case "LEFTSIDECOLOR":
                result = { ...objectData.CONFIG[currentPart.value] };
                if (!result.COLOR) result.COLOR = objectData.CONFIG.MODULE_COLOR;

                elementSize.value = { FASADE_WIDTH: module.depth, FASADE_HEIGHT: module.height, isPanel: true };
                break;

            case "TOPFASADECOLOR":
                result = objectData.CONFIG[currentPart.value];
                elementSize.value = { FASADE_WIDTH: module.width, FASADE_HEIGHT: module.depth, isPanel: true };
                break;

            default:
                result = objectData.CONFIG[currentPart.value];
                elementSize.value = false;
                break;
        }

        return result;
    });

    // Корпус и задняя стенка — простой выбор цвета, остальное — редактор фасадного материала.
    const useAdvancedRedactor = computed(() => !["MODULE_COLOR", "BACKWALL"].includes(currentPart.value));

    const setEccentricOption = ({ PROPS, side = false, keepActive = false }) => {
        if ((side && PROPS.CONFIG[side]?.COLOR) || PROPS.CONFIG["LEFTSIDECOLOR"]?.COLOR || PROPS.CONFIG["RIGHTSIDECOLOR"]?.COLOR) {
            PROPS.CONFIG.eccentricOption = true;
        } else {
            // Опция перестаёт быть обязательной — чекбокс разблокируется
            delete PROPS.CONFIG.eccentricOption;
            // keepActive: стенка на месте (перешла на цвет корпуса) — галку не снимаем
            if (!keepActive) {
                const opt = PROPS.CONFIG.OPTIONS?.find((item) => +item.id === ECCENTRIC_OPTION_ID);
                if (opt) opt.active = false;
            }
        }

        const option = PROPS.CONFIG.OPTIONS?.find((item) => +item.id === ECCENTRIC_OPTION_ID);
        if (PROPS.CONFIG.eccentricOption && option && !option.active) {
            checkActive({ ID: ECCENTRIC_OPTION_ID }, true);
        }
    };

    // Запись выбора редактора материала в текущую часть.
    const selectMaterial = (value: any, type: string, palette: any = false) => {
        const objectData = getProductData();
        const module = getModule();
        const part = currentPart.value;

        switch (part) {
            case "MODULE_COLOR": {
                objectData.CONFIG[part] = value.ID;
                objectData.CONFIG["MANUAL_MODULE_COLOR"] = true;
                module.moduleColor = value.ID;
                module.moduleThickness = value.DEPTH;

                const updateSideWall = (side: "LEFTSIDECOLOR" | "RIGHTSIDECOLOR", wallKey: "leftWallThickness" | "rightWallThickness") => {
                    const cfg = objectData.CONFIG[side];
                    if (!cfg) return;
                    module[wallKey] = value.DEPTH;
                    // Сброс собственного цвета стенки при смене цвета корпуса (стенка следует корпусу)
                    if (cfg.COLOR) {
                        objectData.CONFIG[side] = { COLOR: false };
                    }
                };

                updateSideWall("LEFTSIDECOLOR", "leftWallThickness");
                updateSideWall("RIGHTSIDECOLOR", "rightWallThickness");

                // Смена цвета корпуса не убирает стенки — галку эксцентриков сохраняем,
                // пересчитываем только обязательность (блокировку) опции
                setEccentricOption({ PROPS: objectData, side: false, keepActive: true });
                break;
            }
            case "PROFILECOLOR":
                objectData.CONFIG["PROFILECOLOR"] = value ? value.ID || value : false;

                if (!objectData.CONFIG["PROFILECOLOR"]) {
                    delete objectData.CONFIG["PROFILECOLOR"];
                } else {
                    const color = objectData.CONFIG["PROFILECOLOR"];
                    module.profilesConfig.COLOR = color;

                    const paintProfiles = (area) => {
                        if (!area.hiTechProfiles) return;
                        area.fillings.forEach((filling) => {
                            if (filling.isProfile) {
                                filling.color = color;
                                filling.isProfile.COLOR = color;
                            }
                        });
                        area.hiTechProfiles.forEach((profile) => {
                            profile.color = color;
                            profile.isProfile.COLOR = color;
                        });
                    };

                    module.sections.forEach((section) => {
                        section.cells.forEach(paintProfiles);
                        paintProfiles(section);
                    });
                }
                break;
            case "LEFTSIDECOLOR":
            case "RIGHTSIDECOLOR": {
                if (!objectData.CONFIG[part]) {
                    objectData.CONFIG[part] = {};
                }
                const tmpValue = value ? value.ID || value : false;

                if (type === "COLOR") {
                    if (tmpValue === objectData.CONFIG.MODULE_COLOR) {
                        objectData.CONFIG[part] = { COLOR: false };

                        // Стенка перешла на цвет корпуса, но осталась на месте — галку эксцентриков
                        // сохраняем, пересчитываем только обязательность (блокировку) опции
                        setEccentricOption({ PROPS: objectData, side: part, keepActive: true });
                        break;
                    }

                    objectData.CONFIG[part]["SHOW"] = !(!tmpValue || tmpValue === NO_FASADE_ID);
                }

                objectData.CONFIG[part][type] = tmpValue;
                if (palette) objectData.CONFIG[part]["PALETTE"] = palette;

                setEccentricOption({ PROPS: objectData, side: part });
                break;
            }
            default:
                if (!objectData.CONFIG[part]) {
                    objectData.CONFIG[part] = {};
                }

                if (type === "COLOR") {
                    if (objectData.CONFIG[part].TABLE) {
                        const { SHOW } = objectData.CONFIG[part];
                        objectData.CONFIG[part] = <TFasadeProp>{ SHOW };
                    }

                    objectData.CONFIG[part]["SHOW"] = !(!value || value.ID === NO_FASADE_ID);
                } else if (type === "TABLE") {
                    if (objectData.CONFIG[part].COLOR) {
                        const { SHOW, TABLE } = objectData.CONFIG[part];
                        objectData.CONFIG[part] = <TToptableUMProp>{ SHOW, TABLE };
                    }

                    objectData.CONFIG[part]["SHOW"] = !(!value || !value.ID);
                }

                objectData.CONFIG[part][type] = value ? value.ID || value : false;
                if (palette) objectData.CONFIG[part]["PALETTE"] = palette;
                break;
        }

        onChange?.();
        getEngine()?.reset();
    };

    return {
        currentPart,
        materialList,
        elementSize,
        toptableMode,
        materialParts,
        currentValue,
        useAdvancedRedactor,
        openPart,
        closePart,
        selectMaterial,
        changeTopMaterialsList,
    };
};
