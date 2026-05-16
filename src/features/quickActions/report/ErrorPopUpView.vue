<template>
  <div class="error">
    <div class="error__title">Сообщить об ошибке</div>
    <ClosePopUpButton class="popup__close" @close="closePopup" />

    <form class="error-input" @submit.prevent="sendReport">
      <ErrorTextArea
        name="description"
        label="Опишите проблему/ошибку"
        placeholder="Введите описание ошибки"
      />

      <button class="error__button" type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Отправка...' : 'Отправить' }}
      </button>
      <p v-if="hasError" class="error__message">Ошибка при отправке отчёта. Повторите попытку.</p>
    </form>
  </div>
</template>
<script lang="ts" setup>
import ClosePopUpButton from "@/components/ui/svg/ClosePopUpButton.vue";
import ErrorTextArea from "@/components/ui/inputs/ErrorTextArea.vue";
import { usePopupStore } from '@/store/appStore/popUpsStore';
import { useReport } from '@/features/quickActions/report/useReport';

const popupStore = usePopupStore();
const closePopup = () => popupStore.closePopup('error');

const { sendReport, isSubmitting, hasError } = useReport();
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
    margin-bottom: 5px;
    font-size: 3.2rem;
    font-weight: 600;
  }

  &__text {
    font-size: 1.8rem;
    color: $dark-grey;
  }

  &-input {
    width: 100%;
  }

  .error__message {
    font-size: 1.4rem;
    color: #dc3545;
    margin: 8px 0 12px;
    min-height: 20px;
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
  }
}
</style> 