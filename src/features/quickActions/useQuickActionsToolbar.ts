import {  ref } from 'vue';
import { usePopupStore } from '@/store/appStore/popUpsStore';
import { useEventBus } from '@/store/appliction/useEventBus';
import { useMenuStore } from "@/store/appStore/useMenuStore";
import { useRouter } from 'vue-router';
import { useToast } from "@/features/toaster/useToast";
import { useSceneState } from '@/store/appliction/useSceneState';

import { useFullscreen } from '@/features/quickActions/composables/useFullscreen';
import { usePrint } from '@/features/quickActions/composables/usePrint';
import { use2DScreenshot } from './composables/use2DScreenshot';

import { useProjectAPI } from './project/composables/useProjectAPI';
import { useProjectStore } from './project/store/useProjectStore';
import { useRoomState } from '@/store/appliction/useRoomState';
import { useSchemeTransition } from '@/store/canvasMerge/schemeTransition';
import { useConstructor2DHistory } from '@/store/constructor2d/useConstructor2DHistory';

export type ActionKey =
  | 'fullscreen'
  | 'report'
  | 'study'
  | 'print'
  | 'screenshot'
  | 'managerProject'
  | 'saveProject'
  | 'drowmod'
  | 'ruller'
  | 'screenshot3d'
  | 'newProject'
  | 'technologist';

export interface QuickActionItem {
  key: ActionKey;
  tooltip: string;
  iconClass: string;
  iconSrc?: string;
  path?: string
  action: () => void | Promise<void>;
}

