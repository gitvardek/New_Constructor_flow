<script setup lang="ts">
//@ts-nocheck
import "@/components/UMconstructor/styles/UM.scss";

import { _URL } from "@/types/constants.ts";
import { UM_DRAWERS_IDS, UM_PARAMS } from "../../utils/Const";
import AdvanceCorpusMaterialRedactor from "@/components/ui/color/AdvanceCorpusMaterialRedactor.vue";
import ClosePopUpButton from "@/components/ui/svg/ClosePopUpButton.vue";
import ConfigurationOption from "@/components/right-menu/customiser-pages/ColorRightPage/ConfigurationOption.vue";
import Handles from "@/components/right-menu/customiser-pages/FigureRightPage/Handles/Handles.vue";
import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import { computed, onBeforeUnmount, onMounted, ref, toRefs, watch } from "vue";
import FillingsInsertPanel from "@/components/UMconstructor/views/modules/FillingsInsertPanel.vue";
import Accordion from "@/components/ui/accordion/Accordion.vue";
import { useFigureRightPage } from "@/utils/useFigureRightPage";
import {
  FillingObject,
  GridCell,
  GridCellsRow,
  GridModule,
  GridRowExtra,
  GridSection,
  TSelectedCell,
} from "@/components/UMconstructor/types/UMtypes.ts";

const props = defineProps({
  module: {
    type: ref<GridModule>,
    required: true,
  },
  fillings: {
    type: Array,
    default: [],
    required: true,
  },
  UMconstructor: {
    type: UMconstructorClass,
    required: true,
  },
});

type axis = "X" | "Y";
type workMode = "config" | "add";
const mode = ref<workMode>("add");
const changeConstructorMode = (_mode: workMode) => {
  if (_mode) {
    mode.value = _mode;
  }
};

type selectedMaterial = {
  sec: number | null;
  cell?: number | null;
  row?: number | null;
  extra?: number | null;
  item?: number | null;
  data: {};
  fasadeSize?: {};
};

const isOpenMaterialSelector = ref<boolean>(false);
const currentFasadeMaterial = ref<selectedMaterial | boolean>(false);
const isOpenHandleSelector = ref<boolean>(false);
const currentHandle = ref<selectedMaterial | boolean>(false);
const panelRef = ref<HTMLElement | null>(null);

const step = ref<number>(1);

const selectedFilling = ref<TSelectedCell>(<TSelectedCell>{});

const { module, UMconstructor } = toRefs(props);
const { createSurfaceList } = useFigureRightPage();

const createFacadeData = (fasadeIndex?: number) => {
  UMconstructor?.value?.FASADES.createFacadeData(fasadeIndex);
};

const reset = (grid) => {
  UMconstructor?.value?.reset();
};

const getSegment = (sec, cell, row, extra) => {
  const curSection = module.value.sections[sec];
  const curCell = curSection?.cells?.[cell];
  const curRow = curCell?.cellsRows?.[row];
  const curExtra = curRow?.extras?.[extra];
  return curExtra || curRow || curCell || curSection;
};

const openFasadeSelector = (
  sec: number,
  cell: number | null,
  row: number | null,
  extra: number | null,
  fillingIndex: number | null,
) => {
  // fillingIndex — индекс в массиве; filling.id — уникальный ID, который ждёт UM_STORE
  const fillingId = getSegment(sec, cell, row, extra)?.fillings?.[fillingIndex]?.id ?? fillingIndex;

  if (
    currentFasadeMaterial.value &&
    sec === currentFasadeMaterial.value.sec &&
    cell === currentFasadeMaterial.value.cell &&
    row === currentFasadeMaterial.value.row &&
    extra === currentFasadeMaterial.value.extra &&
    fillingId === currentFasadeMaterial.value.item
  ) {
    closeMenu();
    return;
  }

  /** @Создание_данных_для_выбранного_фасада */
  createFacadeData();
  closeMenu();

  setTimeout(() => {
    const curModuleSegment = getSegment(sec, cell, row, extra);
    const fillObj = curModuleSegment.fillings[fillingIndex];
    let data = fillObj.fasade.material;
    currentFasadeMaterial.value = {
      sec,
      cell,
      row,
      item: fillingId,
      extra,
      data,
      fasadeSize: {
        FASADE_WIDTH: fillObj.fasade.width,
        FASADE_HEIGHT: fillObj.fasade.height,
        isDrawer: true,
      },
    };
    UMconstructor?.value?.FILLINGS.selectCell(sec, cell, row, extra, fillingId);
    isOpenMaterialSelector.value = true;
  }, 10);
};

const openHandleSelector = (
  sec: number,
  cell: number | null,
  row: number | null,
  extra: number | null,
  fillingIndex: number | null,
) => {
  const fillingId = getSegment(sec, cell, row, extra)?.fillings?.[fillingIndex]?.id ?? fillingIndex;

  if (
    currentHandle.value &&
    sec === currentHandle.value.sec &&
    cell === currentHandle.value.cell &&
    row === currentHandle.value.row &&
    extra === currentHandle.value.extra &&
    fillingId === currentHandle.value.item
  ) {
    closeMenu();
    return;
  }

  closeMenu();

  setTimeout(() => {
    const curModuleSegment = getSegment(sec, cell, row, extra);
    const fillObj = curModuleSegment.fillings[fillingIndex];
    let data = fillObj.fasade.material;

    if (!data.HANDLES) data.HANDLES = { id: null, position: 'right' };

    currentHandle.value = {
      sec,
      cell,
      row,
      item: fillingId,
      extra,
      data,
    };
    UMconstructor?.value?.FILLINGS.selectCell(sec, cell, row, extra, fillingId);
    isOpenHandleSelector.value = true;
  }, 10);
};

