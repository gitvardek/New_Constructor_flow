<script lang="ts" setup>
//@ts-nocheck
import { useFigurePlinth } from "./useFigurePlinth";

const { checkActive } = useFigurePlinth();


const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
});

const changeValue = (event: InputEvent, key: string) => {
  const check = event.target!.checked;
  checkActive(check, key);
};
</script>
<template>
  <div class="rails">
    <div
      class="option__checkbox"
      v-for="(item, key, ndx) in props.data"
      :key="item.NAME + key"
    >
      <label class="control control-checkbox">
        
        <input
          type="checkbox"
          :checked="item.value"
          @change="changeValue($event, key, ndx)"
        />
        <span class="control_indicator"></span>
        <span class="text-lg text-gray-800 font-medium">{{ item.label }}</span>
      </label>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.rails {
  max-height: calc(100vh - 220px);
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: scroll;

  &__title {
    margin-right: 50px;
    font-size: 1.8rem;
    font-weight: 600;
  }
}

.option {
  &-label {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 1rem;
    border-radius: 15px;
    transition-property: background-color;
    transition-duration: 0.25s;
    transition-timing-function: ease;
    cursor: pointer;

    @media (hover: hover) {
      &:hover {
        .label__text {
          color: $black;
        }

        // background-color: $stroke;
      }
    }
  }

  &-small {
    flex: 46%;
    padding: 1rem;
    border-radius: 15px;
    background-color: $bg;
  }

  &-standart {
    width: 100%;
    padding: 1rem;
    border-radius: 15px;
    background-color: $bg;
  }

  &-standart {
    width: 100%;
    padding: 1rem;
    border-radius: 15px;
    background-color: $bg;
  }
}
</style>
