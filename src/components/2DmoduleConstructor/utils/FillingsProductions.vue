<script setup lang="ts">
// @ts-nocheck
import {defineExpose, ref, toRefs, onBeforeMount, onMounted} from "vue";
import {_URL} from "@/types/constants";
import {
  DrawerFasadeObject,
  FasadeMaterial,
  FasadeObject,
  FillingObject,
  MANUFACTURER
} from "@/types/constructor2d/interfaсes.ts";
import * as THREE from "three";
import {useAppData} from "@/store/appliction/useAppData.ts";
import AdvanceCorpusMaterialRedactor from "@/components/ui/color/AdvanceCorpusMaterialRedactor.vue";
import ConfigurationOption from "@/components/right-menu/customiser-pages/ColorRightPage/ConfigurationOption.vue";
import {useModelState} from "@/store/appliction/useModelState.ts";
import ClosePopUpButton from "@/components/ui/svg/ClosePopUpButton.vue";
import Handles from "@/components/right-menu/customiser-pages/FigureRightPage/Handles/Handles.vue";
import {useFigureRightPage} from "@/utils/useFigureRightPage";
import {UniversalGeometryBuilder} from "@/Application/Meshes/UniversalModuleUtils/UniversalGeometryBuilder.ts";
import {useToast} from "@/features/toaster/useToast.ts";

const props = defineProps({
  fillings: {
    type: Array,
    default: [],
    required: true,
  },
  module: {
    type: Object,
    default: {},
    required: true,
  },
  step: {
    type: Number,
    default: 1,
  },
  visualizationRef: {
    type: [ref, Object],
  },
  shapeAdjuster: {
    type: [ref, Object],
  }
});

const emit = defineEmits([
  "product-updateFasades",
  "product-updateFilling",
  "product-calcDrawersFasades",
  "product-checkLoopsCollision",
]);

const { figureItems, createSurfaceList } =
    useFigureRightPage();

const {module, fillings, visualizationRef} = toRefs(props);
const APP = useAppData().getAppData;
const modelState = useModelState();
const toAster = useToast()
const builder = new UniversalGeometryBuilder({}).buildProduct;

const selectedFilling = ref({sec: 0, cell: null, row: null, item: 0, extra: null});
const isOpenMaterialSelector = ref<boolean>(false);
const currentFasadeMaterial = ref<Object | boolean>(false);

const isOpenHandleSelector = ref<boolean>(false);
const currentHandle = ref<Object | boolean>(false);

type workMode = 'config' | 'add';
const mode = ref<workMode>('add');
const changeConstructorMode = (_mode: workMode) => {
  if (_mode) {
    mode.value = _mode;
  }
}

const FILLING_TYPES = new Map(
    Object.entries({
      2166308: 'drawer', //Встраиваемые ящики
      2166309: 'drawer', //Секции
      5718462: 'drawer', //Секции купе
      5726092: 'drawer', //Внешние ящики
      6560591: 'drawer', //Внешние ящики Hi-Tech
      5726093: 'shelf',  //Полки
      12102124: 'shelf', //Полки Hi-Tech
      6311723: 'shelf',  //Полки купе
      6174300: 'any',    //Аксессуары для шкафов
      6513322: 'profile',//Профиль Hi-Tech
    })
)

const timer = ref(false);
const debounce = (callback, wait) => {
  if (timer.value) {
    clearTimeout(timer.value)
  }

  timer.value = setTimeout(() => {
    callback();
    timer.value = false
  }, wait)
}

const checkLoopsCollision = (
    secIndex,
    cellIndex = null,
    rowIndex = null,
    segmentIndex = null
) => {
  emit(
      "product-checkLoopsCollision",
      secIndex,
      cellIndex,
      rowIndex,
      segmentIndex
  );
};

const selectCell = (sec, cell = null, row = null, extra = null, item = 0) => {
  selectedFilling.value = {sec, cell, row, item};
  visualizationRef.value.selectCell("fillings", sec, cell, true, row, item);
};

const handleCellSelect = (secIndex, cellIndex = null, rowIndex = null, extra = null, item = 0) => {
  selectedFilling.value = {sec: secIndex, cell: cellIndex, row: rowIndex, item: item, extra: extra};
};

const showCurrentCol = (secIndex) => {
  selectCell(secIndex)
};

const createFillingDataToCheck = (product, currentSpace, isVerticalItem = false, isDrawer = false) => {

  let width = product.width
  let height = product.height
  let isSlidingDoors = module.value.fasades ? 100 : 0

  if (!isVerticalItem && (height > currentSpace.height || product.ACTUAL_DEPT > module.value.depth - isSlidingDoors)) {
    return false
  }

  if (isVerticalItem) {
    height = currentSpace.height;
  } else if (width !== currentSpace.width)
    width = currentSpace.width;

  let tempFilling = {
    width,
    height,
    data: product,
    isVerticalItem,
    isDrawer,
  };

  return visualizationRef.value.checkPositionFillingToCreate(tempFilling);
};

const getFasadePosition = (_position) => {

  const {userData} = modelState.getCurrentModel;
  const {PROPS} = userData;
  let fasadePosition = APP.FASADE_POSITION[_position];

  if (!fasadePosition)
    return {}

  fasadePosition = builder.getExec(
      builder.expressionsReplace(fasadePosition,
          Object.assign(PROPS.CONFIG.EXPRESSIONS,
              {
                "#X#": module.value.width,
                "#Y#": module.value.height - (module.value.isRestrictedModule ? 0 : module.value.horizont),
                "#Z#": module.value.depth,
              }))
  )

  return fasadePosition
}

