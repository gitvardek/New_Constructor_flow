<script setup lang="ts">
// @ts-nocheck

import ClosePopUpButton from "@/components/ui/svg/ClosePopUpButton.vue";
import DragAndDropFiles from "@/components/ui/drag&drop/DragAndDropFiles.vue";
import MainButton from "@/components/ui/buttons/MainButton.vue";
import {useAppData} from "@/store/appliction/useAppData.ts";
import {usePopupStore} from "@/store/appStore/popUpsStore.ts";
import {useTechnologistStorage} from "@/store/appStore/technologist/useTechnologistStorage.ts";
import {useTechnologistApi} from "@/store/appStore/technologist/useTechnologistApi.ts";
import {computed, onMounted, ref} from "vue";
import {TechnologistCommentsItem, TechnologistFormReview} from "@/types/technologist.ts";
import {_URL} from "@/types/constants.ts";
import {useFilePopUpStorage} from "@/store/appStore/FilePopUpStorage.ts";
import {useProjectStore} from "@/features/quickActions/project/store/useProjectStore.ts";
import {useProjectAPI} from "@/features/quickActions/project/composables/useProjectAPI.ts";
import {useToast} from "@/features/toaster/useToast.ts";

const APP = useAppData().getAppData;
const popupStore = usePopupStore();
const technologistStorage = useTechnologistStorage();
const technologistAPI = useTechnologistApi();
const fileStorage = useFilePopUpStorage();
const projectState = useProjectStore();
const projectAPI = useProjectAPI()
const toaster = useToast();

const currentProjectID = <string|null>ref(null)
const loading = <boolean>ref(false)
const autoSaveNeedUpdate = <boolean>ref(false)
const reviewStatus = <boolean>ref(false)
const formReview = <TechnologistFormReview>ref(technologistStorage.getFormReview())
const deal = computed(() => {
  return technologistStorage.getDealOfSelectedApplication()
})
const filesCash = ref({})
const errors = ref({})

const statusNames = {
  'C10:PREPARATION': "<Возвращен в работу>",
  'C10:1': '<Отправлен на доработку>',
  'C10:PREPAYMENT_INVOIC': '<Передан дизайнеру>',
  'C10:2': '<Принят дизайнером>',
  'C10:3': '<Принят технологом>',
  'C10:WON': '<Предан в производство>',
  'C10:LOSE': '<Отказ>',
  'C10:4': '<Отправлен на доработку дизайнеру>',
  'C10:5': '<Отправлен на доработку технологу>',
}

const closePopup = () => {

  technologistStorage.clearFormReview();
  reviewStatus.value = false;
  filesCash.value = {};
  technologistStorage.setDealOfSelectedApplication()
  fileStorage.c
  popupStore.closePopup('technologist-comments');

  if(autoSaveNeedUpdate.value) {
    projectState.updateAfterSave();
    toaster.success("Текущий проект был сохранен");
  }

  popupStore.openPopup('technologist');
};

const changeCommentsFiles = (files: File[]) => {
  formReview.value.commentsFiles = files;
}

