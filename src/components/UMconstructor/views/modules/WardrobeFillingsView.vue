<script setup lang="ts">
// @ts-nocheck

// ==== Гардеробная система (WARDROBE) ====
// "Конфигурация" — настройка уже УСТАНОВЛЕННОГО наполнения выбранного
// сектора; рендерится из WardrobeRightPanelView.vue при mode==='fillings'.
// Полки (kind==='shelf'/undefined) и штанги (kind==='rail') лежат в одном
// массиве wardrobeShelves и рендерятся разными карточками. У полки правятся
// материал (для ЛДСП, каталог _WARDROBE_SYSTEM[...].shelf[...].fasade) и
// положение по Y; тип и вид задаются один раз при добавлении
// (WardrobeInsertView.vue). У штанги материала нет — карточка показывает
// name/превью из _PRODUCTS[shelf.productId] и положение по Y.
//
// Материал выбирается через MaterialSelector.vue (как в
// CorpusMaterialRedactor.vue), а не AccordionSelect. Он занимает всю высоту,
// поэтому убран в свёрнутый Accordion.vue с карточкой текущего материала в
// заголовке — по образцу ConfigurationOption.vue, но переиспользовать её
// нельзя: там box-UM типы "surface"/"milling" и @delete-choise.

import { computed, ref, toRefs, onMounted, watch } from "vue";
import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import { GridModule } from "@/components/UMconstructor/types/UMtypes.ts";
import { getWardrobeShelfMaterials, getWardrobeSectionInstallableHeight, getWardrobeShelfDepth, getWardrobeShelfDragBounds } from "@/components/UMconstructor/utils/WardrobeSystem.ts";
import { useModelState } from "@/store/appliction/useModelState.ts";
import { _URL } from "@/types/constants";
import Accordion from "@/components/ui/accordion/Accordion.vue";
import MaterialSelector from "@/components/right-menu/customiser-pages/ColorRightPage/MaterialSelector.vue";
import MainInput from "@/components/ui/inputs/MainInput.vue";

const modelState = useModelState();

// Только для отображения (тип/вид больше не редактируются здесь) — иначе
// после переноса выбора в "Вставку" эта информация нигде бы не была видна.
const SHELF_TYPE_LABELS = { flat: "Прямая", angled: "Наклонная" };
const SHELF_MATERIAL_LABELS = { ldsp: "ЛДСП", glass: "Стекло" };

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

const refreshSelected = () => {
  selectedSec.value = UMconstructor?.value?.UM_STORE.getSelected("module")?.sec ?? null;
};

onMounted(refreshSelected);
watch(() => UMconstructor?.value?.UM_STORE.getSelected("module"), refreshSelected);

// Выделенная полка/штанга (уточнение пользователя: клик по полке на канвасе
// <-> выделение в этой панели) — .item из "fillings"-выбора (UM_STORE.
// selectedFilling), тот же тип селекта, что и клик на канвасе пишет через
// ctx.selectCell("fillings", ...), см. DividerDragEngine.onWardrobeShelfDragStart/
// SelectionHighlighter.selectCell. Тот же ref+watch приём, что и у selectedSec
// выше (не computed — тот же стиль, что уже устоялся в этом файле).
const selectedShelfId = ref<number | null>(null);

const refreshSelectedShelf = () => {
  selectedShelfId.value = UMconstructor?.value?.UM_STORE.getSelected("fillings")?.item ?? null;
};

onMounted(refreshSelectedShelf);
watch(() => UMconstructor?.value?.UM_STORE.getSelected("fillings"), refreshSelectedShelf);

// Обратное направление — клик по полке/штанге ЗДЕСЬ выделяет её на канвасе.
// UMconstructor.selectCell (не UMconstructor.SHELVES.*) — тот же общий вход,
// что использует и сам канвас (ctx.selectCell), пишет в UM_STORE И толкает
// подсветку в уже отрисованные PIXI-объекты (RENDER_REF.selectCell, см.
// UMconstructorClass.selectCell).
const selectShelf = (shelfId: number) => {
  UMconstructor.value.selectCell("fillings", { sec: selectedSec.value, cell: null, row: null, extra: null, item: shelfId });
};