const addFilling = (_product, productGroupID) => {

  const product = Object.assign({}, _product);

  const {sec, cell, row, extra} = selectedFilling.value
  const isHiTechProfile = APP.PRODUCTS_TYPES[product.productType]?.CODE.includes("hi_tech_profile") || false
  const isBottomHiTechProfile = isHiTechProfile && APP.PRODUCTS_TYPES[product.productType]?.CODE.includes("bottom") || false
  const {userData} = modelState.getCurrentModel;
  const {PROPS} = userData;

  let name = product.NAME?.toLowerCase()
  let _type = name.includes('разделитель') ? 'vertical_shelf' : FILLING_TYPES.get(`${productGroupID}`) || 'any';
  if (_type === 'shelf' && name.includes('стеклянная')) {
    _type = "glass_shelf"
  }

  const isVerticalItem = _type === "vertical_shelf"

  const currentSection = module.value.sections[sec];
  const currentCell = currentSection.cells?.[cell];
  const currentRow = currentCell?.cellsRows?.[row];
  const currentExtra = currentRow?.extras?.[extra];

  let currentModuleSegment = currentExtra || currentRow || currentCell || currentSection

  if (row === null && cell === null && sec === null && extra === null) {
    alert("Пожалуйста, выберите секцию для добавления наполнения", "error");
    return;
  }

  if (product.MIN_FASADE_SIZE) {
    if (row || extra) {
      alert("Нельзя установить ящик с фасадом в вертикальную разделитель!", "error");
      return;
    }

    if (!currentSection?.fasades?.[0]?.[0] && !currentSection?.fasadesDrawers?.[0]) {
      alert("Нельзя установить ящик с фасадом в секцию без двери! Добавьте фасад, даже если он должен быть пустым!", "error");
      return;
    }
  }

  if (isBottomHiTechProfile && !PROPS.CONFIG.OPTIONS.find((opt, index) => {
    if (+opt.id === 4722965 && opt.active)
      return opt;
  })) {
    alert("Г-образный профиль доступен только для навесного модуля", "error")
    return;
  }

  if (isHiTechProfile && module.value.profilesConfig?.sideProfile) {
    alert("Нельзя добавить горизонтальный профиль вместе с боковым!", "error");
    return;
  }

  let currentFillingsArray = []

  if (_type === 'shelf') {
    product.height = module.value.moduleThickness
  }

  if (_type === 'vertical_shelf') {
    product.width = module.value.moduleThickness
  }

  let depth = product.depth
  if (product.ACTUAL_DEPT && product.ACTUAL_DEPT >= module.value.depth) {
    alert("Недостаточная глубина модуля для этого товара!", "error");
    return;
  }

  if (product.SIZE_EDIT_DEPTH_MAX) {
    depth = module.value.depth;

    const moduleProductInfo = APP.CATALOG.PRODUCTS[module.value.productID]
    if (moduleProductInfo?.moduleType?.CODE === "wardrobe")
      depth -= 100;
  }

  const startFillingData = createFillingDataToCheck(product, currentModuleSegment, isVerticalItem, !!product.MIN_FASADE_SIZE);

  if (!startFillingData) {
    alert("Позиция не найдена");
    return;
  }

  if (!currentModuleSegment.fillings)
    currentModuleSegment.fillings = []
  currentFillingsArray = currentModuleSegment.fillings

  let width = startFillingData.width;
  let height = startFillingData.height;
  let profileData = {}
  if (isHiTechProfile) {
    if (!module.value.profilesConfig) {
      module.value.profilesConfig = {COLOR: product.COLOR[0] != null ? product.COLOR[0] : module.value.moduleColor}
      module.value.profilesConfig.colorsList = [...product.COLOR]
      module.value.profilesConfig.onSectionSize = false

      PROPS.CONFIG['PROFILECOLOR'] = module.value.profilesConfig.COLOR
    }

    height = product.height || module.value.moduleThickness
    if (!isBottomHiTechProfile && !APP.PRODUCTS_TYPES[product.productType]?.CODE.includes("section")) {
      width = module.value.profilesConfig.onSectionSize ? startFillingData.width : startFillingData.width + module.value.moduleThickness * 2

      if (!module.value.profilesConfig.onSectionSize) {
        width = startFillingData.width + module.value.moduleThickness * 2
        startFillingData.x -= module.value.moduleThickness
      } else {
        width = startFillingData.width
      }
    }

    profileData.COLOR = module.value.profilesConfig?.COLOR ? module.value.profilesConfig?.COLOR : module.value.moduleColor

    let typeProfile = product.NAME.toLowerCase().split("-")[0].replace(/\s/g, '')
    if (typeProfile !== "c" && typeProfile !== "l")
      typeProfile = typeProfile.split(",").pop().replace(/\s/g, '')

    profileData.TYPE_PROFILE = typeProfile
    profileData.offsetFasades = typeProfile == "c" ? 36 : typeProfile == "l" ? 38 : 0
    profileData.manufacturerOffset = typeProfile == "c" ? -18.5 : typeProfile == "l" ? -19.5 : 0

    if (isBottomHiTechProfile) {
      profileData.isBottomHiTechProfile = true
      startFillingData.y = module.value.height - module.value.horizont - height
    }

    if (!currentModuleSegment.hiTechProfiles)
      currentModuleSegment.hiTechProfiles = []

    profileData.id = currentModuleSegment.hiTechProfiles.length + 1
  }

  let fillingObject = <FillingObject>{
    isVerticalItem,
    product: product.ID,
    id: currentFillingsArray.length + 1,
    name: product.NAME,
    image: product.PREVIEW_PICTURE,
    type: _type,
    position: new THREE.Vector2(startFillingData.x, startFillingData.y),
    size: new THREE.Vector3(width, height, depth),
    width,
    height,
    color: profileData.COLOR || false,
    sec,
    cell,
    row,
    extra,
  };


  if (isHiTechProfile) {
    fillingObject.isProfile = profileData
    fillingObject.moduleThickness = module.value.moduleThickness
    currentModuleSegment.hiTechProfiles.push(fillingObject)
    currentFillingsArray.push(fillingObject);

    calcDrawersFasades(sec)
  } else
    currentFillingsArray.push(fillingObject);

  if (product.MIN_FASADE_SIZE) {
    if (!currentSection.fasadesDrawers)
      currentSection.fasadesDrawers = []

    const {PRODUCT} = PROPS
    let productInfo = APP.CATALOG.PRODUCTS[PRODUCT];

    const leftWidth = module.value.leftWallThickness || module.value.moduleThickness;
    const rightWidth = module.value.rightWallThickness || module.value.moduleThickness;

    const correctSectionFasadeWidth =
        module.value.sections.length > 1 ?
            sec > 0 && sec < module.value.sections.length - 1 ? currentSection.width + module.value.moduleThickness - 4 :
                currentSection.width + ((sec == 0 ? leftWidth : rightWidth) - 2) + (module.value.moduleThickness / 2 - 2) :
            module.value.width - 4;

    let baseFasade = module.value.sections[sec]?.fasades?.[0]?.[0] || module.value.sections[0]?.fasades?.[0]?.[0] || currentSection.fasadesDrawers?.[0]

    let manufacturerOffset = 0
    let manufacturer_name = product.EN_NAME?.toLowerCase() || product.NAME?.toLowerCase()
    if(product.FASADE_DRAWER_OFFSET){
      manufacturerOffset = product.FASADE_DRAWER_OFFSET
    }
    else
      Object.entries(MANUFACTURER).forEach(([key, offset]) => {
        if (manufacturer_name.includes(key)) {
          manufacturer_name = key
          manufacturerOffset = offset
        }
      })

    fillingObject.type = "drawer"
    fillingObject.moduleThickness = module.value.moduleThickness
    fillingObject.fasade = <DrawerFasadeObject>{
      id: currentSection.fasadesDrawers.length + 1,
      width: correctSectionFasadeWidth,
      height: product.MIN_FASADE_SIZE,
      minY: product.MIN_FASADE_SIZE,
      maxY: product.MAX_FASADE_SIZE,
      loopsSide: false,
      position: new THREE.Vector2(baseFasade.position.x, module.value.height - (startFillingData.y + startFillingData.height + manufacturerOffset)),
      material: <FasadeMaterial>{
        ...baseFasade.material,
        HANDLES: {...baseFasade.material.HANDLES}
      },
      type: "fasade",
      manufacturerOffset,
      item: fillingObject.id,
      sec,
      cell,
      row,
    }


    currentSection.fasadesDrawers.push(fillingObject.fasade);
    calcDrawersFasades(sec)
  }

  selectCell(sec, cell, row, extra, currentFillingsArray.length - 1);

  // // Обновляем рендер
  visualizationRef.value.renderGrid();
};

