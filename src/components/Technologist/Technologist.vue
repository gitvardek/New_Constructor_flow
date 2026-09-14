<script setup lang="ts">
// @ts-nocheck

import ClosePopUpButton from "@/components/ui/svg/ClosePopUpButton.vue";
import {usePopupStore} from "@/store/appStore/popUpsStore.ts";
import {computed, nextTick, onMounted, ref, watch} from "vue";
import {useAppData} from "@/store/appliction/useAppData.ts";
import {Deal, useTechnologistStorage} from "@/store/appStore/technologist/useTechnologistStorage.ts";
import {useTechnologistApi} from "@/store/appStore/technologist/useTechnologistApi.ts";
import {useToast} from "@/features/toaster/useToast.ts";
import {useProjectAPI} from "@/features/quickActions/project/composables/useProjectAPI.ts";
import {useProjectStore} from "@/features/quickActions/project/store/useProjectStore.ts";
import {useSceneState} from "@/store/appliction/useSceneState.ts";
import {useEventBus} from "@/store/appliction/useEventBus.ts";
import {useSchemeTransition} from "@/store/canvasMerge/schemeTransition.ts";
import {useRoute, useRouter} from "vue-router";
import {useRoomState} from "@/store/appliction/useRoomState.ts";
import MainButton from "@/components/ui/buttons/MainButton.vue";
import Pagination from "@/components/ui/pagination/Pagination.vue";
import {_URL} from "@/types/constants.ts";
import {useFilePopUpStorage} from "@/store/appStore/FilePopUpStorage.ts";
import {useBasketStore} from "@/store/appStore/useBasketStore.ts";

// Загрузка проекта
const router = useRouter();
const route = useRoute();
const isProjectLoading = ref(false);
const projectAPI = useProjectAPI();
const projectState = useProjectStore();
const sceneState = useSceneState();
const eventBus = useEventBus();
const schemeTransition = useSchemeTransition();
const roomState = useRoomState();
const toaster = useToast();
const fileStorage = useFilePopUpStorage();
const basketStorage = useBasketStore();

const deal = computed(() => {
  return technologistStorage.getDealOfSelectedApplication()
})

const APP = useAppData().getAppData;
const popupStore = usePopupStore();
const technologistStorage = useTechnologistStorage();
const technologistAPI = useTechnologistApi();

const loading = ref(false)
const techList = technologistStorage.techList
const formReview = technologistStorage.formReview

// ID заявки, для которой сейчас открыт хинт со знаком "?"
const openedHintId = ref<string | number | null>(null)

const handleRootClick = () => {
  openedHintId.value = null;
}

const closePopup = (clear: boolean = false) => {

  if(clear) {
    technologistStorage.clearStorage()
    fileStorage.clearCash()
  }
  else {
    technologistStorage.setFormReview(formReview);
    technologistStorage.setTechList(techList);
  }

  popupStore.closePopup('technologist');
};

const getTechList = function () {

  techList.loader = true;

  let formData = new FormData();

  formData.append("filter", techList.filter);
  formData.append("pager", techList.pager);

  technologistAPI.getList(formData).then((result) => {
    if (result) {
      techList.elements = result.DATA.items;
      if (result.DATA.nav) {
        techList.nav = result.DATA.nav;
      }
    }
    techList.loader = false;
  })
}

const setStatus = function (id, statusId, projectTechId = false, message = false, comments = false) {
  let formData = new FormData()
  formData.append("id", id);
  formData.append("statusId", statusId);

  if (projectTechId != false)
    formData.append("projectId", projectTechId);

  technologistAPI.setStatus(formData).then((result) => {
    if (result) {
      if (statusId == 'C10:PREPAYMENT_INVOIC' || statusId == 'C10:1') {
        formReview.result = result.DATA;

        if (formReview.result.success)
          getTechList();
      } else {
        getTechList();
      }
    }
    techList.loader = false;
  })
}

