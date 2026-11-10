<template>
  <button class="right-menu__button top-c" title="Копировать объект">
    <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clip-path="url(#clip0_77_9659)">
        <path
          d="M14.2887 0.98291H4.28874C3.37207 0.98291 2.62207 1.73291 2.62207 2.64958V14.3162H4.28874V2.64958H14.2887V0.98291ZM16.7887 4.31624H7.62207C6.7054 4.31624 5.9554 5.06624 5.9554 5.98291V17.6496C5.9554 18.5662 6.7054 19.3162 7.62207 19.3162H16.7887C17.7054 19.3162 18.4554 18.5662 18.4554 17.6496V5.98291C18.4554 5.06624 17.7054 4.31624 16.7887 4.31624ZM16.7887 17.6496H7.62207V5.98291H16.7887V17.6496Z"
          fill="#5D6069" />
      </g>
      <defs>
        <clipPath id="clip0_77_9659">
          <rect width="20" height="20" fill="white" transform="translate(0.955078 0.149414)" />
        </clipPath>
      </defs>
    </svg>
  </button>
</template>
<script type="ts" setup>
import { useCustomiserStore } from '@/store/appStore/useCustomiserStore';

const customiserStore = useCustomiserStore();


</script>
<style lang="scss" scoped>
.top-c {
  top: -1px;
  left: -5px;
  pointer-events: auto;
}
</style>
