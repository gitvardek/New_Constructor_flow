<script lang="ts" setup>
// @ts-nocheck 31
import { defineProps, ref, computed, defineEmits } from "vue";
import { _URL } from "@/types/constants";
import { useEventBus } from "@/store/appliction/useEventBus";

const props = defineProps({
  glassList: Array,
  tabIndex: Number,
  tempWork: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["select_glass"]);

const eventBus = useEventBus();
const selectPatina = ref<any>(null);

const changeGlass = (glass) => {

  emit("select_glass", {
    name: glass.NAME,
    imgSrc: glass.PREVIEW_PICTURE,
    ID: glass.ID,
  }); 

  if (!props.tempWork)
    eventBus.emit("A:ChangeGlassColor", {
      data: glass.ID,
      fasadeNdx: props.tabIndex,
    });
};
</script>

<template>
  <div class="relative__wrapper">
    <div class="list">
      <div
        class="item"
        v-for="glass in props.glassList"
        @click="changeGlass(glass)"
      >
        <img class="item__img" :src="_URL + glass.PREVIEW_PICTURE" alt="" />
        <div class="item__name">{{ glass.NAME }}</div>
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
