<!-- src/components/ui/transform/TransformModeSwitcher.vue -->
<script setup lang="ts">
import { ref, onMounted, watch, toRaw } from "vue";
import { storeToRefs } from "pinia";
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
const curControllerType = ref<string>("translate");
const curAngleParam = ref<number>(1);

const controllerValue = ref([
  { name: "Позиционирование", type: "translate", icon: "/icons/move.svg", description:". Для выхода из режима, повторно кликните по кнопке" },
  { name: "Вращение", type: "rotate", icon: "/icons/rotate.svg", description:". Для выхода из режима, повторно кликните по кнопке" },
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
  curControllerType.value = data.type;
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

// Клик по кнопке режима: включает режим, меняет тип контроллера или выключает режим
const onControllerClick = (data: { name: string; type: string }) => {
  if (!transformControlsValue.value) {
    // Режим выключен — включаем и сразу задаём выбранный тип контроллера
    // (A:TransformSetMode работает только после attach, поэтому порядок важен)
    toggleTransformMode(true);
    changeControllerType(data);
    return;
  }

  if (curControllerType.value !== data.type) {
    // Режим активен с другим типом — только переключаем тип контроллера
    changeControllerType(data);
    return;
  }

  // Повторный клик по активной кнопке — выключаем режим
  toggleTransformMode(false);
};

// Кнопка подсвечена, когда режим включён и выбран именно этот тип контроллера
const isControllerActive = (type: string) => {
  return transformControlsValue.value && curControllerType.value === type;
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
  curControllerType.value =
    controllerValue.value.find((data) => data.name === getTransformControlsName)
      ?.type ?? "translate";

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
    <div>
      <transition name="controller-toggle">
        <Accordion v-if="curControllerType === 'rotate' && transformControlsValue">
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
    </div>

    <div class="switch__container">
      <MainButton v-for="data in controllerValue" :key="data.type" size="small border" :className="
        isControllerActive(data.type)
          ? 'mode-button mode-button--active'
          : 'mode-button'
      " :title="data.name + data.description" @click="onControllerClick(data)">
        <img class="mode-button__icon" :src="data.icon" :alt="data.name + data.description" />
      </MainButton>

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

  &__container {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.35rem;
    border-radius: 8px;
    backdrop-filter: blur(4px);
  }
}

.mode-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  background-color: $white;

  &__icon {
    display: block;
    width: 2rem;
    height: 2rem;
  }

  &:hover {
    background-color: $light-grey;
    color: $strong-grey;
    border-color: $clicked-green;
  }

  // Подсветка активного режима: акцент на рамке, иконка остаётся чёрной
  &--active {

    &,
    &:hover {
      background-color: $light-grey;
      border-color: $clicked-green;
      box-shadow: 0 0 0 5px rgba($clicked-green, 0.5);
    }
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
