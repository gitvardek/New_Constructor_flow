<script lang="ts" setup>
//@ts-nocheck
import { onBeforeMount, computed, ref, defineProps, withDefaults } from "vue";
import { useOptions } from "./useOptions";

interface IProps {
  mechanizmList?: [];
  umMechanizm?: boolean;
  element?: any;
  segment?: any;
}

const props = withDefaults(defineProps<IProps>(), {
  umMechanizm: false,
});

const { createOptionList, checkActive } = useOptions();
const optionList = ref([]);

const createList = () => {
  if (!props.umMechanizm) {
    const { data } = createOptionList();
    optionList.value = data;
    return;
  }

  optionList.value = props.mechanizmList;
};

const changeValue = (event: InputEvent, id: number) => {
  if (!props.umMechanizm) {

    const check = event.target!.checked;
    checkActive(id, check);
    createList();
    return;
  }
  UMMechanizmChange(event, id);
};

const UMMechanizmChange = (event: InputEvent, id: number) => {
  activateMechanismAndDeactivateOthers(optionList.value, id)

  // const curMech = props.element.MECHANISM_TEMP.find((el) => el.ID == id);
  // props.element.MECHANISM_TEMP.forEach((mech) => {
  //   if (mech.close === curMech.close && mech.id !== curMech.ID) {
  //     mech.active = false;
  //   }
  // });
  props.segment.MECHANISM = parseInt(id)
  // console.log(props.element, '-----element');

  // props.element.material.MECHANISM = parseInt(id);
};

const activateMechanismAndDeactivateOthers = (data, targetId) => {
  const searchId = String(targetId);
  let targetFound = false;
  let otherActiveExists = false;

  for (const group of data) {
    for (const item of group.CONTANT) {
      if (item.ID === searchId) {
        targetFound = true;

        item.active = true;
      } else if (item.active === true) {
        otherActiveExists = true;
      }
    }
  }

  if (!targetFound) {
    return false;
  }

  if (otherActiveExists) {
    for (const group of data) {
      for (const item of group.CONTANT) {
        if (item.ID !== searchId && item.active === true) {
          item.active = false;
        }
      }
    }
  }

  return true;
};

onBeforeMount(() => {
  createList();
});
</script>
<template>
  <div class="rails">
    <div
      class="rails__container"
      v-for="(item, key) in optionList"
      :key="item.NAME + key"
    >
      <h3 class="rails__title">{{ item.NAME }}</h3>
      <div class="option__checkbox" v-for="(option, key) in item.CONTANT">
        <label class="control control-checkbox" v-if="option.visible">
          <input
            type="checkbox"
            :checked="option.active"
            @change="changeValue($event, option.ID)"
            :disabled="option.disabled"
          />
          <span class="control_indicator"></span>
          <span class="text-lg text-gray-800 font-medium">{{
            option.NAME
          }}</span>
          <span class="text-lg text-gray-800 font-medium" v-if="option.cutSize"
            >&emsp;{{ option.cutSize }} + {{ option.cutSize }}</span
          >
        </label>
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
  }

  &__container {
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #ecebf1;
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
</style>
