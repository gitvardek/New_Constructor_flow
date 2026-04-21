<script setup lang="ts">
import { ref, watch } from "vue";
import Accordion from "@/components/ui/accordion/Accordion.vue";
import RangeSlider from "@/components/ui/rangeSlider/RangeSlider.vue";
import Toggle from "@vueform/toggle";
import type { TQuality } from "@/types/types";

const props = defineProps<{
  currentQuality: TQuality | null;
  quality: TQuality[] | null;
  shadows: boolean;
  refraction: boolean;
  ambientLight: number | string;
  pointLight: number | string;
}>();

const emit = defineEmits<{
  (e: "change-quality", value: TQuality): void;
  (e: "update:shadows", value: boolean): void;
  (e: "update:refraction", value: boolean): void;
  (e: "update:ambientLight", value: number | string): void;
  (e: "update:pointLight", value: number | string): void;
}>();

const localShadows = ref<boolean>(props.shadows);
const localRefraction = ref<boolean>(props.refraction);
const localAmbient = ref<number | string>(props.ambientLight);
const localPoint = ref<number | string>(props.pointLight);

watch(() => props.shadows, (v) => (localShadows.value = v));
watch(localShadows, (v) => emit("update:shadows", v));

watch(() => props.refraction, (v) => (localRefraction.value = v));
watch(localRefraction, (v) => emit("update:refraction", v));

watch(() => props.ambientLight, (v) => (localAmbient.value = v));
watch(localAmbient, (v) => emit("update:ambientLight", v));

watch(() => props.pointLight, (v) => (localPoint.value = v));
watch(localPoint, (v) => emit("update:pointLight" as any, v)); 

// const emitPoint = (v: number | string) => emit("update:pointLight", v);
// watch(localPoint, (v) => emitPoint(v));
</script>

<template>
  <div class="visual">
    <h3 class="visual__title">Свет и тени</h3>

    <div class="visual__contant">
      <div class="visual__top">
        <div class="visual__top--left">
          <Accordion>
            <template #title>
              <div class="label__container">
                <p class="label__text label__text--xs">Качество теней</p>
                <p class="label__text">{{ currentQuality?.lable }}</p>
              </div>
            </template>

            <template #params="{ onToggle }">
              <ul class="accordion__contant">
                <li
                  class="label__text"
                  v-for="(param, key) in quality"
                  :key="key"
                  @click="() => { emit('change-quality', param); onToggle(); }"
                >
                  {{ param.lable }}
                </li>
              </ul>
            </template>
          </Accordion>
        </div>

        <div class="visual__top--right visual__top--switch">
          <div class="switch__container">
            <h4 class="label__text">Тени</h4>
            <Toggle v-model="localShadows" />
          </div>

          <div class="switch__container">
            <h4 class="label__text">Отражение</h4>
            <Toggle v-model="localRefraction" />
          </div>
        </div>
      </div>

      <div class="visual__bottom">
        <div class="visual__bottom--left">
          <RangeSlider v-model="localAmbient" :min="0" :max="5" :step="0.01" :showValue="true">
            <template #title>
              <p class="label__text">Основное освещение</p>
            </template>
          </RangeSlider>
        </div>

        <div class="visual__bottom--right">
          <RangeSlider v-model="localPoint" :min="0" :max="5" :step="0.01" :showValue="true">
            <template #title>
              <p class="label__text">Направленное освещение</p>
            </template>
          </RangeSlider>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.visual {
  padding: 1rem;
  border: 1px solid $dark-grey;
  border-radius: 15px;
  background-color:$white ;

  &__contant {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  &__top,
  &__bottom {
    display: flex;
    gap: 16px;
  }

  &__top {
    width: 100%;

    &--left,
    &--right {
      display: flex;
      width: 100%;
      max-width: calc(50% - 8px);
    }

    &--switch {
      justify-content: space-around;
      align-items: center;
    }
  }

  &__bottom {
    &--left,
    &--right {
      display: flex;
      width: 100%;
    }
  }
}

.label__container {
  display: flex;
  flex-direction: column;
  pointer-events: none;
}

.label__text {
  font-size: 15px;
  font-weight: 600;
  color: $strong-grey;
}

.accordion__contant {
  padding-top: 0.5rem;
  border-top: 1px solid $dark-grey;
}
</style>
