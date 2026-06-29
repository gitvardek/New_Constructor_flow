<script lang="ts" setup>
// @ts-nocheck 31
import { defineProps, ref, computed, defineEmits, onMounted, nextTick } from "vue";
import { _URL } from "@/types/constants";
import { useEventBus } from "@/store/appliction/useEventBus";
import Tooltip from "@/components/ui/tooltip/Tooltip.vue";

const props = defineProps({
  patinaList: Array,
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

const emit = defineEmits(["select_patina"]);

const eventBus = useEventBus();
const selectPatina = ref<any>(null);
const listRef = ref<HTMLElement | null>(null);

const changePatina = (patina) => {
  if (!props.tempWork)
    eventBus.emit("A:DrawPatina", {
      data: patina.ID,
      fasadeNdx: props.tabIndex,
    });

  emit("select_patina", {
    name: patina.NAME,
    imgSrc: patina.DETAIL_PICTURE,
    ID: patina.ID,
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
      <li class="material-config_item" :class="{ active: patina.ID === selectedId }"
        v-for="(patina, index) in props.patinaList" :key="index">
        <Tooltip :position="top" :theme="'dark'">
          <template #trigger>
            <div @click="changePatina(patina)">
              <img class="material-config_item__img" :src="_URL + patina.PREVIEW_PICTURE" alt="" />
            </div>
          </template>
          <template #content>
            <div class="material-config_item__tool">
              <img class="material-config_item__img tool" :src="_URL + patina.DETAIL_PICTURE" alt="" />
              <p>{{ patina.NAME }}</p>
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
