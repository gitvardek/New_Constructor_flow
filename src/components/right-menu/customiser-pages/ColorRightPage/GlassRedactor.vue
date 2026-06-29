<script lang="ts" setup>
// @ts-nocheck 31
import { defineProps, ref, computed, defineEmits, onMounted, nextTick } from "vue";
import { _URL } from "@/types/constants";
import { useEventBus } from "@/store/appliction/useEventBus";
import Tooltip from "@/components/ui/tooltip/Tooltip.vue";

const props = defineProps({
  glassList: Array,
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

const emit = defineEmits(["select_glass"]);

const eventBus = useEventBus();
const selectPatina = ref<any>(null);
const listRef = ref<HTMLElement | null>(null);

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
    <ul class="material-config_list__details_content" ref="listRef">
      <li class="material-config_item" :class="{ active: glass.ID === selectedId }"
        v-for="(glass, index) in props.glassList" :key="index">
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
.active {
  background-color: $strong-grey;
}

.material-config_list__details_content {
  max-height: 55vh;
  overflow-y: auto;
}
</style>
