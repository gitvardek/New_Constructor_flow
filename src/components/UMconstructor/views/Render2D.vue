<script setup lang="ts">
// @ts-nocheck
import {
  onMounted,
  onUnmounted,
  ref,
  computed,
  reactive,
  defineExpose,
  onBeforeMount,
  toRefs,
  watch,
} from "vue";
import { Application, Container, Graphics, Text } from "pixi.js";
import { Shape, ShapeAdjuster, Section } from "./../utils/PixiMethods.ts";
import { UM_PARAMS, UM_DRAWERS_IDS, WITH_TSARGA } from "./../utils/Const.ts";
import { useAppData } from "@/store/appliction/useAppData.ts";
import * as THREE from "three";
import { LOOPSIDE, TSelectedCell } from "./../types/UMtypes.ts";
import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import ViewportUnits from "./../utils/render2d/ViewportUnits.ts";
import RenderContext from "./../utils/render2d/RenderContext.ts";
import SceneBuilder from "./../utils/render2d/SceneBuilder.ts";
import SelectionHighlighter from "./../utils/render2d/SelectionHighlighter.ts";
import ExternalSizeAdjuster from "./../utils/render2d/ExternalSizeAdjuster.ts";
import DividerDragEngine from "./../utils/render2d/DividerDragEngine.ts";
import { WARDROBE_CANVAS_PADDING_PX } from "@/Application/F-wardrobeData.ts";

const props = defineProps({
  module: {
    type: Object,
    required: true,
  },
  mode: {
    type: String,
    default: "module",
  },
  maxAreaHeight: {
    type: Number,
    default: 720,
  },
  maxAreaWidth: {
    type: Number,
    default: 600,
  },
  correct: {
    type: Object,
  },
  step: {
    type: Number,
    default: 1,
  },
  container: {},
  UMconstructor: {
    type: UMconstructorClass,
    required: true,
  },
});

const canvasContainer = ref();
const APP = useAppData().getAppData;

const selectedCell = ref<TSelectedCell>(<TSelectedCell>{});
const selectedFasade = ref<TSelectedCell>(<TSelectedCell>{});
const selectedFilling = ref<TSelectedCell>(<TSelectedCell>{});
const { module, UMconstructor } = toRefs(props);
const currentModule = ref(null);

const hasTsargaProduct = computed(() =>
  WITH_TSARGA.includes(module.value?.productID)
);

const effectiveMaxSectionWidth = computed(() =>
  hasTsargaProduct.value ? UM_PARAMS.MAX_SECTION_WIDTH_TSARGA : UM_PARAMS.MAX_SECTION_WIDTH
);

const hasMetalTsarga = computed(() =>
  hasTsargaProduct.value &&
  (UMconstructor.value?.UM_STORE.getUMData()?.CONFIG?.OPTIONS?.some(opt => +opt.id === 7250589 && opt.active) ?? false)
);

let app: Application,
  sectionsContainer: Container,
  lablesContainer: Container,
  dementionContainer: Container,
  fillingsContainer: Container,
  fasadesContainer: Container,
  loopsContainer: Container,
  handlesContainer: Container,
  shapeAdjuster: ShapeAdjuster;

// Общий контекст и движки 2D-сцены (см. utils/render2d/*.ts). ctx/sceneBuilder
// создаются в init(); selectCell/checkSectorsCollision/onVerticalDragStart/
// onHorizontalDragStart пока остаются локальными функциями этого файла и
// переедут в SelectionHighlighter/DividerDragEngine на следующих под-этапах —
// точки вызова через ctx не изменятся.
let ctx: RenderContext;
let sceneBuilder: SceneBuilder;
let selectionHighlighter: SelectionHighlighter;
let externalSizeAdjuster: ExternalSizeAdjuster;
let dividerDragEngine: DividerDragEngine;
const renderGrid = (...args) => sceneBuilder.renderGrid(...args);
const createFilling = (...args) => sceneBuilder.createFilling(...args);
const checkPositionFillingToCreate = (...args) => sceneBuilder.checkPositionFillingToCreate(...args);
const selectCell = (...args) => selectionHighlighter.selectCell(...args);
const selectWardrobeProfile = (...args) => selectionHighlighter.selectWardrobeProfile(...args);
const checkSectorsCollision = (...args) => selectionHighlighter.checkSectorsCollision(...args);
const changeConstructorMode = (...args) => selectionHighlighter.changeConstructorMode(...args);
const adjustSizeFromExternal = (...args) => externalSizeAdjuster.adjustSizeFromExternal(...args);
const dragMove = (...args) => dividerDragEngine.dragMove(...args);
const handleGlobalPointerMove = (...args) => dividerDragEngine.handleGlobalPointerMove(...args);

