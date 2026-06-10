<script setup lang="ts">
//@ts-nocheck
import {
  ref,
  computed,
  watch,
  onBeforeMount,
  onUnmounted,
  defineExpose,
  nextTick,
} from "vue";
import { _URL } from "@/types/constants";
import type {
  TQuality,
  TOptionsMap,
  TTextureActionMap,
  TTextureItem,
  TFasadeItem,
  MenuType,
  TPalitte,
  TOptionItem,
  TMilling,
} from "@/types/types";
import type { IWallSizes } from "@/types/interfases";

import { useRoomState } from "@/store/appliction/useRoomState";
import { useSceneState } from "@/store/appliction/useSceneState";
import { useEventBus } from "@/store/appliction/useEventBus";
import { useMenuStore } from "@/store/appStore/useMenuStore";
import { useAppData } from "@/store/appliction/useAppData";
import { useRoomOptions } from "./roomOptions/useRoomOptons";
import { useModelState } from "@/store/appliction/useModelState";

import ClosePopUpButton from "@/components/ui/svg/ClosePopUpButton.vue";
import RoomList from "./roomOptions/RoomList.vue";
import RoomOptions from "./roomOptions/RoomOptions.vue";
import RoomHeight from "./roomOptions/RoomHeight.vue";
import RoomVisualSettings from "./roomOptions/RoomVisualSettings.vue";
import ColorSelector from "./roomOptions/ColorSelector.vue";

type TExtras = {
  isPalitte: TPalitte[] | null;
  isMilling: TMilling[] | null;
  isPlinth: any;
};

const eventBus = useEventBus();
const sceneState = useSceneState();
const roomState = useRoomState();
const menuStore = useMenuStore();
const appData = useAppData();

const { _FASADE, _MILLING } = useModelState();

const {
  updateOption,
  apllyProjectWall,
  getDefaultModuleData,
  getDefaultFasadeData,
  getWallsTextures,
  getFloorTextures,
  getDefaultTotalPlinthData,
  getDefaultTableTopData,
  getGlobalOptions,
  getDefaultPalitData,
  getDefaultMillingData,
  getTotalPlinthColorData,
  getDefaultHandlresData,

  getHeightClamp,
  getQuality,
  getShadowValue,
  getRefractionValue,
  getPointLightRange,
  getAmbientLightRange,

  setGlobalPalitte,
  setGlobalMilling,
  setGlobalPlinth,
  setQuality,

  setHeightClamp,
  setLightRange,
  setRefractionValue,
  setShadowValue,

  resetGlobalOptions,
  updateOptionGlobal,
  apllyProjectFloor,
} = useRoomOptions();

const clampHeight = ref<number | null | string>(3000);
const quality = ref<TQuality[] | null>(null);
const currentQuality = ref<TQuality | null>(null);

const pointLight = ref<number | string>(1);
const ambientLight = ref<number | string>(1);

const shadows = ref<boolean>(false);
const refraction = ref<boolean>(false);

const currentOption = ref<keyof TTextureActionMap | null>(null);
const currentOptionLable = ref<string | null>(null);

const optionsData = ref<Record<string, number> | null>(null);
const extrasSelect = ref<boolean>(false);

const roomRef = ref<HTMLElement | null>(null);

const visualData = ref<any>({
  module: null,
  fasade: null,
  table: null,
  walls: null,
  floor: null,
  plinth: null,
  handle: null,
});

const optionsType = ref<TTextureActionMap>({
  wall: "A:ChangeWallTexture",
  floor: "A:ChangeFloorTexture",
  moduleTop: "A:ChangeModuleTotalTexture",
  moduleBottom: "A:ChangeModuleTotalTexture",
  fasadsTop: "A:ChangeFasadsTopTexture",
  fasadsBottom: "A:ChangeFasadsBottomTexture",
  tableTop: "A:ChangeTableTop",
  palitteTotal: "A:ChangePaletteTotal",
  millingTotal: "A:ChangeMillingTotal",
  plinth: "A:ChangePlinthBody",
  plinthColor: "A:ChangePlinthColor",
  handles: "A:ChangeHandlesTotal",
});

