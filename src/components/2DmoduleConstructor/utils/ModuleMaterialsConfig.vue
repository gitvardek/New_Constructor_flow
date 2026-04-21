<!-- <script setup lang="ts" xmlns="http://www.w3.org/1999/html"> -->
 <script setup lang="ts">
// @ts-nocheck
import {
  computed,
  defineExpose,
  onBeforeMount,
  onMounted,
  ref,
  toRefs,
} from "vue";

import { useAppData } from "@/store/appliction/useAppData.ts";
import CorpusMaterialRedactor from "@/components/right-menu/customiser-pages/ColorRightPage/CorpusMaterialRedactor.vue";
import AdvanceCorpusMaterialRedactor from "@/components/ui/color/AdvanceCorpusMaterialRedactor.vue";
import { useModelState } from "@/store/appliction/useModelState.ts";
import HiTechSideprofile from "@/components/right-menu/customiser-pages/UMLeftPages/HiTechSideprofile.vue";
import ClosePopUpButton from "@/components/ui/svg/ClosePopUpButton.vue";
import Toggle from "@vueform/toggle";
import { useConversationActions } from "@/components/right-menu/actions/useConversationActions.ts";
import { number } from "yup";
import { TFasadeTrueSizes } from "@/types/types.ts";
import { useOptions } from "@/components/right-menu/customiser-pages/RailsRightPage/useOptions.ts";
import { useEventBus } from "@/store/appliction/useEventBus.ts";

const props = defineProps({
  module: {
    type: Object,
    default: {},
    required: true,
  },
  objectData: {
    type: Object,
    default: {},
    required: true,
  },
  visualizationRef: {
    type: [ref, Object],
  },
});

type CATALOG_TYPE =
  | "FASADE"
  | "PALETTE"
  | "MILLING"
  | "FASADETYPE"
  | "GLASS"
  | "PATINA";

const moduleParts = [
  "MODULE_COLOR",
  "BACKWALL",
  "LEFTSIDECOLOR",
  "RIGHTSIDECOLOR",
  "TOPFASADECOLOR",
  "PROFILECOLOR",
];

enum partsNames {
  MODULE_COLOR = "Цвет корпуса",
  BACKWALL = "Задняя стенка",
  LEFTSIDECOLOR = "Левая стенка",
  RIGHTSIDECOLOR = "Правая стенка",
  TOPFASADECOLOR = "Накладка на крышку",
  PROFILECOLOR = "Профили",
}

const { module, objectData, visualizationRef } = toRefs(props);
const APP = useAppData().getAppData;
const modelState = useModelState();
const productData = ref(null);
const {} = useConversationActions();
const { checkActive } = useOptions();

const currentOption = ref<string | boolean>(false);
const materialList = ref(null);
const elementSize = <TFasadeTrueSizes | boolean>ref(false);

const getMaterialsParts = computed(() => {
  return (_module: Object) => {
    let result = {};

    moduleParts.forEach((item) => {
      if (_module.PROPS.CONFIG[item]) {
        if (typeof _module.PROPS.CONFIG[item] === "object") {
          let tmpObj = {};
          Object.entries(_module.PROPS.CONFIG[item]).forEach(([key, value]) => {
            let name = key === "COLOR" ? "FASADE" : key;
            tmpObj[key] = getMaterialInfo(name, value);
          });

          if (Object.keys(tmpObj).length > 0) result[item] = tmpObj;
        } else
          result[item] = {
            COLOR: getMaterialInfo("FASADE", _module.PROPS.CONFIG[item]),
          };
      }
    });

    if (module.value.profilesConfig) {
      result["PROFILECOLOR"] = {
        COLOR: getMaterialInfo("COLOR", module.value.profilesConfig.COLOR),
      };
    }

    if (module.value.isRestrictedModule || module.value.fasades) {
      delete result["TOPFASADECOLOR"];
    }

    if (module.value.noBottom) {
      delete result["BACKWALL"];
    }

    return result;
  };
});

const emit = defineEmits(["product-reset"]);

