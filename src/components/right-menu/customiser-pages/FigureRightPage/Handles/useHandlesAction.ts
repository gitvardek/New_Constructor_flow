//@ts-nocheck

import { useEventBus } from "@/store/appliction/useEventBus";
import { useModelState } from "@/store/appliction/useModelState";
import { MILLING_HANDLE_KEYS, additionalMillingKeys } from "@/Application/F-millings";
import { TMillingListItem } from "@/store/appliction/useModelState";
import { TConfig, TFasadeProp, FasadeTextAlignAction } from "@/types/types";

export type THandleType = "milling" | "integrate"

const useHandlesAction = () => {
    const modelState = useModelState()
    const eventBus = useEventBus()

    const getControllerData = (fasadeNdx: number) => {
        let result = [];
        const model = modelState.getCurrentModel;
        const config = model?.userData?.PROPS?.CONFIG;
        if (!config) return result;

        const { FASADE_TYPE, FASADE_POSITIONS, ELEMENT_TYPE, MODULEGRID } = config;
        if (!FASADE_POSITIONS?.[fasadeNdx]) return result;

        const prepare = FASADE_POSITIONS[fasadeNdx].FASADE_TYPE.map((el: number) => modelState._FASADE_TYPE[el]).filter(
            Boolean
        );

        const textList = prepare.map((el) => el.CODE);

        if (!ELEMENT_TYPE || MODULEGRID) {
            return textList;
        }

        if (ELEMENT_TYPE.includes("up")) {
            result = textList.filter((el) => {
                return el.includes("down") || el.includes("bottom");
            });

            return result;
        }

        if (ELEMENT_TYPE.includes("down")) {
            result = textList.filter((el) => {
                return el.includes("top");
            });
            return result;
        }

        return result;
    };

    /** В УМ тип фасада лежит объектом {action, id, active, name}, в обычном потоке — числом */
    const getTypeId = (value: unknown) => {
        if (value && typeof value === "object") {
            return (value as { id: number }).id
        }
        return value
    }

    const getIntegratedHandleControllerData = (
        data: TMillingListItem,
        fasadeNdx: number,
        type: THandleType,
        curFasadeProps: TFasadeProp | null = null,
    ) => {
        const model = modelState.getCurrentModel;
        const CONFIG = (model?.userData?.PROPS?.CONFIG ?? {}) as TConfig;
        const { FASADE_POSITIONS, FASADE_PROPS } = CONFIG;
        if (!FASADE_POSITIONS || !FASADE_PROPS) {
            return [];
        }

        // В редакторе УМ индекс — это номер сегмента внутри двери, а не номер фасада в
        // FASADE_POSITIONS: parseModulegrid кладёт туда фасады всех дверей одним списком,
        // отсортированным по id, и на разделённом фасаде индекс уходит за границы массива.
        // Поэтому свойства фасада берём у вызывающего, когда он их передал, а список
        // допустимых типов откатываем на общий для модуля — он один на все его фасады
        const fasadeProps = curFasadeProps ?? FASADE_PROPS[fasadeNdx]
        const fType = FASADE_POSITIONS[fasadeNdx]?.FASADE_TYPE ?? CONFIG.FASADE_TYPE

        if (!fasadeProps || !fType) {
            return [];
        }

        const curMillinType = fasadeProps.MILLING_TYPE ?? null
        const curType = fasadeProps.TYPE ?? null

        const typeList = getDataType(data, fType)
        let id: number | null;
        if (type === "integrate") {
            id = getTypeId(curType);
        } else if (type === "milling") {
            id = getTypeId(curMillinType);
        } else {
            id = 0
        }

        const textList = typeList.map((el, ndx) => {

            if (!curType && !curMillinType && ndx == 0) id = el.ID

            return { action: FasadeTextAlignAction[el.CODE as keyof typeof FasadeTextAlignAction], id: el.ID, active: el.ID === id, name: el.NAME }
        });

        return textList
    }

    const setIntegratedHandleAction = (action: number, fasadeNdx: number, type: THandleType) => {

        if (!type) return

        const model = modelState.getCurrentModel;
        const { FASADE_PROPS } = model?.userData.PROPS.CONFIG;
        const currentMilling = FASADE_PROPS[fasadeNdx].MILLING
        const currentAlum = FASADE_PROPS[fasadeNdx].ALUM

        const key = additionalMillingKeys[currentMilling] ?? currentMilling
        const map = MILLING_HANDLE_KEYS[key]

        if (type === "milling") {
            if (!key || !map) return;
            eventBus.emit('A:ChangeMilling', { data: currentMilling, fasadeNdx, action: map[action] })
        }
        if (type === "integrate") eventBus.emit('A:ChangeShowcase', { data: currentAlum, fasadeNdx, action: action })

    }

    const getDataType = (data: TMillingListItem | number[], fType: number[]) => {
        let prepare = []
        let result = []

        if ('fasade_type' in data) {
            prepare = data.fasade_type.filter(el => {
                return fType.includes(el)
            })
            result = prepare
                .map((item) => modelState._FASADE_TYPE[item])
                .filter(Boolean);

            return result;
        }

        return data
    };

    return { getControllerData, getIntegratedHandleControllerData, setIntegratedHandleAction }

}

export { useHandlesAction }