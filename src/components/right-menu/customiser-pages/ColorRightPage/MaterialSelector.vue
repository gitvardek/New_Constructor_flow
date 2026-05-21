<script lang="ts" setup>
//@ts-nocheck
import { ref, computed, onBeforeMount } from "vue";
import { _URL } from "@/types/constants";
import Tooltip from "@/components/ui/tooltip/Tooltip.vue";

interface IProps {
  materials: Array<any>;
  modelValue?: any;
}

const props = defineProps<IProps>();

onBeforeMount(() => { });

const emit = defineEmits<{
  (e: "update:modelValue", value: any): void;
  (e: "select", value: any): void;
}>();

const filteredMaterialList = ref<any[]>([]);
const searchQuery = ref("");

const isSearch = computed(() => filteredMaterialList.value.length > 0);

const onSearchChange = (e: Event) => {
  const query = e.target.value.toLowerCase();
  const filteredData = props.materials.filter(
    (item) => item.NAME.toLowerCase().includes(query), // Проверяем, содержит ли имя запрос
  );

  filteredMaterialList.value = filteredData;
  if (e.target.value === "") filteredMaterialList.value = [];
};

const handleSelect = (material: any) => {
  emit("update:modelValue", material);
  emit("select", material);
};
</script>

<template>
  <div class="material-config__wrapper">

    <input class="search" type="text" placeholder="Поиск" @input="onSearchChange" />

    <div class="material-config_list">
      <ul class="material-config_list__details_content">
        <li v-for="material in isSearch ? filteredMaterialList : materials" :key="material.ID">

          <Tooltip :key="index" :position="top" :theme="'dark'">

            <template #trigger>
              <div class="material-config_item" @click="handleSelect(material)">
                <img class="material-config_item__img" :src="_URL + material.PREVIEW_PICTURE" alt="" />
              </div>
            </template>

            <template #content>
              <div class="material-config_item__tool">
                <img class="material-config_item__img tool" :src="_URL + material.PREVIEW_PICTURE" alt="" />
                <p>{{ material.NAME }}</p>
              </div>
            </template>

          </Tooltip>
          
        </li>
      </ul>

    </div>

  </div>
</template>

<style scoped lang="scss">

</style>