const reset = () => {
  emit("product-reset");
};

const getMaterialInfo = (type: CATALOG_TYPE, materialID: number) => {
  return APP[type]?.[materialID];
};

const closeMenu = () => {
  currentOption.value = false;
  materialList.value = null;
};

const getOption = (part: string) => {
  if (part == currentOption.value) {
    currentOption.value = false;
    materialList.value = null;
    return;
  }
  currentOption.value = part;
  getMaterialsList();
};

const getCurrentValue = computed(() => {
  let result = {};

  switch (currentOption.value) {
    case "RIGHTSIDECOLOR":
    case "LEFTSIDECOLOR":
      result = { ...objectData.value.PROPS.CONFIG[currentOption.value] };

      if (!result.COLOR)
        result.COLOR = objectData.value.PROPS.CONFIG.MODULE_COLOR;

      elementSize.value = {
        FASADE_WIDTH: module.value.depth,
        FASADE_HEIGHT: module.value.height,
      };

      break;
    default:
      result = objectData.value.PROPS.CONFIG[currentOption.value];
      break;
  }

  return result;
});

const getMaterialsList = () => {
  switch (currentOption.value) {
    case "MODULE_COLOR":
      materialList.value = modelState.getCurrentModuleData;
      break;
    case "BACKWALL":
      materialList.value = modelState.getCurrentBackwallData;
      break;
    case "RIGHTSIDECOLOR":
    case "LEFTSIDECOLOR":
      materialList.value = modelState.getCurrentSidewallData;
      break;
    case "PROFILECOLOR":
      materialList.value = module.value.profilesConfig.colorsList.map(
        (colorID) => {
          return getMaterialInfo("COLOR", colorID);
        },
      );
      break;
    default:
      createFacadeData();
      materialList.value = modelState.getCurrentModelFasadesData;
      break;
  }

  return materialList.value;
};

const createFacadeData = (fasadeIndex) => {
  const productId = modelState.getCurrentModel.userData.PROPS.PRODUCT;
  const { FACADE } = modelState._PRODUCTS[productId];
  modelState.createCurrentModelFasadesData({
    data: FACADE,
    fasadeNdx: fasadeIndex,
    productId,
  });
};

const setEccentricOption = (props = { group: false, side: false }) => {
  let { group, side } = props;

  if (
    (side && group.PROPS.CONFIG[side]?.COLOR) ||
    group.PROPS.CONFIG["LEFTSIDECOLOR"]?.COLOR ||
    group.PROPS.CONFIG["RIGHTSIDECOLOR"]?.COLOR
  ) {
    group.PROPS.CONFIG.eccentricOption = true;
  } else {
    delete group.PROPS.CONFIG.eccentricOption;
  }

  let option = group.PROPS.CONFIG.OPTIONS.find((item) => +item.id === 8390271);
  if (group.PROPS.CONFIG.eccentricOption && option && !option.active) {
    checkActive(8390271, true);
  }
};

