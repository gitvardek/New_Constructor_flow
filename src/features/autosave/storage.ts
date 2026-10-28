import {
    AUTOSAVE_KEY_PREFIX,
    AUTOSAVE_SIZE_LIMIT,
    AUTOSAVE_TTL_MS,
    AUTOSAVE_VERSION
} from './constants'
import type { IAutosaveSnapshot } from './types'

/** Ключ привязан к пользователю: на общем компьютере чужой проект не предложится к восстановлению */
export const getAutosaveKey = (userId?: string | number | null): string => {
    const id = userId != null && String(userId) !== '' ? String(userId) : 'guest'

    return `${AUTOSAVE_KEY_PREFIX}:${id}`
}

export const removeSnapshot = (userId?: string | number | null): void => {
    try {
        localStorage.removeItem(getAutosaveKey(userId))
    } catch (error) {
        console.warn('Автосохранение: не удалось удалить снапшот', error)
    }
}

/** Читает снапшот; просроченный или снятый другой версией формата удаляет */
export const readSnapshot = (userId?: string | number | null): IAutosaveSnapshot | null => {
    try {
        const raw = localStorage.getItem(getAutosaveKey(userId))

        if (!raw) {
            return null
        }

        const snapshot = JSON.parse(raw) as IAutosaveSnapshot
        const isValid = snapshot?.version === AUTOSAVE_VERSION
            && Array.isArray(snapshot.project?.rooms)
            && snapshot.project.rooms.length > 0

        if (!isValid || Date.now() - Number(snapshot.savedAt) > AUTOSAVE_TTL_MS) {
            removeSnapshot(userId)

            return null
        }

        return snapshot
    } catch (error) {
        console.warn('Автосохранение: снапшот повреждён', error)
        removeSnapshot(userId)

        return null
    }
}

/**
 * Пишет снапшот. Если проект не влезает в лимит, повторяет попытку без корзины;
 * при повторной неудаче предыдущий снапшот остаётся нетронутым.
 */
export const writeSnapshot = (
    userId: string | number | null | undefined,
    snapshot: IAutosaveSnapshot
): boolean => {
    const key = getAutosaveKey(userId)
    const variants: IAutosaveSnapshot[] = [snapshot, { ...snapshot, basket: null }]

    for (const variant of variants) {
        try {
            const raw = JSON.stringify(variant)

            if (raw.length > AUTOSAVE_SIZE_LIMIT) {
                continue
            }

            localStorage.setItem(key, raw)

            return true
        } catch (error) {
            console.warn('Автосохранение: запись снапшота не удалась', error)
        }
    }

    console.warn('Автосохранение: проект не влезает в localStorage, сохранён прежний снапшот')

    return false
}
