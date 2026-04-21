<script lang="ts" setup>
// @ts-nocheck
import { ref, onMounted, onBeforeMount, watch, computed } from "vue";

import { useEventBus } from "@/store/appliction/useEventBus";
import { useModelState } from "@/store/appliction/useModelState";
import { useConversationActions } from "../actions/useConversationActions";

import { IFillingConfig } from "@/types/interfases";
import { _URL } from "@/types/constants";

import Toggle from "@vueform/toggle";
import MainInput from "@/components/ui/inputs/MainInput.vue";
import DirectionControl from "@/components/ui/direction/DirectionControl.vue";

type TSizeEditData = {
  widthMin: number;
  widthMax: number;
  heightMin: number;
  heightMax: number;
  depthMin: number;
  depthMax: number;
  joinDepthMin?: number;
  joinDepthMax?: number;
  stepW: number;
  stepH: number;
  stepD: number;
};

interface TDirectionModelType {
  id: number;
  label: string;
  active: boolean;
}

interface TFillingDataType extends TDirectionModelType {
  img: string;
  extensions: boolean;
}

type TChelfCount = {
  max: number | null;
  current: number | null;
};

const modelState = useModelState();
const eventBus = useEventBus();
const { onRsizeConversations } = useConversationActions();

const joinDepthResizeData = ref({
  width: 0,
});

const sizeEditData = ref<TSizeEditData>({
  widthMin: 0,
  widthMax: 0,
  heightMin: 0,
  heightMax: 0,
  depthMin: 0,
  depthMax: 0,
  stepW: 1,
  stepH: 1,
  stepD: 1,
});

const resizeData = ref({
  width: 0,
  height: 0,
  depth: 0,
});

const shelfCount = ref<TChelfCount>({
  max: 0,
  current: 0,
});

const currentModel = ref(null);
const isMounted = ref(false); // флаг готовности для предотвращения автозапуска
const rootModelsList = ref<TDirectionModelType[] | []>(null);
const fillingList = ref<TFillingDataType[] | []>(null);

const getIsUMproduct = computed(() => {
  return !currentModel.value?.PROPS.CONFIG.MODULEGRID;
});

const resizeJoinDepth = (value: number) => {
  eventBus.emit("A:ResizeJoinDepth", { data: value });
};

const recountShelfs = (value) => {
  eventBus.emit("A:RecountShelfs", { data: value });
  // currentModel.value?.PROPS.CONFIG.SHELFQUANT?.current = value
};

const rotateModel = (id: number) => {
  eventBus.emit("A:RotateModel", id);
};

const updateRootModel = (model: TFillingDataType) => {
  eventBus.emit("A:ChangeRootModel", { data: model.id });
  rootModelsList.value?.forEach((el) => {
    el.active = el.id == model.id;
  });
};

const updateFillingModel = (filling: TFillingData) => {
  // console.log(modelState._FILLING[filling.id].SHELFQUANT, "_FILLING");
  const incomeShelfcount = modelState._FILLING[filling.id].SHELFQUANT;
  const maxCount = typeof incomeShelfcount === "number" ? incomeShelfcount : 20;
  // console.log(maxCount, "===== maxCount");
  shelfCount.value = {
    max: maxCount,
    current: 0,
  };

  eventBus.emit("A:ChangeFilling", { data: filling.id });
  fillingList.value?.forEach((el) => {
    el.active = el.id == filling.id;
  });
};

