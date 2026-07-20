
<script lang="ts" setup>
//@ts-nocheck
import { _URL } from "@/types/constants";

interface Props {
  data: Record<string, any>;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: "kromka-kard-select"): void;
}>();

const handleSelect = () => {
  emit("kromka-kard-select");
};

</script>

<template>
  <div class="option-container" @click="handleSelect()">
    <div class="option-small">
      <div class="option-label">
        <img class="label__img" :src="data.PREVIEW_PICTURE" alt="" />
        <p class="label__text">{{ data.NAME }}</p>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.option {
  &-container {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    width: 100%;
    cursor: pointer;
     font-size:1.4rem;
  }
  &-full,
  &-small {
    padding: 10px;
    border-radius: 15px;
    background-color: $bg;
    color: black;
    transition-property: color, background-color;
    transition-duration: 0.25s;
    transition-timing-function: ease;

    @media (hover: hover) {
      &:hover {
        background-color: $dark-grey;
        color: white;
      }
    }
  }
  &-full {
    display: flex;
    flex-wrap: wrap;
    width: 100%;
  }
  &-small {
    flex: 46%;
    padding: 10px;
  }
}

.label__img {
  height: 60px;
  width: 60px;
  padding: 5px;
  border-radius: 15px;
  background-color: #ffffff;
}
</style>
