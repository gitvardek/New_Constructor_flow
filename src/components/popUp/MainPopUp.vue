<script setup lang="ts">
// @ts-nocheck 31
import { POPUP_CONFIG } from '@/components/popUp';
import { usePopupStore } from '@/store/appStore/popUpsStore';
import CatalogPopUpView from "./popup-views/CatalogPopUpView.vue";

const popupStore = usePopupStore();
</script>

<template>
  <div v-if="popupStore.isAnyPopupOpen" class="popUp">
    <div class="popUp__container">
      <component 
        v-for="(_, key) in popupStore.getOpenedPopups" 
        :key="key"
        :is="POPUP_CONFIG[key].component"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.popUp {
  width: 100%;
  height: 100vh;
  position: absolute;
  left: 0;
  top: 0;
  background: $black-bg;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  &__container {
    background: $white;
    border-radius: 15px;
    padding: 25px;
  }
}
</style>