const prepareData = () => {
  const { userData } = modelState.getCurrentModel;
  const {
    MODEL,
    MODELID,
    FILLING_LIST,
    FILLING,
    SIZE,
    SIZE_EDIT,
    SHELFQUANT,
    SIZEEDITJOINDEPTH,
  } = userData.PROPS.CONFIG;
  const { width, height, depth } = SIZE;

  currentModel.value = userData;

  rootModelsList.value = MODEL.map((el) => {
    if (!el) return;
    return {
      id: modelState._MODELS[el].id,
      label: modelState._MODELS[el].type_label,
      active: modelState._MODELS[el].id === MODELID,
    };
  });

  fillingList.value = FILLING_LIST.map((el) => {
    if (!el) return;

    let extensions: boolean = modelState._FILLING[el].CONDITIONS
      ? checkFillingConditions(el, SIZE)
      : true;

    return {
      id: modelState._FILLING[el].ID,
      label: modelState._FILLING[el].NAME,
      active: modelState._FILLING[el].ID === FILLING,
      img: modelState._FILLING[el].SMALL,
      extensions,
      sort: modelState._FILLING[el].SORT,
    };
  }).sort((a, b) => a.sort - b.sort);

  // console.log(modelState._FILLING, "--");
  // console.log(modelState._FILLING[FILLING]?.SHELFQUANT, '[FILLING]?.SHELFQUANT')
  // console.log(SHELFQUANT, "SHELFQUANTSHELFQUANT");

  const maxCount = modelState._FILLING[FILLING]?.SHELFQUANT
    ? modelState._FILLING[FILLING]?.SHELFQUANT
    : SHELFQUANT.max;



  shelfCount.value = {
    max: maxCount,
    current: SHELFQUANT.current,
  };

  joinDepthResizeData.value.width = SIZEEDITJOINDEPTH;
  sizeEditData.value = {
    widthMin: SIZE_EDIT.SIZE_EDIT_WIDTH_MIN,
    widthMax: SIZE_EDIT.SIZE_EDIT_WIDTH_MAX,
    heightMin: SIZE_EDIT.SIZE_EDIT_HEIGHT_MIN,
    heightMax: SIZE_EDIT.SIZE_EDIT_HEIGHT_MAX,
    depthMin: SIZE_EDIT.SIZE_EDIT_DEPTH_MIN,
    depthMax: SIZE_EDIT.SIZE_EDIT_DEPTH_MAX,
    joinDepthMin: SIZE_EDIT.SIZE_EDIT_JOINDEPTH_MIN,
    joinDepthMax: SIZE_EDIT.SIZE_EDIT_JOINDEPTH_MAX,

    stepW: SIZE_EDIT.SIZE_EDIT_STEP_WIDTH ?? 1,
    stepH: SIZE_EDIT.SIZE_EDIT_STEP_HEIGHT ?? 1,
    stepD: SIZE_EDIT.SIZE_EDIT_STEP_DEPTH ?? 1,
  };

  resizeData.value = {
    width,
    height,
    depth,
  };
};

const resizeModel = (value: object) => {
  if (!isMounted.value) return; // игнорируем вызов до готовности
  eventBus.emit("A:Model-resize", { data: { ...resizeData.value, ...value } });

  if (modelState.getCurrentModel?.name === "MODEL") return;

  /** @Проверка_FILLING */
  if (fillingList.value?.length > 0) {
    fillingList.value.forEach((el, key) => {
      el.extensions = modelState._FILLING[el.id].CONDITIONS
        ? checkFillingConditions(el.id, resizeData.value)
        : true;
    });

    const curFilling = fillingList.value?.some(
      (el) => el.active && el.extensions,
    );
    if (!curFilling) {
      updateFillingModel(fillingList.value[0]);
      fillingList.value[0].active = true;
    }
  }
  onRsizeConversations(resizeData.value);
};

const checkFillingConditions = (data, size) => {
  const { width, height, depth } = size;
  const extensionsPrepare = modelState.expressionsReplace(
    modelState._FILLING[data].CONDITIONS,
    {
      "#Y#": height,
      "#X#": width,
      "#Z#": depth,
    },
  );

  return modelState.calculateFromString(extensionsPrepare);
};

onBeforeMount(() => {
  prepareData();
});

onMounted(() => {
  isMounted.value = true;
});

watch(
  () => modelState.getCurrentModel,
  () => {
    isMounted.value = false; // сбрасываем, чтобы при смене модели не было вызова
    prepareData();
    // включаем реакцию после обновления данных
    requestAnimationFrame(() => {
      isMounted.value = true;
    });
  },
);
</script>

