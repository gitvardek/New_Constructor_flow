<template>
  <div class="error">
    <div v-if="!isSuccess" class="error__title">Сообщить об ошибке</div>
    <div v-else class="error__title">Сообщение отправлено</div>
    <ClosePopUpButton v-if="!isSuccess" class="popup__close" @close="closePopup" />
    
    <div v-if="!isSuccess" class="error-input">
      <p class="error__text">Опишите проблему/ошибку</p>
      <textarea v-model="errorMessage" class="error__textarea"></textarea>
    </div>
  
    
    <button v-if="!isSuccess" @click="sendError" class="error__button">Отправить</button>
    <button v-else @click="closePopup" class="error__button success__button">Закрыть</button>
  </div>
</template>
<script lang="ts" setup>
//@ts-nocheck
import ClosePopUpButton from "@/components/ui/svg/ClosePopUpButton.vue";
import axios from 'axios';
import { ref } from 'vue';
import { usePopupStore } from '@/store/appStore/popUpsStore';

const popupStore = usePopupStore();
const errorMessage = ref('');
const isSuccess = ref(false);

const closePopup = () => {
  popupStore.closePopup('error');
};

const sendError = async () => {
  try {
    await axios.post('/api/modeller/message/senderror/', {
      MESSAGE: errorMessage.value,
    });
    isSuccess.value = true;
  } catch (e) {
    console.error('Ошибка при отправке сообщения:', e);
  }
};
</script>
<style lang="scss" scoped>
.error {

  width: 822px;
  display: flex;
  justify-content: center;
  flex-direction: column;
  align-items: center;
  position: relative;

  &__title {
    margin-bottom: 30px;
    font-size: 3.2rem;
    font-weight: 600;
  }
  &
  &__text {
    font-size: 1.8rem;
    color: $dark-grey;
  }

  &-input {
    width: 100%;

    .error__textarea {
      padding: 1rem;
      width: 100%;
      height: 249px;
      resize: none;
      background: $stroke;
      border-radius: 15px;
      border: none;
      margin-bottom: 30px;
    }
  }

  .error__button {
    width: 132px;
    height: 50px;
    font-size: 1.6rem;
    font-weight: 500;
    border: none;
    border-radius: 15px;
    background: $red;
    color: $white;
    cursor: pointer;
    &.success__button {
      background: $light-grey;
      color: $strong-grey;
    }
  }
  
  .success-message {
    text-align: center;
    margin: 20px 0;
     
    .success__text {
      font-size: 1.8rem;
      font-weight: 500;
    }
  }
}
</style>
