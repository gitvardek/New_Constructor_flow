<script setup lang="ts">
// @ts-nocheck

// ==== Редактор УМ v2 — "Модуль › Материалы" ====
// Карточки частей корпуса в стиле гардеробной (WardrobeFillingsView): название
// и текущий материал. Клик открывает справа тот же редактор материала, что и
// панель материалов обычного УМ (SidecolorsView); логика — useModuleMaterials.

import "@/components/UMconstructor/styles/UM.scss";
import { onBeforeUnmount, onMounted, ref } from "vue";
import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import CorpusMaterialRedactor from "@/components/right-menu/customiser-pages/ColorRightPage/CorpusMaterialRedactor.vue";
import AdvanceCorpusMaterialRedactor from "@/components/ui/color/AdvanceCorpusMaterialRedactor.vue";
import ClosePopUpButton from "@/components/ui/svg/ClosePopUpButton.vue";
import MaterialThumb from "../components/MaterialThumb.vue";
import { MODULE_MATERIAL_NAMES, useModuleMaterials } from "../../materials/useModuleMaterials.ts";

const props = defineProps({
  module: {
    type: Object,
    required: true,
  },
  UMconstructor: {
    type: UMconstructorClass,
    required: true,
  },
});

// Выбор материала мог поменять обязательность опций (эксцентрики).
const emit = defineEmits(["options-changed"]);

const panelRef = ref<HTMLElement | null>(null);

const {
  currentPart,
  materialList,
  elementSize,
  materialParts,
  currentValue,
  useAdvancedRedactor,
  openPart,
  closePart,
  selectMaterial,
} = useModuleMaterials({
  getEngine: () => props.UMconstructor,
  getModule: () => props.module,
  getProductData: () => props.UMconstructor.UM_STORE.getUMData(),
  onChange: () => emit("options-changed"),
});

// Панели (стенки, накладка) — без стекла, как в SidecolorsView.
const NO_GLASS_PARTS = ["LEFTSIDECOLOR", "RIGHTSIDECOLOR", "TOPFASADECOLOR"];

// Стенка без своего цвета следует корпусу; накладка/стенка с SHOW=false — нет детали.
const partCard = (part: string, value: any) => {
  const { CONFIG } = props.UMconstructor.UM_STORE.getUMData();
  const config = CONFIG[part];
  const isSide = part === "LEFTSIDECOLOR" || part === "RIGHTSIDECOLOR";

  if (isSide && !config?.COLOR) {
    const moduleColor = props.UMconstructor.APP.FASADE[CONFIG.MODULE_COLOR];
    return { material: moduleColor, name: moduleColor?.NAME ?? "", note: "Как корпус" };
  }

  if (typeof config === "object" && config?.SHOW === false) {
    return { material: null, name: "Нет", note: "" };
  }

  // Цвет палитры (RAL/NCS) — поверх материала-основы.
  const material = value?.PALETTE ?? value?.COLOR ?? value?.TABLE ?? null;
  return { material, name: material?.NAME ?? "Не выбран", note: "" };
};

const handleOutsideClick = (event: MouseEvent) => {
  if (!currentPart.value) return;

  const panel = panelRef.value;
  const target = event.target;
  if (!panel || !(target instanceof Node) || panel.contains(target)) return;

  closePart();
};

onMounted(() => document.addEventListener("click", handleOutsideClick));
onBeforeUnmount(() => document.removeEventListener("click", handleOutsideClick));
</script>

<template>
  <div class="UM um-materials">
    <div v-for="(value, part) in materialParts" :key="part"
      :class="['UM um-materials__item', { 'um-materials__item--active': currentPart === part }]"
      @click.stop="openPart(part)">
      <div class="wardrobe-material-card">
        <MaterialThumb :item="partCard(part, value).material" />

        <div class="wardrobe-material-card__info">
          <p class="wardrobe-material-card__label">{{ MODULE_MATERIAL_NAMES[part] }}</p>
          <p class="wardrobe-material-card__name">{{ partCard(part, value).name }}</p>
          <p v-if="partCard(part, value).note" class="wardrobe-material-card__label">{{ partCard(part, value).note }}</p>
        </div>

        <span :class="['um-materials__chevron', { 'um-materials__chevron--active': currentPart === part }]">❯</span>
      </div>
    </div>
  </div>

  <transition name="slide--right" mode="out-in">
    <div v-if="currentPart" key="um-materials-select" ref="panelRef" class="no-select color--right-select">
      <ClosePopUpButton class="menu__close" @close="closePart()" />
      <h1 class="UM color__title">{{ MODULE_MATERIAL_NAMES[currentPart] }}</h1>

      <AdvanceCorpusMaterialRedactor v-if="useAdvancedRedactor" :key="currentPart" :element-data="currentValue"
        :element-index="currentPart" :material-list="materialList" :no-glass="NO_GLASS_PARTS.includes(currentPart)"
        :fasade-size="elementSize" @parent-callback="selectMaterial" @select_material="emit('options-changed')" />
      <CorpusMaterialRedactor v-else :key="currentPart" :is2Dconstructor="true" :material-list="materialList"
        :type="currentPart === 'BACKWALL' ? 'backwall' : 'surface'" @parent-callback="selectMaterial" />
    </div>
  </transition>
</template>

<style scoped lang="scss">
.um-materials {
  padding: 0.75rem;
  overflow-y: auto;
  max-height: calc(var(--modal-large-height) - 75px);

  &__item {
    cursor: pointer;
    padding: 0.5rem;
    margin-bottom: 0.75rem;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 0.5rem;
    transition: background-color 0.15s ease;

    &--active {
      background: $bg;
    }
  }

  &__chevron {
    margin-left: auto;
    color: #a3a9b5;
    transition: transform 0.15s ease;

    &--active {
      transform: rotate(180deg);
    }
  }
}

.wardrobe-material-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;

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
