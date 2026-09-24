<!-- src/components/ui/transform/TransformModeSwitcher.vue -->
<script setup lang="ts">
import { ref, onMounted, watch, toRaw } from "vue";
import { storeToRefs } from "pinia";
import Toggle from "@vueform/toggle";
import Accordion from "@/components/ui/accordion/Accordion.vue";
import MainButton from "@/components/ui/buttons/MainButton.vue";

import { useTransformController } from "./useTransformController";
import { useEventBus } from "@/store/appliction/useEventBus";
import { useModelState } from "@/store/appliction/useModelState";

const eventBus = useEventBus();
const modelState = useModelState();
const {
  getTransformControlsValue,
  setTransformControlsValue,
  getTransformControlSnapAngles,
  setControlSnapAngle,
  getControlSnapAngle,
  getTransformControlsName,
  setTransformControlsName,
  setFreeTransform,
} = useTransformController();
// Через storeToRefs, чтобы кнопка сброса реагировала на изменение флага
const { getFreeTransform } = storeToRefs(useTransformController());

const transformControlsValue = ref<boolean>(false);
const curControllerValue = ref<string>("Позиционирование");
const curAngleParam = ref<number>(1);

const controllerValue = ref([
  { name: "Позиционирование", type: "translate" },
  { name: "Вращение", type: "rotate" },
]);

const emit = defineEmits<{
  (e: "TransformMode", value: boolean): void;
}>();

const changeAngle = (value: number) => {
  curAngleParam.value = value;
  setControlSnapAngle(value);
  eventBus.emit("A:TransformSetRotationSnap", value);
};

const changeControllerType = (data: { name: string; type: string }) => {
  curControllerValue.value = data.name;
  setTransformControlsName(data.name);
  eventBus.emit("A:TransformSetMode", data.type);
};

const toggleTransformMode = (value: boolean) => {
  transformControlsValue.value = value;

  if (value) {
    eventBus.emit("A:TransformMode_On");
  } else {
    eventBus.emit("A:TransformMode_Off");
  }

  emit("TransformMode", value);

  setTransformControlsValue(value);
};

const globalDisable = () => (transformControlsValue.value = false);

// Снимает свободную установку: объект снова притягивается к стене и получает её поворот
const resetFreeTransform = () => {
  eventBus.emit("A:TransformReset");
};

// При смене выбранного объекта берём его флаг свободной установки из CONFIG
watch(
  () => modelState.getCurrentModel,
  (model) => {
    setFreeTransform(!!toRaw(model)?.userData?.PROPS?.CONFIG?.FREE_TRANSFORM);
  },
  { immediate: true }
);

onMounted(() => {
  transformControlsValue.value = getTransformControlsValue ?? false;
  curAngleParam.value = getControlSnapAngle;
  curControllerValue.value = getTransformControlsName;

  eventBus.on("A:GlobalTransformMode_Off", globalDisable);
});

// Следим за внешними изменениями (например, если кто-то снаружи сбросил режим)
// watch(
//   () => getTransformControlsValue,
//   (newVal) => {
//     if (newVal !== undefined && transformControlsValue.value !== newVal) {
//       transformControlsValue.value = newVal;
//     }
//   }
// );
</script>

<template>
  <div class="switch__wrapper">
    <transition name="controller-toggle">
      <p v-if="!transformControlsValue" class="switch__title">
        {{ curControllerValue }}
      </p>
    </transition>

    <div>
      <transition name="controller-toggle">
        <Accordion v-if="
          curControllerValue.includes('Вращение') && transformControlsValue
        ">
          <template #title>
            <h4 class="accordion__header">Шаг: {{ curAngleParam }}&deg;</h4>
          </template>

          <template #params="{ onToggle }">
            <ul class="quality-list">
              <li v-for="(data, index) in getTransformControlSnapAngles" :key="index + data" class="accordion__text"
                @click="
                  () => {
                    changeAngle(data);
                    onToggle();
                  }
                ">
                {{ data }}
              </li>
            </ul>
          </template>
        </Accordion>
      </transition>

      <transition name="controller-toggle">
        <Accordion v-if="transformControlsValue">
          <template #title>
            <h4 class="accordion__header">
              {{ curControllerValue }}
            </h4>
          </template>

          <template #params="{ onToggle }">
            <ul class="quality-list">
              <li v-for="(data, index) in controllerValue" :key="index + data.name" class="accordion__text" @click="
                () => {
                  changeControllerType(data);
                  onToggle();
                }
              ">
                {{ data.name }}
              </li>
            </ul>
          </template>
        </Accordion>
      </transition>
    </div>

    <div class="switch__container">
      <Toggle :model-value="transformControlsValue" @update:model-value="toggleTransformMode" />

      <transition name="controller-toggle">
        <MainButton v-if="getFreeTransform" size="small border" @click="resetFreeTransform">
          Сбросить
        </MainButton>
      </transition>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.switch {
  &__wrapper {
    position: absolute;
    bottom: 1rem;
    left: 295px;
    // transform: translate(0, 2rem);
    display: flex;
    flex-direction: column;


  }

  &__title {
    position: absolute;
    bottom: 3.5rem;
    margin: 0;
    font-size: 1.4rem;
    font-weight: 600;
    color: #333;
    padding: 0.35rem 0.75rem;
    border-radius: 6px;
    backdrop-filter: blur(4px);
  }

  &__container {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.35rem;
    border-radius: 8px;
    backdrop-filter: blur(4px);
  }
}

.accordion {
  padding: 0.5rem 1rem;
  color: $alter-gray;
  border-radius: 8px;
  backdrop-filter: blur(5px);

  &__header {
    margin-right: 0.5rem;
  }

  &__summary {
    gap: 10rem;
  }

  // &__content {
  //   padding-top: 0.5rem;
  //   border-top: 1px solid #a3a9b5;
  // }

  &__text {
    cursor: pointer;
    transition-property: color;
    transition-duration: 0.25s;
    transition-timing-function: ease;

    @media (hover: hover) {

      /* when hover is supported */
      &:hover {
        color: $light-grey;
      }
    }
  }
}

.quality-list {
  padding-top: 0.5rem;
  border-top: 1px solid $dark-grey;
}
</style>
