<script setup lang="ts">
//@ts-nocheck

import {onBeforeMount, ref} from "vue";
import MainButton from "@/components/ui/buttons/MainButton.vue";
import {usePopupStore} from "@/store/appStore/popUpsStore.ts";
import {useTechnologistStorage} from "@/store/appStore/technologist/useTechnologistStorage.ts";

const props = defineProps({
  project: {
    type: Object,
    default: false,
    required: true,
  }
});
const popupStore = usePopupStore();
const technologistStorage = useTechnologistStorage();

const currentProject = ref<Object|boolean>(false);

const openTechonologistForm = () => {
  technologistStorage.setCurrentProjectID(currentProject.value.id);
  popupStore.openPopup('technologist-form')
}

onBeforeMount(()=>{
  currentProject.value = props.project || false;
})
</script>

<template>
  <MainButton
      :className="'technologist-button'"
      @click="openTechonologistForm"
  >
    Проверить технологом
  </MainButton>
</template>

<style scoped lang="scss">
.technologist-button{
  border: blue solid 1px;
  border-radius: 15px;
  font-size: 1.6rem;
  padding: 10px 15px;
  margin-bottom: 1rem;
  font-weight: 500;
  outline: none;
  background: $bg;
  color: blue;
  transition-property: background-color, color;
  transition-duration: 0.25s;
  transition-timing-function: ease;

  &:hover {
    background-color: $red;
    color: $white;
    border: black solid 1px;
  }
}
</style>