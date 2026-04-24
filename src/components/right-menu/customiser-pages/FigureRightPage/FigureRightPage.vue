<script setup lang="ts">
//@ts-nocheck
import { ref, computed, onBeforeMount } from "vue";

import Handles from "./Handles/Handles.vue";
import Plinth from "./Plinth/Plinth.vue";

import defaultTab from "@/components/ui/tabs/defaultTab.vue";
import { Tab } from "@/components/ui/tabs/defaultTab.vue";
import { useFigureRightPage, IFigureItems } from "./useFigureRightPage";

interface ITabChangeParams {
  index: number;
  tab: Tab;
}

type TexistItem = {
  Handles: boolean;
  Plinth: boolean;
};

const plinthExist = ref<boolean>(false);
const handlesExist = ref<boolean>(false);
const prepareTabData = ref<IFigureItems[] | []>([]);

const currentFigure = ref<string | null>("");

const { figureItems, createSurfaceList, createPlinthData } =
  useFigureRightPage();

const optionsTabChange = ({ tab }: ITabChangeParams) => {
  currentFigure.value = tab.name;
};

onBeforeMount(() => {
  plinthExist.value = createPlinthData().length > 0;
  handlesExist.value = createSurfaceList().length > 0;

  const checkExist: TexistItem = {
    Handles: Object.values(createSurfaceList()).length > 0,
    Plinth: Object.values(createPlinthData()).length > 0,
  };

  prepareTabData.value = figureItems.filter((el) => {
    if (checkExist[el.name as keyof TexistItem]) {
      return el;
    }
  }) as IFigureItems[];

  currentFigure.value = prepareTabData.value[0]
    ? prepareTabData.value[0].name
    : null;
});

const filteredFigure = computed(() => {
  const figureTypeMap: Record<string, Function> = {
    Handles: createSurfaceList,
    Plinth: createPlinthData,
  };

  return figureTypeMap[currentFigure.value!]?.();
});
</script>

<template>
  <div class="figure">
    <h3 v-if="prepareTabData.length == 0">
      У выбранной компановки фсады отсутствуют
    </h3>
    <defaultTab :tabs="prepareTabData" @tab-change="optionsTabChange" />
    <Handles :data="filteredFigure" v-if="currentFigure == 'Handles'" />
    <Plinth :data="filteredFigure" v-if="currentFigure == 'Plinth'" />
  </div>
</template>

<style lang="scss" scoped>
.figure {
  height: calc(100vh - 220px);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
