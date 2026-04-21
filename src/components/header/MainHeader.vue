<script setup lang="ts">
//@ts-nocheck
import {
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
  ref,
  computed,
} from "vue";
import { useRoute } from "vue-router";
import { useEventBus } from "@/store/appliction/useEventBus";
import { useSceneState } from "@/store/appliction/useSceneState";
import { useMenuStore } from "@/store/appStore/useMenuStore";
import { useRoomState } from "@/store/appliction/useRoomState";
import { useModelState } from "@/store/appliction/useModelState";
import { useCustomiserStore } from "@/store/appStore/useCustomiserStore";
import { useRoomOptions } from "../left-menu/option/roomOptions/useRoomOptons";
import { useSchemeTransition } from "@/store/canvasMerge/schemeTransition";
import { useConstructor2DHistory } from "@/store/constructor2d/useConstructor2DHistory";
import { TApplication } from "@/types/types";
import { getBlankRoomTemplate } from "@/Constructor2D/facade/blankRoom";

import {
  postRequest,
  _POST_URL,
  _GET_URL,
  _GET_PROJECT,
  _UPDATE_PROJECT,
} from "@/types/constants";

import Modal from "../ui/modals/Modal.vue";
import InputDialog from "../ui/inputs/InputDialog.vue";
import MainButton from "../ui/buttons/MainButton.vue";

import LeftLightHeaderButton from "@/components/ui/buttons/header/LeftLightHeaderButton.vue";
import RightLightHeaderButton from "@/components/ui/buttons/header/RightLightHeaderButton.vue";
import S2DLightHeaderButton from "@/components/ui/buttons/header/S2DLightHeaderButton.vue";
import S3DLightHeaderButton from "@/components/ui/buttons/header/S3DLightHeaderButton.vue";

import AddLightHeaderButton from "@/components/ui/buttons/header/AddLightHeaderButton.vue";
import BuyBasketButton from "@/components/ui/buttons/header/BuyBasketButton.vue";

import { QuickActionsToolbar } from "@/features/quickActions";
import AddPhotoHelperButton from "@/components/ui/buttons/header/helpers/AddPhotoHelperButton.vue";
import GetAppHelperButton from "@/components/ui/buttons/header/helpers/GetAppHelperButton.vue";
import VisibilityHelperButton from "@/components/ui/buttons/header/helpers/VisibilityHelperButton.vue";

const props = defineProps(["pageComponent"]);
const route = useRoute();
import Avatar from "@/components/ui/avatar/Avatar.vue";
import { useBasketStore } from "@/store/appStore/useBasketStore";

const historyActions = ref<boolean>(false);
const verdekConstructor = ref<TApplication | null>(null);
const inputDialogRef = ref<InstanceType<typeof Modal> | null>(null);
const restorLength = ref<number>(0);
const curActionCount = ref<number>(0);
const contentLoaded = ref<boolean>(true);
const drowModeValue = ref<boolean>(false);
const rulerVisibility = ref<boolean>(true);

const eventBus = useEventBus();
const sceneState = useSceneState();
const menuStore = useMenuStore();
const roomState = useRoomState();
const modelState = useModelState();
const roomOptions = useRoomOptions();
const customiserStore = useCustomiserStore();
const schemeTransition = useSchemeTransition();
const constructor2DHistory = useConstructor2DHistory();

// const _saveProject = async () => {
//   eventBus.emit("A:Save");
//   const project = sceneState.getCurrentProjectParams;
//   const data = {
//     user_hash: "08a57654db94bdcfe44a9ee10b2f0778",
//     city: 17281,
//     designer: "14240",
//     page: 1,
//     config: 43830,
//     type: "user",
//   };

//   await postRequest(`${_GET_URL}`, data);

//   // if (historyActions.value) eventBus.emit("A:Save");
// };

// const saveProject = async () => {
//   eventBus.emit("A:Save");
//   return;
//   const project = sceneState.getCurrentProjectParams;
//   const data = {
//     data: {
//       file: "data:image/jpeg;base64,",
//       provider: "vardek",
//       name: "test_new_constructor",
//       user_hash: "08a57654db94bdcfe44a9ee10b2f0778",
//       city: 17281,
//       project: project,
//       style: "689680",
//       projectId: Date.now().toString(),
//       user_id: "14240",
//     },
//   };

//   await postRequest(`${_POST_URL}`, data);