const selectHandle = (data: any, type: string) => {
  switch (type) {
    case "handle":
      currentHandle.value.data.HANDLES.id = data;
      break;
    case "position":
      currentHandle.value.data.HANDLES.position = data;
      break;
  }

  // Object.assign провоцирует Vue задетектировать изменение HANDLES через переназначение свойства
  const { sec, cell, row, extra, item } = currentHandle.value;
  const curModuleSegment = getSegment(sec, cell, row, extra);
  const fillObj = curModuleSegment?.fillings?.find(f => f.id === item);
  if (fillObj?.fasade) {
    fillObj.fasade.material = Object.assign(fillObj.fasade.material, currentHandle.value.data);
    UMconstructor?.value?.FILLINGS.syncDrawerFasade(sec, fillObj, module.value);
  }

  reset()
};

const selectOption = (value: Object, type: string, palette: Object = false) => {

  currentFasadeMaterial.value.data[type] = value ? value.ID ?? value : null;
  if (palette) currentFasadeMaterial.value.data["PALETTE"] = palette;

  if (type === "COLOR") {
    if (
      currentFasadeMaterial.value.data[type] ===
      UMconstructor?.value?.CONST.NO_FASADE_ID
    )
      currentFasadeMaterial.value.data["MANUAL_NO_FASADE"] = true;
    else delete currentFasadeMaterial.value.data["MANUAL_NO_FASADE"];
  }

  let { sec, cell, row, extra, item } = currentFasadeMaterial.value;
  const curModuleSegment = getSegment(sec, cell, row, extra);
  // item = filling.id (не индекс массива) — ищем по ID
  const fillObj = curModuleSegment?.fillings?.find(f => f.id === item);
  if (fillObj?.fasade) {
    fillObj.fasade.material = Object.assign(fillObj.fasade.material, currentFasadeMaterial.value.data);
    UMconstructor?.value?.FILLINGS.syncDrawerFasade(sec, fillObj, module.value);
  }
};

const closeMenu = () => {
  isOpenMaterialSelector.value = false;
  isOpenHandleSelector.value = false;

  currentHandle.value = false;
  currentFasadeMaterial.value = false;
};

const handleOutsideClick = (event: MouseEvent) => {
  // Закрываем только когда попап реально открыт
  if (!isOpenMaterialSelector.value && !isOpenHandleSelector.value) return;

  const panel = panelRef.value;
  if (!panel) return;

  const target = event.target;
  if (!(target instanceof Node)) return;

  // Клик внутри окна - ничего не делаем
  if (panel.contains(target)) return;

  closeMenu();
};

const showCurrentCol = (
  sec: number,
  cell?: number | null,
  row?: number | null,
  extra?: number | null,
  item?: number | null,
) => {
  UMconstructor?.value?.selectCell("fillings", <TSelectedCell>{
    sec,
    cell,
    row,
    extra,
    item,
  });
};

