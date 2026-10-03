<script lang="ts" setup>
// @ts-nocheck 31
import { defineProps, ref, computed, defineEmits, onMounted, nextTick } from "vue";
import { _URL } from "@/types/constants";

import Tooltip from "@/components/ui/tooltip/Tooltip.vue";

// Только выбор из списка: запись в конфиг и сцену делает родитель
// (MaterialRedactor — useFasadeCommands.selectMilling, УМ — AdvanceCorpusMaterialRedactor)
const props = defineProps({
  millingList: Array,
  selectedId: {
    type: Number,
    default: null,
  },
});

const emit = defineEmits(["select_milling"]);

const selectMilling = ref<any>(null);
const listRef = ref<HTMLElement | null>(null);

let filteredMillingList = ref<Array>([]);
const isSearch = computed(() => {
  return filteredMillingList.value.length > 0 ? true : false;
});

const changeMilling = (milling) => {
  console.log(milling, 'milling')

  emit("select_milling", {
    name: milling.NAME,
    imgSrc: milling.PREVIEW_PICTURE,
    ID: milling.ID,
    fasade_type: milling.fasade_type,
    patina: milling.PATINAOFF,
  }); // отдает данные в родительский компонент для рендеринга в ConfiguraitonOption
};

const onSearchChange = (e) => {
  const query = e.target.value.toLowerCase();
  const filteredData = props.millingList.filter(
    (item) => item.NAME.toLowerCase().includes(query) // Проверяем, содержит ли имя запрос
  );

  filteredMillingList.value = filteredData;
  if (e.target.value === "") filteredMillingList.value = [];
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

    <div class="material-config_list">
      <ul class="material-config_list__details_content" ref="listRef">
        <!-- Все виды фрезировок -->
        <li v-if="!isSearch" v-for="(milling, index) in props.millingList" :key="index">
          <Tooltip :key="index" :position="top" :theme="'dark'">
            <template #trigger>
              <div class="material-config_item" @click="changeMilling(milling)" :class="{ active: milling.ID === selectedId }" >
                <img class="material-config_item__img" :src="_URL + milling.PREVIEW_PICTURE" alt="" />
              </div>
            </template>

            <template #content>
              <div class="material-config_item__tool">
                <img class="material-config_item__img tool" :src="_URL + milling.DETAIL_PICTURE" alt="" />
                <p>{{ milling.NAME }}</p>
              </div>
            </template>
          </Tooltip>
        </li>
        <li v-else v-for="milling in filteredMillingList">
          <Tooltip :key="index" :position="top" :theme="'dark'">
            <template #trigger>
              <div class="material-config_item" @click="changeMilling(milling)" :class="{ active: milling.ID === selectedId }">
                <img class="material-config_item__img" :src="_URL + milling.PREVIEW_PICTURE" alt="" />
              </div>
            </template>
            <template #content>
              <div class="material-config_item__tool">
                <img class="material-config_item__img tool" :src="_URL + milling.DETAIL_PICTURE" alt="" />
                <p>{{ milling.NAME }}</p>
              </div>
            </template>
          </Tooltip>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped lang="scss">
.active {
  background-color: $strong-grey;
}

.material-config_list__details_content {
  // max-height: 55vh;
  overflow-y: auto;
}
</style>
