import { useRouter } from 'vue-router';
import { useSceneState } from '@/store/appliction/useSceneState';
import { useRoomState } from '@/store/appliction/useRoomState';
import { useSchemeTransition } from '@/store/canvasMerge/schemeTransition';
import { useProjectStore } from '@/features/quickActions/project/store/useProjectStore';
import { useBasketStore } from '@/store/appStore/useBasketStore';
import { useRoomContantData } from '@/store/appliction/useRoomContantData';
import { loadBlankRoom, buildProjectFromWallWidths } from '@/Constructor2D/facade/blankRoom';
import { useAutosave, useAutosaveStorage } from '@/features/autosave';

export type NewProjectWallWidths = {
  right: number;
  left: number;
  bottom: number;
  top: number;
};

const DEFAULT_WALL_WIDTH = 3000;

/**
 * Функционал кнопки «Новый проект»: переход на /2d, очистка сторов и слоёв, загрузка blank room.
 * Если переданы widths — комната строится по заданным ширинам стен (прямоугольник).
 */
export const useNewProjectAction = () => {
  const router = useRouter();
  const sceneState = useSceneState();
  const roomState = useRoomState();
  const schemeTransition = useSchemeTransition();
  const projectState = useProjectStore();
  const autosaveStorage = useAutosaveStorage();
  const autosave = useAutosave();

  const runNewProject = async (widths?: NewProjectWallWidths | null) => {
    // Прежний снапшот относится к брошенному проекту, предлагать его больше незачем
    autosaveStorage.remove();

    if (router.currentRoute.value.path !== '/2d') {
      await router.push('/2d');
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
    schemeTransition.clearStore();
    sceneState.createNewProject();
    roomState.rooms = [];
    roomState.clearCurrentRoomId();
    projectState.resetState();
    useBasketStore().clearBasket();
    useRoomContantData().setRoomContantDataForBasket({});
    try {
      const c2d = (window as any).C2D;
      if (c2d?.layers) {
        c2d.layers.planner?.clear();
        c2d.layers.doorsAndWindows?.clear();
        c2d.layers.dimensionDisplay?.clearAll();
        c2d.layers.arrowRulerActiveObject?.clearGraphic();
        c2d.layers.startPointActiveObject?.activate(false);
      }
    } catch (error) {
      console.warn('Ошибка при очистке слоев C2D:', error);
    }

    const projectData = widths
      ? buildProjectFromWallWidths(
          widths.right,
          widths.left,
          widths.bottom,
          widths.top
        )
      : undefined;
    await loadBlankRoom(projectData);
    // Снапшот после первых правок
    autosave.markSaved();
  };

  return { runNewProject, DEFAULT_WALL_WIDTH };
};
