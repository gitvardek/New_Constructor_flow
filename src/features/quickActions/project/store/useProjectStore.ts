import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSceneState } from '@/store/appliction/useSceneState'
import { useEventBus } from '@/store/appliction/useEventBus'

export const useProjectStore = defineStore('project', () => {
  const sceneState = useSceneState()
  const eventBus = useEventBus()
  
  const currentProjectId = ref<string | null>(null)
  const initialProjectState = ref<any>(null)
  const isSaving = ref(false)

  // Проверяем, является ли текущий проект новым
  const isNewProject = computed(() => {
    return !currentProjectId.value
  })

  // Устанавливаем ID проекта
  const setProjectId = (id: string | null) => {
    currentProjectId.value = id
  }

  const getProjectId = () => {
    return currentProjectId.value
  }

  // Сохраняем начальное состояние
  const setInitialState = (state: any) => {
    initialProjectState.value = JSON.parse(JSON.stringify(state))
  }

  // Сбрасываем состояние
  const resetState = () => {
    currentProjectId.value = null
    initialProjectState.value = null
    isSaving.value = false
  }

  // Обновляем состояние после сохранения
  const updateAfterSave = () => {
    const currentState = sceneState.getCurrentProjectParams
    setInitialState(currentState)
  }

  // Слушаем события сохранения
  eventBus.on('A:Save', () => {
    // После сохранения сцены в браузере обновляем начальное состояние
    setTimeout(() => {
      updateAfterSave()
    }, 100)
  })

  return {
    currentProjectId,
    initialProjectState,
    isSaving,
    isNewProject,
    getProjectId,
    setProjectId,
    setInitialState,
    resetState,
    updateAfterSave
  }
}) 