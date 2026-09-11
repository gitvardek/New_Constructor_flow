<script setup lang="ts">
// @ts-nocheck

// ==== Гардеробная система (WARDROBE) ====
// Подраздел "Вставка" панели "Наполнение" (WardrobeRightPanelView.vue) —
// наполнение, доступное для установки в ВЫБРАННУЮ секцию. Две категории:
// 1. "Полки" — тип и вид выбираются здесь (AccordionSelect) ДО добавления и
//    потом не редактируются (ShelvesManager.addWardrobeShelf; в
//    WardrobeFillingsView.vue у полки остаются материал и положение по Y).
//    Всегда видима, в список ниже не входит.
// 2. Динамические группы каталога (fillingsGroups,
//    getWardrobeFillingsGroups) — аккордеоны после "Полок", по одному на
//    группу _PRODUCTS[wardrobeProductId].FILLING_SECTION -> _SECTIONS[groupID].
//    Вёрстка (поиск + сетка карточек) — те же SearchInput.vue/ProductCard.vue,
//    что у box-UM FillingsInsertPanel.vue. Клик по карточке добавляет ШТАНГУ
//    (RailsManager.addWardrobeRail) в section.wardrobeShelves рядом с полками
//    (kind==='rail'), с полноценной коллизией: поиск места/зазоры/драг
//    переиспользованы без правок, всё уже дженерик над {type, positionY, kind}.

import { computed, ref, toRefs, onMounted, watch } from "vue";
import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import { GridModule } from "@/components/UMconstructor/types/UMtypes.ts";
import { getWardrobeShelfMaterials, getWardrobeFillingsGroups } from "@/components/UMconstructor/utils/WardrobeSystem.ts";
import { WARDROBE_SHELF_PRODUCT_ID } from "@/components/UMconstructor/ts/createWardrobeGrid.ts";
import { useModelState } from "@/store/appliction/useModelState.ts";
import { _URL } from "@/types/constants";
import Accordion from "@/components/ui/accordion/Accordion.vue";
import AccordionSelect from "@/components/ui/accordion/AccordionSelect.vue";
import CounterInput from "@/components/ui/inputs/CounterInput.vue";
import SearchInput from "@/components/ui/inputs/SearchInput.vue";
import ProductCard from "@/components/ui/cards/ProductCard.vue";
import MaterialSelector from "@/components/right-menu/customiser-pages/ColorRightPage/MaterialSelector.vue";

const modelState = useModelState();

const SHELF_TYPE_OPTIONS = [
  { value: "flat", label: "Прямая" },
  { value: "angled", label: "Наклонная" },
];

const SHELF_MATERIAL_OPTIONS = [
  { value: "ldsp", label: "ЛДСП" },
  { value: "glass", label: "Стекло" },
];

const props = defineProps({
  module: {
    type: ref<GridModule>,
    required: true,
  },
  UMconstructor: {
    type: UMconstructorClass,
    required: true,
  },
});

const { module, UMconstructor } = toRefs(props);
const selectedSec = ref<number | null>(null);
// По умолчанию раскрыт аккордеон "Полки" — уточнение пользователя.
// WardrobeInsertView монтируется заново при КАЖДОМ переключении на вкладку
// "Вставка" (WardrobeRightPanelView.vue: v-if="fillingsSubTab === 'insert'",
// не v-show), поэтому начальное значение здесь применяется при каждом входе
// на вкладку, не только при первой загрузке.
const openCategory = ref<string | null>("shelves");
const newShelfType = ref<"flat" | "angled">("flat");
const newShelfMaterial = ref<"ldsp" | "glass">("ldsp");
// Материал устанавливаемых ЛДСП-полок (для "Вставка" + "Применить ко всем").
const newShelfColorId = ref<number | null>(null);

const shelfMaterialsList = computed(() =>
  module.value ? getWardrobeShelfMaterials(module.value.productID, WARDROBE_SHELF_PRODUCT_ID) : [],
);

// Группы наполнения, кроме "Полки" (та — отдельный, всегда видимый элемент
// выше, не трогается, уточнение пользователя) — из каталога, см.
// WardrobeSystem.getWardrobeFillingsGroups (_PRODUCTS[wardrobeProductId].
// FILLING_SECTION -> _SECTIONS[groupID].PRODUCTS -> _PRODUCTS[itemId]).
// Рендерятся ПЛОСКИМ списком аккордеонов (не вложены друг в друга и не под
// общей категорией-обёрткой вроде бывшей "Штанга") — тот же уровень, что и
// "Полки", участвуют в том же openCategory. Вёрстка внутри каждой —
// SearchInput+ProductCard, тот же паттерн, что box-UM
// FillingsInsertPanel.vue (см. пример со скриншота в чате). Клик по карточке
// добавляет ШТАНГУ (RailsManager.addWardrobeRail, уточнение пользователя) —
// сегодня ВСЕ товары динамических групп трактуются как штанги (единственная
// реальная группа сейчас — "Аксессуары для шкафов", вся состоит из
// штанг/труб); если позже появятся группы с другими типами наполнения
// (тумбочки и т.п.), этот клик придётся различать по группе/товару.
const fillingsGroups = computed(() =>
  module.value ? getWardrobeFillingsGroups(module.value.productID) : [],
);