const deleteFilling = (secIndex, itemIndex, cellIndex = null, rowIndex = null, extraIndex = null) => {
  const sec = module.value.sections[secIndex];
  const cell = sec.cells?.[cellIndex];
  const row = cell?.cellsRows?.[rowIndex];
  const extra = row?.extras?.[extraIndex];

  const curRow = extra || row || cell || sec;
  let needFasadesUpdate = false
  let profileUpdate = false
  let curItem = curRow.fillings[itemIndex];
  curRow.fillings.forEach((filling, index) => {
    if (index > itemIndex) {
      filling.id -= 1;
      if (filling.fasade)
        filling.fasade.item = filling.id;
    }
  })

  curRow.fillings = curRow.fillings.filter((el, index) => {
    if (index === itemIndex) {
      if (el.fasade)
        needFasadesUpdate = true
      if (el.isProfile)
        profileUpdate = true
    }

    return index !== itemIndex;
  });

  if (needFasadesUpdate || profileUpdate) {
    if (sec.fasadesDrawers?.length || curRow.hiTechProfiles?.length) {

      if (sec.fasadesDrawers?.length && needFasadesUpdate) {
        sec.fasadesDrawers = sec.fasadesDrawers.filter((el, index) => {
          return el.id !== curItem.fasade.id;
        });

        sec.fasadesDrawers.forEach((el, index) => {
          if (el.id > curItem.fasade.id)
            el.id -= 1;
        })

        if (!sec.fasadesDrawers.length)
          delete sec.fasadesDrawers
      }

      if (curRow.hiTechProfiles?.length && profileUpdate) {
        curRow.hiTechProfiles = curRow.hiTechProfiles.filter((el, index) => {
          return el.isProfile.id !== curItem.isProfile.id;
        });

        curRow.hiTechProfiles.forEach((el, index) => {
          if (el.isProfile.id > curItem.isProfile.id)
            el.isProfile.id -= 1;
        })

        if (!curRow.hiTechProfiles.length)
          delete curRow.hiTechProfiles
      }

      calcDrawersFasades(secIndex)
    } else
      updateFasades()
  }

  visualizationRef.value.renderGrid();
};

const updateFasades = () => {
  emit("product-updateFasades");
}
const calcDrawersFasades = (sec, fillingData = false) => {
  emit("product-calcDrawersFasades", sec, fillingData);
}
const updateFilling = (value, filling, type, render = false) => {
  emit("product-updateFilling", value, filling, type, render);
};

