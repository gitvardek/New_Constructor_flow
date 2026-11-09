<script setup lang="ts">
import { computed, onBeforeMount, ref } from "vue"

import { useDrawers } from "./useDrawers"
import type { TDrawerListItem } from "./useDrawers"
import type { Tab } from "@/components/ui/tabs/defaultTab.vue"
import type { TFasadeItem } from "@/types/types"

import defaultTab from "@/components/ui/tabs/defaultTab.vue"
import DrawerConfiguration from "./domain/modules/DrawerConfiguration.vue"
import MaterialSelector from "@/components/right-menu/customiser-pages/ColorRightPage/MaterialSelector.vue"

/** Карточка-триггер: по ней выбираем, какой список показать в контейнере ниже */
type TDrawerSection = "drawer" | "drawerColor"

const {
    positions,
    getSelection,
    getDrawerList,
    getColorList,
    getDrawerData,
    getColorData,
    selectDrawer,
    selectColor,
    resetPosition,
} = useDrawers()

/** Текущая позиция — FASADE_NUMBER фасада, а не индекс таба */
const activePosition = ref<number | null>(null)
const activeSection = ref<TDrawerSection>("drawer")
const drawerQuery = ref("")

// Выбор хранится в CONFIG модели, он не реактивный — списки пересобираем вручную
const drawerList = ref<TDrawerListItem[]>([])
const colorList = ref<TFasadeItem[]>([])
const drawerData = ref<Record<string, string>>({})
const colorData = ref<Record<string, string>>({})

const tabs = computed<Tab[]>(() =>
    positions.value.map(item => ({
        name: `drawer-${item.position}`,
        label: `Ящик ${item.position}`,
    }))
)

const initialTab = computed(() =>
    activePosition.value === null ? undefined : `drawer-${activePosition.value}`
)

/** Поиск по названиям ящиков, у цветов свой поиск внутри MaterialSelector */
const filteredDrawerList = computed(() => {
    const query = drawerQuery.value.trim().toLowerCase()

    if (!query) {
        return drawerList.value
    }

    return drawerList.value.filter(item => item.NAME.toLowerCase().includes(query))
})

const refresh = () => {
    const position = activePosition.value

    if (position === null) {
        drawerList.value = []
        colorList.value = []
        drawerData.value = {}
        colorData.value = {}
        return
    }

    drawerList.value = getDrawerList(position)
    colorList.value = getColorList(position)
    drawerData.value = getDrawerData(position)
    colorData.value = getColorData(position)
}

onBeforeMount(() => {
    // Приводим конфиг к актуальным данным до первого рендера
    getSelection()
    activePosition.value = positions.value[0]?.position ?? null
    refresh()
})

const handleTabChange = ({ index }: { index: number; tab: Tab }) => {
    activePosition.value = positions.value[index]?.position ?? null
    activeSection.value = "drawer"
    drawerQuery.value = ""
    refresh()
}

const selectSection = (type: TDrawerSection) => {
    activeSection.value = type
}

const onDrawerSelect = (id: string) => {
    if (activePosition.value === null) {
        return
    }

    selectDrawer(activePosition.value, id)
    refresh()
}

const onColorSelect = (color: TFasadeItem) => {
    if (activePosition.value === null) {
        return
    }

    selectColor(activePosition.value, String(color.ID))
    refresh()
}

const onReset = () => {
    if (activePosition.value === null) {
        return
    }

    resetPosition(activePosition.value)
    refresh()
}
</script>

<template>
    <div class="drawers">
        <defaultTab v-if="tabs.length > 1" :tabs="tabs" :initialTab="initialTab" @tab-change="handleTabChange" />

        <div class="drawers__container" v-if="activePosition !== null">
            <div class="drawers__header">
                <DrawerConfiguration
                    :type="'drawer'"
                    :data="drawerData"
                    :additionalClass="activeSection === 'drawer' ? 'active' : ''"
                    @choose-option="selectSection"
                    @delete-choise="onReset"
                />
                <DrawerConfiguration
                    :type="'drawerColor'"
                    :data="colorData"
                    :disableDeleteChoice="true"
                    :additionalClass="activeSection === 'drawerColor' ? 'active' : ''"
                    @choose-option="selectSection"
                />
            </div>

            <div class="drawer__config">
                <div v-if="activeSection === 'drawer'" class="drawers__drawers">
                    <input class="search" type="text" placeholder="Поиск" v-model="drawerQuery" />

                    <div class="drawers__list">
                        <div
                            class="drawers__item"
                            :class="{ 'drawers__item--active': drawer.active }"
                            v-for="drawer in filteredDrawerList"
                            :key="drawer.ID"
                            @click="onDrawerSelect(drawer.ID)"
                        >
                            {{ drawer.NAME }}
                        </div>

                        <div v-if="!filteredDrawerList.length" class="drawers__empty">Ящики не найдены</div>
                    </div>
                </div>

                <div v-else class="drawers__colors">
                    <MaterialSelector v-if="colorList.length" :materials="colorList" @select="onColorSelect" />
                    <div v-else class="drawers__empty">Цвета для этого ящика недоступны</div>
                </div>
            </div>
        </div>

        <div v-else class="drawers__empty">Ящики недоступны для данного модуля</div>
    </div>
</template>

<style lang="scss" scoped>
.drawers {
    display: flex;
    flex-direction: column;
    gap: 15px;
    max-height: calc(100vh - 150px);
    padding-bottom: 1rem;
    overflow: hidden;

    &__container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        overflow: hidden;
        margin-bottom: 0.5rem;
        border: 1px solid $stroke;
        border-radius: 10px;
        padding: 5px;
        font-size: 1.4rem;
    }

    &__header {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
    }

    &__drawers,
    &__colors {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        overflow: hidden;
    }

    &__list {
        display: flex;
        flex-direction: column;
        gap: 5px;
        max-height: 35vh;
        overflow-y: auto;
    }

    &__item {
        padding: 10px;
        border-radius: 15px;
        background-color: $bg;
        font-size: 1.4rem;
        cursor: pointer;

        transition-property: background-color, color;
        transition-duration: 0.25s;
        transition-timing-function: ease;

        @media (hover: hover) {
            &:hover {
                background-color: $stroke;
                color: $black;
            }
        }

        &--active {
            box-shadow: inset 0 0 0 2px rgba($dark-stroke, 0.8);
            color: $black;
        }
    }

    &__empty {
        padding: 10px;
        color: #999;
        font-size: 1.2rem;
        text-align: center;
    }
}

.drawer {
    &__config {
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border-top: 1px solid $stroke;
        padding-top: 0.5rem;
    }
}
</style>
