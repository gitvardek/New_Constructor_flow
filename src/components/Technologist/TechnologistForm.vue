<script setup lang="ts">
//@ts-nocheck

import { onBeforeMount, onMounted, ref } from "vue";

import ClosePopUpButton from "@/components/ui/svg/ClosePopUpButton.vue";
import { usePopupStore } from "@/store/appStore/popUpsStore.ts";
import { useTechnologistApi } from "@/store/appStore/technologist/useTechnologistApi.ts";
import { useTechnologistStorage } from "@/store/appStore/technologist/useTechnologistStorage.ts";
import { TechnologistFormError, TechnologistFormItem } from "@/types/technologist.ts";
import MainButton from "@/components/ui/buttons/MainButton.vue";
import MainInput from "@/components/ui/inputs/MainInput.vue";
import DragAndDropFiles from "@/components/ui/drag&drop/DragAndDropFiles.vue";

const popupStore = usePopupStore();
const technologistStorage = useTechnologistStorage();
const technologistAPI = useTechnologistApi();
const currentProjectID = ref<number | boolean>(false);
const currentForm = ref<TechnologistFormItem>(<TechnologistFormItem>{});
const techFormError = ref<TechnologistFormError | {}>(technologistStorage.getTechFormError());

const init = () => {
  currentProjectID.value = technologistStorage.getCurrentProjectID();
  currentForm.value.projectId = `${currentProjectID.value}`;
}

const closeForm = () => {
  technologistStorage.clearStorage();
  popupStore.closePopup('technologist-form')
}

const submitTechForm = () => {

  if (!currentForm.value)
    return

  let formData = new FormData();
  technologistStorage.clearError()

  Object.entries(currentForm.value).forEach(([key, value]) => {

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        formData.append(`${key}[${index}]`, item);
      })
    }
    else
      formData.append(key, value);
  })

  technologistAPI.submitTechForm(formData).then((result) => {
    if (result) {
      let data = result.DATA
      if (!data?.error) {
        closeForm();
        alert("Заявка отправлена успешно!")
      }
      else {
        alert("Ошибка отправки!")
        techFormError.value = technologistStorage.getTechFormError()
      }
    }
  })
}

const addInputTechnique = () => {
  if (!currentForm.value.technique)
    currentForm.value.technique = []

  currentForm.value.technique.push("")
}

const normalizeEmail = (email: string) => {
  const s = (email ?? "").trim();
  const at = s.indexOf("@");
  if (at === -1) return s;
  return s.slice(0, at) + "@" + s.slice(at + 1).toLowerCase();
}

const changeSketchFiles = (files: File[]) => {
  currentForm.value.sketch = files;
}

const changePhotoRoomFiles = (files: File[]) => {
  currentForm.value.photoRoom = files;
}

const changeMeteringFiles = (files: File[]) => {
  currentForm.value.metering = files;
}

onBeforeMount(() => {
  currentForm.value = <TechnologistFormItem>{
    technique: [""]
  }
})

onMounted(() => {
  init()
})
</script>