//   // if (historyActions.value) eventBus.emit("A:Save");
// };

// const drowMode = async () => {
//   drowModeValue.value = !drowModeValue.value;
//   menuStore.setDrowModeValue(drowModeValue.value);
//   eventBus.emit("A:DrawingMode", drowModeValue.value);
// };

// const toggleRulerVisibility = async () => {
//   rulerVisibility.value = !rulerVisibility.value;
//   menuStore.setRulerVisibility(rulerVisibility.value);
//   eventBus.emit("A:ToggleRulerVisibility", rulerVisibility.value);
// };

// const loadProject = async () => {
//   // return;
//   const data = {
//     id: "11487677",
//   };
//   await postRequest(`${_GET_PROJECT}`, data);
// };

// const updateProject = async () => {
//   const project = sceneState.getCurrentProjectParams;
//   const data = {
//     id: "11323197",
//     project: project,
//   };

//   const resp = await postRequest(`${_UPDATE_PROJECT}`, data);
// };

const createNewRoom = (value: string) => {
  // 2D: создаем новую комнату на основе шаблона blankroom
  if (route.path === "/2d") {
    const roomId = Date.now().toString();
    const template = getBlankRoomTemplate();
    const label =
      value || template.label || `Комната ${roomState.getRooms.length + 1}`;

    roomState.addRoom({
      id: roomId,
      label,
      description: template.description || "",
      params: template.params,
      content: template.content,
      basket: JSON.stringify({
        scene: [],
        catalog: [],
      }),
    });

    roomState.setCurrentRoomId(roomId);

    // Обновляем данные для 2D‑конструктора
    roomState.routConvertData("/2d");

    // Переинициализируем C2D, если он уже загружен
    const c2d = window.C2D;
    if (c2d?.layers?.planner && c2d?.layers?.doorsAndWindows) {
      c2d.layers.planner.init(true);
      c2d.layers.doorsAndWindows.init(true);
    }

    // Сохраняем снимок в историю undo/redo (явно, после обновления schemeTransition)
    nextTick(() => {
      const snapshot = schemeTransition.getAllData();
      if (snapshot && Array.isArray(snapshot)) {
        constructor2DHistory.addAction(JSON.parse(JSON.stringify(snapshot)));
      }
    });

    return;
  }

  // 3D: старая логика
  if (!verdekConstructor.value) return;
  if (props.pageComponent?.selected) {
    props.pageComponent.selected();
  }
  roomOptions.resetGlobalOptions();

  menuStore.setRulerVisibility(true);
  menuStore.setDrowModeValue(false);

  eventBus.emit("A:Create", value);
  restorLength.value = 0;
  curActionCount.value = 0;
};

const checkContantLoad = (state: boolean) => {
  contentLoaded.value = state;
};

const moreThenActions = computed(() => {
  if (route.path === "/2d") return !constructor2DHistory.canRedo;
  return (
    curActionCount.value + 1 > restorLength.value || restorLength.value == 0
  );
});

const lessThenActions = computed(() => {
  if (route.path === "/2d") return !constructor2DHistory.canUndo;
  return curActionCount.value - 1 < 0;
});

const prevAction = async () => {
  if (!historyActions.value) return;
  try {
    if (route.path === "/2d") {
      const snapshot = constructor2DHistory.undo();
      if (
        snapshot &&
        window.C2D?.layers?.planner &&
        window.C2D?.layers?.doorsAndWindows
      ) {
        constructor2DHistory.setRestoring(true);
        schemeTransition.setAppData(snapshot);
        roomState.convertDataTo3DConstuctor(); // синхронизируем roomState.rooms из schemeTransition
        setCurrentRoomAfterRestore(snapshot);
        window.C2D.layers.planner.init(true);
        window.C2D.layers.doorsAndWindows.init(true);
        constructor2DHistory.setRestoring(false);
        curActionCount.value = constructor2DHistory.currentIndex;
        props.pageComponent?.selected?.();
      }
      return;
    }
    if (verdekConstructor.value) {
      contentLoaded.value = false;
      await roomState.setLoad(false);
      await nextTick();
      setTimeout(() => {
        eventBus.emit("A:PrevAction");
        curActionCount.value =
          verdekConstructor.value.userHistory._currentIndex;
        props.pageComponent.selected();
        customiserStore.hideCustomiserPopup();
      }, 0);
    }
  } catch (error) {
    console.error("Ошибка при выполнении prevAction:", error);
  }
};

