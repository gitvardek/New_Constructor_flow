<script setup lang="ts">
// @ts-nocheck 31

import { onMounted, onUnmounted, ref } from "vue";

import MainHeader from "@/components/header/MainHeader.vue";
import OptionsMenu from "@/components/left-menu/OptionsMenu.vue";
import OptionsMenu2D from "@/components/left-menu/constructor2d/OptionsMenu.vue";
import CustomiserMenu from "@/components/right-menu/CustomiserMenu.vue";
import MainPopUp from "@/components/popUp/MainPopUp.vue";

import { useRoute, useRouter } from "vue-router";

import { usePopupStore } from "@/store/appStore/popUpsStore";
import { useProjectFromQuery, waitForAppDataLoaded, getProjectIdFromQuery } from '@/features/quickActions/project/composables/useProjectFromQuery'
import { useAutosave, useAutosaveStorage } from '@/features/autosave'

const route = useRoute();
const router = useRouter();
const pageComponentRef = ref(null);

const popupStore = usePopupStore();
const autosave = useAutosave();
const autosaveStorage = useAutosaveStorage();

const { accordCheck } = useProjectFromQuery();

/** Снапшот предлагаем, только если проект не открывают по ссылке: она важнее */
const checkAutosave = async () => {
  if (getProjectIdFromQuery(route.query)) {
    return;
  }

  // Восстановление опирается на справочники материалов, поэтому ждём getdata
  await waitForAppDataLoaded();

  if (autosaveStorage.read()) {
    popupStore.openPopup('autosave');
  }
};

onMounted(() => {
  autosave.start(router);
  accordCheck();
  checkAutosave();
});

onUnmounted(() => {
  autosave.stop();
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
