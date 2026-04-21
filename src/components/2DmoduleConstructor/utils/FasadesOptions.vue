<script setup lang="ts">
// @ts-nocheck

import { defineExpose, onMounted, ref, toRefs } from "vue";
import {
  FasadeMaterial,
  FasadeObject,
  LOOPSIDE,
} from "@/types/constructor2d/interfaсes.ts";
import * as THREE from "three";
import { _URL } from "@/types/constants.ts";
import { useAppData } from "@/store/appliction/useAppData.ts";
import { useModelState } from "@/store/appliction/useModelState";
import AdvanceCorpusMaterialRedactor from "@/components/ui/color/AdvanceCorpusMaterialRedactor.vue";
import CorpusMaterialRedactor from "@/components/right-menu/customiser-pages/ColorRightPage/CorpusMaterialRedactor.vue";
import MaterialRedactor from "@/components/right-menu/customiser-pages/ColorRightPage/MaterialRedactor.vue";
import ConfigurationOption from "@/components/right-menu/customiser-pages/ColorRightPage/ConfigurationOption.vue";
import {UniversalGeometryBuilder} from "@/Application/Meshes/UniversalModuleUtils/UniversalGeometryBuilder.ts";
import ClosePopUpButton from "@/components/ui/svg/ClosePopUpButton.vue";
import {TFasadeTrueSizes} from "@/types/types.ts";
import {useConversationActions} from "@/components/right-menu/actions/useConversationActions.ts";
import Handles from "@/components/right-menu/customiser-pages/FigureRightPage/Handles/Handles.vue";
import { useFigureRightPage, IFigureItems} from "@/components/right-menu/customiser-pages/FigureRightPage/useFigureRightPage.ts";

const props = defineProps({
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
  moduleProps: {
    type: [ref, Object],
    required: true,
  },
});

const {
  checkFasadeConversations,
} = useConversationActions();

const {createSurfaceList } =
    useFigureRightPage();

const { module, visualizationRef } = toRefs(props);
const selectedFasade = ref({ sec: 0, cell: null, row: null });
const APP = useAppData().getAppData;
const modelState = useModelState();

const isOpenMaterialSelector = ref<boolean>(false);
const currentFasadeMaterial = ref<Object | boolean>(false);
const currentFasadeSize = ref<TFasadeTrueSizes | boolean>(false);

const isOpenHandleSelector = ref<boolean>(false);
const currentHandle = ref<Object | boolean>(false);

const builder = new UniversalGeometryBuilder({}).buildProduct;

const emit = defineEmits([
  "product-selectCell",
  "product-updateFasades",
  "product-getFasadePositionMinMax",
  "product-calcDrawersFasades",
  "product-calcLoops",
  "product-calcSlideDoor",
  "product-checkLoopsCollision",
]);

const timer = ref(false);

const debounce = (callback, wait) => {
  if (timer.value) {
    clearTimeout(timer.value);
  }

  timer.value = setTimeout(() => {
    callback();
    timer.value = false;
  }, wait);
};

const selectCell = (sec, cell = null, row = null) => {
  selectedFasade.value = { sec, cell, row };
  visualizationRef.value.selectCell("fasades", sec, cell, true, row);
};

const handleCellSelect = (secIndex, cellIndex = null, rowIndex = null) => {
  selectedFasade.value = { sec: secIndex, cell: cellIndex, row: rowIndex };

  //Задержка нужна для того, чтоб рендер аккордионов обновился
  setTimeout(() => {
    let idTag = `fasade_${secIndex}`

    if(cellIndex !== null)
      idTag += `_${cellIndex}`;

    if(rowIndex !== null)
      idTag += `_${rowIndex}`

    let domElem = document.getElementById(idTag)
    if(domElem) {
      domElem.scrollIntoView();
    }
    timer.value = false
  }, 10)

};

const updateFasades = () => {
  emit("product-updateFasades");
};

const calcSlideDoor = (positionId, doorIndex, callback) => {
  emit("product-calcSlideDoor", positionId, doorIndex, callback);
};

const calcLoops = (secIndex) => {
  emit("product-calcLoops", secIndex);
};

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

const calcDrawersFasades = (secIndex) => {
  emit("product-calcDrawersFasades", secIndex);
};

const showCurrentCol = (secIndex, cellIndex = null) => {
  selectCell(secIndex, cellIndex);
};

const getFasadePositionMinMax = (fasade) => {
  return emit("product-getFasadePositionMinMax", fasade);
};

const getFasadePosition = (position) => {
  let fasadePosition = APP.FASADE_POSITION[position];

  fasadePosition = builder.getExec(
      builder.expressionsReplace(fasadePosition,
          Object.assign(props.moduleProps.CONFIG.EXPRESSIONS,
              {
                "#X#": module.value.width,
                "#Y#": module.value.height - (module.value.isRestrictedModule ? 0 : module.value.horizont),
                "#Z#": module.value.depth,
              }))
  )

  return fasadePosition;
};

