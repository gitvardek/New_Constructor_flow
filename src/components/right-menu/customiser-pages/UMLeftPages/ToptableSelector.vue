<script lang="ts" setup>
//@ts-nocheck
import MaterialSelector from "@/components/right-menu/customiser-pages/ColorRightPage/MaterialSelector.vue";
import ConfigurationOption from "@/components/right-menu/customiser-pages/ColorRightPage/ConfigurationOption.vue";
import {
  ref,
  onMounted,
  onBeforeMount,
  toRefs, onBeforeUnmount, computed,
} from "vue";
import {useModelState} from "@/store/appliction/useModelState.ts";
import {useEventBus} from "@/store/appliction/useEventBus.ts";
import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import SurfaceRedactor from "@/components/right-menu/customiser-pages/ColorRightPage/SurfaceRedactor.vue";
import FillingsRedactor from "@/components/right-menu/customiser-pages/ColorRightPage/FillingsRedactor.vue";
import KromkaCard from "@/ConstructorTabletop/Kromka/KromkaCard.vue";
import CutServise from "@/ConstructorTabletop/OptionsMenu/CutServise.vue";
import {useKromkaActions} from "@/ConstructorTabletop/Kromka/useKromkaActions.ts";
import {TToptableUMProp} from "@/types/types.ts";

type TFilling = "TABLE" | "any";

const props = defineProps({
  module: {
    type: Object,
    default: {},
    required: true,
  },
  productList: {
    type: Array,
    default: [],
    required: true,
  },
  UMconstructor: {
    type: UMconstructorClass,
    required: true,
  },
  type: {
    type: <TFilling>String,
    required: true,
  }
});
const {module, productList, UMconstructor} = toRefs(props);

const materialList = ref([]);
const selectedTable = ref<TToptableUMProp | null>(null);

const currentSurfaceData = ref<any>({});
const emit = defineEmits(["parent-callback"]);
const tempProfile = ref(null);
const kromkaActions = useKromkaActions();
const {
  checkKromkaActiveUM,
  getKromkaActive,
  getKromkaCardData,
  kromkaCardSelect,
  getCurretKromkaListUM,
  getKromkaCardSelect,
  setProfileData,
  setKromkaId,
  getKromkaList,
  kromkaSelect,
  getCurrentKromkaId,
  clearKromkaData,
} = kromkaActions;


const callback = (data: any, type: TFilling) => {
  emit("parent-callback", data, type);
};
onBeforeMount(() => {
  getCurrentTable()

  if (productList?.value?.length) {
    materialList.value = [...productList.value]
  } else
    materialList.value = []
});

onMounted(() => {
  getCurrentTable()

  if (selectedTable.value) {
    let current
    if (materialList.value[0]?.PRODUCTS) {
      for (let item of materialList.value) {
        let PRODUCTS: Array = item.PRODUCTS

        current = PRODUCTS!.find(
            (m) => m.ID == selectedTable.value.TABLE
        );

        if (current)
          break;
      }
    } else
      current = materialList.value!.find(
          (m) => m.ID === selectedTable.value.TABLE
      );

    if (current) {
      currentSurfaceData.value = {
        name: current.NAME,
        imgSrc: current.DETAIL_PICTURE || current.PREVIEW_PICTURE,
        id: current.ID,
      };

      if (current.profile?.length) {
        const {profile} = UMconstructor.value.BUILDER.filters.filterUslugi(current.USLUGI, current);
        tempProfile.value = profile
        setProfileData(tempProfile.value);

        if (selectedTable.value?.PROFILE) {
          const curProfile = tempProfile.value.find((el) => el.ID === selectedTable.value.PROFILE);
          if(curProfile)
            convertProfileData(true, curProfile);
        }

        getCurrentTable()
      }
    }
  } else {
    currentSurfaceData.value = {}
  }

});

const changeTable = (data: any) => {
  currentSurfaceData.value = {
    name: data.NAME,
    imgSrc: data.DETAIL_PICTURE || data.PREVIEW_PICTURE,
    id: data.ID,
  };
  clearKromkaData();
  changeKromka(null)
  changeProfile(null)

  if (data.profile?.length) {
    const {profile} = UMconstructor.value.BUILDER.filters.filterUslugi(data.USLUGI, data);
    tempProfile.value = profile
    setProfileData(tempProfile.value);
  }

  callback(data, props.type)
  getCurrentTable()
};

