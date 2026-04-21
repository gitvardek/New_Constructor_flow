<script setup lang="ts">
// @ts-nocheck
import { computed, ref, toRefs, withDefaults, onBeforeMount, watch } from "vue";
import { SERVISE_ERRORS } from "@/ConstructorTabletop/CutterScripts/CutterConst";
import { useKromkaActions } from "../Kromka/useKromkaActions";
import KromkaCard from "../Kromka/KromkaCard.vue";
import MainInput from "@/components/ui/inputs/MainInput.vue";
import Tooltip from "./Tooltip.vue";

interface Props {
  profileData: any[];
  serviseData: any[];
  currentSection: Record<string, any>;
  step?: number;
  isUM?: boolean;
}

const kromkaActions = useKromkaActions();
const { getCurretKromkaList, getKromkaActive, checkKromkaActive, getCurretKromkaListUM } =
  kromkaActions;

const props = withDefaults(defineProps<Props>(), {
  step: 1,
  isUM: false,
});

const emit = defineEmits([
  "cut-profileData",
  "cut-toggleCutServise",
  "cut-servisData",
  "cut-updateServise",
]);

const cutServisShow = ref(false);
const profileDataParse = ref<any[] | null>(null);
const serviseDataParse = ref<any[] | null>(null);

const cutChacked = (event: Event, item: Record<string, string>) => {
  emit("cut-servisData", event.target.checked, item);
};

const profileChacked = (event: Event, profile: Record<string, string>) => {
  // console.log(profile, ' ==== profile ====')

  emit("cut-profileData", event.target.checked, profile);
};

const toggleCutServise = () => {
  cutServisShow.value = !cutServisShow.value;
  emit("cut-toggleCutServise", cutServisShow.value);
};

const getMaxWidth = computed(() => {
  const sectionWidth = props.currentSection.currentRow.width;

  if (sectionWidth < 1600) {
    return sectionWidth - 30;
  }
  return 1600;
});

const updateEuroWidth = (event: Event, type: string) => {
  const typeLow = type.toLowerCase();
  // if (event!.target!.value <= 1) event!.target!.value = 1;
  // if (event!.target!.value <= 1) event!.target!.value = 1;

  emit("cut-updateServise", event, typeLow);
};

const getContainerHeight = computed(() => {
  return {
    full: props.profileData.length == 0,
  };
});

const checkDefaultProfile = computed(() => {
  return (value, id) => {
    // if (id === 251698) return true;
    return value;
  };
});

const profileData = computed(() => {
  if (props.profileData() > 0) return profileDataParse.value;
});

onBeforeMount(() => {
  if (props.isUM) {
    getCurretKromkaListUM(props.currentSection?.TABLE);
  }
  else {
    getCurretKromkaList();
  } // profileDataParse.value = props.profileData();
});

watch(
  () => props,
  () => {
    // console.log("serviseData");
  }
);
</script>

<template>
  <div class="splitter-container--cut">

    <div v-if="!isUM">
      <div :class="['splitter-container--cut-header', getContainerHeight]">
        <h3 class="splitter-title">Услуги</h3>
        <button class="actions-btn actions-icon" @click="toggleCutServise">
          <img class="actions-icon--close" src="/icons/close.svg" alt="" />
        </button>
      </div>

      <div :class="['splitter-container--cut-servise', getContainerHeight]">
        <div
            v-for="(item, key) in props.serviseData"
            :key="key + item.NAME"
            :class="['cut-servise--item', { error: item.error }]"
        >
          <div
              :class="['cut-servise--wrapper', { error: item.error }]"
              v-if="item.visible"
          >
            <label class="control control-checkbox">
              <input
                  type="checkbox"
                  :checked="item.value"
                  @change="cutChacked($event, item)"
              />
              <span class="control_indicator"></span>
              <span class="text-lg text-gray-800 font-medium">{{
                  item.NAME
                }}</span>
            </label>

            <Tooltip
                v-if="item.error"
                :theme="'dark'"
                :content="`${SERVISE_ERRORS[item.error]}`"
            >
              <template #trigger>
                <button class="actions-btn actions-icon">
                  <img class="actions-icon--help" src="/icons/help.svg" alt="" />
                </button>
              </template>
              <template #content> </template>
            </Tooltip>
          </div>

          <div class="actions-inputs" v-if="item.EURO_WIDTH && item.value">
            <p class="actions-title">Ширина</p>
            <div class="actions-input--container">
              <MainInput
                  :inputClass="'actions-input'"
                  v-model="item.EURO_WIDTH"
                  :min="200"
                  :max="getMaxWidth"
                  :type="'number'"
                  @update:modelValue="
                (newValue) => updateEuroWidth(newValue, item.NAME)
              "
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      class="splitter-container--cut-header"
      v-if="props.profileData?.length > 0"
    >
      <div class="splitter-container--cut-header">
        <h3 class="splitter-title">Профиль</h3>
      </div>
    </div>

    <div
      class="splitter-container--cut-servise"
      v-if="props.profileData?.length > 0"
    >
      <div
        class="'cut-servise--item'"
        v-for="(profile, key, ndx) in props.profileData"
        :key="profile.NAME + ndx"
      >
        <div :class="['cut-servise--wrapper']">
          <label class="control control-checkbox">
            <input
              type="checkbox"
              :checked="profile.value"
              :disabled="profile.ID === 251698 && profile.value"
              @change="profileChacked($event, profile)"
            />
            <span class="control_indicator"></span>
            <span class="text-lg text-gray-800 font-medium">{{
              profile.NAME
            }}</span>
          </label>
        </div>
      </div>
    </div>

    <slot name="kromkaSelect" v-if="getKromkaActive"> </slot>

    <!-- <KromkaCard v-if="checkKromkaActive()"/> -->
  </div>
</template>

<style lang="scss" scoped>
.splitter {
  &-container {
    &--cut {
      &-servise {
        display: flex;
        flex-direction: column;
        padding: 0 10px 10px 10px;
        gap: 5px;
        overflow-y: scroll;

        // height: 100%;
        // max-height: 60%;

        border-bottom: 1px solid #ecebf1;

        &::-webkit-scrollbar {
          width: 5px;
          /* Ширина скроллбара */
        }

        &::-webkit-scrollbar-button {
          display: none;
          /* Убираем стрелки */
        }

        &::-webkit-scrollbar-thumb {
          background: #888;
          /* Цвет ползунка */
          border-radius: 4px;
        }

        &.full {
          max-height: 100%;
        }
      }
    }
  }
}

.cut-servise {
  &--item {
    display: flex;
    flex-direction: column;
    // padding: 0 5px 5px 5px;
    border-radius: 5px;
    &.error {
      background-color: #d56b6b32;
    }
  }

  &--wrapper {
    display: flex;
  }
}
</style>
