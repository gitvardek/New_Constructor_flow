import { watch } from 'vue'
import type { Router } from 'vue-router'
import { useEventBus } from '@/store/appliction/useEventBus'
import { usePopupStore } from '@/store/appStore/popUpsStore'
import {
    AUTOSAVE_DEBOUNCE_MS,
    AUTOSAVE_IGNORED_EVENTS,
    AUTOSAVE_INTERVAL_MS,
    AUTOSAVE_WARMUP_MS
} from '../constants'
import { useAutosaveSnapshot } from './useAutosaveSnapshot'
import { useAutosaveStorage } from './useAutosaveStorage'

/** Состояние одно на приложение, поэтому живёт на уровне модуля */
let isListening = false
/** Есть правки, которых ещё нет в снапшоте */
let isDirty = false
/** Снапшот трогать нельзя: идёт восстановление или сбор данных */
let isLocked = false
/** До этого времени правки снапшот не создают: идёт загрузка проекта или стартовой комнаты */
let warmupUntil = 0
let debounceId: ReturnType<typeof setTimeout> | null = null
let intervalId: ReturnType<typeof setInterval> | null = null
let unregisterRouterGuard: (() => void) | null = null

/**
 * Автосохранение проекта в localStorage.
 * Снапшот снимается после правок (с задержкой), периодически и при закрытии страницы,
 * поэтому проект уцелеет и при закрытии браузера, и при зависании или потере питания.
 */
export const useAutosave = () => {
    const eventBus = useEventBus()
    const popupStore = usePopupStore()
    const { collect } = useAutosaveSnapshot()
    const storage = useAutosaveStorage()

    // Берём путь из адресной строки, а не из роутера: отметить правку или снять снапшот
    // нужно и из обычных функций, вне setup-контекста компонента
    const getView = (): '/2d' | '/3d' => (
        window.location.pathname.endsWith('/3d') ? '/3d' : '/2d'
    )

    const clearDebounce = () => {
        if (debounceId) {
            clearTimeout(debounceId)
            debounceId = null
        }
    }

    /** Записывает снапшот, если с момента последней записи были правки */
    const saveNow = () => {
        // Пока открыт попап восстановления, прежний снапшот перезаписывать нельзя: он и есть предмет выбора
        if (!isListening || !isDirty || isLocked || popupStore.popups.autosave) {
            return
        }

        clearDebounce()
        isLocked = true

        try {
            const snapshot = collect(getView())

            if (snapshot && storage.write(snapshot)) {
                isDirty = false
            }
        } catch (error) {
            console.error('Автосохранение: не удалось собрать снапшот', error)
        } finally {
            isLocked = false
        }
    }

    /** Правки учтены: проект загружен, сохранён или восстановлен */
    const markSaved = () => {
        isDirty = false
        warmupUntil = Date.now() + AUTOSAVE_WARMUP_MS
        clearDebounce()
    }

    const markDirty = () => {
        if (!isListening || isLocked || Date.now() < warmupUntil) {
            return
        }

        isDirty = true
        clearDebounce()
        debounceId = setTimeout(saveNow, AUTOSAVE_DEBOUNCE_MS)
    }

    const onBusEmit = (event: string) => {
        if (!AUTOSAVE_IGNORED_EVENTS.has(event)) {
            markDirty()
        }
    }

    const onVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
            saveNow()
        }
    }

    const attachBusListener = () => {
        eventBus.onEmitCalled(onBusEmit)
    }

    const start = (router: Router) => {
        if (isListening) {
            return
        }

        isListening = true
        markSaved()
        attachBusListener()

        intervalId = setInterval(saveNow, AUTOSAVE_INTERVAL_MS)
        window.addEventListener('pagehide', saveNow)
        window.addEventListener('beforeunload', saveNow)
        document.addEventListener('visibilitychange', onVisibilityChange)

        // Уходя с 3D, снимаем снапшот до размонтирования сцены: после него состояние комнаты уже не собрать
        unregisterRouterGuard = router.beforeEach((_to, from, next) => {
            if (from.path === '/3d') {
                saveNow()
            }

            next()
        })

        // The3D при размонтировании чистит шину целиком — возвращаем свою подписку
        watch(() => router.currentRoute.value.path, (_path, previousPath) => {
            if (previousPath === '/3d') {
                attachBusListener()
            }
        })
    }

    const stop = () => {
        if (!isListening) {
            return
        }

        // Уход со страницы конструктора — в том числе при автоматическом выходе из аккаунта —
        // последняя возможность зафиксировать правки
        saveNow()

        isListening = false
        clearDebounce()

        if (intervalId) {
            clearInterval(intervalId)
            intervalId = null
        }

        window.removeEventListener('pagehide', saveNow)
        window.removeEventListener('beforeunload', saveNow)
        document.removeEventListener('visibilitychange', onVisibilityChange)
        unregisterRouterGuard?.()
        unregisterRouterGuard = null
    }

    /** Блокировка на время восстановления: снапшот не перезаписывается промежуточным состоянием */
    const lock = () => {
        isLocked = true
        clearDebounce()
    }

    const unlock = () => {
        isLocked = false
        markSaved()
    }

    return { start, stop, saveNow, markSaved, lock, unlock }
}
