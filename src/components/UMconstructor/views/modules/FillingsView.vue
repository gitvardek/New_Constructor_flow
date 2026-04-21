 <script setup lang="ts">
 //@ts-nocheck
 import "@/components/UMconstructor/styles/UM.scss"

 import {_URL} from "@/types/constants.ts";
 import AdvanceCorpusMaterialRedactor from "@/components/ui/color/AdvanceCorpusMaterialRedactor.vue";
 import ClosePopUpButton from "@/components/ui/svg/ClosePopUpButton.vue";
 import ConfigurationOption from "@/components/right-menu/customiser-pages/ColorRightPage/ConfigurationOption.vue";
 import Handles from "@/components/right-menu/customiser-pages/FigureRightPage/Handles/Handles.vue";
 import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
 import {computed, onMounted, ref, toRefs, watch} from "vue";
 import {useFigureRightPage} from "@/components/right-menu/customiser-pages/FigureRightPage/useFigureRightPage.ts";
 import {GridModule, TSelectedCell} from "@/components/UMconstructor/types/UMtypes.ts";

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

type workMode = 'config' | 'add';
const mode = ref<workMode>('add');
const changeConstructorMode = (_mode: workMode) => {
  if (_mode) {
    mode.value = _mode;
  }
}

type selectedMaterial = {
  sec: number | null,
  cell?: number | null,
  row?: number | null,
  extra?: number | null,
  item?: number | null
  data: {},
  fasadeSize?: {},
}

const isOpenMaterialSelector = ref<boolean>(false);
const currentFasadeMaterial = ref<selectedMaterial | boolean>(false);
const isOpenHandleSelector = ref<boolean>(false);
const currentHandle = ref<selectedMaterial | boolean>(false);

const step = ref<number>(1);

const selectedFilling = ref<TSelectedCell>(<TSelectedCell>{});

// Аккордеон для групп наполнений: открыта только одна группа
const openedFillingGroupKey = ref<string | number | null>(null);

const toggleFillingGroup = (key: string | number, event: Event) => {
  const details = event.currentTarget as HTMLDetailsElement;
  // Если только что открыли эту группу — закрываем остальные
  if (details.open) {
    openedFillingGroupKey.value = key;
  } else if (openedFillingGroupKey.value === key) {
    openedFillingGroupKey.value = null;
  }
  filteredMaterialList.value = [];
};

const {module, UMconstructor} = toRefs(props)
const {createSurfaceList} =
    useFigureRightPage();

const createFacadeData = (fasadeIndex?: number) => {
  UMconstructor?.value?.FASADES.createFacadeData(fasadeIndex)
};

//Поиск по элементам наполнения
const filteredMaterialList = ref<Array>([]); // отфильтрованный массив поиска
const isSearch = computed(() => {
  return filteredMaterialList.value.length > 0;
});
const onSearchChange = (e, totalMaterialList) => {
  let reg = new RegExp(`${e.target.value.toLowerCase()}`, "g");
  filteredMaterialList.value = totalMaterialList.filter((item) =>
      reg.test(item.NAME.toLowerCase())
  );

  if (e.target.value === "")
    filteredMaterialList.value = [];
};

const openFasadeSelector = (
    sec: number,
    cell: number | null,
    row: number | null,
    extra: number | null,
    item: number | null,
) => {

  if (
      currentFasadeMaterial.value &&
      (
          sec === currentFasadeMaterial.value.sec &&
          cell === currentFasadeMaterial.value.cell &&
          row === currentFasadeMaterial.value.row &&
          extra === currentFasadeMaterial.value.extra &&
          item === currentFasadeMaterial.value.item
      )
  ) {
    closeMenu()
    return;
  }

  /** @Создание_данных_для_выбранного_фасада */
  createFacadeData();
  closeMenu()

  setTimeout(() => {
    const curSection = module.value.sections[sec]
    const curCell = curSection?.cells?.[cell]
    const curRow = curCell?.cellsRows?.[row]
    const curExtra = curRow?.extras?.[extra]

    const curModuleSegment = curExtra || curRow || curCell || curSection

    let data = curModuleSegment.fillings[item].fasade.material
    currentFasadeMaterial.value = {
      sec,
      cell,
      row,
      item,
      extra,
      data,
      fasadeSize: {
        FASADE_WIDTH: curModuleSegment.fillings[item].fasade.width,
        FASADE_HEIGHT: curModuleSegment.fillings[item].fasade.height,
        isDrawer: true
      },
    }
    UMconstructor?.value?.FILLINGS.selectCell(sec, cell, row, extra, item)
    isOpenMaterialSelector.value = true
  }, 10)
}