const changeFillingPositionX = (event, _value, key, secIndex, cellIndex = null, rowIndex = null, extraIndex = null) => {

  let value = Math.min(+_value, +event.target.max);
  value = Math.max(+value, +event.target.min);

  selectCell(secIndex, cellIndex, rowIndex, extraIndex, key);

  const gridCopy = Object.assign({}, module.value);

  const sec = gridCopy.sections[secIndex];
  const currentColl = sec.cells?.[cellIndex];
  const currentRow = currentColl?.cellsRows?.[rowIndex];
  const currentExtra = currentRow?.extras?.[extraIndex];

  const current = currentExtra || currentRow || currentColl || sec;

  const currentfilling = current.fillings[key];

  if (currentfilling?.isProfile?.isBottomHiTechProfile) {
    alert("Г-образный профиль нельзя перемещать!");
    return;
  }

  const prevValue = currentfilling.position.x; //Предыдущее значение

  let delta = +value - currentfilling.distances.left
  const newValue = prevValue + delta

  let tmpSector = currentfilling.sector
  delete currentfilling.sector

  const fillingData = JSON.parse(JSON.stringify(currentfilling));
  fillingData.position.x = newValue;
  fillingData.sector = tmpSector;

  const pixiSector = current.sector;

  // Проверяем коллизию
  const check = props.shapeAdjuster.checkToCollision(pixiSector, false, fillingData);

  if (check) {
    currentfilling.position.x = fillingData.position.x;
  } else {
    alert(`Нельзя изменить позицию на ${+_value}`)
    currentfilling.position.x = prevValue;
  }

  currentfilling.sector = tmpSector;
  module.value = gridCopy;

  if (currentfilling.fasade)
    calcDrawersFasades(secIndex)

  visualizationRef.value.renderGrid();
};

const changeFillingPositionY = (event, _value, key, secIndex, cellIndex = null, rowIndex = null, extraIndex = null) => {
  let value = Math.min(+_value, +event.target.max);
  value = Math.max(+value, +event.target.min);

  selectCell(secIndex, cellIndex, rowIndex, extraIndex, key);

  const gridCopy = Object.assign({}, module.value);

  const sec = gridCopy.sections[secIndex];
  const currentColl = sec.cells?.[cellIndex];
  const currentRow = currentColl?.cellsRows?.[rowIndex];
  const currentExtra = currentRow?.extras?.[extraIndex];

  const current = currentExtra || currentRow || currentColl || sec;

  const currentfilling = current.fillings[key];

  if (currentfilling?.isProfile?.isBottomHiTechProfile) {
    alert("Г-образный профиль нельзя перемещать!");
    return;
  }

  const prevValue = currentfilling.position.y; //Предыдущее значение

  let delta = +value - currentfilling.distances.bottom
  const newValue = prevValue - delta


  let tmpSector = currentfilling.sector
  delete currentfilling.sector

  const fillingData = JSON.parse(JSON.stringify(currentfilling));
  fillingData.position.y = newValue;
  fillingData.sector = tmpSector;

  const pixiSector = current.sector;

  // Проверяем коллизию
  const check = props.shapeAdjuster.checkToCollision(pixiSector, false, fillingData);

  if (check) {
    currentfilling.position.y = fillingData.position.y;
  } else {
    alert(`Нельзя изменить позицию на ${+_value}`)
    currentfilling.position.y = prevValue;
  }

  currentfilling.sector = tmpSector;
  module.value = gridCopy;

  if (currentfilling.fasade)
    calcDrawersFasades(secIndex)
  else {
    checkLoopsCollision(secIndex)
  }

  visualizationRef.value.renderGrid();
};

const createFacadeData = (fasadeIndex) => {
  const productId = modelState.getCurrentModel.userData.PROPS.PRODUCT;
  const {FACADE} = modelState._PRODUCTS[productId];
  modelState.createCurrentModelFasadesData({
    data: FACADE,
    fasadeNdx: fasadeIndex,
    productId,
  });
};

const openFasadeSelector = (secIndex, cellIndex, rowIndex, itemIndex) => {
  isOpenMaterialSelector.value = false;

  /** @Создание_данных_для_выбранного_фасада */
  createFacadeData();

  if (
      currentFasadeMaterial.value &&
      (
          secIndex == currentFasadeMaterial.value.secIndex &&
          cellIndex == currentFasadeMaterial.value.cellIndex &&
          rowIndex == currentFasadeMaterial.value.rowIndex &&
          itemIndex == currentFasadeMaterial.value.itemIndex
      )
  ) {
    currentFasadeMaterial.value = false;
    return;
  }

  setTimeout(() => {
    const curSection = module.value.sections[secIndex]
    const curCell = curSection?.cells?.[cellIndex]
    const curRow = curCell?.cellsRows?.[rowIndex]

    const curModuleSegment = curRow || curCell || curSection

    let data = curModuleSegment.fillings[itemIndex].fasade.material
    currentFasadeMaterial.value = {
      secIndex,
      cellIndex,
      rowIndex,
      itemIndex,
      data,
      fasadeSize: {
        FASADE_WIDTH: curModuleSegment.fillings[itemIndex].fasade.width,
        FASADE_HEIGHT: curModuleSegment.fillings[itemIndex].fasade.height,
        isDrawer: true
      },
    }
    selectCell(secIndex, cellIndex, rowIndex, null, itemIndex)
    isOpenMaterialSelector.value = true
  }, 10)
}

