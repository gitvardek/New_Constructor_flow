<script lang="ts" setup>
// @ts-nocheck 31
import { defineProps, defineEmits, onMounted, computed, ref, nextTick } from "vue";
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
  selectedId: {
    type: Number,
    default: null,
  },
  tempWork: {
    type: Boolean,
    default: false,
  },
});

const filteredPaletteList = ref<Array>([]);
const listRef = ref<HTMLElement | null>(null);
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
  const query = e.target.value.trim();
  if (!query) { filteredPaletteList.value = []; return; }
  const words = query.toLowerCase().split(/\s+/);
  filteredPaletteList.value = Object.values(props.paletteList).filter((color) => {
    const name = color.NAME.toLowerCase();
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

      <ul class="material-config_list__details_content" ref="listRef">
        <li v-for="color in isSearch ? filteredPaletteList : Object.values(props.paletteList)" :key="color.HTML">

          <Tooltip :key="index" :position="top" :theme="'dark'">

            <template #trigger>
              <div class="material-config_item" @click="changePaletteColor(color)"  :class="{ active: color.ID === selectedId }">
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