const openModalSTD = function (elem, statusId) {
  /*
   formReview.projectId = elem.id;
  formReview.statusId = statusId;

  if (arrIdInputFile['comments'] === undefined) {
    let fileUpDrop = fileUp.create({
      url: '/upload/tmp',
      input: 'comments',
      queue: 'comments-queue',
      dropzone: 'comments-dropzone',
      autostart: false,
      sizeLimit: 20048576,
      lang: 'ru',
      onSelect: function (file) {

        let format = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'application/msword',
          'application/rtf',
          'image/jpeg',
          'image/png',
          'image/bmp',
        ];

        if (format.indexOf(file.type) == -1) {
          alert('Формат файла "' + file.name + '" невозможно загрузить.');
          return false;
        }
      },
    })

    arrIdInputFile['comments'] = fileUpDrop.getId();
  } else {
    let fileUpDrop = fileUp.get(arrIdInputFile['comments']);
    fileUpDrop.removeAll();
  }

  popupStore.openPopup('technologist-comments');*/
  openModalComments(elem, statusId)
}

const openModalComments = function (elem, statusId) {
  technologistStorage.clearFormReview()

  let {id, projectTechId, techProject} = elem;
  formReview.id = id;

  if(statusId) {
    formReview.statusId = statusId;
  }

  technologistStorage.setFormReview(formReview);
  technologistStorage.setDealOfSelectedApplication(<Deal>{
    'dealId': id,
    'dealStatus': statusId,
    'techProjectId': projectTechId,
    'techProject': techProject || false,
  })

  closePopup()
  popupStore.openPopup('technologist-comments');
}

const openModalOrder = async (elem, _id) => {

  loading.value = true;

  let {id, projectTechId, techProject} = elem;
  technologistStorage.setDealOfSelectedApplication(<Deal>{
    'dealId': id,
    'dealStatus': 'C10:WON',
    'techProjectId': projectTechId,
    'techProject': techProject || false,
  })

  let projectID = _id
  if (!projectID) {
    let now = new Date();
    let projectName = `Проект ${APP.userGroup[56] ? 'технолога' : 'дизайнера'} для сделки №${deal.value.dealId} от ${now.getDate()}.${now.getUTCMonth() + 1}.${now.getFullYear()} ${now.getHours()}:${now.getMinutes()}`;
    projectName += ` со статусом <Передан в производство>`
    const result = await projectAPI.saveProject(projectState.currentProjectId, projectName, false, true);
    projectState.setProjectId(result.data.ID);
    projectID = projectState.getProjectId()
  }

  setTimeout(() => {
    uploadProjectTech(projectID).then((result) => {
        if(result)
          basketStorage.syncInvoce({
            projectID,
            projectTechId,
            'dealId': id,
          })
        else
          toaster.error('Ошибка загрузки авто-сохраненного проекта!');

      loading.value = false;
      closePopup()
    });
  }, 1000)
}

