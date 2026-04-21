<script setup lang="ts">
//@ts-nocheck

import {computed, ref, toRefs} from "vue";
import "@/components/UMconstructor/styles/UM.scss"

import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import SectionsView from "@/components/UMconstructor/views/modules/SectionsView.vue";
import FasadesView from "@/components/UMconstructor/views/modules/FasadesView.vue";
import FillingsView from "@/components/UMconstructor/views/modules/FillingsView.vue";
import {GridModule} from "@/components/UMconstructor/types/UMtypes.ts";

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

const {module, mode, UMconstructor} = toRefs(props)
const step = ref<number>(1);
const optionsRef = ref(null);

const getFillings = computed(() => {
  const objectsMatrix = []
  const productData = UMconstructor?.value?.UM_STORE.getUMData()
  const productInfo = UMconstructor?.value?.APP.CATALOG.PRODUCTS[productData.PRODUCT]
  const fillingsGroups = Object.keys(productInfo.FILLING_SECTION)

  fillingsGroups.map(groupID => {
    let fillingsGroup = UMconstructor?.value?.APP.CATALOG.SECTIONS[groupID]

    objectsMatrix.push({
      groupName: fillingsGroup.NAME,
      groupID: fillingsGroup.ID,
      items: fillingsGroup.PRODUCTS.map(item => {
        return UMconstructor?.value?.APP.CATALOG.PRODUCTS[item]
      }).filter(item => item)
    })
  })

  return objectsMatrix;
});

</script>

<template>
    <div
        v-if="mode === 'module'"
    >
      <h1 class="no-select">Секции</h1>

      <SectionsView
          ref="optionsRef"
          class="constructor2d-container--right--content"
          :visualizationRef="UMconstructor.RENDER_REF"
          :module="UMconstructor.UM_STORE.getUMGrid()"
          :mode="mode"
          :step="step"
          :UMconstructor="UMconstructor"
      />
    </div>

    <div
        v-if="mode === 'fasades'"
    >
      <h1 class="no-select">Фасады</h1>

      <FasadesView
          ref="optionsRef"
          class="constructor2d-container--right--content"
          :visualizationRef="UMconstructor.RENDER_REF"
          :module="UMconstructor.UM_STORE.getUMGrid()"
          :mode="mode"
          :step="step"
          :UMconstructor="UMconstructor"
      />
    </div>

    <div
        v-if="mode === 'fillings'"
    >
      <h1 class="no-select">Наполнение</h1>

      <FillingsView
          ref="optionsRef"
          class="constructor2d-container--right--content"
          :visualizationRef="UMconstructor.RENDER_REF"
          :module="UMconstructor.UM_STORE.getUMGrid()"
          :fillings="getFillings"
          :step="step"
          :UMconstructor="UMconstructor"
      />
    </div>

</template>

<style scoped lang="scss">

</style>