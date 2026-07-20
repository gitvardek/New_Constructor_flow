//@ts-nocheck
import * as THREE from "three";
import * as UniformTypes from '@/types/uniformTextureTypes'
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
// import { APP } from '@/Application/F-sources';


export const useUniformState = defineStore('UniformState', () => {


    const uniformModeData = ref<{
        uniformMode?: boolean,
        preGrouping?: boolean,
        groupAddition?: boolean,
    }
    >({
        uniformMode: false,
        preGrouping: false,
        groupAddition: false
    })
    const uniformGroups = ref<[]>([])

    const preGroup = ref<number>(0)

    const preloadGoups = ref<UniformTypes.TUniformGroupMembership[]>([])

    const checkUniformGroupMembership = (object) => {
        const { CONFIG } = object.userData.PROPS;
        const { UNIFORM_TEXTURE } = CONFIG;

        // console.log(UNIFORM_TEXTURE, '--UNIFORM_TEXTURE');

        if (UNIFORM_TEXTURE.group !== null) {

            const groupId = UNIFORM_TEXTURE.group;
            const groupColor = UNIFORM_TEXTURE.color
            const existingGroup = preloadGoups.value.find(group => group.id === groupId);

            // console.log(existingGroup, 'existingGroup')

            if (existingGroup) {
                existingGroup.objects.push(object);
            } else {
                preloadGoups.value.push({
                    id: groupId,
                    objects: [object],
                    color: groupColor
                });
            }
        }

        // console.log(preloadGoups.value, '--preloadGoups');
    };

    const clearUniformGroupMembership = () => {
        preloadGoups.value = []
    }

    const getUniformGroupMembership = computed(() => {
        return preloadGoups.value
    })

    const resetUniformState = () => {
        uniformModeData.value = {
            uniformMode: false,
            preGrouping: false,
            groupAddition: false
        }
        uniformGroups.value = []
        preGroup.value = 0
    }

    const setUniformModeData = ({ uniformMode, preGrouping }) => {

        uniformModeData.value.uniformMode = uniformMode ?? uniformModeData.value.uniformMode
        uniformModeData.value.preGrouping = preGrouping ?? uniformModeData.value.preGrouping
    }

    const getUniformModeData = computed(() => {

        return uniformModeData.value
    })

    const setUniformGroups = (value) => {
        uniformGroups.value = value

    }

    const getUniformGroups = computed(() => {

        return uniformGroups.value
    })

    const setPreGroup = (value) => {
        preGroup.value = value

    }

    const getPreGroup = computed(() => {

        return preGroup.value
    })

    const setPreGrouping = (value) => {
        uniformModeData.value.preGrouping = value
    }

    const getPreGrouping = computed(() => {
        return uniformModeData.value.preGrouping
    })

    const clearUniformGroupsStors = () => {
        uniformGroups.value = []
        preGroup.value = []
        uniformModeData.value = {
            uniformMode: false,
            preGrouping: false,
            groupAddition: false
        }
    }



    return {
        resetUniformState,

        setUniformModeData,
        getUniformModeData,

        setUniformGroups,
        getUniformGroups,

        setPreGroup,
        getPreGroup,

        setPreGrouping,
        getPreGrouping,

        checkUniformGroupMembership,
        clearUniformGroupMembership,
        getUniformGroupMembership,

        clearUniformGroupsStors,
    };
})