const uploadProjectTech = async (id: string | number) => {
  if (!id)
    return;

  isProjectLoading.value = true;
  let loadSuccess = false;

  try {
    const projectData = await projectAPI.loadProject(id.toString());
    if (projectData) {
      projectState.resetState();
      projectState.setInitialState(projectData);

      try {
        schemeTransition.clearStore();
        // 1. Обновляем данные проекта в sceneState
        await sceneState.loadProjectFromData(projectData);

        // 2. Устанавливаем данные в schemeTransition
        schemeTransition.setAppData(projectData.rooms);

        const currentPath = route.path;
        const is3DView = currentPath === '/3d';

        if (is3DView) {
          // Если мы на 3D, конвертируем данные только для 3D
          roomState.routConvertData('/3d');

          // Устанавливаем ID проекта в store
          projectState.setProjectId(id.toString());

          // Ждем, чтобы данные успели обновиться
          await nextTick();

          // Уведомляем о загрузке контента
          eventBus.emit("A:ContantLoaded", true);

          // Загружаем первую комнату в 3D сцену
          const rooms = roomState.getRooms;
          if (rooms && rooms.length > 0) {
            const firstRoomId = rooms[0].id;
            // Небольшая задержка для гарантии обновления данных
            await nextTick();

            // Устанавливаем состояние загрузки перед загрузкой комнаты
            await roomState.setLoad(false);
            eventBus.emit("A:Load", firstRoomId);

            // Ждем, пока сцена отрендерится
            await waitForSceneReady();
          }

          toaster.success("Проект загружен");

          // Закрываем попап
          closePopup();

          loadSuccess = true;
        }
        else {
          // Если мы на 2D или другом маршруте, конвертируем данные для 2D
          // 3. Конвертируем данные для 3D (чтобы rooms.value был заполнен)
          roomState.routConvertData('/3d');

          // 4. Конвертируем данные для 2D (чтобы данные были в правильном формате)
          roomState.routConvertData('/2d');

          // 5. Устанавливаем ID проекта в store
          projectState.setProjectId(id.toString());

          // 6. Уведомляем о загрузке контента
          eventBus.emit("A:ContantLoaded", true);

          toaster.success("Проект загружен");

          // 7. Переходим на 2D конструктор
          await router.push("/2d");

          // 8. Ждем готовности C2D и инициализируем слои
          await nextTick(); // Ждем, чтобы компонент начал монтироваться
          const c2d = await waitForC2D();

          if (c2d?.layers?.planner && c2d?.layers?.doorsAndWindows) {
            // Проверяем, что данные есть перед инициализацией
            const roomsData = schemeTransition.getAllData();
            if (roomsData && roomsData.length > 0) {
              c2d.layers.planner.init(true);
              c2d.layers.doorsAndWindows.init(true);
            } else {
              console.warn("Данные проекта не найдены в schemeTransition");
            }
          } else {
            console.warn("C2D не готов после ожидания");
          }

          // 9. Закрываем попап только после успешной инициализации
          closePopup();

          loadSuccess = true;
        }
      } catch (error) {
        console.error("Ошибка применения данных проекта:", error);
        toaster.error("Ошибка загрузки проекта");
        loadSuccess = false;
      }
    }
  } catch (error) {
    console.error("Ошибка загрузки проекта:", error);
    toaster.error("Ошибка загрузки проекта");
    loadSuccess = false;
  } finally {
    isProjectLoading.value = false;
  }

  return loadSuccess;
};

// Ожидание готовности 3D сцены
const waitForSceneReady = async (timeout = 30000, interval = 100) => {
  const start = Date.now();
  return new Promise<void>((resolve) => {
    const check = () => {
      if (roomState.getLoad) {
        resolve();
        return;
      }
      if (Date.now() - start >= timeout) {
        console.warn("Таймаут ожидания готовности сцены");
        resolve();
        return;
      }
      setTimeout(check, interval);
    };
    check();
  });
};

// Функция ожидания готовности C2D
const waitForC2D = async (timeout = 3000, interval = 50) => {
  const start = Date.now();
  return new Promise<typeof window.C2D | null>((resolve) => {
    const check = () => {
      if (window.C2D?.layers?.planner && window.C2D?.layers?.doorsAndWindows) {
        resolve(window.C2D);
        return;
      }
      if (Date.now() - start >= timeout) {
        resolve(null);
        return;
      }
      setTimeout(check, interval);
    };
    check();
  });
};

/*const uploadProjectTech = function (id) {
  loadProject(id);
  closePopup();
}*/

onMounted(() => {

  if (!techList.filter)
    techList.filter = 0
  if (!techList.pager)
    techList.pager = 1

  getTechList()
})

watch(() => techList.filter, () => {
  getTechList()
})

watch(() => techList.pager, () => {
  getTechList()
})

const handlePageChange = (page: number) => {
  techList.pager = page;
}

// Адаптация данных навигации для компонента пагинации
const getNavData = () => {
  if (!techList.nav) return null;

  const nav = techList.nav;
  const currentPage = Number(nav.NavPageNomer) || 1;
  const totalPages = Number(nav.NavPageCount) || 1;
  const maxSize = 5; // максимальное количество видимых страниц

  // Вычисляем окно страниц, если не задано
  let nStartPage = nav.nStartPage ? Number(nav.nStartPage) : null;
  let nEndPage = nav.nEndPage ? Number(nav.nEndPage) : null;

  if (!nStartPage || !nEndPage) {
    // Вычисляем окно страниц вокруг текущей страницы
    const halfWindow = Math.floor(maxSize / 2);
    nStartPage = Math.max(1, currentPage - halfWindow);
    nEndPage = Math.min(totalPages, currentPage + halfWindow);

    // Корректируем границы, если окно слишком маленькое
    if (nEndPage - nStartPage < maxSize - 1) {
      if (nStartPage === 1) {
        nEndPage = Math.min(totalPages, maxSize);
      } else if (nEndPage === totalPages) {
        nStartPage = Math.max(1, totalPages - maxSize + 1);
      }
    }
  }

  return {
    ...nav,
    NavPageNomer: currentPage,
    NavPageCount: totalPages,
    nStartPage,
    nEndPage,
    nPageWindow: maxSize
  };
}