let cursorCheck = false;
let lastDragEvent = ref(null);

// Хранилища объектов
const sections: Container[] = [];
const sectionLables: (Graphics | Text)[] = [];
const deviders: Graphics[] = [];
const dementions: Graphics[] = [];
const fillings: Graphics[] = [];
const fillingsMap: Shape[] = []; // Shape-экземпляры наполнений для прямого управления highlight
const fasades: Graphics[] = [];
const loops: Container[] = [];
const handles: Container[] = [];

const RASPASHNOY_ID = UM_PARAMS.RASPASHNOY_ID
const {
  CONST_MAX_AREA_WIDTH,
  CONST_MAX_AREA_HEIGHT,
  BACKGROUND_COLOR,
  MIN_SECTION_WIDTH,
  MIN_SECTION_HEIGHT,
  MIN_FASADE_HEIGHT,
  MIN_FASADE_WIDTH,
  MIN_SLIDE_DOOR_WIDTH,
  MIN_TSARGA_WIDTH,
  MAX_TSARGA_WIDTH,
} = UM_PARAMS;

const dragState = reactive({
  isDragging: false,
  type: null, // "vertical" или "horizontal"

  secIndex: null, // Для горизонтального перетаскивания
  cellIndex: null, // Для вертикального перетаскивания
  rowIndex: null, // Для горизонтального перетаскивания
  extraIndex: null, // Для вертикального перетаскивания

  startX: 0,
  startY: 0,

  startLeftWidth: 0,
  startRightWidth: 0,

  minXleft: MIN_SECTION_WIDTH,
  minXRight: MIN_SECTION_WIDTH,

  startTopHeight: 0,
  startBottomHeight: 0,

  minTop: MIN_SECTION_HEIGHT,
  minBottom: MIN_SECTION_HEIGHT,

  element: null,
});

const MAX_AREA_WIDTH = ref<number>(CONST_MAX_AREA_WIDTH);
const MAX_AREA_HEIGHT = ref<number>(CONST_MAX_AREA_HEIGHT);

const calcMaxAreaWidth = () => {
  let midArea = document.getElementById("midAreaUM2Dconstructor");
  MAX_AREA_WIDTH.value = midArea?.clientWidth * 0.7 || CONST_MAX_AREA_WIDTH;
};

const calcMaxAreaHeight = () => {
  let midArea = document.getElementById("midAreaUM2Dconstructor");
  MAX_AREA_HEIGHT.value = midArea?.clientHeight * 0.75 || CONST_MAX_AREA_HEIGHT;
};

const calcMaxAreaSizeConst = () => {
  calcMaxAreaHeight();
  calcMaxAreaWidth();
};

const TOTAL_HEIGHT = ref(0);
const TOTAL_WIDTH = ref(0);
const areaHeight = ref(0);
const areaWidth = ref(0);
const mode = ref("module");

const calcDrawersFasades = (secIndex, fillingData = false) => {
  UMconstructor?.value?.FASADES.EXTERNAL_FASADES.calcDrawersFasades(
    secIndex,
    fillingData,
    currentModule.value,
  );
};

const checkLoopsCollision = (secIndex) => {
  UMconstructor?.value?.LOOPS.checkLoopsCollision(
    secIndex,
    currentModule.value,
  );
};

const resetModule = () => {
  UMconstructor?.value?.reset(currentModule.value);
};

const pixelRatioWidth = computed(() => TOTAL_WIDTH.value / areaWidth.value);
const pixelRatioHeight = computed(() => TOTAL_HEIGHT.value / areaHeight.value);

const calcMaxAreaSize = () => {
  calcMaxAreaSizeConst();
  let scale = Math.min(
    MAX_AREA_WIDTH.value / TOTAL_WIDTH.value,
    MAX_AREA_HEIGHT.value / TOTAL_HEIGHT.value,
  );

  areaWidth.value = TOTAL_WIDTH.value * scale;
  areaHeight.value = TOTAL_HEIGHT.value * scale;
};

