<script setup lang="ts">
//@ts-nocheck

import { watch, ref, computed } from "vue";
import MaterialSelector from "@/components/right-menu/customiser-pages/ColorRightPage/MaterialSelector.vue";
import SurfaceRedactor from "@/components/right-menu/customiser-pages/ColorRightPage/SurfaceRedactor.vue";
import { useEventBus } from "@/store/appliction/useEventBus";

type TData = {
  extras?: string | undefined;
  type: string;
  data: Record<string, any> | any[];
};

interface Props {
  optionsData: TData;
  currentOptionLabel: string | null;
  getCurrentRedactor: boolean;
}
const eventBus = useEventBus();
const props = defineProps<Props>();
const changeCounter = ref(0);

const emit = defineEmits<{
  (e: "select", value: any, type: string, extras: string | undefined): void;
}>();

const handleSelect = (value: any, type: string, extras: string | undefined) => {
  console.log(value, type, extras, "---- ПЛИНТУС ----");
  emit("select", value, type, extras);
  // eventBus.emit('A:GlobalParapsSelect')
};

const materialKey = computed(() => `mat-group-${changeCounter.value}`);

watch(
  () => props.optionsData,
  () => {
    changeCounter.value++;
  },
  { deep: true },
);
</script>

<template>
  <div class="color-select">
    <h1 class="color__title">{{ props.currentOptionLabel }}</h1>

    <SurfaceRedactor
      v-if="props.getCurrentRedactor"
      :key="materialKey"
      :materialList="props.optionsData.data"
      :tempWork="true"
      @select_material="
        (data) =>
          handleSelect(data, props.optionsData.type, props.optionsData.extras)
      "
    />

    <MaterialSelector
      v-else
      :key="materialKey + props.optionsData.type"
      :materials="props.optionsData.data"
      @select="
        (data) =>
          handleSelect(data, props.optionsData.type, props.optionsData.extras)
      "
    />
  </div>
</template>

<style lang="scss" scoped>
.color-select {
  position: absolute;
  left: 40rem;
  width: 100%;
  height: calc(100vh - var(--header-height));
  max-width: 373px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 15px;
  background: rgba($white, 1);
  box-shadow: 0px 0px 10px 0px #3030301a;
  z-index: -1;
  border-radius: 15px;

  &__container {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    overflow: auto;
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
      font-size: 1.5rem;
      font-weight: 500;
    }
  }
}

.color__title {
  font-size: 1.8rem;
  margin: 0;
}
</style>
