<script lang="ts" setup>
// @ts-nocheck 31

import { defineProps, defineEmits, onMounted, computed, ref } from "vue";
import { useEventBus } from "@/store/appliction/useEventBus";
import { useModelState } from "@/store/appliction/useModelState";
import Accordion from "@/components/ui/accordion/Accordion.vue";
import Tooltip from "@/components/ui/tooltip/Tooltip.vue";

const eventBus = useEventBus();
const modelState = useModelState();
const emit = defineEmits(["select_color"]);

const props = defineProps({
  paletteList: Object,
  tabIndex: Number,
  tempWork: {
    type: Boolean,
    default: false,
  },
});

const filteredPaletteList = ref<Array>([]);
const isSearch = computed(() => {
  return filteredPaletteList.value.length > 0 ? true : false;
});

const changePaletteColor = (color) => {
  const { FASADE_PROPS } = modelState.getCurrentModel?.userData.PROPS.CONFIG;

  emit("select_color", {
    name: color.NAME,
    data: "",
    hex: color.HTML,
    ID: color.ID,
  }); // отдает данные в родительский компонент для рендеринга в ConfiguraitonOption


  if (!props.tempWork) {
    FASADE_PROPS[props.tabIndex].PALETTE = color.ID;
    eventBus.emit("A:ChangePaletteColor", {
      data: color.ID,
      fasadeNdx: props.tabIndex,
    });
  }
};

const onSearchChange = (e) => {
  let reg = new RegExp(`${e.target.value.toLowerCase()}`, "gm");
  let filtered = Object.values(props.paletteList).filter((color) =>
    reg.test(color.NAME.toLowerCase())
  );
  filteredPaletteList.value = filtered;
  if (e.target.value === "") filteredPaletteList.value = [];
};
</script>

<template>
  <div class="material-config__wrapper">
    <input class="search" type="text" placeholder="Поиск" @input="onSearchChange" />
    <div class="material-config_list">
      <ul class="material-config_list__details_content">
        <li v-for="color in isSearch ? filteredPaletteList : Object.values(props.paletteList)" :key="color.HTML">

          <Tooltip :key="index" :position="top" :theme="'dark'">

            <template #trigger>
              <div class="material-config_item" @click="changePaletteColor(color)">
                <div class="material-config_item__html" :style="{ backgroundColor: `#${color.HTML}` }"></div>
              </div>
            </template>

            <template #content>
              <div class="material-config_item__tool">
                <div class="material-config_item__img tool" :style="{ backgroundColor: `#${color.HTML}` }"></div>
                <p>{{ color.NAME }}</p>
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
