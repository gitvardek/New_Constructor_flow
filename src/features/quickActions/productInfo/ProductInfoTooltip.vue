<script setup lang="ts">
// @ts-nocheck
import { computed, nextTick, ref, watch } from "vue";

import { _URL } from "@/types/constants";
import { useProductInfoStore } from "@/store/appStore/useProductInfoStore";
import { useBasketStore } from "@/store/appStore/useBasketStore";
import { useAppData } from "@/store/appliction/useAppData";
import { useConfigStore } from "@/store/appStore/useConfigStore";
import BasketItemProps from "@/components/Basket/BasketItemProps.vue";

/**
 * Подсказка режима «Информация о товаре».
 * Товар под курсором приходит из useProductInfoStore (его пишет ProductInfoHover),
 * данные — позиция корзины с тем же BASKETID (== id объекта сцены).
 * Позиция — за курсором, с переворотом у краёв окна.
 */

const productInfo = useProductInfoStore();
const basketStore = useBasketStore();
const appDataStore = useAppData();
const config = useConfigStore();

const tipRef = ref<HTMLElement | null>(null);
const tipSize = ref({ width: 0, height: 0 });

const hovered = computed(() => productInfo.hovered);

const basketItem = computed(() => {
  const basketId = hovered.value?.basketId;
  if (!basketId) return null;

  const products = basketStore.basketData?.products ?? [];

  return (
    products.find(
      (item: any) => String(item?.product?.BASKETID) === String(basketId),
    ) ?? null
  );
});

const product = computed(() => basketItem.value?.product ?? null);

// Название: из корзины, иначе из каталога (декор и распил в корзину не попадают)
const name = computed(() => {
  if (product.value?.NAME) return product.value.NAME;

  const productId = hovered.value?.productId;
  if (!productId) return "";

  return appDataStore.getAppData?.CATALOG?.PRODUCTS?.[productId]?.NAME ?? "";
});

const article = computed(() => {
  if (!config.isFeedbackProject) return "";
  const productId = product.value?.ID ?? hovered.value?.productId;
  return productId ? config.getArticleByProductId(productId) : "";
});

const preview = computed(() => {
  const picture = product.value?.PREVIEW_PICTURE;
  return picture ? `${_URL}${picture}` : "";
});

const quantity = computed(() => product.value?.quantity ?? 1);
const unitPrice = computed(() => product.value?.unitPriceFormat ?? null);
const totalPrice = computed(() => product.value?.allPriceFormat ?? null);
const oldTotalPrice = computed(() => product.value?.allPriceOldFormat ?? null);
const hasError = computed(() => Boolean(basketItem.value?.error));

const visible = computed(
  () => productInfo.enabled && Boolean(hovered.value) && Boolean(name.value),
);

// Размер нужен, чтобы перевернуть подсказку у края окна
watch(
  () => [visible.value, hovered.value?.basketId, name.value],
  async () => {
    if (!visible.value) return;
    await nextTick();
    if (!tipRef.value) return;
    tipSize.value = {
      width: tipRef.value.offsetWidth,
      height: tipRef.value.offsetHeight,
    };
  },
  { immediate: true },
);

const tipStyle = computed(() => {
  const gap = 18;
  const edge = 8;

  const x = hovered.value?.x ?? 0;
  const y = hovered.value?.y ?? 0;

  const width = tipSize.value.width || 260;
  const height = tipSize.value.height || 120;

  let left = x + gap;
  let top = y + gap;

  if (left + width > window.innerWidth - edge) {
    left = Math.max(edge, x - gap - width);
  }
  if (top + height > window.innerHeight - edge) {
    top = Math.max(edge, y - gap - height);
  }

  return { left: `${left}px`, top: `${top}px` };
});
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" ref="tipRef" class="product-info-tip" :style="tipStyle">
      <div class="product-info-tip__head">
        <img v-if="preview" :src="preview" alt="" class="product-info-tip__img" />
        <div class="product-info-tip__title">
          <span>{{ name }}</span>
          <span v-if="article" class="product-info-tip__article">{{ article }}</span>
          <span v-if="hasError" class="product-info-tip__error">НЕДОСТУПНО!</span>
        </div>
      </div>

      <!-- Свойства позиции — тот же блок, что в карточке корзины -->
      <div v-if="product" class="product-info-tip__props">
        <BasketItemProps :item="basketItem" />
      </div>

      <div v-if="product" class="product-info-tip__rows">
        <!-- <div class="product-info-tip__row">
          <span>Количество</span>
          <b>{{ quantity }} шт</b>
        </div> -->
        <div v-if="unitPrice" class="product-info-tip__row">
          <span>Цена за шт</span>
          <b>{{ unitPrice }}</b>
        </div>
        <!-- <div v-if="totalPrice" class="product-info-tip__row">
          <span>Итого</span>
          <b>{{ totalPrice }}</b>
        </div>
        <div v-if="!config.oldPrice && oldTotalPrice" class="product-info-tip__row product-info-tip__row--muted">
          <span>Без скидки</span>
          <b>{{ oldTotalPrice }}</b>
        </div> -->
      </div>

      <div v-else class="product-info-tip__rows product-info-tip__row--muted">
        Нет позиции в корзине
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.product-info-tip {
  position: fixed;
  z-index: 2147483647;
  max-width: 42rem;
  // Длинное описание (гардеробная, УМ) не должно выходить за экран:
  // подсказка некликабельна, поэтому лишнее просто обрезается
  max-height: calc(100vh - 1.6rem);
  overflow: hidden;
  padding: 1rem 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  background: $white;
  color: #333;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  font-size: 1.4rem;
  pointer-events: none;

  &__head {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  &__img {
    width: 4.8rem;
    height: 4.8rem;
    object-fit: contain;
    flex-shrink: 0;
  }

  &__title {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    font-weight: 600;
    line-height: 1.2;
  }

  &__article {
    font-weight: 400;
    font-size: 1.2rem;
    color: $strong-grey;
  }

  &__error {
    font-weight: 600;
    font-size: 1.2rem;
    color: $red;
  }

  &__props {
    border-top: 1px solid $stroke;
    padding-top: 0.8rem;
  }

  &__rows {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    border-top: 1px solid $stroke;
    padding-top: 0.8rem;
  }

  &__row {
    display: flex;
    justify-content: space-between;
    gap: 1.6rem;

    &--muted {
      color: $strong-grey;
    }
  }
}
</style>