const selectedSection = computed(() => {
  if (selectedSec.value === null) return null;
  return module.value?.sections?.[selectedSec.value] ?? null;
});

// Полки И штанги (kind==='rail', хранятся в том же массиве wardrobeShelves —
// уточнение пользователя, "полноценная коллизия, как у полок", см.
// RailsManager.addWardrobeRail) — обе показываются здесь, но своими
// карточками (см. template ниже): у штанги нет материала/типа/цвета (только
// productId+height из каталога), поэтому вёрстка полки (SHELF_TYPE_LABELS/
// SHELF_MATERIAL_LABELS/MaterialSelector) для неё не подходит — карточка
// штанги показывает name/превью товара из каталога + положение по Y.
const configurableShelves = computed(() => selectedSection.value?.wardrobeShelves ?? []);

// "Монтажная" высота сектора — минимум из высот двух ограничивающих его
// профилей (не selectedSection.height/module.height, который равен максимуму
// по ВСЕМ профилям модуля) — выше короткого профиля полке не на чём висеть,
// см. WardrobeSystem.getWardrobeSectionInstallableHeight.
const installableHeight = computed(() => {
  if (selectedSec.value === null || !module.value) return 0;
  return getWardrobeSectionInstallableHeight(module.value, selectedSec.value);
});

// Список материалов ЛДСП зависит от товара самой полки (productId) — сегодня
// у всех полок он один и тот же (WARDROBE_SHELF_PRODUCT_ID), но метод
// параметризован на будущее (если появится второй товар-полка).
const materialsList = (shelfProductId: number) =>
  getWardrobeShelfMaterials(module.value.productID, shelfProductId);

// Границы "Положение по Y" — та же getWardrobeShelfDragBounds, что считает
// лимиты при перетаскивании мышью и (после очередного бага, найденного
// пользователем) стала единым источником правды и в самом
// ShelvesManager.updateWardrobeShelfPositionY. Раньше здесь были две ОТДЕЛЬНЫЕ
// самодельные формулы (floorGap для низа, installableHeight-height для
// верха) — ни одна не учитывала коллизии с ДРУГИМИ полками сектора, поле
// позволяло увести полку ниже/выше соседней вплотную (см. скриншоты в чате).
const positionYBounds = (shelf: any) => {
  // ТЕКУЩАЯ module.depth (не потолок getWardrobeProfileMaxDepth, который не
  // реагирует на правку самого поля "Глубина" — баг, найден пользователем),
  // см. WardrobeSystem.getWardrobeShelfDepth.
  const depthMm = getWardrobeShelfDepth(module.value);
  const shelves = selectedSection.value?.wardrobeShelves ?? [];
  return getWardrobeShelfDragBounds(shelves, shelf.id, depthMm, installableHeight.value, module.value?.productID);
};

// Флаг активного драга полки/профиля на канвасе (UM_STORE.wardrobeDragActive,
// зеркалит RenderContext.wardrobeDragActive — см. DividerDragEngine.ts).
const wardrobeDragActive = computed(() => UMconstructor?.value?.UM_STORE.wardrobeDragActive ?? false);

// Кэш карточек полок/штанг — плоский СНИМОК нужных для рендера полей,
// обновляется только когда канвас НЕ в активном драге.
//
// Зачем: module — та же реактивная grid-структура, которую мутирует PIXI при
// драге (onWardrobeShelfDragMove: shelf.positionY) и читает эта панель (а она
// открывается по клику на полку, т.е. при драге открыта почти всегда). На
// каждый pointermove Vue перечитывал positionY ВСЕХ карточек сектора и звал
// немемоизированные minPositionY/maxPositionY (каждый — проход по всем
// полкам) — при большом их числе дороже самого PIXI-рендера, и в
// PIXI-профилировании этого не видно, только по общей "подвисаемости".
//
// Критично, что снимок — ПЛОСКИЕ значения, а не ссылка на живой shelf: читай
// шаблон shelf.positionY напрямую, Vue подписал бы render-эффект на мутацию и
// перерисовывал компонент на каждый тик вопреки watch ниже.
const cachedShelfCards = ref<any[]>([]);

