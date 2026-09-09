<script setup lang="ts">
// @ts-nocheck

// ==== Гардеробная система (WARDROBE) — временно, черновик ====
// Аналог SectionsView.vue, но сильно упрощённый: у сектора гардеробной
// системы нет cells/cellsRows/extras/loops/hiTechProfiles — только список
// добавить/удалить (см. SectionsManager.addWardrobeSector/deleteWardrobeSector).
// Рендерится из RightPanelView.vue вместо SectionsView, когда
// module.moduleKind === 'wardrobe'.

import "@/components/UMconstructor/styles/UM.scss"
import MainInput from "@/components/ui/inputs/MainInput.vue";
import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import { ref, toRefs, onMounted, watch } from "vue";
import { TSelectedCell, GridModule } from "@/components/UMconstructor/types/UMtypes.ts";
import { WARDROBE_SECTION_WIDTH_MIN, WARDROBE_SECTION_WIDTH_MAX } from "@/Application/F-wardrobeData.ts";

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
const selectedCell = ref<TSelectedCell>(<TSelectedCell>{});

const showCurrentSector = (secIndex: number) => {
  UMconstructor?.value?.SECTIONS.selectCell(secIndex);
};

watch(() => UMconstructor?.value?.UM_STORE.getSelected('module'), () => {
  selectedCell.value = UMconstructor?.value?.UM_STORE.getSelected('module')
})

onMounted(() => {
  selectedCell.value = UMconstructor?.value?.UM_STORE.getSelected('module')
})
</script>

<template>
  <div class="UM splitter-container--product">
    <div class="UM splitter-container--product-data" v-if="module">
      <section class="UM actions-wrapper">
        <div v-for="(section, secIndex) in module.sections" :key="secIndex" class="UM actions-container"
          :class="{ active: secIndex === selectedCell.sec }" @click="showCurrentSector(secIndex)">
          <div class="wardrobeSector-wrapper">
            <div class="wardrobeSector-constainer">

              <h4 class="wardrobeSector-title ">
                Сектор {{ secIndex + 1 }}
              </h4>



              <div class="UM actions-items--width" @click.stop>
                <div class="UM actions-inputs">
                  <p class="UM actions-title">Ширина</p>
                  <div class="UM actions-input--container">
                    <!-- :key на факт. применённой ширине — баг, показанный пользователем:
                    введённое, но клампнутое (или отклонённое) число оставалось
                    висеть в поле, даже когда section.width реально менялся (см.
                    SectionsManager.updateWardrobeSectorWidth) — смена :key
                    пересоздаёт MainInput целиком, гарантированно сбрасывая его
                    внутреннее значение к актуальному :modelValue, а не полагаясь
                    на внутренний watch(props.modelValue) компонента. -->
                    <MainInput :key="`sector-width-${secIndex}-${Math.round(section.width)}`"
                      :disabled="module.sections.length <= 1"
                      @update:modelValue="(value: number) => UMconstructor.updateWardrobeSectorWidth(secIndex, value)"
                      :inputClass="'UM actions-input'" :modelValue="Math.round(section.width)"
                      :min="WARDROBE_SECTION_WIDTH_MIN" :max="WARDROBE_SECTION_WIDTH_MAX" :type="'number'"
                      :isUM="true" />
                  </div>
                </div>
              </div>

            </div>


            <button v-if="module.sections.length > 1" class="UM actions-btn actions-icon"
              @click.stop="UMconstructor.SECTIONS.deleteWardrobeSector(module, secIndex, true)">
              <img class="UM actions-icon--delete" src="/icons/delite.svg" alt="" />
            </button>
          </div>
          <!-- <p class="border"></p> -->
        </div>

        <button class="UM actions-btn actions-btn--default"
          @click="UMconstructor.SECTIONS.addWardrobeSector(module, selectedCell.sec ?? 0, 1, true)">
          Добавить сектор
        </button>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
.actions-container {
  cursor: pointer;
  padding: 0.75rem;
  border-radius: 1rem;
  margin-bottom: 1rem;

  &.active {
    background: $bg;
  }
}

.wardrobeSector {
  &-title{
    color: $black;
  }
  &-wrapper {
    width: 100%;
    display: flex;
    justify-content: space-between;

  }
}
</style>
