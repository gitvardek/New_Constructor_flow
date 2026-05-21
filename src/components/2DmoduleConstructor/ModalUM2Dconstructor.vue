<!-- Легаси-код -->
<!--TODO: удалить за ненадобностью-->


<script setup lang="ts">
// @ts-nocheck
import Modal from "@/components/ui/modals/Modal.vue";
import {defineExpose, onBeforeMount, onBeforeUnmount, ref} from "vue";
import Module2DConstructor2 from "@/components/2DmoduleConstructor/Module2DConstructor2.vue";
import { useEventBus } from "@/store/appliction/useEventBus.ts";
import {saveUMGrid} from "@/components/2DmoduleConstructor/utils/Methods.ts";

const props = defineProps({
  product: {
    type: Object || null,
    // required: true,
  },
});

const eventBus = useEventBus();

const universalModule2DConstructor = ref();
const universalModuleData = ref({});
const isUMModalOpen = ref(false);
const gridUMSaved = ref(false);
const universalModuleCash = ref({});
const universalModuleConfigCash = ref({});

const selectUMData = (data) => {
  universalModuleData.value = data;
};

const saveUMData = ({ data, canvasHeight }) => {
  if (!props.product) return;
  if (!props.product.userData) return;

  let saveData = universalModule2DConstructor.value.saveGrid()

  if(!saveData)
    return;

  let tmp_result = saveUMGrid(saveData)

  universalModuleCash.value = props.product.userData.PROPS.CONFIG.MODULEGRID =
      tmp_result;

  gridUMSaved.value = true;
  eventBus.emit("A:UM-update", universalModuleCash.value);
};

const openUMRedactor = () => {
  const {PROPS} = props.product.userData
  const {CONFIG} = PROPS
  const {
    MODULEGRID,
    BACKWALL,
    RIGHTSIDECOLOR,
    LEFTSIDECOLOR,
    HORIZONT,
    MODULE_COLOR,
    TSARGA,
    TOPFASADECOLOR,
    OPTIONS,
    EXPRESSIONS
  } = CONFIG

  if(MODULEGRID)
    universalModuleCash.value = saveUMGrid(MODULEGRID);

  universalModuleConfigCash.value = {
    HORIZONT,
    MODULE_COLOR,
    EXPRESSIONS : {...EXPRESSIONS}
  };

  if(BACKWALL)
    universalModuleConfigCash.value.BACKWALL = {...CONFIG.BACKWALL};

  if(RIGHTSIDECOLOR)
    universalModuleConfigCash.value.RIGHTSIDECOLOR = {...CONFIG.RIGHTSIDECOLOR};

  if(LEFTSIDECOLOR)
    universalModuleConfigCash.value.LEFTSIDECOLOR = {...CONFIG.LEFTSIDECOLOR};

  if(TSARGA)
    universalModuleConfigCash.value.TSARGA = {...CONFIG.TSARGA};

  if(TOPFASADECOLOR)
    universalModuleConfigCash.value.TOPFASADECOLOR = {...CONFIG.TOPFASADECOLOR};

  if(OPTIONS?.length) {
    universalModuleConfigCash.value.OPTIONS = [...CONFIG.OPTIONS.map(opt => {
      return {...opt}
    })];
  }

  isUMModalOpen.value = true;
};

const closeUMRedactor = () => {
  if (!gridUMSaved.value) {
    props.product.userData.PROPS.CONFIG.MODULEGRID = saveUMGrid(universalModuleCash.value);
    props.product.userData.PROPS.CONFIG = Object.assign(props.product.userData.PROPS.CONFIG, universalModuleConfigCash.value)
  }

  universalModuleData.value = false;
  isUMModalOpen.value = false;
  gridUMSaved.value = false;

  universalModuleCash.value = {}
  universalModuleConfigCash.value = {}
};

onBeforeUnmount(()=>{
  universalModuleData.value = false;
  isUMModalOpen.value = false;
  gridUMSaved.value = false;

  universalModuleCash.value = {}
  universalModuleConfigCash.value = {}
})

defineExpose({
  selectUMData,
});
</script>

<template>
  <Modal
    v-if="universalModuleData && props.product"
    :container="`modal--tableTop`"
    @open-modal="openUMRedactor"
    @close-modal="closeUMRedactor"
  >
    <template #modalBody="{ onModalClose }" class="modal--tableTop">
      <Module2DConstructor2
        v-if="isUMModalOpen"
        ref="universalModule2DConstructor"
        :productData="universalModuleData.PROPS"
        :canvasHeight="universalModuleData.canvasHeight"
        :canvasWidth="universalModuleData.canvasWidth"
      >
        <template #save>
          <button class="no-select actions-btn actions-btn--footer" @click="saveUMData">
            Сохранить
          </button>
        </template>

        <template #close>
          <button
            @click="
              () => {
                onModalClose();
              }
            "
            class="no-select actions-btn actions-btn--footer"
          >
            Закрыть
          </button>
        </template>
      </Module2DConstructor2>
    </template>
    <template #modalOpen="{ onModalOpen }">
      <button class="no-select cut-btn" @click="onModalOpen">
        <img class="cut-icon" src="/icons/cut.svg" alt="" />
      </button>
    </template>
  </Modal>
</template>

<style  lang="scss">
.modal {
  &--tableTop {
    border: none;
    max-height: var(--modal-large-height);
    max-width: var(--modal-large-width);
    display: none;
    border-radius: 8px;
    overflow: hidden;
  }
}

.no-select {
  -webkit-user-select: none; /* Safari */
  -ms-user-select: none;     /* IE 10+ и Edge */
  user-select: none;         /* Стандарт: Chrome, Firefox, Opera, Edge */
}

.cut {
  &-btn {
    width: 50px;
    height: 50px;
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 15px;
    background-color: #ecebf1;
    border: 2px solid #ffffff;
    border-radius: 360px;
    cursor: pointer;
    transition: 0.05s;
    pointer-events: auto;
    transform: translate(65px, -30px);
  }

  &-icon {
    width: 25px;
    height: 25px;
    svg {
      g {
        path {
          fill: black;
        }
      }
    }
  }
}
</style>
