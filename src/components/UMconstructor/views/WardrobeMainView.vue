<script setup lang="ts">
//@ts-nocheck

// ==== Гардеробная система (WARDROBE) ====
// Аналог MainView.vue, выбирается вместо него в UMconstructor.vue для
// гардеробных товаров (isWardrobeSystemProduct): box-UM MainView.vue/
// RightPanelView.vue не трогаем, вся Vue-специфика гардеробной системы живёт
// здесь и в WardrobeRightPanelView.vue/WardrobeSectionsView.vue.
//
// script setup почти дословно копирует MainView.vue (в общий composable не
// выносим — оба места небольшие): createUMgrid/reset сами определяют
// гардеробную систему, так что лайфсайкл корректен для обоих случаев.
// LeftPanelView.vue переиспользуется как есть.
//
// ОТЛИЧИЯ: (1) режима "Фасады" нет вовсе — у гардеробной системы нет фасадов,
// поэтому нет и кнопки; (2) правая панель — WardrobeRightPanelView.

import { defineExpose, onBeforeMount, onBeforeUnmount, onMounted, ref, watch, nextTick } from "vue";
import "@/components/UMconstructor/styles/UM.scss"

import WardrobeRightPanelView from "@/components/UMconstructor/views/WardrobeRightPanelView.vue";
import LeftPanelView from "@/components/UMconstructor/views/LeftPanelView.vue";
import Render2D from "@/components/UMconstructor/views/Render2D.vue";
import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import { useUMStorage } from "@/store/appStore/UniversalModule/useUMStorage.ts";
import { TTotalProps } from "@/types/types.ts";
import { canvasConfig, constructorMode } from "@/components/UMconstructor/types/UMtypes.ts";
import { useToast } from "@/features/toaster/useToast.ts";
import { getUMGridFromConfig } from "@/components/UMconstructor/utils/WardrobeSystem.ts";

type Props = {
  canvasHeight: number;
  canvasWidth: number;
  defaultDepth: number;
  productData: TTotalProps | boolean;
  verdekConstructor: Application;
};

const UMstore = useUMStorage()
const toaster = useToast();

const mode = ref<constructorMode>('module');
const module = ref(false);
const step = ref(1);
const constructor2dContainer = ref(null);

const productData = ref<TTotalProps | boolean>(false)
const refFooter = ref(null);

const visualizationRef = ref(null);
const UMconstructor = ref<UMconstructorClass | null>(null);

const props = withDefaults(defineProps<Props>(), {
  canvasHeight: 720,
  canvasWidth: 600,
  defaultDepth: 560,
  productData: false,
});

const emit = defineEmits(["close-modal"]);

const closeModal = () => {
  emit("close-modal", false);
};

const changeConstructorMode = (_mode: constructorMode) => {
  if (_mode && visualizationRef.value) {
    mode.value = _mode;
    visualizationRef.value.changeConstructorMode(_mode);
  }
}

// Клик по полке/штанге на канвасе автоматически переключает панель на
// "Наполнение" (уточнение пользователя). SelectionHighlighter.selectCell(
// "fillings", ...) пишет выбор в UM_STORE.selectedFilling независимо от
// текущего mode (тот же общий путь, что и клик по полке в самой панели —
// см. WardrobeFillingsView.vue::selectShelf) — реагируем на ЛЮБОЕ появление
// ненулевого .item здесь, не только на явные клики по канвасу. Пустой .item
// (autoSelectDeepest на маунте ниже, клик по пустому месту секции) НЕ
// переключает режим — иначе открытие модуля само прыгало бы на "Наполнение".
watch(() => UMstore.getSelected('fillings')?.item, (item) => {
  if (item != null && mode.value !== 'fillings') {
    changeConstructorMode('fillings');
  }
});

