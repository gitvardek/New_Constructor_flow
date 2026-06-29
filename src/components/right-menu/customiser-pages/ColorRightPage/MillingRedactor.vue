<script lang="ts" setup>
// @ts-nocheck 31
import { defineProps, ref, computed, defineEmits, onMounted, nextTick } from "vue";
import { _URL } from "@/types/constants";
import { useEventBus } from "@/store/appliction/useEventBus";
import { useModelState } from "@/store/appliction/useModelState";
import { useHandlesAction } from "../FigureRightPage/Handles/useHandlesAction";
import { INTEGRATE_HANDE_EXEPTIONS } from "@/Application/F-millings";
import { FasadeTextAlignAction } from "@/types/types";

import Tooltip from "@/components/ui/tooltip/Tooltip.vue";

const props = defineProps({
  millingList: Array,
  tabIndex: Number,
  selectedId: {
    type: Number,
    default: null,
  },
  tempWork: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["select_milling"]);

const eventBus = useEventBus();
const modelState = useModelState();
const { getIntegratedHandleControllerData } = useHandlesAction();

const selectMilling = ref<any>(null);
const listRef = ref<HTMLElement | null>(null);

let filteredMillingList = ref<Array>([]);
const isSearch = computed(() => {
  return filteredMillingList.value.length > 0 ? true : false;
});

const changeMilling = (milling) => {
  const { FASADE_POSITIONS, FASADE_PROPS } =
    modelState.getCurrentModel?.userData.PROPS.CONFIG;
  const isShowcase = FASADE_POSITIONS[props.tabIndex]?.SHOWCASE;
  const currentMilling = FASADE_PROPS[props.tabIndex]?.MILLING;

  emit("select_milling", {
    name: milling.NAME,
    imgSrc: milling.PREVIEW_PICTURE,
    ID: milling.ID,
    fasade_type: milling.fasade_type,
    patina: milling.PATINAOFF,
  }); // отдает данные в родительский компонент для рендеринга в ConfiguraitonOption

  if (!props.tempWork) {
    let action = null;
    /** @Применение_типа_фасадов_с_инегрированной_ручкой */
    const prepare = getIntegratedHandleControllerData(milling, props.tabIndex);

    if (prepare.length > 0 && INTEGRATE_HANDE_EXEPTIONS.includes(milling.ID)) {
      action = modelState.getCurrentMillingActionMap(prepare[0].id, milling.ID);
    }

    FASADE_PROPS[props.tabIndex].MILLING = milling.ID;

    if (isShowcase === 1) {
      eventBus.emit("A:ChangeShowcaseMilling");
      return;
    } // Если витрина пропускаем отрисовку фрезеровки

    eventBus.emit("A:ChangeMilling", {
      data: milling.ID,
      fasadeNdx: props.tabIndex,
      action: action,
    });
  }
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
  max-height: 55vh;
  overflow-y: auto;
}
</style>
