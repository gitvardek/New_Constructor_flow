<script lang="ts" setup>
// @ts-nocheck 31
import { defineProps, ref, computed, defineEmits } from "vue";
import { _URL } from "@/types/constants";
import { useEventBus } from "@/store/appliction/useEventBus";
import { useModelState } from "@/store/appliction/useModelState";

const props = defineProps({
  showcaseList: Array,
  tabIndex: Number,
  tempWork: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["select_showcase"]);

const eventBus = useEventBus();
const modelState = useModelState();
const selectPatina = ref<any>(null);

const changeShowcase = (showcase) => {
  const { FASADE_PROPS } = modelState.getCurrentModel?.userData.PROPS.CONFIG;

  emit("select_showcase", {
    name: showcase.NAME,
    imgSrc: showcase.PREVIEW_PICTURE,
    ID: showcase.ID,
  }); // отдает данные в родительский компонент для рендеринга в ConfiguraitonOption

  if (!props.tempWork) {
    FASADE_PROPS[props.tabIndex].SHOWCASE = showcase.ID;

    eventBus.emit("A:ChangeShowcase", {
      data: showcase.ID,
      fasadeNdx: props.tabIndex,
    });
  }
};
</script>

<template>
  <div class="relative__wrapper">
    <div class="list">
      <div
        class="item"
        v-for="showcase in props.showcaseList"
        @click="changeShowcase(showcase)"
      >
        <img class="item__img" :src="_URL + showcase.PREVIEW_PICTURE" alt="" />
        <div class="item__name">{{ showcase.NAME }}</div>
      </div>
    </div>
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
// .search {
//   width: 95%;
//   border-radius: 15px;
//   padding: 10px 15px;
// }

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

  &__img {
    height: 60px;
    width: 60px;
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
