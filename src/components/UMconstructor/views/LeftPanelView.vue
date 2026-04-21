<script setup lang="ts">
//@ts-nocheck

import "@/components/UMconstructor/styles/UM.scss"

import RailsRightPage from "@/components/right-menu/customiser-pages/RailsRightPage/RailsRightPage.vue";
import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import {toRefs, ref, onBeforeMount} from "vue";
import {TTotalProps} from "@/types/types.ts";
import SidecolorsView from "@/components/UMconstructor/views/modules/SidecolorsView.vue";
import ModuleSizeView from "@/components/UMconstructor/views/modules/ModuleSizeView.vue";
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
const productData = ref<TTotalProps>(<TTotalProps>{})

onBeforeMount(() => {
  productData.value = UMconstructor?.value?.UM_STORE.getUMData()
})

</script>

<template>
  <div
      class="UM constructor2d-container--left--module-configs"
  >

    <ModuleSizeView
      :product-data="productData"
      :module="UMconstructor.UM_STORE.getUMGrid()"
      :mode="mode"
      :UMconstructor="UMconstructor"
    />

    <div class="UM no-select actions-sections-header">
      <h1>Параметры модуля</h1>
    </div>
    <div
        class="UM constructor2d-container--left--module-configs--module-color"
    >
      <SidecolorsView
          ref="materialConfRef"
          :visualizationRef="UMconstructor.RENDER_REF"
          :module="UMconstructor.UM_STORE.getUMGrid()"
          :objectData="productData"
          :UMconstructor="UMconstructor"
          @product-reset="UMconstructor.reset"
      />
    </div>

    <div class="UM no-select actions-sections-header">
      <h1>Опции</h1>
    </div>
    <RailsRightPage class="UM no-select" style="margin-top: 5px"/>

  </div>
</template>

<style scoped lang="scss">

</style>