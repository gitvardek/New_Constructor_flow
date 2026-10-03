<script setup lang="ts">
// @ts-nocheck

// ==== Редактор УМ v2 — правая панель ====
// Режимы как у гардеробной (WardrobeRightPanelView): заголовок режима и
// подвкладки (переключатель виден, когда их больше одной). "Модуль" — секции и
// материалы, "Наполнение" — вставка и конфигурация, "Фасады" — двери секций
// (панели v2); раздвижные двери модуля — штатная панель обычного УМ.

import "@/components/UMconstructor/styles/UM.scss";
import { computed, ref, watch } from "vue";
import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import FasadesView from "@/components/UMconstructor/views/modules/FasadesView.vue";
import UMSectionsPanel from "./modules/UMSectionsPanel.vue";
import UMMaterialsPanel from "./modules/UMMaterialsPanel.vue";
import UMFillingsInsertPanel from "./modules/UMFillingsInsertPanel.vue";
import UMFillingsConfigPanel from "./modules/UMFillingsConfigPanel.vue";
import UMFasadesPanel from "./modules/UMFasadesPanel.vue";
import { getFillingGroups } from "../fillings/fillingGroups.ts";

const props = defineProps({
  mode: {
    type: String,
    default: "module",
  },
  UMconstructor: {
    type: UMconstructorClass,
    required: true,
  },
});

// Материалы меняют обязательность опций (эксцентрики) — список опций слева пересобирается.
const emit = defineEmits(["options-changed"]);

const TABS = {
  module: [
    { key: "sections", label: "Секции" },
    { key: "materials", label: "Материалы" },
  ],
  fillings: [
    { key: "insert", label: "Вставка" },
    { key: "configure", label: "Конфигурация" },
  ],
};

const activeTab = ref({ module: "sections", fillings: "insert" });

const grid = computed(() => props.UMconstructor.UM_STORE.getUMGrid());
const fillingGroups = computed(() => getFillingGroups(props.UMconstructor));

// Выбор наполнения (на канвасе или в списке) открывает его настройки, как в
// гардеробной. Пустой item (клик по области) подвкладку не переключает.
//
// Выбор, сделанный САМИМ переходом в режим, — тоже: вход в "Наполнение"
// выбирает первое наполнение (SelectionHighlighter.changeConstructorMode), и
// без этой проверки кнопка "Наполнение" всегда открывала бы "Конфигурацию"
// вместо "Вставки". Оба источника меняются в один флаш, поэтому watch общий.
let lastMode = props.mode;
watch(
  [() => props.mode, () => props.UMconstructor.UM_STORE.getSelected("fillings")?.item],
  ([mode, item]) => {
    const modeChanged = mode !== lastMode;
    lastMode = mode;

    if (!modeChanged && item != null) activeTab.value.fillings = "configure";
  },
);
</script>

<template>
  <div v-if="mode === 'module' || mode === 'fillings'" class="right-panel">
    <h1 class="UM no-select">{{ mode === "module" ? "Модуль" : "Наполнение" }}</h1>

    <article v-if="TABS[mode].length > 1" class="UM actions-items actions-items--right um-right-panel__tabs">
      <div class="UM actions-items--right-items">
        <button v-for="tab in TABS[mode]" :key="tab.key"
          :class="['UM no-select actions-btn actions-btn--default', { active: activeTab[mode] === tab.key }]"
          @click="activeTab[mode] = tab.key">
          {{ tab.label }}
        </button>
      </div>
    </article>

    <template v-if="mode === 'module'">
      <UMSectionsPanel v-if="activeTab.module === 'sections'" :module="grid" :UMconstructor="UMconstructor" />
      <UMMaterialsPanel v-else :module="grid" :UMconstructor="UMconstructor" @options-changed="emit('options-changed')" />
    </template>

    <template v-else>
      <UMFillingsInsertPanel v-if="activeTab.fillings === 'insert'" :fillings="fillingGroups" :module="grid"
        :UMconstructor="UMconstructor" />
      <UMFillingsConfigPanel v-else :module="grid" :UMconstructor="UMconstructor" />
    </template>
  </div>

  <div v-if="mode === 'fasades'" class="right-panel">
    <h1 class="UM no-select">Фасады</h1>

    <!-- Раздвижные двери модуля (grid.fasades) — штатная панель обычного УМ. -->
    <FasadesView v-if="grid.fasades" class="UM constructor2d-container--right--content"
      :visualizationRef="UMconstructor.RENDER_REF" :module="grid" :mode="mode" :step="1" :UMconstructor="UMconstructor" />
    <UMFasadesPanel v-else :module="grid" :UMconstructor="UMconstructor" />
  </div>
</template>

<style scoped lang="scss">
.right-panel {
  height: 100%;
}

.um-right-panel__tabs {
  margin-bottom: 0.75rem;
}
</style>
