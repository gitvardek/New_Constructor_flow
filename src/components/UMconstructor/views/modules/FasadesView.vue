<script setup lang="ts">
//@ts-nocheck

import "@/components/UMconstructor/styles/UM.scss";

import ConfigurationOption from "@/components/right-menu/customiser-pages/ColorRightPage/ConfigurationOption.vue";
import AdvanceCorpusMaterialRedactor from "@/components/ui/color/AdvanceCorpusMaterialRedactor.vue";
import Handles from "@/components/right-menu/customiser-pages/FigureRightPage/Handles/Handles.vue";
import ClosePopUpButton from "@/components/ui/svg/ClosePopUpButton.vue";
import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import Options from "@/components/right-menu/customiser-pages/RailsRightPage/Options.vue"; 50
import { ref, toRefs, onBeforeUnmount, onMounted, watch, computed } from "vue";
import {
  TSelectedCell,
  GridModule,
  LOOPSIDE,
} from "@/components/UMconstructor/types/UMtypes.ts";
import { TFasadeProp, TFasadeTrueSizes } from "@/types/types.ts";
import { useFigureRightPage } from "@/utils/useFigureRightPage";
import { useMechanism } from "@/components/right-menu/customiser-pages/RailsRightPage/Mechanism/useMechanism";
import Accordion from "@/components/ui/accordion/Accordion.vue";

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
  },
});

const { module, mode, UMconstructor } = toRefs(props);
const selectedFasade = ref<TSelectedCell>(<TSelectedCell>{});
const selectedCell = ref<TSelectedCell>(<TSelectedCell>{});

const mechanism: ReturnType<typeof useMechanism> = useMechanism();
const { weightCalculation, createMeckhanizmList } = mechanism;
const mechanismList = ref([]);
const currentElement = ref(null);
const currentSegment = ref(null);

const step = ref<number>(1);
const { createSurfaceList } = useFigureRightPage();
type selectedMaterial = {
  sec: number | null;
  cell?: number | null;
  row?: number | null;
  extra?: number | null;
  item?: number | null;
  data: TFasadeProp;
  fasadeSize?: {};
};
const isOpenMaterialSelector = ref<boolean>(false);
const currentFasadeMaterial = ref<selectedMaterial | boolean>(false);
const currentFasadeSize = ref<TFasadeTrueSizes | boolean>(false);

const isOpenHandleSelector = ref<boolean>(false);
const currentHandle = ref<selectedMaterial | boolean>(false);
const panelRef = ref<HTMLElement | null>(null);

const isOpenMechanizm = ref<boolean>(false);
mechanismList.value = [];
currentElement.value = null;
currentSegment.value = null;

const handleOutsideClick = (event: MouseEvent) => {
  // Закрываем только когда меню реально открыто
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
  secIndex: number | null = 0,
  cellIndex: number | null = null,
  rowIndex: number | null = null,
) => {
  UMconstructor?.value?.selectCell("fasades", <TSelectedCell>{
    sec: secIndex,
    cell: cellIndex,
    row: rowIndex,
  });
};

const handleCellSelect = () => {
  const { sec, cell, row } = selectedFasade.value;

  //Задержка нужна для того, чтоб рендер аккордионов обновился
  UMconstructor?.value?.debounce(
    "handleCellSelectFasades",
    () => {
      let idTag = `fasade_${sec}`;

      if (cell !== null) idTag += `_${cell}`;

      if (row !== null) idTag += `_${row}`;

      let domElem = document.getElementById(idTag);
      if (domElem) {
        domElem.scrollIntoView();
      }
    },
    10,
  );

  isOpenMechanizm.value = false;
  mechanismList.value = [];
  currentElement.value = null;
  currentSegment.value = null;
};

