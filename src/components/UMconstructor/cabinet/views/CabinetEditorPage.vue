<script setup lang="ts">
// @ts-nocheck

// ==== Универсальная тумбочка — уровень редактора в окне гардеробной ====
// Каркас в раскладке гардеробной: слева размеры (лимиты — из сессии, см.
// cabinetEditSession.ts) и опции товара, в центре крошки + режимы + 2D + "Применить"/"Назад",
// справа панель режима редактора v2 (UMRightPanel) с названиями тумбочки
// (CABINET_EDITOR_POLICY). 2D пока штатный box-UM. Общие компоненты правого
// меню (материал, ручки, проверки размеров) работают с моделью движка сессии,
// а не с выбранным 3D-объектом (гардеробной) — см. UMconstructorClass.getModel.
//
// Движок вызывается через reactive(): только так RENDER_REF внутри методов
// движка разворачивается из ref в экземпляр Render2D (как в MainView).

import { onBeforeUnmount, onUnmounted, reactive, ref, watch } from "vue";
import "@/components/UMconstructor/styles/UM.scss";
import Render2D from "@/components/UMconstructor/views/Render2D.vue";
import ModuleSizeView from "@/components/UMconstructor/views/modules/ModuleSizeView.vue";
import Options from "@/components/right-menu/customiser-pages/RailsRightPage/Options.vue";
import { useEventBus } from "@/store/appliction/useEventBus";
import UMRightPanel from "@/components/UMconstructor/editor-v2/views/UMRightPanel.vue";
import { provideEditorPolicy } from "@/components/UMconstructor/editor-v2/policy/editorPolicy.ts";
import type { constructorMode } from "@/components/UMconstructor/types/UMtypes.ts";
import { CABINET_EDITOR_POLICY } from "../cabinetEditorPolicy.ts";
import UMLoader from "@/components/UMconstructor/UMLoader.vue";
import EditorBreadcrumbs from "@/components/UMconstructor/editor-v2/navigation/EditorBreadcrumbs.vue";
import { useEditorNavigation } from "@/components/UMconstructor/editor-v2/navigation/editorNavigation.ts";
import { useUMEditorLifecycle } from "@/components/UMconstructor/editor-v2/session/useUMEditorLifecycle.ts";
import { provideUMEngine } from "@/components/UMconstructor/ts/umEngineContext.ts";
import { useToast } from "@/features/toaster/useToast.ts";
import type { CabinetEditSession } from "../session/cabinetEditSession.ts";

const props = defineProps<{
  levelId: string;
  session: CabinetEditSession;
}>();

const navigation = useEditorNavigation();
const toaster = useToast();

const engine = reactive(props.session.engine);
const store = engine.UM_STORE;
provideUMEngine(engine);
provideEditorPolicy(CABINET_EDITOR_POLICY);

const visualizationRef = ref(null);

// Опции зависят от материалов (эксцентрики): смена key пересобирает список.
// A:OptionsUpdate шлёт редактор фасадного материала.
const eventBus = useEventBus();
const optionsKey = ref(0);
const refreshOptions = () => optionsKey.value++;
eventBus.on("A:OptionsUpdate", refreshOptions);
onBeforeUnmount(() => eventBus.off("A:OptionsUpdate", refreshOptions));

const MODES: { value: constructorMode; label: string }[] = [
  { value: "module", label: "Модуль" },
  { value: "fillings", label: "Наполнение" },
  { value: "fasades", label: "Фасады" },
];
const mode = ref<constructorMode>("module");

const changeConstructorMode = (value: constructorMode) => {
  if (!visualizationRef.value || mode.value === value) return;
  mode.value = value;
  visualizationRef.value.changeConstructorMode(value);
};

// Выбранный объект открывает свой режим (решение пользователя): ящик —
// "Наполнение", сегмент фасада — "Фасады". Тот же приём, что в гардеробной
// (WardrobeMainView следит за выбором в сторе), и единый вход и для канваса, и
// для панелей. Выбор, который делает сам переход режима, режим уже не меняет —
// changeConstructorMode выходит на первой строке.
//
// На ТЕКУЩЕМ 2D (box-UM) кликабельны только объекты активного режима
// (SceneBuilder: наполнение и фасады вешают pointerdown при своём mode),
// поэтому с канваса это пока срабатывает лишь внутри режима; межрежимные
// клики заработают на новом 2D.
watch(() => store.getSelected("fillings")?.item, (item) => {
  // Пустой item — клик по области, а не по наполнению.
  if (item != null) changeConstructorMode("fillings");
});

