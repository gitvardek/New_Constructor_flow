<script lang="ts" setup>
//@ts-nocheck
import MaterialSelector from "@/components/right-menu/customiser-pages/ColorRightPage/MaterialSelector.vue";
import ConfigurationOption from "@/components/right-menu/customiser-pages/ColorRightPage/ConfigurationOption.vue";
import {
  ref,
  onMounted,
  onBeforeMount,
  watch,
  toRefs,
  defineExpose,
} from "vue";
import { useModelState } from "@/store/appliction/useModelState.ts";
import { useEventBus } from "@/store/appliction/useEventBus.ts";
import {useAppData} from "@/store/appliction/useAppData.ts";
import * as THREE from "three";

const modelState = useModelState();
const eventBus = useEventBus();
const APP = useAppData().getAppData;

const props = defineProps({
  module: {
    type: Object,
    default: {},
    required: true,
  },
});

const materialList = ref([]);
const selectedProfileID = ref(null);

const currentSurfaceData = ref<any>({});

const emit = defineEmits(["parent-callback"]);

const callback = (material) => {
  emit("parent-callback", material, 'SIDEPROFILE');
};

onBeforeMount(() => {

  const sidPprofileInfo = props.module.profilesConfig?.sideProfile;
  selectedProfileID.value = sidPprofileInfo?.product || null;

  const products = APP.PRODUCTS_TYPES[6520633].PRODUCTS
  const aprovedProducts = APP.CATALOG.PRODUCTS

  let tmpl = []
  for (let product of products) {
    if (aprovedProducts[product])
      tmpl.push(aprovedProducts[product])
  }
  materialList.value = tmpl
});

onMounted(() => {
  const sidPprofileInfo = props.module.profilesConfig?.sideProfile;
  selectedProfileID.value = sidPprofileInfo?.product || null;

  const current = materialList.value!.find(
      (m) => m.ID === selectedProfileID.value
  );

  if (current) {
    currentSurfaceData.value = {
      name: current.NAME,
      imgSrc: current.DETAIL_PICTURE || current.PREVIEW_PICTURE,
    };
  }
});

const changeProfile = (data: any) => {
  currentSurfaceData.value = {
    name: data.NAME,
    imgSrc: data.DETAIL_PICTURE || data.PREVIEW_PICTURE,
  };

  let typeProfile = data.NAME.toLowerCase().split("-")[0].replace(/\s/g, '')
  if (typeProfile !== "c" && typeProfile !== "l")
    typeProfile = typeProfile.split(",").pop().replace(/\s/g, '')

  props.module.profilesConfig.sideProfile.TYPE_PROFILE = typeProfile
  props.module.profilesConfig.sideProfile.offsetFasades = typeProfile == "c" ? 36 : typeProfile == "l" ? 38 : 0
  props.module.profilesConfig.sideProfile.manufacturerOffset = typeProfile == "c" ? -18.5 : -19.5//typeProfile == "l" ? -19.5 : 0
  props.module.profilesConfig.sideProfile.size = {x: props.module.height, y: data.height, z: data.depth}
  props.module.profilesConfig.sideProfile.product = data.ID
};

</script>

<template>
  <div class="container container">
    <h1 class="color__title">Боковой профиль</h1>

    <div class="configuration">
      <ConfigurationOption
          :type="'profile'"
          :data="currentSurfaceData"
      />
    </div>

    <MaterialSelector :materials="materialList" @select="changeProfile" />
  </div>
</template>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  gap: 15px;
  border: 1px solid $stroke;
  border-radius: 10px;
  padding: 15px;
  max-height: 100vh;
  overflow: hidden;
  box-sizing: border-box;

  &__title {
    font-size: large;
    font-weight: 600;
  }
}

.configuration {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 8px;

  &__item {
    height: 50px;
    border: 1px solid grey;
    border-radius: 5px;
  }

  @media (min-height: 1000px) {
    gap: 17px;
  }
}
</style>
