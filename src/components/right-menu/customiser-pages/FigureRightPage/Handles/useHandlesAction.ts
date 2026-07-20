//@ts-nocheck

import { useEventBus } from "@/store/appliction/useEventBus";
import { useModelState } from "@/store/appliction/useModelState";
import { MILLING_HANDLE_KEYS, additionalMillingKeys } from "@/Application/F-millings";
import { TMillingListItem } from "@/store/appliction/useModelState";
import { TConfig } from "@/types/types";

export type THandleType = "milling" | "integrate"

const useHandlesAction = () => {
    const modelState = useModelState()
    const eventBus = useEventBus()

    const getControllerData = (fasadeNdx:number) => {
        let result = [];
        const model = modelState.getCurrentModel;

        const { FASADE_TYPE, FASADE_POSITIONS, ELEMENT_TYPE, MODULEGRID } = model?.userData.PROPS.CONFIG;
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

    };

    const getIntegratedHandleControllerData = (data: TMillingListItem, fasadeNdx: number, type: THandleType) => {
        const model = modelState.getCurrentModel;
        const { FASADE_POSITIONS, FASADE_PROPS } = model?.userData.PROPS.CONFIG as TConfig;
        const fType = FASADE_POSITIONS[fasadeNdx].FASADE_TYPE


        const curMillinType = FASADE_PROPS[fasadeNdx].MILLING_TYPE ?? null
        const curType = FASADE_PROPS[fasadeNdx].TYPE ?? null

        const typeList = getDataType(data, fType)
        let id: number | null;
        if (type === "integrate") id = curType;
        else if (type === "milling") id = curMillinType;
        else id = 0

        const textList = typeList.map((el, ndx) => {

            if (!curType && !curMillinType && ndx == 0) id = el.ID

            return { action: el.CODE, id: el.ID, active: el.ID === id }
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