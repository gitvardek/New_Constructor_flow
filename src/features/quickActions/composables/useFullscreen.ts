import { readonly, ref } from 'vue';

/** Состояние полноэкранного режима: общее на модуль и обновляется само —
 *  выйти можно не только кнопкой, но и Esc/F11 */
const isFullscreen = ref<boolean>(false);

const FULLSCREEN_EVENTS = [
  'fullscreenchange',
  'webkitfullscreenchange',
  'mozfullscreenchange',
  'MSFullscreenChange',
];

const syncFullscreenState = () => {
  const anyDoc = document as any;
  isFullscreen.value = Boolean(
    document.fullscreenElement ||
    anyDoc.webkitFullscreenElement ||
    anyDoc.mozFullScreenElement ||
    anyDoc.msFullscreenElement
  );
};

if (typeof document !== 'undefined') {
  FULLSCREEN_EVENTS.forEach(event =>
    document.addEventListener(event, syncFullscreenState, false)
  );
  syncFullscreenState();
}

export const useFullscreen = () => {
  const enterFullscreen = async (_element?: HTMLElement) => {
    const element = document.documentElement;
    const anyElement = element as any;
    if (anyElement.requestFullscreen) return anyElement.requestFullscreen();
    if (anyElement.webkitRequestFullscreen) return anyElement.webkitRequestFullscreen();
    if (anyElement.mozRequestFullScreen) return anyElement.mozRequestFullScreen();
    if (anyElement.msRequestFullscreen) return anyElement.msRequestFullscreen();
  };

  const exitFullscreen = async () => {
    const anyDoc = document as any;
    if (document.exitFullscreen) return document.exitFullscreen();
    if (anyDoc.webkitExitFullscreen) return anyDoc.webkitExitFullscreen();
    if (anyDoc.mozCancelFullScreen) return anyDoc.mozCancelFullScreen();
    if (anyDoc.msExitFullscreen) return anyDoc.msExitFullscreen();
  };

  const toggleFullscreen = async (_element?: HTMLElement) => {
    if (!document.fullscreenElement) {
      await enterFullscreen();
    } else {
      await exitFullscreen();
    }
    syncFullscreenState();
  };

  return {
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
    isFullscreen: readonly(isFullscreen),
  };
};