const sendComments = async () => {

  let formData = new FormData();
  errors.value = {}

  if(formReview.value.statusId){
    formData.append("id", +formReview.value.id);
    formData.append("statusId", formReview.value.statusId);

    await technologistAPI.setStatus(formData).then((result) => {
      if(result) {
        let data = result.DATA
        if(data?.error) {
          let res_errors = Object.fromEntries(data.error.map((item, index) => {
            return [index, item];
          }))
          errors.value = Object.assign({}, errors.value, res_errors)
        }
      }
    });
  }

  if (reviewStatus.value) {
    formData = new FormData();
    formData.append("id", +formReview.value.id);
    if (formReview.value.projectTechId)
      formData.append("projectId", formReview.value.projectTechId);

    await technologistAPI.setProjectForDeal(formData).then((result) => {
      if(result) {
        let data = result.DATA
        if(data?.error) {
          errors.value = Object.assign({}, errors.value, Object.fromEntries(data.error.map((item, index) => {
            return [index, item];
          })))
        }
      }
    });
  }

  formData = new FormData();
  formData.append("id", +formReview.value.id);
  formData.append("message", formReview.value.message || statusNames[formReview.value.statusId] || `<Без текста>`);
  formReview.value.commentsFiles?.forEach((item, index) => {
    formData.append(`comments[${index}]`, item);
  })

  technologistAPI.setComments(formData).then((result) => {
    if(result) {
      let data = result.DATA
      if(data?.error) {
        errors.value = Object.assign({}, errors.value, Object.fromEntries(data.error.map((item, index) => {
          return [index, item];
        })))
      }

      if (!Object.entries(errors.value).length) {
        if(reviewStatus.value) {
          closePopup()
        }
        else
          getCommentsList()
        toaster.success("Отправлено успешно!");
      }
      else {
        getCommentsList()
      }

    }

  });
}

const getCommentsList = () => {

  let formData = new FormData();
  formData.append("id", formReview.value.id);

  technologistAPI.getComments(formData).then((data) => {
    formReview.value.comments = <TechnologistCommentsItem>[]

    if (data?.DATA) {
      let comments = data.DATA.slice()
      comments.reverse()
      formReview.value.comments = comments;

      let domElem = document.getElementById('commentsList')
      if(domElem) {
        domElem.scrollTop = domElem.scrollHeight - domElem.clientHeight;
      }
    }
  });
}

const createDateLabel = (date: string) => {
  const commentDate = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - commentDate.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  // Проверяем, в тот же ли день
  const isSameDay = 
    commentDate.getDate() === now.getDate() &&
    commentDate.getMonth() === now.getMonth() &&
    commentDate.getFullYear() === now.getFullYear();

  // 1) Если время было менее 1 часа назад
  if (diffMinutes < 60) {
    const minutes = diffMinutes || 1; // Минимум 1 минута
    const lastDigit = minutes % 10;
    const lastTwoDigits = minutes % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
      return `${minutes} мин. назад`;
    }
    if (lastDigit === 1) {
      return `${minutes} мин. назад`;
    }
    if (lastDigit >= 2 && lastDigit <= 4) {
      return `${minutes} мин. назад`;
    }
    return `${minutes} мин. назад`;
  }

  // 2) Если время от 1 до 3 часов назад
  if (diffHours >= 1 && diffHours < 3) {
    if (diffHours === 1) return '1 час назад';
    return `${diffHours} часа назад`;
  }

  // 3) Если более 3 часов назад, но в текущий день
  if (isSameDay && diffHours >= 3) {
    const hours = commentDate.getHours().toString().padStart(2, '0');
    const minutes = commentDate.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  // 4) Если время было не в текущий день
  const day = commentDate.getDate().toString().padStart(2, '0');
  const month = (commentDate.getMonth() + 1).toString().padStart(2, '0');
  const year = commentDate.getFullYear();
  return `${day}.${month}.${year}`;
}

const openFileFromComment = async (file) => {
  try {

    let fetchedFile
    if(filesCash.value[file.id]) {
      fetchedFile = filesCash.value[file.id]
    }
    else {
      const url = file.customLink || file.customDownload;

      if (!url) {
        //alert("Ссылка на файл недоступна");
        toaster.error("Ссылка на файл недоступна")
        return;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Ошибка загрузки файла");
      }

      const blob = await response.blob();
      const fileName = file.name || url.split("/").pop() || "file";
      const fileType = blob.type || file.type || "application/octet-stream";

      fetchedFile = new File([blob], fileName, { type: fileType });
      filesCash.value[file.id] = fetchedFile;
    }

    fileStorage.setFile(fetchedFile);
    popupStore.openPopup("file");
  }
  catch (e) {
    console.error(e);
    //alert("Не удалось открыть файл");
    toaster.error("Не удалось открыть файл")
  }
}

