// @ts-nocheck
import { watch } from "vue";
import { useProjectAPI } from "./useProjectAPI";
import { useProjectStore } from "../store/useProjectStore";
import { useSchemeTransition } from "@/store/canvasMerge/schemeTransition";
import { useSceneState } from "@/store/appliction/useSceneState";
import { useRoomState } from "@/store/appliction/useRoomState";
import { useEventBus } from "@/store/appliction/useEventBus";
import { useAppData } from "@/store/appliction/useAppData";
import { useToast } from "@/features/toaster/useToast";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/store/appStore/authStore";
import { ProjectTab } from "../types";

/** Ожидание готовности appData (после getdata) перед загрузкой проекта по ссылке */
function waitForAppDataLoaded(): Promise<void> {
  const appDataStore = useAppData();
  if (appDataStore.isLoaded) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const stop = watch(
      () => appDataStore.isLoaded,
      (loaded) => {
        if (loaded) {
          stop();
          resolve();
        }
      }
    );
  });
}

export function useProjectFromQuery() {
  const router = useRouter();
  const route = useRoute();
  const toaster = useToast();
  const authStore = useAuthStore();

  const loadProject = async (id: string | number): Promise<boolean> => {
    const schemeTransition = useSchemeTransition();
    const projectAPI = useProjectAPI();
    const projectState = useProjectStore();
    const sceneState = useSceneState();
    const roomState = useRoomState();
    const eventBus = useEventBus();

    if (!id) return false;

    const projectData = await projectAPI.loadProject(id.toString());
    if (!projectData) return false;

    projectState.resetState();
    projectState.setInitialState(projectData);

    try {
      schemeTransition.clearStore();
      // Очищаем текущую комнату перед загрузкой нового проекта
      roomState.clearCurrentRoomId();
      
      await sceneState.loadProjectFromData(projectData);
      schemeTransition.setAppData(projectData.rooms);
      
      roomState.routConvertData('/3d')

      projectState.setProjectId(id.toString());

      // Устанавливаем первую комнату как текущую активную
      // Ждем, чтобы комнаты успели загрузиться
      await new Promise(resolve => setTimeout(resolve, 100));
      const rooms = roomState.getRooms;
      if (rooms && rooms.length > 0) {
        // Всегда устанавливаем первую комнату из загруженного проекта
        roomState.setCurrentRoomId(rooms[0].id);
      }

      eventBus.emit("A:ContantLoaded", true);
      toaster.success("Проект загружен");

      window.C2D.layers.planner.init(true);
      window.C2D.layers.doorsAndWindows.init(true);
      return true;
    } catch (error) {
      console.error("Ошибка применения данных проекта:", error);
      return false;
    }
  };

  /**
   * Основная логика проверки query-параметра.
   * Дожидается успешной загрузки getdata (appData), затем загружает проект по projectId из ссылки.
   */
  const accordCheck = async () => {
    const rawId = route.query?.projectId;

    // Если параметр отсутствует — ничего не делаем
    if (!rawId) return;

    const path = route.path;

    // 1. Проверяем — является ли значение числом
    const id = Number(rawId);

    if (Number.isNaN(id)) {
      toaster.error("Невалидный ID");
      router.replace({ path, query: {} });
      return;
    }

    // 2. Дожидаемся готовности appData (getdata завершён) — важно при переходе по ссылке из неавторизованной сессии
    await waitForAppDataLoaded();

    // 3. Загружаем проект по id
    const isLoaded = await loadProject(id);
    if (!isLoaded) {
      toaster.error("Проект не найден или ссылка невалидна");
      router.replace({ path, query: {} });
      return;
    }
  };

  return {
    accordCheck,
  };
}