const openFasadeSelector = (
  sec: number,
  cell: number | null = null,
  row: number | null = null,
) => {
  isOpenMaterialSelector.value = false;
  isOpenMechanizm.value = false;
  mechanismList.value = [];
  currentElement.value = null;
  currentSegment.value = null;

  if (isOpenHandleSelector.value) closeMenu();

  const productId = UMconstructor.value.MODEL_STATE.getCurrentModel.userData.PROPS.PRODUCT;
  const exeptModel = UMconstructor.value.MODEL_STATE._FASADE_EXCEPTIONS[productId]

  /** @Создание_данных_для_выбранного_фасада */
  if (exeptModel) {
    createFacadeData(cell);
    console.log(UMconstructor.value.UM_STORE.getUMGrid(), "productId", cell, row)
  }
  else {
    createFacadeData(row === null ? undefined : row);
  }

  if (
    currentFasadeMaterial.value &&
    sec === currentFasadeMaterial.value.sec &&
    cell === currentFasadeMaterial.value.cell &&
    row === currentFasadeMaterial.value.row
  ) {
    closeMenu();
    return;
  }

  setTimeout(() => {
    let data =
      sec === null
        ? module.value.fasades[cell][row]
        : module.value.sections[sec].fasades[cell][row];
    currentFasadeMaterial.value = {
      sec,
      cell,
      row,
      data: data.material,
    };
    currentFasadeSize.value = <TFasadeTrueSizes>{
      FASADE_WIDTH: data.width,
      FASADE_HEIGHT: data.height,
    };
    UMconstructor?.value?.FASADES.selectCell(sec, cell, row);
    isOpenMaterialSelector.value = true;
  }, 10);
};

const openHandleSelector = (
  sec: number | null,
  cell: number | null = null,
  row: number | null = null,
) => {
  isOpenHandleSelector.value = false;
  isOpenMaterialSelector.value = false;
  isOpenMechanizm.value = false;
  mechanismList.value = [];
  currentElement.value = null;
  currentSegment.value = null;

  if (isOpenMaterialSelector.value) closeMenu();

  if (
    currentHandle.value &&
    sec === currentHandle.value.sec &&
    cell === currentHandle.value.cell &&
    row === currentHandle.value.row
  ) {
    closeMenu();
    return;
  }

  setTimeout(() => {
    let data =
      sec === null
        ? module.value.fasades[cell][row]
        : module.value.sections[sec].fasades[cell][row];
    currentHandle.value = {
      sec,
      cell,
      row,
      data: data.material,
    };
    UMconstructor?.value?.FASADES.selectCell(sec, cell, row);
    isOpenHandleSelector.value = true;
  }, 10);
};

const createFacadeData = (fasadeIndex: number | undefined) => {
  UMconstructor?.value?.FASADES.createFacadeData(fasadeIndex);
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
  UMconstructor?.value?.RENDER_REF.renderGrid(module.value);
};

const selectOption = (value: Object, type: string, palette: Object = false, alum: number | null = null) => {
  console.log(type, value, alum, 'selectOption')

  currentFasadeMaterial.value.data[type] = value ? value.ID || value : null;
  if (palette) currentFasadeMaterial.value.data["PALETTE"] = palette;


  if (type === "COLOR") {
    currentFasadeMaterial.value.data["ALUM"] = alum;
    
    if (
      currentFasadeMaterial.value.data[type] ===
      UMconstructor?.value?.CONST.NO_FASADE_ID
    )
      currentFasadeMaterial.value.data["MANUAL_NO_FASADE"] = true;
    else delete currentFasadeMaterial.value.data["MANUAL_NO_FASADE"];
  }

  let { sec, cell, row } = currentFasadeMaterial.value;
  if (sec === null) {
    module.value.fasades[cell][row].material = Object.assign(
      module.value.fasades[cell][row].material,
      currentFasadeMaterial.value.data,
    );
  } else {
    module.value.sections[sec].fasades[cell][row].material = Object.assign(
      module.value.sections[sec].fasades[cell][row].material,
      currentFasadeMaterial.value.data,
    );
  }

  // Петли сегмента разделённого фасада зависят от материала: без материала сегмента
  // фактически нет и петли ему не назначаются. Как только материал выбран (или снят),
  // пересчитываем петли секции — calcLoops сам вернёт loopsSide, сброшенный в none
  if (type === "COLOR" && sec !== null) {
    UMconstructor?.value?.LOOPS.calcLoops(sec, module.value);
    UMconstructor?.value?.RENDER_REF.renderGrid(module.value);
  }
};

const closeMenu = () => {
  isOpenMaterialSelector.value = false;
  isOpenHandleSelector.value = false;
  isOpenMechanizm.value = false;

  currentHandle.value = false;
  currentFasadeMaterial.value = false;
  currentFasadeSize.value = false;

  mechanismList.value = [];
  currentElement.value = null;
  currentSegment.value = null;
};