const globalOptions = ref<TOptionsMap | null>(null);

const currentRedactor = ref<boolean>(false);

onBeforeMount(() => {
  console.log(roomState.getRooms);
  prepareOptions();
});

onUnmounted(() => {
  setHeightClamp(clampHeight.value);
  setLightRange("pointLight", pointLight.value);
  setLightRange("ambientLight", ambientLight.value);
  setRefractionValue(refraction.value);
  setShadowValue(shadows.value);
  extrasSelect.value = false;
});

defineExpose({ roomRef });

const prepareOptions = () => {
  const { wall, floor } = roomState.getCurrentRoomParams as IWallSizes;

  updateOption("wall", wall as number);
  updateOption("floor", floor as number);

  visualData.value = {
    module: getDefaultModuleData(),
    fasade: getDefaultFasadeData(),
    table: getDefaultTableTopData(),
    walls: getWallsTextures(),
    floor: getFloorTextures(),
    plinth: getDefaultTotalPlinthData(),
    handles: getDefaultHandlresData(),
  };

  globalOptions.value = getGlobalOptions;

  const { fasadsBottom, fasadsTop, plinth } = globalOptions.value;

  prepareExtras([fasadsBottom, fasadsTop, plinth]);

  clampHeight.value = getHeightClamp;
  quality.value = getQuality;
  currentQuality.value = quality.value?.find((el) => el.active) ?? null;

  shadows.value = getShadowValue;
  refraction.value = getRefractionValue;
  pointLight.value = getPointLightRange;
  ambientLight.value = getAmbientLightRange;
};

const prepareExtras = (arr: TOptionItem[]) => {
  const extaras = {};
  for (const el in arr) {
    const option = arr[el];
  }
};

const checkExtras = (
  fasadeId?: number | string,
  curOption?: string,
): TExtras => {
  const id = curOption?.id ?? fasadeId;

  const palitte = getDefaultPalitData(id!);
  const milling = getDefaultMillingData(id!);
  const plinth = getTotalPlinthColorData(id);

  return {
    isPalitte: palitte.length > 0 ? palitte : null,
    isMilling: milling.length > 0 ? milling : null,
    isPlinth: plinth.length > 0 ? plinth : null,
  };
};

const closeMenu = (menuType: MenuType) => {
  menuStore.closeMenu(menuType);
};

const changeHeightClamp = (value: number | null) => {
  clampHeight.value = value;
  eventBus.emit("A:Height-clamp", value);
};

const loadRoom = async (id: number) => {
  await roomState.setLoad(false);
  eventBus.emit("A:Save"); // Сохраняем локальное сотояние комнаты
  await nextTick();
  setTimeout(() => {
    resetGlobalOptions();
    eventBus.emit("A:Load", id);
    eventBus.emit("A:ContantLoaded", false);
    eventBus.emit("A:DrawingMode", false);
    eventBus.emit("A:ToggleRulerVisibility", true);
  }, 10);
};

const deliteRoom = (value: number) => {
  roomState.removeRoom(value);
};

const changeQuality = (data: TQuality) => {
  currentQuality.value = data;
  setQuality(data.value);
  eventBus.emit("A:Quality", data.value);
};

const changePointLightPower = (value: number | string) => {
  eventBus.emit("A:ChangePointLightPower", value);
};

const changeAmbientLightPower = (value: number | string) => {
  eventBus.emit("A:ChangeAmbientLightPower", value);
};

const toggleShadow = (value: boolean) => {
  eventBus.emit("A:ToggleShadow", value);
};

const toggleRefraction = (value: boolean) => {
  eventBus.emit("A:ToggleRefraction", value);
};

