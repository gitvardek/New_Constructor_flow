import { useAuthStore } from '@/store/appStore/authStore'
import { readSnapshot, removeSnapshot, writeSnapshot } from '../storage'
import type { IAutosaveSnapshot } from '../types'

/**
 * Последний известный ID: logout обнуляет userData до перехода на страницу входа,
 * а снапшот дописывается уже после этого — без запомненного ID он ушёл бы в чужой ключ
 */
let lastKnownUserId: string | number | null = null

/** Обёртка над хранилищем, подставляющая ID текущего пользователя в ключ */
export const useAutosaveStorage = () => {
    const authStore = useAuthStore()

    const getUserId = () => {
        const id = (authStore.userData as { id?: string | number })?.id ?? null

        if (id != null) {
            lastKnownUserId = id
        }

        return id ?? lastKnownUserId
    }

    return {
        read: (): IAutosaveSnapshot | null => readSnapshot(getUserId()),
        write: (snapshot: IAutosaveSnapshot): boolean => writeSnapshot(getUserId(), snapshot),
        remove: (): void => removeSnapshot(getUserId())
    }
}
