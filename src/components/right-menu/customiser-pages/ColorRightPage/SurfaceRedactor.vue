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
    console.log('jjj', data)
    return;
  }

  console.log(data, "==== ❌ Параметры выбранного фасада ❌ ====");

  const productId = productData.value.PROPS.PRODUCT;
  let { ID, NAME, DETAIL_PICTURE, PREVIEW_PICTURE, MATERIAL, PATINA } = data;

  modelState.createCurrentPaletteData(ID);
  modelState.createCurrentMillingData({ fasadeId: ID, productId, fasadeNdx });
  modelState.createCurrentShowcaseData({ fasadeId: ID, productId, fasadeNdx });
  modelState.createCurrentPatinaData({ fasadeId: ID, productId });
  modelState.createCurrentGlassData({ fasadeId: ID, productId });
  modelState.createCurrentFasadeTypesData({ fasadeId: ID, productId });

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
    reg.test(_FASADE[id].NAME.toLowerCase())
  );

  filteredMaterialList.value = filteredData;
  if (e.target.value === "") filteredMaterialList.value = [];
};

const checkTransitionTexture = (id: number) => {
  const prepare = modelState.getCurrentModelFasadesData.filter(
    (el) => el.NAME === "Шпон Вардек 19мм"
  );

  if (prepare.length == 0) return false;

  const start = prepare[0].FASADES;

  if (!start) return false;
  return start.includes(id);
};
</script>

<template>
  <div class="relative__wrapper">
    <input
      class="search"
      type="text"
      placeholder="Поиск"
      @input="onSearchChange"
    />

    <ul class="list">
      <!-- Все возможные материалы -->
      <li
        v-if="!isSearch"
        v-for="materials in props.materialList"
        class="list__details"
      >
        <Accordion>
          <template #title>
            <p>{{ materials.NAME }}</p>
          </template>
          <ul class="list__details_contant">
            <li v-for="id in materials.FASADES">
              <div
                class="item"
                @click="changeFasadeTexture(_FASADE[id], id, props.tabIndex)"
              >
                <img
                  class="item__img"
                  :src="_URL + _FASADE[id].PREVIEW_PICTURE"
                  alt=""
                />
                <div class="item__name">
                  <p>{{ _FASADE[id].NAME }}</p>
                </div>
              </div>
            </li>
          </ul>
        </Accordion>
      </li>
      <!--

      -->
      <!-- отфильтрованные материалы-->
      <ul v-else v-for="id in filteredMaterialList">
        <li
          class="item"
          @click="changeFasadeTexture(_FASADE[id], id, props.tabIndex)"
        >
          <img
            class="item__img"
            :src="_URL + _FASADE[id].PREVIEW_PICTURE"
            alt=""
          />
          <div class="item__name">
            <p>{{ _FASADE[id].NAME }}</p>
          </div>
        </li>
      </ul>
    </ul>
  </div>
</template>

<style scoped lang="scss">

.relative__wrapper {
  display: flex;
  flex-direction: column;
  position: relative;
  max-height: 100vh;
  overflow: hidden;
  margin-right: 0px;
  border: 1px solid grey;
  border-radius: 15px;
  padding: 10px 10px 0px 10px;
}

.search {
  width: 95%;
  border-radius: 15px;
  padding: 10px 15px;
}

.list {
  height: 100%;
  max-height: calc(85vh - 110px);
  margin-top: 10px;
  padding-right: 10px;
  box-sizing: border-box;
  overflow-y: scroll;
  box-sizing: border-box;

  &__details {
    border-radius: 15px;

    @media (hover: hover) {
      &:hover {
        background: $bg;
      }
    }
  }
}

.item {
  display: flex;
  flex-direction: row;
  align-items: center;
  cursor: pointer;
  padding: 10px;
  // height: 60px;
  border-radius: 15px;
  background-color: $bg;
  margin-top: 10px;
  margin-right: 8px;
  transition-property: background-color;
  transition-duration: 0.25s;
  transition-timing-function: ease;

  &__img {
    height: 60px;
    padding: 5px;
    border-radius: 15px;
    background-color: $white;
    // margin-left: 10px;
  }

  &__name {
    margin-left: 30px;
  }
  @media (hover: hover) {
    &:hover {
      background-color: $stroke;
    }
  }
}
</style>

<!-- .search { position: absolute; top: 10px; height: 40px; width: 95%;
border-radius: 5px; padding-left: 15px; } .list { overflow: scroll; height:
100%; margin-top: 40px; padding-right: 10px; &__details { &_contant {
margin-top: 10px; } } } .list { position: relative; &::-webkit-scrollbar {
width: 5px; } &::-webkit-scrollbar-thumb { background-color: #888; /* Color of
the thumb */ border-radius: 5px; /* Rounded corners */ } } .item { display:
flex; flex-direction: row; align-items: center; cursor: pointer; height: 60px;
border-radius: 15px; background-color: #e7e7e7; margin-bottom: 4px; &__img {
height: 45px; width: 45px; border-radius: 10px; margin-left: 10px; padding: 5px;
background-color: $white; } &__name { margin-left: 30px; } } -->
