<script lang="ts" setup>
//@ts-nocheck
import { onBeforeMount, computed, ref } from "vue";
import { useOptions } from "./useOptions";
import { TRootOptionType } from "@/types/types";
import {_URL} from "@/types/constants.ts";


const { createOptionList, checkActive } = useOptions();
const optionList = ref([]);
const countLimit = ref(3)

const createList = () => {
  const { data } = createOptionList();
  optionList.value = data;

};

const changeValue = (event: InputEvent, option: TRootOptionType) => {
  // console.log('AUF', id)

  const check = event.target!.checked;
  event.target.checked = checkActive(option, check);
  createList();
};

onBeforeMount(() => {
  createList();
});
</script>
<template>
  <div class="rails">
    <div class="accordion">
      <div
          class="rails__container"
          v-for="(item, key) in optionList"
          :key="item.NAME + key"
      >
        <details
            :class="['item-group', {base_open: item.CONTANT.length <= countLimit || !item.NAME}]"
            :open="item.CONTANT.length <= countLimit || !item.NAME"
        >
          <summary
              :class="[{base_open: item.CONTANT.length <= countLimit || !item.NAME}]"
          >
            <h3 class="rails__title">
              {{ item.NAME }}
            </h3>
          </summary>

          <div class="item-group-wrapper">
            <div
                class="option__checkbox"
                v-for="(option, key) in item.CONTANT"
                :key="key + option.NAME"
            >
              <label class="control control-checkbox" v-if="option.visible">
                <input
                    type="checkbox"
                    :checked="option.active"
                    @change="changeValue($event, option)"
                    :disabled="option.disabled"
                />
                <span class="control_indicator"></span>
                <span class="text-lg text-gray-800 font-medium">{{
                    option.NAME
                  }}</span>
              </label>
            </div>
          </div>
        </details>
      </div>
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
    font-size: 18px;
    font-weight: 600;
    color: #a3a9b5;
  }

  &__container{
    padding-bottom: 0.5rem ;
    border-bottom: 1px solid #ecebf1;
  }

}

.item-group {
  display: flex;
  flex-direction: column;
  margin-right: 10px;

  &-wrapper {
    overflow-y: scroll;
    max-height: 72vh;
    width: 16vw;

    pointer-events: auto;
    user-select: auto;
  }
}

.option {
  &-label {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
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
    padding: 10px;
    border-radius: 15px;
    background-color: $bg;
  }

  &-standart {
    width: 100%;
    padding: 10px;
    border-radius: 15px;
    background-color: $bg;
  }

  &-standart {
    width: 100%;
    padding: 10px;
    border-radius: 15px;
    background-color: $bg;
  }
}

.accordion {
  -webkit-user-select: none; /* Safari */
  -ms-user-select: none;     /* IE 10+ и Edge */
  user-select: none ;         /* Стандарт: Chrome, Firefox, Opera, Edge */

  border: unset;
  overflow-y: scroll;
  max-height: 85vh;

  details {
    position: relative;
    margin: 16px 0;
    padding: 15px 50px 15px 15px;
    border: 1px solid #a3a9b5;
    border-radius: 15px;
    @media (hover: hover) {
      /* when hover is supported */
      &:hover {
        border-color: #da444c;
      }
    }
  }

  .base_open{
    border: unset;
    pointer-events: none; /* Prevents click events */
    user-select: none;   /* Prevents text selection */
  }

  details summary {
    font-weight: bold;
    list-style: none;
    cursor: pointer;

  }

  details[open] {
    border-color: #da444c;
  }

  details summary::-webkit-details-marker {
    display: none;
  }

  details summary::before {
    content: "\276F";
    position: absolute;
    right: 1rem;
    top: 1rem;
    display: inline-block;
    transform: rotate(90deg);
    transition: transform 0.2s ease-in-out;
  }

  details summary.base_open::before {
    display: none;
    pointer-events: none; /* Prevents click events */
    user-select: none;   /* Prevents text selection */
  }

  details[open] summary::before {
    transform: rotate(-90deg);
  }
}

</style>
