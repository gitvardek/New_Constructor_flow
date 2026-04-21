<template>
  <div class="basket">
    <div class="basket-header">
      <div v-if="loading" class="basket__loader"></div>
      <div class="basket-header__title">Корзина</div>

      <ClosePopUpButton
        class="basket-header__close-btn" 
        @click="closePopup" 
      />
    </div>

    <!-- Кнопки переключения между комнатами -->
    <div class="room-tabs" v-if="rooms.length > 1">
      <button 
        class="room-tab" 
        :class="{ 'room-tab--active': selectedRoomId === 'all' }"
        @click="selectRoom('all')"
      >
        Все комнаты
      </button>
      <button 
        v-for="room in rooms" 
        :key="room.id"
        class="room-tab"
        :class="{ 'room-tab--active': selectedRoomId === room.id }"
        @click="selectRoom(room.id)"
      >
        {{ room.label || `Комната ${room.id}` }}
      </button>
    </div>

    <div class="basket-container">
      <div class="basket-container__main-table" v-if="mainItems.length || !additionalItems.length ">
        <BasketTable
          :key="basketUpdateKey"
          :items="mainItems"
          type="main"
        />
      </div>
      <div class="basket__additional-table">
        <BasketTable
          :key="basketUpdateKey + 'additional'"
          title="Дополнительные товары"
          :items="additionalItems"
          type="additional"
        />
      </div>
    </div>

    <div class="basket-footer">

      <div v-if="productDelayData && productDelayData.length > 0 && productDelayData[0].type !== 'error'" class="basket-footer__notification">
        <div v-for="productItem in productDelayData">
          <h3 class="">{{ productItem?.data?.title }}</h3>
          <!-- <div>{{ productItem.data.max_delay_date }}</div> -->
          <div v-for="item in productItem?.data?.items">
            {{ item?.text }}
          </div>
        </div>
      </div>

      


      <div class="basket-footer">
        <div class="basket-footer-info">
          <p class="basket__sum">Общая стоимость: <span>{{ totalPrice }}</span></p>
          <p class="basket__sum-no" v-if="!oldPrice">Общая стоимость без скидки: <span>{{ totalOldPrice }}</span></p>
        </div>
        <div class="basket-footer-buttons">
          <div class="basket__error" v-if="errorBasket">
            <p class="error__title"></p>
            <p class="error__title">Ошибка - {{ errorCount }} шт. </p>
          </div>
          <button class="basket__close" @click="closePopup">Закрыть</button>
          <button class="basket__save">Печать</button>
          <button class="basket__order" @click="setInvoice" :disabled="errorBasket || technologistStorage.getTechnologistProject()">Оформить заказ</button>
        </div>
        <div class="basket__technologist__wrapper" v-if="technologistStorage.getTechnologistProject()">
          <div class="basket__technologist__wrapper__container">
            <p class="error__title">Это проект технолога!</p>
            <p class="error__title"> Чтобы его оформить перейдите к нужной карточке сделки в окне "Технолог" и нажмите "Оформить заказ".</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { usePopupStore } from '@/store/appStore/popUpsStore';
import ClosePopUpButton from '../ui/svg/ClosePopUpButton.vue';
import BasketTable from "./BasketTable.vue"
import { useBasketStore } from '@/store/appStore/useBasketStore';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { IBasketResponse, IProduct } from '@/types/basket';
import { useAppData } from "@/store/appliction/useAppData"
import { useRoomState } from "@/store/appliction/useRoomState";
import { useEventBus } from "@/store/appliction/useEventBus";
import { useRoomOptions } from '../left-menu/option/roomOptions/useRoomOptons';
import { useBasketStorage } from '@/store/appStore/basket/useBasketStorage';

const { basketData, basketDelay, allBasketDelay, syncBasket, syncBasketDelay, syncBasketMulti, syncInvoce} = useBasketStore();
import { useConfigStore } from "@/store/appStore/useConfigStore";

const { oldPrice, isFeedbackProject } = useConfigStore();
import {useTechnologistStorage} from "@/store/appStore/technologist/useTechnologistStorage.ts";

const popupStore = usePopupStore();
const items = ref<IBasketResponse[] | null>(null);
const productDelayData = ref([]);
const loading = ref(true)
const errorBasket = ref(false);
const errorCount = ref(0);
const appDataStore = useAppData();
const roomState = useRoomState();
// const rooms = roomState.getRooms;

