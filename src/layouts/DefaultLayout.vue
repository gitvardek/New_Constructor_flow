<script setup lang="ts">
// @ts-nocheck 31

import { onMounted, ref, watch, useTemplateRef, nextTick, computed } from "vue";
import { useAppData } from "@/store/appliction/useAppData";
import { useRoomState } from "@/store/appliction/useRoomState";

import MainHeader from "@/components/header/MainHeader.vue";
import OptionsMenu from "@/components/left-menu/OptionsMenu.vue";
import OptionsMenu2D from "@/components/left-menu/constructor2d/OptionsMenu.vue";
import CustomiserMenu from "@/components/right-menu/CustomiserMenu.vue";
import MainPopUp from "@/components/popUp/MainPopUp.vue";

import { useRoute } from "vue-router";
import Module2DConstructor2 from "@/components/2DmoduleConstructor/Module2DConstructor2.vue";
import { useMenuStore } from "@/store/appStore/useMenuStore.ts";

import { useProjectFromQuery } from '@/features/quickActions/project/composables/useProjectFromQuery'
const roomState = useRoomState();
const route = useRoute();
const ready = ref<boolean>(false);
const pageComponentRef = ref(null);

const { accordCheck } = useProjectFromQuery();
onMounted(() => {
  accordCheck();
});
</script>

<template>
  <MainHeader :page-component="pageComponentRef" />
  <MainPopUp />
  <div class="main__container">
    <OptionsMenu v-if="route.name === 'Constructor3d'" />
    <OptionsMenu2D v-if="route.name === 'Constructor2d'" />
    <CustomiserMenu v-if="route.name === 'Constructor3d'" />

    <RouterView v-slot="{ Component }">
      <component :is="Component" ref="pageComponentRef" />
    </RouterView>
  </div>
</template>

<style lang="scss" scoped>
.main__container {
  width: 100%;
  height: calc(100% - var(--header-height));
  display: flex;
  flex-wrap: nowrap;
  position: relative;
}
</style>

// New_Constructor_flow/src/layouts/DefaultLayout.vue