const computeShelfCards = () => {
  cachedShelfCards.value = configurableShelves.value.map((shelf: any) => {
    const bounds = positionYBounds(shelf);
    return {
      id: shelf.id,
      kind: shelf.kind,
      type: shelf.type,
      material: shelf.material,
      colorId: shelf.colorId,
      productId: shelf.productId,
      positionY: shelf.positionY,
      min: bounds.minY,
      max: bounds.maxY,
    };
  });
};

watch([configurableShelves, wardrobeDragActive], () => {
  if (wardrobeDragActive.value) return;
  computeShelfCards();
}, { immediate: true, deep: true });

// MaterialSelector эмитит выбранный материал целиком (сырой объект _FASADE),
// а не только id — у полки хранится только colorId (см. WardrobeShelfPlacement).
const onColorChange = (shelfId: number, material: any) => {
  UMconstructor.value.SHELVES.updateWardrobeShelfColor(module.value, selectedSec.value, shelfId, material.ID);
};

// Карточка текущего материала в заголовке Accordion — см. ConfigurationOption.vue.
const currentMaterial = (shelf: any) => (shelf.colorId ? modelState._FASADE[shelf.colorId] : null);

const currentMaterialImg = (shelf: any) => {
  const material = currentMaterial(shelf);
  return material?.PREVIEW_PICTURE ? _URL + material.PREVIEW_PICTURE : null;
};

const currentMaterialName = (shelf: any) => currentMaterial(shelf)?.NAME ?? "Не выбран";

// Карточка штанги (kind==='rail') показывает НЕ материал (его нет), а сам
// товар из каталога (productId — item.ID/item.id, см. RailsManager) —
// name/превью, тот же _URL-паттерн, что и currentMaterialImg выше.
const railProduct = (shelf: any) => modelState._PRODUCTS[shelf.productId];
const railProductImg = (shelf: any) => {
  const product = railProduct(shelf);
  return product?.PREVIEW_PICTURE ? _URL + product.PREVIEW_PICTURE : null;
};
const railProductName = (shelf: any) => railProduct(shelf)?.NAME ?? "Штанга";

const onPositionYChange = (shelfId: number, value: number) => {
  UMconstructor.value.SHELVES.updateWardrobeShelfPositionY(module.value, selectedSec.value, shelfId, value);
};

const deleteShelf = (shelfId: number) => {
  UMconstructor.value.SHELVES.deleteWardrobeShelf(module.value, selectedSec.value, shelfId, true);
};
</script>