const setProjectTechId = async (isCurrentProjectID = true) => {
  if(isCurrentProjectID) {
    //if(!currentProjectID.value || !technologistStorage.getTechnologistProject()) {
      let now = new Date();
      let projectName = `Проект ${APP.userGroup[56] ? 'технолога' : 'дизайнера'} для сделки №${deal.value.dealId} от ${now.getDate()}.${now.getUTCMonth()+1}.${now.getFullYear()} ${now.getHours()}:${now.getMinutes()}`;
      if (reviewStatus.value && statusNames[formReview.value.statusId]){
        projectName += ` со статусом "${statusNames[formReview.value.statusId]}"`
      }

      const result = await projectAPI.saveProject(null, projectName, false, true);
      projectState.setProjectId(result.data.ID);
      currentProjectID.value = projectState.getProjectId()
      autoSaveNeedUpdate.value = true;
    //}

    formReview.value.projectTechId = currentProjectID.value
  }
  else {
    formReview.value.projectTechId = false
  }
}

onMounted(() => {
  formReview.value = technologistStorage.getFormReview();

  if (formReview.value.statusId && ['C10:PREPAYMENT_INVOIC', 'C10:4'].includes(formReview.value.statusId)) {
    reviewStatus.value = true;
  }
  currentProjectID.value = projectState.getProjectId()
  getCommentsList()
})

</script>

<template>
  <div class="technologist">
    <div class="technologist-header">
      <div class="technologist-header__title">Сделка №{{ deal.dealId }}</div>

      <ClosePopUpButton
          class="technologist-header__close-btn"
          @click="closePopup"
      />
    </div>

    <div class="technologist-container">

      <label>История сообщений:</label>
      <div class="commentsList" id="commentsList">
        <div class="commentsList-commentsItem" v-for="comment in formReview.comments">

          <div class="commentsList-commentsItem-time">{{ createDateLabel(comment.CREATED)}}</div>

          <div class="commentsList-commentsItem-comment">
            <span>{{ comment.COMMENT }}</span>

            <ul v-if="comment.FILES && Object.keys(comment.FILES).length" class="list">
              <li
                  v-for="(file, fileKey) in comment.FILES"
                  :key="fileKey"
                  class="list-item"
                  :title="file.name"
              >
                <a
                    v-if="file.urlPreview"
                    class="preview"
                    @click="() => openFileFromComment(file)"
                >
                  <img
                      :src="`${_URL + file.customLink}`"
                      :alt="file.name"
                      class="preview__image"
                  />
                </a>

                <a
                    :href="`${file.customDownload}`"
                    class="file-info"
                >
                  <div class="file-name">{{ file.name }}</div>
                  <div class="file-size">{{ (file.size / 1024 / 1024).toFixed(2) }} MB</div>
                </a>
              </li>
            </ul>
          </div>

        </div>
      </div>

      <label>Комментарий:</label>

      <div class="technologist-container-review" v-if="!formReview.result.success">

        <div v-if="reviewStatus">
          <span>ID проекта</span>
          <input
              class="technologist-review__input"
              autocomplete="off"
              type="text"
              name="projectTechId"
              v-model="formReview.projectTechId"
              :disabled="+formReview.projectTechId == +currentProjectID"
          >
          <MainButton
              @click="setProjectTechId(+formReview.projectTechId != +currentProjectID)"
              :class-name="'btn'"
          >
            Текущий проект
          </MainButton>
        </div>

        <textarea
            class="technologist-review__textarea"
            v-model="formReview.message"></textarea>

        <div class="technologist-filedrop">
          <DragAndDropFiles
              accept=".pdf, .txt, .docx, .doc, .rtf, .jpg, .jpeg, .bmp, .png"
              @update:files="changeCommentsFiles"
          />
        </div>

        <div v-if="Object.entries(errors).length" class="technologist-errorMessages">
          <li
              v-for="(error, errorKey) in errors"
              :key="errorKey"
          >
            <p>{{error}}</p>
          </li>
        </div>

        <MainButton
            @click="sendComments"
            :class-name="'btn'"
        >
          Отправить
        </MainButton>

      </div>

      <div style="margin-top: 10px;text-align: center;">
        <p style="color: green" v-if="formReview.result.success">Успешно отправлено.</p>
        <p style="color: red" v-if="formReview.result.error"
           v-for="m in formReview.result.error">{{ m }}</p>
      </div>

    </div>

  </div>
