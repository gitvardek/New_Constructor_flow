<script setup lang="ts">
//@ts-nocheck
import "@/components/UMconstructor/styles/UM.scss";

import { computed, ref } from "vue";
import { _URL } from "@/types/constants.ts";
import { UM_PARAMS } from "../../utils/Const";
import { useFillingInsertRules } from "@/components/UMconstructor/editor-v2/fillings/useFillingInsertRules.ts";
import DrawerFilters from "@/components/UMconstructor/editor-v2/fillings/DrawerFilters.vue";
import { isDrawerGroup } from "@/components/UMconstructor/editor-v2/fillings/drawerFilters.ts";
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

// По тому же соображению хватает одного ref на результат селектов фильтрации
// ящиков (DrawerFilters, группы из UM_DRAWERS_IDS).
const drawerFilteredItems = ref<Array<any> | null>(null);

// Список группы после селектов фильтрации (вне группы ящиков — как пришёл).
const baseItems = (fillingGroup: any, key: string | number) =>
  (openedFillingGroupKey.value === key && drawerFilteredItems.value) || fillingGroup.items;

// Поиск и фильтры действуют вместе: SearchInput эмитит результат один раз на
// ввод и о смене селектов не знает, поэтому пересекаем его с отфильтрованным.
const visibleItems = (fillingGroup: any, key: string | number) => {
  const base = baseItems(fillingGroup, key);
  return isSearch.value ? base.filter((item: any) => filteredMaterialList.value.includes(item)) : base;
};

// Ограничения вставки — общая логика с редактором v2.
const { isFillingWidthRestricted, isFillingHeightRestricted, isFillingBlocked } = useFillingInsertRules({
  getEngine: () => props.UMconstructor,
  getModule: () => props.module,
});

const toggleFillingGroup = (key: string | number, isOpen: boolean) => {
  if (isOpen) {
    openedFillingGroupKey.value = key;
  } else if (openedFillingGroupKey.value === key) {
    openedFillingGroupKey.value = null;
  }
  filteredMaterialList.value = [];
  drawerFilteredItems.value = null;
};

const onAddFilling = (filling: any, groupID: number) => {
  props.UMconstructor.FILLINGS.addFilling(filling, groupID, props.module);
};
</script>

<template>
  <div class="UM splitter-container--product-data">
    <div v-if="isFillingWidthRestricted" class="UM filling-width-warning">
      <!-- Добавление недоступно: ширина области больше {{ UM_PARAMS.FILLINGS_MAX_WIDTH }} мм  -->
      Ширина области больше {{ UM_PARAMS.FILLINGS_MAX_WIDTH }} мм: доступны только аксессуары
    </div>

    <div v-if="isFillingHeightRestricted" class="UM filling-width-warning">
      Добавление недоступно: высота области меньше {{ UM_PARAMS.MIN_SECTION_TO_FILLINGS_HEIGHT }} мм
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

          <DrawerFilters v-if="openedFillingGroupKey === key && isDrawerGroup(fillingGroup.groupID)"
            :items="fillingGroup.items" @update:filtered="drawerFilteredItems = $event" />

          <SearchInput v-if="openedFillingGroupKey === key && isDrawerGroup(fillingGroup.groupID)" :items="baseItems(fillingGroup, key)"
            @update:filtered="filteredMaterialList = $event" />

          <div class="UM item-group-wrapper">
            <p v-if="openedFillingGroupKey === key && !visibleItems(fillingGroup, key).length" class="UM no-select">
              Ничего не найдено — измените фильтры или поиск.
            </p>

            <ul class="list">
              <li :class="['item-group-color']" v-for="(filling, itemKey) in visibleItems(fillingGroup, key)"
                :key="itemKey + filling.NAME">
                <ProductCard :name="filling.NAME" :image="_URL + filling.PREVIEW_PICTURE"
                  :disabled="isFillingBlocked(fillingGroup.groupID, filling)"
                  @click="onAddFilling(filling, fillingGroup.groupID)" />
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