const nextAction = async () => {
  if (!historyActions.value) return;
  try {
    if (route.path === "/2d") {
      const snapshot = constructor2DHistory.redo();
      if (
        snapshot &&
        window.C2D?.layers?.planner &&
        window.C2D?.layers?.doorsAndWindows
      ) {
        constructor2DHistory.setRestoring(true);
        schemeTransition.setAppData(snapshot);
        roomState.convertDataTo3DConstuctor(); // синхронизируем roomState.rooms из schemeTransition
        setCurrentRoomAfterRestore(snapshot);
        window.C2D.layers.planner.init(true);
        window.C2D.layers.doorsAndWindows.init(true);
        constructor2DHistory.setRestoring(false);
        curActionCount.value = constructor2DHistory.currentIndex;
        props.pageComponent?.selected?.();
      }
      return;
    }
    if (verdekConstructor.value) {
      contentLoaded.value = false;
      await roomState.setLoad(false);
      await nextTick();
      setTimeout(() => {
        eventBus.emit("A:NextAction");
        curActionCount.value =
          verdekConstructor.value.userHistory._currentIndex;
        props.pageComponent.selected();
        customiserStore.hideCustomiserPopup();
      }, 0);
    }
  } catch (error) {
    console.error("Ошибка при выполнении nextAction:", error);
  }
};

/** После undo/redo выбирает текущую комнату: оставляет текущую, если она есть в снимке, иначе — первую из снимка */
const setCurrentRoomAfterRestore = (snapshot: Record<string, unknown>[]) => {
  if (!snapshot?.length) return;
  const normalizeId = (v: string | number | null | undefined) =>
    v !== null && v !== undefined ? String(v) : "";
  const snapshotIds = new Set(
    snapshot.map((r) => normalizeId((r as { id?: string | number }).id)),
  );
  const currentId = normalizeId(roomState.getRoomId);
  if (snapshotIds.has(currentId)) return;
  const firstRoom = snapshot[0] as { id?: string | number };
  if (firstRoom?.id != null) {
    roomState.setCurrentRoomId(firstRoom.id);
  }
};

const init2DHistoryAndActions = () => {
  const c2d = window.C2D;
  if (!c2d?.layers?.planner || !c2d?.layers?.doorsAndWindows) return;
  const roomsData = schemeTransition.getAllData() ?? [];
  if (roomsData.length > 0) {
    c2d.layers.planner.init(true);
    c2d.layers.doorsAndWindows.init(true);
  }
  if (constructor2DHistory.historyLength === 0 && roomsData.length > 0) {
    constructor2DHistory.clearHistory(JSON.parse(JSON.stringify(roomsData)));
  }
  historyActions.value = true;
  restorLength.value = Math.max(0, constructor2DHistory.historyLength - 1);
  curActionCount.value = constructor2DHistory.currentIndex;
};

const onC2DReady = () => {
  if (route.path === "/2d") {
    init2DHistoryAndActions();
  }
};

onMounted(() => {
  eventBus.on("C2D:Ready", onC2DReady);
});

const addEvents3D = () => {
  try {
    // Отключаем предыдущие события, если они есть
    eventBus.off("A:Load");
    eventBus.off("A:ChangeCameraPos");
    eventBus.off("A:ContantLoaded");

    // Подписываемся на новые события
    eventBus.on("A:Load", () => {
      try {
        if (props.pageComponent?.selected) {
          props.pageComponent.selected();
        }
        restorLength.value = 0;
        curActionCount.value = 0;
        menuStore.closeAllMenus();
      } catch (error) {
        console.error("Ошибка в обработчике A:Load:", error);
      }
    });

    eventBus.on("A:ChangeCameraPos", () => {
      try {
        if (props.pageComponent?.selected) {
          props.pageComponent.selected();
        }
      } catch (error) {
        console.error("Ошибка в обработчике A:ChangeCameraPos:", error);
      }
    });

    eventBus.onEmitCalled(async (event, payload) => {
      try {
        if (!historyActions.value || !verdekConstructor.value) return;
        await nextTick();
        if (verdekConstructor.value.userHistory.checkEvent(event)) {
          const total =
            verdekConstructor.value.userHistory.getHistory().length - 1;
          restorLength.value = total;
          curActionCount.value = total;
        }
      } catch (error) {
        console.error("Ошибка в обработчике onEmitCalled:", error);
      }
    });

    eventBus.on("A:ContantLoaded", checkContantLoad);
  } catch (error) {
    console.error("Ошибка при добавлении событий 3D:", error);
  }
};

