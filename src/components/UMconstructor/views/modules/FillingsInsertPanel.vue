<script setup lang="ts">
//@ts-nocheck
import "@/components/UMconstructor/styles/UM.scss";

import { computed, ref } from "vue";
import { _URL } from "@/types/constants.ts";
import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import { GridModule } from "@/components/UMconstructor/types/UMtypes.ts";
import Accordion from "@/components/ui/accordion/Accordion.vue";
import Tooltip from "@/components/ui/tooltip/Tooltip.vue";

interface IProps {
  fillings: Array<any>;
  module: GridModule;
  UMconstructor: UMconstructorClass;
}

const props = defineProps<IProps>();

const openedFillingGroupKey = ref<string | number | null>(null);

const filteredMaterialList = ref<Array<any>>([]);
const isSearch = computed(() => filteredMaterialList.value.length > 0);

const toggleFillingGroup = (key: string | number, isOpen: boolean) => {
  if (isOpen) {
    openedFillingGroupKey.value = key;
  } else if (openedFillingGroupKey.value === key) {
    openedFillingGroupKey.value = null;
  }
  filteredMaterialList.value = [];
};

const onSearchChange = (e: Event, totalMaterialList: Array<any>) => {
  const reg = new RegExp(`${(e.target as HTMLInputElement).value.toLowerCase()}`, "g");
  filteredMaterialList.value = totalMaterialList.filter((item) =>
    reg.test(item.NAME.toLowerCase()),
  );
  if ((e.target as HTMLInputElement).value === "") filteredMaterialList.value = [];
};
</script>

<template>
  <div class="UM splitter-container--product-data">
    <div class="UM accordion-fillings_list" v-if="fillings">
      <div class="UM splitter-container--product-items" v-for="(fillingGroup, key) in fillings"
        :key="key + fillingGroup.groupName">
        <Accordion :open="openedFillingGroupKey === key" @toggle="toggleFillingGroup(key, $event)">
          <template #title>
            <h3 class="UM item-group__title">
              {{ fillingGroup.groupName }}
            </h3>
          </template>

          <input v-if="openedFillingGroupKey === key" class="UM search" type="text" placeholder="Поиск"
            @input="(e) => onSearchChange(e, fillingGroup.items)" />

          <div class="UM item-group-wrapper">
            <ul class="list">
              <!-- Все возможные материалы -->
              <li v-if="!isSearch" :class="['item-group-color']" v-for="(filling, key1) in fillingGroup.items"
                :key="key1 + filling.NAME">
                <div class="name__container"
                  @click="UMconstructor.FILLINGS.addFilling(filling, fillingGroup.groupID, module)">
                  <img class="name__bg-item" :src="_URL + filling.PREVIEW_PICTURE" />
                  <p class="name__text-item">{{ filling.NAME }}</p>
                </div>

              </li>

              <!-- Отфильтрованные материалы -->
              <li v-else :class="['item-group-color']" v-for="(filling, key2) in filteredMaterialList"
                :key="key2 + filling.NAME">
                <div class="name__container"
                  @click="UMconstructor.FILLINGS.addFilling(filling, fillingGroup.groupID, module)">

                  <img class="name__bg-item" :src="_URL + filling.PREVIEW_PICTURE" />
                  <p class="name__text-item">{{ filling.NAME }}</p>
                </div>
              </li>
            </ul>
          </div>
        </Accordion>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.accordion {
  padding: 0.5rem 1rem;
  border-radius: 0;
  border-bottom: 1px solid $dark-stroke;
  gap: 0;

  &-fillings_list {
    padding: 1rem 0;
  }
}

.name {
  &__container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    width: 100%;
    max-width: 85px;
  }

  &__bg-item {
    width: 50px;
  }

  &__text-item {
    font-size: 1.2rem;
  }
}
</style>