const openHandleSelector = (secIndex, cellIndex, rowIndex, itemIndex) => {
  isOpenHandleSelector.value = false;
  isOpenMaterialSelector.value = false;

  if(isOpenMaterialSelector.value)
    closeMenu()

  if (
      currentHandle.value &&
      secIndex === currentHandle.value.secIndex &&
      cellIndex === currentHandle.value.cellIndex &&
      rowIndex === currentHandle.value.rowIndex &&
      itemIndex === currentHandle.value.itemIndex
  ) {
    closeMenu()
    return;
  }

  setTimeout(() => {
    const curSection = module.value.sections[secIndex]
    const curCell = curSection?.cells?.[cellIndex]
    const curRow = curCell?.cellsRows?.[rowIndex]

    const curModuleSegment = curRow || curCell || curSection
    let data = curModuleSegment.fillings[itemIndex].fasade.material

    currentHandle.value = {
      secIndex,
      cellIndex,
      rowIndex,
      itemIndex,
      data,
    };
    selectCell(secIndex, cellIndex, rowIndex, itemIndex);
    isOpenHandleSelector.value = true;
  }, 10);
};

const selectHandle = (data, type) => {
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

  let {secIndex, cellIndex, rowIndex, itemIndex} = currentFasadeMaterial.value;
  const curSection = module.value.sections[secIndex]
  const curCell = curSection?.cells?.[cellIndex]
  const curRow = curCell?.cellsRows?.[rowIndex]

  const curModuleSegment = curRow || curCell || curSection
  curModuleSegment.fillings[itemIndex].fasade.material =
      Object.assign(curModuleSegment.fillings[itemIndex].fasade.material, currentFasadeMaterial.value.data)
};

const changeDrawerFasade = (event, value, key, secIndex, cellIndex = null, rowIndex = null) => {
  selectCell(secIndex, cellIndex, rowIndex, null, key);

  const gridCopy = Object.assign({}, module.value);

  const sec = gridCopy.sections[secIndex];
  const currentColl = sec.cells?.[cellIndex];
  const currentRow = currentColl?.cellsRows?.[rowIndex] || currentColl || sec;

  const currentfilling = currentRow.fillings[key];

  if (!currentfilling?.fasade) {
    alert("У элемента нет фасада!");
    return
  }

  const prevValue = currentfilling.fasade.height; //Предыдущее значение
  const newValue = parseInt(value)

  let tmpSector = currentfilling.sector
  let tmpFasade = currentfilling.fasade

  delete currentfilling.sector
  delete currentfilling.fasade

  const fillingData = JSON.parse(JSON.stringify(currentfilling));
  fillingData.sector = tmpSector;
  fillingData.fasade = tmpFasade;
  fillingData.fasade.height = newValue;

  const pixiSector = currentRow.sector;

  // Проверяем коллизию
  const check = props.shapeAdjuster.checkToCollision(pixiSector, false, fillingData);

  currentfilling.sector = tmpSector;
  currentfilling.fasade = tmpFasade;
  if (check) {
    currentfilling.fasade.height = fillingData.fasade.height;
  } else {
    currentfilling.fasade.height = prevValue;
    toAster.error("Ошибка! Размер фасада слишком велик!")
  }

  module.value = gridCopy;

  calcDrawersFasades(secIndex)

  visualizationRef.value.renderGrid();
};

defineExpose({
  handleCellSelect,
});

onMounted(() => {
  let cellIndex = module.value.sections[0].cell?.[0] ? 0 : null
  let rowIndex = module.value.sections[0].cell?.[0]?.cellsRows?.[0] ? 0 : null

  if (visualizationRef.value)
    selectCell(0, cellIndex, rowIndex)
})