const selectOption = (value: Object, type: string, palette: Object = false) => {
  console.log(value, "value", currentOption.value);

  switch (currentOption.value) {
    case "MODULE_COLOR":
      objectData.value.PROPS.CONFIG[currentOption.value] = value.ID;
      module.value.moduleColor = value.ID;
      module.value.moduleThickness = value.DEPTH;

      if (!objectData.value.PROPS.CONFIG["LEFTSIDECOLOR"]?.COLOR)
        module.value.leftWallThickness = value.DEPTH;

      if (!objectData.value.PROPS.CONFIG["RIGHTSIDECOLOR"]?.COLOR)
        module.value.rightWallThickness = value.DEPTH;

      break;
    case "PROFILECOLOR":
      objectData.value.PROPS.CONFIG["PROFILECOLOR"] = value
        ? value.ID || value
        : false;

      if (!objectData.value.PROPS.CONFIG["PROFILECOLOR"]) {
        delete objectData.value.PROPS.CONFIG["PROFILECOLOR"];
      } else {
        module.value.profilesConfig.COLOR =
          objectData.value.PROPS.CONFIG["PROFILECOLOR"];
        module.value.sections.forEach((section, secIndex) => {
          section.cells.forEach((cell, cellIndex) => {
            if (cell.hiTechProfiles) {
              cell.fillings.forEach((filling) => {
                if (filling.isProfile) {
                  filling.color = module.value.profilesConfig.COLOR;
                  filling.isProfile.COLOR = module.value.profilesConfig.COLOR;
                }
              });

              cell.hiTechProfiles.forEach((profile) => {
                profile.color = module.value.profilesConfig.COLOR;
                profile.isProfile.COLOR = module.value.profilesConfig.COLOR;
              });
            }
          });

          if (section.hiTechProfiles) {
            section.fillings.forEach((filling) => {
              if (filling.isProfile) {
                filling.color = module.value.profilesConfig.COLOR;
                filling.isProfile.COLOR = module.value.profilesConfig.COLOR;
              }
            });

            section.hiTechProfiles.forEach((profile) => {
              profile.color = module.value.profilesConfig.COLOR;
              profile.isProfile.COLOR = module.value.profilesConfig.COLOR;
            });
          }
        });
      }

      break;
    case "LEFTSIDECOLOR":
    case "RIGHTSIDECOLOR":
      if (!objectData.value.PROPS.CONFIG[currentOption.value]) {
        objectData.value.PROPS.CONFIG[currentOption.value] = {};
      }
      let tmp_value = value ? value.ID || value : false;

      if (type === "COLOR") {
        if (tmp_value === objectData.value.PROPS.CONFIG.MODULE_COLOR) {
          objectData.value.PROPS.CONFIG[currentOption.value] = { COLOR: false };
          setEccentricOption({
            group: objectData.value,
            side: currentOption.value,
          });
          break;
        }

        if (!tmp_value || tmp_value === 7397)
          objectData.value.PROPS.CONFIG[currentOption.value]["SHOW"] = false;
        else objectData.value.PROPS.CONFIG[currentOption.value]["SHOW"] = true;
      }

      objectData.value.PROPS.CONFIG[currentOption.value][type] = tmp_value;
      if (palette)
        objectData.value.PROPS.CONFIG[currentOption.value]["PALETTE"] = palette;

      setEccentricOption({
        group: objectData.value,
        side: currentOption.value,
      });
      break;
    default:
      if (!objectData.value.PROPS.CONFIG[currentOption.value]) {
        objectData.value.PROPS.CONFIG[currentOption.value] = {};
      }

      if (type === "COLOR") {
        if (!value || value.ID === 7397)
          objectData.value.PROPS.CONFIG[currentOption.value]["SHOW"] = false;
        else objectData.value.PROPS.CONFIG[currentOption.value]["SHOW"] = true;
      }

      objectData.value.PROPS.CONFIG[currentOption.value][type] = value
        ? value.ID || value
        : false;
      if (palette)
        objectData.value.PROPS.CONFIG[currentOption.value]["PALETTE"] = palette;
      break;
  }
  reset();
};

const getCurrentRedactor = computed(() => {
  return !["MODULE_COLOR", "BACKWALL"].includes(currentOption.value);
});

const getSideProfile = computed(() => {
  return module.value.profilesConfig?.sideProfile || false;
});

