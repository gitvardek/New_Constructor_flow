//@ts-nocheck

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

import { useModelState } from "@/store/appliction/useModelState";
import { TKromkaMaterialItem, TToptableUMProp } from "@/types/types";
import { _URL } from "@/types/constants";

const modelState = useModelState()

const useKromkaActions = defineStore('KromkaActions', () => {

    const PRODUCTS = modelState._PRODUCTS
    const HEMLIST: TKromkaMaterialItem[] = modelState._HEM

    const tempKromkaList = ref<TKromkaMaterialItem[] | []>([])
    const kromkaActive = ref<boolean>(false);
    const cardData = ref<Record<string, any> | null>(null)
    const kromkaListVisible = ref<boolean>(false);
    const tempGridData = ref<any[]>([])
    const tempProfileData = ref<any[]>([])
    const tempKromkaId = ref<number | null>(null)

    const getKromkaList = computed(() => {
        return tempKromkaList
    })

    const getKromkaActive = computed(() => {
        return kromkaActive
    })

    const getKromkaCardData = computed(() => {
        return cardData
    })

    const getKromkaCardSelect = computed(() => {
        return kromkaListVisible
    })

    const getCurrentKromkaId = () => {
        return tempKromkaId.value
    }

    const setKromkaActive = (value: boolean) => {
        kromkaActive.value = value
    }

    const setGridData = (value: any[]) => {
        tempGridData.value = value
    }

    const setProfileData = (value: any[]) => {
        tempProfileData.value = value
    }

    const setKromkaId = (value: number | null) => {
        tempKromkaId.value = value
    }

    const checkKromkaActive = (option = null) => {

        const grid = tempGridData.value
        let hasActiveKromka = false

        const parent = modelState.getCurrentRaspilParent
        const { PROPS: { PRODUCT, CONFIG } } = parent!.userData;
        const { HEM, REC_HEM } = PRODUCTS[PRODUCT]
        const activeProfile = tempProfileData.value.find((prof) => prof.value);

        if (tempProfileData.value.length > 0) {
            hasActiveKromka = grid
                .flatMap(row => row)
                .flatMap(cell => cell.serviseData || [])
                .some(serv =>
                    Array.isArray(serv.show_props) &&
                    serv.show_props.includes('hem') &&
                    serv.value === true
                );
            console.log(hasActiveKromka, 'hasActiveKromka')
            console.log(HEMLIST[REC_HEM[0]], 'HEMLIST[REC_HEM[0]]')

            const hasProfileKromka = activeProfile.show_props && activeProfile.show_props?.includes("hem")

            if (hasProfileKromka && tempKromkaId.value == null) {

                const hemList = HEM.map((el: number) => {
                    return HEMLIST[el]
                }).filter(Boolean)

                const defaultHem = HEMLIST[REC_HEM[0]]
                tempKromkaId.value = defaultHem?.ID ?? hemList[0].ID;
            }

            console.log(hasActiveKromka, '==== ❌ hasActiveKromka ❌ ====')
            // console.log(hasProfileKromka, '==== ❌ hasProfileKromka ❌ ====')

            kromkaActive.value = hasActiveKromka ? hasActiveKromka : hasProfileKromka
            if (!kromkaActive.value) tempKromkaId.value = null

            return
        }

        kromkaActive.value = false

    }

    const checkKromkaActiveUM = (toptableData: TToptableUMProp) => {

        let hasActiveKromka = false

        if (!toptableData) {
            kromkaActive.value = false
            return
        }

        const productId = toptableData?.TABLE

        const activeProfile = toptableData?.PROFILE ? tempProfileData.value.find((el) => el.ID === toptableData.PROFILE) : tempProfileData.value.find((prof) => prof.value);

        const parent = modelState.getCurrentRaspilParent ?? modelState.getCurrentModel

        const { HEM, REC_HEM } = PRODUCTS[productId]


        if (tempProfileData.value.length > 0) {

            const hasProfileKromka = activeProfile.show_props && activeProfile.show_props?.includes("hem")
            hasActiveKromka = !!toptableData.KROMKA && hasProfileKromka

            if (hasProfileKromka && tempKromkaId.value == null) {
                const hemList = HEM.map((el: number) => {
                    return HEMLIST[el]
                }).filter(Boolean)

                const defaultHem = HEMLIST[REC_HEM[0]]
                tempKromkaId.value = defaultHem?.ID ?? hemList[0].ID;
            }

            kromkaActive.value = hasActiveKromka ? hasActiveKromka : hasProfileKromka
            if (!kromkaActive.value)
                tempKromkaId.value = null

            return
        }

        kromkaActive.value = false

    }

    const kromkaSelect = (value) => {

        kromkaListVisible.value = false

        const parent = modelState.getCurrentRaspilParent
        let data: Record<string, any> = {}
        data.NAME = value.NAME
        data.PREVIEW_PICTURE = _URL + value.PREVIEW_PICTURE
        cardData.value = data

        tempKromkaId.value = value.ID

    }

    const kromkaCardSelect = () => {
        kromkaListVisible.value = !kromkaListVisible.value
    }

    const hideKromkaList = () => {
        kromkaListVisible.value = false
    }

    const createKromkaCardData = () => {
        if (!kromkaActive.value)
            return

        const parent = modelState.getCurrentRaspilParent
        const { PROPS: { PRODUCT, CONFIG } } = parent!.userData;
        const { HEM, REC_HEM } = PRODUCTS[PRODUCT]

        const kromkaId = tempKromkaId.value;
        const defaultHem = HEMLIST[REC_HEM[0]]
        const defaultId = defaultHem?.ID ?? tempKromkaList.value[0].ID;

        const target = tempKromkaList.value.find(
            el => el.ID === (kromkaId || defaultId)
        ) as TKromkaMaterialItem | undefined;

        if (!target) return;

        const { NAME, PREVIEW_PICTURE } = target;

        cardData.value = {
            NAME,
            PREVIEW_PICTURE: _URL + PREVIEW_PICTURE,
        };
    };

    const getCurretKromkaList = () => {

        if (!kromkaActive.value) return

        const parent = modelState.getCurrentRaspilParent ?? modelState.getCurrentModel
        const { PROPS } = parent!.userData;
        const { PRODUCT } = PROPS
        const { HEM } = PRODUCTS[PRODUCT]
        const hemList = HEM.map((el: number) => {
            return HEMLIST[el]
        }).filter(Boolean)

        tempKromkaList.value = hemList
        createKromkaCardData()
    }

    const getCurretKromkaListUM = (productId: number) => {

        if (!kromkaActive.value || !productId)
            return

        const { HEM, REC_HEM } = PRODUCTS[productId]
        const hemList = HEM.map((el: number) => {
            return HEMLIST[el]
        }).filter(Boolean)

        tempKromkaList.value = hemList

        // Устанавливаем данные карточки напрямую — createKromkaCardData() использует
        // getCurrentRaspilParent, который равен null в контексте UM
        const currentId = tempKromkaId.value
        const defaultHem = HEMLIST[REC_HEM?.[0]]
        const target = hemList.find(el => el.ID === currentId)
            ?? hemList.find(el => el.ID === defaultHem?.ID)
            ?? hemList[0]

        if (target) {
            cardData.value = {
                NAME: target.NAME,
                PREVIEW_PICTURE: _URL + target.PREVIEW_PICTURE,
            }
            if (currentId == null) {
                tempKromkaId.value = target.ID
            }
        }
    }

    const clearKromkaData = () => {
        tempKromkaList.value = []
        kromkaActive.value = false
        cardData.value = null
        kromkaListVisible.value = false
        tempGridData.value = []
        tempProfileData.value = []
        tempKromkaId.value = null
    }

    return {
        getCurretKromkaList,
        getKromkaList,
        checkKromkaActive,
        getKromkaActive,
        kromkaSelect,
        kromkaCardSelect,
        getKromkaCardData,
        getKromkaCardSelect,
        getCurrentKromkaId,
        hideKromkaList,
        setKromkaActive,
        setGridData,
        setProfileData,
        setKromkaId,
        clearKromkaData,
        getCurretKromkaListUM,
        checkKromkaActiveUM,
    }
})

export { useKromkaActions }