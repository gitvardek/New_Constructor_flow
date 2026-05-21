<template>
  <div class="form-order">
    <div class="form-order__header">
      <h2 class="form-order__title">Оформить заказ</h2>
      <ClosePopUpButton 
        class="form-order__close" 
        @close="closePopup" 
      />
    </div>

    <div class="form-order__content">


      <form class="form-order__form" @submit.prevent="handleSubmit">

        <div class="form-order__form-row">
          <div class="form-order__form-col">
            <!-- Название проекта -->
            <div class="form-field">
              <label class="form-field__label">Название проекта <span>*</span></label>
              <input
                v-model="form.projectName"
                type="text"
                class="form-field__input"
                name="project_name"
                
              />
            </div>

            <!-- Информация о клиенте -->
            <div class="form-order__client-info">
              <!-- Имя клиента -->
              <div class="form-field">
                <label for="client_name" class="form-field__label">
                  Имя клиента <span>*</span>
                </label>
                <input
                  v-model="form.clientName"
                  type="text"
                  class="form-field__input"
                  id="client_name"
                  name="client_name"
                  
                />
              </div>

              <!-- Контактный телефон -->
              <div class="form-field">
                <label for="client_phone" class="form-field__label">
                  Контактный телефон <span>*</span>
                </label>
                <input
                  v-model="form.clientPhone"
                  type="tel"
                  class="form-field__input"
                  id="client_phone"
                  name="client_phone"
                  placeholder="+7 (___) ___-____"
                  @input="handlePhoneInput"
                />
              </div>


              <!-- Комментарий -->
              <div class="form-field">
                <label for="client_comment" class="form-field__label">
                  Комментарий
                </label>
                <textarea
                  v-model="form.comment"
                  name="client_comment"
                  id="client_comment"
                  class="form-field__textarea"
                  rows="3"
                ></textarea>
              </div>
            </div>

   
          </div>
          <div class="form-order__form-col">
            <!-- Скриншот проекта -->
            <div class="form-order__screenshot">
              <img 
                :src="screenshot"
                :alt="form.projectName || 'Скриншот проекта'"
                class="form-order__screenshot-image"
              />
            </div>
            <!-- Ошибка (раскомментировать при необходимости) -->
            <div 
              v-if="errorForm" 
              class="form-order__error alert alert-danger"
            >
              <div v-if="errorFormInput">- Необходимо заполнить обязательные поля</div>
              <div v-if="errorFormPhone">- Номер телефона невалиден</div>
            </div>
          </div>
        </div>

         <!-- Кнопки действий -->
        <div class="form-order__actions">
          <button 
            type="button" 
            @click="closePopup"
            class="form-order__button form-order__button--cancel"
          >
            Отмена
          </button>
          <button
            :disabled="isLoading" 
            type="submit" 
            class="form-order__button form-order__button--submit"
          >
            Оформить заказ
          </button>
 
        </div>
      </form>
    </div>
  </div>
</template>

<script lang="ts" setup>
//@ts-nocheck
import ClosePopUpButton from "@/components/ui/svg/ClosePopUpButton.vue";
import { onMounted, reactive, ref, watch } from 'vue';
import { usePopupStore } from '@/store/appStore/popUpsStore';
import { useProjectAPI } from '@/features/quickActions/project/composables/useProjectAPI';
import { useSceneState } from '@/store/appliction/useSceneState'
import { useConfigStore } from '@/store/appStore/useConfigStore'
import { useBasketStore } from '@/store/appStore/useBasketStore'
import { BasketService } from "@/services/basketService";
// import { InputPhone } from '@/components/ui/inputs/InputPhone.vue'
import {useToast} from "@/features/toaster/useToast.ts";

const { getProjectScreenshot } = useProjectAPI();
const { creatDataBasket } = useBasketStore();
const { styleData, configData } = useConfigStore();
const popupStore = usePopupStore();
const screenshot = ref('');
const basket = ref({});
const sceneState = useSceneState()
const toaster = useToast();
const isLoading = ref(false);

const projectData = sceneState.getCurrentProjectParams;
const errorForm = ref(false)
const errorFormInput = ref(false)
const errorFormPhone = ref(false)
interface FormData {
  projectName: any;
  clientName: string;
  clientPhone: string;
  comment: string;
}

const form = reactive<FormData>({
  projectName: '',
  clientName: '',
  clientPhone: '',
  comment: '',
});

const closePopup = () => {
  popupStore.closePopup('formbasket');
};

const handleSubmit = async () => {
  isLoading.value = true;
  if(!form.projectName.length || !form.clientName.length || !form.clientPhone.length) {
    errorForm.value = true
    errorFormInput.value = true 
  } else {
    errorForm.value = false
    errorFormInput.value = false 
  }

  if(!validPhone(form.clientPhone)) {
    errorForm.value = true
    errorFormPhone.value = true
  } else {
    errorForm.value = false
    errorFormPhone.value = false
  }

  const response = await BasketService.getSendorder({ 
    project_img: screenshot.value,
    // project_img: '',
    project_name: form.projectName,
    project:projectData,
    config: configData,
    style: styleData,
    fio: form.clientName,
    phone: form.clientPhone,
    comment: form.comment,
    basket: basket.value,
    cityID: ''
  })


  response.DATA.type === 'success' ?  toaster.success("Заявка успешно отправлена") : toaster.error("Ошибка при отправке заявки");
  closePopup();

  isLoading.value = false;
  // Здесь будет логика отправки формы
  // await sendFormData(form);
};