const getHistoruBtnsState = computed(() => {
  return {
    // На 2D кнопки активны по готовности истории; на 3D — по roomState.getLoad
    disabled: route.path === "/2d" ? false : !roomState.getLoad,
  };
});

const basketStore = useBasketStore();

/** @Проверка загрузки Application доп функция */
const waitForConstructor = async (timeout = 2000, interval = 50) => {
  const start = Date.now();

  return new Promise<TApplication | null>((resolve) => {
    const check = () => {
      if (props.pageComponent?.VerdekConstructor) {
        resolve(props.pageComponent.VerdekConstructor);
        return;
      }
      if (Date.now() - start >= timeout) {
        resolve(null); // не дождались
        return;
      }
      setTimeout(check, interval);
    };
    check();
  });
};

watch(
  () => route.path,
  async (newPath, oldPath) => {
    

    try {

      if (oldPath === "/3d" && newPath === "/2d" && verdekConstructor.value) {
        eventBus.emit("A:Save");
        await nextTick(); // Ждем сохранения
      }

      if (newPath === "/2d") {
        await nextTick(); // Ждем, чтобы данные успели обновиться в schemeTransition
        // roomOptions.resetGlobalOptions()

        // Устанавливаем текущую активную комнату (первую, если нет текущей)
        const rooms = roomState.getRooms;
        if (rooms && rooms.length > 0) {
          const currentRoomId = roomState.getRoomId;
          if (!currentRoomId) {
            // Если текущей комнаты нет, устанавливаем первую комнату
            roomState.setCurrentRoomId(rooms[0].id);
          }
        }

        // Ждем готовности C2D, если его еще нет
        let c2d = window.C2D;
        if (!c2d?.layers?.planner || !c2d?.layers?.doorsAndWindows) {
          const start = Date.now();
          const timeout = 3000;
          const interval = 50;
          while (!c2d?.layers?.planner || !c2d?.layers?.doorsAndWindows) {
            if (Date.now() - start >= timeout) break;
            await new Promise((resolve) => setTimeout(resolve, interval));
            c2d = window.C2D;
          }
        }
        // Инициализация слоёв и объекта истории 2D
        const roomsData = schemeTransition.getAllData() ?? [];
        if (c2d?.layers?.planner && c2d?.layers?.doorsAndWindows) {
          if (roomsData.length > 0) {
            c2d.layers.planner.init(true);
            c2d.layers.doorsAndWindows.init(true);
          }
          if (
            constructor2DHistory.historyLength === 0 &&
            roomsData.length > 0
          ) {
            constructor2DHistory.clearHistory(
              JSON.parse(JSON.stringify(roomsData)),
            );
          }
          historyActions.value = true;
          restorLength.value = Math.max(
            0,
            constructor2DHistory.historyLength - 1,
          );
          curActionCount.value = constructor2DHistory.currentIndex;
        }
      }
      console.log("Все комнаты:", roomState.rooms);
      roomState.routConvertData(newPath);

      menuStore.setRulerVisibility(true);
      menuStore.setDrowModeValue(false);
      modelState.setCurrentModel(null);
      menuStore.closeAllMenus();

      if (newPath !== "/2d") {
        historyActions.value = false;
        restorLength.value = 0;
        curActionCount.value = 0;
      }

      let constructor = await waitForConstructor();
      await nextTick();

      if (constructor && newPath === "/3d") {
        verdekConstructor.value = constructor as TApplication;
        historyActions.value = true;
        addEvents3D();
      }
    } catch (error) {
      console.error("Ошибка при изменении маршрута в MainHeader:", error);
    }
  },
  // { flush: "post", immediate: true }
);