const changeProfilesWidth = (onSectionSize) => {
  module.value.sections.forEach((section, secIndex) => {
    let newWidth = onSectionSize
      ? section.width
      : section.width + module.value.moduleThickness * 2;

    section.cells.forEach((cell, cellIndex) => {
      if (cell.hiTechProfiles) {
        cell.fillings.forEach((filling) => {
          if (filling.isProfile && !filling.isProfile.isBottomHiTechProfile) {
            let delta = newWidth - filling.width;
            filling.width += delta;
            filling.size.x = filling.width;
            filling.position.x += -delta / 2;
          }
        });

        /*cell.hiTechProfiles.forEach(profile => {
          if(!profile.isProfile.isBottomHiTechProfile) {
            let delta = newWidth - profile.width
            profile.width += delta;
            profile.size.x = profile.width
            profile.position.x += (-delta / 2);
          }
        })*/
      }
    });

    if (section.hiTechProfiles) {
      section.fillings.forEach((filling) => {
        if (filling.isProfile && !filling.isProfile.isBottomHiTechProfile) {
          let delta = newWidth - filling.width;
          filling.width += delta;
          filling.size.x = filling.width;
          filling.position.x += -delta / 2;
        }
      });

      /*section.hiTechProfiles.forEach(profile => {
        if(!profile.isProfile.isBottomHiTechProfile) {
          let delta = newWidth - profile.width
          profile.width += delta;
          profile.size.x = profile.width
          profile.position.x += (-delta / 2);
        }
      })*/
    }
  });

  reset();
};

onMounted(() => {
  modelState.createCurrentBackwallData(objectData.value.globalData);
  modelState.createCurrentSidewallData(objectData.value.globalData);
  productData.value = modelState.getCurrentModel.userData;
  elementSize.value = false;
});
</script>

<template>
  <div class="actions-materials-wrapper">
    <div :class="'actions-materials-items--container'">
      <div class="config-options">
        <div
          v-for="(value, part) in getMaterialsParts(objectData)"
          :key="part"
          class="option-small"
        >
          <div
            :class="['option-small-item', { active: currentOption === part }]"
            @click="getOption(part)"
          >
            {{ partsNames[part] }}

            <div
              :class="[
                'option-small-item-chevron',
                { active: currentOption === part },
              ]"
            >
              ❯
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <transition name="slide--left" mode="out-in">
    <div class="color" v-if="currentOption" key="color-select">
      <div class="color-select" key="color-select">
        <h1 class="color__title">{{ partsNames[currentOption] }}</h1>
        <ClosePopUpButton class="menu__close" @close="closeMenu()" />

        <p class="color__title" v-if="currentOption === 'PROFILECOLOR'">
          Профили в размер секции
          <Toggle
            v-model="module.profilesConfig.onSectionSize"
            @change="changeProfilesWidth(module.profilesConfig.onSectionSize)"
          />
        </p>

        <AdvanceCorpusMaterialRedactor
          class="color-select-item"
          v-if="getCurrentRedactor"
          :key="currentOption"
          :element-data="getCurrentValue"
          :element-index="currentOption"
          :material-list="materialList"
          :fasade-size="elementSize"
          @parent-callback="selectOption"
        />
        <CorpusMaterialRedactor
          v-else
          class="color-select-item"
          :is2Dconstructor="true"
          :material-list="materialList"
          :type="currentOption === 'BACKWALL' ? 'backwall' : 'surface'"
          @parent-callback="selectOption"
        />

        <HiTechSideprofile
          v-if="currentOption === 'PROFILECOLOR' && getSideProfile"
          class="color-select-item"
          :module="module"
        />
      </div>
    </div>
  </transition>
</template>

<style scoped lang="scss">
.no-select {
  -webkit-user-select: none; /* Safari */
  -ms-user-select: none; /* IE 10+ и Edge */
  user-select: none; /* Стандарт: Chrome, Firefox, Opera, Edge */
}

