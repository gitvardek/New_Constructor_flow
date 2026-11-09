import { computed } from "vue"

import { useModelState } from "@/store/appliction/useModelState"
import { useEventBus } from "@/store/appliction/useEventBus"
import type { TDrawerConfigItem, TFasadeItem } from "@/types/types"

import {
    createDefaultDrawers,
    getDrawerColorIds,
    getDrawerPosition,
    getDrawerPositions,
    resolveDrawer,
    resolveDrawerColor,
    syncDrawers,
} from "./domain/drawers"

/** Ящик для списка выбора: названия берём из DRAWERS.PRODUCT */
export type TDrawerListItem = {
    ID: string
    NAME: string
    active: boolean
}

const useDrawers = () => {
    const modelState = useModelState()
    const eventBus = useEventBus()

    const drawersData = computed(() => modelState._DRAWERS)

    const currentProps = () => modelState.getCurrentModel?.userData?.PROPS ?? null
    const currentConfig = () => currentProps()?.CONFIG ?? null
    const currentProductId = () => currentProps()?.PRODUCT ?? null

    /** Позиции ящиков текущего модуля */
    const positions = computed(() => getDrawerPositions(drawersData.value, currentProductId()))

    /**
     * Выбор ящиков текущего модуля. Конфиг заполняется при создании модуля, но у проектов,
     * сохранённых до появления ящиков, его нет — тогда достраиваем по дефолтам
     */
    const getSelection = (): TDrawerConfigItem[] => {
        const config = currentConfig()

        if (!config) {
            return []
        }

        const synced = syncDrawers(drawersData.value, currentProductId(), config.DRAWERS)

        if (!Array.isArray(config.DRAWERS) || JSON.stringify(synced) !== JSON.stringify(config.DRAWERS)) {
            config.DRAWERS = synced
        }

        return config.DRAWERS
    }

    /** Выбор для конкретной позиции */
    const getPositionSelection = (position: number) =>
        getSelection().find(item => item.POSITION === position) ?? null

    /** Список ящиков позиции с отметкой выбранного */
    const getDrawerList = (position: number): TDrawerListItem[] => {
        const positionData = getDrawerPosition(drawersData.value, currentProductId(), position)

        if (!positionData) {
            return []
        }

        const selected = getPositionSelection(position)?.ID

        return positionData.drawers.map(id => ({
            ID: id,
            NAME: drawersData.value.PRODUCT?.[id]?.NAME ?? id,
            active: String(selected) === id,
        }))
    }

    /** Цвета выбранного ящика — записи из _FASADE, их понимает MaterialSelector */
    const getColorList = (position: number): TFasadeItem[] => {
        const drawerId = getPositionSelection(position)?.ID

        return getDrawerColorIds(drawersData.value, drawerId)
            .map(id => modelState._FASADE?.[id])
            .filter(Boolean)
    }

    /** Данные ящика для плашки ConfigurationOption */
    const getDrawerData = (position: number) => {
        const drawerId = getPositionSelection(position)?.ID

        return { NAME: drawerId != null ? drawersData.value.PRODUCT?.[String(drawerId)]?.NAME ?? "" : "" }
    }

    /** Данные цвета для плашки ConfigurationOption */
    const getColorData = (position: number) => {
        const colorId = getPositionSelection(position)?.COLOR
        const color = colorId != null ? modelState._FASADE?.[colorId] : null

        return {
            name: color?.NAME ?? "",
            imgSrc: color?.PREVIEW_PICTURE ?? color?.DETAIL_PICTURE ?? "",
        }
    }

    /** Применяем выбор: пишем в CONFIG и перекрашиваем ящик в сцене */
    const apply = (position: number, drawerId: string, colorId: string | null) => {
        const config = currentConfig()

        if (!config) {
            return
        }

        const selection = getSelection()
        const item = selection.find(el => el.POSITION === position)

        if (item) {
            item.ID = drawerId
            item.COLOR = colorId
        } else {
            selection.push({ POSITION: position, ID: drawerId, COLOR: colorId })
        }

        eventBus.emit("A:ChangeDrawer", { position, id: drawerId, color: colorId })
    }

    /** Смена ящика: цвет пересчитываем, у нового ящика набор цветов может быть другим */
    const selectDrawer = (position: number, drawerId: string) => {
        const positionData = getDrawerPosition(drawersData.value, currentProductId(), position)

        if (!positionData) {
            return
        }

        const current = getPositionSelection(position)
        const color = resolveDrawerColor(
            drawersData.value,
            drawerId,
            current?.COLOR,
            positionData.defaultColor
        )

        apply(position, drawerId, color)
    }

    /** Смена цвета выбранного ящика */
    const selectColor = (position: number, colorId: string) => {
        const current = getPositionSelection(position)

        if (!current?.ID) {
            return
        }

        apply(position, String(current.ID), colorId)
    }

    /** Сброс позиции к дефолтам с бэка */
    const resetPosition = (position: number) => {
        const positionData = getDrawerPosition(drawersData.value, currentProductId(), position)
        const drawer = positionData ? resolveDrawer(positionData) : null

        if (!positionData || !drawer) {
            return
        }

        apply(position, drawer, resolveDrawerColor(drawersData.value, drawer, positionData.defaultColor))
    }

    return {
        positions,
        getSelection,
        getPositionSelection,
        getDrawerList,
        getColorList,
        getDrawerData,
        getColorData,
        selectDrawer,
        selectColor,
        resetPosition,
        createDefaultDrawers,
    }
}

export { useDrawers }
