<script setup lang="ts">
// @ts-nocheck 31

import ClosePopUpButton from "@/components/ui/svg/ClosePopUpButton.vue";

import { useAppData } from "@/store/appliction/useAppData";
import { useConfigStore } from "@/store/appStore/useConfigStore";
import { useMenuStore } from "@/store/appStore/useMenuStore";
import InfoPopUp from "@/components/popUp/InfoPopUp.vue";
import { computed, ref, onBeforeMount } from "vue";

import { _URL } from "@/types/constants";
import axios from "axios";

const menuStore = useMenuStore();
const catalogProducts = useAppData().getAppData.CATALOG.PRODUCTS;
const { getAppData } = useAppData();
const { getArticleByProductId, isFeedbackProject } = useConfigStore();

const exeption = ref([
  1516913, 1516914, 6051066, 81768, 2370182, 81772, 11451679,
]); //3140746, 971222, 1814256б 166757

const props = defineProps<{
  filteredData: Array<any>;
}>();

const emit = defineEmits(["close-menu"]);

const currentProductInfo = ref({
  title: "",
  description: "",
  image: "",
});
const isShowInfoPopup = ref(false);

const filteredData = computed(() => {
  if (props.filteredData.length > 0) {
    return props.filteredData;
  }

  if (menuStore.catalogFilterProductsId) {
    return Object.values(catalogProducts)
      .filter((item) => {
        return (
          menuStore.catalogFilterProductsId.includes(item.ID) &&
          !exeption.value.includes(item.ID)
        );
      })
      .sort((a, b) => a.SORT - b.SORT);
  } else {
    console.log("empty");
  }
});

// const baseUrl = 'https://vardek.ru';

// Вариант статики
// const getImageUrl = (imageName: string) => {
//   return `${baseUrl}/${imageName}`;
// };

// Вариант Александра
const getImageUrl = (imageName: string) => {
  return ` ${_URL}${imageName}`;
};

const dropItems: { [key: string]: {} } = catalogProducts;

const onDrag = (event: any, model: { [key: string]: any } | string) => {
  event.dataTransfer?.setData("text", JSON.stringify(model));
};

const closeMenu = (menuType: MenuType) => {
  menuStore.closeMenu(menuType);
  emit("close-menu");
};

const openPopup = async (item) => {
  console.log(getAppData, "getAppData");
  try {
    const { data } = await axios.post(`/api/modeller/product/getbyid/`, {
      ID: item.ID,
    });

    const {
      NAME,
      DETAIL_TEXT,
      DETAIL_PICTURE,
      PREVIEW_PICTURE,
      PREVIEW_TEXT,
      PROPERTY_IMAGES_VALUE,
      PROPERTY_VIDEO_VALUE,
      PROPERTY_VIDEO_IMAGE_VALUE,
    } = data.DATA.response;

    currentProductInfo.value = {
      title: NAME,
      detailText: DETAIL_TEXT,
      previewText: PREVIEW_TEXT,
      image: getImageUrl(DETAIL_PICTURE),
      images: PROPERTY_IMAGES_VALUE.length
        ? PROPERTY_IMAGES_VALUE.map((image: string) => getImageUrl(image))
        : [],
      videoUrl: PROPERTY_VIDEO_VALUE,
      videoPoster: getImageUrl(PROPERTY_VIDEO_IMAGE_VALUE),
    };
    isShowInfoPopup.value = true;
  } catch (error) {
    console.error("API Error:", error);
  }
};

const closeInfoPopup = () => {
  isShowInfoPopup.value = false;
  currentProductInfo.value = {
    title: "",
    description: "",
    image: "",
  };
};

onBeforeMount(() => {
  console.log(props.filteredData);
});
</script>

<template>
  <div class="options-popup" :class="{ active: menuStore.openMenus == 'tech' }">
    <h1 class="popup__title">Основное</h1>
    <ClosePopUpButton class="menu__close" @close="closeMenu('tech')" />
    <div
      v-if="menuStore.catalogFilterProductsId || props.filteredData.length > 0"
      class="options-popup__container"
    >
      <div
        v-for="item in filteredData"
        class="popup-items"
        draggable="true"
        :key="item.name"
        @dragstart="onDrag($event, item)"
      >
        <div class="popup-items-picture">
          <img
            src="@/assets/svg/left-menu/question.svg"
            class="popup-items__question"
            @click="openPopup(item)"
          />
          <img
            :src="getImageUrl(item.PREVIEW_PICTURE)"
            class="popup-items__image"
          />
        </div>
        <p class="popup-items__title">
          {{ item.NAME }}
          <span v-if="isFeedbackProject">{{
            getArticleByProductId(item?.ID)
          }}</span>
        </p>
      </div>
    </div>
    <div v-else class="options-popup-isempty">
      Товары в каталоге отсутсвуют, обратитесь в поддержку
    </div>
    <InfoPopUp
      v-if="isShowInfoPopup"
      @close="closeInfoPopup"
      v-bind="currentProductInfo"
    />
  </div>
</template>

<style lang="scss" scoped>
.options-popup {
  max-width: 40rem;
  position: absolute;
  // top: 15px;
  // left: -840px;
  left: 320px;
  padding: 0.5rem;
  background: $white;
  box-shadow: 0px 0px 10px 0px #3030301a;
  z-index: -1;
  border-radius: 0.5rem;
  font-size: 1.4rem;
  // transition: 0.5s ease-in-out;
  // transform: translateZ(-10px);

  &-isempty {
    font-size: 1.4rem;
  }

  &__container {
    // display: flex;
    // flex-wrap: wrap;
    // gap: 12px;
    // flex: 1;
    display: grid;
    grid-template-columns: repeat(
      3,
      1fr
    ); /* Создает ровно 4 колонки одинаковой ширины */
    gap: 10px;
    padding: 0.5rem;
    padding-right: 0.85rem;
    overflow-y: auto;

    .popup-items {
      width: 10rem;
      // min-height: 7.5rem;
      display: flex;
      flex-direction: column;
      padding: 10px;
      background: #f6f5fa;
      border-radius: 15px;
      gap: 10px;

      cursor: pointer;
      box-shadow: 4px 4px 4px 4px rgba(34, 60, 80, 0);
      transition-property: box-shadow;
      transition-duration: 0.25s;
      transition-timing-function: ease;

      &__title {
        font-size: 1.4rem;
        font-weight: 500;
      }
      .popup-items-picture {
        position: relative;
        .popup-items__question {
          position: absolute;
          top: 0px;
          right: 0px;
          cursor: pointer;
        }
        .popup-items__image {
          height: 6rem;
          width: 6rem;
          padding: 10px;
          background: #ffffff;
          border-radius: 15px;
          object-fit: contain;
        }
      }

      @media (hover: hover) {
        &:hover {
          box-shadow: 4px 4px 4px 4px $light-stroke;
        }
      }
    }
  }

  &.active {
    left: 29rem;
    overflow-y: auto;
    min-height: 0;
    height: calc(100vh - 90px);
  }
}
</style>
