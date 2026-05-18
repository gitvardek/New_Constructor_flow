<script lang="ts" setup>
// @ts-nocheck 31

import { defineProps, defineEmits, onMounted, computed, ref } from "vue";
import { useEventBus } from "@/store/appliction/useEventBus";
import { useModelState } from "@/store/appliction/useModelState";

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
  <div class="relative__wrapper">
    <input
      class="search"
      type="text"
      placeholder="Поиск"
      @input="onSearchChange"
    />

    <!---->
    <ul class="list">
      <!-- Все виды цветов -->
      <li
        class="item"
        v-if="!isSearch"
        v-for="color in Object.values(props.paletteList)"
        @click="changePaletteColor(color)"
      >
        <div
          class="item__color"
          :style="{ backgroundColor: `#${color.HTML}` }"
        ></div>
        <div class="item__name">{{ color.NAME }}</div>
      </li>
      <!-- Отфильтрованные в поиске -->
      <li
        class="item"
        v-else
        v-for="color in filteredPaletteList"
        @click="changePaletteColor(color)"
      >
        <div
          class="item__color"
          :style="{ backgroundColor: `#${color.HTML}` }"
        ></div>
        <div class="item__name">{{ color.NAME }}</div>
      </li>
    </ul>
  </div>
</template>

<style lang="scss" scoped>
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
  font-size: 1.4rem;
}

.list {
  height: 100%;
  max-height: calc(85vh - 110px);
  margin-top: 10px;
  padding-right: 10px;
  box-sizing: border-box;
  overflow-y: scroll;
  box-sizing: border-box;
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
  margin-bottom: 8px;
  margin-right: 8px;
  transition-property: background-color;
  transition-duration: 0.25s;
  transition-timing-function: ease;

  &__color {
    height: 45px;
    width: 45px;
    margin-left: 10px;
    border-radius: 5px;
  }

  &__name {
    margin-left: 15px;
  }
  @media (hover: hover) {
    &:hover {
      background-color: $stroke;
    }
  }
}
</style>