const addSlideDoor = (doorIndex) => {
  const fasades = module.value.fasades;

  let newDoor;
  switch (doorIndex) {
    case 4:
      fasades[doorIndex - 2].forEach(
        (item) => (item.material.POSITION = fasades[1][0].material.POSITION)
      );
      newDoor = fasades[0][0];
      break;
    default:
      if (doorIndex % 2 === 0) newDoor = fasades[1][0];
      else newDoor = fasades[0][0];
      break;
  }

  let newFasade = <FasadeObject>{
    ...newDoor,
    id: doorIndex,
    material: <FasadeMaterial>{ ...newDoor.material, HANDLES: {...newDoor.material.HANDLES} },
  };

  fasades.push([newFasade]);

  const callback = (fasadePosition) => {
    newFasade.width = fasadePosition.FASADE_WIDTH;
    newFasade.height = fasadePosition.FASADE_HEIGHT;
    newFasade.position = new THREE.Vector3(
      fasadePosition.POSITION_X,
      fasadePosition.POSITION_Y,
      fasadePosition.POSITION_Z
    );

    let checkConversation = checkFasadeConversations(
        newFasade.material.COLOR,
        <TFasadeTrueSizes>{FASADE_WIDTH: newFasade.width, FASADE_HEIGHT: newFasade.height}
    );
    if (!checkConversation || newFasade.width < newFasade.minX || newFasade.height < newFasade.minY)
      newFasade.error = true;
    else delete newFasade.error;

    //Пересчитываем параметры старых дверей
    fasades.forEach((door, index) => {
      if (index + 1 !== doorIndex) {
        calcSlideDoor(
          door[0].material.POSITION,
          index + 1,
          (tmp_fasadePosition) => {
            door.forEach((segment, segmentIndex) => {
              segment.width = tmp_fasadePosition.FASADE_WIDTH;
              segment.position.x = tmp_fasadePosition.POSITION_X;
              segment.position.z = tmp_fasadePosition.POSITION_Z;

              checkConversation = checkFasadeConversations(
                  segment.material.COLOR,
                  <TFasadeTrueSizes>{FASADE_WIDTH: segment.width, FASADE_HEIGHT: segment.height}
              );
              if (!checkConversation || segment.width < segment.minX || segment.height < segment.minY)
                segment.error = true;
              else delete segment.error;
            });
          }
        );
      }
    });

    // Обновляем рендер
    visualizationRef.value.renderGrid();
  };

  calcSlideDoor(newDoor.material.POSITION, doorIndex, callback);
};

const deleteSlideDoor = (doorIndex) => {
  const fasades = module.value.fasades;

  if (doorIndex === 4)
    fasades[doorIndex - 2].forEach(
      (item) => (item.material.POSITION = fasades[0][0].material.POSITION)
    );

  fasades.pop();

  //Пересчитываем параметры старых дверей
  fasades.forEach((door, index) => {
    calcSlideDoor(
      door[0].material.POSITION,
      index + 1,
      (tmp_fasadePosition) => {
        door.forEach((segment, segmentIndex) => {
          segment.width = tmp_fasadePosition.FASADE_WIDTH;
          segment.position.x = tmp_fasadePosition.POSITION_X;
          segment.position.z = tmp_fasadePosition.POSITION_Z;

          let checkConversation = checkFasadeConversations(
              segment.material.COLOR,
              <TFasadeTrueSizes>{FASADE_WIDTH: segment.width, FASADE_HEIGHT: segment.height}
          );

          if (!checkConversation || segment.width < segment.minX || segment.height < segment.minY)
            segment.error = true;
          else delete segment.error;
        });
      }
    );
  });

  selectedFasade.value.cell = 0;
  selectedFasade.value.sec = null;

  visualizationRef.value.renderGrid();
};

const addDoor = (secIndex) => {
  const section = module.value.sections[secIndex];
  const leftWidth = module.value.leftWallThickness || module.value.moduleThickness;
  const rightWidth = module.value.rightWallThickness || module.value.moduleThickness;

  const width = section.fasades[0]?.[0] ? Math.floor(section.fasades[0][0].width / 2 - 2) :
      module.value.sections.length === 1 ? module.value.width - 4 :
       (secIndex > 0 && secIndex < module.value.sections.length - 1) ? section.width + module.value.moduleThickness - 4 :
        section.width + ((secIndex == 0 ? leftWidth : rightWidth) - 2) + (module.value.moduleThickness / 2 - 2);

  let firstFasade, newDoorPosition;
  if (section.fasades[0]?.length) {
    section.fasades[0].map((item) => {
      item.width = width;
    });

    firstFasade = section.fasades[0][0];
    newDoorPosition = new THREE.Vector2(
      firstFasade.position.x + width + 4,
      firstFasade.position.y
    );
  } else {
    const PROPS = props.moduleProps;

    const FASADE_PROPS = PROPS.CONFIG.FASADE_PROPS[0];
    const FASADE = getFasadePosition(FASADE_PROPS.POSITION);

    let startX = secIndex > 0 ? section.position.x - section.width / 2 - module.value.moduleThickness / 2 + 2 : FASADE.POSITION_X;

    newDoorPosition = new THREE.Vector2(startX, module.value.isRestrictedModule ? FASADE.POSITION_Y : module.value.horizont + 2);
    firstFasade = <FasadeObject>{
      id: 1,
      width,
      height: module.value.height - module.value.horizont - 4,
      position: newDoorPosition,
      type: "fasade",
      material: <FasadeMaterial>{
        ...FASADE_PROPS,
        HANDLES: {...FASADE_PROPS.HANDLES},
      },
    };
    let fasadeMinMax = getFasadePositionMinMax(firstFasade);
    firstFasade = Object.assign(firstFasade, fasadeMinMax);
  }

  let checkConversation = checkFasadeConversations(
      firstFasade.material.COLOR,
      <TFasadeTrueSizes>{FASADE_WIDTH: firstFasade.width, FASADE_HEIGHT: firstFasade.height}
  );
  if (!checkConversation || width < firstFasade.minX)
    firstFasade.error = true;
  else delete firstFasade.error;

  // Создаем новую колонку с такими же параметрами
  const newDoor: FasadeObject = {
    ...firstFasade,
    position: newDoorPosition,
    material: {...firstFasade.material, HANDLES: {...firstFasade.material.HANDLES}},
  };

  let fasPos = getFasadePosition(newDoor.material.POSITION);
  newDoor.height = fasPos.FASADE_HEIGHT //module.value.height - module.value.horizont - 4; //TODO: костыль из-за прописанной в БД позиции фасада
  //newDoor.position.y = fasPos.POSITION_Y

  let loopsidesList = getLoopsideList(secIndex, section.fasades.length);
  let tmp_list = loopsidesList.filter(item => item.ID !== LOOPSIDE['none'])

  if(!module.value.isRestrictedModule) {
    if (!tmp_list.length) {
      alert("Нельзя добавить дверь");
      return;
    }
  }

  newDoor.loopsSide = tmp_list.pop().ID;

  if(!section.loopsSides)
    section.loopsSides = {}

  section.loopsSides[section.fasades.length] = newDoor.loopsSide;


  section.fasades.push([newDoor]);

  if (section.fasadesDrawers?.length || section.hiTechProfiles?.length) {
    calcDrawersFasades(secIndex)
  }

  if (!module.value.isSlidingDoors)
    calcLoops(secIndex);

  // Обновляем рендер
  visualizationRef.value.renderGrid();
};

