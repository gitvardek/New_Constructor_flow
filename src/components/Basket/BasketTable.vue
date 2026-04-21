<template>
  <div :class="`${type === 'main' ? 'basket-table--height' : ''} basket-table`" v-if="items.length || type === 'main'">
    <div v-if="title && items.length" class="basket-table__title">{{ title }}</div>
    <div class="basket-table__table" v-if="items.length || type === 'main'">
      <div class="basket-table__head">
        <span>Фото</span>
        <span>Наименование</span>
        <span>Количество</span>
        <span>Цена</span>
        <span>Сумма</span>
        <span v-if="!oldPrice">Сумма без скидки</span>
      </div>
  
      <div class="basket-table__body">
        <BasketItem
          v-for="item in items"
          :key="item.BASKETID || item.id"
          :item="item"
        />
      </div>
    </div>
    <p v-if="type === 'main' && !items.length" class="basket-table__none-text">Товаров в корзине пока нет</p>
  </div>
</template>

<script setup lang="ts">
//@ts-nocheck
import { computed } from "vue";
import BasketItem from "./BasketItem.vue"
import { useAppData } from "@/store/appliction/useAppData"
import { useConfigStore } from "@/store/appStore/useConfigStore";

interface Props {
  title?: string;
  items: any[];
  type: string;
}

defineProps<Props>()

const appDataStore = useAppData();
const { oldPrice, isFeedbackProject } = useConfigStore();

</script>

<style scoped lang="scss">
  .basket-table {
    width: 100%;
    background: white;
    border-radius: 12px;
    padding: 20px;
    border: 1px solid #eee;
    &--height {
      // min-height: 57vh;
      height: 100%;
      }
    
    &__title {
      font-weight: 600;
      margin-bottom: 10px;
    }

    &__table {
      
    }

    &__head {
      display: grid;
      grid-template-columns: 150px 1fr 120px 120px 120px 120px 42px;
      gap: 10px;
      font-weight: 500;
      font-size: 14px;
      color: #A3A9B5;
      border-bottom: 1px solid #eee;
      padding-bottom: 6px;

      @media (max-width: 768px) {
        display: none; // прячем шапку, оставляем карточки
      }
    }

    &__body {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    &__none-text {
      // height: 27vh;
      height: 50vh;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
    }
  }
</style>
