<script lang="ts" setup>
// @ts-nocheck 31
import { defineProps, ref, computed, defineEmits } from "vue";
import { _URL } from "@/types/constants";
import { useEventBus } from "@/store/appliction/useEventBus";
import { useModelState } from "@/store/appliction/useModelState";
import Tooltip from "@/components/ui/tooltip/Tooltip.vue";

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
  <div class="material-config__wrapper">
    <ul class="material-config_list__details_content">
      <li class="material-config_item" v-for="(showcase, index) in props.showcaseList" :key="index">
        <Tooltip :position="top" :theme="'dark'">
          <template #trigger>
            <div @click="changeShowcase(showcase)">
              <img class="material-config_item__img" :src="_URL + showcase.PREVIEW_PICTURE" alt="" />
            </div>
          </template>
          <template #content>
            <div class="material-config_item__tool">
              <img class="material-config_item__img tool" :src="_URL + showcase.DETAIL_PICTURE" alt="" />
              <p>{{ showcase.NAME }}</p>
            </div>
          </template>

        </Tooltip>

      </li>
    </ul>

  </div>
</template>

<style scoped lang="scss">

</style>