</template>

<style lang="scss" scoped>
.technologist {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 30px;
  background: white;
  border-radius: 15px;
  padding: 15px;
  box-sizing: border-box;
  width: 90vw;
  height: 85vh;
  overflow: hidden;

  &-errorMessages {
    border: #DA444C solid 1px;
    color: #DA444C ;
  }

  &-header {
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    width: 100%;
    align-content: center;
    flex-direction: row;
    flex-wrap: wrap;

    &__title {
      font-weight: 600;
      font-size: 3.2rem;
      line-height: 100%;
      text-align: center;
    }

    &__close-btn {
      fill: #A3A9B5;
      position: absolute;
      right: 0;
      cursor: pointer;
    }
  }

  .commentsList {
    display: flex;
    padding: 1.2rem;
    border: 1px solid;
    margin-top: 0.2rem;
    margin-bottom: 1rem;
    min-height: 30vh;
    max-height: 50vh;
    overflow-y: scroll;
    flex-direction: column;
    justify-content: space-around;
    align-items: flex-start;
    align-content: flex-start;

    &-commentsItem {
      display: flex;
      flex-direction: row;
      gap: 1rem;
      font-size: 1.8rem;
      border-bottom: 2px solid;
      padding-bottom: 10px;
      margin-bottom: 10px;
      min-width: 30vw;

      &-span {
        word-wrap: break-word;
      }

      &-time {
        font-size: 1.2rem;
        opacity: 0.7;
        margin-top: 2px;
      }

      &-comment {
        display: flex;
        flex-direction: column;
      }

    }

  }

  .list {
    margin-top: 12px;

    &-item {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }
  }

  .file {

    &-info {
      flex: 1 1 auto;
      min-width: auto;
      max-width: 15vw;
    }

    &-name {
      font-size: 1.4rem;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &-size {
      font-size: 1.2rem;
      opacity: 0.7;
      margin-top: 2px;
    }
  }

  .preview {
    width: 48px;
    height: 48px;
    border-radius: 6px;
    overflow: hidden;
    flex-shrink: 0;
    border: 1px solid #e0e0e0;
    background: #fafafa;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;

    &__image {
      max-width: 100%;
      max-height: 100%;
      object-fit: cover;
    }
  }

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
    padding: 0 50px;
    height: 100%;
    width: 100%;
    overflow-y: scroll;

  }

  &-filedrop {
    max-width: 24vw;
    max-height: 20vh;
    margin-bottom: 2rem;

    &__label {
      display: block;
      font-family: "Open Sans", "Arial", sans-serif;
      font-size: 1.4rem;
      line-height: 19px;
      letter-spacing: 0.04em;
      color: #8C8C8C;
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

  &__loader::before, &__loader::after {
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
}

@keyframes rotate {
  0% {
    transform: rotate(0deg)
  }
  100% {
    transform: rotate(360deg)
  }
}

@keyframes prixClipFix {
  0% {
    clip-path: polygon(50% 50%, 0 0, 0 0, 0 0, 0 0, 0 0)
  }
  25% {
    clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 0, 100% 0, 100% 0)
  }
  50% {
    clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 100%, 100% 100%, 100% 100%)
  }
  75% {
    clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 100%, 0 100%, 0 100%)
  }
  100% {
    clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 100%, 0 100%, 0 0)
  }
}

</style>
