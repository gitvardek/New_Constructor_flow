//@ts-nocheck

import { defineStore } from 'pinia';
import { useSchemeTransition } from '../canvasMerge/schemeTransition';
import { computed, ref } from 'vue';
import * as THREEInterfases from "../../types/interfases"
import { TLightRange, TQuality, TOptionsMap, TOptionItem } from '@/types/types';
import { IWallSizes, ICameraData, ILightsObjects, IProjectParams } from '@/types/interfases';

import { START_PROJECT_PARAMS } from '@/Application/F-startData';
import { useRoomState } from './useRoomState';

export const useSceneState = defineStore('SceneState', () => {

    // const schemeTransition = useSchemeTransition()
    // const roomState = useRoomState()

    const startParamsClone = JSON.parse(JSON.stringify(START_PROJECT_PARAMS))

    const startProjectParams = ref(JSON.parse(JSON.stringify(START_PROJECT_PARAMS)))

    const startRoomData = ref<IWallSizes>(startParamsClone.rooms[0].params);

    const startCameraData = ref<ICameraData>(startParamsClone.camera);

    const startLightsDat = ref<ILightsObjects>(startParamsClone.lights);

    const startHeightClamp = ref<number>(startParamsClone.height_clamp)

    const currentProjectParams = ref<IProjectParams>(startParamsClone)

    const keys: Partial<Record<keyof TOptionsMap, keyof IProjectParams>> = {
        moduleTop: 'default_module_color_top',
        moduleBottom: 'default_module_color_bottom',
        fasadsTop: 'default_fasade_top',
        fasadsBottom: 'default_fasade_bottom',
    };

    const externalPalitteKeys: Partial<Record<keyof TOptionsMap, keyof IProjectParams>> = {
        fasadsTop: 'default_palit_top',
        fasadsBottom: 'default_palit_bottom'
    }

    const shadowValue = ref<boolean>(false)
    const refractionValue = ref<boolean>(false)

    const updateProjectParams = (params: Partial<IProjectParams>) => {
        const base = startProjectParams.value;
        const current = currentProjectParams.value;

        const merged: IProjectParams = {
            ...base,
            ...current,
            ...params,
            // Если пришёл новый список комнат, считаем его источником истины.
            // Это важно для операций удаления: комнаты, отсутствующие в params.rooms,
            // не должны «добавляться обратно» из текущего состояния.
            rooms: params.rooms ?? current.rooms ?? base.rooms,
            camera: params.camera ?? current.camera ?? base.camera,
            lights: params.lights ?? current.lights ?? base.lights,
            height_clamp: params.height_clamp ?? current.height_clamp ?? base.height_clamp,
        };


        currentProjectParams.value = merged;
    };

    const setShadowValue = (value: boolean) => {
        shadowValue.value = value
    }

    const setRefractionValue = (value: boolean) => {
        refractionValue.value = value
    }

    const setLightRange = (type: keyof TLightRange, value: number | string) => {
        lightRange.value[type] = value
    }

    const updateStartRoomData = (type: keyof IWallSizes & ("floor" | "wall"), value: string | number) => {
        startRoomData.value[type] = value
    }

    const updateDefaultData = <T extends keyof typeof keys>(type: T, value: TOptionItem | null
    ) => {
        const curOption = keys[type];
        const curPalitte = externalPalitteKeys[type];

        // console.log(value, 'curOption')
        if (curOption) {
            // console.log(startProjectParams.value, 'startProjectParams_1')

            startProjectParams.value[curOption] = value?.id;
            currentProjectParams.value[curOption] = value?.id;

            if (value?.palitte) {

                if (curPalitte) {

                    startProjectParams.value[curOption] = value?.palitte;
                    currentProjectParams.value[curOption] = value?.palitte;
                }

            }
        }
    };

    const createNewProject = () => {
        const clone = JSON.parse(JSON.stringify(START_PROJECT_PARAMS))

        startProjectParams.value = JSON.parse(JSON.stringify(START_PROJECT_PARAMS))

        startParamsClone.value = clone

        startRoomData.value = clone.rooms[0].params

        startCameraData.value = clone.camera

        startLightsDat.value = clone.lights

        startHeightClamp.value = clone.height_clamp

        currentProjectParams.value = clone

    }

    const loadProjectFromData = async (newProject: IProjectParams) => {

        startProjectParams.value = newProject

        startParamsClone.value = newProject

        startRoomData.value = newProject.rooms[0].params

        // startCameraData.value = newProject.camera

        // startLightsDat.value = newProject.lights

        // startHeightClamp.value = newProject.height_clamp

        // currentProjectParams.value = newProject



        // const clone = JSON.parse(JSON.stringify(newProject))

        // startProjectParams.value = JSON.parse(JSON.stringify(newProject))

        // startParamsClone.value = clone

        // startRoomData.value = clone.rooms[0].params

        // startCameraData.value = clone.camera

        // startLightsDat.value = clone.lights

        // startHeightClamp.value = clone.height_clamp

        // currentProjectParams.value = clone
    }

    const getStartProgectParams = computed(() => {
        return startProjectParams.value
    })

    const getStartRoomData = computed(() => {
        return startRoomData.value
    })

    const getStartCameraData = computed(() => {
        return startCameraData.value
    })

    const getStartLightsData = computed(() => {
        return startLightsDat.value
    })

    const getStartHeightClamp = computed(() => {
        return startHeightClamp.value
    })

    const getCurrentProjectParams = computed(() => {
        return currentProjectParams.value
    })

    const getShadowValue = computed(() => {
        return shadowValue.value
    })

    const getRefractionValue = computed(() => {
        return refractionValue.value
    })

    const getLightRange = computed(() => {
        return lightRange.value
    })

    const getQuality = computed(() => {
        return quality.value
    })

    return {
        getStartProgectParams,
        getStartRoomData,
        getStartCameraData,
        getStartLightsData,
        getStartHeightClamp,
        getCurrentProjectParams,
        getRefractionValue,
        getShadowValue,
        getLightRange,
        getQuality,

        updateProjectParams,
        updateStartRoomData,
        updateDefaultData,
        setRefractionValue,
        setShadowValue,
        setLightRange,
        createNewProject,
        loadProjectFromData
    };

});