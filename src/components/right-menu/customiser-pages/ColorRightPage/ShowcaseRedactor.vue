<script lang="ts" setup>
// @ts-nocheck 31
import { defineProps, ref, computed, defineEmits, onMounted, nextTick } from "vue";
import { _URL } from "@/types/constants";
import Tooltip from "@/components/ui/tooltip/Tooltip.vue";

// Только выбор из списка: запись в конфиг и сцену делает родитель
const props = defineProps({
  showcaseList: Array,
  selectedId: {
    type: Number,
    default: null,
  },
});

const emit = defineEmits(["select_showcase"]);

const selectPatina = ref<any>(null);
const listRef = ref<HTMLElement | null>(null);

const changeShowcase = (showcase) => {
  emit("select_showcase", {
    name: showcase.NAME,
    imgSrc: showcase.PREVIEW_PICTURE,
    ID: showcase.ID,
  }); // отдает данные в родительский компонент для рендеринга в ConfiguraitonOption
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
      <li class="material-config_item" :class="{ active: showcase.ID === selectedId }"
        v-for="(showcase, index) in props.showcaseList" :key="index">
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
.active {
  background-color: $strong-grey;
}

.material-config_list__details_content {
  // max-height: 55vh;
  overflow-y: auto;
}
</style>