const {
  resetGlobalOptions,
} = useRoomOptions();


// Реактивные переменные
const rooms = computed(() => roomState.getRooms || []);
const roomsID = computed(() => roomState.getRoomId);
const selectedRoomId = ref<string>('all'); // 'all' для всех комнат или ID конкретной комнаты
const selectedRoomLabel = ref<string>('');
const roomsBasketData = ref<IRoomBasketData[]>([]); // Данные корзин всех комнат

const eventBus = useEventBus();
const technologistStorage = useTechnologistStorage();


// Ключ для принудительной перерисовки
const basketUpdateKey = ref(0);

const closePopup = () => {
  popupStore.closePopup('basket');
};
const openPopupFormBasket = () => {
  popupStore.openPopup('formbasket');
};

// Вычисляемые свойства для данных корзины
const mainItems = computed(() => {
  return items.value?.products?.filter((item: IProduct) => item.product?.TYPE === "scene" || item.product?.TYPE === "umscene" ) || [];
});

const additionalItems = computed(() => {
  return items.value?.products?.filter((item: IProduct) => item.product?.TYPE === "catalog") || [];
});

const totalPrice = computed(() => {
  return items.value?.basket?.sumFormat ?? 0;
});

const totalOldPrice = computed(() => {
  return items.value?.basket?.sumFormatOld ?? 0;
});


const setInvoice = () => {

  console.log('basketData', basketData);
  if(isFeedbackProject) {
    closePopup();
    openPopupFormBasket();
  } else {
    syncInvoce();
  }
};

// Функция для обновления данных корзины
const updateBasketData = async () => {
  try {
    const basketData = await syncBasket();
    items.value = basketData;
    basketUpdateKey.value++;
    loading.value = false;
  } catch (error) {
    console.error('Ошибка при обновлении корзины:', error);
  }
};


const selectRoom = async (id) => {
  selectedRoomId.value = id;
  if(id !== "all") {
    loadRoom(id)
  } else {
    getBasket()
  }
}

const getBasket = () => {
  roomsBasketData.value = rooms.value.flatMap(el => {
    const roomBasket = JSON.parse(el.basket);
    console.log('el', roomBasket);
    
    return [
      ...(roomBasket.scene || []),
      ...(roomBasket.catalog || [])
    ];
  });
  
  console.log('Объединенная корзина:', roomsBasketData.value);
  // allBasket(roomsBasketData.value);
  syncBasketMulti(roomsBasketData.value)
}

const loadRoom = async (id: number) => {
  await roomState.setLoad(false);
  eventBus.emit("A:Save"); // Сохраняем локальное сотояние комнаты
  await nextTick();
  setTimeout(() => {
    resetGlobalOptions();
    eventBus.emit("A:Load", id);
    eventBus.emit("A:ContantLoaded", false);
    eventBus.emit("A:DrawingMode", false);
    eventBus.emit("A:ToggleRulerVisibility", true);
  }, 10);
};


onMounted(async () => {
  console.log('basketData', basketData);
  console.log('rooms', rooms);
  console.log('roomsID', roomState.getRoomId);
  selectedRoomId.value = roomState.getRoomId || 'all';
  // if(rooms.length > 1) {
  //   getBasket();
  // } else {
  // }
  updateBasketData();
  await syncBasketDelay();
});

// Следим за изменениями отложенных товаров
watch(() => useBasketStore().allBasketDelay, (newValue) => {
  console.log('Отложенные товары изменились:', newValue);
  productDelayData.value = newValue
}, { deep: true });

// Следим за изменениями в хранилище корзины
watch(() => useBasketStore().basketData, (newValue) => {
  console.log('Basket data changed:', newValue);
  items.value = newValue;
  basketUpdateKey.value++;
  loading.value = false;
  console.log(newValue.products);
  if(newValue.products) {
    errorCount.value = newValue.products.filter((item: IProduct) => item.error).length;
    errorBasket.value = newValue.type === 'error';
  }
}, { deep: true });



</script>

