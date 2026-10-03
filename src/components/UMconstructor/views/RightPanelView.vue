<script setup lang="ts">
//@ts-nocheck

import { computed, ref, toRefs } from "vue";
import "@/components/UMconstructor/styles/UM.scss"

import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import SectionsView from "@/components/UMconstructor/views/modules/SectionsView.vue";
import FasadesView from "@/components/UMconstructor/views/modules/FasadesView.vue";
import FillingsView from "@/components/UMconstructor/views/modules/FillingsView.vue";
import { GridModule } from "@/components/UMconstructor/types/UMtypes.ts";
import { getFillingGroups } from "@/components/UMconstructor/editor-v2/fillings/fillingGroups.ts";

const props = defineProps({
  module: {
    type: ref<GridModule>,
    required: true,
  },
  mode: {
    type: String,
    default: "module",
  },
  UMconstructor: {
    type: UMconstructorClass,
    required: true,
  }
});

const { module, mode, UMconstructor } = toRefs(props)
const step = ref<number>(1);
const optionsRef = ref(null);

const getFillings = computed(() => getFillingGroups(UMconstructor.value));

</script>

<template>
  <div v-if="mode === 'module'" class="right-panel">

    <h1 class="UM no-select">Секции</h1>

    <SectionsView ref="optionsRef" class="UM constructor2d-container--right--content"
      :visualizationRef="UMconstructor.RENDER_REF" :module="UMconstructor.UM_STORE.getUMGrid()" :mode="mode"
      :step="step" :UMconstructor="UMconstructor" />
  </div>

  <div v-if="mode === 'fasades'" class="right-panel">
    <h1 class="UM no-select">Фасады</h1>

    <FasadesView ref="optionsRef" class="UM constructor2d-container--right--content"
      :visualizationRef="UMconstructor.RENDER_REF" :module="UMconstructor.UM_STORE.getUMGrid()" :mode="mode"
      :step="step" :UMconstructor="UMconstructor" />
  </div>

  <div v-if="mode === 'fillings'" class="right-panel">
    <h1 class="UM no-select">Наполнение</h1>

    <FillingsView ref="optionsRef" class="UM constructor2d-container--right--content"
      :visualizationRef="UMconstructor.RENDER_REF" :module="UMconstructor.UM_STORE.getUMGrid()" :fillings="getFillings"
      :step="step" :UMconstructor="UMconstructor" />
  </div>

</template>

<style scoped lang="scss">
.right-panel {
  height: 100%;
}
</style>