const splitFasade = (secIndex, doorIndex = 0, segmentIndex = 0) => {
  selectedFasade.value.sec = secIndex;
  selectedFasade.value.cell = doorIndex;
  selectedFasade.value.row = segmentIndex;

  visualizationRef.value.selectCell(
    "fasades",
    secIndex,
    doorIndex,
    true,
    segmentIndex
  );

  let fasades =
    secIndex === null
      ? module.value.fasades
      : module.value.sections[secIndex].fasades;
  let segment = fasades[doorIndex][segmentIndex];
  const halfHeight = Math.floor(
    (segment.height - (module.value.isSlidingDoors ? 0 : 4)) / 2
  );
  // Обновляем высоту последней строки

  let checkConversation = checkFasadeConversations(
      segment.material.COLOR,
      <TFasadeTrueSizes>{FASADE_WIDTH: segment.width, FASADE_HEIGHT: segment.height}
  );
  if (!checkConversation || halfHeight < segment.minY || segment.width < segment.minX)
    segment.error = true;
  else delete segment.error;

  let delta =
    segment.height - halfHeight * 2 - (module.value.isSlidingDoors ? 0 : 4);

  segment.height = halfHeight;

  // Добавляем новую строку в эту колонку
  let newFasade = <FasadeObject> {
    ...segment,
    position: module.value.isSlidingDoors
        ? new THREE.Vector3(
            segment.position.x,
            segment.position.y + segment.height + delta,
            segment.position.z
        )
        : new THREE.Vector2(
            segment.position.x,
            segment.position.y + 4 + segment.height + delta
        ),
    material: {...segment.material,  HANDLES: {...segment.material.HANDLES}},
  };

  fasades[doorIndex].splice(segmentIndex + 1, 0, newFasade);
  segment.height += delta;

  for (let i = 0; i < fasades[doorIndex].length; i++) {
    if (i > segmentIndex) fasades[doorIndex][i].id += 1;
  }

  if (!module.value.isSlidingDoors) calcLoops(secIndex);

  // Обновляем рендер
  visualizationRef.value.renderGrid();
};

const deleteDoor = (secIndex, doorIndex) => {
  const current = module.value.sections[secIndex].fasades[doorIndex];
  let prev = module.value.sections[secIndex].fasades[doorIndex - 1];
  let next = module.value.sections[secIndex].fasades[doorIndex + 1];

  if(!next?.length){
    next = false
  }
  if(!prev?.length){
    prev = false
  }

  const combinedWidth = next
    ? current[0].width + next[0].width + 4
    : prev ? current[0].width + prev[0].width + 4 : 0;

  if (!combinedWidth) {
    module.value.sections[secIndex].fasades = [];
    module.value.sections[secIndex].loops = [];
    module.value.sections[secIndex].loopsSides = {};
  }
  else {
    if (next) {
      current.forEach((segment, index) => {
        segment.width = combinedWidth;

        let checkConversation = checkFasadeConversations(
            segment.material.COLOR,
            <TFasadeTrueSizes>{FASADE_WIDTH: segment.width, FASADE_HEIGHT: segment.height}
        );
        if (!checkConversation || segment.width < segment.minX || segment.height < segment.minY)
          segment.error = true;
        else delete segment.error;
      });
    } else {
      prev.forEach((segment, index) => {
        segment.width = combinedWidth;

        let checkConversation = checkFasadeConversations(
            segment.material.COLOR,
            <TFasadeTrueSizes>{FASADE_WIDTH: segment.width, FASADE_HEIGHT: segment.height}
        );
        if (!checkConversation || segment.width < segment.minX || segment.height < segment.minY)
          segment.error = true;
        else delete segment.error;
      });
    }

    if (next) {
      module.value.sections[secIndex].fasades.splice(doorIndex + 1, 1);
      module.value.sections[secIndex].loops.splice(doorIndex + 1, 1);
      delete module.value.sections[secIndex].loopsSides[doorIndex + 1];
    } else {
      module.value.sections[secIndex].fasades.splice(doorIndex, 1);
      module.value.sections[secIndex].loops.splice(doorIndex, 1);
      delete module.value.sections[secIndex].loopsSides[doorIndex];
    }

    if (!module.value.isSlidingDoors)
      calcLoops(secIndex);
  }

  selectedFasade.value.cell = 0;
  selectedFasade.value.sec = 0;

  visualizationRef.value.renderGrid();
};

