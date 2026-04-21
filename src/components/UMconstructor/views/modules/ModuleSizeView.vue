<script setup lang="ts">
//@ts-nocheck

import "@/components/UMconstructor/styles/UM.scss"

import MainInput from "@/components/ui/inputs/MainInput.vue";
import Toggle from "@vueform/toggle";
import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import {onMounted, ref, toRefs, watch, computed, onBeforeMount} from "vue";
import {TTotalProps} from "@/types/types.ts";
import {useModelState} from "@/store/appliction/useModelState.ts";

const props = defineProps({
  module: {
    type: Object,
    required: true,
  },
  mode: {
    type: String,
    default: "module",
  },
  UMconstructor: {
    type: UMconstructorClass,
    required: true,
  },
  productData: {
    type: ref<TTotalProps>,
    required: true,
  }
});

const {module, mode, UMconstructor, productData} = toRefs(props)
const totalHeight = ref<number>(0);
const totalWidth = ref<number>(0);
const totalDepth = ref<number>(0);
const onHorizont = ref<boolean>(true);
const onSideProfile = ref<boolean>(false);
const noBottom = ref<boolean>(false);
const onWallModule = ref<boolean>(false);
const noLoops = ref<boolean>(false);
const noBackwall = ref<boolean>(false);
const modelState = useModelState();

const fillingExist = computed(() => {
  if(UMconstructor?.value && module.value)
    return UMconstructor.value.FILLINGS.existFilling(module.value)
  else
    return false
})

const updateTotalSize = (dimensions: string, value: number, event: Event) => {
  switch (dimensions) {
    case "totalHeight":
      totalHeight.value = value;
      UMconstructor?.value?.updateTotalHeight(value, event);
      break;
    case "totalWidth":
      totalWidth.value = value;
      UMconstructor?.value?.updateTotalWidth(value);
      break;
    case "totalDepth":
      totalDepth.value = value;
      UMconstructor?.value?.updateTotalDepth(value);
      break;
    case "horizont":
      UMconstructor?.value?.updateHorizont(value);
      break;
    default:
        break;
  }
}

const horizontToggle = (value: boolean) => {
  if (value) {
    updateTotalSize("horizont", 78)
  }
  else {
    updateTotalSize("horizont", 0)
  }
  UMconstructor.value.UM_STORE.onHorizont = value
}

watch(() => UMconstructor?.value?.UM_STORE.onHorizont, () => {
  if(onHorizont.value !== UMconstructor.value.UM_STORE.onHorizont) {
    onHorizont.value = UMconstructor.value.UM_STORE.onHorizont
    horizontToggle(onHorizont.value)
  }
})

watch(() => UMconstructor?.value?.UM_STORE.noBottom, () => {
  if(noBottom.value !== UMconstructor.value.UM_STORE.noBottom) {
    noBottom.value = UMconstructor.value.UM_STORE.noBottom

    if(noBottom.value)
      module.value.noBottom = noBottom.value
    else
      delete module.value.noBottom

    if(UMconstructor.value.UM_STORE.noBottom){
      UMconstructor.value.callAlert("warning", "Задняя удалена!")
    }

    UMconstructor.value.reset(module.value)
  }
})

watch(() => UMconstructor?.value?.UM_STORE.onWallModule, () => {
  if(onWallModule.value !== UMconstructor.value.UM_STORE.onWallModule) {
    onWallModule.value = UMconstructor.value.UM_STORE.onWallModule

    if(onWallModule.value)
      module.value.onWallModule = onWallModule.value
    else
      delete module.value.onWallModule

    let currentBackwallData = modelState.getCurrentBackwallData;
    if(UMconstructor.value.UM_STORE.onWallModule && currentBackwallData.length > 0){
      UMconstructor.value.callAlert("warning", "Задняя стенка изменена!")
      UMconstructor.value.callAlert("warning", "Навесной модуль может иметь только заднюю стенку ХДФ!")
    }

    UMconstructor.value.reset(module.value)
  }
})