</script>

<template>
  <div class="technologist" @click="handleRootClick">

    <div class="technologist-header">
      <div class="technologist-header__title">Список заявок</div>

      <ClosePopUpButton
          class="technologist-header__close-btn"
          @click="closePopup(true)"
      />
    </div>

    <div class="technologist-container">

      <div class="filterList">
        <label
            :class="['filterItem', {'active': '0' == techList.filter}]"
        >
          <input
              type="radio"
              name="filterItem"
              :value="0"
              id="filterItem_1"
              style="display: none;"
              v-model="techList.filter"
          >
          <span>Все</span>
        </label>
        <label
            :class="['filterItem', {'active': status.STATUS_ID == techList.filter}]"
            v-for="status in APP.STATUS_TECH"
            :style="`color:${status.EXTRA.COLOR}`"
        >
          <input
              type="radio"
              name="filterItem"
              :value="status.STATUS_ID"
              :id="`filterItem_${status.ID}`"
              style="display: none;"
              v-model="techList.filter"
          >
          <span>{{ status.NAME }}</span>
        </label>
      </div>

      <div v-if="techList.nav" class="pagination_wrap">
        <Pagination
            v-if="getNavData()"
            :nav-data="getNavData()"
            @page-changed="handlePageChange"
        />
        <div class="badge">{{ techList.nav?.NavPageNomer }}/{{ techList.nav?.NavPageCount }}</div>
      </div>

      <div v-if="techList.loader" class="technologist__loader"></div>

        <div v-if="!techList.loader" class="appList">
        <div v-for="elem in techList.elements" class="appItem">
          <div class="appItem-propText appItem-propText--with-hint">
            <span class="appItem-propText__name">
              {{ elem.name }}
            </span>
            <button
                type="button"
                class="appItem-propText__hint-btn"
                @click.stop="openedHintId === elem.id ? openedHintId = null : openedHintId = elem.id"
            >
              ?
            </button>

             <div
                 v-if="openedHintId === elem.id"
                 class="appItem-propText__hint-popup"
                 @click.stop
             >
               <p class="appItem-propText__hint-popup__row">Номер сделки: {{elem.id || "-"}}</p>
               <p class="appItem-propText__hint-popup__row">Дизайнер: {{elem.fio || "-"}}</p>
               <p class="appItem-propText__hint-popup__row">Телефон: {{elem.phone || "-"}}</p>
               <p class="appItem-propText__hint-popup__row">E-mail: {{elem.mail || "-"}}</p>
               <p class="appItem-propText__hint-popup__row">Проект дизайнера: {{elem.projectId || "-"}}</p>
               <p class="appItem-propText__hint-popup__row">Проект технолога: {{elem.projectTechId || "-"}}</p>
               <div
                   class="appItem-propText__hint-popup__array_rows"
                   v-if="elem.technique?.length"
               >
                 <label class="appItem-propText__hint-popup__row">Список техники:</label>
                 <div v-for="tech in elem.technique">
                   <p class="appItem-propText__hint-popup__row">* {{tech}}</p>
                 </div>
               </div>
               <div
                   class="appItem-propText__hint-popup__array_rows"
                   v-if="elem.sketch?.length"
               >
                 <p>* Техническое задание:</p>
                 <div v-for="file in elem.sketch">
                   <a
                       v-if="file.urlPreview"
                       class="preview"
                       @click="() => fileStorage.openFileFromComment(file)"
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
                 </div>
               </div>
               <div
                   class="appItem-propText__hint-popup__array_rows"
                   v-if="elem.photoRoom?.length"
               >
                 <p>Фото помещения:</p>
                 <div v-for="file in elem.photoRoom">
                   <a
                       v-if="file.urlPreview"
                       class="preview"
                       @click="() => fileStorage.openFileFromComment(file)"
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
                 </div>
               </div>
               <div
                   class="appItem-propText__hint-popup__array_rows"
                   v-if="elem.metering?.length"
               >
                 <p>Замеры помещения:</p>
                 <div v-for="file in elem.metering">
                   <a
                       v-if="file.urlPreview"
                       class="preview"
                       @click="() => fileStorage.openFileFromComment(file)"
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
                 </div>
               </div>
             </div>
          </div>
          <div class="appItem-propText">Проект №{{ elem.projectId }}</div>
          <div class="appItem-propText">
            Статус:
            <h :style="`color:${APP.STATUS_TECH[elem.statusId].EXTRA.COLOR}`">{{
                APP.STATUS_TECH[elem.statusId].NAME
              }}
            </h>
          </div>

          <MainButton
              v-if="APP.userGroup[56] && ['C10:PREPARATION', 'C10:NEW'].includes(elem.statusId)"
              @click="openModalSTD(elem, 'C10:4');"
              :class-name="'appItem-status-btn'"
              :style="`border-color:${APP.STATUS_TECH['C10:4'].EXTRA.COLOR}`"
          >
            Отправить проект на доработку дизайнеру
          </MainButton>

          <MainButton
              v-if="((APP.userGroup[6] || APP.userGroup[29]) && ['C10:4', 'C10:PREPAYMENT_INVOIC'].includes(elem.statusId))"
              @click="openModalSTD(elem, 'C10:PREPARATION');"
              :class-name="'appItem-status-btn'"
              :style="`border-color:${APP.STATUS_TECH['C10:PREPARATION'].EXTRA.COLOR}`"
          >
            Вернуть в работу
          </MainButton>

          <MainButton
              v-if="(APP.userGroup[56] && ['C10:4'].includes(elem.statusId))"
              @click="setStatus(elem.id, 'C10:PREPARATION');"
              :class-name="'appItem-status-btn'"
              :style="`border-color:${APP.STATUS_TECH['C10:PREPARATION'].EXTRA.COLOR}`"
          >
            Вернуть в работу
          </MainButton>

          <MainButton
              v-if="APP.userGroup[56] && (elem.statusId == 'C10:PREPARATION' || elem.statusId == 'C10:1')"
              @click="openModalSTD(elem, 'C10:PREPAYMENT_INVOIC')"
              :class-name="'appItem-status-btn'"
              :style="`border-color:${APP.STATUS_TECH['C10:PREPAYMENT_INVOIC'].EXTRA.COLOR}`"
          >
            Отправить проект дизайнеру
          </MainButton>

