<template>
  <div class="basket-item">
    <div class="basket-item__picture">
      <div class="basket-item__picture-container">
        <img :src="`${API_URL + item?.product.PREVIEW_PICTURE}`" alt="" class="basket-items__picture_img" />
        <img src="@/assets/svg/left-menu/question.svg" class="basket-items__picture-question"
          @click="openPopup(item)" />
      </div>
    </div>

    <div class="basket-item__product">
      <h3 :class="item?.error ? 'basket-item__product-name--error' : ''">
        {{ item?.product.NAME }}
        <span v-if="isFeedbackProject">{{
          getArticleByProductId(item?.product.ID)
        }}</span>
        <span v-if="item?.error"> (НЕДОСТУПНО!)</span>
      </h3>

      <BasketItemProps :item="item" />
    </div>

    <div class="basket-item__quantity">
      <button v-if="item?.product.TYPE === 'catalog'" class="basket-item__quantity-btn"
        @click="decrement(item.product.BASKETID, item?.product.TYPE)" :disabled="item.error">
        -
      </button>
      <input type="text" :disabled="item?.product.TYPE !== 'catalog'" class="basket-item__quantity-input"
        v-model="item.product.quantity" placeholder="1" @change="
          () => updateQuantity(item.product.BASKETID, item?.product.TYPE)
        " />
      <button v-if="item?.product.TYPE === 'catalog'" class="basket-item__quantity-btn"
        @click="increment(item.product.BASKETID, item?.product.TYPE)" :disabled="item.error">
        +
      </button>
    </div>

    <div class="basket-item__price">
      {{ item.product.unitPriceFormat ?? 0 }}
      <!-- {{ !oldPrice ? item.product.unitPriceFormat :  item.product.unitPriceOldFormat }}  -->
    </div>

    <div class="basket-item__price basket-item__total">
      <!-- {{ item.product.allPriceFormat ?? 0}} -->
      {{ item.product.allPriceFormat ?? 0 }}
      <!-- {{ !oldPrice ? item.product.allPriceFormat : item.product.allPriceOldFormat}} -->
    </div>

    <div class="basket-item__price basket-item__old-total" v-if="!oldPrice">
      <span>{{ item.product.allPriceOldFormat ?? 0 }}</span>
    </div>

    <div class="basket-item__price basket-item__action" v-if="isNonDelete">

      <button v-if="item?.product.TYPE === 'scene' || item?.product.TYPE === 'umscene'" class="basket-item__goto-btn"
        @click="goToObject">Показать</button>
      <!-- Тумбочка удаляется только в редакторе гардеробной: своего объекта на сцене у неё нет -->
      <DeleteBasketButton v-if="!cabinetParentBasketId" @click="
        deleteProductInBusket(item.product.BASKETID, item?.product.TYPE)
        " />
    </div>
    <InfoPopUp v-if="isShowInfoPopup" @close="closeInfoPopup" v-bind="currentProductInfo" />
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { useBasketStore } from "@/store/appStore/useBasketStore";
import { ref, computed, onBeforeMount } from "vue";
import DeleteBasketButton from "../ui/buttons/basket/DeleteBasketButton.vue";
import axios from "axios";
import InfoPopUp from "../popUp/InfoPopUp.vue";
import BasketItemProps from "./BasketItemProps.vue";
import { _URL } from "@/types/constants";
import { getCabinetParentBasketId } from "./helper/basketMapper";
import { useEventBus } from "@/store/appliction/useEventBus";
import { useConfigStore } from "@/store/appStore/useConfigStore";
import { BASE_DOMAIN } from "@/utils/originalDomain";
import { usePopupStore } from "@/store/appStore/popUpsStore";

// const API_URL = ref('https://dev.vardek.online');
const API_URL = ref(`https://${BASE_DOMAIN}`);
const hideDeleteList = ref<(string | number)[]>(['plinth', 'tabletop'])

interface Props {
  item: any;
}

const isShowInfoPopup = ref(false);

const currentProductInfo = ref({
  title: "",
  description: "",
  image: "",
});

const props = defineProps<Props>();
const basketStore = useBasketStore();
const popupStore = usePopupStore();
const quantity = ref(props.item.product.quantity);
const { oldPrice, isFeedbackProject, getArticleByProductId } = useConfigStore();

