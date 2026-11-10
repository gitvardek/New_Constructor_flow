<template>
  <button
    class="right-menu__button top-r"
    :class="{ active: customiserStore.isCustomiserOpen }"
    @click="togglePopup"
    title="Параметры объекта"
  >
    <svg
      width="21"
      height="21"
      viewBox="0 0 21 21"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clip-path="url(#clip0_77_9655)">
        <path
          d="M9.97591 14.8039C9.97591 15.7205 9.22591 16.4705 8.30924 16.4705C7.39258 16.4705 6.64258 15.7205 6.64258 14.8039C6.64258 13.8872 7.39258 13.1372 8.30924 13.1372C9.22591 13.1372 9.97591 13.8872 9.97591 14.8039ZM8.30924 8.13721C7.39258 8.13721 6.64258 8.88721 6.64258 9.80387C6.64258 10.7205 7.39258 11.4705 8.30924 11.4705C9.22591 11.4705 9.97591 10.7205 9.97591 9.80387C9.97591 8.88721 9.22591 8.13721 8.30924 8.13721ZM8.30924 3.13721C7.39258 3.13721 6.64258 3.88721 6.64258 4.80387C6.64258 5.72054 7.39258 6.47054 8.30924 6.47054C9.22591 6.47054 9.97591 5.72054 9.97591 4.80387C9.97591 3.88721 9.22591 3.13721 8.30924 3.13721ZM13.3092 6.47054C14.2259 6.47054 14.9759 5.72054 14.9759 4.80387C14.9759 3.88721 14.2259 3.13721 13.3092 3.13721C12.3926 3.13721 11.6426 3.88721 11.6426 4.80387C11.6426 5.72054 12.3926 6.47054 13.3092 6.47054ZM13.3092 8.13721C12.3926 8.13721 11.6426 8.88721 11.6426 9.80387C11.6426 10.7205 12.3926 11.4705 13.3092 11.4705C14.2259 11.4705 14.9759 10.7205 14.9759 9.80387C14.9759 8.88721 14.2259 8.13721 13.3092 8.13721ZM13.3092 13.1372C12.3926 13.1372 11.6426 13.8872 11.6426 14.8039C11.6426 15.7205 12.3926 16.4705 13.3092 16.4705C14.2259 16.4705 14.9759 15.7205 14.9759 14.8039C14.9759 13.8872 14.2259 13.1372 13.3092 13.1372Z"
        />
      </g>
      <defs>
        <clipPath id="clip0_77_9655">
          <rect
            width="20"
            height="20"
            transform="translate(0.955078 0.103027)"
          />
        </clipPath>
      </defs>
    </svg>
  </button>
</template>
<script type="ts" setup>
import { useCustomiserStore } from '@/store/appStore/useCustomiserStore';
import { useMenuStore } from "@/store/appStore/useMenuStore";

const customiserStore = useCustomiserStore();
const menuStore = useMenuStore();

const togglePopup = () => {
  customiserStore.showCustomiserPopup();
  menuStore.closeAllMenus();
};
</script>
<style lang="scss" scoped>
.top-r {
  top: -20px;
  right: 60px;
  pointer-events: auto;
}
</style>
