<script setup lang="ts">
// @ts-nocheck

// ==== Редактор УМ v2 — "Наполнение › Вставка" ====
// В стиле "Вставки" гардеробной (WardrobeInsertView): куда вставится (выбранная
// область), предупреждения, группы каталога аккордеонами с поиском и
// карточками. Вставка — FILLINGS.addFilling в выбранную область, ограничения —
// useFillingInsertRules (те же, что у FillingsInsertPanel обычного УМ).

import "@/components/UMconstructor/styles/UM.scss";
import { computed, ref } from "vue";
import { _URL } from "@/types/constants";
import { UM_PARAMS } from "@/components/UMconstructor/utils/Const.ts";
import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import Accordion from "@/components/ui/accordion/Accordion.vue";
import SearchInput from "@/components/ui/inputs/SearchInput.vue";
import ProductCard from "@/components/ui/cards/ProductCard.vue";
import { formatSelectionTitle } from "../../grid/cellPath.ts";
import { useEditorPolicy } from "../../policy/editorPolicy.ts";
import { useFillingInsertRules } from "../../fillings/useFillingInsertRules.ts";
import type { FillingGroup } from "../../fillings/fillingGroups.ts";

const props = defineProps<{
  fillings: FillingGroup[];
  module: any;
  UMconstructor: UMconstructorClass;
}>();

const policy = useEditorPolicy();

const { isFillingWidthRestricted, isFillingHeightRestricted, isFillingBlocked } = useFillingInsertRules({
  getEngine: () => props.UMconstructor,
  getModule: () => props.module,
});

const targetTitle = computed(() => {
  const { sec = null, cell = null, row = null, extra = null } = props.UMconstructor.UM_STORE.getSelected("module") ?? {};
  return formatSelectionTitle(props.module, { sec, cell, row, extra }, policy.sectionLabel);
});

const openGroupId = ref<number | null>(null);

// Поиск — по открытой группе; открыта всегда одна.
const filteredItems = ref<any[]>([]);
const isSearch = computed(() => filteredItems.value.length > 0);

// false с :open может прийти каскадом от ранее открытой группы — закрываем,
// только если закрылась текущая (как toggleCategory в WardrobeInsertView).
const toggleGroup = (groupId: number, isOpen: boolean) => {
  if (isOpen) openGroupId.value = groupId;
  else if (openGroupId.value === groupId) openGroupId.value = null;
  filteredItems.value = [];
};

const isDisabled = (group: FillingGroup, item: any) =>
  isFillingWidthRestricted.value || isFillingBlocked(group.groupID, item);

const addFilling = (group: FillingGroup, item: any) => {
  if (isDisabled(group, item)) return;
  props.UMconstructor.FILLINGS.addFilling(item, group.groupID, props.module);
};
</script>

<template>
  <div class="UM um-fillings-insert">
    <p v-if="!targetTitle" class="UM no-select um-fillings-insert__hint">
      Выберите область на канвасе, чтобы добавить в неё наполнение.
    </p>

    <template v-else>
      <p class="UM no-select um-fillings-insert__target">Добавить в: {{ targetTitle }}</p>

      <div v-if="isFillingWidthRestricted" class="UM filling-width-warning">
        Добавление недоступно: ширина области больше {{ UM_PARAMS.FILLINGS_MAX_WIDTH }} мм
      </div>
      <div v-if="isFillingHeightRestricted" class="UM filling-width-warning">
        Добавление недоступно: высота области меньше {{ UM_PARAMS.MIN_SECTION_TO_FILLINGS_HEIGHT }} мм
      </div>

      <p v-if="!fillings.length" class="UM no-select um-fillings-insert__hint">Для этого товара нет наполнения.</p>

      <Accordion v-for="group in fillings" :key="group.groupID" class="UM um-fillings-insert__category"
        :open="openGroupId === group.groupID" @toggle="(value) => toggleGroup(group.groupID, value)">
        <template #title>
          <span class="UM no-select">{{ group.groupName }}</span>
        </template>

        <SearchInput v-if="openGroupId === group.groupID" :items="group.items"
          @update:filtered="filteredItems = $event" />

        <ul class="um-fillings-insert__list">
          <li v-for="(item, itemIndex) in (isSearch ? filteredItems : group.items)" :key="itemIndex + (item.NAME || '')"
            class="um-fillings-insert__list-item">
            <ProductCard :name="item.NAME" :image="item.PREVIEW_PICTURE ? _URL + item.PREVIEW_PICTURE : null"
              :disabled="isDisabled(group, item)" @click="addFilling(group, item)" />
          </li>
        </ul>
      </Accordion>
    </template>
  </div>
</template>

<style scoped lang="scss">
.um-fillings-insert {
  padding: 0.75rem;
  overflow-y: auto;
  max-height: calc(var(--modal-large-height) - 75px);

  &__hint {
    opacity: 0.6;
  }

  &__target {
    font-weight: bold;
    margin-bottom: 0.75rem;
  }

  &__category {
    margin-bottom: 0.75rem;
  }

  // Сетка карточек — как у "Вставки" гардеробной.
  &__list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.5rem 0;
    list-style: none;
    margin: 0;

    &-item {
      padding: 0.5rem;
      background-color: #e3e5ea;
      border-radius: 1rem;
      transition-property: color, background-color;
      transition-duration: 0.25s;
      transition-timing-function: ease;

      @media (hover: hover) {
        &:hover {
          color: white;
          background-color: #a3a9b5;
        }
      }
    }
  }
}
</style>