const closeMenu = () => {
  isOpenMaterialSelector.value = false;
  isOpenHandleSelector.value = false;

  currentHandle.value = false;
  currentFasadeMaterial.value = false;
};

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

      <div class="accordion" v-if="fillings">
        <div
            class="splitter-container--product-items"
            v-for="(fillingGroup, key) in fillings"
            :key="key + fillingGroup.groupName"
        >
          <details class="item-group">
            <summary>
              <h3 class="item-group__title">
                {{ fillingGroup.groupName }}
              </h3>
            </summary>

            <div class="item-group-wrapper">
              <div
                  :class="[
                          'item-group-color'
                        ]"
                  style
                  v-for="(filling, key) in fillingGroup.items"
                  :key="key + filling.NAME"
                  @click="addFilling(filling, fillingGroup.groupID)"
              >
                <div class="item-group-name">
                  <img
                      class="name__bg"
                      :src="_URL + filling.PREVIEW_PICTURE"
                      :alt="filling.NAME"
                  />
                  <p class="name__text">
                    {{ filling.NAME }}
                  </p>
                </div>
              </div>
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
          >
            <p
                class="actions-title actions-title--part"
                @click="showCurrentCol(secIndex)"
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
                        @click="deleteFilling(secIndex, fillingIndex)"
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
                            @input="debounce((event) => {
                                changeFillingPositionX(
                                    $event,
                                    $event.target.value,
                                    fillingIndex,
                                    secIndex,
                                    )
                                }, 1000)"
                        />
                        <input
                            v-else
                            type="number"
                            :step="1"
                            :max="section.height - filling.height"
                            min="0"
                            class="actions-input"
                            :value="filling.distances?.bottom"
                            @input="debounce((event) => {
                                changeFillingPositionY(
                                    $event,
                                    $event.target.value,
                                    fillingIndex,
                                    secIndex,
                                    )
                                }, 1000)"
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
                            @input="debounce((event) => {
                                changeDrawerFasade(
                                    $event,
                                    $event.target.value,
                                    fillingIndex,
                                    secIndex
                                    )
                                }, 1000)"
                        />
                      </div>
                    </div>
                  </div>

                  <ConfigurationOption
                      v-if="filling.fasade"
                      :type="filling.fasade.material.PALETTE ? 'palette' : 'surface'"
                      :data="filling.fasade.material.PALETTE ? {...APP.PALETTE[filling.fasade.material.PALETTE], hex: APP.PALETTE[filling.fasade.material.PALETTE].HTML} : APP.FASADE[filling.fasade.material.COLOR]"
                      @click="openFasadeSelector(secIndex, null, null, fillingIndex)"
                  />

                  <ConfigurationOption
                      v-if="filling.fasade"
                      :class="[
                                {
                                  active:
                                    currentHandle.secIndex ===
                                      secIndex &&
                                    currentHandle.doorIndex ===
                                      doorIndex &&
                                    currentHandle.segmentIndex ===
                                      segmentIndex,
                                },
                              ]"
                      :type="'Handles'"
                      :data="filling.fasade.material.HANDLES ? {...APP.CATALOG.PRODUCTS[filling.fasade.material.HANDLES.id]} : false"
                      @click="
                              openHandleSelector(secIndex, null, null, fillingIndex)
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
                              @click="deleteFilling(secIndex, fillingIndex, cellIndex)"
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
                                  @input="debounce((event) => {
                                changeFillingPositionX(
                                    $event,
                                    $event.target.value,
                                    fillingIndex,
                                    secIndex,
                                    cellIndex
                                    )
                                }, 1000)"
                              />
                              <input
                                  v-else
                                  type="number"
                                  :step="1"
                                  :max="cell.height - filling.height"
                                  min="0"
                                  class="actions-input"
                                  :value="filling.distances?.bottom"
                                  @input="debounce((event) => {
                                changeFillingPositionY(
                                    $event,
                                    $event.target.value,
                                    fillingIndex,
                                    secIndex,
                                    cellIndex
                                    )
                                }, 1000)"
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
                                  @input="debounce((event) => {
                                    changeDrawerFasade(
                                        $event,
                                        $event.target.value,
                                        fillingIndex,
                                        secIndex,
                                        cellIndex
                                        )
                                    }, 1000)"
                              />
                            </div>
                          </div>
                        </div>

                        <ConfigurationOption
                            v-if="filling.fasade"
                            :class="[
                                {
                                  active:
                                    currentFasadeMaterial.secIndex ===
                                      secIndex &&
                                    currentFasadeMaterial.cellIndex ===
                                      cellIndex &&
                                    currentFasadeMaterial.rowIndex ===
                                      null &&
                                    currentFasadeMaterial.fillingIndex ===
                                      fillingIndex,
                                },
                            ]"
                            :type="filling.fasade.material.PALETTE ? 'palette' : 'surface'"
                            :data="filling.fasade.material.PALETTE ? {...APP.PALETTE[filling.fasade.material.PALETTE], hex: APP.PALETTE[filling.fasade.material.PALETTE].HTML} : APP.FASADE[filling.fasade.material.COLOR]"
                            @click="openFasadeSelector(secIndex, cellIndex, null, fillingIndex)"
                        />

                        <ConfigurationOption
                            v-if="filling.fasade"
                            :class="[
                                {
                                  active:
                                    currentHandle.secIndex ===
                                      secIndex &&
                                    currentHandle.cellIndex ===
                                      cellIndex &&
                                    currentHandle.rowIndex ===
                                      null &&
                                    currentHandle.fillingIndex ===
                                      fillingIndex,
                                },
                              ]"
                            :type="'Handles'"
                            :data="filling.fasade.material.HANDLES ? {...APP.CATALOG.PRODUCTS[filling.fasade.material.HANDLES.id]} : false"
                            @click="
                              openHandleSelector(secIndex, cellIndex, null, fillingIndex)
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
                                  @click="deleteFilling(secIndex, fillingIndex, cellIndex, rowIndex)"
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
                                      @input="debounce((event) => {
                                        changeFillingPositionX(
                                            $event,
                                            $event.target.value,
                                            fillingIndex,
                                            secIndex,
                                            cellIndex,
                                            rowIndex
                                            )
                                        }, 1000)"
                                  />
                                  <input
                                      v-else
                                      type="number"
                                      :step="1"
                                      :max="row.height - filling.height"
                                      min="0"
                                      class="actions-input"
                                      :value="filling.distances?.bottom"
                                      @input="debounce((event) => {
                                changeFillingPositionY(
                                    $event,
                                    $event.target.value,
                                    fillingIndex,
                                    secIndex,
                                    cellIndex,
                                    rowIndex
                                    )
                                }, 1000)"
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
                                      @input="debounce((event) => {
                                        changeDrawerFasade(
                                            $event,
                                            $event.target.value,
                                            fillingIndex,
                                            secIndex,
                                            cellIndex,
                                            rowIndex
                                            )
                                        }, 1000)"
                                  />
                                </div>
                              </div>
                            </div>

                            <ConfigurationOption
                                v-if="filling.fasade"
                                :class="[
                                {
                                  active:
                                    currentFasadeMaterial.secIndex ===
                                      secIndex &&
                                    currentFasadeMaterial.cellIndex ===
                                      cellIndex &&
                                    currentFasadeMaterial.rowIndex ===
                                      rowIndex &&
                                    currentFasadeMaterial.fillingIndex ===
                                      fillingIndex,
                                },
                                ]"
                                :type="filling.fasade.material.PALETTE ? 'palette' : 'surface'"
                                :data="filling.fasade.material.PALETTE ? {...APP.PALETTE[filling.fasade.material.PALETTE], hex: APP.PALETTE[filling.fasade.material.PALETTE].HTML} : APP.FASADE[filling.fasade.material.COLOR]"
                                @click="openFasadeSelector(secIndex, cellIndex, rowIndex, fillingIndex)"
                            />

                            <ConfigurationOption
                                v-if="filling.fasade"
                                :class="[
                                {
                                  active:
                                    currentHandle.secIndex ===
                                      secIndex &&
                                    currentHandle.cellIndex ===
                                      cellIndex &&
                                    currentHandle.rowIndex ===
                                      rowIndex &&
                                    currentHandle.fillingIndex ===
                                      fillingIndex,
                                },
                              ]"
                                :type="'Handles'"
                                :data="filling.fasade.material.HANDLES ? {...APP.CATALOG.PRODUCTS[filling.fasade.material.HANDLES.id]} : false"
                                @click="
                              openHandleSelector(secIndex, cellIndex, rowIndex, fillingIndex)
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
                                      @click="deleteFilling(secIndex, fillingIndex, cellIndex, rowIndex, extraIndex)"
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
                                          @input="debounce((event) => {
                                        changeFillingPositionX(
                                            $event,
                                            $event.target.value,
                                            fillingIndex,
                                            secIndex,
                                            cellIndex,
                                            rowIndex,
                                            extraIndex
                                            )
                                        }, 1000)"
                                      />
                                      <input
                                          v-else
                                          type="number"
                                          :step="1"
                                          :max="extra.height - filling.height"
                                          min="0"
                                          class="actions-input"
                                          :value="filling.distances?.bottom"
                                          @input="debounce((event) => {
                                            changeFillingPositionY(
                                                $event,
                                                $event.target.value,
                                                fillingIndex,
                                                secIndex,
                                                cellIndex,
                                                rowIndex,
                                                extraIndex
                                                )
                                            }, 1000)"
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
    <div class="color-select" v-if="isOpenMaterialSelector || isOpenHandleSelector" key="color-select">
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
      />
    </div>
  </transition>
