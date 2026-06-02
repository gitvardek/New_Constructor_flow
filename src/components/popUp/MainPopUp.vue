<script setup lang="ts">
// @ts-nocheck 31
import { POPUP_CONFIG } from '@/components/popUp';
import { usePopupStore } from '@/store/appStore/popUpsStore';
import CatalogPopUpView from "./popup-views/CatalogPopUpView.vue";
import { computed } from 'vue';

const popupStore = usePopupStore();
const isRoomParamsOnlyOpen = computed(() => {
  const opened = Object.keys(popupStore.getOpenedPopups || {});
  return opened.length === 1 && popupStore.popups.roomParams;
});
</script>

<template>
  <div v-if="popupStore.isAnyPopupOpen" class="popUp" :class="{ 'popUp--room-params': isRoomParamsOnlyOpen }">
    <div class="popUp__container" :class="{ 'popUp__container--room-params': isRoomParamsOnlyOpen }">
      <component v-for="(_, key) in popupStore.getOpenedPopups" :key="key" :is="POPUP_CONFIG[key].component" />
    </div>
  </div>
</template>

<style lang="scss" >
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

  &--room-params {
    background: rgba(0, 0, 0, 0.06);
  }

  &__container {
    background: $white;
    border-radius: 15px;
    padding: 25px;
    font-size: 1.4rem;
    
    &--room-params {
      background: transparent;
      padding: 0;
    }
  }
}
</style>