onBeforeMount(() => {

});

const openPopup = async (item) => {
  try {
    const { data } = await axios.post(`/api/modeller/product/getbyid/`, {
      ID: item.product.ID,
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
      images: PROPERTY_IMAGES_VALUE,
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

const getImageUrl = (imageName: string) => {
  return ` ${_URL}${imageName}`;
};


function increment(id: string, type: string) {
  quantity.value++;
  updateQuantity(id, type);
}

function decrement(id: string, type: string) {
  if (quantity.value > 1) {
    quantity.value--;
    updateQuantity(id, type);
  }
}

function updateQuantity(id: string, type: string) {
  basketStore.updateQuantity(id, type, quantity);
}

// BASKETID гардеробной, если это строка её тумбочки
const cabinetParentBasketId = computed(() =>
  getCabinetParentBasketId(props.item.product.BASKETID),
);

const goToObject = () => {
  popupStore.closePopup('basket');
  if (props.item.product.TYPE === 'scene' || props.item.product.TYPE === 'umscene') {
    // У тумбочки объекта на сцене нет — выделяем гардеробную, в которой она стоит
    const basketId = cabinetParentBasketId.value ?? props.item.product.BASKETID;
    useEventBus().emit('A:SelectFromBasket', { basketId });
  }
};

const deleteProductInBusket = (id: string, type: string) => {

  if (type === "scene" || type === "umscene") {
    useEventBus().emit("A:RemoveModelFromBasket", {
      product: null,
      basketId: id,
    });
  }
  basketStore.removeFromBasket(id, type);
  basketStore.syncBasketDelay();
};


const isNonDelete = computed(() => {

  return !hideDeleteList.value.includes(String(props.item.product.BASKETID))

})
</script>

<style scoped lang="scss">
.basket-item {
  display: grid;
  grid-template-columns: 150px 1fr 75px 135px 135px 135px 135px;
  align-items: center;
  gap: 10px;
  padding: 15px 0;

  &:not(:last-child) {
    border-bottom: 1px solid #eee;
  }

  &__product-name--error {
    color: red !important;
  }

  @media (max-width: 768px) {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    padding: 12px;
    border: 1px solid #eee;
    border-radius: 10px;
    background: #fafafa;
  }

  &__goto-btn {
    width: 100%;
    padding: 4px 0;
    background: #ecebf1;
    border: none;
    border-radius: 6px;
    font-size: 1.2rem;
    color: $dark-grey;
    cursor: pointer;
    transition: background, color, 0.15s;

    &:hover {
      background: $dark-grey;
      color: $black;
    }
  }

  &__picture {
    margin-bottom: auto;
    text-align: center;
    max-width: 130px;
    max-height: 130px;
    border-radius: 8px;
    overflow: hidden;

    &-container {
      position: relative;
    }

    & img:first-child {
      width: 100%;
    }

    & img:last-child {
      position: absolute;
      right: 7px;
      top: 10px;
      cursor: pointer;
    }
  }

  &__product h3 {
    color: #111b21;
    font-size: 1.4rem;
    margin-bottom: 4px;
  }

  &__quantity {
    display: flex;
    align-items: center;
    gap: 6px;
    justify-content: center;

    &-input {
      width: 30px;
      height: 30px;
      text-align: center;
      background-color: #f6f5fa;
      border: 1px solid #ecebf1;
      font-weight: 500;
      font-size: 1.4rem;
      line-height: 100%;
      letter-spacing: 0%;
      vertical-align: middle;
      color: #111b21;
    }

    &-btn {
      background-color: transparent;
      border: none;
      color: #a3a9b5;
      font-size: 2rem;
    }
  }

  &__price {
    font-weight: 500;
    font-size: 1.2rem;
    line-height: 100%;
    letter-spacing: 0%;
    vertical-align: middle;
    color: #111b21;
    text-align: center;
  }

  &__old-total span {
    display: inline-block;
    position: relative;

    &::after {
      content: "";
      display: block;
      width: 100%;
      height: 1px;
      background-color: #111b21;
      position: absolute;
      top: 7px;
      left: 0;
    }
  }

  &__action {
    display: flex;
    gap: 1rem;
  }
}
</style>