<!--          <MainButton
              v-if="(APP.userGroup[6] || APP.userGroup[29]) && elem.statusId == 'C10:PREPAYMENT_INVOIC'"
              @click="setStatus(elem.id, 'C10:2');"
              :class-name="'appItem-status-btn'"
              :style="`border-color:${APP.STATUS_TECH['C10:2'].EXTRA.COLOR}`"
          >
            Принять работу
          </MainButton>

          <MainButton
              v-if="APP.userGroup[56] && elem.statusId == 'C10:2'"
              @click="setStatus(elem.id, 'C10:3');"
              :class-name="'appItem-status-btn'"
              :style="`border-color:${APP.STATUS_TECH['C10:3'].EXTRA.COLOR}`"
          >
            Принять работу
          </MainButton>-->

          <!--Какой проект надо грузить? Технолога или дизайнера?-->
          <div
              v-if="(APP.userGroup[6] || APP.userGroup[29]) && elem.statusId == 'C10:PREPAYMENT_INVOIC'"
              :style="`width: 100%`"
          >
            <MainButton
                v-if="elem.projectTechId == projectState.currentProjectId"
                @click="openModalOrder(elem);"
                :class-name="'appItem-btn'"
                :style="`border-color:${APP.STATUS_TECH['C10:WON'].EXTRA.COLOR}`"
            >
              Оформить заказ
            </MainButton>
            <MainButton
                v-else
                :class-name="'appItem-btn disabled'"
                disabled
                title="Нельзя оформить проект! Проект не совпадает с проектом технолога!"
            >
              Оформить заказ
            </MainButton>
          </div>


          <MainButton
              v-if="elem.statusId == 'C10:NEW' && APP.userGroup[56]"
              @click="setStatus(elem.id, 'C10:PREPARATION');"
              :class-name="'appItem-status-btn'"
              :style="`border-color:${APP.STATUS_TECH['C10:PREPARATION'].EXTRA.COLOR}`"
          >
            Взять в работу
          </MainButton>

          <MainButton
              v-if="APP.userGroup[56] && elem.statusId == 'C10:PREPARATION'"
              @click="setStatus(elem.id, 'C10:LOSE');"
              :class-name="'appItem-status-btn'"
              :style="`border-color:${APP.STATUS_TECH['C10:LOSE'].EXTRA.COLOR}`"
          >
            Отказать
          </MainButton>

          <MainButton
              v-if="APP.userGroup[56] && elem.projectId"
              @click="uploadProjectTech(elem.projectId);"
              :class-name="'appItem-btn'"
          >
            Загрузить проект дизайнера
          </MainButton>

          <MainButton
              v-if="elem.projectTechId"
              @click="uploadProjectTech(elem.projectTechId);"
              :class-name="'appItem-btn'"
          >
            Загрузить проект технолога
          </MainButton>

          <MainButton
              @click="openModalComments(elem)"
              :class-name="'appItem-btn'"
          >
            Комментарии
          </MainButton>
        </div>
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
  padding-top: 3vh;
  box-sizing: border-box;
  width: 90vw;
  height: 85vh;
  overflow-x: hidden;
  overflow-y: auto;
  font-size: 1.4rem;

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

  &-container {
    padding: 0 50px;
    height: 100%;
    width: 100%;

    .filterList {
      display: flex;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      align-content: center;

      .filterItem {
        margin-right: 10px;
        border: 2px solid;
        padding: 5px 20px;
        border-radius: 5px;
        cursor: pointer;

        &.active {
          background: #333333;
          color: #fff;
        }
      }
    }

    .appList {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-start;
      overflow-y: scroll;
      overflow-x: hidden;
      margin-top: 1rem;
      max-height: 64vh;

      .appItem {
        display: flex;
        flex-direction: column;
        border: 2px solid;
        border-radius: 15px;
        width: 20vw;
        height: 53vh;
        padding: 10px;
        align-items: center;
        margin-bottom: 1rem;
        margin-right: 1rem;
        justify-content: space-evenly;
        overflow-y: scroll;
        overflow-x: hidden;

        &-propText {
          width: 100%;
          border-bottom: 1px solid;
          padding-bottom: 5px;
          margin-bottom: 5px;
          text-align: center;

          &--with-hint {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            gap: 6px;
            position: relative;
          }

          &__name {
            flex: 1 1 auto;
            min-width: 0;
            word-wrap: break-word;
            word-break: break-word;
            overflow-wrap: break-word;
            text-align: center;
          }

          &__hint-btn {
            flex: 0 0 auto;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            border: 1px solid #ccc;
            background: #f5f5f5;
            font-size: 1.2rem;
            line-height: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            padding: 0;
          }

          &__hint-popup {
            position: absolute;
            top: 100%;
            right: 0;
            padding: 8px 10px;
            gap: 0.5rem;
            margin-top: 4px;

            max-width: 240px;
            max-height: 350px;

            border-radius: 6px;
            background: #ffffff;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            font-size: 1.2rem;
            text-align: left;

            z-index: 5;
            display: flex;
            flex-direction: column;
            overflow-y: scroll;
            overflow-x: hidden;

            &__row{
              color: black;
            }

            &__array_rows{
              border-radius: 10px;
              border: $dark-stroke 1px solid;
              color: black;
              padding: 5px;
            }
          }
        }

        &-btn {
          margin-bottom: 10px;
          background: white;
          border: $strong-grey 1px solid;
          width: 100%;

          &:hover {
            background-color: $red;
            color: $white;
          }

          &.disabled {
            background-color: $light-grey;
            border: $strong-grey 1px solid;
            cursor: not-allowed;

            &:hover {
              color: $strong-grey;
            }
          }
        }

        &-status-btn {
          width: 100%;
          margin-bottom: 10px;
          border: $strong-grey 1px solid;
        }
      }
    }

    .pagination_wrap {
      display: flex;
      align-items: center;
    }

    .badge {
      height: 20px;
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
