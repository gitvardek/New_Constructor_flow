<script lang="ts" setup>
//@ts-nocheck

import { defineProps, computed, defineEmits, onMounted } from "vue";
import default_url from "@/assets/svg/surface-redactor/default.svg";
import delete_url from "@/assets/svg/surface-redactor/delete.svg";
import { _URL } from "@/types/constants";

const props = defineProps({
  type: String,
  data: Object,
  additionalClass: String,
  disableDeleteChoice: {
    type: Boolean,
    default: false,
  }
});

onMounted(() => {
});

const emit = defineEmits(["choose-option", "delete-choise"]);

let title = computed(() => {
  const typeMap = {
    surface: "Тип покрытия",
    backwall: "Тип покрытия",
    milling: "Тип фрезеровки",
    palette: "Цвет покрытия",
    patina: "Цвет патины",
    glass: "Цвет стекла",
    Handles: "Ручка",
    showcase:"Витрина",
    profile: "Профиль",
    toptable: "Столешница",
  };

  return typeMap[props.type];
});

let name = computed(() => {
  return props.data?.name || props.data?.NAME
    ? props.data.name || props.data?.NAME
    : "";
});

let imgSrc = computed(() => {
  if (props.data?.imgSrc) {
    return _URL + props.data.imgSrc;
  }

  if (props.data?.PREVIEW_PICTURE) {
    return _URL + props.data.PREVIEW_PICTURE;
  }
  return default_url;
});

let isColorChosed = computed(() => {
  return props.data?.hex ? true : false;
});

let chooseOption = () => {
  emit("choose-option", props.type);
};

const deleteChoise = (event) => {
  // event.stopPropagation();
  emit("delete-choise", props.type);
};
</script>

<template>
  <div :class="`config ${props.additionalClass}`" @click="chooseOption">
    <div class="config__top">
      <img
        v-if="props.type !== 'palette'"
        class="config__img"
        :src="imgSrc"
        alt=""
      />
      <div v-else @click="chooseOption">
        <img v-if="!isColorChosed" class="config__img" :src="imgSrc" alt="" />
        <div
          v-else
          class="config__color"
          :style="{ backgroundColor: `#${props.data?.hex}` }"
        ></div>
      </div>
      <img
        v-if="!props.disableDeleteChoice"
        class="config__delete"
        :src="delete_url"
        alt=""
        @click="deleteChoise"
      />
    </div>
    <div class="config__bottom">
      <div>
        <p class="config__title">{{ title }}</p>
      </div>
      <p class="config__name">{{ name }}</p>
      <!--
        
        -->
    </div>
  </div>
</template>

<style lang="scss" scoped>
.config {
  display: flex;
  flex-direction: column;
  // height: 100%;
  width: 100%;

  max-width: 150px;
  // max-height: 200px;
  padding: 10px;
  gap: 10px;
  border-radius: 15px;
  box-shadow: 4px 4px 4px 4px rgba(34, 60, 80, 0.11);
  overflow: hidden;
  cursor: pointer;

  transition-property: box-shadow;
  transition-duration: 0.25s;
  transition-timing-function: ease;

  @media (hover: hover) {
    &:hover {
      box-shadow: 4px 4px 4px 4px $dark-stroke;
    }
  }

  &.active {
    box-shadow: 4px 4px 4px 4px #da444c;
  }

  &__top {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    // max-height: 50%;
    width: 100%;
  }

  &__bottom {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    // max-height: 50%;
    overflow: hidden;
  }

  &__img {
    height: 50px;
    padding: 5px;
    cursor: pointer;
    box-shadow: 0px 0px 6px 0px rgba(48, 48, 48, 0.1019607843);
    border-radius: 15px;
  }

  &__color {
    height: 40px;
    width: 40px;
    border-radius: 12px;
    cursor: pointer;
  }

  &__delete {
    height: 20px;
    cursor: pointer;

    @media (min-height: 1000px) {
      height: 25px;
    }
  }

  &__title {
    color: rgb(131, 133, 135);
    font-size: small;
    // flex: 2;

    @media (min-height: 1000px) {
      font-size: medium;
    }
  }

  &__name {
    font-size: small;
    // line-height: 14px;
    text-overflow: ellipsis;
    overflow: hidden;

    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;

    @media (min-height: 1000px) {
      font-size: medium;
      // line-height: 10px;
    }
  }
}

.disabled {
  pointer-events: none;
  background-color: rgba(228, 140, 140, 0.133);
}

@media screen and (min-width: 1000px) {
  .config {
    &__img,
    &__color {
      height: 60px;
      width: 60px;
    }
  }
}
</style>