const checkRemoveFasadeSegment = (secIndex, doorIndex, segmentIndex) => {
  const fasades =
      secIndex === null ? module.value.fasades : module.value.sections[secIndex].fasades;
  const currentSection = fasades[doorIndex];
  const currentSegment = currentSection[segmentIndex];

  let next = currentSection[segmentIndex + 1];
  if (next) {
    let segmentsDistants = next.position.y - (currentSegment.position.y + currentSegment.height);
    if(segmentsDistants > 4)
      next = undefined;
  }

  let prev = currentSection[segmentIndex - 1];
  if (prev) {
    let segmentsDistants = currentSegment.position.y - (prev.position.y + prev.height);
    if(segmentsDistants > 4)
      prev = undefined;
  }

  return !!(next || prev);
}

const removeFasadeSegment = (secIndex, doorIndex, segmentIndex) => {
  const clone = Object.assign({}, module.value);
  const fasades =
    secIndex === null ? clone.fasades : clone.sections[secIndex].fasades;
  const currentSection = fasades[doorIndex];
  const currentSegment = currentSection[segmentIndex];

  let next = currentSection[segmentIndex + 1];
  if (next) {
    let segmentsDistants = next.position.y - (currentSegment.position.y + currentSegment.height);
    if(segmentsDistants > 4)
      next = undefined;
  }

  let prev = currentSection[segmentIndex - 1];
  if (prev) {
    let segmentsDistants = currentSegment.position.y - (prev.position.y + prev.height);
    if(segmentsDistants > 4)
      prev = undefined;
  }

  const combinedHeight = next
    ? currentSegment.height +
      next.height +
      (module.value.isSlidingDoors ? 0 : 4)
    : currentSegment.height +
      prev.height +
      (module.value.isSlidingDoors ? 0 : 4);

  next ? (next.height = combinedHeight) : (prev.height = combinedHeight);

  let tmpSegment = next || prev;
  let checkConversation = checkFasadeConversations(
      tmpSegment.material.COLOR,
      <TFasadeTrueSizes>{FASADE_WIDTH: tmpSegment.width, FASADE_HEIGHT: tmpSegment.height}
  );

  if (!checkConversation || tmpSegment.width < tmpSegment.minX || tmpSegment.height < tmpSegment.minY)
    tmpSegment.error = true;
  else delete tmpSegment.error;

  next
    ? (next.position.y = currentSegment.position.y)
    : (prev.position.y = prev.position.y);

  for (let i = 0; i < fasades[doorIndex].length; i++) {
    if (i > segmentIndex) fasades[doorIndex][i].id -= 1;
  }

  if (currentSection.length > 1) {
    currentSection.splice(segmentIndex, 1);
  }

  module.value = clone;

  // Обновляем текущий сектор
  selectedFasade.value.row = 0;
  selectedFasade.value.cell = 0;
  selectedFasade.value.sec = secIndex;

  if (!module.value.isSlidingDoors) calcLoops(secIndex);

  visualizationRef.value.renderGrid();
};

const updateFasadeHeight = (value, secIndex, doorIndex, segmentIndex) => {
  const newValue = parseInt(value);
  let adjustedValue;
  // Обновляем выбранную секцию для визуального отображения
  selectedFasade.value = { sec: secIndex, cell: doorIndex, row: segmentIndex };
  visualizationRef.value.selectCell(
    "fasades",
    secIndex,
    doorIndex,
    segmentIndex
  );

  if (!isNaN(newValue) && visualizationRef.value) {
    adjustedValue = visualizationRef.value.adjustSizeFromExternal({
      dimension: "height",
      value: newValue,
      sec: secIndex,
      cell: doorIndex,
      row: segmentIndex,
      type: "fasades",
    });
  }
  // Обновляем значение в module для синхронизации
  const clone = Object.assign({}, module.value);
  if (adjustedValue) {
    let curCell = clone.sections[secIndex].fasades[doorIndex][segmentIndex];
    let prevCell =
      clone.sections[secIndex].fasades[doorIndex][segmentIndex - 1];
    let nextCell =
      clone.sections[secIndex].fasades[doorIndex][segmentIndex + 1];

    if (nextCell) {
      let segmentsDistants = nextCell.position.y - (curCell.position.y + curCell.height);
      if(segmentsDistants > 4)
        nextCell = undefined;
    }

    if (prevCell) {
      let segmentsDistants = curCell.position.y - (prevCell.position.y + prevCell.height);
      if(segmentsDistants > 4)
        prevCell = undefined;
    }

    let delta = curCell.height - adjustedValue;

    curCell.height = adjustedValue;

    let checkConversation = checkFasadeConversations(
        curCell.material.COLOR,
        <TFasadeTrueSizes>{FASADE_WIDTH: curCell.width, FASADE_HEIGHT: curCell.height}
    );

    if (!checkConversation || curCell.width < curCell.minX || curCell.height < curCell.minY)
      curCell.error = true;
    else delete curCell.error;

    if (prevCell) {
      prevCell.height += delta;
      curCell.position.y += delta;
    } else if (nextCell) {
      nextCell.height += delta;
      nextCell.position.y += -delta;
    }

    let tmpSegment = prevCell || nextCell || {};
    checkConversation = checkFasadeConversations(
        tmpSegment.material.COLOR,
        <TFasadeTrueSizes>{FASADE_WIDTH: tmpSegment.width, FASADE_HEIGHT: tmpSegment.height}
    );
    if (
        !checkConversation ||
        tmpSegment.width < tmpSegment.minX ||
      tmpSegment.height < tmpSegment.minY
    )
      tmpSegment.error = true;
    else delete tmpSegment.error;
  }
  module.value = clone;

  if (!module.value.isSlidingDoors) calcLoops(secIndex);

  visualizationRef.value.renderGrid();
};