watch(() => UMconstructor?.value?.UM_STORE.noLoops, () => {
  if(noLoops.value !== UMconstructor.value.UM_STORE.noLoops) {
    noLoops.value = UMconstructor.value.UM_STORE.noLoops

    if(noLoops.value)
      module.value.noLoops = noLoops.value
    else
      delete module.value.noLoops

    UMconstructor.value.reset(module.value)
  }
})

watch(() => UMconstructor?.value?.UM_STORE.noBackwall, () => {
  if(noBackwall.value !== UMconstructor.value.UM_STORE.noBackwall) {
    noBackwall.value = UMconstructor.value.UM_STORE.noBackwall

    if(noBackwall.value)
      module.value.noBackwall = noBackwall.value
    else
      delete module.value.noBackwall

    UMconstructor.value.reset(module.value)
  }
})

watch(() => UMconstructor?.value?.UM_STORE.onSideProfile, () => {
  if(onSideProfile.value !== UMconstructor.value.UM_STORE.onSideProfile) {
    onSideProfile.value = UMconstructor.value.UM_STORE.onSideProfile
    UMconstructor.value.reset(module.value)
  }
})

onBeforeMount(() => {
  if(UMconstructor?.value?.UM_STORE) {
    totalHeight.value = UMconstructor.value.UM_STORE.totalHeight
    totalWidth.value = UMconstructor.value.UM_STORE.totalWidth
    totalDepth.value = UMconstructor.value.UM_STORE.totalDepth
    onHorizont.value = UMconstructor.value.UM_STORE.onHorizont
    onSideProfile.value = UMconstructor.value.UM_STORE.onSideProfile
    noBottom.value = UMconstructor.value.UM_STORE.noBottom
  }
})

onMounted(() => {
  if(UMconstructor?.value?.UM_STORE) {
    totalHeight.value = UMconstructor.value.UM_STORE.totalHeight
    totalWidth.value = UMconstructor.value.UM_STORE.totalWidth
    totalDepth.value = UMconstructor.value.UM_STORE.totalDepth
    onHorizont.value = UMconstructor.value.UM_STORE.onHorizont
    onSideProfile.value = UMconstructor.value.UM_STORE.onSideProfile
    noBottom.value = UMconstructor.value.UM_STORE.noBottom
  }
})

</script>