const getLoopsideList = (
  secIndex: number,
  doorIndex: number,
  module,
  segment: number,
) => {
  let list = UMconstructor?.value?.LOOPS.getLoopsideList(
    secIndex,
    doorIndex,
    module,
    segment,
  );

  if (module.noLoops) {
    const noneItem = list?.find((item) => item.ID === LOOPSIDE["none"]);
    return noneItem ? [noneItem] : [];
  } else return list?.filter(Boolean) ?? [];
};

const changeLoopside = (secIndex, segment, event, doorIndex, module) => {
  closeMenu();

  UMconstructor?.value?.FASADES.changeLoopside(
    secIndex,
    segment,
    event.target.value,
    doorIndex,
    module,
  );
};

const createMechanizmList = (segment) => {
  const { height, width, material } = segment;
  const { PRODUCT, CONFIG } = UMconstructor.value.UM_STORE.getUMData();

  console.log(segment, "segment");

  const tempData = {
    userData: {
      UM: true,
      PROPS: {
        PRODUCT: PRODUCT,
        CONFIG: {
          FASADE_PROPS: Object.assign(material, { UMSIZES: { height, width } }),
          SIZE: { height, width },
          MECHANISM: material.MECHANISM,
          MECHANISM_TEMP: [],
        },
      },
    },
  };

  const list = createMeckhanizmList(tempData);

  mechanismList.value = list;
  currentElement.value = tempData.userData.PROPS.CONFIG;
  currentSegment.value = material;

  isOpenMechanizm.value = true;
  isOpenHandleSelector.value = false;
  isOpenMaterialSelector.value = false;

  console.log(list, tempData, "Meckhanizm LIST");
};

onMounted(() => {
  selectedFasade.value = UMconstructor?.value?.UM_STORE.getSelected("fasades");

  // Закрытие при клике вне зоны панели
  document.addEventListener("click", handleOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleOutsideClick);
});

watch(
  () => UMconstructor?.value?.UM_STORE.getSelected("fasades"),
  () => {
    selectedFasade.value =
      UMconstructor?.value?.UM_STORE.getSelected("fasades");
    selectedCell.value = UMconstructor?.value?.UM_STORE.getSelected("module");
    handleCellSelect();
  },
);