const getOption = (value: keyof TTextureActionMap, title: string) => {
  currentOption.value = value;

  switch (value) {
    case "plinth":
      optionsData.value = {
        type: "plinth",
        data: Object.values(visualData.value.plinth),
      };
      currentRedactor.value = false;
      break;
    case "wall":
      optionsData.value = {
        type: "wall",
        data: Object.values(visualData.value.walls),
      };
      currentRedactor.value = false;
      break;
    case "floor":
      optionsData.value = {
        type: "floor",
        data: Object.values(visualData.value.floor),
      };
      currentRedactor.value = false;
      break;
    case "moduleTop":
      optionsData.value = {
        type: "moduleTop",
        data: visualData.value.module,
      };
      currentRedactor.value = true;
      break;
    case "moduleBottom":
      optionsData.value = {
        type: "moduleBottom",
        data: visualData.value.module,
      };
      currentRedactor.value = true;
      break;
    case "fasadsTop":
      optionsData.value = {
        type: "fasadsTop",
        data: visualData.value.fasade,
      };
      currentRedactor.value = true;
      break;
    case "fasadsBottom":
      optionsData.value = {
        type: "fasadsBottom",
        data: visualData.value.fasade,
      };
      currentRedactor.value = true;
      break;
    case "tableTop":
      optionsData.value = {
        type: "tableTop",
        data: visualData.value.table,
      };
      currentRedactor.value = false;
      break;
    case "handles":
      optionsData.value = {
        type: "handles",
        data: visualData.value.handles,
      };
      currentRedactor.value = false;
      break;
  }

  currentOptionLable.value = title;
  extrasSelect.value = false;
};

const totalSelect = (event: Event, value: keyof TOptionsMap) => {
  updateOptionGlobal(value, (event.target as HTMLInputElement).checked);
  const selectOption = getGlobalOptions[value];

  if (selectOption) {
    switch (value) {
      case "wall":
        if (selectOption.global) {
          apllyProjectWall(selectOption.id);
          sceneState.updateStartRoomData(value, selectOption.id);
          return;
        }
        sceneState.updateStartRoomData(value, 44128);
        break;
      case "floor":
        if (selectOption.global) {
          apllyProjectFloor(selectOption.id);
          sceneState.updateStartRoomData(value, selectOption.id);
          return;
        }
        sceneState.updateStartRoomData(value, 44013);
        break;
      default:
        if (selectOption.global) {
          sceneState.updateDefaultData(value, selectOption);
          return;
        }
        sceneState.updateDefaultData(value, null);
    }
  }
};