<template>
  <div class="ruler">
    <div class="customiser-section">
      <p class="customiser-section__title">Размер товара</p>
      <div class="settings-size">
        <div class="size-item">
          <p class="item__label text-grey">Ширина</p>
          <p class="item__label text-grey">
            Мин: {{ sizeEditData.widthMin ?? "н/о" }}
          </p>
          <p class="item__label text-grey">
            Макс: {{ sizeEditData.widthMax ?? "н/о" }}
          </p>
          <MainInput
            class="input__search right-menu"
            v-model="resizeData.width"
            @update:modelValue="resizeModel"
            type="number"
            :step="sizeEditData.stepW"
            :min="sizeEditData.widthMin"
            :max="sizeEditData.widthMax"
            :disabled="!getIsUMproduct"
          />
        </div>
        <div class="size-item">
          <p class="item__label text-grey">Высота</p>
          <p class="item__label text-grey">
            Мин: {{ sizeEditData.heightMin ?? "н/о" }}
          </p>
          <p class="item__label text-grey">
            Макс: {{ sizeEditData.heightMax ?? "н/о" }}
          </p>
          <MainInput
            class="input__search right-menu"
            v-model="resizeData.height"
            @update:modelValue="resizeModel"
            type="number"
            :step="sizeEditData.stepH"
            :min="sizeEditData.heightMin"
            :max="sizeEditData.heightMax"
            :disabled="!getIsUMproduct"
          />
        </div>
        <div class="size-item">
          <p class="item__label text-grey">Глубина</p>
          <p class="item__label text-grey">
            Мин: {{ sizeEditData.depthMin ?? "н/о" }}
          </p>
          <p class="item__label text-grey">
            Макс: {{ sizeEditData.depthMax ?? "н/о" }}
          </p>
          <MainInput
            class="input__search right-menu"
            v-model="resizeData.depth"
            @update:modelValue="resizeModel"
            type="number"
            :step="sizeEditData.stepD"
            :min="sizeEditData.depthMin"
            :max="sizeEditData.depthMax"
            :disabled="!getIsUMproduct"
          />
        </div>
      </div>

      <p class="customiser-section__title" v-if="fillingList?.length > 1">
        Настройка компоновки
      </p>
      <div v-if="fillingList?.length > 1" class="side-direction">
        <div v-for="(filling, key) in fillingList" :key="key + filling">
          <button
            :class="['side-direction_item', { active: filling.active }]"
            @click="updateFillingModel(filling)"
            v-if="filling.extensions"
          >
            <img :src="_URL + filling.img" alt="" />
            {{ filling.label }}
          </button>
        </div>
      </div>

      <div class="customiser-section__refactor">
        <div class="customiser-section__refactor-item">
          <p
            class="customiser-section__refactor-title item__label text-grey"
            v-if="typeof shelfCount.max == 'number'"
          >
            Количество полок / max: {{shelfCount.max  }}
          </p>
          <MainInput
            v-if="typeof shelfCount.max == 'number'"
            class="input__search right-menu"
            v-model="shelfCount.current"
            @update:modelValue="recountShelfs"
            type="number"
            :min="0"
            :max="shelfCount.max"
            :disabled="!getIsUMproduct"
          />
        </div>

        <div class="customiser-section__refactor-item">
          <p
            class="customiser-section__refactor-title item__label text-grey"
            v-if="sizeEditData.joinDepthMin"
          >
            Глубина пристыковочного модуля
          </p>
          <MainInput
            v-if="sizeEditData.joinDepthMin"
            class="input__search right-menu"
            v-model="joinDepthResizeData.width"
            @update:modelValue="resizeJoinDepth"
            type="number"
            :min="sizeEditData.joinDepthMin"
            :max="sizeEditData.joinDepthMax"
            :disabled="!getIsUMproduct"
          />
        </div>
      </div>

      <p class="customiser-section__title" v-if="rootModelsList?.length > 1">
        Позиционирование
      </p>
      <div v-if="rootModelsList?.length > 1" class="side-direction">
        <div v-for="(model, key) in rootModelsList" :key="key + model">
          <button
            :class="[
              'side-direction_item side-direction_item__btn',
              { active: model.active },
            ]"
            @click="updateRootModel(model)"
          >
            {{ model.label }}
          </button>
        </div>
      </div>

      <p class="customiser-section__title">Вращение</p>
      <DirectionControl
        @changeDirectionPos="rotateModel"
        :type="'rotateMap'"
        :scale="0.8"
        :max-width="140"
        :gap="2"
      /> 

      <p class="customiser-section__title">Произвольное позиционирование</p>
      <div class="switch__container">
        <Toggle v-model="transformControlsValue" />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ruler {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.customiser-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 15px;
  border: 1px solid $stroke;
  border-radius: 15px;
  &__title {
    font-size: 18px;
    font-weight: 600;
  }
  &__refactor {
    display: flex;
    gap: 10px;
    height: 100%;
    &-item {
      width: 50%;
      // height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    &-title {
      margin-bottom: auto;
    }
  }
}

.settings-size {
  display: flex;
  align-items: center;
  gap: 10px;
  .size-item {
    width: 33%;
  }
  .item__label {
    margin-bottom: 2px;
  }
}

.settings-walls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  .walls-item {
    display: flex;
    align-items: center;
    gap: 10px;
  }
}

.side-direction {
  display: flex;
  // gap: 10px;
  &_item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 5px 5px;
    margin-right: 0.5rem;
    min-width: 60px;

    background: $bg;
    outline: none;
    color: $strong-grey;
    border: none;
    border-radius: 15px;

    font-size: 16px;
    font-weight: 600;
    font-size: small;

    transition:
      background-color 0.2s,
      transform 0.1s;

    img {
      max-width: 100px;
      border-radius: 15px;
    }

    @media (min-height: 1000px) {
      font-size: medium;
      padding: 15px 25px;
    }

    &:hover {
      background-color: #e0e0e0;
    }

    &__btn {
      padding: 10px 15px;
    }

    &.active {
      background: $red;
      color: $white;
    }
  }
}
</style>