</template>

<style lang="scss" scoped>
.splitter {
  -webkit-user-select: none; /* Safari */
  -ms-user-select: none;     /* IE 10+ и Edge */
  user-select: none;         /* Стандарт: Chrome, Firefox, Opera, Edge */

  &-container {
    &--product {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      color: #a3a9b5;
      width: 19.5vw;

      &-icon {
        cursor: pointer;
      }

      &-items {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      &-data {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;

        &::-webkit-scrollbar {
          width: 5px;
          /* Ширина скроллбара */
        }

        &::-webkit-scrollbar-button {
          display: none;
          /* Убираем стрелки */
        }

        &::-webkit-scrollbar-thumb {
          background: #888;
          /* Цвет ползунка */
          border-radius: 4px;
        }
      }

      &-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      &-options {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #ecebf1;

        &--add {
          display: flex;
          gap: 5px;
          align-items: center;
        }
      }

      &-actions {
        display: flex;
        gap: 1rem;
      }

      &-position {
        display: flex;
        gap: 1rem;
        align-items: center;
      }

      .item-group {
        display: flex;
        flex-direction: column;
        color: #a3a9b5;
        margin-right: 10px;

        &-wrapper {
          overflow-y: scroll;
          max-height: 72vh;
          width: 16vw;
        }


        &__title {
          font-size: 1.8rem;
          font-weight: 600;

          -webkit-user-select: none; /* Safari */
          -ms-user-select: none;     /* IE 10+ и Edge */
          user-select: none;         /* Стандарт: Chrome, Firefox, Opera, Edge */
        }

        &-color {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px;
          margin: 10px 0;
          border-radius: 15px;
          background-color: $bg;
          cursor: pointer;

          .item-group-name {
            display: flex;
            align-items: center;
            gap: 10px;

            .name__bg {
              max-width: 60px;
              max-height: 60px;
              border-radius: 15px;
            }

            .name__text {
              font-weight: 500;
            }
          }

          @media (hover: hover) {
            /* when hover is supported */
            &:hover {
              color: white;
              background-color: #da444c;
              border: 1px solid transparent;
            }
          }
        }
      }
    }
  }
}

.no-select {
  -webkit-user-select: none; /* Safari */
  -ms-user-select: none;     /* IE 10+ и Edge */
  user-select: none;         /* Стандарт: Chrome, Firefox, Opera, Edge */
}

.actions {
  -webkit-user-select: none; /* Safari */
  -ms-user-select: none;     /* IE 10+ и Edge */
  user-select: none;         /* Стандарт: Chrome, Firefox, Opera, Edge */

  &-wrapper {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding-right: 0.5rem;
  }

  &-footer {
    display: flex;
    justify-content: space-between;
    margin-top: auto;

    &--save {
      display: flex;
      gap: 1rem;
    }
  }

  &-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    max-height: 70vh;
    overflow-y: scroll;
    padding-right: 0.5rem;

    &::-webkit-scrollbar {
      width: 5px;
      /* Ширина скроллбара */
    }

    &::-webkit-scrollbar-button {
      display: none;
      /* Убираем стрелки */
    }

    &::-webkit-scrollbar-thumb {
      background: #888;
      /* Цвет ползунка */
      border-radius: 4px;
    }
  }

  &-header {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
    width: 100%;
    padding: 1rem 0;
    border-bottom: 1px solid #ecebf1;
    border-top: 1px solid #ecebf1;

    &--container {
      display: flex;
      align-items: center;
      // gap: 0.5rem;
      padding-right: 0.5rem;
      border-right: 1px solid #ecebf1;
      border-bottom: 1px solid transparent;
      cursor: pointer;

      &.active {
        border-bottom: 1px solid #da444c;
      }
    }
  }

  &-items {
    display: flex;
    flex-wrap: wrap;
    // gap: 1rem;
    align-items: center;

    &--wrapper {
      display: flex;
      flex-direction: column;

      width: 100%;
      padding: 0 0 1rem 0;
    }

    &--container {
      display: flex;
      width: 100%;
      border-bottom: 1px solid #ecebf1;
      margin-top: 0.5rem;

      // &:first-child {
      //   padding-top: 0;
      // }

      &.active {
        background-color: #f1f1f5;
      }
    }

    &--left,
    &--right {
      width: 100%;
    }

    &--left {
      align-items: start;
      max-width: 50%;

      &-wrapper {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
        margin-left: 1rem;
        // max-width: calc(50% - 1rem);
      }
    }

    &--right {
      max-width: calc(50%);
      margin-left: 3rem;

      &-items {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
      }
    }

    &--height,
    &--diametr,
    &--width {
      display: flex;
      width: fit-content;

      &-item {
        display: flex;
        align-items: flex-start;
        height: fit-content;
        // gap: 0.5rem;
      }
    }

    &--title {
      display: flex;
      align-items: center;
      align-self: end;
      margin-bottom: 0.5rem;

      -webkit-user-select: none; /* Safari */
      -ms-user-select: none;     /* IE 10+ и Edge */
      user-select: none;         /* Стандарт: Chrome, Firefox, Opera, Edge */
    }
  }

  &-title {
    font-size: 1rem;
    color: #a3a9b5;

    -webkit-user-select: none; /* Safari */
    -ms-user-select: none;     /* IE 10+ и Edge */
    user-select: none;         /* Стандарт: Chrome, Firefox, Opera, Edge */
  }

  &-inputs {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
    max-width: 100px;
  }

  &-input {
    padding: 0.5rem 1rem;
    width: 100%;
    max-width: 125px;
    border: none;
    border-radius: 15px;
    background-color: #ecebf1;
    color: #6d6e73;
    font-size: 1rem;
    font-weight: 600;

    &:focus {
      outline: none;
    }

    &--container {
      position: relative;

      &::before {
        content: "mm";
        display: block;
        position: absolute;
        top: 50%;
        left: 60px;
        transform: translate(0, -50%);
        pointer-events: none;
        z-index: 0;
        font-size: 0.75rem;
        font-weight: 600;
        color: #6d6e73;
      }
    }
  }

  &-btn {
    padding: 0.5rem 1rem;
    border: 1px solid #ecebf1;
    border-radius: 15px;
    background-color: #ffffff;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: bold;
    color: #a3a9b5;
    outline: none;

    &--default,
    &--footer {
      transition-property: background-color, color, border;
      transition-timing-function: ease;
      transition-duration: 0.25s;
      @media (hover: hover) {
        /* when hover is supported */
        &:hover {
          color: white;
          background-color: #da444c;
          border: 1px solid transparent;
        }
      }

      &.active {
        border-color: #da444c;
      }

    }

    &--footer {
      background-color: #ecebf1;
    }

    &:focus {
      outline: none;
    }

    &.acthnive {
      border-color: #da444c;
      color: #181818;
      transition-property: background-color, color, border;
      transition-timing-function: ease;
      transition-duration: 0.25s;

      @media (hover: hover) {
        /* when hover is supported */
        &:hover {
          color: white;
          background-color: #da444c;
        }
      }
    }
  }

  &-icon {
    border: none;
    background-color: transparent;
    padding: 0 5px;

    &--delite,
    &--close,
    &--help {
      width: 18px;
      height: 18px;
    }

    &--add {
      width: 12px;
      height: 12px;
    }

    &--delite {
      &-center {
        margin-bottom: 0.5rem;
      }
    }

    &--bottom {
      align-self: flex-end;
      padding: 5px;
    }

    &--position {
      width: 25px;
      height: 25px;
    }
  }
}