const handleCellSelect = () => {
  if (mode.value !== 'config') return;
  const { sec, cell, row, extra, item } = selectedFilling.value;
  // Задержка нужна для того, чтоб рендер успел обновить DOM
  UMconstructor?.value?.debounce(
    "handleCellSelectSectionFillings",
    () => {
      let idTag = `module_${sec}`;

      if (cell !== null) idTag += `_${cell}`;
      if (row !== null) idTag += `_${row}`;
      if (extra !== null) idTag += `_${extra}`;
      if (item !== null) idTag += ` ${item}`;

      const domElem = document.getElementById(idTag);
      if (domElem) {
        domElem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    },
    10,
  );
};

const getAbsolutePosition = (
  axis: axis,
  filling: FillingObject,
  cell: GridSection | GridCell | GridCellsRow | GridRowExtra,
) => {
  let resultPos = 0;

  switch (axis) {
    case "X":
      break;
    case "Y":
      resultPos = UMconstructor?.value?.FILLINGS.getAbsolutePositionY(
        filling,
        cell,
      );
      break;
  }

  return resultPos;
};

const getLocalPosition = (
  axis: axis,
  value: number,
  filling: FillingObject,
  cell: GridSection | GridCell | GridCellsRow | GridRowExtra,
  isMinMax: boolean = false,
) => {
  let resultPos = 0;

  switch (axis) {
    case "X":
      break;
    case "Y":
      resultPos = UMconstructor?.value?.FILLINGS.getLocalPositionY(
        value,
        filling,
        cell,
        isMinMax,
      );
      break;
  }

  return resultPos;
};

const getUniversalDepthOptions = (filling: FillingObject): number[] => {
  const product = UMconstructor.value?.APP?.CATALOG?.PRODUCTS?.[filling.product];
  if (!product?.SIZE_EDIT_DEPTH?.length) return [];
  const maxAllowed = (module.value?.depth ?? 0) - 50;
  return product.SIZE_EDIT_DEPTH.filter((d: number) => d <= maxAllowed);
};

const getUniversalHeightOptions = (filling: FillingObject): number[] => {
  const product = UMconstructor.value?.APP?.CATALOG?.PRODUCTS?.[filling.product];
  if (!product?.DROWER_FASADE_HEIGHT) return [];
  return Object.keys(product.DROWER_FASADE_HEIGHT).map(Number);
};

const curUMId = computed(() => {
  const product = UMconstructor.value?.UM_STORE.getUMData().PRODUCT
  console.log(product, 'product')
  return product
})

onMounted(() => {
  selectedFilling.value =
    UMconstructor?.value?.UM_STORE.getSelected("fillings");
  handleCellSelect();

  // Закрытие при клике вне зоны панели
  document.addEventListener("click", handleOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleOutsideClick);
});

watch(
  () => UMconstructor?.value?.UM_STORE.getSelected("fillings"),
  () => {
    selectedFilling.value =
      UMconstructor?.value?.UM_STORE.getSelected("fillings");
  },
);

watch(
  () => selectedFilling.value,
  () => {
    handleCellSelect();

    const { sec, cell, row, extra, item } = selectedFilling.value;
    if (
      currentFasadeMaterial.value &&
      !(
        sec === currentFasadeMaterial.value.sec &&
        cell === currentFasadeMaterial.value.cell &&
        row === currentFasadeMaterial.value.row &&
        extra === currentFasadeMaterial.value.extra &&
        item === currentFasadeMaterial.value.item
      )
    ) {
      closeMenu();
      return;
    } else if (
      currentHandle.value &&
      !(
        sec === currentHandle.value.sec &&
        cell === currentHandle.value.cell &&
        row === currentHandle.value.row &&
        extra === currentHandle.value.extra &&
        item === currentHandle.value.item
      )
    ) {
      closeMenu();
      return;
    }
  },
);
</script>

<template>
  <div class="UM splitter-container--product">
    <div class="UM constructor2d-container constructor2d-header">
      <article class="UM constructor2d-header--mode-selector">
        <div class="UM work-mode-selector">
          <button :class="[
            'UM no-select actions-btn actions-btn--default',
            {
              active: mode === 'add',
            },
          ]" @click="changeConstructorMode('add')">
            Вставка
          </button>
          <button :class="[
            'UM no-select actions-btn actions-btn--default',
            {
              active: mode === 'config',
            },
          ]" @click="changeConstructorMode('config')">
            Конфигурация
          </button>
        </div>
      </article>
    </div>

    <FillingsInsertPanel v-if="mode === 'add'" :fillings="fillings" :module="module" :UMconstructor="UMconstructor" />

    <div class="splitter-container--product-data" v-if="mode === 'config'">
      <section class="actions-wrapper">
        <div class="actions-header">
          <p class="actions-title actions-title--part">Секции</p>
        </div>

        <div class="actions-header">
          <div :class="[
            'actions-header--container',
            { active: ndx === selectedFilling.sec },
          ]" v-for="(sec, ndx) in module.sections" :key="ndx" @click="showCurrentCol(ndx)">
            <p class="actions-title actions-title--part">
              {{ ndx + 1 }}
            </p>
          </div>
        </div>

        <div class="actions-container" v-for="(section, secIndex) in module.sections" :key="secIndex">
          <div class="actions-items--wrapper" v-if="selectedFilling.sec === secIndex">
            <div v-if="section.fillings?.length" v-for="(filling, fillingIndex) in section.fillings" :key="fillingIndex"
              :id="`module_${secIndex} ${filling.id}`" :class="[
                'actions-items--container',
                {
                  active:
                    secIndex === selectedFilling.sec &&
                    selectedFilling.cell === null &&
                    filling.id === selectedFilling.item,
                },
              ]">
              <article class="actions-items actions-items--left">
                <div class="actions-items--left-wrapper">
                  <div class="actions-items--title">
                    <p :class="[
                      'actions-title',
                      'actions-title--part',
                      { 'actions-title--inner-drawer': UM_DRAWERS_IDS.INNER.includes(filling.productGroupID) && curUMId !== UM_PARAMS.RASPASHNOY_ID },
                    ]" @click="showCurrentCol(secIndex, null, null, null, filling.id)">
                      {{ filling.name }} №{{ filling.id }}
                    </p>

                    <button class="no-select actions-btn actions-icon" @click.stop="
                      UMconstructor.FILLINGS.deleteFilling(
                        secIndex,
                        fillingIndex,
                      )
                      ">
                      <img class="actions-icon--delete" src="/icons/delite.svg" alt="" />
                    </button>
                  </div>
                </div>
              </article>

              <!-- Внутренний ящик: только метка о принадлежности, позиция меняется перетаскиванием -->
              <article
                v-if="UM_DRAWERS_IDS.INNER.includes(filling.productGroupID) && curUMId !== UM_PARAMS.RASPASHNOY_ID"
                class="actions-items actions-items--right">
                <div class="actions-items--right-items">
                  <p class="actions-title actions-title--part actions-title--muted">
                    Встроен во внешний ящик · {{ filling.width }}×{{ filling.height }} мм
                  </p>
                </div>
              </article>

              <article v-else class="actions-items actions-items--right">
                <div class="actions-items--right-items">
                  <div class="actions-items--numbers">
                    <div class="actions-items--width">
                      <div class="actions-inputs">
                        <p class="actions-title">Позиция</p>
                        <div :class="['actions-input--container']">
                          <input v-if="filling.isVerticalItem" type="number" :step="1"
                            :max="section.width - filling.width" min="0" class="actions-input"
                            :value="filling.distances?.left" @input="
                              UMconstructor.FILLINGS.changeFillingPositionX(
                                $event,
                                $event.target.value,
                                fillingIndex,
                                secIndex,
                              )
                              " />
                          <input v-else type="number" :step="1" :max="UMconstructor.FILLINGS.calcMinMaxPositionY(
                            'max',
                            filling,
                            section,
                            module,
                          )
                            " :min="UMconstructor.FILLINGS.calcMinMaxPositionY(
                              'min',
                              filling,
                              section,
                              module,
                            )
                              " class="actions-input" :value="filling.distances?.bottom" @input="
                                (event) => {
                                  UMconstructor?.debounce(
                                    'getLocalPosition',
                                    () => {
                                      let convertValue = getLocalPosition(
                                        'Y',
                                        parseInt(event.target.value),
                                        filling,
                                        section,
                                      );
                                      if (convertValue >= 0) {
                                        UMconstructor.FILLINGS.changeFillingPositionY(
                                          {
                                            min: getLocalPosition(
                                              'Y',
                                              event.target.min,
                                              filling,
                                              section,
                                              true,
                                            ),
                                            max: getLocalPosition(
                                              'Y',
                                              event.target.max,
                                              filling,
                                              section,
                                              true,
                                            ),
                                          },
                                          convertValue,
                                          fillingIndex,
                                          secIndex,
                                          false,
                                          false,
                                          false,
                                          module,
                                          0,
                                        );
                                      } else {
                                        UMconstructor.callAlert(
                                          'error',
                                          'Нельзя переместить сюда, т.к. позиция выходит за пределы ячейки',
                                        );
                                      }
                                    },
                                    1000,
                                  );
                                }
                              " />
                        </div>
                      </div>
                    </div>

                    <div v-if="filling.fasade" class="actions-items--height">
                      <div class="actions-inputs">
                        <p class="actions-title">Высота фасада</p>
                        <div :class="['actions-input--container']">
                          <input type="number" :step="step" :min="filling.fasade.minY" :max="filling.fasade.maxY"
                            class="actions-input" :value="filling.fasade.height" @input="
                              UMconstructor.FILLINGS.changeDrawerFasade(
                                $event,
                                $event.target.value,
                                fillingIndex,
                                secIndex,
                              )
                              " />
                        </div>
                      </div>
                    </div>

                    <template v-if="UM_DRAWERS_IDS.UNIVERSAL.includes(filling.productGroupID)">
                      <div class="actions-items--height universal-select-wrap">
                        <p class="actions-title">Глубина ящика</p>
                        <Accordion :open="false" class="universal-accordion">
                          <template #title>
                            <span>{{ filling.depth }} мм</span>
                          </template>
                          <template #params="{ onToggle }">
                            <ul class="universal-options">
                              <li v-for="d in getUniversalDepthOptions(filling)" :key="d"
                                :class="['universal-option', { 'universal-option--active': d === filling.depth }]"
                                @click="() => { UMconstructor.FILLINGS.changeUniversalDepth(d, fillingIndex, secIndex); onToggle(); }">
                                {{ d }} мм</li>
                            </ul>
                          </template>
                        </Accordion>
                      </div>
                      <div class="actions-items--height universal-select-wrap">
                        <p class="actions-title">Высота ящика</p>
                        <Accordion :open="false" class="universal-accordion">
                          <template #title>
                            <span>{{ filling.height }} мм</span>
                          </template>
                          <template #params="{ onToggle }">
                            <ul class="universal-options">
                              <li v-for="h in getUniversalHeightOptions(filling)" :key="h"
                                :class="['universal-option', { 'universal-option--active': h === filling.height }]"
                                @click="() => { UMconstructor.FILLINGS.changeUniversalHeight(h, fillingIndex, secIndex); onToggle(); }">
                                {{ h }} мм</li>
                            </ul>
                          </template>
                        </Accordion>
                      </div>
                    </template>

                  </div>

                  <div class="actions-items--cards">
                    <ConfigurationOption v-if="filling.fasade" :disable-delete-choice="true" :class="[
                      {
                        active:
                          currentFasadeMaterial.sec === secIndex &&
                          currentFasadeMaterial.cell === null &&
                          currentFasadeMaterial.row === null &&
                          currentFasadeMaterial.item === filling.id,
                      },
                    ]" :type="filling.fasade.material.PALETTE ? 'palette' : 'surface'
                      " :data="filling.fasade.material.PALETTE
                        ? {
                          ...UMconstructor.APP.PALETTE[
                          filling.fasade.material.PALETTE
                          ],
                          hex: UMconstructor.APP.PALETTE[
                            filling.fasade.material.PALETTE
                          ].HTML,
                        }
                        : UMconstructor.APP.FASADE[
                        filling.fasade.material.COLOR
                        ]
                        " @click.stop="
                          openFasadeSelector(
                            secIndex,
                            null,
                            null,
                            null,
                            fillingIndex,
                          )
                          " />

                    <ConfigurationOption v-if="filling.fasade" :disable-delete-choice="true" :class="[
                      {
                        active:
                          currentHandle.sec === secIndex &&
                          currentHandle.cell === null &&
                          currentHandle.row === null &&
                          currentHandle.item === filling.id,
                      },
                    ]" :type="'Handles'" :data="filling.fasade.material.HANDLES
                      ? {
                        ...UMconstructor.APP.CATALOG.PRODUCTS[
                        filling.fasade.material.HANDLES.id
                        ],
                      }
                      : false
                      " @click.stop="
                        openHandleSelector(
                          secIndex,
                          null,
                          null,
                          null,
                          fillingIndex,
                        )
                        " />
                  </div>
                </div>
              </article>
            </div>

            <div class="accordion" v-if="section.cells.length">

              <div v-for="(cell, cellIndex) in section.cells" :key="cellIndex">
                <Accordion v-if="cell.fillings?.length" :open="false" class="item-group">
                  <template #title>
                    <h3 class="item-group__title">
                      {{ secIndex + 1 }}.{{ cellIndex + 1 }}
                    </h3>
                  </template>

                  <div v-for="(filling, fillingIndex) in cell.fillings" :key="fillingIndex"
                    :id="`module_${secIndex}_${cellIndex} ${filling.id}`" :class="[
                      'actions-items--container',
                      {
                        active:
                          secIndex === selectedFilling.sec &&
                          cellIndex === selectedFilling.cell &&
                          selectedFilling.row === null &&
                          filling.id === selectedFilling.item,
                      },
                    ]">
                    <article class="actions-items actions-items--left">
                      <div class="actions-items--left-wrapper">
                        <div class="actions-items--title">
                          <button class="no-select actions-btn actions-icon" @click.stop="
                            UMconstructor.FILLINGS.deleteFilling(
                              secIndex,
                              fillingIndex,
                              cellIndex,
                            )
                            ">
                            <img class="actions-icon--delete" src="/icons/delite.svg" alt="" />
                          </button>
                          <p class="actions-title actions-title--part"
                            @click="showCurrentCol(secIndex, cellIndex, null, null, filling.id)">
                            {{ filling.name }} №{{ filling.id }}
                          </p>
                        </div>
                      </div>
                    </article>

                    <article class="actions-items actions-items--right">
                      <div class="actions-items--right-items">
                        <div class="actions-items--width">
                          <div class="actions-inputs">
                            <p class="actions-title">Позиция</p>
                            <div :class="['actions-input--container']">
                              <input v-if="filling.isVerticalItem" type="number" :step="1"
                                :max="cell.width - filling.width" min="0" class="actions-input"
                                :value="filling.distances?.left" @input="
                                  UMconstructor.FILLINGS.changeFillingPositionX(
                                    $event,
                                    $event.target.value,
                                    fillingIndex,
                                    secIndex,
                                    cellIndex,
                                  )
                                  " />
                              <input v-else type="number" :step="1" :max="UMconstructor.FILLINGS.calcMinMaxPositionY(
                                'max',
                                filling,
                                cell,
                                module,
                              )
                                " :min="UMconstructor.FILLINGS.calcMinMaxPositionY(
                                  'min',
                                  filling,
                                  cell,
                                  module,
                                )
                                  " class="actions-input" :value="getAbsolutePosition('Y', filling, cell)" @input="
                                    (event) => {
                                      UMconstructor?.debounce(
                                        'getLocalPosition',
                                        () => {
                                          let convertValue = getLocalPosition(
                                            'Y',
                                            parseInt(event.target.value),
                                            filling,
                                            cell,
                                          );
                                          if (convertValue >= 0) {
                                            UMconstructor.FILLINGS.changeFillingPositionY(
                                              {
                                                min: getLocalPosition(
                                                  'Y',
                                                  event.target.min,
                                                  filling,
                                                  cell,
                                                  true,
                                                ),
                                                max: getLocalPosition(
                                                  'Y',
                                                  event.target.max,
                                                  filling,
                                                  cell,
                                                  true,
                                                ),
                                              },
                                              convertValue,
                                              fillingIndex,
                                              secIndex,
                                              cellIndex,
                                              false,
                                              false,
                                              module,
                                              0,
                                            );
                                          } else {
                                            UMconstructor.callAlert(
                                              'error',
                                              'Нельзя переместить сюда, т.к. позиция выходит за пределы ячейки',
                                            );
                                          }
                                        },
                                        1000,
                                      );
                                    }
                                  " />
                            </div>
                          </div>
                        </div>

                        <div v-if="filling.fasade" class="actions-items--height">
                          <div class="actions-inputs">
                            <p class="actions-title">Высота фасада</p>
                            <div :class="['actions-input--container']">
                              <input type="number" :step="step" :min="filling.fasade.minY" :max="filling.fasade.maxY"
                                class="actions-input" :value="filling.fasade.height" @input="
                                  UMconstructor.FILLINGS.changeDrawerFasade(
                                    $event,
                                    $event.target.value,
                                    fillingIndex,
                                    secIndex,
                                    cellIndex,
                                  )
                                  " />
                            </div>
                          </div>
                        </div>

                        <template v-if="UM_DRAWERS_IDS.UNIVERSAL.includes(filling.productGroupID)">
                          <div class="actions-items--height universal-select-wrap">
                            <p class="actions-title">Глубина ящика</p>
                            <Accordion :open="false" class="universal-accordion">
                              <template #title>
                                <span>{{ filling.depth }} мм</span>
                              </template>
                              <template #params="{ onToggle }">
                                <ul class="universal-options">
                                  <li v-for="d in getUniversalDepthOptions(filling)" :key="d"
                                    :class="['universal-option', { 'universal-option--active': d === filling.depth }]"
                                    @click="() => { UMconstructor.FILLINGS.changeUniversalDepth(d, fillingIndex, secIndex, cellIndex); onToggle(); }">
                                    {{ d }} мм</li>
                                </ul>
                              </template>
                            </Accordion>
                          </div>
                          <div class="actions-items--height universal-select-wrap">
                            <p class="actions-title">Высота ящика</p>
                            <Accordion :open="false" class="universal-accordion">
                              <template #title>
                                <span>{{ filling.height }} мм</span>
                              </template>
                              <template #params="{ onToggle }">
                                <ul class="universal-options">
                                  <li v-for="h in getUniversalHeightOptions(filling)" :key="h"
                                    :class="['universal-option', { 'universal-option--active': h === filling.height }]"
                                    @click="() => { UMconstructor.FILLINGS.changeUniversalHeight(h, fillingIndex, secIndex, cellIndex); onToggle(); }">
                                    {{ h }} мм</li>
                                </ul>
                              </template>
                            </Accordion>
                          </div>
                        </template>

                        <ConfigurationOption v-if="filling.fasade" :disable-delete-choice="true" :class="[
                          {
                            active:
                              currentFasadeMaterial.sec === secIndex &&
                              currentFasadeMaterial.cell === cellIndex &&
                              currentFasadeMaterial.row === null &&
                              currentFasadeMaterial.item === filling.id,
                          },
                        ]" :type="filling.fasade.material.PALETTE
                          ? 'palette'
                          : 'surface'
                          " :data="filling.fasade.material.PALETTE
                            ? {
                              ...UMconstructor.APP.PALETTE[
                              filling.fasade.material.PALETTE
                              ],
                              hex: UMconstructor.APP.PALETTE[
                                filling.fasade.material.PALETTE
                              ].HTML,
                            }
                            : UMconstructor.APP.FASADE[
                            filling.fasade.material.COLOR
                            ]
                            " @click.stop="
                              openFasadeSelector(
                                secIndex,
                                cellIndex,
                                null,
                                null,
                                fillingIndex,
                              )
                              " />

                        <ConfigurationOption v-if="filling.fasade" :disable-delete-choice="true" :class="[
                          {
                            active:
                              currentHandle.sec === secIndex &&
                              currentHandle.cell === cellIndex &&
                              currentHandle.row === null &&
                              currentHandle.item === filling.id,
                          },
                        ]" :type="'Handles'" :data="filling.fasade.material.HANDLES
                          ? {
                            ...UMconstructor.APP.CATALOG.PRODUCTS[
                            filling.fasade.material.HANDLES.id
                            ],
                          }
                          : false
                          " @click.stop="
                            openHandleSelector(
                              secIndex,
                              cellIndex,
                              null,
                              null,
                              fillingIndex,
                            )
                            " />
                      </div>
                    </article>
                  </div>
                </Accordion>

                <div class="accordion" v-if="cell.cellsRows?.length">
                  <div v-for="(row, rowIndex) in cell.cellsRows" :key="rowIndex" :class="'actions-items--container'">
                    <Accordion v-if="row.fillings?.length" :open="false" class="item-group">
                      <template #title>
                        <h3 class="item-group__title">
                          {{ secIndex + 1 }}.{{ cellIndex + 1 }}.{{
                            rowIndex + 1
                          }}
                        </h3>
                      </template>

                      <div v-for="(filling, fillingIndex) in row.fillings" :key="fillingIndex"
                        :id="`module_${secIndex}_${cellIndex}_${rowIndex} ${filling.id}`" :class="[
                          'actions-items--container',
                          {
                            active:
                              secIndex === selectedFilling.sec &&
                              cellIndex === selectedFilling.cell &&
                              rowIndex === selectedFilling.row &&
                              selectedFilling.extra === null &&
                              filling.id === selectedFilling.item,
                          },
                        ]">
                        <article class="actions-items actions-items--left">
                          <div class="actions-items--left-wrapper">
                            <div class="actions-items--title">
                              <button class="no-select actions-btn actions-icon" @click.stop="
                                UMconstructor.FILLINGS.deleteFilling(
                                  secIndex,
                                  fillingIndex,
                                  cellIndex,
                                  rowIndex,
                                )
                                ">
                                <img class="actions-icon--delete" src="/icons/delite.svg" alt="" />
                              </button>
                              <p class="actions-title actions-title--part"
                                @click="showCurrentCol(secIndex, cellIndex, rowIndex, null, filling.id)">
                                {{ filling.name }} №{{ filling.id }}
                              </p>
                            </div>
                          </div>
                        </article>

                        <article class="actions-items actions-items--right">
                          <div class="actions-items--right-items">
                            <div class="actions-items--width">
                              <div class="actions-inputs">
                                <p class="actions-title">Позиция</p>
                                <div :class="['actions-input--container']">
                                  <input v-if="filling.isVerticalItem" type="number" :step="1"
                                    :max="row.width - filling.width" min="0" class="actions-input"
                                    :value="filling.distances?.left" @input="
                                      UMconstructor.FILLINGS.changeFillingPositionX(
                                        $event,
                                        $event.target.value,
                                        fillingIndex,
                                        secIndex,
                                        cellIndex,
                                        rowIndex,
                                      )
                                      " />
                                  <input v-else type="number" :step="1" :max="UMconstructor.FILLINGS.calcMinMaxPositionY(
                                    'max',
                                    filling,
                                    row,
                                    module,
                                  )
                                    " :min="UMconstructor.FILLINGS.calcMinMaxPositionY(
                                      'min',
                                      filling,
                                      row,
                                      module,
                                    )
                                      " class="actions-input" :value="getAbsolutePosition('Y', filling, row)
                                        " @input="
                                          (event) => {
                                            UMconstructor?.debounce(
                                              'getLocalPosition',
                                              () => {
                                                let convertValue = getLocalPosition(
                                                  'Y',
                                                  parseInt(event.target.value),
                                                  filling,
                                                  row,
                                                );
                                                if (convertValue >= 0) {
                                                  UMconstructor.FILLINGS.changeFillingPositionY(
                                                    {
                                                      min: getLocalPosition(
                                                        'Y',
                                                        event.target.min,
                                                        filling,
                                                        row,
                                                        true,
                                                      ),
                                                      max: getLocalPosition(
                                                        'Y',
                                                        event.target.max,
                                                        filling,
                                                        row,
                                                        true,
                                                      ),
                                                    },
                                                    convertValue,
                                                    fillingIndex,
                                                    secIndex,
                                                    cellIndex,
                                                    rowIndex,
                                                    false,
                                                    module,
                                                    0,
                                                  );
                                                } else {
                                                  UMconstructor.callAlert(
                                                    'error',
                                                    'Нельзя переместить сюда, т.к. позиция выходит за пределы ячейки',
                                                  );
                                                }
                                              },
                                              1000,
                                            );
                                          }
                                        " />
                                </div>
                              </div>
                            </div>

                            <div v-if="filling.fasade" class="actions-items--height">
                              <div class="actions-inputs">
                                <p class="actions-title">Высота фасада</p>

                                <div :class="['actions-input--container']">
                                  <input type="number" :step="step" :min="filling.fasade.minY"
                                    :max="filling.fasade.maxY" class="actions-input" :value="filling.fasade.height"
                                    @input="
                                      UMconstructor.FILLINGS.changeDrawerFasade(
                                        $event,
                                        $event.target.value,
                                        fillingIndex,
                                        secIndex,
                                        cellIndex,
                                        rowIndex,
                                      )
                                      " />
                                </div>
                              </div>
                            </div>

                            <template v-if="UM_DRAWERS_IDS.UNIVERSAL.includes(filling.productGroupID)">
                              <div class="actions-items--height universal-select-wrap">
                                <p class="actions-title">Глубина ящика</p>
                                <Accordion :open="false" class="universal-accordion">
                                  <template #title>
                                    <span>{{ filling.depth }} мм</span>
                                  </template>
                                  <template #params="{ onToggle }">
                                    <ul class="universal-options">
                                      <li v-for="d in getUniversalDepthOptions(filling)" :key="d"
                                        :class="['universal-option', { 'universal-option--active': d === filling.depth }]"
                                        @click="() => { UMconstructor.FILLINGS.changeUniversalDepth(d, fillingIndex, secIndex, cellIndex, rowIndex); onToggle(); }">
                                        {{ d }} мм</li>
                                    </ul>
                                  </template>
                                </Accordion>
                              </div>
                              <div class="actions-items--height universal-select-wrap">
                                <p class="actions-title">Высота ящика</p>
                                <Accordion :open="false" class="universal-accordion">
                                  <template #title>
                                    <span>{{ filling.height }} мм</span>
                                  </template>
                                  <template #params="{ onToggle }">
                                    <ul class="universal-options">
                                      <li v-for="h in getUniversalHeightOptions(filling)" :key="h"
                                        :class="['universal-option', { 'universal-option--active': h === filling.height }]"
                                        @click="() => { UMconstructor.FILLINGS.changeUniversalHeight(h, fillingIndex, secIndex, cellIndex, rowIndex); onToggle(); }">
                                        {{ h }} мм</li>
                                    </ul>
                                  </template>
                                </Accordion>
                              </div>
                            </template>

                            <ConfigurationOption v-if="filling.fasade" :disable-delete-choice="true" :class="[
                              {
                                active:
                                  currentFasadeMaterial.sec === secIndex &&
                                  currentFasadeMaterial.cell === cellIndex &&
                                  currentFasadeMaterial.row === rowIndex &&
                                  currentFasadeMaterial.item === filling.id,
                              },
                            ]" :type="filling.fasade.material.PALETTE
                              ? 'palette'
                              : 'surface'
                              " :data="filling.fasade.material.PALETTE
                                ? {
                                  ...UMconstructor.APP.PALETTE[
                                  filling.fasade.material.PALETTE
                                  ],
                                  hex: UMconstructor.APP.PALETTE[
                                    filling.fasade.material.PALETTE
                                  ].HTML,
                                }
                                : UMconstructor.APP.FASADE[
                                filling.fasade.material.COLOR
                                ]
                                " @click.stop="
                                  openFasadeSelector(
                                    secIndex,
                                    cellIndex,
                                    rowIndex,
                                    null,
                                    fillingIndex,
                                  )
                                  " />

                            <ConfigurationOption v-if="filling.fasade" :disable-delete-choice="true" :class="[
                              {
                                active:
                                  currentHandle.sec === secIndex &&
                                  currentHandle.cell === cellIndex &&
                                  currentHandle.row === rowIndex &&
                                  currentHandle.item === filling.id,
                              },
                            ]" :type="'Handles'" :data="filling.fasade.material.HANDLES
                              ? {
                                ...UMconstructor.APP.CATALOG.PRODUCTS[
                                filling.fasade.material.HANDLES.id
                                ],
                              }
                              : false
                              " @click.stop="
                                openHandleSelector(
                                  secIndex,
                                  cellIndex,
                                  rowIndex,
                                  null,
                                  fillingIndex,
                                )
                                " />
                          </div>
                        </article>
                      </div>
                    </Accordion>

                    <div class="accordion" v-if="row.extras?.length">
                      <div v-for="(extra, extraIndex) in row.extras" :key="extraIndex"
                        :class="'actions-items--container'">
                        <Accordion v-if="extra.fillings?.length" :open="false" class="item-group">
                          <template #title>
                            <h3 class="item-group__title">
                              {{ secIndex + 1 }}.{{ cellIndex + 1 }}.{{
                                rowIndex + 1
                              }}.{{ extraIndex + 1 }}
                            </h3>
                          </template>

                          <div v-for="(filling, fillingIndex) in extra.fillings" :key="fillingIndex"
                            :id="`module_${secIndex}_${cellIndex}_${rowIndex}_${extraIndex} ${filling.id}`" :class="[
                              'actions-items--container',
                              {
                                active:
                                  secIndex === selectedFilling.sec &&
                                  cellIndex === selectedFilling.cell &&
                                  rowIndex === selectedFilling.row &&
                                  extraIndex === selectedFilling.extra &&
                                  filling.id === selectedFilling.item,
                              },
                            ]">
                            <article class="actions-items actions-items--left">
                              <div class="actions-items--left-wrapper">
                                <div class="actions-items--title">
                                  <button class="no-select actions-btn actions-icon" @click.stop="
                                    UMconstructor.FILLINGS.deleteFilling(
                                      secIndex,
                                      fillingIndex,
                                      cellIndex,
                                      rowIndex,
                                      extraIndex,
                                    )
                                    ">
                                    <img class="actions-icon--delete" src="/icons/delite.svg" alt="" />
                                  </button>
                                  <p class="actions-title actions-title--part"
                                    @click="showCurrentCol(secIndex, cellIndex, rowIndex, extraIndex, filling.id)">
                                    {{ filling.name }} №{{ filling.id }}
                                  </p>
                                </div>
                              </div>
                            </article>

                            <article class="actions-items actions-items--right">
                              <div class="actions-items--right-items">
                                <div class="actions-items--width">
                                  <div class="actions-inputs">
                                    <p class="actions-title">Позиция</p>
                                    <div :class="['actions-input--container']">
                                      <input v-if="filling.isVerticalItem" type="number" :step="1"
                                        :max="extra.width - filling.width" min="0" class="actions-input"
                                        :value="filling.distances?.left" @input="
                                          UMconstructor.FILLINGS.changeFillingPositionX(
                                            $event,
                                            $event.target.value,
                                            fillingIndex,
                                            secIndex,
                                            cellIndex,
                                            rowIndex,
                                            extraIndex,
                                          )
                                          " />
                                      <input v-else type="number" :step="1" :max="UMconstructor.FILLINGS.calcMinMaxPositionY(
                                        'max',
                                        filling,
                                        extra,
                                        module,
                                      )
                                        " :min="UMconstructor.FILLINGS.calcMinMaxPositionY(
                                          'min',
                                          filling,
                                          extra,
                                          module,
                                        )
                                          " class="actions-input" :value="getAbsolutePosition(
                                            'Y',
                                            filling,
                                            extra,
                                          )
                                            " @input="
                                              (event) => {
                                                UMconstructor?.debounce(
                                                  'getLocalPosition',
                                                  () => {
                                                    let convertValue =
                                                      getLocalPosition(
                                                        'Y',
                                                        parseInt(
                                                          event.target.value,
                                                        ),
                                                        filling,
                                                        extra,
                                                      );
                                                    if (convertValue >= 0) {
                                                      UMconstructor.FILLINGS.changeFillingPositionY(
                                                        {
                                                          min: getLocalPosition(
                                                            'Y',
                                                            event.target.min,
                                                            filling,
                                                            extra,
                                                            true,
                                                          ),
                                                          max: getLocalPosition(
                                                            'Y',
                                                            event.target.max,
                                                            filling,
                                                            extra,
                                                            true,
                                                          ),
                                                        },
                                                        convertValue,
                                                        fillingIndex,
                                                        secIndex,
                                                        cellIndex,
                                                        rowIndex,
                                                        extraIndex,
                                                        module,
                                                        0,
                                                      );
                                                    } else {
                                                      UMconstructor.callAlert(
                                                        'error',
                                                        'Нельзя переместить сюда, т.к. позиция выходит за пределы ячейки',
                                                      );
                                                    }
                                                  },
                                                  1000,
                                                );
                                              }
                                            " />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </article>
                          </div>
                        </Accordion>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>

  <transition name="slide--right" mode="out-in">
    <div class="color--right-select" v-if="isOpenMaterialSelector || isOpenHandleSelector" key="color--right-select"
      ref="panelRef">
      <ClosePopUpButton class="menu__close" @close="closeMenu()" />

      <AdvanceCorpusMaterialRedactor v-if="isOpenMaterialSelector" :is-fasade="true"
        :elementData="currentFasadeMaterial.data" :fasade-size="currentFasadeMaterial.fasadeSize"
        @parent-callback="selectOption" />

      <Handles v-else :is2-dconstructor="true" :data="createSurfaceList(currentHandle)" :index="0"
        @parent-callback="selectHandle" :active-pos="currentHandle.data.HANDLES.position" />
    </div>
  </transition>
