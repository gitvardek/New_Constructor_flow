<script lang="ts" setup>

import { onMounted, onUnmounted, Ref, ref } from "vue";

import ModifyWall from "@/components/popUp/constructor2d/ModifyWall.vue";
import FormLabelRoom from "@/components/popUp/constructor2d/FormLabelRoom.vue";
import WallContextMenu from "@/features/wallContextMenu/WallContextMenu.vue";

import {
  Vector2,
} from "@/types/constructor2d/interfaсes";

import Constructor2D from '@/Constructor2D';

import { loadBlankRoom } from "@/Constructor2D/facade/blankRoom";

import { useSchemeTransition } from "@/store/canvasMerge/schemeTransition";
import { useConstructor2DHistory } from "@/store/constructor2d/useConstructor2DHistory";
// @ts-ignore
import { useEventBus } from "@/store/appliction/useEventBus";
// @ts-ignore
import { useRoomState } from "@/store/appliction/useRoomState";
// @ts-ignore
import { useBasketStore } from "@/store/appStore/useBasketStore";

let schemeTransition = useSchemeTransition();
const constructor2DHistory = useConstructor2DHistory();
const appEventBus = useEventBus();
// root container
let root2d: Ref<HTMLElement | undefined> = ref();
// canvas
let canvas2d: Ref<HTMLCanvasElement | undefined> = ref();

// document.oncontextmenu = document.body.oncontextmenu = function() {return false;};

let App2d: Constructor2D | null = null;

const preventContextMenu = (e: Event) => e.preventDefault();

// Сохраняем ссылку на обработчик события
let dropHandler: ((event: DragEvent) => void) = (event: DragEvent): void => {
  try {
    // Предотвращаем действие по умолчанию при перетаскивании
    event.preventDefault();
    
    // Извлечение данных из перетаскиваемого элемента
    let draggedData = event.dataTransfer?.getData("good");
    
    // Проверяем валидность данных и доступность объекта App2d
    if (!draggedData) {
      console.warn("Нет данных в перетаскиваемом элементе.");
      return;
    }
    if (!App2d) {
      console.error("Объект App2d недоступен.");
      return;
    }
    
    // Получаем координаты мыши при броске
    const pointerPosition: Vector2 = {
      x: event.offsetX,
      y: event.offsetY
    };

    if(App2d){
      if(draggedData === "wall" || draggedData === "wall_vertical" || draggedData === "dividing_wall") {
        // Добавляем стену в слой planner
        App2d.layers.planner?.addWall({
          position: pointerPosition, 
          type: draggedData
        });
      } else if(draggedData === "door" || draggedData === "window") {
        // Добавляем дверь или окно в слой doorsAndWindows
        App2d.layers.doorsAndWindows?.addObject({
          position: pointerPosition,
          type: draggedData
        });
        // Вызываем updateRoomStore после добавления объекта
        // roomId теперь правильно определяется в addObject с fallback через roomId стены
        App2d.updateRoomStore();
      } else {
        console.warn("Неизвестный тип перетаскиваемого объекта:", draggedData);
      }
    }

  } catch (error) {
    console.error("Произошла ошибка в обработчике перетаскивания:", error);
  }
};

const onHistoryPush = () => {
  const data = schemeTransition.getAllData();
  if (data && data.length >= 0) {
    constructor2DHistory.addAction(JSON.parse(JSON.stringify(data)));
  }
};

onMounted(async () => {
  if (root2d.value && canvas2d.value) {

    App2d = new Constructor2D(root2d.value, canvas2d.value);
    await App2d.init();

    if (canvas2d.value) {
      canvas2d.value.addEventListener('contextmenu', preventContextMenu);
    }
    
    // Добавляем обработчик события
    canvas2d.value.addEventListener('drop', dropHandler);

    console.log("!!! App2d:", App2d);
    // @ts-ignore
    window.C2D = App2d; // Сохраняем ссылку на объект App2d в глобальную область видимости
  }

  appEventBus.on("C2D:HistoryPush", onHistoryPush);

    // Безопасное скрытие loader
    // const loader = document.querySelector('#main-loader');
    // if (loader) {
    //   (loader as HTMLElement).style.display = 'none';
    // }
    const rooms = schemeTransition.getAllData();
    if (rooms.length === 0) {
      await loadBlankRoom();
    }

    // Уведомляем, что 2D конструктор готов (для показа кнопок undo/redo в хедере)
    appEventBus.emit("C2D:Ready");
});

onUnmounted(() => {
  try {
    appEventBus.off("C2D:HistoryPush", onHistoryPush);
    if (App2d) {
      // Безопасно уничтожаем объект App2d
      try {
        App2d.destroy();
      } catch (error) {
        console.warn('Ошибка при уничтожении App2d:', error);
      }
      App2d = null;    // Сбрасываем переменную в null
    }

    // Удаляем обработчик события, если он был добавлен
    if (canvas2d.value && dropHandler) {
      try {
        canvas2d.value.removeEventListener('drop', dropHandler);
        canvas2d.value.removeEventListener('contextmenu', preventContextMenu);
      } catch (error) {
        console.warn('Ошибка при удалении обработчиков событий:', error);
      }
    }
  } catch (error) {
    console.error('Ошибка при очистке компонента Constructor2D:', error);
  }
});

</script>

<style lang="scss" setup>
#app2D {
  position: relative;
  display: flex;
  width: 100%;
  overflow: hidden;

  #constructor2D{
    width: 100%;
    height: 100%;
  }
}
</style>

<template>
  <div ref="root2d" id="app2D">
    <canvas ref="canvas2d" id="constructor2D"
      @dragover.prevent @contextmenu.prevent></canvas>
    <ModifyWall />
    <FormLabelRoom />
    <WallContextMenu />
  </div>
</template>