import { useRouter } from 'vue-router'
import { useEventBus } from '@/store/appliction/useEventBus'
import { useSceneState } from '@/store/appliction/useSceneState'
import { useRoomState } from '@/store/appliction/useRoomState'
import { useSchemeTransition } from '@/store/canvasMerge/schemeTransition'
import { useBasketStorage } from '@/store/appStore/basket/useBasketStorage'
import { useProjectStore } from '@/features/quickActions/project/store/useProjectStore'
import type { IRoom } from '@/types/interfases'
import type { IAutosaveSnapshot } from '../types'
import { useAutosave } from './useAutosave'

/** Слои 2D создаются при монтировании конструктора, поэтому их приходится дожидаться */
const waitForLayers = async (timeout = 10_000) => {
    const startedAt = Date.now()

    while (Date.now() - startedAt < timeout) {
        const layers = (window as any).C2D?.layers

        if (layers?.planner && layers?.doorsAndWindows) {
            return layers
        }

        await new Promise(resolve => setTimeout(resolve, 50))
    }

    console.warn('Автосохранение: слои 2D не готовы, схема не перерисована')

    return null
}

/** Применение снапшота к сцене — тот же порядок шагов, что и при открытии проекта с сервера */
export const useAutosaveRestore = () => {
    const router = useRouter()
    const eventBus = useEventBus()
    const sceneState = useSceneState()
    const roomState = useRoomState()
    const schemeTransition = useSchemeTransition()
    const basketStorage = useBasketStorage()
    const projectState = useProjectStore()
    const autosave = useAutosave()

    const restore = async (snapshot: IAutosaveSnapshot): Promise<boolean> => {
        autosave.lock()

        try {
            projectState.resetState()
            projectState.setInitialState(snapshot.project)

            schemeTransition.clearStore()
            roomState.clearCurrentRoomId()

            await sceneState.loadProjectFromData(snapshot.project)
            schemeTransition.setAppData(snapshot.project.rooms)
            roomState.routConvertData('/3d')

            if (snapshot.projectId) {
                projectState.setProjectId(snapshot.projectId)
            }

            if (snapshot.basket) {
                basketStorage.mainConstructor.value = snapshot.basket.mainConstructor
                basketStorage.mainCatalog.value = snapshot.basket.mainCatalog
            }

            const rooms = roomState.getRooms as IRoom[]
            const targetRoom = rooms.find(room => String(room.id) === snapshot.roomId) ?? rooms[0]

            if (targetRoom) {
                roomState.setCurrentRoomId(targetRoom.id)
            }

            eventBus.emit('A:ContantLoaded', true)

            const wasOnTargetView = router.currentRoute.value.path === snapshot.view

            if (!wasOnTargetView) {
                await router.push(snapshot.view)
            }

            if (snapshot.view === '/3d') {
                // При переходе сцену соберёт сам World, а уже открытую нужно перезагрузить
                if (wasOnTargetView && targetRoom) {
                    await roomState.setLoad(false)
                    eventBus.emit('A:Load', targetRoom.id)
                }
            } else {
                const layers = await waitForLayers()

                layers?.planner?.init(true)
                layers?.doorsAndWindows?.init(true)
            }

            // Снапшот не удаляем: до сохранения на сервер он остаётся единственной копией работы
            return true
        } catch (error) {
            console.error('Автосохранение: не удалось восстановить проект', error)

            return false
        } finally {
            autosave.unlock()
        }
    }

    return { restore }
}
