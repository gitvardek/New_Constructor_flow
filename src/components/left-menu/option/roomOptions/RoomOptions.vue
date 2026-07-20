<script setup lang="ts">
//@ts-nocheck
import { computed, onBeforeMount } from "vue";
import { _URL } from "@/types/constants";
import {
  TOptionsMap,
  TPalitte,
  TOptionItem,
  TMilling,
  TFasadeItem,
} from "@/types/types";

import { useModelState } from "@/store/appliction/useModelState";
import { useRoomOptions } from "./useRoomOptons";

const { _FASADE, _MILLING, _PRODUCTS, _PALETTE } = useModelState();
const { _WALL, _FLOOR } = useRoomOptions();

const EGlobalDataMap = computed(() => ({
  moduleTop: _FASADE,
  moduleBottom: _FASADE,
  fasadsTop: _FASADE,
  fasadsBottom: _FASADE,
  wall: _WALL,
  floor: _FLOOR,
  plinth: _PRODUCTS,
  plinthSurfase: _FASADE,
  tableTop: _PRODUCTS,
  palitte: _PALETTE,
  milling: _MILLING,
  handles: _PRODUCTS,
}));

interface Props {
  options: TOptionsMap;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "toSelect", key: keyof TOptionsMap, title: string): void;
  (
    e: "toPalitteSelect",
    palitteTitle: string,
    key: keyof TOptionsMap,
    palitteData: TPalitte[]
  ): void;
  (
    e: "toMillingSelect",
    millingTitle: string,
    key: keyof TOptionsMap,
    millingData: TMilling[]
  ): void;
  (
    e: "toPlinthSelect",
    plinthTitle: string,
    key: keyof TOptionsMap,
    plinthData: TFasadeItem[]
  ): void;

  (e: "toToggle", event: Event, key: keyof TOptionsMap): void;
}>();

const handleSelect = (key: keyof TOptionsMap, title: string) => {
  emit("toSelect", key, title);
};

const palitteSelect = (
  palitteTitle: string,
  key: keyof TOptionsMap,
  palitteData: TPalitte[]
) => {
  emit("toPalitteSelect", palitteTitle, key, palitteData);
};

const millingSelect = (
  millingTitle: string,
  key: keyof TOptionsMap,
  millingData: TMilling[]
) => {
  emit("toMillingSelect", millingTitle, key, millingData);
};

const plinthSelect = (
  plinthTitle: string,
  key: keyof TOptionsMap,
  plinthData: TFasadeItem[]
) => {
  emit("toPlinthSelect", plinthTitle, key, plinthData);
};

const handleToggle = (event: Event, key: keyof TOptionsMap) => {
  emit("toToggle", event, key);
};

const getContainerType = (type: string) => {
  if (type.includes("fasad") || type.includes("plinth")) {
    return "option-full";
  }
  return "option-small";
};

function getOptionData(key: keyof TOptionsMap) {
  const map = EGlobalDataMap.value;
  const globalData = props.options?.[key];

  const curOptionId = globalData?.id;
  const palliteId = globalData?.palitte;
  const millingId = globalData?.milling;
  const plinthId = globalData?.plinthSurfase;

  return {
    option: curOptionId ? map[key]?.[curOptionId] ?? null : null,
    palitte: palliteId ? map.palitte?.[palliteId] ?? null : null,
    milling: millingId ? map.milling?.[millingId] ?? null : null,
    plinth: plinthId ? map.plinthSurfase?.[plinthId] ?? null : null,
  };
}

const optionsList = computed(() => {
  return Object.entries(props.options ?? {}).map(([key, item]) => ({
    key: key as keyof TOptionsMap,
    item,
    data: getOptionData(key as keyof TOptionsMap),
    containerType: getContainerType(key),
  }));
});


</script>

<template>
  <div class="room-options">
    <div v-for="{ key, item, data, containerType } in optionsList" :key="key" :class="containerType">
      <div class="option-container">
        <div class="option-label" @click="handleSelect(key as keyof TOptionsMap, item.title)">
          <img class="label__img" :src="_URL + (data.option?.PREVIEW_PICTURE ?? '')" alt="" />
          <p class="label__title">{{ item.title }}</p>
          <p class="label__text">{{ data.option?.NAME }}</p>
        </div>

        <div v-if="item?.palitte" class="option-label" @click="
          palitteSelect(
            item.palitteTitle!,
            key as keyof TOptionsMap,
            item.palitteData!
          )
          ">
          <div class="label__color" :style="{
            backgroundColor: `#${data.palitte?.RAL || data.palitte?.HTML || ''}`,
          }"></div>

          <p class="label__text">
            {{ data.palitte?.UNAME }}
          </p>
        </div>

        <div v-if="item?.milling && data.option?.ID !== 7397" class="option-label" @click="
          millingSelect(
            item.millingTitle!,
            key as keyof TOptionsMap,
            item.millingData!
          )
          ">
          <img class="label__img" :src="_URL + (data.milling?.PREVIEW_PICTURE ?? '')" alt="" />

          <p class="label__text">
            {{ data.milling?.NAME }}
          </p>
        </div>

        <div v-if="item?.plinthSurfase" class="option-label" @click="
          plinthSelect(
            item.plinthTitle!,
            key as keyof TOptionsMap,
            item.plinthData!
          )
          ">
          <img class="label__img" :src="_URL + (data.plinth?.PREVIEW_PICTURE ?? '')" alt="" />

          <p class="label__text">
            {{ data.plinth?.NAME }}
          </p>
        </div>
      </div>

      <!-- <div class="option__checkbox">
        <label class="control control-checkbox">
          <input
            type="checkbox"
            :checked="item.global"
            @change="handleToggle($event, key as keyof TOptionsMap)"
          />
          <span class="control_indicator"></span>
          <span class="control_lable">{{ item.label }}</span>
        </label>
      </div> -->
    </div>
  </div>
</template>

<style lang="scss" scoped>
.room-options {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.option {
  &-container {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    width: 100%;
  }

  &-full,
  &-small {
    padding: 10px;
    border-radius: 15px;
    background-color: $bg;
    position: relative;
  }

  &-full {
    display: flex;
    flex-wrap: wrap;
    width: 100%;
  }

  &-small {
    flex: 46%;
    padding: 10px;

    .option-label {
      width: 100%;
    }
  }
}

.option-label {
  width: calc(100% / 2 - 15px);

  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  border-radius: 15px;
  transition: background-color 0.25s ease;
  cursor: pointer;

  @media (hover: hover) {
    &:hover {
      .label__text {
        color: $black;
      }
    }
  }
}

.option__checkbox {
  position: absolute;
  display: flex;
  align-items: center;
  top: 0.2rem;
  right: 0.5rem;
}

.label__img {
  height: 45px;
  width: 45px;
  padding: 5px;
  border-radius: 15px;
  background-color: #ffffff;
}

.label__title {
  font-size: 1.2rem;
  position: absolute;
  bottom: 0.2rem;
  left: 0.5rem;
}

.label__text {
  font-size: 1.2rem;
  font-weight: 600;
  color: $strong-grey;
}

.label__color {
  height: 45px;
  width: 45px;
  border-radius: 12px;
  cursor: pointer;
}

.control {
  &-checkbox {
    padding-left: 0;
    padding-right: 30px;
  }

  &_indicator {
    right: 0;
    left: auto;
  }

  &_lable {
    font-size: 1rem;
  }
}
</style>