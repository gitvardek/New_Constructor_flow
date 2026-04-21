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
          v-for="products in props.productList"
          class="list__details"
      >
        <Accordion>
          <template #title>
            <p>{{ products.NAME }}</p>
          </template>
          <ul class="list__details_contant">
            <li v-for="item in products.PRODUCTS">
              <div
                  class="item"
                  @click="changeFilling(item, item.ID)"
              >
                <img
                    class="item__img"
                    :src="_URL + item.PREVIEW_PICTURE"
                    alt=""
                />
                <div class="item__name">
                  <p>{{ item.NAME }}</p>
                </div>
              </div>
            </li>
          </ul>
        </Accordion>
      </li>
      <!--

      -->
      <!-- отфильтрованные материалы-->
      <ul v-else v-for="item in filteredMaterialList">
        <li
            class="item"
            @click="changeFilling(item, item.ID)"
        >
          <img
              class="item__img"
              :src="_URL + item.PREVIEW_PICTURE"
              alt=""
          />
          <div class="item__name">
            <p>{{ item.NAME }}</p>
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
  max-height: 40vh;
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