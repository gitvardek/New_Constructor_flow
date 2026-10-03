<script setup lang="ts">
import Accordion from "@/components/ui/accordion/Accordion.vue";
import MainInput from "@/components/ui/inputs/MainInput.vue";

import { TFasadeSize } from "@/types/types";
import { TIncomeFasadeSize } from "./composables/useFasadeSize";

interface IProps {
  sizeList: TFasadeSize[];
  currentSize: TFasadeSize | null;
  incomeSize: TIncomeFasadeSize;
}

const props = defineProps<IProps>();

const emit = defineEmits<{
  (e: "select-size", value: TFasadeSize): void;
  (e: "update-width", value: string | number): void;
}>();

const onSelectSize = (size: TFasadeSize, onToggle: () => void) => {
  emit("select-size", size);
  onToggle();
};
</script>

<template>
  <!-- Два корневых элемента: оба — отдельные элементы flex-ряда конфигурации -->
  <div v-if="props.sizeList.length > 0">
    <Accordion :open="false">
      <template #title>
        <div class="accordion__title">
          <p>Размер</p>
          <p>{{ props.currentSize?.NAME }}</p>
        </div>
      </template>

      <template #params="{ onToggle }">
        <ul class="accordion__contnt">
          <li class="accordion__text" v-for="(size, key) in props.sizeList" :key="key + size.NAME"
            @click="onSelectSize(size, onToggle)">
            {{ size.NAME }}
          </li>
        </ul>
      </template>
    </Accordion>
  </div>

  <MainInput v-if="props.incomeSize.min && props.incomeSize.max" :inputClass="'input__search right-menu'"
    :type="'number'" :min="props.incomeSize.min" :max="props.incomeSize.max" :modelValue="(props.incomeSize.width as number)"
    @update:modelValue="(value) => emit('update-width', value)" />
</template>

<style lang="scss" scoped>
.accordion {
  padding: 0.5rem 1rem;
  border: none;
  box-shadow: 4px 4px 4px 4px rgba(34, 60, 80, 0.11);
  transition-property: box-shadow;
  transition-duration: 0.25s;
  transition-timing-function: ease;

  &__contnt {
    padding-top: 0.5rem;
    border-top: 1px solid #a3a9b5;
  }

  &__text {
    cursor: pointer;
    transition-property: color;
    transition-duration: 0.25s;
    transition-timing-function: ease;

    @media (hover: hover) {

      /* when hover is supported */
      &:hover {
        color: $dark-grey;
      }
    }
  }

  @media (hover: hover) {
    &:hover {
      box-shadow: 4px 4px 4px 4px #a3a9b5;
    }
  }
}
</style>
