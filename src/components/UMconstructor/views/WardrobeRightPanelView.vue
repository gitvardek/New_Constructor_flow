<script setup lang="ts">
//@ts-nocheck

// ==== Гардеробная система (WARDROBE) ====
// Аналог RightPanelView.vue, но только для гардеробной системы — рендерится
// из WardrobeMainView.vue (не из box-UM MainView.vue/RightPanelView.vue).
// Нет режима "fasades" вовсе (нет вкладки "Фасады" — см. WardrobeMainView.vue).
// Режим "fillings" разбит на 2 подраздела (переключатель ниже, локальный
// fillingsSubTab): "Вставка" (WardrobeInsertView — список наполнения,
// доступного для установки в выбранный сектор) и "Конфигурация"
// (WardrobeFillingsView — настройка уже установленного наполнения).
// Режим "module" аналогично разбит на "Секторы" (WardrobeSectionsView) и
// "Настройка профилей" (WardrobeProfilesView) — тот же паттерн переключателя.

import "@/components/UMconstructor/styles/UM.scss"

import { ref, watch } from "vue";
import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import WardrobeSectionsView from "@/components/UMconstructor/views/modules/WardrobeSectionsView.vue";
import WardrobeProfilesView from "@/components/UMconstructor/views/modules/WardrobeProfilesView.vue";
import WardrobeInsertView from "@/components/UMconstructor/views/modules/WardrobeInsertView.vue";
import WardrobeFillingsView from "@/components/UMconstructor/views/modules/WardrobeFillingsView.vue";
import { GridModule } from "@/components/UMconstructor/types/UMtypes.ts";

const props = defineProps({
  module: {
    type: ref<GridModule>,
    required: true,
  },
  mode: {
    type: String,
    default: "module",
  },
  UMconstructor: {
    type: UMconstructorClass,
    required: true,
  }
});

// Подраздел "Наполнение" — "Вставка" (список доступного для установки) /
// "Конфигурация" (настройки уже установленного) — см. чат/SESSION_CONTEXT.md.
const fillingsSubTab = ref<"insert" | "configure">("insert");

// Подраздел "Секторы" — сами секторы / "Настройка профилей" (высота/тип/цвет
// каждого профиля модуля).
const sectionsSubTab = ref<"sectors" | "profiles">("sectors");

// Клик по полке/штанге на канвасе автоматически переключает эту подвкладку
// на "Конфигурация" (уточнение пользователя) — та же UM_STORE.selectedFilling,
// что и WardrobeMainView.vue слушает для переключения "Модуль"/"Наполнение"
// (см. её комментарий там). Пустой .item (маунт/клик по пустому месту
// сектора) НЕ переключает подвкладку.
watch(() => props.UMconstructor.UM_STORE.getSelected('fillings')?.item, (item) => {
  if (item != null) fillingsSubTab.value = 'configure';
});

// Клик по ПРОФИЛЮ на канвасе автоматически переключает эту подвкладку на
// "Настройка профилей" (уточнение пользователя) — тот же принцип, что и у
// выбора полки/штанги выше, но отдельный канал
// (UM_STORE.selectedWardrobeProfileId), см. WardrobeMainView.vue (там же —
// переключение "Модуль"/"Наполнение").
watch(() => props.UMconstructor.UM_STORE.selectedWardrobeProfileId, (profileId) => {
  if (profileId != null) sectionsSubTab.value = 'profiles';
});
</script>

<template>
  <div v-if="mode === 'module'" class="right-panel">
    <h1 class="UM no-select">Секторы</h1>

    <article class="UM actions-items actions-items--right wardrobe-fillings-subtabs">
      <div class="UM actions-items--right-items">
        <button :class="['UM no-select actions-btn actions-btn--default', { active: sectionsSubTab === 'sectors' }]"
          @click="sectionsSubTab = 'sectors'">
          Секторы
        </button>
        <button :class="['UM no-select actions-btn actions-btn--default', { active: sectionsSubTab === 'profiles' }]"
          @click="sectionsSubTab = 'profiles'">
          Настройка профилей
        </button>
      </div>
    </article>

    <WardrobeSectionsView v-if="sectionsSubTab === 'sectors'" class="UM constructor2d-container--right--content"
      :module="UMconstructor.UM_STORE.getUMGrid()" :UMconstructor="UMconstructor" />
    <WardrobeProfilesView v-else class="UM constructor2d-container--right--content"
      :module="UMconstructor.UM_STORE.getUMGrid()" :UMconstructor="UMconstructor" />
  </div>

  <div v-if="mode === 'fillings'" class="right-panel">
    <h1 class="UM no-select">Наполнение</h1>

    <article class="UM actions-items actions-items--right wardrobe-fillings-subtabs">
      <div class="UM actions-items--right-items">
        <button :class="['UM no-select actions-btn actions-btn--default', { active: fillingsSubTab === 'insert' }]"
          @click="fillingsSubTab = 'insert'">
          Вставка
        </button>
        <button :class="['UM no-select actions-btn actions-btn--default', { active: fillingsSubTab === 'configure' }]"
          @click="fillingsSubTab = 'configure'">
          Конфигурация
        </button>
      </div>
      <div class="border"></div>
    </article>

    <WardrobeInsertView v-if="fillingsSubTab === 'insert'" class="UM constructor2d-container--right--content"
      :module="UMconstructor.UM_STORE.getUMGrid()" :UMconstructor="UMconstructor" />
    <WardrobeFillingsView v-else class="UM constructor2d-container--right--content"
      :module="UMconstructor.UM_STORE.getUMGrid()" :UMconstructor="UMconstructor" />
  </div>
</template>

<style scoped lang="scss">
.right-panel {
  height: 100%;
}

.wardrobe-fillings-subtabs {
  margin-bottom: 0.75rem;
}
</style>
