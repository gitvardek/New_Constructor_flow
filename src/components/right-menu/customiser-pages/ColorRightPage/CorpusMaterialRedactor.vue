<script lang="ts" setup>
//@ts-nocheck

import {
  ref,
  onMounted,
  onBeforeMount,
  watch,
  toRefs,
  defineExpose,
} from "vue";
import { useModelState } from "@/store/appliction/useModelState";
import { useEventBus } from "@/store/appliction/useEventBus";

import Accordion from "@/components/ui/accordion/Accordion.vue";
import MaterialSelector from "./MaterialSelector.vue";
import SurfaceRedactor from "./SurfaceRedactor.vue";
import ConfigurationOption from "./ConfigurationOption.vue";

const modelState = useModelState();
const eventBus = useEventBus();
interface IProps {
  materialList: [];
  is2Dconstructor?: boolean;
  isNisha?: boolean;
  type?: string;
}

const props = withDefaults(defineProps<IProps>(), {
  is2Dconstructor: false,
  type: "surface",
  isNisha: false,
});

const materialList = ref(null);
const selectedSurfaceID = ref(null);

const currentSurfaceData = ref<any>({});
const isMillingExist = ref(false);
// const currentMillingData = ref(null);

const { is2Dconstructor } = toRefs(props);

const emit = defineEmits(["parent-callback"]);

const callback = (material) => {
  emit("parent-callback", material, "COLOR");
};

onBeforeMount(() => {
  if (props.type === "backwall") {
    selectedSurfaceID.value =
      modelState.getCurrentModel.userData.PROPS.CONFIG.BACKWALL?.COLOR;
    return;
  }

  selectedSurfaceID.value =
    modelState.getCurrentModel.userData.PROPS.CONFIG.MODULE_COLOR;
});

const prepareData = () => {
  const source = props.isNisha
    ? modelState._WALL?.[selectedSurfaceID.value]
    : modelState._FASADE?.[selectedSurfaceID.value];

  materialList.value = props.materialList?.length ? props.materialList : modelState.getCurrentModuleData;

  currentSurfaceData.value = {
    name: source?.NAME ?? '',
    imgSrc: source?.DETAIL_PICTURE ?? '',
  };
}

// const prepareData = () => {

//   const { NAME, DETAIL_PICTURE } = props.isNisha
//       ? modelState._WALL[selectedSurfaceID.value]
//       : modelState._FASADE[selectedSurfaceID.value];
//   materialList.value = props.materialList?.length ? props.materialList : modelState.getCurrentModuleData;

//   currentSurfaceData.value = {
//     name: NAME,
//     imgSrc: DETAIL_PICTURE,
//   };
// }

onMounted(() => {
  prepareData();
});

const changeModuleTexture = (data: any) => {
  currentSurfaceData.value = {
    name: data.NAME,
    imgSrc: data.DETAIL_PICTURE,
  };

  if (!is2Dconstructor.value) {
    eventBus.emit("A:ChangeModuleTexture", data);
  } else {
    callback(data);
  }
};

const deleteSelectedOptions = (type: string) => {
  if (type === "backwall" && is2Dconstructor.value) {
    currentSurfaceData.value = {
      name: "",
      imgSrc: "",
    };
    callback(false);
  } else {
    const fallback = modelState._FASADE[materialList.value![0].FASADES[0]];
    currentSurfaceData.value = {
      name: fallback.NAME,
      imgSrc: fallback.PREVIEW_PICTURE,
    };

    eventBus.emit("A:ChangeModuleTexture", fallback);
  }
};

watch(() => props.type, () => {
  if (props.type === "backwall")
    selectedSurfaceID.value =
      modelState.getCurrentModel.userData.PROPS.CONFIG.BACKWALL?.COLOR;
  else
    selectedSurfaceID.value =
      modelState.getCurrentModel.userData.PROPS.CONFIG.MODULE_COLOR;

  prepareData()
})
</script>

<template>
  <div class="container" v-if="!is2Dconstructor">
    <h2 class="container__title">Конфигурация корпуса</h2>
    <div class="configuration">
      <ConfigurationOption :type="'surface'" :data="currentSurfaceData" @delete-choise="deleteSelectedOptions" />
      <!-- <ConfigurationOption
        v-if="isMillingExist"
        :type="'milling'"
        :data="currentMillingData"
        @delete-choise="deleteSelectedOptions"
      /> -->
    </div>
    <SurfaceRedactor :materialList="props.materialList" :type="'module'" @select="changeModuleTexture"
      v-if="!isNisha" />
    <MaterialSelector :materials="props.materialList" @select="changeModuleTexture" v-if="isNisha" />
  </div>

  <div class="container container--2D-constructor" v-else>
    <div class="configuration">
      <ConfigurationOption :type="props.type" :data="currentSurfaceData" @delete-choise="deleteSelectedOptions" />
      <!-- <ConfigurationOption
        v-if="isMillingExist"
        :type="'milling'"
        :data="currentMillingData"
        @delete-choise="deleteSelectedOptions"
      /> -->
    </div>

    <SurfaceRedactor v-if="props.type === 'surface' || props.type === 'backwall'" :materialList="props.materialList"
      :type="'module'" @select="changeModuleTexture" />

    <MaterialSelector v-else :materials="props.materialList" @select="changeModuleTexture" />
  </div>
</template>

<style lang="scss">
.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border: 1px solid $stroke;
  border-radius: 10px;
  padding: 5px;
  max-height: 100vh;
  overflow: hidden;
  box-sizing: border-box;

  &__title {
    font-size: large;
    font-weight: 600;
  }

  &--2D-constructor {
    border: unset;
    padding: 0;
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
