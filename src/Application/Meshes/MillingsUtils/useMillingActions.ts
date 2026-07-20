
//@ts-nocheck

import { useModelState } from "@/store/appliction/useModelState"
// import { MILLING_HANDLE_KEYS, additionalMillingKeys, MILLINGS } from "@/Application/F-millings";
// import type { Mesh } from "three"



const useMillingAction = (builder) => {

    const modelState = useModelState()
    // console.log(builder, 'builder')

    const catchChangeMilling = async () => {
        // const curModel = modelState.getCurrentModel!
        // const props = curModel.userData.PROPS
        // const { FASADE, FASADE_DEFAULT, CONFIG } = props
        // const { FASADE_POSITIONS, FASADE_PROPS } = CONFIG

        // const fasade: Mesh = FASADE[fasadeNdx]
        // const defaultGeometry = FASADE_DEFAULT[fasadeNdx]
        // const patina = FASADE_PROPS[fasadeNdx].PATINA

        // let millingData = MILLINGS[data] || additionalMillingKeys[data] ? data : 2462671

        // const fasadePosition = {
        //     FASADE_WIDTH: eval(FASADE_POSITIONS[fasadeNdx].FASADE_WIDTH),
        //     FASADE_HEIGHT: eval(FASADE_POSITIONS[fasadeNdx].FASADE_HEIGHT),
        //     FASADE_DEPTH: eval(FASADE_POSITIONS[fasadeNdx].FASADE_DEPTH)
        // };

        // this.buildMilling.createMillingFasade(fasade, fasadePosition, millingData, defaultGeometry, patina);

        // FASADE_PROPS[fasadeNdx].MILLING = data
        // FASADE_PROPS[fasadeNdx].SHOW = fasade.visible

        // console.log(builder, '---builder')

    }

    return {catchChangeMilling}


}

export {useMillingAction}