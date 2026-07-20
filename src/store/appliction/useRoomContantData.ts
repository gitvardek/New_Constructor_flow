import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useRoomContantData = defineStore('RoomContantData', () => {

    const roomContantData = ref<any>({})
    const roomContantDataForBasket = ref<string>('[]')

    const setRoomContantData = (value: any) => {
        roomContantData.value = value
    }

    const getRoomContantData = computed(() => {
        return roomContantData.value

    })

    const setRoomContantDataForBasket = (value: any) => {
        roomContantDataForBasket.value = typeof value === 'string' ? value : JSON.stringify(value)
    }

    const getRoomContantDataForBasket = computed(() => {
        return roomContantDataForBasket.value
    })

    return {
        getRoomContantData,
        setRoomContantData,
        getRoomContantDataForBasket,
        setRoomContantDataForBasket
    };

})