// Клик по ПРОФИЛЮ на канвасе автоматически переключает панель на "Модуль"
// (уточнение пользователя) — тот же принцип, что и у выбора полки/штанги
// выше, но отдельный канал (UM_STORE.selectedWardrobeProfileId, не
// selectedFilling — профиль не привязан к секции/типу TSelectedCell), см.
// SelectionHighlighter.selectWardrobeProfile. null (сброс выбора) не
// переключает режим.
watch(() => UMstore.selectedWardrobeProfileId, (profileId) => {
  if (profileId != null && mode.value !== 'module') {
    changeConstructorMode('module');
  }
});

// Режим размерных линий полок/штанг на канвасе (SceneBuilder.ts::
// createWardrobeSector, UM_STORE.wardrobeShelfDimensionMode) — перенесено
// сюда из WardrobeRightPanelView.vue (уточнение пользователя): это настройка
// отображения САМОГО канваса, а не конкретного подраздела правой панели,
// поэтому логичнее рядом с общим переключателем режима "Модуль"/
// "Наполнение" ниже, а не внутри правой панели. Видим только в режиме
// "Наполнение" (та же видимость, что и раньше — размерные линии полок
// показываются только там, где эти полки настраиваются). ЧИСТО визуальная
// настройка (не данные изделия) — читаем стартовое значение из UM_STORE.
const wardrobeShelfDimensionMode = ref<"gap" | "floor">(UMstore.wardrobeShelfDimensionMode);

const setWardrobeShelfDimensionMode = (dimensionMode: "gap" | "floor") => {
  wardrobeShelfDimensionMode.value = dimensionMode;
  UMstore.wardrobeShelfDimensionMode = dimensionMode;
  // Переключатель не меняет данные грида — renderGrid() зовём напрямую (не
  // UMconstructor.reset(), тот пересчитывает всю бизнес-логику модуля
  // впустую ради чисто визуальной настройки).
  UMconstructor.value?.RENDER_REF?.renderGrid(UMstore.getUMGrid());
};

const saveGrid = (_grid: GridModule) => {
  let grid = _grid || UMconstructor.value?.UM_STORE.getUMGrid();
  if (grid.errors && Object.keys(grid.errors).length > 0) {
    Object.values(grid.errors).forEach(item => {
      toaster.error(item.message, refFooter.value)
    })

    return false
  }

  toaster.success('Модуль сохранен', refFooter.value)

  return Object.assign({}, grid);
};

onBeforeMount(() => {
  UMconstructor.value = props.verdekConstructor._universalModuleConstructor;
  UMstore.setCanvasConfig(<canvasConfig>{
    canvasHeight: props.canvasHeight,
    canvasWidth: props.canvasWidth,
  })

  productData.value = props.productData || UMstore.getUMData()
  const { grid: activeUMGrid } = getUMGridFromConfig(productData.value.PROPS?.CONFIG);
  UMconstructor.value.UM_STORE.totalHeight = activeUMGrid?.height || productData.value.PROPS?.CONFIG.SIZE.height || props.canvasHeight;
  UMconstructor.value.UM_STORE.totalWidth = activeUMGrid?.width || productData.value.PROPS?.CONFIG.SIZE.width || props.canvasWidth;
  UMconstructor.value.UM_STORE.totalDepth = activeUMGrid?.depth || productData.value.PROPS?.CONFIG.SIZE.depth || 0;

  module.value = UMconstructor.value.createUMgrid(productData.value, {
    width: UMconstructor.value.UM_STORE.totalWidth,
    height: UMconstructor.value.UM_STORE.totalHeight,
    depth: UMconstructor.value.UM_STORE.totalDepth,
  });

  if (!module.value) {
    toaster.error('Ошибка создания модуля!', refFooter)
    closeModal()
  }
})

const autoSelectDeepest = () => {
  const grid = UMstore.getUMGrid();
  if (!grid?.sections?.length) return;

  UMconstructor.value?.selectCell("fillings", { sec: 0, cell: null, row: null, extra: null, item: null });
};

onMounted(async () => {
  if (module.value) {
    UMstore.setUMGrid(module.value);

    UMconstructor.value?.setRenderRef(visualizationRef)
    UMconstructor.value?.setAlertRef(refFooter)
    UMconstructor.value?.reset(UMstore.getUMGrid())

    await nextTick();
    autoSelectDeepest();
  }
  else {
    toaster.error('Ошибка создания модуля!', refFooter)
    closeModal()
  }
});

