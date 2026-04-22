// @ts-nocheck
import { useAppData } from "@/store/appliction/useAppData";
import { useModelState } from "@/store/appliction/useModelState";
import { useSceneState } from "@/store/appliction/useSceneState";
import { TFasadeProp } from "@/types/types";

type TWheightData = {
    width: number
    height: number
    square: number
    weight: number
}

type TMechanismData = {
    ID: number,
    NAME: string,
    CLOSE_OTHER_OPTIONS: number | string,
    TYPE: string,
    active: boolean,
    visible: boolean
}

type TMechanismListData = {
    NAME: string, CONTANT: TMechanismData[]
}

type TWeightData = {
    fasade: TFasadeProp,
    params: Record<string, number>,
    props: any,
    defMilling: number,
    milling_weight: any,
    fasade_weight: any
}

export const useMechanism = () => {

    const appData = useAppData()
    const modelState = useModelState();
    const sceneState = useSceneState();



    const weightCalculation = (element): TWheightData[] | null[] | [] => {
        try {

            console.log(appData.getAppData)

            const { fasade_weight, milling_weight, CATALOG } = appData.getAppData
            const { PRODUCTS } = CATALOG
            // const { PROPS } = element ?? modelState.getCurrentModel!.userData
            const { PROPS } = element.userData

            console.log(PROPS, '---PROPS---')
            const { CONFIG, FASADE } = PROPS
            const { FASADE_PROPS } = CONFIG

            let weightData;
            const defMilling = sceneState.getCurrentProjectParams.default_milling as number

            if (element.userData.UM) {
                weightData = [createWeightData({
                    fasade: FASADE_PROPS,
                    props: PROPS,
                    defMilling,
                    milling_weight,
                    fasade_weight,
                    coreProducts: PRODUCTS
                })]
            }
            else {
                weightData = FASADE_PROPS.map((fasade: TFasadeProp, ndx: number) => {
                    const { FASADE_WIDTH, FASADE_HEIGHT } = FASADE[ndx].userData.trueSize;
                    const result = createWeightData({
                        fasade: fasade,
                        params: { FASADE_WIDTH, FASADE_HEIGHT },
                        props: PROPS,
                        defMilling,
                        milling_weight,
                        fasade_weight,
                        coreProducts: PRODUCTS
                    });
                    return result
                })
            }

            // weightData = FASADE_PROPS.map((fasade: TFasadeProp, ndx: number) => {
            //     if (fasade.COLOR == 7397) return null

            //     const { PRODUCT } = PROPS
            //     const { FASADE_WIDTH, FASADE_HEIGHT } = FASADE[ndx].userData.trueSize
            //     const product = PRODUCTS[PRODUCT]

            //     const prodMill = product.type_showcase[0] !== null && product.MILLING[0] !== null

            //     const curWeight = fasade_weight[fasade.COLOR]
            //     const curMilling = fasade.MILLING ? milling_weight[fasade.MILLING!] : prodMill ? milling_weight[defMilling] : null

            //     if (curWeight) {
            //         const square = FASADE_WIDTH * FASADE_HEIGHT
            //         const weight = parseFloat(curWeight) * (square / 1000000);

            //         return {
            //             width: FASADE_WIDTH,
            //             height: FASADE_HEIGHT,
            //             square: parseFloat(square.toFixed(2)),
            //             weight: parseFloat(weight.toFixed(2))
            //         }
            //     }
            //     else if (curMilling) {

            //         const square = FASADE_WIDTH * FASADE_HEIGHT
            //         const weight = parseFloat(curMilling) * (square / 1000000);

            //         return {
            //             width: FASADE_WIDTH,
            //             height: FASADE_HEIGHT,
            //             square: parseFloat(square.toFixed(2)),
            //             weight: parseFloat(weight.toFixed(2))
            //         }
            //     }
            //     return null

            // })

            console.log(weightData, '✅ IN useMechanism/weightCalculation -- weightData')
            return weightData

        } catch (e) {
            console.log('❌ Ошибка в методе weightCalculation объекта useMechanism', e)
            return []
        }
    }

    const createWeightData = (
        { fasade,
            params,
            props,
            defMilling,
            milling_weight,
            fasade_weight,
            coreProducts
        }: TWeightData) => {
        if (fasade.COLOR == 7397) return null

        console.log(fasade, '1')

        const { PRODUCT } = props
        let FASADE_WIDTH = params ? params.FASADE_WIDTH : fasade.UMSIZES?.width
        let FASADE_HEIGHT = params ? params.FASADE_HEIGHT : fasade.UMSIZES?.height

        const product = coreProducts[PRODUCT];

        console.log(PRODUCT, props, product, '2')

        const prodMill = product.type_showcase[0] !== null && product.MILLING[0] !== null

        const curWeight = fasade_weight[fasade.COLOR]
        const curMilling = fasade.MILLING ? milling_weight[fasade.MILLING!] : prodMill ? milling_weight[defMilling] : null

        if (curWeight) {
            const square = FASADE_WIDTH * FASADE_HEIGHT
            const weight = parseFloat(curWeight) * (square / 1000000);

            return {
                width: FASADE_WIDTH,
                height: FASADE_HEIGHT,
                square: parseFloat(square.toFixed(2)),
                weight: parseFloat(weight.toFixed(2))
            }
        }
        else if (curMilling) {

            const square = FASADE_WIDTH * FASADE_HEIGHT
            const weight = parseFloat(curMilling) * (square / 1000000);

            return {
                width: FASADE_WIDTH,
                height: FASADE_HEIGHT,
                square: parseFloat(square.toFixed(2)),
                weight: parseFloat(weight.toFixed(2))
            }
        }
        return null
    }

    const createMeckhanizmList = (element): TMechanismListData | [] => {
        try {
            const curModel = element ?? modelState.getCurrentModel;
            console.log(curModel)

            // return

            if (!curModel) return [];

            const { MECHANISM, CATALOG, condition_mechanism, OPTIONS_GROUP, FILLING } = appData.getAppData;
            const { PRODUCTS } = CATALOG;
            const { PROPS } = curModel.userData;
            const { PRODUCT, CONFIG } = PROPS;
            const { SIZE } = CONFIG;
            console.log(CONFIG.FILLING, 'CONFIG.FILLING')

            if (CONFIG.FILLING) {
                const checkFilling = FILLING[CONFIG.FILLING].VERTICAL
                if (!checkFilling) return []
            }

            const prodOptions = PRODUCTS[PRODUCT].OPTION;
            const weightsData = weightCalculation(curModel);
            // const weightsData = element.UM ? weightCalculation(element) : weightCalculation()

            if (weightsData.includes(null)) {

                console.log('❌ Результат метода weightCalculation объекта useMechanism содержит null');
                CONFIG.MECHANISM = null
                CONFIG.MECHANISM_TEMP = []
                return [];
            }

            const totalWeight: number = weightsData
                .filter(Boolean)
                .reduce((sum, item) => sum + item!.weight, 0);

            console.log(totalWeight, 'totalWeight')

            if (!totalWeight) {
                CONFIG.MECHANISM = null
                CONFIG.MECHANISM_TEMP = []
                return []
            };

            const filtered: Record<string, string> = {};
            const mechanism: Record<string, Record<string, any>> | TMechanismData[] = {};


            for (const optionKey in prodOptions) {

                const mechID = prodOptions[optionKey];

                const mech = MECHANISM[mechID]?.[PRODUCT];

                // console.log(mechID, mech,PRODUCT, '✅ === МЕХАНИЗМ === ✅')


                if (!mech) continue;


                const { PROPERTY_MECHANISM_LINK_VALUE, SECTION, GROUP, PROPERTY_TYPE_MECHANISM_VALUE, NAME } = mech;

                // console.log(mechanism[GROUP], '✅ === GROUP === ✅')

                // console.log(PROPERTY_MECHANISM_LINK_VALUE, '✅ === LINK_VALUE === ✅')

                for (const linkID of PROPERTY_MECHANISM_LINK_VALUE) {
                    const cond = condition_mechanism[linkID];

                    if (!cond) continue;

                    const minH = parseFloat(cond.PROPERTY_RANGE_MIN_HEIGHT_VALUE);
                    const maxH = parseFloat(cond.PROPERTY_RANGE_MAX_HEIGHT_VALUE);
                    const minW = parseFloat(cond.PROPERTY_RANGE_MIN_WEIGHT_VALUE);
                    const maxW = parseFloat(cond.PROPERTY_RANGE_MAX_WEIGHT_VALUE);


                    const heightInRange = SIZE.height >= minH && SIZE.height <= maxH;
                    const weightInRange = totalWeight >= minW && totalWeight <= maxW;

                    if (!heightInRange || !weightInRange) continue;

                    if (filtered[SECTION] && filtered[SECTION] !== PROPERTY_TYPE_MECHANISM_VALUE) continue;
                    filtered[SECTION] = PROPERTY_TYPE_MECHANISM_VALUE;

                    mechanism[GROUP] ??= [];

                    mechanism[GROUP].push({
                        ID: mechID,
                        NAME,

                        TYPE: 'mechanism',
                        group: GROUP,
                        close: '2',
                        active: CONFIG.MECHANISM == parseInt(mechID),
                        visible: true
                    })
                }
            }




            const result = Object.entries(mechanism).map(([key, value]) => {

                const prepare = Object.values(value).flat().reduce((acc, meck) => {
                    const exist = acc.find(el => el.ID === meck.ID)
                    if (!exist) acc.push(meck)
                    return acc
                }, [])


                if (OPTIONS_GROUP[key]) {
                    return { NAME: OPTIONS_GROUP[key].NAME, CONTANT: prepare }
                }
            })

            createMeckhanizmTemp(mechanism, curModel)

            return result;

        } catch (e) {
            console.log('❌ Ошибка в методе createMeckhanizmList объекта useMechanism', e);
            return [];
        }
    };

    const createMeckhanizmTemp = (data: TMechanismData[] | [], element: any) => {
        const result = Object.values(data).flat().reduce((acc, meck) => {
            const exist = acc.find(el => el.ID === meck.ID)
            if (!exist) acc.push(meck)
            return acc
        }, [])


        const curModel = element ?? modelState.getCurrentModel;
        const { PROPS } = curModel!.userData;
        const { CONFIG } = PROPS;

        console.log()

        CONFIG.MECHANISM_TEMP = result

    }


    return { weightCalculation, createMeckhanizmList }

}