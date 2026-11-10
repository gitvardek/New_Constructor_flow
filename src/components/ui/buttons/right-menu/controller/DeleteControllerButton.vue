<template>
  <button class="right-menu__button top-b" title="Удалить объект">
    <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clip-path="url(#clip0_77_9663)">
        <path
          d="M5.06087 16.5355C5.06087 17.4521 5.81087 18.2021 6.72754 18.2021H13.3942C14.3109 18.2021 15.0609 17.4521 15.0609 16.5355V6.53548H5.06087V16.5355ZM6.72754 8.20215H13.3942V16.5355H6.72754V8.20215ZM12.9775 4.03548L12.1442 3.20215H7.97754L7.14421 4.03548H4.22754V5.70215H15.8942V4.03548H12.9775Z"
          fill="#5D6069" />
      </g>
      <defs>
        <clipPath id="clip0_77_9663">
          <rect width="20" height="20" fill="white" transform="translate(0.0605469 0.702148)" />
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
.top-b {
  top: 70px;
  left: -20px;
  pointer-events: auto;
}
</style>