const openHandleSelector = (
    sec: number,
    cell: number | null,
    row: number | null,
    extra: number | null,
    item: number | null
) => {

  if (
      currentHandle.value &&
      (
        sec === currentHandle.value.sec &&
        cell === currentHandle.value.cell &&
        row === currentHandle.value.row &&
        extra === currentHandle.value.extra &&
        item === currentHandle.value.item
      )
  ) {
    closeMenu()
    return;
  }

  closeMenu()

  setTimeout(() => {
    const curSection = module.value.sections[sec]
    const curCell = curSection?.cells?.[cell]
    const curRow = curCell?.cellsRows?.[row]
    const curExtra = curRow?.extras?.[extra]

    const curModuleSegment = curExtra || curRow || curCell || curSection
    let data = curModuleSegment.fillings[item].fasade.material

    currentHandle.value = {
      sec,
      cell,
      row,
      item,
      extra,
      data,
    };
    UMconstructor?.value?.FILLINGS.selectCell(sec, cell, row, extra, item);
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
}

const selectOption = (value: Object, type: string, palette: Object = false) => {

  currentFasadeMaterial.value.data[type] = value ? value.ID : null;
  if (palette)
    currentFasadeMaterial.value.data['PALETTE'] = palette

  if(type === "COLOR") {
    if (currentFasadeMaterial.value.data[type] === UMconstructor?.value?.CONST.NO_FASADE_ID)
      currentFasadeMaterial.value.data["MANUAL_NO_FASADE"] = true
    else
      delete currentFasadeMaterial.value.data["MANUAL_NO_FASADE"]
  }

  let {sec, cell, row, item} = currentFasadeMaterial.value;
  const curSection = module.value.sections[sec]
  const curCell = curSection?.cells?.[cell]
  const curRow = curCell?.cellsRows?.[row]

  const curModuleSegment = curRow || curCell || curSection
  curModuleSegment.fillings[item].fasade.material =
      Object.assign(curModuleSegment.fillings[item].fasade.material, currentFasadeMaterial.value.data)
};

const closeMenu = () => {
  isOpenMaterialSelector.value = false;
  isOpenHandleSelector.value = false;

  currentHandle.value = false;
  currentFasadeMaterial.value = false;
};

const showCurrentCol = (
    sec: number,
    cell?: number | null,
    row?: number | null,
    extra?: number | null,
    item?: number | null
) => {
  UMconstructor?.value?.selectCell("fillings", <TSelectedCell>{sec, cell, row, extra, item})
};

const handleCellSelect = () => {
  const {sec, cell, row, extra, item} = selectedFilling.value;

  //Задержка нужна для того, чтоб рендер аккордионов обновился
  UMconstructor?.value?.debounce("handleCellSelectSectionFillings", () => {
    let idTag = `module_${sec}`

    if(cell !== null)
      idTag += `_${cell}`;

    if(row !== null)
      idTag += `_${row}`

    if(extra !== null)
      idTag += `_${extra}`;

    if(item !== null)
      idTag += ` ${item}`;

    let domElem = document.getElementById(idTag)
    if(domElem) {
      domElem.scrollIntoView();
    }
  }, 10)

};

onMounted(() => {
  selectedFilling.value = UMconstructor?.value?.UM_STORE.getSelected("fillings")
  handleCellSelect()
})

watch(() => UMconstructor?.value?.UM_STORE.getSelected("fillings"), () => {
  selectedFilling.value = UMconstructor?.value?.UM_STORE.getSelected("fillings")
})

 watch(() => selectedFilling.value, () => {
   const {sec, cell, row, extra, item} = selectedFilling.value;
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
     closeMenu()
     return;
   }
   else if (
       currentHandle.value &&
       !(
           sec === currentHandle.value.sec &&
           cell === currentHandle.value.cell &&
           row === currentHandle.value.row &&
           extra === currentHandle.value.extra &&
           item === currentHandle.value.item
       )
   ) {
     closeMenu()
     return;
   }
 })

</script>

<template>
  <div class="splitter-container--product">

    <div
        class="constructor2d-container constructor2d-header"
    >
      <article class="constructor2d-header--mode-selector">
        <div class="work-mode-selector">
          <button
              :class="[
                      'no-select actions-btn actions-btn--default', {
                      active:
                        mode === 'add'
                      }
                    ]"
              @click="changeConstructorMode('add')"
          >
            Вставка
          </button>
          <button
              :class="[
                      'no-select actions-btn actions-btn--default', {
                      active:
                        mode === 'config'
                      }
                    ]"
              @click="changeConstructorMode('config')"
          >
            Конфигурация
          </button>
        </div>
      </article>
    </div>

    <div class="splitter-container--product-data" v-if="mode === 'add'">

      <div class="accordion accordion-fillings_list" v-if="fillings">
        <div
            class="splitter-container--product-items"
            v-for="(fillingGroup, key) in fillings"
            :key="key + fillingGroup.groupName"
        >
          <details
              class="item-group"
              :open="openedFillingGroupKey === key"
              @toggle="toggleFillingGroup(key, $event)"
          >
            <summary>
              <h3 class="item-group__title">
                {{ fillingGroup.groupName }}
              </h3>
            </summary>

            <div class="search">
              <input
                  v-if="openedFillingGroupKey === key"
                  class="search--input"
                  type="text"
                  placeholder="Поиск"
                  @input="(value) => onSearchChange(value, fillingGroup.items)"
              />
            </div>

            <div class="item-group-wrapper">


              <ul class="list">
                <!-- Все возможные материалы -->
                <ul
                    v-if="!isSearch"
                    :class="[
                        'item-group-color'
                      ]"
                    style
                    v-for="(filling, key1) in fillingGroup.items"
                    :key="key1 + filling.NAME"
                    @click="UMconstructor.FILLINGS.addFilling(filling, fillingGroup.groupID, module)"
                >
                  <li class="item-group-name">
                    <img
                        class="name__bg"
                        :src="_URL + filling.PREVIEW_PICTURE"
                        :alt="filling.NAME"
                    />
                    <p class="name__text">
                      {{ filling.NAME }}
                    </p>
                  </li>
                </ul>

                <!-- отфильтрованные материалы-->
                <ul
                    v-else
                    :class="[
                        'item-group-color'
                      ]"
                    style
                    v-for="(filling, key2) in filteredMaterialList"
                    :key="key2 + filling.NAME"
                    @click="UMconstructor.FILLINGS.addFilling(filling, fillingGroup.groupID, module)"
                >
                  <li class="item-group-name">
                    <img
                        class="name__bg"
                        :src="_URL + filling.PREVIEW_PICTURE"
                        :alt="filling.NAME"
                    />
                    <p class="name__text">
                      {{ filling.NAME }}
                    </p>
                  </li>
                </ul>

              </ul>
            </div>
          </details>
        </div>
      </div>

    </div>

    <div class="splitter-container--product-data" v-if="mode === 'config'">
      <section class="actions-wrapper">
        <div class="actions-header">
          <p
              class="actions-title actions-title--part"
          >
            Секции
          </p>
        </div>

        <div class="actions-header">
          <div
              :class="[
              'actions-header--container',
              { active: secIndex === selectedFilling.sec },
            ]"
              v-for="(section, secIndex) in module.sections"
              :key="secIndex"
              @click="showCurrentCol(secIndex)"
          >
            <p
                class="actions-title actions-title--part"
            >
              {{ secIndex + 1 }}
            </p>
          </div>
        </div>

        <div
            class="actions-container"
            v-for="(section, secIndex) in module.sections"
            :key="secIndex"
        >
          <div
              class="actions-items--wrapper"
              v-if="selectedFilling.sec === secIndex"
          >

            <div
                v-if="section.fillings?.length"
                v-for="(filling, fillingIndex) in section.fillings"
                :key="fillingIndex"
                :class="[
                'actions-items--container',
                {
                  active:
                    secIndex === selectedFilling.sec &&
                    fillingIndex === selectedFilling.item
                },
              ]"
            >
              <article class="actions-items actions-items--left">
                <div class="actions-items--left-wrapper">

                  <div class="actions-items--title">
                    <button
                        class="no-select actions-btn actions-icon"
                        @click="UMconstructor.FILLINGS.deleteFilling(secIndex, fillingIndex)"
                    >
                      <img
                          class="actions-icon--delete"
                          src="/icons/delite.svg"
                          alt=""
                      />
                    </button>
                    <p class="actions-title actions-title--part">
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
                      <div
                          :class="['actions-input--container']"
                      >
                        <input
                            v-if="filling.isVerticalItem"
                            type="number"
                            :step="1"
                            :max="section.width - filling.width"
                            min="0"
                            class="actions-input"
                            :value="filling.distances?.left"
                            @input="
                                UMconstructor.FILLINGS.changeFillingPositionX(
                                    $event,
                                    $event.target.value,
                                    fillingIndex,
                                    secIndex,
                                )
                            "
                        />
                        <input
                            v-else
                            type="number"
                            :step="1"
                            :max="section.height - filling.height + (filling.isProfile ? module.moduleThickness : 0)"
                            min="0"
                            class="actions-input"
                            :value="filling.distances?.bottom"
                            @input="
                                UMconstructor.FILLINGS.changeFillingPositionY(
                                    $event,
                                    $event.target.value,
                                    fillingIndex,
                                    secIndex,
                                )
                            "
                        />
                      </div>
                    </div>
                  </div>

                  <div
                      v-if="filling.fasade"
                      class="actions-items--height"
                  >
                    <div class="actions-inputs">
                      <p class="actions-title">
                        Высота фасада
                      </p>
                      <div
                          :class="['actions-input--container']"
                      >
                        <input
                            type="number"
                            :step="step"
                            :min="filling.fasade.minY"
                            :max="filling.fasade.maxY"
                            class="actions-input"
                            :value="filling.fasade.height"
                            @input="
                                UMconstructor.FILLINGS.changeDrawerFasade(
                                    $event,
                                    $event.target.value,
                                    fillingIndex,
                                    secIndex
                                )
                            "
                        />
                      </div>
                    </div>
                  </div>

                  <ConfigurationOption
                      v-if="filling.fasade"
                      :disable-delete-choice="true"
                      :class="[
                                {
                                  active:
                                    currentFasadeMaterial.sec ===
                                      secIndex &&
                                    currentFasadeMaterial.cell ===
                                      null &&
                                    currentFasadeMaterial.row ===
                                      null &&
                                    currentFasadeMaterial.item ===
                                      fillingIndex,
                                },
                              ]"
                      :type="filling.fasade.material.PALETTE ? 'palette' : 'surface'"
                      :data="filling.fasade.material.PALETTE ? {...UMconstructor.APP.PALETTE[filling.fasade.material.PALETTE], hex: UMconstructor.APP.PALETTE[filling.fasade.material.PALETTE].HTML} : UMconstructor.APP.FASADE[filling.fasade.material.COLOR]"
                      @click="openFasadeSelector(secIndex, null, null, null, fillingIndex)"
                  />

                  <ConfigurationOption
                      v-if="filling.fasade"
                      :disable-delete-choice="true"
                      :class="[
                                {
                                  active:
                                    currentHandle.sec ===
                                      secIndex &&
                                    currentHandle.cell ===
                                      null &&
                                    currentHandle.row ===
                                      null &&
                                    currentHandle.item ===
                                      fillingIndex,
                                },
                              ]"
                      :type="'Handles'"
                      :data="filling.fasade.material.HANDLES ? {...UMconstructor.APP.CATALOG.PRODUCTS[filling.fasade.material.HANDLES.id]} : false"
                      @click="
                              openHandleSelector(secIndex, null, null, null, fillingIndex)
                            "
                  />

                </div>
              </article>

            </div>

            <div class="accordion" v-if="section.cells.length">
              <div
                  v-for="(cell, cellIndex) in section.cells"
                  :key="cellIndex"
              >
                <details class="item-group" v-if="cell.fillings?.length">

                  <summary>
                    <h3 class="item-group__title">
                      {{ secIndex + 1 }}.{{ cellIndex + 1 }}
                    </h3>
                  </summary>

                  <div
                      v-for="(filling, fillingIndex) in cell.fillings"
                      :key="fillingIndex"
                      :class="'actions-items--container'"
                  >
                    <article class="actions-items actions-items--left">
                      <div class="actions-items--left-wrapper">

                        <div class="actions-items--title">
                          <button
                              class="no-select actions-btn actions-icon"
                              @click="UMconstructor.FILLINGS.deleteFilling(secIndex, fillingIndex, cellIndex)"
                          >
                            <img
                                class="actions-icon--delete"
                                src="/icons/delite.svg"
                                alt=""
                            />
                          </button>
                          <p class="actions-title actions-title--part">
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
                            <div
                                :class="['actions-input--container']"
                            >
                              <input
                                  v-if="filling.isVerticalItem"
                                  type="number"
                                  :step="1"
                                  :max="cell.width - filling.width"
                                  min="0"
                                  class="actions-input"
                                  :value="filling.distances?.left"
                                  @input="
                                    UMconstructor.FILLINGS.changeFillingPositionX(
                                      $event,
                                      $event.target.value,
                                      fillingIndex,
                                      secIndex,
                                      cellIndex
                                    )
                                  "
                              />
                              <input
                                  v-else
                                  type="number"
                                  :step="1"
                                  :max="cell.height - filling.height + (filling.isProfile ? module.moduleThickness : 0)"
                                  min="0"
                                  class="actions-input"
                                  :value="filling.distances?.bottom"
                                  @input="
                                    UMconstructor.FILLINGS.changeFillingPositionY(
                                      $event,
                                      $event.target.value,
                                      fillingIndex,
                                      secIndex,
                                      cellIndex
                                    )
                                  "
                              />
                            </div>
                          </div>
                        </div>

                        <div
                            v-if="filling.fasade"
                            class="actions-items--height"
                        >
                          <div class="actions-inputs">
                            <p class="actions-title">
                              Высота фасада
                            </p>
                            <div
                                :class="['actions-input--container']"
                            >
                              <input
                                  type="number"
                                  :step="step"
                                  :min="filling.fasade.minY"
                                  :max="filling.fasade.maxY"
                                  class="actions-input"
                                  :value="filling.fasade.height"
                                  @input="
                                    UMconstructor.FILLINGS.changeDrawerFasade(
                                      $event,
                                      $event.target.value,
                                      fillingIndex,
                                      secIndex,
                                      cellIndex
                                    )
                                  "
                              />
                            </div>
                          </div>
                        </div>

                        <ConfigurationOption
                            v-if="filling.fasade"
                            :disable-delete-choice="true"
                            :class="[
                                {
                                  active:
                                    currentFasadeMaterial.sec ===
                                      secIndex &&
                                    currentFasadeMaterial.cell ===
                                      cellIndex &&
                                    currentFasadeMaterial.row ===
                                      null &&
                                    currentFasadeMaterial.item ===
                                      fillingIndex,
                                },
                            ]"
                            :type="filling.fasade.material.PALETTE ? 'palette' : 'surface'"
                            :data="filling.fasade.material.PALETTE ? {...UMconstructor.APP.PALETTE[filling.fasade.material.PALETTE], hex: UMconstructor.APP.PALETTE[filling.fasade.material.PALETTE].HTML} : UMconstructor.APP.FASADE[filling.fasade.material.COLOR]"
                            @click="openFasadeSelector(secIndex, cellIndex, null, null, fillingIndex)"
                        />

                        <ConfigurationOption
                            v-if="filling.fasade"
                            :disable-delete-choice="true"
                            :class="[
                                {
                                  active:
                                    currentHandle.sec ===
                                      secIndex &&
                                    currentHandle.cell ===
                                      cellIndex &&
                                    currentHandle.row ===
                                      null &&
                                    currentHandle.item ===
                                      fillingIndex,
                                },
                              ]"
                            :type="'Handles'"
                            :data="filling.fasade.material.HANDLES ? {...UMconstructor.APP.CATALOG.PRODUCTS[filling.fasade.material.HANDLES.id]} : false"
                            @click="
                              openHandleSelector(secIndex, cellIndex, null, null, fillingIndex)
                            "
                        />
                      </div>
                    </article>

                  </div>

                </details>

                <div class="accordion" v-if="cell.cellsRows?.length">
                  <div
                      v-for="(row, rowIndex) in cell.cellsRows"
                      :key="rowIndex"
                      :class="'actions-items--container'"
                  >
                    <details class="item-group" v-if="row.fillings?.length">

                      <summary>
                        <h3 class="item-group__title">
                          {{ secIndex + 1 }}.{{ cellIndex + 1 }}.{{ rowIndex + 1 }}
                        </h3>
                      </summary>

                      <div
                          v-for="(filling, fillingIndex) in row.fillings"
                          :key="fillingIndex"
                          :class="[
                              'actions-items--container',
                              {
                                active:
                                  secIndex === selectedFilling.sec &&
                                  cellIndex === selectedFilling.cell &&
                                  rowIndex === selectedFilling.row &&
                                  fillingIndex === selectedFilling.item
                              },
                            ]"
                      >

                        <article class="actions-items actions-items--left">
                          <div class="actions-items--left-wrapper">

                            <div class="actions-items--title">
                              <button
                                  class="no-select actions-btn actions-icon"
                                  @click="UMconstructor.FILLINGS.deleteFilling(secIndex, fillingIndex, cellIndex, rowIndex)"
                              >
                                <img
                                    class="actions-icon--delete"
                                    src="/icons/delite.svg"
                                    alt=""
                                />
                              </button>
                              <p class="actions-title actions-title--part">
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
                                <div
                                    :class="['actions-input--container']"
                                >
                                  <input
                                      v-if="filling.isVerticalItem"
                                      type="number"
                                      :step="1"
                                      :max="row.width - filling.width"
                                      min="0"
                                      class="actions-input"
                                      :value="filling.distances?.left"
                                      @input="
                                        UMconstructor.FILLINGS.changeFillingPositionX(
                                            $event,
                                            $event.target.value,
                                            fillingIndex,
                                            secIndex,
                                            cellIndex,
                                            rowIndex
                                        )
                                      "
                                  />
                                  <input
                                      v-else
                                      type="number"
                                      :step="1"
                                      :max="row.height - filling.height + (filling.isProfile ? module.moduleThickness : 0)"
                                      min="0"
                                      class="actions-input"
                                      :value="filling.distances?.bottom"
                                      @input="
                                      UMconstructor.FILLINGS.changeFillingPositionY(
                                          $event,
                                          $event.target.value,
                                          fillingIndex,
                                          secIndex,
                                          cellIndex,
                                          rowIndex
                                        )
                                      "
                                  />
                                </div>
                              </div>
                            </div>

                            <div
                                v-if="filling.fasade"
                                class="actions-items--height"
                            >
                              <div class="actions-inputs">
                                <p class="actions-title">
                                  Высота фасада
                                </p>
                                <div
                                    :class="['actions-input--container']"
                                >
                                  <input
                                      type="number"
                                      :step="step"
                                      :min="filling.fasade.minY"
                                      :max="filling.fasade.maxY"
                                      class="actions-input"
                                      :value="filling.fasade.height"
                                      @input="
                                        UMconstructor.FILLINGS.changeDrawerFasade(
                                          $event,
                                          $event.target.value,
                                          fillingIndex,
                                          secIndex,
                                          cellIndex,
                                          rowIndex
                                        )
                                      "
                                  />
                                </div>
                              </div>
                            </div>

                            <ConfigurationOption
                                v-if="filling.fasade"
                                :disable-delete-choice="true"
                                :class="[
                                {
                                  active:
                                    currentFasadeMaterial.sec ===
                                      secIndex &&
                                    currentFasadeMaterial.cell ===
                                      cellIndex &&
                                    currentFasadeMaterial.row ===
                                      rowIndex &&
                                    currentFasadeMaterial.item ===
                                      fillingIndex,
                                },
                                ]"
                                :type="filling.fasade.material.PALETTE ? 'palette' : 'surface'"
                                :data="filling.fasade.material.PALETTE ? {...UMconstructor.APP.PALETTE[filling.fasade.material.PALETTE], hex: UMconstructor.APP.PALETTE[filling.fasade.material.PALETTE].HTML} : UMconstructor.APP.FASADE[filling.fasade.material.COLOR]"
                                @click="openFasadeSelector(secIndex, cellIndex, rowIndex, null, fillingIndex)"
                            />

                            <ConfigurationOption
                                v-if="filling.fasade"
                                :disable-delete-choice="true"
                                :class="[
                                {
                                  active:
                                    currentHandle.sec ===
                                      secIndex &&
                                    currentHandle.cell ===
                                      cellIndex &&
                                    currentHandle.row ===
                                      rowIndex &&
                                    currentHandle.item ===
                                      fillingIndex,
                                },
                              ]"
                                :type="'Handles'"
                                :data="filling.fasade.material.HANDLES ? {...UMconstructor.APP.CATALOG.PRODUCTS[filling.fasade.material.HANDLES.id]} : false"
                                @click="
                              openHandleSelector(secIndex, cellIndex, rowIndex, null, fillingIndex)
                            "
                            />

                          </div>
                        </article>

                      </div>
                    </details>

                    <div class="accordion" v-if="row.extras?.length">
                      <div
                          v-for="(extra, extraIndex) in row.extras"
                          :key="extraIndex"
                          :class="'actions-items--container'"
                      >
                        <details class="item-group" v-if="extra.fillings?.length">

                          <summary>
                            <h3 class="item-group__title">
                              {{ secIndex + 1 }}.{{ cellIndex + 1 }}.{{ rowIndex + 1 }}.{{ extraIndex + 1 }}
                            </h3>
                          </summary>

                          <div
                              v-for="(filling, fillingIndex) in extra.fillings"
                              :key="fillingIndex"
                              :class="[
                              'actions-items--container',
                              {
                                active:
                                  secIndex === selectedFilling.sec &&
                                  cellIndex === selectedFilling.cell &&
                                  rowIndex === selectedFilling.row &&
                                  extraIndex === selectedFilling.extra &&
                                  fillingIndex === selectedFilling.item
                              },
                            ]"
                          >

                            <article class="actions-items actions-items--left">
                              <div class="actions-items--left-wrapper">

                                <div class="actions-items--title">
                                  <button
                                      class="no-select actions-btn actions-icon"
                                      @click="UMconstructor.FILLINGS.deleteFilling(secIndex, fillingIndex, cellIndex, rowIndex, extraIndex)"
                                  >
                                    <img
                                        class="actions-icon--delete"
                                        src="/icons/delite.svg"
                                        alt=""
                                    />
                                  </button>
                                  <p class="actions-title actions-title--part">
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
                                    <div
                                        :class="['actions-input--container']"
                                    >
                                      <input
                                          v-if="filling.isVerticalItem"
                                          type="number"
                                          :step="1"
                                          :max="extra.width - filling.width"
                                          min="0"
                                          class="actions-input"
                                          :value="filling.distances?.left"
                                          @input="
                                            UMconstructor.FILLINGS.changeFillingPositionX(
                                              $event,
                                              $event.target.value,
                                              fillingIndex,
                                              secIndex,
                                              cellIndex,
                                              rowIndex,
                                              extraIndex
                                            )
                                          "
                                      />
                                      <input
                                          v-else
                                          type="number"
                                          :step="1"
                                          :max="extra.height - filling.height + (filling.isProfile ? module.moduleThickness : 0)"
                                          min="0"
                                          class="actions-input"
                                          :value="filling.distances?.bottom"
                                          @input="
                                            UMconstructor.FILLINGS.changeFillingPositionY(
                                              $event,
                                              $event.target.value,
                                              fillingIndex,
                                              secIndex,
                                              cellIndex,
                                              rowIndex,
                                              extraIndex
                                            )
                                          "
                                      />
                                    </div>
                                  </div>
                                </div>

                              </div>
                            </article>

                          </div>
                        </details>

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
    <div class="color--right-select" v-if="isOpenMaterialSelector || isOpenHandleSelector" key="color--right-select">
      <ClosePopUpButton class="menu__close" @close="closeMenu()"/>

      <AdvanceCorpusMaterialRedactor
          v-if="isOpenMaterialSelector"
          :is-fasade="true"
          :elementData="currentFasadeMaterial.data"
          :fasade-size="currentFasadeMaterial.fasadeSize"
          @parent-callback="selectOption"
      />
      <Handles
          v-else
          :is2-dconstructor="true"
          :data="createSurfaceList(currentHandle)"
          :index="0"
          @parent-callback="selectHandle"
          :active-pos="currentHandle.data.HANDLES.position"
      />
    </div>
  </transition>
</template>

<style scoped lang="scss">
.accordion {
  border: unset;

  &-fillings_list {
    gap: 1rem;
  }
}
.search {
  width: 100%;
  height: 100%;
  padding-bottom: 2vh;
  padding-top: 2vh;

  &--input{
    padding: 10px 15px;
    width: 100%;
    border-radius: 15px;
  }
}
</style>