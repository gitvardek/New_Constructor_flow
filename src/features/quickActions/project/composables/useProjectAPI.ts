import { ref } from 'vue'
import { useEventBus } from '@/store/appliction/useEventBus'
import { useSceneState } from '@/store/appliction/useSceneState'
import { Project, SaveProjectResult } from '../types'
import { REQUEST_CONSTANTS, ERROR_MESSAGES } from '../constants'
import { client } from '@/api/api'
import { useBasketStore } from '@/store/appStore/useBasketStore'
import { useTechnologistStorage } from "@/store/appStore/technologist/useTechnologistStorage.ts";
import { useRoomOptions } from '@/components/left-menu/option/roomOptions/useRoomOptons'

export interface LoadProjectsParams {
  designerValue: string
  name?: string
  id?: number
  dateFrom?: string
  dateTo?: string
  elementsOnPage: number
  currentPage: number
  readySolutions?: boolean
}

/** Результат загрузки списка проектов: элементы текущей страницы и общее количество с сервера */
export interface LoadProjectsResult {
  items: Project[]
  totalElements: number
}

export function useProjectAPI() {
  const eventBus = useEventBus()
  const sceneState = useSceneState()
  const isLoading = ref(false)
  const technologistStorage = useTechnologistStorage();
  const { saveSceneParams } = useRoomOptions()

  // Дебаунс для запросов
  let loadTimeout: NodeJS.Timeout | null = null

  // Нормалайзер ответа от API клиента
  const normalizeApiResponse = <T = any>(response: { data?: any; deal?: any; error?: any; response?: Response }): { success: boolean; data?: T; deal?: T; error?: string } => {
    // Проверяем наличие ошибки
    if (response.error) {
      return {
        success: false,
        error: response.error instanceof Error ? response.error.message : 'Unknown error'
      }
    }

    // Проверяем наличие данных
    if (!response.data) {
      return {
        success: false,
        error: 'No data in response'
      }
    }

    // Проверяем структуру ответа API
    const apiData = response.data
    if (apiData.CODE !== 200) {
      return {
        success: false,
        error: apiData.MESSAGE || 'Unknown API error'
      }
    }

    // Возвращаем успешный результат с данными
    return {
      success: true,
      data: apiData.DATA
    }
  }

  // Валидация данных проекта
  const validateProjectData = (data: any): boolean => {
    if (!data || typeof data !== 'object') return false
    if (!data.rooms || !Array.isArray(data.rooms)) return false
    return true
  }

  // Генерация скриншота 3D сцены в base64 (аналогично take3DScreenshot из The3D.vue)
  const getProjectScreenshot = async (): Promise<string> => {
    return new Promise((resolve) => {
      // Небольшая задержка для обеспечения готовности рендерера
      setTimeout(() => {
        // Ищем все canvas элементы и находим тот, который имеет WebGL контекст
        const canvases = document.querySelectorAll('canvas')
        let webglCanvas: HTMLCanvasElement | null = null

        for (const canvas of canvases) {
          const context = canvas.getContext('webgl') || canvas.getContext('webgl2')
          // Проверяем что это WebGL canvas и он достаточно большой (3D сцена обычно большая)
          if (context && canvas.width > 100 && canvas.height > 100) {
            webglCanvas = canvas
            break
          }
        }

        if (!webglCanvas) {
          console.warn('WebGL canvas не найден для скриншота проекта')
          resolve('data:image/jpeg;base64,')
          return
        }

        try {
          // Используем toBlob как в take3DScreenshot (строки 544-552 из The3D.vue), но преобразуем в base64
          webglCanvas.toBlob((blob: Blob | null) => {
            if (blob) {
              const reader = new FileReader()
              reader.onloadend = () => {
                const base64 = reader.result as string
                resolve(base64 || 'data:image/jpeg;base64,')
              }
              reader.onerror = () => {
                console.error('Ошибка при чтении blob для скриншота')
                resolve('data:image/jpeg;base64,')
              }
              reader.readAsDataURL(blob)
            } else {
              console.warn('Не удалось создать blob для скриншота')
              resolve('data:image/jpeg;base64,')
            }
          }, 'image/jpeg', 0.8)
        } catch (error) {
          console.error('Ошибка при создании скриншота проекта:', error)
          resolve('data:image/jpeg;base64,')
        }
      }, 100) // Небольшая задержка для готовности рендерера
    })
  }

  // Загрузка списка проектов с дебаунсом (серверная пагинация)
  const loadProjects = async (params: LoadProjectsParams, delay: number = 300): Promise<LoadProjectsResult> => {
    if (loadTimeout) {
      clearTimeout(loadTimeout)
    }

    return new Promise((resolve) => {
      loadTimeout = setTimeout(async () => {
        isLoading.value = true

        try {
          const filter: Record<string, string | number | boolean> = {
            designer: params.designerValue
          }
          if (params.id != null && !isNaN(params.id) && params.id > 0) {
            filter.id = params.id
          }
          if (params.name != null && params.name !== '') {
            filter.name = params.name
          }
          if (params.dateFrom) {
            filter.dateFrom = params.dateFrom
          }
          if (params.dateTo) {
            filter.dateTo = params.dateTo
          }
          if (params.readySolutions != null) {
            filter.readySolutions = params.readySolutions
          }

          const requestBody = {
            filter,
            pager: {
              elementsOnPage: params.elementsOnPage,
              currentPage: params.currentPage
            }
          }

          const response = await client.POST('/api/modeller/projectq/getprojectlist/', {
            body: requestBody
          })

          const normalized = normalizeApiResponse<{
            data?: { items?: Project[]; pager?: { totalElements?: string | number } }
          }>(response)

          if (normalized.success && normalized.data?.data?.items) {
            const items = normalized.data.data.items
            const pager = normalized.data.data.pager
            const totalElements =
              pager?.totalElements != null
                ? typeof pager.totalElements === 'string'
                  ? parseInt(pager.totalElements, 10) || 0
                  : pager.totalElements
                : items.length
            resolve({ items, totalElements })
          } else {
            resolve({ items: [], totalElements: 0 })
          }
        } catch (error) {
          console.error(ERROR_MESSAGES.LOAD_PROJECTS, error)
          resolve({ items: [], totalElements: 0 })
        } finally {
          isLoading.value = false
        }
      }, delay)
    })
  }

  // Загрузка проекта по ID
  const loadProject = async (id: string): Promise<any> => {
    if (!id) {
      console.error(ERROR_MESSAGES.MISSING_PROJECT_ID)
      return null
    }

    try {
      const response = await client.POST('/api/modeller/projectq/getprojectbyid/', {
        body: { id }
      })

      const normalized = normalizeApiResponse<{
        deal?: any;
        data?: any
      }>(response)

      if (normalized.success && normalized.data?.data) {
        const projectData = normalized.data.data
        const deal = normalized.data.deal

        if (validateProjectData(projectData)) {
          if (deal)
            technologistStorage.setDeal(deal)
          else
            technologistStorage.setDeal()

          if (deal.techProject == 1)
            technologistStorage.setTechnologistProject(true)
          else
            technologistStorage.setTechnologistProject(false)

          return projectData
        } else {
          console.error(ERROR_MESSAGES.INVALID_PROJECT_DATA)
          technologistStorage.setTechnologistProject(false)
          technologistStorage.setDeal()
          return null
        }
      }
      return null

    } catch (error) {
      console.error(ERROR_MESSAGES.LOAD_PROJECT, error)
      technologistStorage.setTechnologistProject(false)
      technologistStorage.setDeal()
      return null
    }
  }

  const deleteProject = async (projectId: number): Promise<{ success: boolean; error?: string }> => {
    if (!projectId) {
      return { success: false, error: ERROR_MESSAGES.MISSING_PROJECT_ID }
    }
    try {
      const response = await (client as any).POST(`/api/modeller/projectq/${projectId}`, {
        body: {}
      })
      const normalized = normalizeApiResponse<{ data?: any }>(response)
      if (normalized.success) {
        return { success: true }
      }
      return { success: false, error: normalized.error || ERROR_MESSAGES.DELETE_PROJECT }
    } catch (error) {
      console.error(ERROR_MESSAGES.DELETE_PROJECT, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : ERROR_MESSAGES.DELETE_PROJECT
      }
    }
  }

  // Сохранение проекта
  const saveProject = async (incomeProjectId: string | null = null, projectName?: string, kpFlag: boolean = false, _manualNewProject?: boolean): Promise<SaveProjectResult> => {
    try {
      // Сначала сохраняем сцену в браузер
      eventBus.emit('A:Save')

      // const projectData = sceneState.getCurrentProjectParams
      // resetGlobalOptions()

      const projectData = saveSceneParams() ?? sceneState.getCurrentProjectParams
      console.log(projectData, 'projectData', sceneState.getCurrentProjectParams, 'getCurrentProjectParams')

      // Если передан projectName, обновляем его перед сохранением
      if (projectName) {
        (projectData as any).project_name = projectName
      }

      // Валидируем данные перед отправкой
      if (!validateProjectData(projectData)) {
        throw new Error(ERROR_MESSAGES.INVALID_PROJECT_DATA)
      }

      // Генерируем скриншот проекта для нового проекта
      let screenshotBase64 = 'data:image/jpeg;base64,'
      const parentProjectId = incomeProjectId ?? projectData.projectId ?? null
      screenshotBase64 = await getProjectScreenshot()

      // Всегда создаём новый проект через SaveProject (updateprojectbyid не используется)
      const tempProjectId = Date.now().toString()
      projectData.projectId = tempProjectId

      const basketData = kpFlag ? await useBasketStore().syncBasket() : null
      const response = await client.POST('/api/modeller/projectq/SaveProject/', {
        body: {
          data: {
            file: screenshotBase64,
            provider: REQUEST_CONSTANTS.PROVIDER,
            name: projectData.project_name || 'Новый проект',
            user_hash: REQUEST_CONSTANTS.USER_HASH,
            city: REQUEST_CONSTANTS.CITY,
            project: projectData,
            style: REQUEST_CONSTANTS.STYLE,
            projectId: tempProjectId,
            parentProjectId: parentProjectId,
            user_id: REQUEST_CONSTANTS.USER_ID,
            ...(kpFlag && basketData && { basket: basketData }),
            ...(kpFlag && { kp: kpFlag })
          }
        }
      })

      const normalized = normalizeApiResponse<{ data?: any }>(response)

      if (normalized.success) {
        return { success: true, data: normalized.data?.data || normalized.data }
      } else {
        throw new Error(normalized.error || 'Unknown error')
      }
    } catch (error) {
      console.error(ERROR_MESSAGES.SAVE_PROJECT, error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  return {
    isLoading,
    loadProjects,
    loadProject,
    saveProject,
    deleteProject,
    getProjectScreenshot
  }
}