const addRail = (item: any) => {
  if (selectedSec.value === null) return;
  UMconstructor.value.RAILS.addWardrobeRail(module.value, selectedSec.value, item, true);
};

// Один общий ref на "текущий отфильтрованный список" достаточен: одновременно
// открыта (через общий openCategory) только ОДНА группа, поэтому поиск
// внутри разных групп никогда не пересекается — тот же принцип, что и у
// единого filteredMaterialList в оригинале box-UM.
const filteredGroupItems = ref<any[]>([]);
const isGroupSearch = computed(() => filteredGroupItems.value.length > 0);

// Дефолт — первый доступный материал из каталога, как только он стал известен.
watch(shelfMaterialsList, (list) => {
  if (newShelfColorId.value === null && list.length) newShelfColorId.value = list[0].ID;
}, { immediate: true });

const refreshSelected = () => {
  selectedSec.value = UMconstructor?.value?.UM_STORE.getSelected("module")?.sec ?? null;
};

onMounted(refreshSelected);
watch(() => UMconstructor?.value?.UM_STORE.getSelected("module"), refreshSelected);

const selectedSection = computed(() => {
  if (selectedSec.value === null) return null;
  return module.value?.sections?.[selectedSec.value] ?? null;
});

// Accordion.vue сам переключает свой isOpen по клику и эмитит toggle; когда
// сюда приходит :open=false, это может быть каскадное закрытие ДРУГОЙ,
// ранее открытой категории (её watch на изменившийся :open сам зовёт toggle()
// и эмитит false) — сбрасывать openCategory в null нужно только если false
// пришёл от категории, которая и так считается текущей открытой, иначе он
// затирает key, только что выставленный кликом по новой категории.
const toggleCategory = (key: string, isOpen: boolean) => {
  if (isOpen) {
    openCategory.value = key;
  } else if (openCategory.value === key) {
    openCategory.value = null;
  }
};

const addShelf = (count: number | string) => {
  const safeCount = Math.max(1, Math.floor(Number(count) || 1));
  UMconstructor.value.SHELVES.addWardrobeShelf(
    module.value,
    selectedSec.value,
    newShelfType.value,
    newShelfMaterial.value,
    safeCount,
    true,
    newShelfColorId.value,
  );
};

// MaterialSelector эмитит материал целиком (сырой объект _FASADE) — храним
// только id, как и у уже установленных полок (WardrobeShelfPlacement.colorId).
const onShelfMaterialSelect = (material: any) => {
  newShelfColorId.value = material.ID;
};

// Карточка текущего материала в заголовке Accordion — см. WardrobeFillingsView.vue.
const currentShelfMaterial = computed(() =>
  newShelfColorId.value ? modelState._FASADE[newShelfColorId.value] : null,
);
const currentShelfMaterialImg = computed(() =>
  currentShelfMaterial.value?.PREVIEW_PICTURE ? _URL + currentShelfMaterial.value.PREVIEW_PICTURE : null,
);
const currentShelfMaterialName = computed(() => currentShelfMaterial.value?.NAME ?? "Не выбран");

const applyMaterialToAll = () => {
  if (!newShelfColorId.value) return;
  UMconstructor.value.SHELVES.applyMaterialToAllShelves(module.value, newShelfColorId.value, true);
};
</script>

