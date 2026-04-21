<script setup lang="ts" xmlns="http://www.w3.org/1999/html">
// @ts-nocheck
import "@/components/UMconstructor/styles/UM.scss"

import {computed, onMounted, ref, toRefs} from "vue";

import { useAppData } from "@/store/appliction/useAppData.ts";
import CorpusMaterialRedactor from "@/components/right-menu/customiser-pages/ColorRightPage/CorpusMaterialRedactor.vue";
import AdvanceCorpusMaterialRedactor from "@/components/ui/color/AdvanceCorpusMaterialRedactor.vue";
import { useModelState } from "@/store/appliction/useModelState.ts";
import HiTechSideprofile from "@/components/right-menu/customiser-pages/HiTechProfilePage/HiTechSideprofile.vue";
import ClosePopUpButton from "@/components/ui/svg/ClosePopUpButton.vue";
import Toggle from "@vueform/toggle";
import {TFasadeTrueSizes} from "@/types/types.ts";
import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import {useOptions} from "@/components/right-menu/customiser-pages/RailsRightPage/useOptions.ts";
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
  UMconstructor: {
    type: UMconstructorClass,
    required: true,
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


const { module, objectData, visualizationRef, UMconstructor } = toRefs(props);
const APP = useAppData().getAppData;
const modelState = useModelState();
const productData = ref(null);
const { checkActive } = useOptions();

const currentOption = ref<string | boolean>(false);
const materialList = ref(null);
const elementSize = <TFasadeTrueSizes|boolean>ref(false);

const getMaterialsParts = computed(() => {
  return (_module: Object) => {
    let result = {};

    moduleParts.forEach((item) => {
      if (_module.CONFIG[item]) {
        if (typeof _module.CONFIG[item] === "object") {
          let tmpObj = {};
          Object.entries(_module.CONFIG[item]).forEach(([key, value]) => {
            let name = key === "COLOR" ? "FASADE" : key;
            tmpObj[key] = getMaterialInfo(name, value);
          });

          if (Object.keys(tmpObj).length > 0) result[item] = tmpObj;
        } else
          result[item] = {
            COLOR: getMaterialInfo("FASADE", _module.CONFIG[item]),
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

    if(module.value.noBottom) {
      delete result['BACKWALL']
    }

    return result;
  };
});

const emit = defineEmits(["product-reset"]);

const reset = (grid) => {
  UMconstructor?.value?.reset()
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
      result = { ...objectData.value.CONFIG[currentOption.value] };

      if (!result.COLOR)
        result.COLOR = objectData.value.CONFIG.MODULE_COLOR;

      elementSize.value = {FASADE_WIDTH: module.value.depth, FASADE_HEIGHT: module.value.height};

      break;
    default:
      result = objectData.value.CONFIG[currentOption.value];
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
          }
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

const setEccentricOption = (props = {PROPS: false, side : false}) => {
  let {PROPS, side} = props

  if((side && PROPS.CONFIG[side]?.COLOR) || (PROPS.CONFIG['LEFTSIDECOLOR']?.COLOR || PROPS.CONFIG['RIGHTSIDECOLOR']?.COLOR)) {
    PROPS.CONFIG.eccentricOption = true
  }
  else {
    delete PROPS.CONFIG.eccentricOption
  }

  let option = PROPS.CONFIG.OPTIONS.find(item => +item.id === 8390271)
  if (PROPS.CONFIG.eccentricOption && option && !option.active) {
    checkActive(8390271, true)
  }
}

const selectOption = (value: Object, type: string, palette: Object = false) => {
  console.log(value, "value", currentOption.value);

  switch (currentOption.value) {
    case "MODULE_COLOR":
      objectData.value.CONFIG[currentOption.value] = value.ID;
      module.value.moduleColor = value.ID;
      module.value.moduleThickness = value.DEPTH;

      if (!objectData.value.CONFIG["LEFTSIDECOLOR"]?.COLOR)
        module.value.leftWallThickness = value.DEPTH;

      if (!objectData.value.CONFIG["RIGHTSIDECOLOR"]?.COLOR)
        module.value.rightWallThickness = value.DEPTH;

      break;
    case "PROFILECOLOR":
      objectData.value.CONFIG["PROFILECOLOR"] = value
          ? value.ID || value
          : false;

      if (!objectData.value.CONFIG["PROFILECOLOR"]) {
        delete objectData.value.CONFIG["PROFILECOLOR"];
      } else {
        module.value.profilesConfig.COLOR =
            objectData.value.CONFIG["PROFILECOLOR"];
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
      if (!objectData.value.CONFIG[currentOption.value]) {
        objectData.value.CONFIG[currentOption.value] = {};
      }
      let tmp_value = value ? value.ID || value : false;

      if (type === "COLOR") {

        if(tmp_value === objectData.value.CONFIG.MODULE_COLOR) {
          objectData.value.CONFIG[currentOption.value] = {COLOR: false};
          setEccentricOption({PROPS: objectData.value, side: currentOption.value})
          break;
        }

        if (!tmp_value || tmp_value === 7397)
          objectData.value.CONFIG[currentOption.value]["SHOW"] = false;
        else
          objectData.value.CONFIG[currentOption.value]["SHOW"] = true;
      }

      objectData.value.CONFIG[currentOption.value][type] = tmp_value;
      if (palette)
        objectData.value.CONFIG[currentOption.value]["PALETTE"] = palette;

      setEccentricOption({PROPS: objectData.value, side: currentOption.value})
      break;
    default:
      if (!objectData.value.CONFIG[currentOption.value]) {
        objectData.value.CONFIG[currentOption.value] = {};
      }

      if (type === "COLOR") {
        if (!value || value.ID === 7397)
          objectData.value.CONFIG[currentOption.value]["SHOW"] = false;
        else
          objectData.value.CONFIG[currentOption.value]["SHOW"] = true;
      }

      objectData.value.CONFIG[currentOption.value][type] = value
          ? value.ID || value
          : false;
      if (palette)
        objectData.value.CONFIG[currentOption.value]["PALETTE"] = palette;
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
  modelState.createCurrentBackwallData(objectData.value.PRODUCT);
  modelState.createCurrentSidewallData(objectData.value.PRODUCT);
  productData.value = UMconstructor?.value?.UM_STORE.getUMData();
  elementSize.value = false
});
</script>

<template>
  <div class="actions-wrapper">
    <div :class="'actions-items--container'">
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
    <div class="color--left" v-if="currentOption" key="color--left-select">
      <div class="color--left-select" key="color--left-select">
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
            class="color--left-select-item"
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
            class="color--left-select-item"
            :is2Dconstructor="true"
            :material-list="materialList"
            :type="currentOption === 'BACKWALL' ? 'backwall' : 'surface'"
            @parent-callback="selectOption"
        />

        <HiTechSideprofile
            v-if="currentOption === 'PROFILECOLOR' && getSideProfile"
            class="color--left-select-item"
            :module="module"
        />
      </div>
    </div>
  </transition>
</template>

<style scoped lang="scss">
</style>
