<script setup lang="ts">
//@ts-nocheck

import "@/components/UMconstructor/styles/UM.scss"

import CounterInput from "@/components/ui/inputs/CounterInput.vue";
import SectionElementAdder from "@/components/UMconstructor/views/modules/SectionElementAdder.vue";
import SectionSizeInputs from "@/components/UMconstructor/views/modules/SectionSizeInputs.vue";
import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import { onMounted, ref, toRefs, watch } from "vue";
import { TSelectedCell, GridModule } from "@/components/UMconstructor/types/UMtypes.ts";

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

const { module, mode, UMconstructor } = toRefs(props)
const selectedCell = ref<TSelectedCell>(<TSelectedCell>{})
const step = ref<number>(1)

// Аккордеоны убраны: выделенный уровень подсвечивается, поэтому нужен признак совпадения
// с текущим выбором. null означает «этот уровень не задан» — так же, как в сторе
const isSelected = (secIndex: number, cellIndex: number | null = null, rowIndex: number | null = null, extraIndex: number | null = null): boolean => {
  const { sec, cell, row, extra } = selectedCell.value ?? {}

  return sec === secIndex && cell === cellIndex && row === rowIndex && extra === extraIndex
}

const showCurrentCol = (secIndex: number | null = 0, cellIndex: number | null = null, rowIndex: number | null = null, extraIndex: number | null = null) => {
  UMconstructor?.value?.SECTIONS.selectCell(secIndex, cellIndex, rowIndex, extraIndex);
};

// Прокручиваем только список секций. scrollIntoView двигает все прокручиваемые предки
// сразу, из-за чего вместе со списком уезжал и холст конструктора.
//
// Отступ сверху — фактическая высота закреплённой панели: под ней элемент оказался бы
// наполовину скрыт. Высоту меряем, а не задаём числом, потому что на узкой панели
// кнопки переносятся на вторую строку
const scrollToElement = (domElem: HTMLElement) => {
  const scrollArea = domElem.closest(".actions-items--wrapper") as HTMLElement | null;

  if (!scrollArea) {
    return;
  }

  const panel = scrollArea.querySelector(".actions-panel--sticky");
  const panelHeight = panel?.getBoundingClientRect().height ?? 0;

  const shift = domElem.getBoundingClientRect().top - scrollArea.getBoundingClientRect().top;

  scrollArea.scrollTo({ top: scrollArea.scrollTop + shift - panelHeight });
};

const handleCellSelect = () => {
  const { sec, cell, row, extra } = selectedCell.value;

  //Задержка нужна для того, чтоб рендер списка обновился
  UMconstructor?.value?.debounce("handleCellSelectSection", () => {
    let idTag = `module_${sec}`

    if (cell !== null) {
      idTag += `_${cell}`;
    }

    if (row !== null) {
      idTag += `_${row}`;
    }

    if (extra !== null) {
      idTag += `_${extra}`;
    }

    const domElem = document.getElementById(idTag);

    if (!domElem) {
      return;
    }

    scrollToElement(domElem);
  }, 10)

};

watch(() => UMconstructor?.value?.UM_STORE.getSelected('module'), () => {
  selectedCell.value = UMconstructor?.value?.UM_STORE.getSelected('module')
  handleCellSelect()
})

onMounted(() => {
  selectedCell.value = UMconstructor?.value?.UM_STORE.getSelected('module')
})
</script>