<template>
  <div class="UM wardrobe-insert">
    <p v-if="!selectedSection" class="UM no-select wardrobe-insert__hint">
      Выберите сектор на канвасе, чтобы добавить в него наполнение.
    </p>

    <template v-else>
      <Accordion class="wardrobe-insert__category" :open="openCategory === 'shelves'"
        @toggle="(value) => toggleCategory('shelves', value)">
        <template #title>
          <span class="UM no-select">Полки</span>
        </template>

        <div class="wardrobe-insert__options">
          <AccordionSelect label="Тип полки" :options="SHELF_TYPE_OPTIONS" :modelValue="newShelfType"
            @update:modelValue="(value) => (newShelfType = value)" />

          <AccordionSelect label="Вид полки" :options="SHELF_MATERIAL_OPTIONS" :modelValue="newShelfMaterial"
            @update:modelValue="(value) => (newShelfMaterial = value)" />

          <template v-if="newShelfMaterial === 'ldsp'">
            <div class="wardrobe-insert__material-wrapper">
              <Accordion class="wardrobe-insert__material">
                <template #title>
                  <div class="wardrobe-material-card">
                    <img v-if="currentShelfMaterialImg" class="wardrobe-material-card__img"
                      :src="currentShelfMaterialImg" alt="" />
                    <div v-else class="wardrobe-material-card__img wardrobe-material-card__img--empty"></div>
                    <div class="wardrobe-material-card__info">
                      <p class="wardrobe-material-card__label">Материал</p>
                      <p class="wardrobe-material-card__name">{{ currentShelfMaterialName }}</p>
                    </div>
                  </div>
                </template>

                <div class="wardrobe-insert__material-body">
                  <MaterialSelector :materials="shelfMaterialsList" @select="onShelfMaterialSelect" />
                </div>
              </Accordion>

              <button class="UM actions-btn actions-btn--default" :disabled="!newShelfColorId"
                @click="applyMaterialToAll">
                Применить ко всем
              </button>
            </div>

          </template>

          <div class="wardrobe-insert__count">
            <p class="wardrobe-insert__count-lable">Количество:</p>
            <CounterInput button-text="Добавить" model-value="1" max="20" min="1" type="number"
              input-class="UM actions-items--right-items-input-block-counter"
              button-class="UM actions-btn actions-btn--default actions-items--right-items-input-block-button"
              placeholder="Количество" @update:model-value="addShelf" />
          </div>
        </div>
      </Accordion>

      <Accordion v-for="group in fillingsGroups" :key="group.groupID" class="UM wardrobe-insert__category"
        :open="openCategory === `group-${group.groupID}`"
        @toggle="(value) => toggleCategory(`group-${group.groupID}`, value)">
        <template #title>
          <span class="UM no-select">{{ group.groupName }}</span>
        </template>
  
          <SearchInput v-if="openCategory === `group-${group.groupID}`" :items="group.items"
            @update:filtered="filteredGroupItems = $event" />

          <ul class="wardrobe-insert__product-list">
            <li v-for="(item, itemIndex) in (isGroupSearch ? filteredGroupItems : group.items)"
              :key="itemIndex + (item.NAME || '')" class="wardrobe-insert__product-list-item">
              <ProductCard :name="item.NAME" :image="item.PREVIEW_PICTURE ? _URL + item.PREVIEW_PICTURE : null"
                @click="addRail(item)" />
            </li>
          </ul>
      
      </Accordion>
    </template>
  </div>
</template>

<style scoped lang="scss">
.wardrobe-insert {
  padding: 0.75rem;

  &__hint {
    opacity: 0.6;
  }

  &__category {
    margin-bottom: 0.75rem;

    &--disabled {
      opacity: 0.5;
    }
  }

  &__options {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem 0;
  }

  &__options>* {
    padding-bottom: 0.5rem;

    border-radius: 0;
    border-bottom: solid 1px $dark-grey
  }

  // Сетка карточек ProductCard.vue для динамических групп наполнения — тот
  // же приём (flex-wrap), что и .list у box-UM FillingsInsertPanel.vue.
  &__product-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.5rem 0;
    list-style: none;
    margin: 0;
    max-height: 50rem;
    overflow-y: auto;

    &-item {
      padding: 0.5rem;
      background-color: #e3e5ea;
      border-radius: 1rem;
      transition-property: color, background-color;
      transition-duration: 0.25s;
      transition-timing-function: ease;

      @media (hover:hover) {
        &:hover {
          color: white;
          background-color: #a3a9b5;
        }
      }
    }
  }

  &__material {
    margin-bottom: 0.5rem;
  }

  &__count {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    &-lable {
      font-size: 1.2rem;
    }
  }

  // Тот же приём, что и в WardrobeFillingsView.vue — MaterialSelector.vue
  // требует жёсткую (не max-) высоту от родителя для своей внутренней
  // прокрутки (main.scss: .material-config_list{height:100%;overflow-y:scroll}),
  // Accordion.vue такой родитель не даёт сам по себе.
  &__material-body {
    height: 50rem;

    :deep(.material-config__wrapper) {
      height: 100%;
      max-height: 100%;
    }
  }

  &__material-wrapper {
    display: flex;
    flex-direction: column;
  }
}

.wardrobe-material-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;

  &__img {
    height: 45px;
    width: 45px;
    flex-shrink: 0;
    border-radius: 12px;
    box-shadow: 0px 0px 6px 0px rgba(48, 48, 48, 0.1);
    // object-fit: cover;

    &--empty {
      background: rgba(0, 0, 0, 0.05);
    }
  }

  &__info {
    min-width: 0;
  }

  &__label {
    color: rgb(131, 133, 135);
    font-size: 1.2rem;
    margin-bottom: 0;
  }

  &__name {
    font-size: 1.4rem;
    margin-bottom: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