.actions-materials {
  -webkit-user-select: none; /* Safari */
  -ms-user-select: none; /* IE 10+ и Edge */
  user-select: none; /* Стандарт: Chrome, Firefox, Opera, Edge */

  &-wrapper {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding-right: 0.5rem;
  }

  &-footer {
    display: flex;
    justify-content: space-between;
    margin-top: auto;

    &--save {
      display: flex;
      gap: 1rem;
    }
  }

  &-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow-y: scroll;
    padding-right: 0.5rem;
    max-height: 82vh;

    &::-webkit-scrollbar {
      width: 2px;
      /* Ширина скроллбара */
    }

    &::-webkit-scrollbar-button {
      display: none;
      /* Убираем стрелки */
    }

    &::-webkit-scrollbar-thumb {
      background: #888;
      /* Цвет ползунка */
      border-radius: 4px;
    }
  }

  &-header {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
    width: 100%;
    padding: 1rem 0;
    border-bottom: 1px solid #ecebf1;
    border-top: 1px solid #ecebf1;

    &--container {
      display: flex;
      align-items: center;
      // gap: 0.5rem;
      padding-right: 0.5rem;
      border-right: 1px solid #ecebf1;
      border-bottom: 1px solid transparent;
      cursor: pointer;

      &.active {
        border-bottom: 1px solid #da444c;
      }
    }
  }

  &-items {
    display: flex;
    flex-wrap: wrap;
    // gap: 1rem;
    align-items: center;

    &--wrapper {
      display: flex;
      flex-direction: column;

      width: 100%;
      padding: 0 0 1rem 0;
    }

    &--container {
      display: flex;
      width: 100%;
      padding: 1rem 0;
      border-bottom: 1px solid #ecebf1;
      flex-direction: column;

      // &:first-child {
      //   padding-top: 0;
      // }

      &.active {
        background-color: #f1f1f5;
      }
    }

    &--left,
    &--right {
      width: 100%;
    }

    &--left {
      align-items: start;
      max-width: 50%;

      &-wrapper {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
        margin-left: 0rem;
        // max-width: calc(50% - 1rem);
      }
    }

    &--right {
      max-width: calc(62% - 1rem);
      margin-left: 1rem;

      &-items {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;

        &-input-block {
          display: flex;
          flex-direction: row;
          gap: 5px;

          &-counter,
          &-button {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
          }

          &-button {
            margin-left: 5px;
          }

          &-counter {
            width: 45px;
            padding-left: 10px;
          }
        }
      }
    }

    &--height,
    &--diametr,
    &--width {
      display: flex;
      width: fit-content;

      &-item {
        display: flex;
        align-items: flex-start;
        height: fit-content;
        // gap: 0.5rem;
      }
    }

    &--title {
      display: flex;
      align-items: center;
      align-self: end;
      margin-bottom: 0.5rem;
    }
  }

  &-title {
    font-size: 1rem;
    color: #a3a9b5;
  }

  &-inputs {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
    max-width: 100px;
  }

  &-input {
    padding: 0.5rem 1rem;
    width: 100%;
    max-width: 125px;
    border: none;
    border-radius: 15px;
    background-color: #ecebf1;
    color: #6d6e73;
    font-size: 1rem;
    font-weight: 600;

    &:focus {
      outline: none;
    }

    &--container {
      position: relative;

      &::before {
        content: "mm";
        display: block;
        position: absolute;
        top: 50%;
        left: 60px;
        transform: translate(0, -50%);
        pointer-events: none;
        z-index: 0;
        font-size: 0.75rem;
        font-weight: 600;
        color: #6d6e73;
      }
    }
  }

  &-btn {
    padding: 0.5rem 1rem;
    border: 1px solid #ecebf1;
    border-radius: 15px;
    background-color: #ffffff;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: bold;
    color: #a3a9b5;
    outline: none;

    &--default,
    &--footer {
      transition-property: background-color, color, border;
      transition-timing-function: ease;
      transition-duration: 0.25s;
      @media (hover: hover) {
        /* when hover is supported */
        &:hover {
          color: white;
          background-color: #da444c;
          border: 1px solid transparent;
        }
      }
    }

    &--footer {
      background-color: #ecebf1;
    }

    &:focus {
      outline: none;
    }

    &.acthnive {
      border-color: #da444c;
      color: #181818;
      transition-property: background-color, color, border;
      transition-timing-function: ease;
      transition-duration: 0.25s;

      @media (hover: hover) {
        /* when hover is supported */
        &:hover {
          color: white;
          background-color: #da444c;
        }
      }
    }
  }

  &-icon {
    border: none;
    background-color: transparent;
    padding: 0 5px;

    &--delite,
    &--close,
    &--help {
      width: 18px;
      height: 18px;
    }

    &--add {
      width: 12px;
      height: 12px;
    }

    &--delite {
      &-center {
        margin-bottom: 0.5rem;
      }
    }

    &--bottom {
      align-self: flex-end;
      padding: 5px;
    }

    &--position {
      width: 25px;
      height: 25px;
    }
  }
}

