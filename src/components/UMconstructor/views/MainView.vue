<script setup lang="ts">
//@ts-nocheck
import {defineExpose, onBeforeMount, onBeforeUnmount, onMounted, ref, watch} from "vue";
import "@/components/UMconstructor/styles/UM.scss"

import RightPanelView from "@/components/UMconstructor/views/RightPanelView.vue";
import LeftPanelView from "@/components/UMconstructor/views/LeftPanelView.vue";
import Render2D from "@/components/UMconstructor/views/Render2D.vue";
import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import {useUMStorage} from "@/store/appStore/UniversalModule/useUMStorage.ts";
import {TTotalProps} from "@/types/types.ts";
import {canvasConfig, constructorMode} from "@/components/UMconstructor/types/UMtypes.ts";
import {useToast} from "@/features/toaster/useToast.ts";

const UMstore = useUMStorage()
const toaster = useToast();

const mode = ref<constructorMode>('module');
const module = ref(false);
const step = ref(1);
const constructor2dContainer = ref(null);

const productData = ref<TTotalProps|boolean>(false)
const refFooter = ref(null);

const visualizationRef = ref(null);
const UMconstructor = ref<UMconstructorClass|null>(null);

const props = defineProps({
  canvasHeight: {
    type: Number,
    default: 720,
  },
  canvasWidth: {
    type: Number,
    default: 600,
  },
  defaultDepth: {
    type: Number,
    default: 560,
  },
  productData: {
    type: [ref<TTotalProps>, Boolean],
    default: false,
    required: true,
  },
});

const emit = defineEmits(["close-modal"]);

const closeModal = () => {
  emit("close-modal", false);
};

const changeConstructorMode = (_mode: constructorMode) => {
  if (_mode && visualizationRef.value) {
    mode.value = _mode;
    visualizationRef.value.changeConstructorMode(_mode);
  }
}

const handleCellSelect = (secIndex, cellIndex, type, rowIndex = null, item = null, extraIndex = null) => {
  switch (type) {
    case "fasades":
      UMstore.setSelected("fasades", {sec: secIndex, cell: cellIndex, row: rowIndex});
      break;
    default:
      UMstore.setSelected("module", {sec: secIndex, cell: cellIndex, row: rowIndex, extra: extraIndex});
      UMstore.setSelected("fillings", {sec: secIndex, cell: cellIndex, row: rowIndex, extra: extraIndex, item: item});
      break;
  }

  //optionsRef.value.handleCellSelect?.(secIndex, cellIndex, rowIndex, extraIndex, item);
};

const saveGrid = (_grid: GridModule) => {
  let grid = _grid || UMconstructor.value?.UM_STORE.getUMGrid();
  if(grid.errors && Object.keys(grid.errors).length > 0) {
    Object.values(grid.errors).forEach(item => {
      toaster.error(item.message, refFooter.value)
    })

    return false
  }

  toaster.success('Модуль сохранен', refFooter.value)

  return Object.assign({}, grid);
};

onBeforeMount(() => {
  UMconstructor.value = new UMconstructorClass();
  UMstore.setCanvasConfig(<canvasConfig>{
    canvasHeight: props.canvasHeight,
    canvasWidth: props.canvasWidth,
  })

  productData.value = props.productData || UMstore.getUMData()
  UMconstructor.value.UM_STORE.totalHeight = productData.value.PROPS?.CONFIG.MODULEGRID?.height || productData.value.PROPS?.CONFIG.SIZE.height || props.canvasHeight;
  UMconstructor.value.UM_STORE.totalWidth = productData.value.PROPS?.CONFIG.MODULEGRID?.width || productData.value.PROPS?.CONFIG.SIZE.width || props.canvasWidth;
  UMconstructor.value.UM_STORE.totalDepth = productData.value.PROPS?.CONFIG.MODULEGRID?.depth || productData.value.PROPS?.CONFIG.SIZE.depth || 0;

  module.value = UMconstructor.value.createUMgrid(productData.value, {
    width: UMconstructor.value.UM_STORE.totalWidth,
    height: UMconstructor.value.UM_STORE.totalHeight,
    depth: UMconstructor.value.UM_STORE.totalDepth,
  });

  if(!module.value) {
    toaster.error('Ошибка создания модуля!', refFooter)
    closeModal()
  }
})