watch(
  () => selectedFasade.value,
  () => {
    const { sec, cell, row } = selectedFasade.value;
    if (
      currentFasadeMaterial.value &&
      !(
        sec === currentFasadeMaterial.value.sec &&
        cell === currentFasadeMaterial.value.cell &&
        row === currentFasadeMaterial.value.row
      )
    ) {
      closeMenu();
      return;
    } else if (
      currentHandle.value &&
      !(
        sec === currentHandle.value.sec &&
        cell === currentHandle.value.cell &&
        row === currentHandle.value.row
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
    <div class="UM splitter-container--product-data" v-if="module">
      <section v-if="module.fasades" class="UM actions-wrapper">
        <div :class="'UM actions-items--container'">
          <article class="UM actions-items actions-items--right">
            <div class="UM actions-items--right-items">
              <button v-if="module.fasades.length < 4" :class="['UM actions-btn actions-btn--default']" @click="
                UMconstructor.FASADES.addSlideDoor(
                  module.fasades.length + 1,
                  module,
                )
                ">
                Добавить дверь
              </button>

              <button v-if="module.fasades.length > 2" :class="['UM actions-btn actions-btn--default']" @click="
                UMconstructor.FASADES.deleteSlideDoor(
                  module.fasades.length,
                  module,
                )
                ">
                Удалить дверь
              </button>
            </div>
          </article>
        </div>

        <div class="UM actions-header">
          <div :class="[
            'UM actions-header--container',
            { active: doorIndex === selectedFasade.cell },
          ]" v-for="(door, doorIndex) in module.fasades" :key="doorIndex" @click="showCurrentCol(null, doorIndex)">
            <p class="UM actions-title actions-title--part">
              Дверь №{{ doorIndex + 1 }}
            </p>
          </div>
        </div>

        <div v-for="(door, doorIndex) in module.fasades" :key="doorIndex" :class="'UM actions-container'"
          :id="`fasade_${doorIndex}_${doorIndex}`">
          <div class="UM actions-items--wrapper" v-if="selectedFasade.cell === doorIndex">
            <div class="UM accordion">
              <div v-for="(segment, segmentIndex) in door" :key="segmentIndex" :class="'UM actions-items--container'"
                :id="`fasade_${doorIndex}_${segmentIndex}`">
                <details class="item-group" :open="doorIndex === selectedFasade.cell &&
                  segmentIndex === selectedFasade.row
                  ">
                  <summary>
                    <h3 class="item-group__title">
                      Сегмент №{{ doorIndex + 1
                      }}{{
                        door.length > 1
                          ? `.${segment.id /*segmentIndex + 1*/}`
                          : ""
                      }}
                    </h3>
                  </summary>

                  <div :class="'actions-items--container'">
                    <article class="actions-items actions-items--left">
                      <div class="actions-items--left-wrapper">
                        <div class="actions-items--width">
                          <div class="actions-inputs">
                            <p class="actions-title">Ширина</p>
                            <div :class="['actions-input--container']">
                              <input type="number" :step="step" min="150" class="actions-input" :value="segment.width"
                                disabled />
                            </div>
                          </div>
                        </div>

                        <div class="actions-items--height">
                          <div class="actions-inputs">
                            <p class="actions-title">Высота</p>
                            <div :class="['actions-input--container']">
                              <input type="number" :step="step" min="150" class="actions-input" :value="segment.height"
                                disabled />
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>

                    <article class="actions-items actions-items--right">
                      <div class="actions-items--right-items">
                        <!--                        <button
                                                    v-if="!module.isRestrictedModule"
                                                    :class="['actions-btn actions-btn&#45;&#45;default']"
                                                    @click="UMconstructor.FASADES.splitFasade(null, doorIndex, segmentIndex)"
                                                >
                                                  Разделить фасад
                                                </button>-->

                        <button v-if="
                          door.length > 1 &&
                          UMconstructor.FASADES.checkRemoveFasadeSegment(
                            null,
                            doorIndex,
                            segmentIndex,
                            module,
                          )
                        " class="actions-btn actions-btn--default" @click="
                          UMconstructor.FASADES.removeFasadeSegment(
                            null,
                            doorIndex,
                            segmentIndex,
                            module,
                          )
                          ">
                          Удалить
                        </button>

                        <ConfigurationOption v-if="!segment.error" :disable-delete-choice="true" :class="[
                          {
                            active:
                              isOpenMaterialSelector &&
                              currentFasadeMaterial.cell === doorIndex &&
                              currentFasadeMaterial.row === segmentIndex,
                          },
                        ]" :type="segment.material.PALETTE ? 'palette' : 'surface'
                          " :data="segment.material.PALETTE
                            ? {
                              ...UMconstructor.APP.PALETTE[
                              segment.material.PALETTE
                              ],
                              hex: UMconstructor.APP.PALETTE[
                                segment.material.PALETTE
                              ].HTML,
                            }
                            : UMconstructor.APP.FASADE[segment.material.COLOR]
                            " @click.stop="
                              openFasadeSelector(null, doorIndex, segmentIndex)
                              " />
                        <h class="splitter-container--product-error-message" v-else>Фасад некорректного размера!</h>
                        <ConfigurationOption v-if="!segment.error" :disable-delete-choice="true" :class="[
                          {
                            active:
                              currentHandle.cell === doorIndex &&
                              currentHandle.row === segmentIndex,
                          },
                        ]" :type="'Handles'" :data="segment.material.HANDLES
                          ? {
                            ...UMconstructor.APP.CATALOG.PRODUCTS[
                            segment.material.HANDLES.id
                            ],
                          }
                          : false
                          " @click.stop="
                            openHandleSelector(null, doorIndex, segmentIndex)
                            " />
                      </div>
                    </article>
                  </div>
                </details>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section v-else class="actions-wrapper">

        <div class="actions-header">
          <div :class="[
            'actions-header--container',
            { active: secIndex === selectedFasade.sec },
          ]" v-for="(section, secIndex) in module.sections" :key="secIndex" @click="showCurrentCol(secIndex)">
            <p class="actions-title actions-title--part">
              {{ secIndex + 1 }}
            </p>
          </div>
        </div>

        <div v-for="(section, secNdx) in module.sections" :key="secNdx" class="actions-items--wrapper">
          <div v-if="selectedFasade.sec === secNdx">
            <div v-if="
              section.fasades.length < 1 ||
              ((!module.isHiTech || !module.profilesConfig?.sideProfile) &&
                section.fasades.length < 2 &&
                UMconstructor.FASADES.checkAddDoor(
                  secNdx,
                  section.fasades.length - 1,
                  module,
                ))
            " :class="'actions-items--container'">
              <article class="actions-items actions-items--right">
                <div class="actions-items--right-items">
                  <button :class="['actions-btn actions-btn--default']"
                    @click="UMconstructor.FASADES.addDoor(secNdx, module)">
                    Добавить дверь
                  </button>
                </div>
              </article>
            </div>

            <div v-for="(door, doorIndex) in section.fasades" :key="doorIndex" :class="'actions-container'"
              :id="`fasade_${secNdx}_${doorIndex}`">

              <div class="actions-header" v-if="door && Object.entries(door).length > 0">
                <div class="actions-header-column">
                  <div class="actions-header-row">
                    <button v-if="
                      !module.isRestrictedModule ||
                      (module.isRestrictedModule &&
                        section.fasades.length > 1)
                    " class="actions-btn actions-icon" @click="
                      UMconstructor.FASADES.deleteDoor(
                        secNdx,
                        doorIndex,
                        module,
                      )
                      ">
                      <img class="actions-icon--delete" src="/icons/delite.svg" alt="" />
                    </button>
                    <p class="actions-title actions-title--part">
                      Дверь №{{ doorIndex + 1 }}
                    </p>
                  </div>
                  <p class="actions-title actions-title--part">
                    Высота сегментов:
                    {{
                      UMconstructor.FASADES.calcSumHeightDoorSegmentes(
                        secNdx,
                        doorIndex,
                        module,
                      )
                    }}
                  </p>
                  <p class="actions-title actions-title--part">
                    Ширина: {{ door?.[0]?.width }}
                  </p>
                </div>
              </div>


              <div class="actions-wrapper" v-for="(segment, segmentIndex) in door" :key="segmentIndex">

                <Accordion :open="doorIndex === selectedFasade.cell &&
                  segmentIndex === selectedFasade.row
                  ">
                  <template #title>
                    <h3 class="item-group__title">
                      Сегмент №{{ secNdx + 1 }}.{{ doorIndex + 1 }}.{{
                        segment.id /*segmentIndex + 1*/
                      }}
                    </h3>
                  </template>

                  <template #params="{ onToggle }">

                    <div :class="'actions__list'">
                      <article class="actions-items actions-items--left">
                        <div class="actions-items--left-wrapper">
                          <div class="actions-items__size-controllers">

                            <div class="actions-items--width">
                              <div class="actions-inputs">
                                <p class="actions-title">Ширина</p>
                                <div :class="['actions-input--container']">
                                  <input type="number" :step="step" min="150" class="actions-input"
                                    :value="segment.width" disabled />
                                </div>
                              </div>
                            </div>

                            <div class="actions-items--height">
                              <div class="actions-inputs">
                                <p class="actions-title">Высота</p>
                                <div :class="['actions-input--container']">
                                  <input type="number" :step="step" min="150" class="actions-input"
                                    :value="segment.height" :disabled="!UMconstructor.FASADES.checkRemoveFasadeSegment(
                                      secNdx,
                                      doorIndex,
                                      segmentIndex,
                                      module,
                                    )
                                      " @input="
                                        UMconstructor.FASADES.updateFasadeHeight(
                                          $event.target.value,
                                          secNdx,
                                          doorIndex,
                                          segmentIndex,
                                          module,
                                        )
                                        " />
                                </div>
                              </div>
                            </div>

                          </div>

                          <div class="actions-items--selector" v-if="!module.isRestrictedModule">

                            <div class="actions-inputs">
                              <p class="actions-title">Сторона открывания</p>
                              <div>
                                <select style id="loopsSide"
                                  :key="`loopside_${secNdx}_${doorIndex}_${segmentIndex}_${segment.loopsSide}`"
                                  name="loopsSide" class="actions-input"
                                  :title="UMconstructor.APP.LOOPSIDE[segment.loopsSide]?.NAME ?? ''"
                                  @change="changeLoopside(secNdx, segment, $event, doorIndex, module)"
                                  :disabled="getLoopsideList(secNdx, doorIndex, module, segment.id).length < 2">
                                  <option v-for="(side, key) in getLoopsideList(
                                    secNdx,
                                    doorIndex,
                                    module,
                                    segment.id,
                                  )" :key="key" :value="side.ID" :selected="side.ID === segment.loopsSide">
                                    <div class="item-group-name" :title="side.NAME">
                                      <p class="name__text">
                                        {{ side.NAME }}
                                      </p>
                                    </div>
                                  </option>
                                </select>
                              </div>
                            </div>
                          </div>

                          <div>
                            <button class="actions-btn actions-btn--default" v-if="
                              LOOPSIDE[segment.loopsSide]?.includes('top') &&
                              segment.material.COLOR !== 7397
                            " @click="createMechanizmList(segment)">
                              Подъёмные механизмы
                            </button>
                          </div>

                        </div>
                      </article>

                      <button v-if="!module.isRestrictedModule" :class="['actions-btn actions-btn--default']" @click="
                        UMconstructor.FASADES.splitFasade(
                          secNdx,
                          doorIndex,
                          segmentIndex,
                          module,
                        )
                        ">
                        Разделить фасад
                      </button>

                      <article class="actions-items actions-items--right">

                        <div class="actions-items--right-items">


                          <button v-if="
                            door.length > 1 &&
                            UMconstructor.FASADES.checkRemoveFasadeSegment(
                              secNdx,
                              doorIndex,
                              segmentIndex,
                              module,
                            )
                          " class="actions-btn actions-btn--default" @click="
                            UMconstructor.FASADES.removeFasadeSegment(
                              secNdx,
                              doorIndex,
                              segmentIndex,
                              module,
                            )
                            ">
                            Удалить
                          </button>

                          <ConfigurationOption v-if="!segment.error" :disable-delete-choice="true" :class="[
                            {
                              active:
                                isOpenMaterialSelector &&
                                currentFasadeMaterial.sec === secNdx &&
                                currentFasadeMaterial.cell === doorIndex &&
                                currentFasadeMaterial.row === segmentIndex,
                            },
                          ]" :type="segment.material.PALETTE ? 'palette' : 'surface'
                            " :data="segment.material.PALETTE
                              ? {
                                ...UMconstructor.APP.PALETTE[
                                segment.material.PALETTE
                                ],
                                hex: UMconstructor.APP.PALETTE[
                                  segment.material.PALETTE
                                ].HTML,
                              }
                              : UMconstructor.APP.FASADE[
                              segment.material.COLOR
                              ]
                              " @click.stop="
                                openFasadeSelector(
                                  secNdx,
                                  doorIndex,
                                  segmentIndex,
                                )
                                " />
                          <h class="splitter-container--product-error-message" v-else>Фасад некорректного размера!</h>

                          <ConfigurationOption v-if="!segment.error" :disable-delete-choice="true" :class="[
                            {
                              active:
                                currentHandle.sec === secNdx &&
                                currentHandle.cell === doorIndex &&
                                currentHandle.row === segmentIndex,
                            },
                          ]" :type="'Handles'" :data="segment.material.HANDLES
                            ? {
                              ...UMconstructor.APP.CATALOG.PRODUCTS[
                              segment.material.HANDLES.id
                              ],
                            }
                            : false
                            " @click.stop="
                              openHandleSelector(
                                secNdx,
                                doorIndex,
                                segmentIndex,
                              )
                              " />
                        </div>
                      </article>
                    </div>

                  </template>

                </Accordion>

              </div>



            </div>
          </div>
        </div>

      </section>
    </div>
  </div>

  <transition name="slide--right" mode="out-in">
    <div class="no-select color--right-select" v-if="isOpenMaterialSelector || isOpenHandleSelector || isOpenMechanizm"
      key="color--right-select" ref="panelRef">
      <ClosePopUpButton class="menu__close" @close="closeMenu()" />

      <AdvanceCorpusMaterialRedactor v-if="isOpenMaterialSelector" :is-fasade="true"
        :elementData="currentFasadeMaterial.data" :elementIndex="currentFasadeMaterial.row"
        :fasade-size="currentFasadeSize" @parent-callback="selectOption" />

      <Handles v-if="isOpenHandleSelector" :is2-dconstructor="true" :data="createSurfaceList(currentHandle)" :index="0"
        @parent-callback="selectHandle" :active-pos="currentHandle.data.HANDLES.position"
        :disable-position-changer="!!module?.isSlidingDoors" />

      <Options v-if="isOpenMechanizm" :mechanizm-list="mechanismList" :um-mechanizm="true" :element="currentElement"
        :segment="currentSegment" />
    </div>
  </transition>
</template>

<style scoped lang="scss">
.accordion {
  padding: 0.5rem 1rem;
  border-radius: 0;
  border-bottom: 1px solid $dark-stroke;
  gap: 0;
}

.actions {
  &__list {
    padding: 1rem 0;
    border-top: 1px solid $dark-grey;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  &-items {
    &__size-controllers {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
  }
}
</style>