.config {
  display: flex;
  gap: 5px;
  position: absolute;
  top: 15px;
  left: 320px;
  max-height: calc(100vh - 120px);
  z-index: -1;

  -webkit-user-select: none; /* Safari */
  -ms-user-select: none; /* IE 10+ и Edge */
  user-select: none; /* Стандарт: Chrome, Firefox, Opera, Edge */

  &-options {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    flex-direction: column;
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
    width: 570px;
    display: flex;
    flex-direction: column;
    gap: 15px;
    position: relative;
    padding: 15px;
    // background: rgba($white, 0.6);
    background: rgba($white, 1);
    box-shadow: 0px 0px 10px 0px #3030301a;
    z-index: 1;
    border-radius: 15px;
    // backdrop-filter: blur(5px);

    &__container {
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      gap: 15px;
      padding-right: 10px;
      overflow: auto;
    }
  }
}

.option {
  -webkit-user-select: none; /* Safari */
  -ms-user-select: none; /* IE 10+ и Edge */
  user-select: none; /* Стандарт: Chrome, Firefox, Opera, Edge */

  &-label {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
    border-radius: 15px;
    transition-property: background-color;
    transition-duration: 0.25s;
    transition-timing-function: ease;
    cursor: pointer;

    @media (hover: hover) {
      &:hover {
        .label__text {
          color: $black;
        }

        // background-color: $stroke;
      }
    }
  }

  &-small {
    flex: 46%;
    margin: 10px;
    border-radius: 15px;
    flex-direction: column;
    cursor: pointer;
    font-size: 18px;
    font-weight: 600;
    color: #a3a9b5;

    -webkit-user-select: none; /* Safari */
    -ms-user-select: none; /* IE 10+ и Edge */
    user-select: none; /* Стандарт: Chrome, Firefox, Opera, Edge */

    @media (hover: hover) {
      &:hover {
        color: #da444c;
        border-color: #da444c;
      }
    }

    &-item {
      padding: 1rem;
      border: 1px solid #ecebf1;
      border-radius: 15px;
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      align-content: center;

      &-chevron {
        font-size: 1rem;
        transform: rotate(-180deg);

        &.active {
          transform: rotate(0deg);
          color: #da444c;
        }
      }

      @media (hover: hover) {
        &:hover {
          color: #da444c;
          border-color: #da444c;

          .chevron {
            color: #da444c;
          }
        }
      }

      &.active {
        color: #da444c;
        border-color: #da444c;
      }
    }
  }

  &-standart {
    width: 100%;
    padding: 10px;
    border-radius: 15px;
    background-color: $bg;
  }

  &-standart {
    width: 100%;
    padding: 10px;
    border-radius: 15px;
    background-color: $bg;
  }
}

.color {
  display: flex;
  position: fixed;
  left: 20.8vw;
  top: 0;

  height: 100%;
  width: 100%;
  max-width: 373px;
  max-height: 95vh;
  overflow: hidden;

  z-index: 0;

  -webkit-user-select: none; /* Safari */
  -ms-user-select: none; /* IE 10+ и Edge */
  user-select: none; /* Стандарт: Chrome, Firefox, Opera, Edge */

  &-select {
    display: flex;
    flex-direction: column;
    width: 100%;

    max-height: 96vh;
    overflow-y: scroll;

    gap: 1rem;
    padding: 15px;
    box-shadow: 0px 0px 10px 0px #3030301a;
    border-radius: 15px;
    background: rgba($white, 1);

    &__container {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      overflow: auto;
    }

    &-item {
      width: 100%;
      height: 100%;
      display: flex;
      padding: 10px;
      border-radius: 15px;
      gap: 10px;

      &__title {
        font-size: 15px;
        font-weight: 500;
      }
    }
  }
}
</style>
