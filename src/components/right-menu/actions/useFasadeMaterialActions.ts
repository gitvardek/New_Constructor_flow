import { useModelState } from "@/store/appliction/useModelState";
import { useEventBus } from "@/store/appliction/useEventBus";
import { TFasadeItem, TFasadeTrueSizes } from "@/types/types";

/** Данные выбранного полотна в том виде, в котором их ждут редакторы и ModelsItemSelector */
export type TSurfaceSelection = {
    id: number
    name: string
    imgSrc: string
    transitionT: boolean
    material: string
    patinaList: (number | null)[]
}

type TFasadeDataParams = {
    fasadeId: number
    productId: number
    fasadeNdx: number | string
    fasadeSize?: TFasadeTrueSizes
}

export const useFasadeMaterialActions = () => {

    const modelState = useModelState();
    const eventBus = useEventBus();

    /** Заполняет в сторе списки опций (палитра, фрезеровки, витрины, патина, стёкла, типы) под полотно */
    const buildCurrentFasadeData = ({ fasadeId, productId, fasadeNdx, fasadeSize }: TFasadeDataParams) => {
        modelState.createCurrentPaletteData(fasadeId);
        modelState.createCurrentMillingData({ fasadeId, productId, fasadeNdx, fasadeSize });
        modelState.createCurrentShowcaseData({ fasadeId, productId, fasadeNdx });
        modelState.createCurrentPatinaData({ fasadeId, productId });
        modelState.createCurrentGlassData({ fasadeId, productId });
        modelState.createCurrentFasadeTypesData({ fasadeId, productId });
    }

    /** Полотно относится к группе «Шпон Вардек 19мм» — для него доступна отрисовка перехода текстуры */
    const checkTransitionTexture = (id: number): boolean => {
        const prepare = modelState.getCurrentModelFasadesData.filter(
            (el) => el.NAME === "Шпон Вардек 19мм",
        );

        return false;

        if (prepare.length == 0) {
            return false;
        }

        const start = prepare[0].FASADES;

        if (!start) {
            return false;
        }
        return start.includes(id);
    }

    const createSurfaceSelection = (data: TFasadeItem): TSurfaceSelection => {
        const { ID, NAME, PREVIEW_PICTURE, MATERIAL, PATINA } = data;

        return {
            id: ID,
            name: NAME,
            imgSrc: PREVIEW_PICTURE,
            transitionT: checkTransitionTexture(ID),
            material: MATERIAL,
            patinaList: PATINA,
        };
    }

    /**
     * Установка патины фасада. На витрине патина хранится только в конфиге (для заказа и цены),
     * без отрисовки — как и фрезеровка витрины; событие нужно корзине для пересчёта.
     * На обычном фасаде патина рисуется сценой (A:DrawPatina сам пишет PATINA в конфиг)
     */
    const applyFasadePatina = (patinaId: number, fasadeNdx: number) => {
        const { FASADE_POSITIONS, FASADE_PROPS } = modelState.getCurrentModel?.userData.PROPS.CONFIG;
        const isShowcase = FASADE_POSITIONS[fasadeNdx]?.SHOWCASE === 1;

        if (isShowcase) {
            FASADE_PROPS[fasadeNdx].PATINA = patinaId;
            eventBus.emit("A:ChangeShowcasePatina");
        } else {
            eventBus.emit("A:DrawPatina", { data: patinaId, fasadeNdx });
        }
    }

    return { buildCurrentFasadeData, checkTransitionTexture, createSurfaceSelection, applyFasadePatina }
}