onMounted(() => {
  if (module.value) {
    UMstore.setUMGrid(module.value);

    UMstore.noLoops = module.value.noLoops | false;
    UMstore.noBottom = module.value.noBottom | false;
    UMstore.noBackwall = module.value.noBackwall | false;
    UMstore.onHorizont = module.value.horizont > 0;
    UMstore.noLoops = module.value.noLoops | false;
    UMstore.onSideProfile = !!module.value.profilesConfig?.sideProfile;
    UMstore.onWallModule = module.value.onWallModule | false;

    UMconstructor.value?.setRenderRef(visualizationRef)
    UMconstructor.value?.setAlertRef(refFooter)
    UMconstructor.value?.reset(UMstore.getUMGrid())
  }
  else {
    toaster.error('Ошибка создания модуля!', refFooter)
    closeModal()
  }
});

onBeforeUnmount(() => {
  module.value = false;
  UMconstructor.value = null;
});

watch(() => UMstore.getUMGrid(), () => {
  module.value = UMstore.getUMGrid();
})

defineExpose({
  saveGrid,
});

</script>

<template>
  <div
      v-if="productData"
      class="UM constructor2d-wrapper"
  >

    <div
        class="UM constructor2d-container constructor2d-container--left"
    >
      <LeftPanelView
          :mode="mode"
          :module="module"
          :UMconstructor="UMconstructor"
      />
    </div>

    <div
        id="midAreaUM2Dconstructor"
        class="UM constructor2d-container constructor2d-container--mid"
        ref="constructor2dContainer"
    >
      <div class="UM no-select constructor2d-header">
        <div class="UM constructor2d-header--title"><h1>{{productData.PROPS.NAME}}</h1></div>
      </div>

      <div
          class="UM constructor2d-container constructor2d-header--mode-selector"
      >
        <article class="UM actions-items actions-items--right">
          <div class="UM actions-items--right-items">
            <button
                :class="[
                      'UM no-select actions-btn actions-btn--default', {
                      active:
                        mode === 'module'
                      }
                    ]"
                @click="changeConstructorMode('module')"
            >
              Модуль
            </button>
            <button
                :class="[
                      'UM no-select actions-btn actions-btn--default', {
                      active:
                        mode === 'fillings'
                      }
                    ]"
                @click="changeConstructorMode('fillings')"
            >
              Наполнение
            </button>
            <button
                :class="[
                      'UM no-select actions-btn actions-btn--default', {
                      active:
                        mode === 'fasades'
                      }
                    ]"
                @click="changeConstructorMode('fasades')"
            >
              Фасады
            </button>
          </div>
        </article>
      </div>

      <div class="UM constructor2d-content">
        <Render2D
            ref="visualizationRef"
            :mode="mode"
            :step="step"
            :module="UMconstructor?.UM_STORE.getUMGrid()"
            :UMconstructor="UMconstructor"
            :container="constructor2dContainer"
            :max-area-height="UMconstructor?.UM_STORE.totalHeight"
            :max-area-width="UMconstructor?.UM_STORE.totalWidth"
        />
      </div>

      <section class="UM actions-footer" ref="refFooter">
        <div class="UM actions-footer--save">
          <slot name="save"></slot>
          <slot name="close"></slot>
        </div>
      </section>

    </div>

    <div
        class="UM constructor2d-container constructor2d-container--right"
    >
      <RightPanelView
          :mode="mode"
          :module="module"
          :UMconstructor="UMconstructor"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.constructor2d-wrapper {
  display: flex;
  gap: 1rem;
  justify-content: center;
  width: 100%;
  max-width: 100vw;
  height: 95vh;

  font-family: "Gill Sans", "Gill Sans MT", Calibri, "Trebuchet MS",
  sans-serif;
}
</style>