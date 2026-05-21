<script lang="ts" setup>
// @ts-nocheck 31
import { defineProps, ref, computed, defineEmits } from "vue";
import { _URL } from "@/types/constants";
import { useEventBus } from "@/store/appliction/useEventBus";
import Tooltip from "@/components/ui/tooltip/Tooltip.vue";

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

  <div class="material-config__wrapper">
    <ul class="material-config_list__details_content">
      <li class="material-config_item" v-for="(glass, index) in props.glassList" :key="index">
        <Tooltip :position="top" :theme="'dark'">
          <template #trigger>
            <div @click="changeGlass(glass)">
              <img class="material-config_item__img" :src="_URL + glass.PREVIEW_PICTURE" alt="" />
            </div>
          </template>
          <template #content>
            <div class="material-config_item__tool">
              <img class="material-config_item__img tool" :src="_URL + glass.DETAIL_PICTURE" alt="" />
              <p>{{ glass.NAME }}</p>
            </div>
          </template>

        </Tooltip>

      </li>
    </ul>

  </div>
</template>

<style scoped lang="scss">

</style>
