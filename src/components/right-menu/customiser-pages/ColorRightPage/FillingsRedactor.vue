<script lang="ts" setup>
// @ts-nocheck 31

import {
  defineProps,
  defineEmits,
  computed,
  ref,
  onBeforeMount,
  withDefaults,
} from "vue";
import { useModelState } from "@/store/appliction/useModelState";
import { useEventBus } from "@/store/appliction/useEventBus";
import { _URL } from "@/types/constants";

import Accordion from "@/components/ui/accordion/Accordion.vue";
import Tooltip from "@/components/ui/tooltip/Tooltip.vue";

interface IProps {
  productList: number[];
  tempWork?: boolean;
}

const props = withDefaults(defineProps<IProps>(), {
  tempWork: false,
});

onBeforeMount(() => {
  if (modelState.getCurrentModel) {
    productData.value = modelState.getCurrentModel.userData;
  }
});

// const emit = defineEmits(["select_material", "select"]);
const emit = defineEmits<{
  (e: "parent-callback", value: any): void;
}>();

const modelState = useModelState();
const eventBus = useEventBus();
const productData = ref(null);

const totalMaterialList = computed(() => {
  // разворачивание основного двумерного массива для функции поиска
  let arr = [];
  props.productList.forEach((list) => {
    arr.push(list.PRODUCTS);
  });
  let result = arr.flat();
  return result;
});

const filteredMaterialList = ref<Array>([]); // отфильтрованный массив поиска
const isSearch = computed(() => {
  return filteredMaterialList.value.length > 0 ? true : false;
});

const callback = (data: any) => {
  emit("parent-callback", data);
};

const changeFilling = (data: any) => {
  callback(data)
}

const onSearchChange = (e) => {
  let reg = new RegExp(`${e.target.value.toLowerCase()}`, "g");
  let filteredData = totalMaterialList.value.filter((item) =>
    reg.test(item.NAME.toLowerCase())
  );

  filteredMaterialList.value = filteredData;
  if (e.target.value === "")
    filteredMaterialList.value = [];
};
</script>

<template>
  <!-- <div class="material-config__wrapper">
    <input class="search" type="text" placeholder="Поиск" @input="onSearchChange" />

    <ul class="material-config_list">
      <li v-if="!isSearch" v-for="products in props.productList" class="material-config_list__details">
        <Accordion>
          <template #title>
            <p>{{ products.NAME }}</p>
          </template>
          <ul class="material-config_list__details_content">
            <li v-for="item in products.PRODUCTS">
              <div class="material-config_item" @click="changeFilling(item, item.ID)">
                <img class="material-config_item__img" :src="_URL + item.PREVIEW_PICTURE" alt="" />
                <div class="material-config_item__name">
                  <p>{{ item.NAME }}</p>
                </div>
              </div>
            </li>
          </ul>
        </Accordion>
      </li>
      <ul v-else v-for="item in filteredMaterialList">
        <li class="item" @click="changeFilling(item, item.ID)">
          <img class="item__img" :src="_URL + item.PREVIEW_PICTURE" alt="" />
          <div class="item__name">
            <p>{{ item.NAME }}</p>
          </div>
        </li>
      </ul>
    </ul>
  </div> -->


  <div class="material-config__wrapper">
    <input class="search" type="text" placeholder="Поиск" @input="onSearchChange" />

    <ul class="material-config_list">
      <!-- Все возможные материалы -->
      <li v-if="!isSearch" v-for="(products, ndx) in props.productList" class="material-config_list__details" :key="ndx">
        <div>
          <h3 class="material-config_title">{{  products.NAME}}</h3>
        </div>
        <ul class="material-config_list__details_content">
          <li class="material-config_item" v-for="(item, index) in products.PRODUCTS" :key="index">
            <Tooltip :position="top" :theme="'dark'">
              <template #trigger>
                <div @click="changeFilling(item, item.ID)">
                  <img class="material-config_item__img" :src="_URL + item.PREVIEW_PICTURE" alt="" />
                </div>
              </template>
              <template #content>
                <div class="material-config_item__tool">
                  <img class="material-config_item__img tool" :src="_URL + item.PREVIEW_PICTURE" alt="" />
                  <p>{{ item.NAME }}</p>
                </div>
              </template>

            </Tooltip>
          </li>

        </ul>

      </li>

      <!-- отфильтрованные материалы-->
      <Tooltip v-else v-for="(item, index) in filteredMaterialList" :key="index" :position="top" :theme="'dark'">
        <template #trigger>
          <li>
            <div class="material-config_item" @click="changeFilling(item, item.ID)">
              <img class="material-config_item__img" :src="_URL + item.PREVIEW_PICTURE" alt="" />

            </div>
          </li>
        </template>
        <template #content>
          <div class="material-config_item__tool">
            <img class="material-config_item__img tool" :src="_URL + item.PREVIEW_PICTURE" alt="" />
            <p>{{ item.NAME  }}</p>
          </div>
        </template>
      </Tooltip>
    </ul>
  </div>
</template>

<style scoped lang="scss"></style>