<template>
<div v-if="productData">
  <div class="UM no-select actions-sections-header">
    <h1>Размеры модуля</h1>
  </div>

  <div
      class="UM constructor2d-container--left--module-configs--module-size"
  >

    <div class="UM constructor2d-container--left--module-configs--module-size-item actions-inputs">
      <p class="UM no-select actions-title">Высота
        <img v-if="mode !== 'module'" class="cut-icon" src="/icons/lock.svg" alt="" title="Редактирование размеров доступно только в режиме 'Модуль'" />
        <img v-else-if="fillingExist" class="cut-icon" src="/icons/lock.svg" alt="" title="Редактирование размеров недоступно при наличии наполнения" />
      </p>
      <p class="UM no-select item__label text-grey">
        Мин: {{ UMconstructor.getMinMaxModuleSize(productData, 'height', 'min') ?? "н/о" }}
      </p>
      <p class="UM no-select item__label text-grey">
        Макс: {{ UMconstructor.getMinMaxModuleSize(productData, 'height', 'max') ?? "н/о" }}
      </p>
      <div class="UM actions-input--container">
        <MainInput
            :disabled="mode !== 'module' || fillingExist"
            @update:modelValue="(value: number) => updateTotalSize('totalHeight', value, $event)"
            :inputClass="'actions-input'"
            :modelValue="totalHeight"
            :min="UMconstructor.getMinMaxModuleSize(productData, 'height', 'min')"
            :max="UMconstructor.getMinMaxModuleSize(productData, 'height', 'max')"
            :type="'number'"
            :isUM="true"
        />
      </div>
    </div>

    <div class="UM constructor2d-container--left--module-configs--module-size-item actions-inputs">
      <p class="UM no-select actions-title">Ширина
        <img v-if="mode !== 'module'" class="cut-icon" src="/icons/lock.svg" alt="" title="Редактирование размеров доступно только в режиме 'Модуль'" />
        <img v-else-if="fillingExist" class="cut-icon" src="/icons/lock.svg" alt="" title="Редактирование размеров недоступно при наличии наполнения" />
      </p>
      <p class="UM no-select item__label text-grey">
        Мин: {{ UMconstructor.getMinMaxModuleSize(productData, 'width', 'min') ?? "н/о" }}
      </p>
      <p class="UM no-select item__label text-grey">
        Макс: {{ UMconstructor.getMinMaxModuleSize(productData, 'width', 'max') ?? "н/о" }}
      </p>
      <div class="UM actions-input--container">
        <MainInput
            :disabled="mode !== 'module' || fillingExist"
            @update:modelValue="(value: number) => updateTotalSize('totalWidth', value)"
            :inputClass="'UM actions-input'"
            :modelValue="totalWidth"
            :min="UMconstructor.getMinMaxModuleSize(productData, 'width', 'min')"
            :max="UMconstructor.getMinMaxModuleSize(productData, 'width', 'max')"
            :type="'number'"
            :isUM="true"
        />
      </div>
    </div>

    <div class="UM constructor2d-container--left--module-configs--module-size-item actions-inputs">
      <p class="UM no-select actions-title">Глубина
        <img v-if="mode !== 'module'" class="cut-icon" src="/icons/lock.svg" alt="" title="Редактирование размеров доступно только в режиме 'Модуль'" />
        <img v-else-if="fillingExist" class="cut-icon" src="/icons/lock.svg" alt="" title="Редактирование размеров недоступно при наличии наполнения" />
      </p>
      <p class="UM no-select item__label text-grey">
        Мин: {{ UMconstructor.getMinMaxModuleSize(productData, 'depth', 'min') ?? "н/о" }}
      </p>
      <p class="UM no-select item__label text-grey">
        Макс: {{ UMconstructor.getMinMaxModuleSize(productData, 'depth', 'max') ?? "н/о" }}
      </p>
      <div class="UM actions-input--container">
        <MainInput
            :disabled="mode !== 'module' || fillingExist"
            @update:modelValue="(value: number) => updateTotalSize('totalDepth', value)"
            :inputClass="'UM actions-input'"
            :modelValue="totalDepth"
            :min="UMconstructor.getMinMaxModuleSize(productData, 'depth', 'min')"
            :max="UMconstructor.getMinMaxModuleSize(productData, 'depth', 'max')"
            :type="'number'"
            :isUM="true"
        />
      </div>
    </div>

    <div
        v-if="!module.isRestrictedModule"
        class="UM constructor2d-container--left--module-configs--module-size-item actions-inputs"
    >
      <p class="UM no-select actions-title">Цоколь
        <img v-if="mode !== 'module' || noBottom || onWallModule" class="cut-icon" src="/icons/lock.svg" alt="" title="Редактирование заблокировано режимом работы или опцией!" />
        <Toggle v-else v-model="onHorizont" @change="horizontToggle"/>
      </p>

      <p v-if="!noBottom" class="no-select item__label text-grey">
        Мин: 50
      </p>
      <p v-if="!noBottom" class="no-select item__label text-grey">
        Макс: 300
      </p>

      <div class="actions-input--container">
        <MainInput
            @update:modelValue="(value: number) => updateTotalSize('horizont', value)"
            :inputClass="'actions-input'"
            :modelValue="productData.CONFIG.EXPRESSIONS['#HORIZONT#']"
            min="50"
            max="300"
            :type="'number'"
            placeholder="0"
            :disabled="mode !== 'module' || productData.CONFIG.EXPRESSIONS['#HORIZONT#'] === 0 || noBottom || onWallModule"
            :isUM="true"
        />
      </div>
    </div>

    <div
        v-if="productData.CONFIG.isHiTech"
        class="constructor2d-container--left--module-configs--module-size-item actions-inputs"
    >
      <p class="actions-title">Боковой профиль</p>
      <img v-if="module.sections?.[0]?.hiTechProfiles?.length" class="cut-icon" src="/icons/lock.svg" alt="" title="Нельзя добавить боковой профиль вместе с горизонтальными!" />
      <Toggle
          v-else
          v-model="onSideProfile"
          @change="() => UMconstructor.initSideProfile(module)"
      />
    </div>

  </div>
</div>
</template>

<style scoped lang="scss">

</style>