onBeforeUnmount(() => {
  try {
    // Отключаем все события
    eventBus.off("C2D:Ready", onC2DReady);
    eventBus.off("A:Load");
    eventBus.off("A:ChangeCameraPos");
    eventBus.off("A:ContantLoaded");

    // Очищаем данные
    restorLength.value = 0;
    curActionCount.value = 0;
    historyActions.value = false;

    // Безопасно очищаем ссылку на конструктор
    if (verdekConstructor.value) {
      try {
        // Если у конструктора есть метод destroy, вызываем его
        if (typeof verdekConstructor.value.destroy === "function") {
          verdekConstructor.value.destroy();
        }
      } catch (error) {
        console.warn("Ошибка при уничтожении конструктора:", error);
      }
      verdekConstructor.value = null;
    }
  } catch (error) {
    console.error("Ошибка при очистке MainHeader:", error);
  }
});
</script>

<template>
  <section class="header">
    <div class="header__container">
      <div class="header-main">
        <router-link to="/" class="header-link">
          <img class="header-link__logo" src="@/assets/img/logo.png" />
        </router-link>
        <div class="header-main-ui">
          <div
            :class="['history', 'history__btns', getHistoruBtnsState]"
            v-if="
              historyActions && (route.path == '/3d' || route.path == '/2d')
            "
          >
            <!-- {{ restorLength }}{{ curActionCount }} -->
            <LeftLightHeaderButton
              @click="prevAction"
              :class="{ disabled: lessThenActions }"
            />
            <RightLightHeaderButton
              @click="nextAction"
              :class="{ disabled: moreThenActions }"
            />
          </div>
          <div class="header-ui-group">
            <S2DLightHeaderButton />
            <S3DLightHeaderButton />
          </div>
          <div class="header-ui-group">
            <Modal ref="inputDialogRef" v-if="route.path !== '/3d'">
              <template #modalBody="{ onModalClose }">
                <InputDialog
                  label="Назовите комнату"
                  placeholder="Введите название"
                  initialValue="Комната"
                  confirmText="Создать"
                  @confirm="createNewRoom"
                >
                  <template #confirmButton="{ onConfirm }">
                    <MainButton
                      @click="
                        () => {
                          onConfirm();
                          onModalClose();
                        }
                      "
                    >
                      Создать
                    </MainButton>
                  </template>
                  <template #cancelButton>
                    <MainButton @click="onModalClose">Отменить</MainButton>
                  </template>
                </InputDialog>
              </template>
              <template #modalOpen="{ onModalOpen }">
                <button
                  class="button__rounded"
                  @click="
                    () => {
                      onModalOpen();
                      customiserStore.hideCustomiserPopup();
                    }
                  "
                >
                  <span class="icon icon-add"></span>
                </button>
              </template>
            </Modal>
          </div>
        </div>
      </div>
      <div class="header-utilitys">
        <div class="header-basket" v-if="route.path === '/3d'">
          <div class="header-utilitys-basket">
            <p class="header-utilitys-basket-cost">
              {{ basketStore.totalPrice.toLocaleString("ru-RU") }} ₽
            </p>
            <!-- <p class="header-utilitys-basket-cost">14 548 ₽</p> -->
          </div>
          <BuyBasketButton />
        </div>
        <div class="header-utilitys-helpers">
          <QuickActionsToolbar />
          <!-- <AddPhotoHelperButton />-->
          <!-- <GetAppHelperButton @click="saveProject" />
          <VisibilityHelperButton @click="loadProject" />  -->
          <Avatar />
        </div>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.header {
  width: 100%;
  height: 90px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid $light-stroke;

  &__container {
    width: 100%;
    padding: 0 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &-basket {
    position: relative;
  }
}

.header-utilitys {
  display: flex;
  align-items: center;
  gap: 60px;

  &-basket {
    position: relative;
  }

  &-helpers {
    display: flex;
    gap: 10px;
  }
}

.header-utilitys-basket {
  width: 201px;
  height: 50px;
  display: flex;
  border: 1.2px solid $black;
  border-radius: 50px;
  box-sizing: border-box;
  overflow: hidden;
}

.header-utilitys-basket-cost {
  width: 170px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.header-main {
  width: 100%;
  max-width: 665px;
  display: flex;
  align-items: center;

  &-ui {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 30px;

    .header-ui-group {
      display: flex;
      gap: 10px;
    }
  }
}

.header-link {
  width: 100%;
  max-width: 315px;

  &__logo {
    width: 154px;
    height: 61px;
  }
}
.history {
  position: relative;
  &__btns {
    display: flex;
    gap: 10px;

    &.disabled {
      pointer-events: none;

      .light-radial__button {
      }
    }
  }
}
</style>