const createNameProject = () => {
  const now = new Date();
  
  // Форматирование даты: ДД.ММ.ГГГГ
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0'); // месяц начинается с 0
  const year = now.getFullYear();
  const dateStr = `${day}-${month}-${year}`;
  
  // Форматирование времени: ЧЧ-ММ
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;
  
  return `Проект ${dateStr} ${timeStr}`;
};


const handlePhoneInput = (event) => {
  let value = event.target.value.replace(/\D/g, '');
  
  // Ограничиваем ввод только цифрами и максимум 11 символов
  if (value.length > 11) {
    value = value.substring(0, 11);
  }
  
  // Автоматически добавляем +7 если номер начинается с 7 или 8
  if (value.length === 11 && (value.startsWith('7') || value.startsWith('8'))) {
    value = value.startsWith('8') ? '7' + value.substring(1) : value;
  }
  
  // Форматируем по маске
  let formatted = '';
  if (value.length > 0) {
    formatted = '+7';
    if (value.length > 1) {
      formatted += ` (${value.substring(1, 4)}`;
    }
    if (value.length > 4) {
      formatted += `) ${value.substring(4, 7)}`;
    }
    if (value.length > 7) {
      formatted += `-${value.substring(7, 9)}`;
    }
    if (value.length > 9) {
      formatted += `-${value.substring(9)}`;
    }
  }
  
  form.clientPhone = formatted;
};

const validPhone = (phone) => {
  // Удаляем все нецифровые символы
  const digits = phone.replace(/\D/g, '');
  
  // Проверяем основные условия
  const isValid = digits.length === 11 && 
                  (digits.startsWith('7') || digits.startsWith('8')) &&
                  /^[0-9]{11}$/.test(digits);
  
  if (isValid) {
    console.log('Номер валиден');
    // Автоматически форматируем в правильный вид
    const formatted = `+7 (${digits.substring(1, 4)}) ${digits.substring(4, 7)}-${digits.substring(7, 9)}-${digits.substring(9)}`;
    console.log('Отформатированный номер:', formatted);
    return true;
  } else {
    console.log('Номер невалиден');
    return false;
  }
};

// В шаблоне:
// <input v-model="form.clientPhone" @input="handlePhoneInput" placeholder="+7 (___) ___-__-__">

onMounted(async () => {
  try {
    screenshot.value = await getProjectScreenshot();
  } catch (error) {
    console.error('Ошибка при загрузке скриншота:', error);
  }
  basket.value = creatDataBasket();
  form.projectName = createNameProject();
});


watch(() => form.clientPhone, (newPhone) => {
  validPhone(newPhone)
});
</script>

<style lang="scss" scoped>
.form-order {
  width: 800px;
  max-width: 100%;
  background: $white;
  border-radius: 16px;
  max-height: 90vh;
  overflow-y: scroll;
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 32px;
  }

  &__title {
    font-size: 3.2rem;
    font-weight: 600;
    text-align: center;
  }

  &__close {
    cursor: pointer;
    transition: opacity 0.2s ease;

    &:hover {
      opacity: 0.7;
    }
  }

  &__content {
    margin-bottom: 24px;
  }

  &__error {
    padding: 12px 16px;
    margin-bottom: 20px;
    border-radius: 8px;
    background-color: rgba($red, 0.1);
    color: $red;
    font-size: 1.4rem;
  }

  &__form {
    &-row {
      display: flex;
      justify-content: space-between;
      // align-items: center;
    }
    &-col {
      flex-basis: 50%;
      &:last-child {
        margin-left: 1rem;
      }
    }
  }


  &__screenshot {
    margin: 27px 0;
    text-align: center;

    &-image {
      max-width: 100%;
      max-height: 300px;
      border-radius: 8px;
      border: 1px solid $stroke;
      object-fit: contain;
    }
  }

  &__client-info {
    margin-top: 24px;
  }

  &__actions {
    display: flex;
    gap: 16px;
    margin-top: 32px;
    justify-content: flex-end;
  }

  &__button {
    padding: 12px 24px;
    border: none;
    border-radius: 12px;
    font-size: 1.6rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 140px;

    &--submit {
      background: $red;
      color: $white;

      &:hover {
        background: darken($red, 10%);
      }

      &:active {
        transform: translateY(1px);
      }
    }

    &--cancel {
      background: $light-grey;
      color: $strong-grey;

      &:hover {
        background: darken($light-grey, 5%);
      }
    }
  }
}

.form-field {
  margin-bottom: 20px;

  &__label {
    display: block;
    margin-bottom: 8px;
    font-size: 1.4rem;
    font-weight: 500;
    color: $dark-grey;
    span { 
      color: #da444c;
      font-size: 1.8rem;
      display: inline-block;
    }
  }

  &__input,
  &__textarea {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid $stroke;
    border-radius: 8px;
    font-size: 1.6rem;
    font-family: inherit;
    transition: border-color 0.2s ease;
    background: $white;

    &:focus {
      outline: none;
      border-color: $red;
      box-shadow: 0 0 0 2px rgba($red, 0.1);
    }

    &::placeholder {
      color: lighten($strong-grey, 30%);
    }
  }

  &__textarea {
    resize: vertical;
    min-height: 100px;
  }

  &--error {
    .form-field__input,
    .form-field__textarea {
      border-color: $red;
    }

    .form-field__error {
      display: block;
      margin-top: 4px;
      font-size: 1.2rem;
      color: $red;
    }
  }
}

// Адаптивность
@media (max-width: 576px) {
  .form-order {
    width: 100%;
    padding: 16px;
    
    &__header {
      margin-bottom: 24px;
    }
    
    &__title {
      font-size: 2.0rem;
    }
    
    &__actions {
      flex-direction: column;
      gap: 12px;
    }
    
    &__button {
      width: 100%;
      min-width: auto;
    }
  }
}
</style>