.work-mode-selector {
  display: flex;
  flex-direction: row;
  gap: 1rem;
}

.accordion {
  -webkit-user-select: none; /* Safari */
  -ms-user-select: none;     /* IE 10+ и Edge */
  user-select: none ;         /* Стандарт: Chrome, Firefox, Opera, Edge */

  border: unset;
  overflow-y: scroll;
  max-height: 85vh;

  details {
    position: relative;
    margin: 16px 0;
    padding: 15px 50px 15px 15px;
    border: 1px solid #a3a9b5;
    border-radius: 15px;
    @media (hover: hover) {
      /* when hover is supported */
      &:hover {
        border-color: #da444c;
      }
    }
  }

  details summary {
    font-weight: bold;
    list-style: none;
    cursor: pointer;

  }

  details[open] {
    border-color: #da444c;
  }

  details summary::-webkit-details-marker {
    display: none;
  }

  details summary::before {
    content: "\276F";
    position: absolute;
    right: 1rem;
    top: 1rem;
    display: inline-block;
    transform: rotate(90deg);
    transition: transform 0.2s ease-in-out;
  }

  details[open] summary::before {
    transform: rotate(-90deg);
  }
}

.width {
  &-max {
    max-width: 100% !important;
  }
}

.color {
  &-select {
    position: fixed;
    right: 20.8vw;
    top: 0;
    width: 100%;
    max-width: 373px;
    height: 95vh;
    display: flex;
    flex-direction: column;
    gap: 15px;
    padding: 15px;
    background: rgba($white, 1);
    box-shadow: 0px 0px 10px 0px #3030301a;
    z-index: 0;
    border-radius: 15px;

    &__container {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }

    &-item {
      width: 100%;
      display: flex;
      align-items: center;
      padding: 10px;
      background-color: $bg;
      border-radius: 15px;
      gap: 10px;

      &__title {
        font-size: 15px;
        font-weight: 500;

        -webkit-user-select: none; /* Safari */
        -ms-user-select: none;     /* IE 10+ и Edge */
        user-select: none;         /* Стандарт: Chrome, Firefox, Opera, Edge */
      }
    }
  }
}

</style>
