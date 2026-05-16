
<script setup lang="ts">
//@ts-nocheck
import {
  ref,
  onMounted,
  defineEmits,
  defineProps,
  computed,
  onBeforeMount,
  onBeforeUnmount,
  watch,
} from "vue";
import MainButton from "../ui/buttons/MainButton.vue";
import { FasadeTextAlignAction } from "@/types/types";
import { useDerectionAction } from "./useDerectionAction";

const { getControlsData, setType, setHandlePosition, actions } = useDerectionAction()


type TDirection = {
  btnShow: string;
  icon: string;
  size: number;
  fontSize: number;
  action: FasadeTextAlignAction;
  id: number | null;
  active: boolean | null;
};

type TDirectionMap = {
  rotateMap: number[];
  centerOnly:number[];
};
type TDirectionController = TDirection[];

interface Props {
  scale?: number;
  type?: keyof TDirectionMap;
  disactive?: boolean;
  fontSize?: number;
  size?: number;
  maxWidth?: number;
  gap?: number;
  container?: string;
  handlePos?: string[] | [];
  activePos?: number | null;
}

const props = withDefaults(defineProps<Props>(), {
  scale: 1,
  disactive: false,
  handlePos: [],
});

const controlsData = ref<TDirectionController | []>([]);

const directionBtn = ref<InstanceType<typeof MainButton>[]>([]);
const emit = defineEmits<{
  (
    e: "changeDirectionPos",
    value: string | number,
    id: number | null,
    active: boolean | null
  ): void;
}>();

const changeDirectionPos = (
  value: number,
  id: number | null,
  active: boolean | null
) => {
  emit("changeDirectionPos", value, id, active);
  if (props.handlePos.length > 0) {
    controlsData.value.forEach((el) => {
      if(el.id === null || el.id === undefined)
        el.action === value ? (el.active = true) : (el.active = false);
      else
        el.id === id ? (el.active = true) : (el.active = false);
    });
  }
};

const getContainerWidth = computed(() => {
  return {
    "max-width": props.maxWidth + "px",
    gap: props.gap + "px",
  };
});

const createControlsData = () => {
  setType(props.type);
  setHandlePosition(props.handlePos);
  controlsData.value = getControlsData();

  if(props.activePos)
    controlsData.value.forEach((el) => {
      if(el.id === null || el.id === undefined)
        el.action === props.activePos ? (el.active = true) : (el.active = false);
      else
        el.id === props.activePos ? (el.active = true) : (el.active = false);
    });
};

onBeforeMount(() => {
  createControlsData();
});

onBeforeUnmount(() => {
  setType(null);
  setHandlePosition([]);
});

onMounted(() => {
  directionBtn.value.forEach((el, key) => {
    const size = props.size ?? actions[key].size;
    const fontSize = props.fontSize ?? actions[key].fontSize;
    el.style.setProperty("--value", `${size * props.scale}px`);
    el.style.setProperty("--font", `${fontSize * props.scale}px`);
  });
});

watch(props, () => {
  createControlsData();
});
</script>

<template>
  <div
    :class="['direction-control', props.container]"
    :style="getContainerWidth"
    v-if="!disactive"
  >
    <button
      v-for="(btn, key) in controlsData"
      :key="key"
      :class="['button__rounded', btn.btnShow, { active: btn.active }]"
      ref="directionBtn"
      @click="changeDirectionPos(btn.action, btn.id, btn.active)"
    >
      <div :class="['icon', btn.icon]"></div>
    </button>
  </div>
</template>

<style lang="scss" scoped>
.direction-control {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  max-width: 170px;

  &.card {
    padding: 5px;
    border-radius: 15px;
    box-shadow: 4px 4px 4px 4px rgba(34, 60, 80, 0.11);
    align-items: center;
    height: fit-content;
  }
}

.icon {
  font-size: var(--font);
}

.button__rounded {
  padding: var(--value);

  &.disabled {
    pointer-events: none;
    opacity: 0;
  }
  &.active {
    color: #000000;
    background-color: transparent;
    border-color: #000000;
  }
}
</style>