const selectOption = (
  value: TTextureItem | TFasadeItem,
  type: string,
  extras: string | undefined,
) => {
  const optionMap = [
    "moduleTop",
    "moduleBottom",
    "fasadsTop",
    "fasadsBottom",
    "plinth",
    "tableTop"
  ];

  const data = optionMap.includes(type)
    ? { data: value, type: type }
    : value.ID;

  const curOption = globalOptions.value![type];
  const curOptionId = extras ? curOption.id : value.ID;

  const { isPalitte, isMilling, isPlinth } = checkExtras(curOptionId, type);

  const paramToCheck = extras
    ? globalOptions.value[type][extras]
    : curOption.id;

  if (paramToCheck === value.ID) return;

  if (!optionMap.includes(type)) {
    eventBus.emit(optionsType.value[type], value.ID);
    updateOption(type, value.ID);
    return;
  }

  if (type.includes("tableTop") && !extras) {
    updateOption(type, value.ID);
    eventBus.emit(optionsType.value[type], data);
    return;
  }

  if (type.includes("module") && !extras) {
    updateOption(type, value.ID);
    eventBus.emit(optionsType.value[type], data);
    return;
  }

  if (type.includes("fasad") && !extras) {
    curOption.palitteData = isPalitte;
    curOption.millingData = isMilling;

    if (isPalitte?.length > 0) {
      setGlobalPalitte(isPalitte[0].ID, type);
    } else {
      setGlobalPalitte(null, type);
    }

    if (isMilling?.length > 0) {
      setGlobalMilling(isMilling[0].ID, type);
    } else {
      setGlobalMilling(null, type);
    }

    const dataToEvent = {
      data: value,
      palitte: curOption.palitte,
      milling: _MILLING[curOption.milling],
      type: type,
    };

    updateOption(type, value.ID);
    eventBus.emit(optionsType.value[type], dataToEvent);

    return;
  }

  if (type.includes("plinth") && !extras) {
    curOption.plinthData = isPlinth;

    if (isPlinth?.length > 0 && isPlinth[0] != null) {
      setGlobalPlinth(isPlinth[0].ID, type);
    } else {
      setGlobalPlinth(null, type);
    }

    updateOption(type, value.ID);
    eventBus.emit(optionsType.value["plinthColor"], value.ID);

    return;
  }

  if (!extras) return;

  if (extras.includes("milling")) {
    curOption.millingData = isMilling;
    if (isMilling?.length > 0) {
      if (!curOption.milling) {
        setGlobalMilling(isMilling[0].ID, type);
      } else {
        setGlobalMilling(value.ID, type);
      }
    } else {
      setGlobalPalitte(null, type);
    }

    const dataToEvent = {
      data: _FASADE[curOption.id],
      palitte: curOption.palitte,
      milling: _MILLING[curOption.milling],
      type: type,
    };

    eventBus.emit(optionsType.value[type], dataToEvent);
    return;
  }

  if (extras.includes("palitte")) {
    curOption.palitteData = isPalitte;
    if (isPalitte?.length > 0) {
      if (!curOption.palitte) {
        setGlobalPalitte(isPalitte[0].ID, type);
      } else {
        setGlobalPalitte(value.ID, type);
      }
    } else {
      setGlobalPalitte(null, type);
    }
    const dataToEvent = {
      data: _FASADE[curOption.id],
      palitte: curOption.palitte,
      milling: _MILLING[curOption.milling],
      type: type,
    };
    eventBus.emit(optionsType.value[type], dataToEvent);
    return;
  }

  if (extras.includes("plinthSurfase")) {
    if (isPlinth?.length > 0) {
      if (!curOption.plinthSurfase) {
        setGlobalPlinth(isPlinth[0].ID, "plinth");
      } else {
        setGlobalPlinth(value.ID, "plinth");
      }
    } else {
      setGlobalPlinth(null, type);
    }

    eventBus.emit(optionsType.value["plinthColor"], value.ID);

    return;
  }
};

const palitteSelect = (
  palitteTitle: string,
  key: keyof TOptionsMap,
  palitteData: TPalitte[],
) => {
  optionsData.value = {
    extras: "palitte",
    type: key,
    data: palitteData,
  };
  currentOptionLable.value = palitteTitle;
  currentRedactor.value = false;
};

const millingSelect = (
  millingTitle: string,
  key: keyof TOptionsMap,
  millingData: TMilling[],
) => {
  optionsData.value = {
    extras: "milling",
    type: key,
    data: millingData,
  };
  currentOptionLable.value = millingTitle;
  currentRedactor.value = false;
};

const plinthSelect = (
  plinthTitle: string,
  key: keyof TOptionsMap,
  plinthData: TMilling[],
) => {
  optionsData.value = {
    extras: "plinthSurfase",
    type: key,
    data: plinthData,
  };
  currentOptionLable.value = plinthTitle;
  extrasSelect.value = false;
};

const roomsList = computed(() => roomState.getRooms);
const getCurrentRoomId = computed(() => roomState.getRoomId);

watch(pointLight, () => changePointLightPower(pointLight.value));
watch(ambientLight, () => changeAmbientLightPower(ambientLight.value));
watch(refraction, () => toggleRefraction(refraction.value));
watch(shadows, () => toggleShadow(shadows.value));
</script>

