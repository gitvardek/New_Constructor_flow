<script lang="ts" setup>
// @ts-nocheck 31

import {
  defineProps,
  defineEmits,
  computed,
  ref,
  onMounted,
  onBeforeMount,
  withDefaults,
} from "vue";
import { useModelState } from "@/store/appliction/useModelState";
import { useAppData } from "@/store/appliction/useAppData";
import { useEventBus } from "@/store/appliction/useEventBus";
import { _URL } from "@/types/constants";


import Accordion from "@/components/ui/accordion/Accordion.vue";
import Tooltip from "@/components/ui/tooltip/Tooltip.vue";
import { TTotalProps } from "@/types/types";
type TSurface = "fasade" | "module";

interface IProps {
  tabIndex?: number;
  materialList: number[];
  tempWork?: boolean;
  type?: TSurface;
}

const props = withDefaults(defineProps<IProps>(), {
  tempWork: false,
  type: "fasade",
});

// const props = defineProps({
//   tabIndex: {
//     type: Number,
//     required: false,
//   },
//   materialList: Array,
//   tempWork: {
//     type: Boolean,
//     default: false,
//   },
// });

onBeforeMount(() => {
  if (modelState.getCurrentModel) {
    productData.value = modelState.getCurrentModel.userData;
  }
});

// const emit = defineEmits(["select_material", "select"]);
const emit = defineEmits<{
  (e: "update:modelValue", value: any): void;
  (e: "select", value: any): void;
  (e: "select_material", value: any): void;
}>();

const modelState = useModelState();
const eventBus = useEventBus();

// console.log(modelState.getCurrentModel);
const productData = ref(null);

const _APP = useAppData().getAppData;
const _FASADE = _APP.FASADE;

const totalMaterialList = computed(() => {
  // разворачивание основного двумерного массива для функции поиска
  let arr = [];
  props.materialList.forEach((list) => {
    arr.push(list.FASADES);
  });
  let result = arr.flat();
  return result;
});

const filteredMaterialList = ref<Array>([]); // отфильтрованный массив поиска
const isSearch = computed(() => {
  return filteredMaterialList.value.length > 0 ? true : false;
});

const changeFasadeTexture = (data: { [key: string]: any }, id, fasadeNdx) => {
  if (props.tempWork) {
    emit("select_material", data);
    return;
  }

  if (props.type == "module") {
    emit("select", data);
    return;
  }

  // console.log(data, "==== ❌ Параметры выбранного фасада ❌ ====");

  const { PRODUCT, CONFIG, FASADE } = productData.value.PROPS as TTotalProps;
  const { FASADE_PROPS } = CONFIG;
  const { MILLING_CONVERSATION } = FASADE_PROPS[fasadeNdx];
  const { trueSize } = FASADE[fasadeNdx].userData;

  console.log(trueSize, "--trueSize");
  let { ID, NAME, DETAIL_PICTURE, PREVIEW_PICTURE, MATERIAL, PATINA } = data;

  modelState.createCurrentPaletteData(ID);
  modelState.createCurrentMillingData({
    fasadeId: ID,
    productId: PRODUCT,
    fasadeNdx,
    fasadeSize: trueSize,
  });
  modelState.createCurrentShowcaseData({
    fasadeId: ID,
    productId: PRODUCT,
    fasadeNdx,
  });
  modelState.createCurrentPatinaData({ fasadeId: ID, productId: PRODUCT });
  modelState.createCurrentGlassData({ fasadeId: ID, productId: PRODUCT });
  modelState.createCurrentFasadeTypesData({ fasadeId: ID, productId: PRODUCT });

  const transitionT = checkTransitionTexture(data.ID);

  emit("select_material", {
    id: ID,
    name: NAME,
    imgSrc: PREVIEW_PICTURE,
    transitionT,
    material: MATERIAL,
    patinaList: PATINA,
  });

  eventBus.emit("A:ChangeFasade", { data, fasadeNdx });
};

const onSearchChange = (e) => {
  let reg = new RegExp(`${e.target.value.toLowerCase()}`, "g");
  let filteredData = totalMaterialList.value.filter((id) =>
    reg.test(_FASADE[id].NAME.toLowerCase()),
  );

  filteredMaterialList.value = filteredData;
  if (e.target.value === "") filteredMaterialList.value = [];
};

const checkTransitionTexture = (id: number) => {
  const prepare = modelState.getCurrentModelFasadesData.filter(
    (el) => el.NAME === "Шпон Вардек 19мм",
  );

  if (prepare.length == 0) return false;

  const start = prepare[0].FASADES;

  if (!start) return false;
  return start.includes(id);
};
</script>

<template>
  <div class="material-config__wrapper">
    <input class="search" type="text" placeholder="Поиск" @input="onSearchChange" />

    <ul class="material-config_list">
      <!-- Все возможные материалы -->
      <li v-if="!isSearch" v-for="materials in props.materialList" class="material-config_list__details">
        <div>
          <h3 class="material-config_title">{{ materials.NAME }}</h3>
        </div>
        <ul class="material-config_list__details_content">
          <li class="material-config_item" v-for="(id, index) in materials.FASADES" :key="index">
            <Tooltip :position="top" :theme="'dark'">
              <template #trigger>
                <div @click="changeFasadeTexture(_FASADE[id], id, props.tabIndex)">
                  <img class="material-config_item__img" :src="_URL + _FASADE[id].PREVIEW_PICTURE" alt="" />
                </div>
              </template>
              <template #content>
                <div class="material-config_item__tool">
                  <img class="material-config_item__img tool" :src="_URL + _FASADE[id].DETAIL_PICTURE" alt="" />
                  <p>{{ _FASADE[id].NAME }}</p>
                </div>
              </template>

            </Tooltip>
          </li>

        </ul>

      </li>

      <!-- отфильтрованные материалы-->
      <Tooltip v-else v-for="(id, index) in filteredMaterialList" :key="index" :position="top" :theme="'dark'">
        <template #trigger>
          <li>
            <div class="material-config_item" @click="changeFasadeTexture(_FASADE[id], id, props.tabIndex)">
              <img class="material-config_item__img" :src="_URL + _FASADE[id].PREVIEW_PICTURE" alt="" />

            </div>
          </li>
        </template>
        <template #content>
          <div class="material-config_item__tool">
            <img class="material-config_item__img tool" :src="_URL + _FASADE[id].DETAIL_PICTURE" alt="" />
            <p>{{ _FASADE[id].NAME }}</p>
          </div>
        </template>
      </Tooltip>
    </ul>
  </div>
</template>

<style scoped lang="scss">

</style>