</template>

<style scoped lang="scss">
.accordion {
  // border: unset;

  &-fillings_list {
    gap: 1rem;
  }
}

.search {
  width: 100%;
  height: 100%;
  padding-bottom: 2vh;
  padding-top: 2vh;

  &--input {
    padding: 10px 15px;
    width: 100%;
    border-radius: 15px;
  }
}

.config {
  max-width: 110px;
  background-color: $white;
}

.actions {
  &-header {
    border-bottom: 1px solid #afafaf;

    &--container {
      border-right: none;
    }
  }

  &-items {

    &--left,
    &--right {
      display: flex;
      max-width: 100%;
    }

    &--left {
      border-bottom: 1px solid #ecebf1;
    }

    &--title {
      padding-bottom: 1rem;
    }

    &--container {
      display: block;
      border-bottom: 1px solid #afafaf;
    }

    &--numbers,
    &--cards {
      width: 100%;
      display: flex;
      gap: 2rem;
      padding: 1rem 0;
      border-bottom: 1px solid #ecebf1;
    }

    &--numbers {
      flex-wrap: wrap;
    }

    &--height,
    &--width {
      width: 100%;
      max-width: 100px;
    }
  }

  &-inputs {
    justify-content: space-between;
  }
}


.actions-title--inner-drawer {
  color: #888;
  font-style: italic;
}

.actions-title--muted {
  color: #999;
  font-size: 0.85em;
  padding: 0.5rem 0;
}

.universal-select-wrap {
  max-width: 140px;
}

.universal-accordion {
  :deep(.accordion__summary) {
    padding: 4px 8px;
    font-size: 1.2rem;
    font-weight: normal;
  }
}

.universal-options {
  list-style: none;
  margin: 0;
  padding: 4px 0;
}

.universal-option {
  padding: 5px 10px;
  font-size: 1.2rem;
  cursor: pointer;
  border-radius: 6px;

  &:hover {
    background: #f0f2f5;
  }

  &--active {
    font-weight: 600;
    color: #5d6069;
  }
}
</style>