<template>
  <div class="room" ref="roomRef">
    <div class="room-popup">
      <h1 class="popup__title">Параметры помещения</h1>
      <ClosePopUpButton class="menu__close" @close="closeMenu('roomPar')" />
      <div class="room-popup__container">
        <RoomList :rooms="roomsList" :currentRoomId="getCurrentRoomId" @load-room="loadRoom"
          @delete-room="deliteRoom" />

        <RoomOptions v-if="globalOptions" :options="globalOptions" @toSelect="getOption" @toToggle="totalSelect"
          @toPalitteSelect="palitteSelect" @toMillingSelect="millingSelect" @toPlinthSelect="plinthSelect" />

        <h3 class="popup__title">Высота навесных модулей</h3>
        <RoomHeight :clampHeight="clampHeight" @apply="changeHeightClamp" />

        <RoomVisualSettings :currentQuality="currentQuality" :quality="quality" v-model:shadows="shadows"
          v-model:refraction="refraction" v-model:ambientLight="ambientLight" v-model:pointLight="pointLight"
          @change-quality="changeQuality" />
      </div>
    </div>

    <transition name="slide--left" mode="out-in">
      <ColorSelector v-if="optionsData" key="color-select" :optionsData="optionsData"
        :currentOptionLabel="currentOptionLable" :getCurrentRedactor="currentRedactor" @select="selectOption" />
    </transition>
  </div>
</template>

<style lang="scss" scoped>
.room {
  display: flex;
  gap: 5px;
  position: absolute;
  top: 0;
  left: 290px;
  height: calc(100vh - var(--header-height));
  z-index: -1;
  user-select: none;

  &-options {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }

  &-modheight {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  &-select {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 5px;
    padding: 10px 0;
    border-top: 1px solid $stroke;
    border-bottom: 1px solid $stroke;

    &__item {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 5px;
      border: 1px solid $dark-grey;
      border-radius: 50px;
    }
  }

  &-popup {
    width: 400px;
    display: flex;
    flex-direction: column;
    gap: 15px;
    position: relative;
    padding: 15px;
    background-color: rgba($white, 1);
    // backdrop-filter: blur(5px);
    // background: rgba($white, 1);
    box-shadow: 0px 0px 10px 0px #3030301a;
    z-index: 1;
    border-radius: 15px;

    &__container {
      height: calc(100vh - var(--header-height));
      display: flex;
      flex-direction: column;
      gap: 15px;
      padding-right: 10px;
      overflow: auto;
    }
  }
}

.visual {
  padding: 1rem;
  border: 1px solid $dark-grey;
  border-radius: 15px;

  &__content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  &__top,
  &__bottom {
    display: flex;
    gap: 16px;
  }

  &__top {
    width: 100%;

    &--left,
    &--right {
      display: flex;
      width: 100%;
      max-width: calc(50% - 8px);
    }

    &--switch {
      justify-content: space-around;
      align-items: center;
    }
  }

  &__bottom {

    &--left,
    &--right {
      display: flex;
      width: 100%;
    }
  }
}

.accordion {
  &__content {
    padding-top: 0.5rem;
    border-top: 1px solid $dark-grey;
  }
}

.menu__close {
  position: absolute;
  right: 15px;
  top: 15px;
  cursor: pointer;
}

.label {
  &__container {
    display: flex;
    flex-direction: column;
    pointer-events: none;
  }

  &__img {
    height: 60px;
    border-radius: 15px;
  }

  &__text {
    font-size: 1.4rem;
    font-weight: 600;
    color: $strong-grey;
    cursor: pointer;
    transition-property: color;
    transition-duration: 0.25s;
    transition-timing-function: ease;

    &--xs {
      color: $dark-grey;
      font-size: clamp(9px, 0.78125vw + 1px, 14px) !important;
    }
  }
}

.button {
  &__filled {
    &.active {
      color: $white;
      background-color: $red;
    }

    @media (hover: hover) {
      &:hover {
        color: $white;
        background-color: $red;
      }
    }
  }
}

@media screen and (width <=1023px) {
  .visual {
    &__top {
      max-width: 100%;
      flex-wrap: wrap;

      &--left,
      &--right {
        max-width: 100%;
        flex-wrap: wrap;
      }

      &--switch {
        justify-content: flex-start;
        gap: 1rem;
      }
    }
  }
}
</style>
