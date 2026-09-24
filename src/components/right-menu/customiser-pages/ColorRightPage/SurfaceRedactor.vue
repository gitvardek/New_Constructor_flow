<script lang="ts" setup>
// @ts-nocheck 31

import {
  defineProps,
  defineEmits,
  computed,
  ref,
  onMounted,
  withDefaults,
  nextTick,
} from "vue";
import { useAppData } from "@/store/appliction/useAppData";
import { _URL } from "@/types/constants";


import Accordion from "@/components/ui/accordion/Accordion.vue";
import Tooltip from "@/components/ui/tooltip/Tooltip.vue";
type TSurface = "fasade" | "module";

interface IProps {
  materialList: number[];
  type?: TSurface;
  selectedId?: number | null;
}

// Только выбор из списка: запись в конфиг и сцену делает родитель
const props = withDefaults(defineProps<IProps>(), {
  type: "fasade",
});

const emit = defineEmits<{
  (e: "update:modelValue", value: any): void;
  (e: "select", value: any): void;
  (e: "select_material", value: any): void;
}>();

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

const listRef = ref<HTMLElement | null>(null);

const filteredMaterialList = ref<Array>([]); // отфильтрованный массив поиска
const isSearch = computed(() => {
  return filteredMaterialList.value.length > 0 ? true : false;
});

/** Выбор полотна: для корпуса (type="module") — select, для фасада — select_material */
const changeFasadeTexture = (data: { [key: string]: any }) => {
  console.log(data, 'data')

  if (props.type == "module") {
    emit("select", data);
    return;
  }

  emit("select_material", data);
};

const onSearchChange = (e) => {
  const query = e.target.value.trim();
  if (!query) { filteredMaterialList.value = []; return; }
  const words = query.toLowerCase().split(/\s+/);
  filteredMaterialList.value = totalMaterialList.value.filter((id) => {
    const name = _FASADE[id].NAME.toLowerCase();
    return words.every((word) => name.includes(word));
  });
};

onMounted(() => {
  nextTick(() => {
    const activeEl = listRef.value?.querySelector('.active') as HTMLElement | null;
    if (!activeEl || !listRef.value) return;
    listRef.value.scrollTop = activeEl.getBoundingClientRect().top
      - listRef.value.getBoundingClientRect().top
      + listRef.value.scrollTop;
  });
});
</script>

<template>
  <div class="material-config__wrapper">
    <input class="search" type="text" placeholder="Поиск" @input="onSearchChange" />

    <ul class="material-config_list" ref="listRef">
      <!-- Все возможные материалы -->
      <li v-if="!isSearch" v-for="materials in props.materialList" class="material-config_list__details">
        <div>
          <h3 class="material-config_title">{{ materials.NAME }}</h3>
        </div>
        <ul class="material-config_list__details_content">
          <li class="material-config_item" :class="{ active: id === selectedId }" v-for="(id, index) in materials.FASADES" :key="index">
            <Tooltip :position="top" :theme="'dark'">
              <template #trigger>
                <div @click="changeFasadeTexture(_FASADE[id])">
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
            <div class="material-config_item" @click="changeFasadeTexture(_FASADE[id])">
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
.active {
  background-color: $strong-grey;
}

.material-config_list {
  // max-height: 55vh;
  overflow-y: auto;
}
</style>
