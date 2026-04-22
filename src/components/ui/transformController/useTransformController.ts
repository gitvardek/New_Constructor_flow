import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useTransformController = defineStore('TransformController', () => {
    const transformControls = ref<boolean>(false)
    const transformControlsName = ref<string>("Позиционирование")
    const transformControlSnapAngles = ref<number[]>([1, 5, 10, 20, 30, 40, 45, 50, 90, 180]);
    const currentControlSnapAngle = ref<number>(1)


    const setTransformControlsValue = (value: boolean) => {
        transformControls.value = value
    }

    const setControlSnapAngle = (value: number) => {
        currentControlSnapAngle.value = value
    }

    const setTransformControlsName = (value: string) => {
        transformControlsName.value = value
    }

    const getTransformControlsValue = computed(() => {
        return transformControls.value
    })

    const getTransformControlSnapAngles = computed(() => {
        return transformControlSnapAngles.value
    })

    const getControlSnapAngle = computed(() => {
        return currentControlSnapAngle.value
    })


    const getTransformControlsName = computed(() => {
        return transformControlsName.value
    })

    return {
        setTransformControlsValue,
        setControlSnapAngle,
        setTransformControlsName,
        getTransformControlsValue,
        getTransformControlSnapAngles,
        getControlSnapAngle,
        getTransformControlsName
    }

})