<style lang="scss" scoped>
  .basket {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 30px;
    background: white;
    border-radius: 15px;
    padding: 15px;
    width: 100%;
    box-sizing: border-box;
    max-height: 80vh; 
    height: 100%;
    max-width: 1447px;
    width: 90vw;
    .basket-header {
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;
      width: 100%;
      &__title {
        font-weight: 600;
        font-size: 32px;
        line-height: 100%;
        letter-spacing: 0%;
        text-align: center;
      }
      &__close-btn {
        fill: #A3A9B5;
        position: absolute;
        right: 0;
        top: 10px;
        cursor: pointer;
      }
    }
    &__additional-table {
      margin-top: 2rem;
    }
    .basket-container {
      width: 100%;
      height: 100%;
      overflow-y: auto;
      &__main-table {
        // margin-bottom: 2rem;
        .basket-table {
          background-color: #F6F5FA;
          border-radius: 15px;
        }
      }

    }

    .basket-footer {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
      
      @media (max-width: 768px) {
        flex-direction: column-reverse;
        align-items: stretch;
      }

      .basket__technologist__wrapper {
        display: flex;
        align-items: flex-end;
        width: 100%;
        color: #da444c;
        flex-direction: column;

        &__container {
          padding: 7.5px;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          border: #da444c solid 1px;
          border-radius: 15px;
        }

        @media (max-width: 768px) {
          width: 100%;
          margin-right: 0;
          margin-bottom: 10px;
          justify-content: center;
        }
      }

      &-info {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      &-buttons {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        
        @media (max-width: 768px) {
          width: 100%;
          justify-content: space-between;
        }

        .basket__error {
          display: flex;
          align-items: center;
          margin-right: 30px;
          color: $red;
          
          @media (max-width: 768px) {
            width: 100%;
            margin-right: 0;
            margin-bottom: 10px;
            justify-content: center;
          }
        }

        button {
          width: 114px;
          height: 50px;
          background: $stroke;
          border-radius: 15px;
          border: none;
          
          @media (max-width: 768px) {
            flex: 1;
            min-width: 100px;
          }
        }

        .basket__close {
          color: $strong-grey;
          font-weight: 600;
        }

        .basket__save {
          width: 132px;
          color: $white;
          font-weight: 600;
          background-color: $black;
          
          @media (max-width: 768px) {
            width: auto;
            flex: 1;
          }
        }

        .basket__order {
          width: 174px;
          color: $white;
          font-weight: 600;
          background-color: $red;
          
          @media (max-width: 768px) {
            width: auto;
            flex: 2;
          }
          &:disabled {
            background-color: #A3A9B5;
            cursor: not-allowed;
          }
        }
      }
    }

    &__loader {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      position: absolute;
      top: 1px;
      left: 0;
      animation: rotate 1s linear infinite
    }

    &__loader::before , &__loader::after {
      content: "";
      box-sizing: border-box;
      position: absolute;
      inset: 0px;
      border-radius: 50%;
      border: 5px solid #da444c73;
      animation: prixClipFix 2s linear infinite ;
    }

    &__loader::after{
      border-color: #DA444C;
      animation: prixClipFix 2s linear infinite , rotate 0.5s linear infinite reverse;
      inset: 6px;
    }
    &__sum {
      font-weight: 600;
      line-height: 100%;
      letter-spacing: 0%;

    }
    &__sum-no {
      // font-weight: 600;
      line-height: 100%;
      letter-spacing: 0%;

    }
  }

  

  @keyframes rotate {
    0%   {transform: rotate(0deg)}
    100%   {transform: rotate(360deg)}
  }

  @keyframes prixClipFix {
    0%   {clip-path:polygon(50% 50%,0 0,0 0,0 0,0 0,0 0)}
    25%  {clip-path:polygon(50% 50%,0 0,100% 0,100% 0,100% 0,100% 0)}
    50%  {clip-path:polygon(50% 50%,0 0,100% 0,100% 100%,100% 100%,100% 100%)}
    75%  {clip-path:polygon(50% 50%,0 0,100% 0,100% 100%,0 100%,0 100%)}
    100% {clip-path:polygon(50% 50%,0 0,100% 0,100% 100%,0 100%,0 0)}
  }

  .basket-footer__notification {
    background: #cfe2ff;
    width: 100%;
    border-radius: 8px;
    padding: 12px;
    max-height: 114px;
    overflow-y: auto;
  }

  .room-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
    margin-top: 10px;
    margin-right: auto;
    .room-tab {
      padding: 8px 16px;
      background: #f0f0f0;
      border: none;
      border-radius: 20px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.3s ease;
      
      &:hover {
        background: #e0e0e0;
      }
      
      &--active {
        background: $red;
        color: white;
        font-weight: 600;
      }
    }
  }

  

</style>