const updateTotalSize = (value, dimension) => {
  switch (dimension) {
    case "width":
      TOTAL_WIDTH.value = parseInt(value);
      break;
    case "height":
      TOTAL_HEIGHT.value = parseInt(value);
      break;
    default:
      break;
  }

  calcMaxAreaSize();

  if (!app) return;

  // Отступ канваса для гардеробной системы (WARDROBE_CANVAS_PADDING_PX в
  // F-wardrobeData.ts): канвас больше areaWidth/areaHeight на 2×отступ по
  // каждой оси, а модуль внутри сдвинут на отступ (SceneBuilder.renderGrid —
  // xOffset/yOffset). Сами areaWidth/areaHeight и всё производное от них
  // (pixelRatio*, getPixelWidth/Height/getMmWidth/Height через ViewportUnits)
  // не меняются — отступ влияет ТОЛЬКО на canvas.style/renderer.resize, чтобы
  // мм↔px соотношение осталось прежним (иначе сломался бы расчёт драга, см.
  // комментарий у константы). currentModule.value на самый первый вызов может
  // быть ещё не проставлен watcher'ом — запасной источник props.module.
  const moduleData = currentModule.value ?? module.value;
  const moduleKind = moduleData?.moduleKind;
  const isWardrobe = moduleKind === 'wardrobe';
  const padding = isWardrobe ? WARDROBE_CANVAS_PADDING_PX : 0;

  // РАНЬШЕ сверх areaWidth резервировалось ещё (N+1)×WARDROBE_PROFILE_WIDTH:
  // тогда grid.width (= TOTAL_WIDTH) был суммой section.width без профилей, и
  // раскладка выходила шире. Позже (UMconstructorClass.reset() —
  // applyWardrobeWidthDelta) grid.width стал ПОЛНОЙ шириной модуля — сумма
  // секций уже с вычтенным бюджетом под профили, — так что areaWidth
  // (= TOTAL_WIDTH×scale) уже включает их. Резерв поверх стал двойным учётом
  // и давал большой пустой отступ справа от канваса.
  const canvasWidth = areaWidth.value + padding * 2;
  const canvasHeight = areaHeight.value + padding * 2;

  app.canvas.style.width = `${canvasWidth}px`;
  app.canvas.style.height = `${canvasHeight}px`;
  app.renderer.resize(canvasWidth, canvasHeight);
};

const viewportUnits = new ViewportUnits(TOTAL_WIDTH, TOTAL_HEIGHT, areaWidth, areaHeight);
const getPixelWidth = viewportUnits.getPixelWidth;
const getPixelHeight = viewportUnits.getPixelHeight;
const getMmWidth = viewportUnits.getMmWidth;
const getMmHeight = viewportUnits.getMmHeight;

const setModuleGrid = (grid) => {
  currentModule.value = grid;
};

// ctx и движки создаются синхронно, а не внутри async init(): RENDER_REF
// (UMconstructorClass.selectCell и т.п.) может быть вызван раньше, чем
// завершится await app.init() — например MainView.vue::autoSelectDeepest на
// mount, — и renderGrid/selectCell падали бы с "Cannot read properties of
// undefined". PIXI-специфичные поля (app/контейнеры/shapeAdjuster)
// довешиваются на этот же ctx внутри init(); до того они читаются как
// undefined — ровно как в оригинале, где renderGrid/etc. рано выходили по
// appReady/пустым массивам.
ctx = new RenderContext({
  sections, sectionLables, deviders, dementions, fillings, fillingsMap, fasades, loops, handles,
  getPixelWidth, getPixelHeight, getMmWidth, getMmHeight,
  mode, currentModule, selectedCell, selectedFasade, selectedFilling,
  hasTsargaProduct, hasMetalTsarga, effectiveMaxSectionWidth,
  pixelRatioWidth, pixelRatioHeight,
  props, APP, UMconstructor, canvasContainer,
  dragState, lastDragEvent,
  calcDrawersFasades, checkLoopsCollision, resetModule, setModuleGrid,
  renderGrid, selectCell, selectWardrobeProfile, checkSectorsCollision,
});
sceneBuilder = new SceneBuilder(ctx);
selectionHighlighter = new SelectionHighlighter(ctx);
externalSizeAdjuster = new ExternalSizeAdjuster(ctx);
dividerDragEngine = new DividerDragEngine(ctx);
ctx.onVerticalDragStart = dividerDragEngine.onVerticalDragStart;
ctx.onHorizontalDragStart = dividerDragEngine.onHorizontalDragStart;
ctx.onWardrobeProfileDragStart = dividerDragEngine.onWardrobeProfileDragStart;
ctx.onWardrobeProfileClick = dividerDragEngine.onWardrobeProfileClick;
ctx.onWardrobeShelfDragStart = dividerDragEngine.onWardrobeShelfDragStart;

