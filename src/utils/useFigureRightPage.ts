// @ts-nocheck
import { useAppData } from "@/store/appliction/useAppData";
import { useModelState } from "@/store/appliction/useModelState";
import { TFasadeProp } from "@/types/types";



export type TFigureLable = 'Цоколь' | 'Плинтус' | 'Ручки'
export type TFigureName = 'Base' | 'Plinth' | 'Handles'
export type THandlesItem = {
    ID: number,
    PREVIEW_PICTURE: string,
    models: number,
    NAME: string
}

export interface IFigureItems {
    label: TFigureLable,
    name: TFigureName,
    action?: Function;
}

export interface IFigureFasade {
    label: string,
    name: string,
    props: TFasadeProp
    action?: Function;
}

export const useFigureRightPage = () => {

    const _APP = useAppData()
    const modelState = useModelState();

    const createHandlesList = () => {
        const { PROPS } = modelState.getCurrentModel!.userData
        const ptoductId = PROPS.PRODUCT

        // const data = appData.getAppData
        const { PRODUCTS } = _APP.getAppData.CATALOG
        const { HANDLES } = PRODUCTS[ptoductId]

        const handlesTempList = HANDLES[0] != null ? HANDLES : _APP.getAppData.HANDLES
        // const handlesMap: Record<number, THandlesItem> = {};
        const handlesMap: THandlesItem[] = []

        if (Array.isArray(handlesTempList)) {
            handlesTempList.forEach((el, key) => {
                const product = PRODUCTS[el];
                if (product) {
                    const temp = {
                        ID: product.ID,
                        PREVIEW_PICTURE: product.PREVIEW_PICTURE,
                        models: product.models[0],
                        NAME: product.NAME
                    }
                    // handlesMap[el] = temp
                    handlesMap.push(temp)
                }
            })
        }
        else {
            for (const el in handlesTempList) {
                const product = PRODUCTS[el];
                const temp = {
                    ID: product.ID,
                    PREVIEW_PICTURE: product.PREVIEW_PICTURE,
                    models: product.models[0],
                    NAME: product.NAME
                }
                // handlesMap[el] = temp
                handlesMap.push(temp)
            }
        }

        return handlesMap

    }

    const createDefaultHandleList = () => {
        const handlesMap: THandlesItem[] = []
        const { CATALOG: { PRODUCTS }, HANDLES } = _APP.getAppData;
        for (const el in HANDLES) {
            const product = PRODUCTS[el];
            const temp = {
                ID: product.ID,
                PREVIEW_PICTURE: product.PREVIEW_PICTURE,
                models: product.models[0],
                NAME: product.NAME
            }
            // handlesMap[el] = temp
            handlesMap.push(temp)
        }

        return handlesMap

    }

    const createSurfaceList = (figureData) => {
        // const _data = appData.getAppData
        const { FASADE, CATALOG, POSITION_HANDLES } = _APP.getAppData
        const { PRODUCTS } = CATALOG
        const { PROPS } = modelState.getCurrentModel.userData;
        const { PRODUCT } = PROPS
        const { FASADE_PROPS, FASADE_POSITIONS, FASADE_TYPE } = PROPS.CONFIG
        const tempList: IFigureFasade[] = []

        const calcHandles = (fasadeId, fasade) => {
            //const disabled = FASADE_POSITIONS[el].FASADE_TYPE[0] == null

            const disabled = !fasade && FASADE_TYPE[fasadeId] == null

            const { COLOR } = fasade || FASADE_PROPS[fasadeId]

            const fasadeData = FASADE[COLOR]
            const haveHandles = POSITION_HANDLES[PRODUCT]

            console.log(haveHandles, '=== haveHandles ===')

            if (haveHandles) {
                tempList.push({
                    label: `Фасад ${parseInt(fasadeId) + 1}`,
                    name: `fasade ${parseInt(fasadeId) + 1}`,
                    disabled: disabled,
                    props: fasade || FASADE_PROPS[fasadeId],
                    action: () => createHandlesList()
                })
            };
        }

        if (figureData) {
            const { data, segmentIndex } = figureData
            calcHandles(segmentIndex, data)
        }
        else {
            for (const el in FASADE_PROPS) {
                calcHandles(el)
            }
        }

        return tempList

    }

    const createPlinthData = () => {
        const { PROPS } = modelState.getCurrentModel.userData
        return PROPS.CONFIG.PLINTH_ACTIONS
    }

    const figureItems: IFigureItems[] = [
        {
            label: 'Ручки',
            name: 'Handles',
        },
        {
            label: 'Цоколь',
            name: 'Plinth',
        }
    ]

    return { figureItems, createSurfaceList, createHandlesList, createPlinthData, createDefaultHandleList }

}