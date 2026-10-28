import { useEventBus } from '@/store/appliction/useEventBus'
import { useSceneState } from '@/store/appliction/useSceneState'
import { useRoomState } from '@/store/appliction/useRoomState'
import { useRoomOptions } from '@/components/left-menu/option/roomOptions/useRoomOptons'
import { useBasketStorage } from '@/store/appStore/basket/useBasketStorage'
import { useProjectStore } from '@/features/quickActions/project/store/useProjectStore'
import type { IProjectParams, IRoom } from '@/types/interfases'
import { AUTOSAVE_VERSION } from '../constants'
import type { IAutosaveSnapshot } from '../types'

/** Сбор снапшота проекта из сторов — тем же путём, каким собирается проект при ручном сохранении */
export const useAutosaveSnapshot = () => {
    const eventBus = useEventBus()
    const sceneState = useSceneState()
    const roomState = useRoomState()
    const roomOptions = useRoomOptions()
    const basketStorage = useBasketStorage()
    const projectState = useProjectStore()

    const collect = (view: '/2d' | '/3d'): IAutosaveSnapshot | null => {
        // В 3D актуальное состояние комнаты лежит в сцене: переносим его в сторы, как делает ручное сохранение
        if (view === '/3d') {
            eventBus.emit('A:Save')
        }

        const project = (roomOptions.saveSceneParams() ?? sceneState.getCurrentProjectParams) as IProjectParams

        if (!project) {
            return null
        }

        // В 2D правки планировки доходят до roomState, но не до currentProjectParams
        const rooms = roomState.getRooms as IRoom[]

        if (rooms?.length) {
            project.rooms = rooms
        }

        if (!project.rooms?.length) {
            return null
        }

        const roomId = roomState.getRoomId

        return {
            version: AUTOSAVE_VERSION,
            savedAt: Date.now(),
            view,
            roomId: roomId != null ? String(roomId) : null,
            projectId: projectState.getProjectId(),
            projectName: String(project.project_name ?? ''),
            project,
            basket: {
                mainConstructor: basketStorage.mainConstructor.value,
                mainCatalog: basketStorage.mainCatalog.value
            }
        }
    }

    return { collect }
}