onBeforeUnmount(() => {
  module.value = false;
  UMconstructor.value = null;
});

watch(() => UMstore.getUMGrid(), () => {
  module.value = UMstore.getUMGrid();
})

defineExpose({
  saveGrid,
});

</script>

<template>
  <div v-if="productData" class="UM constructor2d-wrapper">

    <div class="UM constructor2d-container constructor2d-container--left">
      <LeftPanelView :mode="mode" :module="module" :UMconstructor="UMconstructor" />
    </div>

    <div id="midAreaUM2Dconstructor" class="UM constructor2d-container constructor2d-container--mid"
      ref="constructor2dContainer">
      <div class="UM no-select constructor2d-header">
        <div class="UM constructor2d-header--title">
          <h1>{{ productData.PROPS.NAME }}</h1>
        </div>
      </div>

      <div class="UM constructor2d-container constructor2d-header--mode-selector">
        <article class="UM actions-items actions-items--right">
          <div class="UM actions-items--right-items">
            <button :class="[
              'UM no-select actions-btn actions-btn--default', {
                active:
                  mode === 'module'
              }
            ]" @click="changeConstructorMode('module')">
              Модуль
            </button>
            <button :class="[
              'UM no-select actions-btn actions-btn--default', {
                active:
                  mode === 'fillings'
              }
            ]" @click="changeConstructorMode('fillings')">
              Наполнение
            </button>
          </div>
        </article>

        <article v-if="mode === 'fillings'" class="wardrobeShelfDimension-wrapper">

          <h3>Расстояния: </h3>
          <div class="wardrobeShelfDimension-container">
            <button :class="['wardrobeShelfDimension-button', { active: wardrobeShelfDimensionMode === 'gap' }]"
              @click="setWardrobeShelfDimensionMode('gap')">
              Между объектами
            </button>
            <button :class="['wardrobeShelfDimension-button', { active: wardrobeShelfDimensionMode === 'floor' }]"
              @click="setWardrobeShelfDimensionMode('floor')">
              До нижнего края профиля
            </button>
          </div>
        </article>
      </div>

      <div class="UM constructor2d-content">
        <Render2D ref="visualizationRef" :mode="mode" :step="step" :module="UMconstructor?.UM_STORE.getUMGrid()"
          :UMconstructor="UMconstructor" :container="constructor2dContainer"
          :max-area-height="UMconstructor?.UM_STORE.totalHeight" :max-area-width="UMconstructor?.UM_STORE.totalWidth" />
      </div>

      <section class="UM actions-footer" ref="refFooter">
        <div class="UM actions-footer--save">
          <slot name="save"></slot>
          <slot name="close"></slot>
        </div>
      </section>

    </div>

    <div class="UM constructor2d-container constructor2d-container--right">
      <WardrobeRightPanelView :mode="mode" :module="module" :UMconstructor="UMconstructor" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.constructor2d-wrapper {
  display: flex;
  gap: 1rem;
  justify-content: center;
  width: 100%;
  max-width: 100vw;
  height: 95vh;

  font-family: "Gill Sans", "Gill Sans MT", Calibri, "Trebuchet MS",
    sans-serif;
}

.wardrobeShelfDimension {

  &-wrapper,
  &-container {
    display: flex;
    gap: 0.5rem;
  }

  &-wrapper {
    align-items: center;
  }

  &-container {
    width: fit-content;
  }

  &-button {
    padding: 0.5rem 1rem;
    background-color: transparent;
    border: 1px solid $dark-grey;
    border-radius: 5rem;
    font-size: 1.2rem;
    font-weight: bold;
    color: $dark-stroke;
    white-space: nowrap;
    transition-property: background-color, color;
    transition-duration: 0.25s;
    transition-timing-function: ease;

    @media (hover:hover) {
      &:hover {

        background-color: $light-grey;
      }
    }

    &.active {
      color: $white;
      background-color: $dark-stroke;
    }
  }


}
</style>