<template>
  <div class="technologist-form">
    <div class="technologist-form-container">

      <div class="technologist-form-header">
        <h4 class="technologist-form-header__title">Форма отправки на проверку технологу</h4>
        <ClosePopUpButton class="technologist-form-header__close-btn" @click="closeForm" />
      </div>

      <div class="technologist-form-footer">

        <div class="technologist-form-footer-info">
          <div class="technologist-form-footer-info-item">
            <label>* ID проекта</label>
            <MainInput :input-class="'technologist-form-footer-info-item__input'" :model-value="currentForm.projectId"
              id="projectId" disabled />
          </div>

          <div class="technologist-form-footer-info-item">
            <label>* Дизайнер Ф.И.О.</label>
            <input
              :class="['technologist-form-footer-info-item__input', { 'technologist-form-errorForm': techFormError['fio'] }]"
              type="text" required name="fio" v-model="currentForm.fio">
          </div>

          <div class="technologist-form-footer-info-item">
            <label>* Телефон</label>
            <input v-mask="'+7 (###)-###-####'"
              :class="['technologist-form-footer-info-item__input', { 'technologist-form-errorForm': techFormError['phone'] }]"
              type="tel" required name="phone" v-model="currentForm.phone" inputmode="tel" autocomplete="tel"
              placeholder="+7 (XXX)-XXX-XXXX">
          </div>

          <div class="technologist-form-footer-info-item">
            <label>* Почта</label>
            <input required
              :class="['technologist-form-footer-info-item__input', { 'technologist-form-errorForm': techFormError['email'] }]"
              placeholder="username@example.com" v-model.trim="currentForm.email" name="email" type="email"
              inputmode="email" autocomplete="email" @blur="currentForm.email = normalizeEmail(currentForm.email)">
          </div>

          <div class="technologist-form-footer-info-item">
            <label>* Предварительный номер заказа</label>
            <input
              :class="['technologist-form-footer-info-item__input', { 'technologist-form-errorForm': techFormError['pre_order_id'] }]"
              placeholder="*Если есть*" v-model="currentForm['pre_order_id']" name="pre_order_id" type="text">
          </div>

          <div class="technologist-form-footer-info-technique">
            <label>* Список техники с указанием модели:</label>
            <ul class="technologist-form-footer-info-technique__list">
              <li v-for="(techniqueVal, techniqueKey) in currentForm.technique" :key="techniqueKey">
                <input class="technologist-form-footer-info-technique__input" autocomplete="off" type="text"
                  :id="`technique_${techniqueKey}`" v-model="currentForm.technique[techniqueKey]">
              </li>
            </ul>

            <MainButton @click="addInputTechnique">
              Добавить
            </MainButton>
          </div>
        </div>


        <div :class="['technologist-form-footer-filedrop', { 'technologist-form-errorForm': techFormError['sketch'] }]">
          <p class="technologist-form-footer-filedrop__label">* Техническое задание с размерами</p>

          <DragAndDropFiles accept=".pdf, .txt, .docx, .doc, .rtf, .jpg, .jpeg, .bmp, .png"
            @update:files="changeSketchFiles" />
        </div>

        <div class="technologist-form-footer-filedrop">
          <p class="technologist-form-footer-filedrop__label">* Фото помещения со всех ракурсов</p>

          <DragAndDropFiles accept=".pdf, .txt, .docx, .doc, .rtf, .jpg, .jpeg, .bmp, .png"
            @update:files="changePhotoRoomFiles" />
        </div>

        <div class="technologist-form-footer-filedrop">
          <p class="technologist-form-footer-filedrop__label">* Замер помещения</p>

          <DragAndDropFiles accept=".pdf, .txt, .docx, .doc, .rtf, .jpg, .jpeg, .bmp, .png"
            @update:files="changeMeteringFiles" />
        </div>

        <div v-if="Object.entries(techFormError).length" class="technologist-form-errorMessages">
          <li v-for="(error, errorKey) in techFormError" :key="errorKey">
            <p>{{ error.text }}</p>
          </li>
        </div>

        <label>Комментарий:</label>
        <textarea class="technologist-form-review__textarea" v-model="currentForm.comments"></textarea>

        <MainButton @click="submitTechForm">
          Отправить заявку
        </MainButton>

      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.technologist-form {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 30px;
  background: white;
  border-radius: 15px;
  padding: 15px;
  box-sizing: border-box;
  max-height: 80vh;
  height: 100%;
  max-width: 1447px;
  width: 90vw;

  &-review {
    background-color: #fff;
    z-index: 999;
    padding: 20px;
    width: 100%;
    display: flex;
    align-items: center;
    flex-direction: column;

    &__input {
      margin-bottom: 10px;
    }

    &__textarea {
      margin-bottom: 10px;
      padding: 15px;
      min-width: 50vw;
      max-width: 90vw;
      min-height: 10vh;
      max-height: 20vh;
      overflow-y: scroll;
    }

    .adm-fileinput-wrapper {
      margin-bottom: 30px;
    }
  }

  &-container {
    width: 100%;
    height: 100%;
    overflow-y: auto;

    &__main-table {

      // margin-bottom: 2rem;
      .technologist-table {
        background-color: #F6F5FA;
        border-radius: 15px;
      }
    }
  }

  &-header {
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    width: 100%;

    &__title {
      font-weight: 600;
      font-size: 3.0rem;
      line-height: 100%;
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

  &-footer {
    display: flex;
    justify-content: space-around;
    flex-wrap: wrap;
    gap: 20px;
    width: 100%;
    flex-direction: column;
    font-size: 1.4rem;

    @media (max-width: 768px) {
      flex-direction: column-reverse;
      align-items: stretch;
    }

    &-info {
      display: flex;
      flex-direction: column;
      gap: 5px;
      margin: 1rem;

      &-item {
        display: flex;
        flex-wrap: wrap;
        flex-direction: row;
        align-content: center;
        align-items: flex-start;

        label {
          width: 18%;
        }


        &__input {
          width: 100%;
          max-width: 250px;
          padding-left: 10px;
          border: $dark-grey solid 1px;
        }
      }

      &-technique {
        width: 15vw;
        display: flex;
        flex-wrap: wrap;
        flex-direction: column;
        justify-content: space-between;
        align-content: center;
        align-items: flex-start;
        gap: 0.5rem;

        &__list {
          gap: 3px;
          display: flex;
          flex-direction: column;
        }

        &__input {
          padding-left: 10px;
          border: $dark-grey solid 1px;
        }
      }
    }

    &-filedrop {
      padding: 20px;
      margin-bottom: 22px;
      border: 1px solid #dce5e7;
      box-sizing: border-box;
      width: 95%;
      min-height: 102px;

      &__label {
        display: block;
        font-family: "Open Sans", "Arial", sans-serif;
        font-size: 1.4rem;
        line-height: 19px;
        letter-spacing: 0.04em;
        color: #8C8C8C;
      }
    }

    &-buttons {
      border: 1px solid #bbb;

      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;

      @media (max-width: 768px) {
        width: 100%;
        justify-content: space-between;
      }

      .technologist__error {
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

      .technologist__close {
        color: $strong-grey;
        font-weight: 600;
      }

      .technologist__save {
        width: 132px;
        color: $white;
        font-weight: 600;
        background-color: $black;

        @media (max-width: 768px) {
          width: auto;
          flex: 1;
        }
      }

      .technologist__order {
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

  &__additional-table {
    margin-top: 2rem;
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

  &__loader::before,
  &__loader::after {
    content: "";
    box-sizing: border-box;
    position: absolute;
    inset: 0px;
    border-radius: 50%;
    border: 5px solid #da444c73;
    animation: prixClipFix 2s linear infinite;
  }

  &__loader::after {
    border-color: #DA444C;
    animation: prixClipFix 2s linear infinite, rotate 0.5s linear infinite reverse;
    inset: 6px;
  }

  &__sum {
    font-weight: 600;
    line-height: 100%;
  }

  &__sum-no {
    // font-weight: 600;
    line-height: 100%;
  }

  &-errorForm {
    border: #DA444C solid 1px;
  }

  &-errorMessages {
    border: #DA444C solid 1px;
    color: #DA444C;
  }

}
</style>