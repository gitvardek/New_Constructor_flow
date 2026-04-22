

import type { Ref } from 'vue'
import { getCurrentInstance, onMounted, onUnmounted, computed, ref } from 'vue';
import { TApplication } from '@/types/types';
import { useBasketStore } from "@/store/appStore/useBasketStore";
import { useRoomContantData } from "@/store/appliction/useRoomContantData";
import { useRoomState } from '@/store/appliction/useRoomState';
import { useEventBus } from '@/store/appliction/useEventBus';

interface ExposedAPI {
    VerdekConstructor: Ref<TApplication>
    closeTableRedactor: () => void;
    openTableRedactor: () => void;
    selected: () => void;
    getScreenshots: () => any[];
    getScreenshotsByRoom: (roomId: string) => any[];
    clearScreenshots: () => void;
}

const basketStore = useBasketStore();
const roomContantData = useRoomContantData()
const roomState = useRoomState();
const eventBus = useEventBus()

const eventsMap = [
    'A:Duplicated',
    'U:ChangeModule',
    "U:Drop",
    "U:Model-resize",
    "U:ChangeGlassColor",
    "U:ChangePaletteColor",
    "U:ChangeMilling",
    "U:ChangeFasade",
    "A:Disable-Uniform-Mode",
    "A:UM-update",
    "A:Duplicate",
    "A:RemoveModel",
    "A:SelectModelOption",
    // "A:AddHandle",
    "U:AddHandle",
    // "A:RemoveHandle",
    "U:RemoveHandle",
    "A:SelectPlinth",
    "A:SelectHendels",
    "A:ChangeModuleTotalTexture",
    "A:ChangeFasadsTopTexture",
    "A:ChangeFasadsBottomTexture",
    "A:ChangePaletteTotal",
    "A:ChangeMillingTotal",
    "A:ChangePlinthBody",
    "A:ChangePlinthColor",
    "U:DrawPatina",
    "A:RecountShelfs",
    "A:Delite-Fasad",
    'A:GlobalParamsSelect',
    "A:ChangeShowcaseMilling",
    "A:ChangeShowcase"

]

const useBascetEvents = () => {

    const instance = getCurrentInstance();
    if (!instance) {
        throw new Error('❌ useBascetEvents должен вызываться внутри функции setup()');
    }

    const exposed = ref<ExposedAPI | null>(null);

    const currentConstructor = computed(() =>
        // @ts-ignore
        exposed.value?.VerdekConstructor.value ?? null
    );
    const actions = ref(null)
    let basketDebounceTimer: ReturnType<typeof setTimeout> | null = null;

    onMounted(() => {
        exposed.value = instance.exposed as ExposedAPI;
    });

    const scheduleBasketSync = () => {
        if (!actions.value) return
        // @ts-ignore
        const data = actions.value?.save();

        roomContantData.setRoomContantDataForBasket(data)

        clearTimeout(basketDebounceTimer!);
        basketDebounceTimer = setTimeout(() => {
            basketStore.addFromScene();
            basketStore.syncBasket();
        }, 500);
    }

    const addListeners = () => {
        eventsMap.forEach(event => {
            eventBus.on(event, scheduleBasketSync)
        })
    }

    const removeListeners = () => {
        eventsMap.forEach(event => {
            eventBus.off(event, scheduleBasketSync)
        })
    }

    const checkLoadContent = () => {
        if (!roomState.getLoad) {
            removeListeners()
            eventBus.on('A:ContantLoaded', scheduleBasketSync)
        }
        else {
            eventBus.off('A:ContantLoaded', scheduleBasketSync)
            addListeners()
        }
    }

    const testConnect = () => {
        actions.value = currentConstructor.value.getAction()
        if (actions.value) {
        }
    }

    const getEventsMap = () => {
        return eventsMap
    }

    onUnmounted(() => {
        removeListeners();
        eventBus.off('A:ContantLoaded', scheduleBasketSync);
    })


    return { getEventsMap, testConnect, checkLoadContent, scheduleBasketSync }
}

export { useBascetEvents }
