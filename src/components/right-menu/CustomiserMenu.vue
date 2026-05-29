<script setup lang="ts">
// @ts-nocheck 31
import { onMounted, onBeforeUnmount, ref, onUnmounted, computed } from "vue";
import type { Mesh, Object3D, Vector3, PerspectiveCamera } from "three";

import { useCustomiserStore } from "@/store/appStore/useCustomiserStore";
import { useModelState } from "@/store/appliction/useModelState";
import { useEventBus } from "@/store/appliction/useEventBus";
import { useUniformState } from "@/store/appliction/useUniformState";
import { useMenuStore } from "@/store/appStore/useMenuStore";
import { useAppData } from "@/store/appliction/useAppData";

import RulerPage from "@/components/right-menu/customiser-pages/RulerRightPage.vue";
import RailsRightPage from "./customiser-pages/RailsRightPage/RailsRightPage.vue";
import Options from "./customiser-pages/RailsRightPage/Options.vue";
import ModelsItemSelector from "@/components/right-menu/customiser-pages/ColorRightPage/ModelsItemSelector.vue";
import MovingPage from "@/components/right-menu/customiser-pages/MovingRightPage.vue";
import FigurePage from "@/components/right-menu/customiser-pages/FigureRightPage/FigureRightPage.vue";

import RulerButton from "@/components/ui/buttons/right-menu/RulerRightButton.vue";
import ColorButton from "@/components/ui/buttons/right-menu/ColorRightButton.vue";
import MovingButton from "@/components/ui/buttons/right-menu/MovingRightButton.vue";
import FigureButton from "@/components/ui/buttons/right-menu/FigureRightButton.vue";
import HammerButton from "@/components/ui/buttons/right-menu/HammerRightButton.vue";
import { compute } from "three/webgpu";

type TCustomiserMap = ["ruler", "color", "moving", "figure", "hammer"];
type TButtonVisibles = {
  ruler: boolean;
  color: boolean;
  moving: boolean;
  figure: boolean;
};

const customiserStore = useCustomiserStore();
const eventBus = useEventBus();
const modelState = useModelState();
const uniformState = useUniformState();
const menuStore = useMenuStore();
const app = useAppData();
const exceptionNames = ["MODEL", "UNIVERSAL", "TOP_TABLE"];

const currentModel = ref(null);
const buttonVisibles = ref<TButtonVisibles>({
  ruler: true,
  color: false,
  moving: false,
  figure: false,
});

const closeCustomiser = () => {
  const { uniformMode } = uniformState.getUniformModeData;
  // Отключаем режим переходящего рисунка при закрытии кастомизатора
  if (uniformMode) {
    eventBus.emit("A:Disable-Uniform-Mode");
  }
  eventBus.emit("A:close-modal-custom");
  customiserStore.hideCustomiserPopup();
};

const checkSelect = (el) => {
  if (!el.object) {
    closeCustomiser();
    currentModel.value = null;
    modelState.setCurrentModel(null);
    return;
  }

  currentModel.value = el.object;
  customiserStore.showCustomiserPopup();

  modelState.setCurrentModel(el.object);
  if (el.object.userData.elementType === "raspil") {
    closeCustomiser();
    return;
  }

  checkData(el.object);

  if (exceptionNames.includes(el.object.name)) {
    closeCustomiser();
    return;
  }
  // if (el.object.name == "MODEL") {
  //   closeCustomiser();
  //   return;
  // }
  customiserStore.switchCustomiser("ruler");
};

const checkData = (object) => {
  const products = modelState.getModels;
  const { PRODUCT, CONFIG } = object.userData.PROPS;
  const { FASADE_PROPS, DAE, MODULE_COLOR } = CONFIG;
  const prodData = products[PRODUCT];

  const haveHandles = app.getAppData.POSITION_HANDLES[PRODUCT];
  const havePlinth = prodData.leg_length > 0;

  const checkColor =
    (prodData.FACADE.length > 0 && prodData.FACADE[0] !== null && !DAE) ||
    (MODULE_COLOR != null && !DAE);
  const checkOptions =
    prodData.OPTION.length > 0 && prodData.OPTION[0] !== null;

  buttonVisibles.value.color = checkColor;
  buttonVisibles.value.figure = (checkColor && haveHandles) || havePlinth;
  buttonVisibles.value.moving = checkOptions;
};

onMounted(() => {
  eventBus.on("A:Selected", checkSelect);
  eventBus.on("A:ClearSelected", checkSelect);
  eventBus.on("A:RemoveModel", closeCustomiser);
  eventBus.on("A:Duplicate", closeCustomiser);
});

onBeforeUnmount(() => {
  eventBus.off("A:Selected", checkSelect);
  eventBus.off("A:ClearSelected", checkSelect);
});

const getName = computed(() => {
  const sceneModel = modelState.getCurrentModel;
  const name = sceneModel?.userData.PROPS.NAME ?? "н/о";
  return name;
});

onUnmounted(() => {
  closeCustomiser();
});
</script>

<template>
  <transition name="slide--right">
    <div v-if="customiserStore.isCustomiserOpen" class="customiser">
      <div class="customiser__container">
        <div class="customiser-header">
          <div class="customiser__title">
            <p class="customiser__name">{{ getName }}</p>
            <img src="@/assets/svg/right-menu/close.svg" class="close__button" @click="closeCustomiser" />
          </div>

          <div class="customiser__actions">
            <div class="customiser-links">
              <!-- Rework -->
              <RulerButton v-if="buttonVisibles.ruler" />
              <ColorButton v-if="buttonVisibles.color" />
              <MovingButton v-if="buttonVisibles.moving" />
              <FigureButton v-if="buttonVisibles.figure" />
              <!-- <HammerButton /> -->
            </div>

          </div>
        </div>

        <RulerPage v-if="customiserStore.customisers == 'ruler'" />
        <ModelsItemSelector v-if="customiserStore.customisers == 'color'" />
        <Options v-if="customiserStore.customisers == 'moving'" />
        <FigurePage v-if="customiserStore.customisers == 'figure'" />
      </div>
    </div>
  </transition>
</template>

<style lang="scss" scoped>
.customiser {
  width: 100%;
  max-width: 40rem;
  position: absolute;
  top: 0px;
  right: 0px;
  padding: 0.7rem;
  background: $white;
  box-shadow: 0px 0px 10px 0px #3030301a;
  z-index: 10;
  border-radius: 5px;
  // transition: 0.5s ease-in-out;
  // transform: translateZ(-10px);
  // box-sizing: border-box;
  overflow: hidden;

  user-select: none;
  /* Стандартное */
  -webkit-user-select: none;
  /* Safari, Chrome */
  -moz-user-select: none;
  /* Firefox */
  -ms-user-select: none;
  /* Internet Explorer/Edge */

  &-header {
    width: 100%;
    display: flex;
    align-items: flex-start;
    flex-direction: column;
    gap: 1rem;
    justify-content: space-between;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #ecebf1;
  }

  &__title {
    display: flex;
    gap: 2rem;
    width: 100%;
    justify-content: space-between;

  }

  &__name {
    // max-width: 50%;
    // margin-right: 50px;
    font-size: 1.8rem;
    font-weight: 600;
  }

  &-links {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    height: calc(100vh - var(--header-height));
    padding-bottom: 10px;
  }

  &__actions {
    display: flex;
    gap: 2rem;
  }

  .close__button {
    cursor: pointer;
    width: 25px;
    height: 25px;
  }
}
</style>
