<script lang="ts" setup>
// @ts-nocheck 31
import { defineProps, ref, computed, defineEmits, onMounted } from "vue";
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
  const query = e.target.value.trim();
  if (!query) { filteredMillingList.value = []; return; }
  const words = query.toLowerCase().split(/\s+/);
  filteredMillingList.value = props.millingList.filter((item) => {
    const name = item.NAME.toLowerCase();
    return words.every((word) => name.includes(word));
  });
};
</script>

<template>
  <div class="material-config__wrapper">
    <input class="search" type="text" placeholder="Поиск" @input="onSearchChange" />

    <div class="material-config_list">
      <ul class="material-config_list__details_content">
        <!-- Все виды фрезировок -->
        <li v-if="!isSearch" v-for="(milling, index) in props.millingList" :key="index">
          <Tooltip :key="index" :position="top" :theme="'dark'">
            <template #trigger>
              <div class="material-config_item" @click="changeMilling(milling)">
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
              <div class="material-config_item" @click="changeMilling(milling)">
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

</style>