const getCurrentTable = () => {
  const UM_data = UMconstructor?.value?.UM_STORE.getUMData()
  const TOPFASADECOLOR = UM_data?.CONFIG['TOPFASADECOLOR'];
  selectedTable.value = TOPFASADECOLOR?.TABLE ? TOPFASADECOLOR : null;

  if (typeof selectedTable.value?.KROMKA != "undefined") {
      setKromkaId(selectedTable.value.KROMKA);
  }
}

const clearTable = () => {
  changeTable({})
};

//#region Опции и кромки
const createProfileServices = () => {
  /** Отладка */

  // console.log(modelState._PROFILE, "---Profile");

  /*---------------*/
  if (!tempProfile.value.length > 0)
    return null;

  const activeProfile = selectedTable.value?.PROFILE || tempProfile.value.find((prof) => prof.value);

  if (activeProfile.show_props && activeProfile.show_props?.includes("hem")) {
    getCurretKromkaListUM(selectedTable.value?.TABLE);
  }

  return [];
};

const checkProfileDisablegroups = () => {
  const curProfileServise = createProfileServices();
  if (!curProfileServise)
    return;

  checkKromkaActiveUM(selectedTable.value);

  if (getKromkaActive.value) {
    getCurretKromkaListUM(selectedTable.value?.TABLE);
    changeKromka(getCurrentKromkaId())
  }
  else {
    changeKromka(null)
  }
};

const convertProfileData = (value, item) => {
  const curProfile = tempProfile.value?.find((el) => el.ID === item.ID);

  if (!curProfile) {
    return;
  }

  if (curProfile.ID === 251698 && curProfile.value) {
    changeProfile(curProfile.ID)
    checkProfileDisablegroups();
    return;
  }

  // Основное обновление
  tempProfile.value.forEach((profile) => {
    profile.value = profile.ID === item.ID ? value : false;
  });

  //  Если всё выключено — включаем дефолт
  if (tempProfile.value.every((p) => !p.value)) {
    const defaultProfile = tempProfile.value.find((p) => p.ID === 251698);
    if (defaultProfile) {
      defaultProfile.value = true;
    }
  }

  changeProfile(curProfile.ID)
  checkProfileDisablegroups();
};

const convertServisData = (value, item) => {
  return;
};

const getCurrentSectionServiseData = computed(() => {
  return [];
});

const updateServiseWidth = (value, type) => {
  return;
};

const getCurrentSection = computed(() => {
  return selectedTable.value;
});

const toggleCutServise = (colIndex, rowIndex) => {
  return
};

const changeKromka = (value) => {
  callback(value, "KROMKA")
  setKromkaId(value)
}

const changeProfile = (value) => {
  callback(value, "PROFILE")
}

//#endregion

onBeforeUnmount(() => {
  tempProfile.value = null
  selectedTable.value = null;
  clearKromkaData()
})
</script>

<template>
  <div class="container container">
    <h1 class="color__title">Столешница: </h1>

    <div class="configuration">
      <ConfigurationOption
          :type="'toptable'"
          :data="currentSurfaceData"
          @delete-choise="clearTable"
      />
    </div>
    <FillingsRedactor
        :product-list="materialList"
        :temp-work="true"
        @parent-callback="changeTable"
    />

    <transition name="slide--right">
      <div
          class="kromka__container"
          v-if="getKromkaActive && getKromkaCardSelect"
      >
        <MaterialSelector :materials="getKromkaList" @select="(value) => {
          kromkaSelect(value)
          changeKromka(value)
        }"/>
      </div>
    </transition>

    <CutServise
        v-if="selectedTable?.SHOW"
        :isUM="true"
        :profile-data="tempProfile"
        :servise-data="getCurrentSectionServiseData"
        :current-section="getCurrentSection"
        @cut-toggleCutServise="toggleCutServise"
        @cut-servisData="convertServisData"
        @cut-updateServise="updateServiseWidth"
        @cut-profileData="convertProfileData"
    >
      <template #kromkaSelect>
        <KromkaCard
            :data="getKromkaCardData"
            @kromka-kard-select="kromkaCardSelect"
        />
      </template>
    </CutServise>
  </div>
</template>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  gap: 15px;
  border: 1px solid $stroke;
  border-radius: 10px;
  padding: 15px;
  max-height: 100vh;
  overflow: hidden;
  box-sizing: border-box;

  &__title {
    font-size: large;
    font-weight: 600;
  }
}

.configuration {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 8px;

  &__item {
    height: 50px;
    border: 1px solid grey;
    border-radius: 5px;
  }

  @media (min-height: 1000px) {
    gap: 17px;
  }
}
</style>