const changeLoopside = (secIndex, fasade, newSide, doorIndex) => {
  fasade.loopsSide = parseInt(newSide);
  module.value.sections[secIndex].loopsSides[doorIndex] = fasade.loopsSide;
  module.value.sections[secIndex].fasades[doorIndex].forEach(
    (item) => (item.loopsSide = fasade.loopsSide)
  );

  calcLoops(secIndex)

  if(module.value.profilesConfig?.sideProfile)
    changeProfileSide(LOOPSIDE[fasade.loopsSide]?.includes("left") ? "left" : "right")

  visualizationRef.value.renderGrid();
};

const changeProfileSide = (side: String) => {
  const profileSidesMap = {
    "right": new THREE.Vector2( -module.value.profilesConfig.sideProfile.manufacturerOffset - module.value.profilesConfig.sideProfile.size.y / 2, 0),
    "left": new THREE.Vector2( module.value.width + module.value.profilesConfig.sideProfile.manufacturerOffset + module.value.profilesConfig.sideProfile.size.y / 2, 0),
  }
  const profileRotationMap = {
    "right": Math.PI / 2,
    "left": -Math.PI / 2,
  }

  module.value.profilesConfig.sideProfile.position = profileSidesMap[side]
  module.value.profilesConfig.sideProfile.rotation = new THREE.Vector3(0, 0, profileRotationMap[side]);

  module.value.profilesConfig.sideProfile.side = side;
};

const getLoopsideList = (secIndex, doorIndex) => {
  const productInfo = APP.CATALOG.PRODUCTS[module.value.productID];

  let list = [];
  let tmp = {};

  if(module.value.isRestrictedModule){
    tmp[LOOPSIDE["left"]] = APP.LOOPSIDE[LOOPSIDE["left"]];
    tmp[LOOPSIDE["right"]] = APP.LOOPSIDE[LOOPSIDE["right"]];
  }
  else {
    productInfo.LOOPSIDE.forEach((type) => {
      if (APP.LOOPSIDE[type] != undefined) {
        tmp[type] = APP.LOOPSIDE[type];
      }
    });
  }

  const currSection = module.value.sections[secIndex];
  const sectionLeft = module.value.sections[secIndex - 1] || false;
  const sectionRight = module.value.sections[secIndex + 1] || false;

  const currSectionLoops = currSection.loopsSides || {};

  switch (doorIndex) {
    case 0:
      if (module.value.sections[secIndex].fasades[1]) {
        delete tmp[LOOPSIDE["right"]];
      }

      if (sectionLeft) {
        const sectionLeftLoops = sectionLeft.loopsSides || {};

        if(!module.value.isRestrictedModule) {
          if (
              sectionLeftLoops[1] ||
              [LOOPSIDE["right"], LOOPSIDE["right_on_partition"]].includes(
                  sectionLeftLoops[0]
              )
          )
          {
            delete tmp[LOOPSIDE["left_on_partition"]];
          }
          else {
            tmp[LOOPSIDE["left_on_partition"]] =
                APP.LOOPSIDE[LOOPSIDE["left_on_partition"]];
          }
        }

        delete tmp[LOOPSIDE["left"]];
      }

      if (sectionRight) {
        const sectionRightLoops = sectionRight.loopsSides || {};

        if(!module.value.isRestrictedModule) {
          if (
              sectionRightLoops[1] ||
              [LOOPSIDE["left"], LOOPSIDE["left_on_partition"]].includes(
                  sectionRightLoops[0]
              )
          ) {
            delete tmp[LOOPSIDE["right_on_partition"]];
          } else {
            tmp[LOOPSIDE["right_on_partition"]] =
                APP.LOOPSIDE[LOOPSIDE["right_on_partition"]];
          }
        }

        delete tmp[LOOPSIDE["right"]];
      }

      break;
    case 1:
      if (sectionLeft) {
        const sectionLeftLoops = sectionLeft.loopsSides || {};

        if(!module.value.isRestrictedModule) {
          if (
              sectionLeftLoops[1] ||
              [LOOPSIDE["right"], LOOPSIDE["right_on_partition"]].includes(
                  sectionLeftLoops[0]
              )
          ) {
            delete tmp[LOOPSIDE["left_on_partition"]];
          } else {
            tmp[LOOPSIDE["left_on_partition"]] =
                APP.LOOPSIDE[LOOPSIDE["left_on_partition"]];
          }
        }

        delete tmp[LOOPSIDE["left"]];
      }

      if (sectionRight) {
        const sectionRightLoops = sectionRight.loopsSides || {};

        if(!module.value.isRestrictedModule) {
          if (
              sectionRightLoops[1] ||
              [LOOPSIDE["left"], LOOPSIDE["left_on_partition"]].includes(
                  sectionRightLoops[0]
              )
          ) {
            delete tmp[LOOPSIDE["right_on_partition"]];
          } else {
            tmp[LOOPSIDE["right_on_partition"]] =
                APP.LOOPSIDE[LOOPSIDE["right_on_partition"]];
          }
        }

        delete tmp[LOOPSIDE["right"]];
      }

      //delete tmp[LOOPSIDE["left"]]
      delete tmp[currSectionLoops[0]];

      break;
  }

  list = Object.values(tmp);
  return list;
};

const checkAddDoor = (secIndex, doorIndex) => {
  if(module.value.isRestrictedModule) {
    let moduleFasadesCount = 0;
    module.value.sections.forEach(section => {
      moduleFasadesCount += section.fasades.length
    })

    return (module.value.sections.length > 1 && module.value.sections[secIndex].fasades.length < 1) || (module.value.sections.length === 1 && module.value.sections[secIndex].fasades.length < 2);
  }
  else {
    let loopsSidesList = getLoopsideList(secIndex, doorIndex);
    let tmp_list = loopsSidesList.filter(item => item.ID !== LOOPSIDE['none'])

    const currSection = module.value.sections[secIndex];

    if (currSection.loopsSides?.[doorIndex])
      tmp_list = tmp_list.filter(
          (item) => item.ID !== currSection.loopsSides[doorIndex]
      );

    return tmp_list.length > 0;
  }
};

