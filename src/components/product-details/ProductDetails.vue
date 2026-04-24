<template>
  <div class="product-details" v-if="productDetails">
    <button @click="handleBack" class="product-details__back-page">← Назад</button>
    <div v-html="productDetails"></div>
  </div>
</template>

<script setup>
  import { useCatalogStore } from '@/store/appStore/catalogStore';
  import { defineProps, defineEmits, defineExpose, onUnmounted } from 'vue';
  import CatalogApp from './productDetails.js';

  const props = defineProps({
    productDetails: {
      type: String,
      required: true,
    },
  });
  const catalogStore = useCatalogStore();

  const emits = defineEmits(['back']);

  const handleBack = () => {
    emits('back');
  };

  // Обработчики для демонстрации альтернативного подхода
  const clickHandler = (e) => {
    e.preventDefault();
    // Логика добавления в корзину
  };

  const inputHandler = (e) => {

    const formElement = e.currentTarget;

    catalogStore.fetchProductPrice(formElement);
    // if(formElement.type !== "range") {
    // }
  };

  const getProductHTML = (id) => {
    try {
      const formData = new FormData();
      formData.append('ID', id.toString());
      formData.append('custom_price_type', false);
      
      catalogStore.fetchProductDetails(formData).then(async (res) => {
        const formElement = document.querySelector('.product__form');
        if (formElement) {
          // formElement.addEventListener('input', inputHandler);
        }
        
        const addToCartButton = document.querySelector('.product__cart-button');
        if (addToCartButton) {
          addToCartButton.addEventListener('click', clickHandler);
        }
        // const addQuantitiButton = document.querySelector('[name="QUANTITY"]');
        // if (addQuantitiButton) {
        //   addQuantitiButton.addEventListener('click', clickQuantity);
        // }

        const addTargetLink = document.querySelector('.product-details').querySelectorAll('a');

        addTargetLink.forEach(el => {
          el.addEventListener('click', function(e) {
            // Проверяем, был ли клик по ссылке
            if (e.target.tagName === 'A') {
                const link = e.target;
                const href = link.getAttribute('href');
                e.preventDefault();
                window.open(link.href, '_blank');
            }
          });
        });

        
        await catalogStore.fetchProductPrice(formElement);  
        initAddLisiner();
        
      });
    } catch (error) {
      console.error('Error loading product details:', error);
      // Можно добавить обработку ошибки (например, показать уведомление)
    }
  };



  defineExpose({
    getProductHTML,
  });

  // Удаляем обработчики при размонтировании
  onUnmounted(() => {
    const formElement = document.querySelector('.product__form.catalog-element-form');
    const addToCartButton = document.querySelector('.product__cart-button');
    
    if (formElement) {
      formElement.removeEventListener('input', inputHandler);
    }
    
    if (addToCartButton) {
      addToCartButton.removeEventListener('click', clickHandler);
    }


  });



  const initAddLisiner = () => {
    // Создаём экземпляр
    const catalogApp = new CatalogApp();
    
    // Запускаем приложение
    catalogApp.start();
  }





</script>

<style lang="scss">
  @import '@/assets/styles/product.css';

  .product-details {
    overflow-y: auto;
    &__back-page {
      background: #F6F5FA;
      width: 108px;
      height: 50px;
      border-radius: 15px;
      padding: 15px;
      gap: 10px;
      opacity: 1;
      border: none;
      outline: none;
      transition: all 0.3s ease;
      &:hover {
        background: #E8E7F2;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      }

      &:active {
        box-shadow: 0 2px 3px rgba(0, 0, 0, 0.1);
      }
    }
  }

</style>




