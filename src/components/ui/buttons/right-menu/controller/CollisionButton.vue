<template>
  <button
    class="right-menu__button bottom-b"
    :class="getActiveCollision"
    @click="toggleCollision"
  >
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3.1665 2.5C3.1665 1.94772 3.61422 1.5 4.1665 1.5C4.71879 1.5 5.1665 1.94772 5.1665 2.5V14.833H17.4995C18.0517 14.833 18.4993 15.2809 18.4995 15.833C18.4995 16.3853 18.0518 16.833 17.4995 16.833H4.1665C3.61422 16.833 3.1665 16.3853 3.1665 15.833V2.5Z"
        fill="black"
      />
      <path
        d="M8.4594 10.1263C8.84992 9.73578 9.48294 9.73578 9.87346 10.1263C10.264 10.5168 10.264 11.1498 9.87346 11.5404L4.87346 16.5404C4.48294 16.9309 3.84992 16.9309 3.4594 16.5404C3.06887 16.1498 3.06887 15.5168 3.4594 15.1263L8.4594 10.1263Z"
        fill="black"
      />
      <path
        d="M3.53557 1.72461C3.92834 1.40426 4.50734 1.42685 4.87346 1.79297L7.37346 4.29297C7.76398 4.68349 7.76398 5.31651 7.37346 5.70703C6.98294 6.09755 6.34992 6.09755 5.9594 5.70703L4.16643 3.91406L2.37346 5.70703C1.98294 6.09755 1.34992 6.09755 0.959397 5.70703C0.568873 5.31651 0.568873 4.68349 0.959397 4.29297L3.4594 1.79297L3.53557 1.72461Z"
        fill="black"
      />
      <path
        d="M14.2929 12.6263C14.6834 12.2358 15.3164 12.2358 15.707 12.6263L18.207 15.1263C18.5975 15.5168 18.5975 16.1498 18.207 16.5404L15.707 19.0404C15.3164 19.4309 14.6834 19.4309 14.2929 19.0404C13.9024 18.6498 13.9024 18.0168 14.2929 17.6263L16.0859 15.8333L14.2929 14.0404C13.9024 13.6498 13.9024 13.0168 14.2929 12.6263Z"
        fill="black"
      />
    </svg>
  </button>
</template>
<script lang="ts" setup>
import { computed } from "vue";
// import { useCustomiserStore } from "@/store/appStore/useCustomiserStore";
// import { useMenuStore } from "@/store/appStore/useMenuStore";
import { useModelState } from "@/store/appliction/useModelState";
const modelState = useModelState();

// const customiserStore = useCustomiserStore();
// const menuStore = useMenuStore();

const toggleCollision = () => {
  modelState.getCurrentModel!.userData.PROPS.RAYCAST =
    !modelState.getCurrentModel!.userData.PROPS.RAYCAST;

  // customiserStore.showCustomiserPopup();
  // menuStore.closeAllMenus();
};

const getActiveCollision = computed(() => {
  if (!modelState.getCurrentModel) return;
  return { active: modelState.getCurrentModel.userData.PROPS.RAYCAST };
});
</script>
<style lang="scss" scoped>
.bottom-b {
  bottom: 0px;
  right: 0px;
  pointer-events: auto;

}
</style>