<template>
  <div class="UM wardrobe-fillings">
    <p v-if="!selectedSection" class="UM no-select wardrobe-fillings__hint">
      Выберите сектор на канвасе, чтобы увидеть его наполнение.
    </p>

    <template v-else>
      <p class="UM no-select wardrobe-fillings__section-title">
        Сектор {{ selectedSec + 1 }}
      </p>

      <div v-for="(card, shelfIndex) in cachedShelfCards" :key="card.id"
        :class="['UM wardrobe-fillings__item', { 'wardrobe-fillings__item--active': card.id === selectedShelfId }]"
        @click="selectShelf(card.id)">
        <template v-if="card.kind === 'rail'">
          <div class="UM wardrobe-fillings__item-header">
            <div>
              <p class="UM no-select wardrobe-fillings__item-title">Штанга {{ shelfIndex + 1 }}</p>
            </div>
            <button class="UM actions-btn actions-icon" @click.stop="deleteShelf(card.id)">
              <img class="UM actions-icon--delete" src="/icons/delite.svg" alt="" />
            </button>
          </div>

          <div class="wardrobe-material-card wardrobe-fillings__rail-card">
            <img v-if="railProductImg(card)" class="wardrobe-material-card__img" :src="railProductImg(card)"
              alt="" />
            <div v-else class="wardrobe-material-card__img wardrobe-material-card__img--empty"></div>
            <div class="wardrobe-material-card__info">
              <p class="wardrobe-material-card__name">{{ railProductName(card) }}</p>
            </div>
          </div>

          <div class="actions-items--height">
            <div class="actions-inputs">
              <p class="actions-title">Положение по Y</p>
              <div class="actions-input--container">
                <MainInput :type="'number'" :inputClass="'actions-input'" :modelValue="card.positionY" :min="card.min"
                  :max="card.max" :step="1" :isUM="true"
                  @update:modelValue="(value) => onPositionYChange(card.id, Number(value))" />
              </div>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="UM wardrobe-fillings__item-header">
            <div>
              <p class="UM no-select wardrobe-fillings__item-title">Полка {{ shelfIndex + 1 }}</p>
              <p class="UM no-select wardrobe-fillings__item-subtitle">
                {{ SHELF_TYPE_LABELS[card.type] }} · {{ SHELF_MATERIAL_LABELS[card.material] }}
              </p>
            </div>
            <button class="UM actions-btn actions-icon" @click.stop="deleteShelf(card.id)">
              <img class="UM actions-icon--delete" src="/icons/delite.svg" alt="" />
            </button>
          </div>

          <Accordion v-if="card.material === 'ldsp'" class="wardrobe-fillings__material">
            <template #title>
              <div class="wardrobe-material-card">
                <img v-if="currentMaterialImg(card)" class="wardrobe-material-card__img" :src="currentMaterialImg(card)"
                  alt="" />
                <div v-else class="wardrobe-material-card__img wardrobe-material-card__img--empty"></div>
                <div class="wardrobe-material-card__info">
                  <p class="wardrobe-material-card__label">Материал</p>
                  <p class="wardrobe-material-card__name">{{ currentMaterialName(card) }}</p>
                </div>
              </div>
            </template>

            <div class="wardrobe-fillings__material-body">
              <MaterialSelector :materials="materialsList(card.productId)"
                @select="(material) => onColorChange(card.id, material)" />
            </div>
          </Accordion>

          <div class="actions-items--height">
            <div class="actions-inputs">
              <p class="actions-title">Положение по Y</p>
              <div class="actions-input--container">
                <MainInput :type="'number'" :inputClass="'actions-input'" :modelValue="card.positionY" :min="card.min"
                  :max="card.max" :step="1" :isUM="true"
                  @update:modelValue="(value) => onPositionYChange(card.id, Number(value))" />
              </div>
            </div>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.wardrobe-fillings {
  padding: 0.75rem;
  overflow-y: scroll;
  overflow-x: hidden;
  max-height: calc(var(--modal-large-height) - 75px);

  &__hint {
    opacity: 0.6;
  }

  &__section-title {
    font-weight: bold;
    margin-bottom: 1rem;
  }

  &__item {
    padding: 0.5rem;
    padding-bottom: 1rem;
    margin-bottom: 1rem;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 0.5rem;
    cursor: pointer;
    transition: background-color 0.15s ease;

    &--active {
      background: #d1ffd6a4;
      box-shadow: 0 0 0 1px rgba(5, 5, 5, 0.4) inset;
    }
  }

  &__item-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    font-size: 1.4rem;
  }

  &__item-title {
    font-weight: bold;
    opacity: 0.7;
    margin-bottom: 0;
  }

  &__item-subtitle {
    font-size: 1.4rem;
    opacity: 0.5;
    margin-bottom: 0;
  }

  &__material {
    margin-bottom: 0.75rem;
  }

  &__rail-card {
    margin-bottom: 0.75rem;
  }

  // MaterialSelector.vue сам умеет внутреннюю прокрутку — main.scss задаёт
  // .material-config_list{height:100%;overflow-y:scroll}, но это работает,
  // только если .material-config__wrapper получит ЖЁСТКУЮ (не max-) высоту
  // от родителя, как .container{max-height:100vh} в
  // AdvanceCorpusMaterialRedactor.vue. Accordion.vue такого родителя не даёт
  // (разворачивается под фактическую высоту контента) — без этой правки
  // получались ДВА независимых скролл-контейнера (свой снаружи + пустой
  // растянутый внутри). Вместо своей overflow-обёртки задаём высоту через
  // :deep() самому .material-config__wrapper — тогда работает ЕГО
  // собственный, уже готовый механизм прокрутки, единственный скролл.
  &__material-body {
    height: fit-content;
    max-height: 50vh;
    overflow-y: scroll;

    :deep(.material-config__wrapper) {
      height: 100%;
      max-height: 100%;
    }
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