export const useQuickActionsToolbar = () => {
  const popupStore = usePopupStore();
  const eventBus = useEventBus();
  const menuStore = useMenuStore();
  const router = useRouter();
  const toaster = useToast();
  const sceneState = useSceneState();
  const roomState = useRoomState()
  const schemeTransition = useSchemeTransition();
  const constructor2DHistory = useConstructor2DHistory();

  const projectState = useProjectStore();
  const projectAPI = useProjectAPI()

  const { toggleFullscreen } = useFullscreen();
  const { printPage } = usePrint();
  const { makeScreen } = use2DScreenshot();

  // Реф для функции открытия модального окна ввода имени проекта
  const openSaveDialog = ref<(() => void) | null>(null);
  // Реф для функции открытия модального окна выбора действия при сохранении существующего проекта
  const openUpdateDialog = ref<(() => void) | null>(null);
  // Реф для прямого открытия сценария "Сохранить как новый проект" (без выбора в модалке)
  const openSaveAsNewDialog = ref<(() => void) | null>(null);

  // Функция открытия модального окна для сохранения проекта
  const onSaveProject = async () => {
    // При нажатии на кнопку сохранения всегда срабатывает сценарий "Сохранить как новый проект"
    if (projectState.currentProjectId && openSaveAsNewDialog.value) {
      projectState.isSaving = false;
      openSaveAsNewDialog.value();
      return;
    }
    // Закомментировано: выбор между "Обновить" и "Сохранить как новый" через модалку Update
    // if (projectState.currentProjectId) {
    //   projectState.isSaving = false;
    //   if (openUpdateDialog.value) openUpdateDialog.value();
    //   return;
    // }

    // Иначе — это новый проект: скрываем лоадер и открываем модальное окно для ввода имени
    projectState.isSaving = false;
    if (openSaveDialog.value) openSaveDialog.value();
  }

  // Обновление уже существующего проекта (прежняя логика сохранения по ID)
  const updateExistingProject = async () => {
    if (!projectState.currentProjectId) return;

    console.log(projectState.currentProjectId, 'currentProjectId');
    projectState.isSaving = true;

    try {
      const result = await projectAPI.saveProject(projectState.currentProjectId);
      if (result.success) {
        if (result.data?.ID) projectState.setProjectId(result.data.ID);
        projectState.updateAfterSave();
        const roomsData = schemeTransition.getAllData() ?? [];
        if (roomsData.length > 0) {
          constructor2DHistory.clearHistory(JSON.parse(JSON.stringify(roomsData)));
        }
        toaster.success("Сохранено");
      } else {
        console.error("❌ Ошибка сохранения:", result.error);
        toaster.error("Ошибка сохранения проекта");
      }
    } catch (error) {
      console.error("❌ Исключение при сохранении:", error);
      toaster.error("Ошибка сохранения проекта");
    } finally {
      projectState.isSaving = false;
    }
  }

  // Обработка подтверждения сохранения с названием проекта
  const handleSaveConfirm = async (projectName: string, onSuccess?: () => void, kpFlag: boolean = false) => {
    if (!projectName.trim()) {
      toaster.error("Введите название проекта");
      return false;
    }

    projectState.isSaving = true;

    try {
      // Обновляем название проекта перед сохранением
      sceneState.updateProjectParams({ project_name: projectName as any });

      const result = await projectAPI.saveProject(projectState.currentProjectId, projectName, kpFlag);

      if (result.success) {
        // SaveProject всегда создаёт новый проект — обновляем текущий ID на только что сохранённый
        if (result.data?.ID) projectState.setProjectId(result.data.ID);
        console.log(result.data?.kp);
        projectState.updateAfterSave();
        const roomsData = schemeTransition.getAllData() ?? [];
        if (roomsData.length > 0) {
          constructor2DHistory.clearHistory(JSON.parse(JSON.stringify(roomsData)));
        }
        toaster.success("Сохранено");
        
        // Вызываем callback при успешном сохранении
        if (onSuccess) {
          onSuccess();
        }
        return { success: true, kp: result.data.kp || null };
      } else {
        console.error("❌ Ошибка сохранения:", result.error);
        toaster.error("Ошибка сохранения проекта");
        return { success: false, kp: null };
      }
    } catch (error) {
      console.error("❌ Исключение при сохранении:", error);
      toaster.error("Ошибка сохранения проекта");
      return { success: false, kp: null };
    } finally {
      projectState.isSaving = false;
    }
  }

  // Функция режима чертежа
  const toggleDrowMode = async () => {
    await menuStore.toggleDrowModeValue();
    const value = menuStore.getDrowModeValue
    eventBus.emit("A:DrawingMode", value);
  };

  // Функция отображения линейки
  const toggleRulerVisibility = async () => {
    await menuStore.toggleRulerVisibility();
    const value = menuStore.getRulerVisibility
    eventBus.emit("A:ToggleRulerVisibility", value);
  };


  const actions: QuickActionItem[] = [
    {
      key: 'fullscreen',
      tooltip: 'На весь экран',
      iconClass: 'icon-centered',
      path: 'default',
      action: () => {
        toggleFullscreen()
      }
    },
    {
      key: 'drowmod',
      tooltip: 'Режим чертежа',
      iconClass: 'icon-show',
      path: '/3d',
      action: () => toggleDrowMode(),
    },

    {
      key: 'ruller',
      tooltip: 'Отображение линейки',
      iconClass: 'icon-ruler',
      path: '/3d',
      action: () => toggleRulerVisibility(),
    },

    {
      key: 'report',
      tooltip: 'Сообщить об ошибке',
      iconClass: 'icon-alert',
      path: 'default',
      action: () => popupStore.openPopup('error'),
    },
    {
      key: 'study',
      tooltip: 'Обучение',
      iconClass: 'icon-lern',
      path: 'default',
      action: () => popupStore.openPopup('study'),
    },
    {
      key: 'print',
      tooltip: 'Печать',
      iconClass: 'icon-print',
      path: 'default',
      action: async () => {
        projectState.isSaving = true;
        if (router.currentRoute.value.path !== '/3d') {
          await router.push('/3d');
        }
        eventBus.emit('A:Save')
        roomState.routConvertData('/2d');
        eventBus.emit("A:ScreenPrint")

        const handleComplete = () => {
          eventBus.off("A:3DScreenshotCreated", handleComplete);
          printPage();
          
        projectState.isSaving = false;
        }

        eventBus.on("A:3DScreenshotCreated", handleComplete);
      },
    },
    {
      key: 'screenshot',
      tooltip: 'Скриншот',
      iconClass: 'icon-zoom',
      path: '/2d',
      action: () => makeScreen(),
    },
    {
      key: 'screenshot3d',
      tooltip: '3D Скриншот',
      iconClass: 'icon-zoom',
      path: '/3d',
      action: () => eventBus.emit("A:Take3DScreenshot"),
    },
    {
      key: 'saveProject',
      tooltip: 'Сохранить',
      iconClass: 'icon-save',
      path: 'default',
      action: async () => {
        projectState.isSaving = true
        if (router.currentRoute.value.path !== '/3d') {
          await router.push('/3d');
        }
        setTimeout(() => {
          eventBus.emit('A:Save')
          onSaveProject()
        }, 2000)
      },
    },
    {
      key: 'managerProject',
      tooltip: 'Менеджер проектов',
      iconClass: 'icon-folder',
      // iconSrc: 'folder',
      path: 'default',
      action: () => popupStore.openPopup('project'),
    },
    {
      key: 'newProject',
      tooltip: 'Новый проект',
      iconClass: 'icon-add',
      path: 'default',
      action: () => {
        popupStore.openProjectParamsPopup();
      },
    },
    {
      key: 'technologist',
      tooltip: 'Технолог',
      iconClass: 'icon-book',
      // iconSrc: 'book',
      path: 'default',
      action: () => popupStore.openPopup('technologist'),
    },
  ];

  return { 
    actions,
    openSaveDialog,
    openUpdateDialog,
    openSaveAsNewDialog,
    handleSaveConfirm,
    updateExistingProject
  };
}; 