const openFasadeSelector = (secIndex, doorIndex, segmentIndex) => {
  isOpenMaterialSelector.value = false;

  if(isOpenHandleSelector.value)
    closeMenu()

  /** @Создание_данных_для_выбранного_фасада */
  createFacadeData(segmentIndex);

  if (
    currentFasadeMaterial.value &&
    secIndex === currentFasadeMaterial.value.secIndex &&
    doorIndex === currentFasadeMaterial.value.doorIndex &&
    segmentIndex === currentFasadeMaterial.value.segmentIndex
  ) {
    closeMenu()
    return;
  }

  setTimeout(() => {
    let data =
      secIndex === null
        ? module.value.fasades[doorIndex][segmentIndex]
        : module.value.sections[secIndex].fasades[doorIndex][segmentIndex];
    currentFasadeMaterial.value = {
      secIndex,
      doorIndex,
      segmentIndex,
      data: data.material,
    };
    currentFasadeSize.value = <TFasadeTrueSizes>{FASADE_WIDTH: data.width, FASADE_HEIGHT: data.height}
    selectCell(secIndex, doorIndex, segmentIndex);
    isOpenMaterialSelector.value = true;
  }, 10);
};

const openHandleSelector = (secIndex, doorIndex, segmentIndex) => {
  isOpenHandleSelector.value = false;
  isOpenMaterialSelector.value = false;

  if(isOpenMaterialSelector.value)
    closeMenu()

  if (
      currentHandle.value &&
      secIndex === currentHandle.value.secIndex &&
      doorIndex === currentHandle.value.doorIndex &&
      segmentIndex === currentHandle.value.segmentIndex
  ) {
    closeMenu()
    return;
  }

  setTimeout(() => {
    let data =
        secIndex === null
            ? module.value.fasades[doorIndex][segmentIndex]
            : module.value.sections[secIndex].fasades[doorIndex][segmentIndex];
    currentHandle.value = {
      secIndex,
      doorIndex,
      segmentIndex,
      data: data.material,
    };
    selectCell(secIndex, doorIndex, segmentIndex);
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
  visualizationRef.value.renderGrid();
}

const selectOption = (value: Object, type: string, palette: Object = false) => {
  currentFasadeMaterial.value.data[type] = value ? value.ID || value : null;
  if (palette) currentFasadeMaterial.value.data["PALETTE"] = palette;

  let { secIndex, doorIndex, segmentIndex } = currentFasadeMaterial.value;
  if (secIndex === null) {
    module.value.fasades[doorIndex][segmentIndex].material = Object.assign(
      module.value.fasades[doorIndex][segmentIndex].material,
      currentFasadeMaterial.value.data
    );
  } else {
    module.value.sections[secIndex].fasades[doorIndex][segmentIndex].material =
      Object.assign(
        module.value.sections[secIndex].fasades[doorIndex][segmentIndex]
          .material,
        currentFasadeMaterial.value.data
      );
  }
};

const createFacadeData = (fasadeIndex) => {
  const productId = modelState.getCurrentModel.userData.PROPS.PRODUCT;
  const { FACADE } = modelState._PRODUCTS[productId];
  modelState.createCurrentModelFasadesData({
    data: FACADE,
    fasadeNdx: fasadeIndex,
    productId,
  });
};

defineExpose({
  handleCellSelect,
});

onMounted(() => {
  if (visualizationRef.value) {
    if (module.value.fasades) {
      let doorIndex = module.value.fasades[0] ? 0 : null;
      let segmentIndex = module.value.fasades?.[0]?.[0] ? 0 : null;
      selectCell(null, doorIndex, segmentIndex);
    } else {
      let doorIndex = module.value.sections[0].fasades?.[0] ? 0 : null;
      let segmentIndex = module.value.sections[0].fasades?.[0]?.[0] ? 0 : null;
      selectCell(0, doorIndex, segmentIndex);
    }
  }
});

const closeMenu = () => {
  isOpenMaterialSelector.value = false;
  isOpenHandleSelector.value = false;

  currentHandle.value = false;
  currentFasadeMaterial.value = false;
  currentFasadeSize.value = false;
};

</script>

<template>
  <div class="splitter-container--product">
    <div class="splitter-container--product-data" v-if="module">
      <section
          v-if="module.fasades"
          class="actions-wrapper"
      >
        <div :class="'actions-items--container'">
          <article class="actions-items actions-items--right">
            <div class="actions-items--right-items">
              <button
                  v-if="module.fasades.length < 4"
                  :class="['actions-btn actions-btn--default']"
                  @click="addSlideDoor(module.fasades.length + 1)"
              >
                Добавить дверь
              </button>

              <button
                  v-if="module.fasades.length > 2"
                  :class="['actions-btn actions-btn--default']"
                  @click="deleteSlideDoor(module.fasades.length)"
              >
                Удалить дверь
              </button>
            </div>
          </article>
        </div>

        <div class="actions-header">
          <div
              :class="[
                'actions-header--container',
                { active: doorIndex === selectedFasade.cell },
              ]"
              v-for="(door, doorIndex) in module.fasades"
              :key="doorIndex"
          >
            <p
                class="actions-title actions-title--part"
                @click="showCurrentCol(null, doorIndex)"
            >
              Дверь №{{ doorIndex + 1 }}
            </p>
          </div>
        </div>

        <div
            v-for="(door, doorIndex) in module.fasades"
            :key="doorIndex"
            :class="'actions-container'"
            :id="`fasade_${doorIndex}_${doorIndex}`"
        >
          <div
              class="actions-items--wrapper"
              v-if="selectedFasade.cell === doorIndex"
          >
            <div class="accordion">
              <div
                  v-for="(segment, segmentIndex) in door"
                  :key="segmentIndex"
                  :class="'actions-items--container'"
                  :id="`fasade_${doorIndex}_${segmentIndex}`"
              >
                <details
                    class="item-group"
                    :open="doorIndex === selectedFasade.cell && segmentIndex === selectedFasade.row"
                >
                  <summary>
                    <h3 class="item-group__title">
                      Сегмент №{{ doorIndex + 1
                      }}{{ door.length > 1 ? `.${segment.id/*segmentIndex + 1*/}` : "" }}
                    </h3>
                  </summary>

                  <div :class="'actions-items--container'">
                    <article class="actions-items actions-items--left">
                      <div class="actions-items--left-wrapper">
                        <div class="actions-items--width">
                          <div class="actions-inputs">
                            <p class="actions-title">Ширина</p>
                            <div :class="['actions-input--container']">
                              <input
                                  type="number"
                                  :step="step"
                                  min="150"
                                  class="actions-input"
                                  :value="segment.width"
                                  disabled
                              />
                            </div>
                          </div>
                        </div>

                        <div class="actions-items--height">
                          <div class="actions-inputs">
                            <p class="actions-title">Высота</p>
                            <div :class="['actions-input--container']">
                              <input
                                  type="number"
                                  :step="step"
                                  min="150"
                                  class="actions-input"
                                  :value="segment.height"
                                  disabled
                              />
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
                            @click="splitFasade(null, doorIndex, segmentIndex)"
                        >
                          Разделить фасад
                        </button>-->

                        <button
                            v-if="door.length > 1 && checkRemoveFasadeSegment(null, doorIndex, segmentIndex)"
                            class="actions-btn actions-btn--default"
                            @click="
                              removeFasadeSegment(null, doorIndex, segmentIndex)
                            "
                        >
                          Удалить
                        </button>

                        <ConfigurationOption
                            v-if="!segment.error"
                            :class="[
                                {
                                  active:
                                    currentFasadeMaterial.doorIndex ===
                                      doorIndex &&
                                    currentFasadeMaterial.segmentIndex ===
                                      segmentIndex,
                                },
                              ]"
                            :type="
                              segment.material.PALETTE ? 'palette' : 'surface'
                            "
                            :data="
                              segment.material.PALETTE
                                ? {
                                    ...APP.PALETTE[segment.material.PALETTE],
                                    hex: APP.PALETTE[segment.material.PALETTE]
                                      .HTML,
                                  }
                                : APP.FASADE[segment.material.COLOR]
                            "
                            @click="
                              openFasadeSelector(null, doorIndex, segmentIndex)
                            "
                        />
                        <h class="splitter-container--product-error-message" v-else>Фасад некорректного размера!</h>

                        <ConfigurationOption
                            v-if="!segment.error"
                            :class="[
                                {
                                  active:
                                    currentHandle.doorIndex ===
                                      doorIndex &&
                                    currentHandle.segmentIndex ===
                                      segmentIndex,
                                },
                              ]"
                            :type="'Handles'"
                            :data="segment.material.HANDLES ? {...APP.CATALOG.PRODUCTS[segment.material.HANDLES.id]} : false"
                            @click="
                              openHandleSelector(null, doorIndex, segmentIndex)
                            "
                        />

                      </div>
                    </article>
                  </div>
                </details>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section
          v-else
          class="actions-wrapper"
      >
        <div class="actions-header">
          <div
              :class="[
                'actions-header--container',
                { active: secIndex === selectedFasade.sec },
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

        <div v-for="(section, secIndex) in module.sections" :key="secIndex">
          <div
              class="actions-items--wrapper"
              v-if="selectedFasade.sec === secIndex"
          >
            <div
                v-if="(!module.isHiTech || !module.profilesConfig?.sideProfile) && section.fasades.length < 2 && checkAddDoor(secIndex, section.fasades.length - 1)"
                :class="'actions-items--container'"
            >
              <article class="actions-items actions-items--right">
                <div class="actions-items--right-items">
                  <button
                      :class="['actions-btn actions-btn--default']"
                      @click="addDoor(secIndex)"
                  >
                    Добавить дверь
                  </button>
                </div>
              </article>
            </div>

            <div
                v-for="(door, doorIndex) in section.fasades"
                :key="doorIndex"
                :class="'actions-container'"
                :id="`fasade_${secIndex}_${doorIndex}`"
            >
              <div class="actions-header">
                <button
                    v-if="!module.isRestrictedModule || (module.isRestrictedModule && section.fasades.length > 1)"
                    class="actions-btn actions-icon"
                    @click="deleteDoor(secIndex, doorIndex)"
                >
                  <img
                      class="actions-icon--delete"
                      src="/icons/delite.svg"
                      alt=""
                  />
                </button>
                <p class="actions-title actions-title--part">Дверь №{{ doorIndex + 1 }}</p>
              </div>

              <div class="accordion">
                <div
                    v-for="(segment, segmentIndex) in door"
                    :key="segmentIndex"
                    :class="'actions-items--container'"
                    :id="`fasade_${secIndex}_${doorIndex}_${segmentIndex}`"
                >
                  <details
                      class="item-group"
                      :open="doorIndex === selectedFasade.cell && segmentIndex === selectedFasade.row"
                  >
                    <summary>
                      <h3 class="item-group__title">
                        Сегмент №{{ secIndex + 1 }}.{{ doorIndex + 1 }}.{{
                          segment.id/*segmentIndex + 1*/
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
                                <input
                                    type="number"
                                    :step="step"
                                    min="150"
                                    class="actions-input"
                                    :value="segment.width"
                                    disabled
                                />
                              </div>
                            </div>
                          </div>

                          <div class="actions-items--height">
                            <div class="actions-inputs">
                              <p class="actions-title">Высота</p>
                              <div :class="['actions-input--container']">
                                <input
                                    type="number"
                                    :step="step"
                                    min="150"
                                    class="actions-input"
                                    :value="segment.height"
                                    :disabled="!checkRemoveFasadeSegment(secIndex,doorIndex,segmentIndex)"
                                    @input="
                                      debounce(
                                        () =>
                                          updateFasadeHeight(
                                          $event.target.value,
                                          secIndex,
                                          doorIndex,
                                          segmentIndex
                                          ),
                                        1000
                                      )
                                      "
                                />
                              </div>
                            </div>
                          </div>

                          <div class="actions-items--selector" v-if="!module.isRestrictedModule">
                            <div class="actions-inputs">
                              <p class="actions-title">Сторона открывания</p>
                              <div>
                                <select
                                    style
                                    id="loopsSide"
                                    :value="segment.loopsSide"
                                    name="loopsSide"
                                    class="actions-input"
                                    @change="
                                      changeLoopside(
                                        secIndex,
                                        segment,
                                        $event.target.value,
                                        doorIndex
                                      )
                                    "
                                >
                                  <option
                                      v-for="(side, key) in getLoopsideList(
                                        secIndex,
                                        doorIndex
                                      )"
                                      :key="key"
                                      :value="side.ID"
                                  >
                                    <div class="item-group-name">
                                      <p class="name__text">
                                        {{ side.NAME }}
                                      </p>
                                    </div>
                                  </option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>

                      <article class="actions-items actions-items--right">
                        <div class="actions-items--right-items">
                          <button
                              v-if="!module.isRestrictedModule"
                              :class="['actions-btn actions-btn--default']"
                              @click="
                                splitFasade(secIndex, doorIndex, segmentIndex)
                              "
                          >
                            Разделить фасад
                          </button>

                          <button
                              v-if="door.length > 1 && checkRemoveFasadeSegment(secIndex, doorIndex, segmentIndex)"
                              class="actions-btn actions-btn--default"
                              @click="
                                removeFasadeSegment(
                                  secIndex,
                                  doorIndex,
                                  segmentIndex
                                )
                              "
                          >
                            Удалить
                          </button>

                          <ConfigurationOption
                              v-if="!segment.error"
                              :class="[
                                {
                                  active:
                                    currentFasadeMaterial.secIndex ===
                                      secIndex &&
                                    currentFasadeMaterial.doorIndex ===
                                      doorIndex &&
                                    currentFasadeMaterial.segmentIndex ===
                                      segmentIndex,
                                },
                              ]"
                              :type="
                                segment.material.PALETTE ? 'palette' : 'surface'
                              "
                              :data="
                                segment.material.PALETTE
                                  ? {
                                      ...APP.PALETTE[segment.material.PALETTE],
                                      hex: APP.PALETTE[segment.material.PALETTE]
                                        .HTML,
                                    }
                                  : APP.FASADE[segment.material.COLOR]
                              "
                              @click="
                                openFasadeSelector(
                                  secIndex,
                                  doorIndex,
                                  segmentIndex
                                )
                              "
                          />
                          <h class="splitter-container--product-error-message" v-else>Фасад некорректного размера!</h>

                          <ConfigurationOption
                              v-if="!segment.error"
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
                              :data="segment.material.HANDLES ? {...APP.CATALOG.PRODUCTS[segment.material.HANDLES.id]} : false"
                              @click="
                              openHandleSelector(secIndex, doorIndex, segmentIndex)
                            "
                          />
                        </div>
                      </article>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>

  <transition name="slide--right" mode="out-in">
    <div class="no-select color-select" v-if="isOpenMaterialSelector || isOpenHandleSelector" key="color-select">
      <ClosePopUpButton class="menu__close" @close="closeMenu()" />

      <AdvanceCorpusMaterialRedactor
        v-if="isOpenMaterialSelector"
        :is-fasade="true"
        :elementData="currentFasadeMaterial.data"
        :elementIndex="currentFasadeMaterial.segmentIndex"
        :fasade-size="currentFasadeSize"
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

      &-icon {
        cursor: pointer;
      }

      &-items {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      &-error-message {
        display: flex;
        align-items: center;
        font-size: 16px;
        font-weight: 600;
        border: 1px solid #ecebf1;
        border-radius: 15px;
        padding: 0.5rem;
        color: #da444c;
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

        &__title {
          font-size: 18px;
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
    padding-right: 0.5rem;
    overflow-y: scroll;
    overflow-x: hidden;
    max-height: 90vh;
    scroll-behavior: smooth;
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
    padding-right: 0.5rem;
    max-height: 82vh;

    &::-webkit-scrollbar {
      width: 2px;
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
      padding: 1rem 0;
      border-bottom: 1px solid #ecebf1;

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
      max-width: calc(50% - 1rem);
      margin-left: 1rem;

      &-items {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
      }
    }

    &--selector,
    &--height,
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

    -webkit-user-select: none; /* Safari */
    -ms-user-select: none;     /* IE 10+ и Edge */
    user-select: none;         /* Стандарт: Chrome, Firefox, Opera, Edge */

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

.accordion {
  -webkit-user-select: none; /* Safari */
  -ms-user-select: none;     /* IE 10+ и Edge */
  user-select: none;         /* Стандарт: Chrome, Firefox, Opera, Edge */

  border: unset;

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
  -webkit-user-select: none; /* Safari */
  -ms-user-select: none;     /* IE 10+ и Edge */
  user-select: none;         /* Стандарт: Chrome, Firefox, Opera, Edge */

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