const init = async () => {
  app = new Application();
  await app.init({
    canvas: canvasContainer.value,
    width: areaWidth.value,
    height: areaHeight.value,
    backgroundColor: BACKGROUND_COLOR,
    resolution: window.devicePixelRatio || 1,
    // autoDensity: true,
    antialias: true,
    premultipliedAlpha: false,
  });
  updateTotalSize();
  loopsContainer = new Container();
  handlesContainer = new Container();
  sectionsContainer = new Container();
  lablesContainer = new Container();
  dementionContainer = new Container();
  fillingsContainer = new Container();
  fasadesContainer = new Container();

  // sectionsContainer.interactive = true;
  fillingsContainer.interactive = true;
  //loopsContainer.interactiveChildren = true;
  fasadesContainer.interactive = true;
  lablesContainer.interactiveChildren = false;
  dementionContainer.interactiveChildren = false;

  app.stage.addChild(dementionContainer);
  app.stage.addChild(fillingsContainer);
  app.stage.addChild(sectionsContainer);
  app.stage.addChild(loopsContainer);
  app.stage.addChild(fasadesContainer);
  app.stage.addChild(handlesContainer);
  app.stage.addChild(lablesContainer);

  app.stage.eventMode = "static";
  app.stage.hitArea = app.screen;

  shapeAdjuster = new ShapeAdjuster({
    scope: UMconstructor?.value,
    getMmWidth,
    getMmHeight,
    getPixelHeight,
    getPixelWidth,
  });
  UMconstructor.value.setShapeAdjuster(shapeAdjuster);
  shapeAdjuster.setStep(props.step);

  // ctx уже создан синхронно (см. выше) — здесь довешиваем PIXI-специфичные
  // поля, которые не могли существовать до этого момента.
  Object.assign(ctx, {
    app, sectionsContainer, lablesContainer, dementionContainer, fillingsContainer, fasadesContainer, loopsContainer, handlesContainer,
    shapeAdjuster,
  });

  addTicker();

  ctx.appReady = true;
  renderGrid();
};



const destroy = () => {
  app.destroy(true);
};

const addTicker = () => {
  app.ticker.maxFPS = 60;
  app.ticker.add(() => {
    dragMove(lastDragEvent.value);
  });
};

watch(
  () => UMconstructor?.value?.UM_STORE.getUMGrid(),
  () => {
    setModuleGrid(UMconstructor?.value?.UM_STORE.getUMGrid());
  },
);

watch(hasMetalTsarga, () => {
  UMconstructor.value?.reset();
});

watch(
  () => UMconstructor?.value?.UM_STORE.getSelected("module"),
  () => {
    selectedCell.value = UMconstructor?.value?.UM_STORE.getSelected("module");

  },
);
watch(
  () => UMconstructor?.value?.UM_STORE.getSelected("fasades"),
  () => {
    selectedFasade.value =
      UMconstructor?.value?.UM_STORE.getSelected("fasades");

  },
);
watch(
  () => UMconstructor?.value?.UM_STORE.getSelected("fillings"),
  () => {
    selectedFilling.value =
      UMconstructor?.value?.UM_STORE.getSelected("fillings");
  },
);

onBeforeMount(() => {
  TOTAL_HEIGHT.value = props.maxAreaHeight;
  TOTAL_WIDTH.value = props.maxAreaWidth;
  mode.value = props.mode;

  calcMaxAreaSize();
});

onMounted(() => {
  init();
  selectedCell.value = UMconstructor?.value?.UM_STORE.getSelected("module");
  selectedFasade.value = UMconstructor?.value?.UM_STORE.getSelected("fasades");
  selectedFilling.value = UMconstructor?.value?.UM_STORE.getSelected("fillings");
  document.addEventListener("mousemove", handleGlobalPointerMove, false);
});

onUnmounted(() => {
  if (ctx) ctx.appReady = false;
  document.removeEventListener("mousemove", handleGlobalPointerMove, false);
  app.destroy(true);
});

defineExpose({
  adjustSizeFromExternal,
  renderGrid,
  selectCell,
  selectWardrobeProfile,
  updateTotalSize,
  destroy,
  changeConstructorMode,
  createFilling,
  checkPositionFillingToCreate,
  getMmWidth,
  getMmHeight,
  getPixelHeight,
  getPixelWidth,
});
</script>

<template>
  <div class="visualization-interactive" :style="`height:${areaHeight}px width:${areaWidth}px`">
    <canvas ref="canvasContainer"></canvas>
  </div>
  <!-- :style="'height:getMaxAreaHeight'" -->
</template>

<style lang="scss" scoped>
.visualization-interactive {
  canvas {
    border: 1px solid #bbbbbb;
    display: flex;
    justify-content: center;
  }
}

/*  height: 320px;
  width: 800px;
*/

canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