<template>
  <div class="UM splitter-container--product">
    <div class="UM splitter-container--product-data" v-if="module">
      <section class="UM actions-wrapper">

        <div class="UM actions-header">
          <div :class="[
            'UM actions-header--container',
            { active: secIndex === selectedCell.sec },
          ]" v-for="(section, secIndex) in module.sections" :key="secIndex" :id="`module_${secIndex}`"
            @click="showCurrentCol(secIndex)">
            <button v-if="module.sections.length > 1" class="UM actions-btn actions-icon"
              @click="UMconstructor.SECTIONS.deleteSection(module, secIndex, true)">
              <img class="UM actions-icon--delete" src="/icons/delite.svg" alt="" />
            </button>
            <p class="UM actions-title actions-title--part">
              {{ secIndex + 1 }}
            </p>
          </div>
        </div>

        <div class="UM actions-container" v-for="(section, secIndex) in module.sections" :key="secIndex">
          <div class="UM actions-items--wrapper" v-if="selectedCell.sec === secIndex">
            <div class="UM accordion" v-if="section.cells.length">

              <div class="UM actions-items actions-header actions-panel--sticky">
                <div
                  v-if="!module.isHiTech && (!module.isRestrictedModule || (module.isRestrictedModule && module.sections.length < 2))"
                  class="UM actions-items--right-items-input-block">
                  <CounterInput button-text="Добавить секцию" model-value="1" max="10" min="1"
                    input-class="UM actions-items--right-items-input-block-counter"
                    button-class="UM actions-btn actions-btn--default actions-items--right-items-input-block-button"
                    type="number" @update:model-value="(count: number | string) => {
                      UMconstructor.SECTIONS.addSection({ grid: module, secIndex, count: parseInt(count), reset: true })
                    }" />
                </div>

                <!-- Без target: панель работает по текущему выделению — сектор, ячейка или субъячейка -->
                <SectionElementAdder :module="module" :UMconstructor="UMconstructor" />
              </div>

              <div class="UM actions-header">
                <p>Ячейки</p>
              </div>

              <div v-for="(cell, cellIndex) in section.cells" :key="cellIndex"
                :class="['UM actions-items--list', { 'is-selected': isSelected(secIndex, cellIndex) }]"
                :id="`module_${secIndex}_${cellIndex}`" @click.stop="showCurrentCol(secIndex, cellIndex)">
                <h3 class="item-group--title">
                  {{ secIndex + 1 }}.{{ cellIndex + 1 }}
                </h3>


                <div :class="'actions-items--container'">
                  <SectionSizeInputs :module="module" :UMconstructor="UMconstructor" :step="step"
                    :target="{ sec: secIndex, cell: cellIndex, row: null, extra: null }" />

                  <article class="actions-items">


                    <button v-if="section.cells.length > 1" class="actions-btn actions-btn--default"
                      @click="UMconstructor.SHELVES.deleteCell(module, secIndex, cellIndex)">
                      Удалить
                    </button>


                  </article>
                </div>

                <div class="accordion" v-if="cell.cellsRows?.length">
                  <div class="actions-header">
                    <p>Вертикальные ячейки</p>
                  </div>

                  <div v-for="(row, rowIndex) in cell.cellsRows" :key="rowIndex"
                    :class="['actions-items--list', { 'is-selected': isSelected(secIndex, cellIndex, rowIndex) }]"
                    :id="`module_${secIndex}_${cellIndex}_${rowIndex}`"
                    @click.stop="showCurrentCol(secIndex, cellIndex, rowIndex)">
                    <h3 class="item-group--title">
                      {{ secIndex + 1 }}.{{ cellIndex + 1 }}.{{ rowIndex + 1 }}
                    </h3>

                    <div :class="'actions-items--container'">
                      <SectionSizeInputs :module="module" :UMconstructor="UMconstructor" :step="step"
                        :target="{ sec: secIndex, cell: cellIndex, row: rowIndex, extra: null }" />

                      <article v-if="!module.isRestrictedModule" class="actions-items">


                        <button v-if="cell.cellsRows.length > 1" class="actions-btn actions-btn--default"
                          @click="UMconstructor.SHELVES.deleteRowCell(module, secIndex, cellIndex, rowIndex)">
                          Удалить
                        </button>


                      </article>
                    </div>

                    <div class="accordion" v-if="row.extras?.length">
                      <div class="actions-header">
                        <p>Горизонтальные ячейки</p>
                      </div>

                      <div v-for="(extra, extraIndex) in row.extras" :key="extraIndex"
                        :class="['actions-items--list-item', { 'is-selected': isSelected(secIndex, cellIndex, rowIndex, extraIndex) }]"
                        :id="`module_${secIndex}_${cellIndex}_${rowIndex}_${extraIndex}`"
                        @click.stop="showCurrentCol(secIndex, cellIndex, rowIndex, extraIndex)">
                        <h3 class="item-group--title">
                          {{ secIndex + 1 }}.{{ cellIndex + 1 }}.{{ rowIndex + 1 }}.{{ extraIndex + 1 }}
                        </h3>

                        <div :class="'actions-items--container'">
                          <SectionSizeInputs :module="module" :UMconstructor="UMconstructor" :step="step"
                            :target="{ sec: secIndex, cell: cellIndex, row: rowIndex, extra: extraIndex }" />

                          <article v-if="!module.isRestrictedModule" class="actions-items actions-items--right">
                            <div class="actions-items--right-items">

                              <button v-if="cell.cellsRows.length > 1" class="actions-btn actions-btn--default"
                                @click="UMconstructor.SHELVES.deleteRowExtra(module, secIndex, cellIndex, rowIndex, extraIndex)">
                                Удалить
                              </button>

                            </div>
                          </article>
                        </div>

                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </div>
            <div v-else :class="'actions-items--container'">
              <SectionSizeInputs :module="module" :UMconstructor="UMconstructor" :step="step"
                :target="{ sec: secIndex, cell: null, row: null, extra: null }" />

              <article class="actions-items">
                <div class="actions-items--right-items" v-if="secIndex == selectedCell.sec">

                  <div
                    v-if="!module.isHiTech && (!module.isRestrictedModule || (module.isRestrictedModule && module.sections.length < 2))"
                    class="actions-items--right-items-input-block">
                    <CounterInput button-text="Добавить секцию" model-value="1" max="10" min="1"
                      input-class="actions-items--right-items-input-block-counter"
                      button-class="actions-btn actions-btn--default actions-items--right-items-input-block-button"
                      type="number" @update:model-value="(count: number | string) => {
                        UMconstructor.SECTIONS.addSection({ grid: module, secIndex, count: parseInt(count), reset: true })
                      }" />
                  </div>

                  <SectionElementAdder :module="module" :UMconstructor="UMconstructor" />

                </div>
              </article>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
.accordion {
  border-radius: 0;
  border-bottom: 1px solid $dark-stroke;
  gap: 0;

}

.actions-items--container {
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem 0.75rem;
}

.actions-items--list {
  display: flex;
  flex-direction: column;
  border-radius: 0rem 0rem 1rem 1rem;
  padding: 1rem 0.75rem;

  &-item {
    border-radius: 0rem 0rem 1rem 1rem;
  }

}

.item-group--title {
  font-size: large;
  padding: 0.75rem 0.75rem 0 0.75rem;
}


.is-selected {
  position: relative;
  background-color: rgba($clicked-green, 0.1);

  // &::before {
  //   content: "";
  //   position: absolute;
  //   left: 0;
  //   top: 0;
  //   bottom: 0;
  //   width: 2px;
  //   background-color: $clicked-red;
  // }
}
.actions-panel--sticky {
  position: sticky;
  top: 0;
  z-index: 2;
  background-color: rgba($white, 1);
}
</style>