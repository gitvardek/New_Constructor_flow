<script setup lang="ts" xmlns="http://www.w3.org/1999/html">
// @ts-nocheck
import "@/components/UMconstructor/styles/UM.scss";

import { computed, onBeforeUnmount, onMounted, ref, toRefs } from "vue";

import CorpusMaterialRedactor from "@/components/right-menu/customiser-pages/ColorRightPage/CorpusMaterialRedactor.vue";
import AdvanceCorpusMaterialRedactor from "@/components/ui/color/AdvanceCorpusMaterialRedactor.vue";
import { useModelState } from "@/store/appliction/useModelState.ts";
import HiTechSideprofile from "@/components/right-menu/customiser-pages/UMLeftPages/HiTechSideprofile.vue";
import ClosePopUpButton from "@/components/ui/svg/ClosePopUpButton.vue";
import Toggle from "@vueform/toggle";
import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import ToptableSelector from "@/components/right-menu/customiser-pages/UMLeftPages/ToptableSelector.vue";
import {
  MODULE_MATERIAL_NAMES as partsNames,
  useModuleMaterials,
} from "@/components/UMconstructor/editor-v2/materials/useModuleMaterials.ts";

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

const { module, objectData, visualizationRef, UMconstructor } = toRefs(props);
const modelState = useModelState();
const productData = ref(null);

const panelRef = ref<HTMLElement | null>(null);

const emit = defineEmits(["product-reset", "eccentric-action"]);

// Части, списки материалов и запись выбора — общая логика с редактором v2.
const {
  currentPart: currentOption,
  materialList,
  elementSize,
  toptableMode,
  materialParts,
  currentValue: getCurrentValue,
  useAdvancedRedactor: getCurrentRedactor,
  openPart: getOption,
  closePart: closeMenu,
  selectMaterial: selectOption,
} = useModuleMaterials({
  getEngine: () => UMconstructor.value,
  getModule: () => module.value,
  getProductData: () => objectData.value,
  onChange: () => emit("eccentric-action"),
});

const reset = () => {
  UMconstructor?.value?.reset();
};

const handleOutsideClick = (event: MouseEvent) => {
  // Закрываем только когда меню реально открыто
  if (!currentOption.value) return;

  const panel = panelRef.value;
  if (!panel) return;

  const target = event.target;
  if (!(target instanceof Node)) return;

  // Клик внутри окна - ничего не делаем
  if (panel.contains(target)) return;

  closeMenu();
};

const getSideProfile = computed(() => {
  return module.value.profilesConfig?.sideProfile || false;
});

// Сторону профиля выбирает пользователь, только пока петли крайних секций не заняли
// ни одну из стенок. Иначе она задана петлями и показывается заголовком
const profileSideSelectable = computed(() => {
  return !!getSideProfile.value && UMconstructor.value.PROFILES.isSideSelectable(module.value);
});

const isProfileRight = computed({
  get: () => getSideProfile.value?.side === "right",
  set: (value: boolean) => {
    UMconstructor.value.PROFILES.setManualSide(value ? "right" : "left", module.value);
    reset();
  },
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
  modelState.createCurrentBackwallData(objectData.value.PRODUCT, UMconstructor.value.UM_STORE.onWallModule);
  modelState.createCurrentSidewallData(objectData.value.PRODUCT);
  productData.value = UMconstructor?.value?.UM_STORE.getUMData();
  elementSize.value = false;

  // Закрытие при клике вне зоны панели
  document.addEventListener("click", handleOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleOutsideClick);
});
</script>

<template>
  <div class="UM actions-wrapper">
    <div :class="'UM actions-items--container'">
      <div class="UM config-options">
        <div v-for="(value, part) in materialParts" :key="part" class="UM option-small">
          <div :class="[
            'UM option-small-item',
            { active: currentOption === part },
          ]" @click.stop="getOption(part)">
            {{ partsNames[part] }}

            <div :class="[
              'UM option-small-item-chevron',
              { active: currentOption === part },
            ]">
              ❯
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <transition name="slide--left" mode="out-in">
    <div class="UM color--left" v-if="currentOption" key="color--left-select" ref="panelRef">
      <div class="UM color--left-select" key="color--left-select">
        <h1 class="UM color__title">{{ partsNames[currentOption] }}</h1>
        <ClosePopUpButton class="UM menu__close" @close="closeMenu()" />


        <div class="color__switch" v-if="currentOption === 'PROFILECOLOR' && getSideProfile">
          <p class="color__switch__label">Расположение бокового профиля</p>
          <template v-if="profileSideSelectable">
            <h1 :class="['color__switch__text', { active: !isProfileRight }]">
              Слева
            </h1>
            <Toggle v-model="isProfileRight" />
            <h1 :class="['color__switch__text', { active: isProfileRight }]">
              Справа
            </h1>
          </template>
          <h1 v-else class="color__switch__text active">
            {{ isProfileRight ? "Справа" : "Слева" }} — напротив петель
          </h1>
        </div>

        <!-- <p class="UM color__title color__switch" v-if="currentOption === 'PROFILECOLOR'">
          Профили в размер секции
          <Toggle v-model="module.profilesConfig.onSectionSize"
            @change="changeProfilesWidth(module.profilesConfig.onSectionSize)" />
        </p> -->

        <div class="color__switch" v-if="currentOption === 'TOPFASADECOLOR'">
          <h1 :class="['color__switch__text', { active: !toptableMode }]">
            Накладка
          </h1>
          <!-- <Toggle v-model="toptableMode" @change="changeTopMaterialsList(toptableMode)" />
          <h1 :class="['color__switch__text', { active: toptableMode }]">
            Столешница
          </h1> -->
        </div>

        <div v-if="currentOption === 'TOPFASADECOLOR' && toptableMode">
          <ToptableSelector :product-list="materialList" :module="module" :UMconstructor="UMconstructor" :type="`TABLE`"
            @parent-callback="selectOption" />
        </div>
        <div v-else>
          <AdvanceCorpusMaterialRedactor class="color--left-select-item" v-if="getCurrentRedactor" :key="currentOption"
            :element-data="getCurrentValue" :element-index="currentOption" :material-list="materialList"
            :no-glass="currentOption === 'LEFTSIDECOLOR' || currentOption === 'RIGHTSIDECOLOR' || currentOption === 'TOPFASADECOLOR'"
            :fasade-size="elementSize" @parent-callback="selectOption" @select_material="emit('eccentric-action')" />
          <CorpusMaterialRedactor v-else class="color--left-select-item" :is2Dconstructor="true"
            :material-list="materialList" :type="currentOption === 'BACKWALL' ? 'backwall' : 'surface'"
            @parent-callback="selectOption" />
        </div>

        <HiTechSideprofile v-if="currentOption === 'PROFILECOLOR' && getSideProfile" class="color--left-select-item"
          :module="module" />
      </div>
    </div>
  </transition>
</template>

<style scoped lang="scss">
.color__switch {
  display: flex;
  border: 1px solid #ecebf1;
  border-radius: 10px;
  padding: 10px 15px;
  flex-direction: row;
  align-items: center;
  align-content: center;
  flex-wrap: wrap;
  justify-content: space-evenly;

  &__text {
    color: #a3a9b5;

    &.active {
      color: #da444c;
    }
  }

  &__label {
    flex-basis: 100%;
    margin-bottom: 0.5rem;
    text-align: center;
  }
}

.container {
  max-height: calc(var(--modal-large-height) - 115px)
}
</style>