// Ключом, а не объектом: setSelected каждый раз кладёт НОВЫЙ объект, и слежение
// по ссылке срабатывало бы на любой выбор, в том числе на тот же самый сегмент.
watch(
  () => {
    const { sec, cell, row } = store.getSelected("fasades") ?? {};
    return [sec, cell, row].some((index) => index == null) ? null : `${sec}-${cell}-${row}`;
  },
  (segment) => {
    if (segment) changeConstructorMode("fasades");
  },
);

const { module } = useUMEditorLifecycle({
  engine,
  productData: props.session.productData,
  visualizationRef,
  prepareGrid: (grid) => props.session.prepareGrid(engine, grid),
  onError: () => {
    toaster.error("Ошибка создания модуля тумбочки!");
    navigation?.pop();
  },
});

// Точка отсчёта несохранённых изменений — после первого пересчёта сетки.
let baseline: string | null = null;
watch(() => store.getLoad, (loading) => {
  if (!loading && baseline === null) baseline = props.session.snapshot();
});

const isDirty = () => baseline !== null && props.session.snapshot() !== baseline;

navigation?.setBeforeLeave(props.levelId, () =>
  !isDirty() || window.confirm("Изменения тумбочки не применены. Выйти без применения?"),
);

const apply = () => {
  const grid = store.getUMGrid();
  if (grid.errors && Object.keys(grid.errors).length > 0) {
    Object.values(grid.errors).forEach((error) => toaster.error(error.message));
    return;
  }

  props.session.apply(grid);
  toaster.success("Тумбочка обновлена");
  navigation?.pop();
};

onUnmounted(() => props.session.dispose());
</script>

<template>
  <div class="UM constructor2d-wrapper">
    <div class="UM constructor2d-container constructor2d-container--left">
      <div class="UM constructor2d-container--left--module-configs">
        <ModuleSizeView :product-data="store.getUMData()" :module="store.getUMGrid()" mode="module"
          :UMconstructor="engine" :show-horizont="false" />

        <template v-if="module">
          <div class="UM no-select actions-sections-header">
            <h1>Опции</h1>
          </div>
          <Options :key="optionsKey" class="UM no-select cabinet-editor__options" />
        </template>
      </div>
    </div>

    <div id="midAreaUM2Dconstructor" class="UM constructor2d-container constructor2d-container--mid">
      <div class="UM no-select constructor2d-header">
        <div class="UM constructor2d-header--title">
          <EditorBreadcrumbs v-if="navigation" :navigation="navigation" />
        </div>
      </div>

      <div class="UM constructor2d-container constructor2d-header--mode-selector">
        <article class="UM actions-items actions-items--right">
          <div class="UM actions-items--right-items">
            <button v-for="item in MODES" :key="item.value"
              :class="['UM no-select actions-btn actions-btn--default', { active: mode === item.value }]"
              @click="changeConstructorMode(item.value)">
              {{ item.label }}
            </button>
          </div>
        </article>
      </div>

      <div class="UM constructor2d-content">
        <Render2D ref="visualizationRef" :mode="mode" :step="1" :module="store.getUMGrid()" :UMconstructor="engine"
          :max-area-height="store.totalHeight" :max-area-width="store.totalWidth" />
      </div>

      <section class="UM actions-footer">
        <div class="UM actions-footer--save">
          <button class="no-select actions-btn actions-btn--footer" :disabled="store.pendingOperations > 0"
            @click="apply">
            Применить
          </button>
          <button class="no-select actions-btn actions-btn--footer" @click="navigation?.back()">
            Назад
          </button>
        </div>
      </section>
    </div>

    <div class="UM constructor2d-container constructor2d-container--right">
      <UMRightPanel v-if="module" :mode="mode" :UMconstructor="engine" @options-changed="refreshOptions" />
    </div>

    <div v-if="store.getLoad" class="um-modal-loader-overlay">
      <UMLoader />
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

  font-family: "Gill Sans", "Gill Sans MT", Calibri, "Trebuchet MS", sans-serif;
}

.constructor2d-header--mode-selector {
  flex-direction: row;
}

.cabinet-editor__options {
  margin-top: 5px;
}
</style>
