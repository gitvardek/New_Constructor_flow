<script setup lang="ts">
import { computed } from "vue";
import Accordion from "@/components/ui/accordion/Accordion.vue";
import {
  TONE_MAPPING_LIST,
  getToneMappingLabel,
} from "@/Application/Core/toneMapping";

const props = defineProps<{ toneMapping: number }>();

const emit = defineEmits<{ (e: "apply", value: number): void }>();

const currentLabel = computed(() => getToneMappingLabel(props.toneMapping));

const select = (value: number, onToggle: () => void) => {
  onToggle();

  if (value === props.toneMapping) return;

  emit("apply", value);
};
</script>

<template>
  <div class="room-tone">
    <Accordion>
      <template #title>
        <div class="label__container">
          <p class="label__text label__text--xs">Тоновое отображение</p>
          <p class="label__text">{{ currentLabel }}</p>
        </div>
      </template>

      <template #params="{ onToggle }">
        <ul class="tone-list">
          <li
            v-for="item in TONE_MAPPING_LIST"
            :key="item.value"
            :class="['label__text', 'tone-list__item', { 'tone-list__item--active': item.value === toneMapping }]"
            @click="select(item.value, onToggle)"
          >
            {{ item.label }}
          </li>
        </ul>
      </template>
    </Accordion>
  </div>
</template>

<style lang="scss" scoped>
.accordion{
  padding: 1rem;
}
.room-tone {
  display: flex;
  width: 100%;
}

.tone-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-top: 0.5rem;

  &__item {
    cursor: pointer;

    &--active {
      color: $red;
      font-weight: 600;
    }
  }
}

.label {
  &__container {
    display: flex;
    flex-direction: column;
    pointer-events: none;
  }

  &__text {
    font-size: 1.4rem;
    font-weight: 600;
    color: $strong-grey;
    transition-property: color;
    transition-duration: 0.25s;
    transition-timing-function: ease;

    &--xs {
      color: $dark-grey;
      font-size: clamp(9px, 0.78125vw + 1px, 14px) !important;
    }
  }
}
</style>
