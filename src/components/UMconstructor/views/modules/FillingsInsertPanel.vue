<script setup lang="ts">
//@ts-nocheck
import "@/components/UMconstructor/styles/UM.scss";

import { computed, ref } from "vue";
import { _URL } from "@/types/constants.ts";
import { UM_DRAWERS_IDS, UM_PARAMS } from "../../utils/Const";
import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import { GridModule } from "@/components/UMconstructor/types/UMtypes.ts";
import Accordion from "@/components/ui/accordion/Accordion.vue";
import SearchInput from "@/components/ui/inputs/SearchInput.vue";
import ProductCard from "@/components/ui/cards/ProductCard.vue";

interface IProps {
  fillings: Array<any>;
  module: GridModule;
  UMconstructor: UMconstructorClass;
}

const props = defineProps<IProps>();

const openedFillingGroupKey = ref<string | number | null>(null);

// Один общий ref на "текущий отфильтрованный список" достаточен: одновременно
// открыта только ОДНА группа (openedFillingGroupKey), поиск внутри разных
// групп никогда не пересекается.
const filteredMaterialList = ref<Array<any>>([]);
const isSearch = computed(() => filteredMaterialList.value.length > 0);

const isFillingWidthRestricted = computed(() => {
  const { sec, cell, row, extra } = props.UMconstructor.UM_STORE.getSelected("module") ?? {};
  if (sec === null || sec === undefined) return false;
  const curSection = props.module.sections?.[sec];
  const curCell = curSection?.cells?.[cell];
  const curRow = curCell?.cellsRows?.[row];
  const curExtra = curRow?.extras?.[extra];
  const segment = curExtra || curRow || curCell || curSection;
  return (segment?.width ?? 0) > UM_PARAMS.FILLINGS_MAX_WIDTH;
});

// Универсальный ящик, стенки не менее 18 мм
const isUniversalDrawerBlocked = computed(
  () => !props.UMconstructor.FILLINGS.drawers.isUniversalDrawerAllowed(props.module),
);

const isFillingBlocked = (groupID: string | number) =>
  isFillingWidthRestricted.value ||
  (UM_DRAWERS_IDS.UNIVERSAL.includes(+groupID) && isUniversalDrawerBlocked.value);

const toggleFillingGroup = (key: string | number, isOpen: boolean) => {
  if (isOpen) {
    openedFillingGroupKey.value = key;
  } else if (openedFillingGroupKey.value === key) {
    openedFillingGroupKey.value = null;
  }
  filteredMaterialList.value = [];
};

const onAddFilling = (filling: any, groupID: number) => {
  props.UMconstructor.FILLINGS.addFilling(filling, groupID, props.module);
};
</script>

<template>
  <div class="UM splitter-container--product-data">
    <div v-if="isFillingWidthRestricted" class="UM filling-width-warning">
      Добавление недоступно: ширина области превышает {{ UM_PARAMS.FILLINGS_MAX_WIDTH }} мм
    </div>
    <div class="UM accordion-fillings_list" v-if="fillings">
      <div class="UM splitter-container--product-items" v-for="(fillingGroup, key) in fillings"
        :key="key + fillingGroup.groupName">
        <Accordion :open="openedFillingGroupKey === key" @toggle="toggleFillingGroup(key, $event)">
          <template #title>
            <h3 class="UM item-group__title">
              {{ fillingGroup.groupName }}
            </h3>
          </template>

          <SearchInput v-if="openedFillingGroupKey === key" :items="fillingGroup.items"
            @update:filtered="filteredMaterialList = $event" />

          <div class="UM item-group-wrapper">
            <ul class="list">
              <li :class="['item-group-color']"
                v-for="(filling, itemKey) in (isSearch ? filteredMaterialList : fillingGroup.items)"
                :key="itemKey + filling.NAME">
                <ProductCard :name="filling.NAME" :image="_URL + filling.PREVIEW_PICTURE"
                  :disabled="isFillingWidthRestricted ||  isFillingBlocked(fillingGroup.groupID) " @click="onAddFilling(filling, fillingGroup.groupID)" />
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
</style>
