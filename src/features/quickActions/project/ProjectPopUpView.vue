<template>
  <div class="project-popup-wrapper">

    <ClosePopUpButton class="popup__close" @close="closePopup" />

    <!-- Вкладки сверху попапа -->
    <div class="project-tabs">
      <button class="project-tabs__tab" :class="{ 'project-tabs__tab--active': activeTab === 'projects' }"
        @click="activeTab = 'projects'">
        Мои проекты
      </button>
      <button class="project-tabs__tab" :class="{ 'project-tabs__tab--active': activeTab === 'templates' }"
        @click="activeTab = 'templates'">
        Готовые проекты
      </button>
    </div>

    <div class="project">
      <GenericLoader v-show="isProjectLoading" />
      <!-- <div class="project__title">{{ activeTab === 'projects' ? 'Мои проекты' : 'Готовые проекты' }}</div> -->


      <div class="project__container">

        <!-- Фильтры -->
        <div class="project-header">
          <div class="project-search">
            <MainInput v-model="filters.name" type="text" placeholder="Название" :min="0" :max="99999999"
              class="search-input" />
            <MainInput v-model="filters.id" type="text" placeholder="ID" :maxlength="30" :digitsOnly="true"
              class="search-input" />
            <select v-model="selectedBackendId" class="search-input backend-ids-select" @change="onBackendIdSelect">
              <option value="all">Все проекты</option>
              <option v-for="owner in backendIdsList" :key="owner.ID" :value="owner.ID">
                {{
                  [owner.NAME, owner.LAST_NAME].filter(Boolean).join(" ") ||
                  owner.ID
                }}
              </option>
            </select>
            <div class="search-input date-filter">
              <input v-model="dateFrom" type="date" class="search-input date-filter__input" placeholder="Дата от" />
              <span class="date-filter__separator">—</span>
              <input v-model="dateTo" type="date" class="search-input date-filter__input" placeholder="Дата до" />
            </div>
            <form class="load-by-id" @submit.prevent="onLoadByIdSubmit">
              <MainInput v-model="loadByIdValue" type="text" placeholder="Загрузить по ID"
                class="search-input load-by-id__input" :maxlength="30" :digitsOnly="true" />
            </form>
          </div>
          <div class="project-buttons">
            <!-- <MainButton
            :className="tab === 'ready' ? 'red__button' : 'grey__button'"
            @click="switchTab('ready')"
            :disabled="isLoading"
          >
            Готовые проекты
          </MainButton>
          <MainButton
            :className="tab === 'my' ? 'red__button' : 'grey__button'"
            @click="switchTab('my')"
            :disabled="isLoading"
          >
            Мои проекты
          </MainButton> -->
          </div>
        </div>

        <!-- Предупреждение -->
        <!-- <div class="project-warning">
        <div v-if="!projectState.currentProjectId" class="warning-text">
          <p class="warning-text__title">Новый проект</p>
          <p class="warning-text__text">
            Сохраните проект, чтобы он появился в списке
          </p>
        </div>
        <MainButton
          :className="'blue__button'"
          @click="saveProject"
          :disabled="projectState.isSaving"
        >
          {{ projectState.isSaving ? "Сохранение..." : "Сохранить" }}
        </MainButton>
      </div> -->

        <!-- Список проектов -->
        <div class="project-list" :class="{ 'project-list--loading': isLoading }">
          <!-- Лоадер -->
          <div v-if="isLoading" class="project-loader">
            <div class="loader-spinner"></div>
            <p>Загрузка проектов...</p>
          </div>

          <div v-else-if="loadError" class="project-error">
            <p class="error-text">{{ loadError }}</p>
            <MainButton :className="'blue__button'" @click="retryLoad">
              Попробовать снова
            </MainButton>
          </div>

          <!-- Пустой список -->
          <div v-else-if="!isLoading && projects.length === 0" class="project-empty">
            <p>Проекты не найдены</p>
          </div>

          <!-- Создать новый проект -->
          <!-- <div
          v-if="!isLoading && !loadError"
          class="project-new"
          @click="createNewProject"
        >
          <img src="@/assets/svg/popup/add.svg" alt="" />
          <p class="new__title">Создать новый проект</p>
        </div> -->

          <div v-for="project in paginatedProjects" :key="project.id" class="project-item">
            <div class="project-item__main" @click="loadProject(project.id)">

              <div class="item-image__wrap">
                <img :src="getProgectImage(project)" class="item-image" :alt="project.name || 'Проект'" />
                <div class="item-delete-btn">
                  <ClosePopUpButton @close="onDeleteProject(project.id)" @click.stop />
                </div>

              </div>

              <div class="item-info">
                <div class="info-id">
                  <p class="id__name">{{ project.name || "Название" }}</p>

                  <div class="id__row">
                    <p class="id__number text-grey">
                      ID {{ project.id }}
                    </p>

                    <div class="id__actions">
                      <button class="copy-id-button" @click.stop="copyProjectId(project.id)" title="Скопировать ID">
                        <img src="@/assets/svg/copy.svg" alt="copy-id" />
                      </button>

                      <button class="copy-link-button" @click.stop="copyProjectLink(project.id)"
                        title="Скопировать ссылку">
                        <img src="@/assets/svg/copy.svg" alt="copy-link" />
                      </button>
                    </div>
                  </div>
                </div>
                <p class="info__date text-grey">{{ project.date }}</p>
              </div>

              <TechnologistFormButton :project="project" @click="closePopup" />
            </div>
          </div>
        </div>

        <div v-if="!isLoading && !loadError && totalElements > PAGE_SIZE" class="project__pagination">
          <ProjectPagination :total-items="totalElements" :page-size="PAGE_SIZE" v-model:current-page="currentPage" />
        </div>
      </div>

      <Modal ref="deleteConfirmModalRef">
        <template #modalBody="{ onModalClose }">
          <div class="delete-confirm-dialog">
            <p class="delete-confirm-dialog__text">Вы уверены?</p>
            <div class="delete-confirm-dialog__actions">
              <MainButton :className="'grey__button'" @click="onModalClose">Отменить</MainButton>
              <MainButton :className="'red__button'" @click="() => confirmDeleteProject(onModalClose)">Удалить
              </MainButton>
            </div>
          </div>
        </template>
      </Modal>
    </div>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck

import { ref, onMounted, watch, nextTick, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import MainButton from "@/components/ui/buttons/MainButton.vue";
import MainInput from "@/components/ui/inputs/MainInput.vue";
import ClosePopUpButton from "@/components/ui/svg/ClosePopUpButton.vue";
import Modal from "@/components/ui/modals/Modal.vue";
import { usePopupStore } from "@/store/appStore/popUpsStore";
import { useAuthStore } from "@/store/appStore/authStore";
import { useSceneState } from "@/store/appliction/useSceneState";
import { useEventBus } from "@/store/appliction/useEventBus";
import { useProjectStore } from "./store/useProjectStore";
import { useProjectAPI } from "./composables/useProjectAPI";
import { useSchemeTransition } from "@/store/canvasMerge/schemeTransition";
import { useConstructor2DHistory } from "@/store/constructor2d/useConstructor2DHistory";
import { Project, ProjectTab } from "./types";
import { useToast } from "@/features/toaster/useToast";
import { useRoomState } from "@/store/appliction/useRoomState";
import { useRoomOptions } from "@/components/left-menu/option/roomOptions/useRoomOptons";
import GenericLoader from "@/components/ui/loader/GenericLoader.vue";
import ProjectPagination from "./components/ProjectPagination.vue";
import TechnologistFormButton from "@/components/Technologist/TechnologistFormButton.vue";
import { BASE_DOMAIN } from "@/utils/originalDomain";
import { buildProjectLink } from "./composables/useProjectLink";

const router = useRouter();
const route = useRoute();
const toaster = useToast();
const popupStore = usePopupStore();
const authStore = useAuthStore();
const sceneState = useSceneState();
const eventBus = useEventBus();
const schemeTransition = useSchemeTransition();
const constructor2DHistory = useConstructor2DHistory();

const API_URL = ref(`https://${BASE_DOMAIN}`);
const PAGE_SIZE = 12;

// Простое состояние (серверная пагинация: в projects только элементы текущей страницы)
const projects = ref<Project[]>([]);
const totalElements = ref(0);
const currentPage = ref(1);
const tab = ref<ProjectTab>("my");
const loadError = ref<string | null>(null);
const isLoading = ref(false);
const filters = ref<{ name: string; id: string }>({ name: "", id: "" });
const dateFrom = ref("");
const dateTo = ref("");
const loadByIdValue = ref("");

// Список владельцев салонов (из getSalonOwner) — в селекте показываем имена, value = ID для getprojectlist
const backendIdsList = computed(() => authStore.salonOwnerList ?? []);
const selectedBackendId = ref<string>("all");

const paginatedProjects = computed(() => projects.value);

const onBackendIdSelect = async () => {
  if (selectedBackendId.value === "all") {
    tab.value = "ready";
  } else {
    tab.value = "my";
  }
  currentPage.value = 1;
  await loadProjects(0);
};

const projectState = useProjectStore();
const projectAPI = useProjectAPI();
const roomState = useRoomState();
const roomOptions = useRoomOptions();

const isProjectLoading = ref(false);
const activeTab = ref<'projects' | 'templates'>('projects');

const getProgectImage = computed(() => {
  return (project) => {
    if (project.img) {
      return `${API_URL.value}/${project.img}`;
    }
    return "/src/assets/img/proj.png";
  };
  // ? `https://dev.vardek.online${project.img}`
  // : '/src/assets/img/proj.png'
});

watch(
  filters,
  () => {
    currentPage.value = 1;
    loadProjects(300);
  },
  { deep: true },
);

watch([dateFrom, dateTo], () => {
  currentPage.value = 1;
  loadProjects(300);
});

watch(currentPage, (newPage, oldPage) => {
  if (oldPage != null && newPage !== oldPage) {
    loadProjects(0);
  }
});

watch(activeTab, () => {
  currentPage.value = 1;
  loadProjects(0);
});

const closePopup = () => {
  popupStore.closePopup("project");
};

const deleteConfirmModalRef = ref<InstanceType<typeof Modal> | null>(null);
const projectIdToDelete = ref<number | null>(null);

const onDeleteProject = (projectId: number) => {
  projectIdToDelete.value = projectId;
  deleteConfirmModalRef.value?.openModal();
};

const confirmDeleteProject = async (onModalClose: () => void) => {
  const id = projectIdToDelete.value;
  if (id == null) {
    onModalClose();
    return;
  }
  const result = await projectAPI.deleteProject(id);
  projectIdToDelete.value = null;
  onModalClose();
  if (result.success) {
    await loadProjects(0);
  } else {
    toaster.error(result.error ?? 'Не удалось удалить проект');
  }
};

const switchTab = async (newTab: ProjectTab) => {
  tab.value = newTab;
  loadError.value = null;
  await loadProjects(0);
};

const loadProjects = async (delay: number = 300) => {
  isLoading.value = true;
  loadError.value = null;

  try {
    const sel = selectedBackendId.value;
    const designerValue =
      sel === "all"
        ? "all"
        : sel === "my"
          ? authStore.userData?.id != null
            ? String(authStore.userData.id)
            : "all"
          : String(sel);

    const nameTrim = filters.value.name?.trim();
    const name = nameTrim !== "" ? nameTrim : undefined;

    let id: number | undefined;
    const idStr = filters.value.id?.toString().trim();
    if (idStr) {
      const idValue = parseInt(idStr, 10);
      if (!isNaN(idValue) && idValue > 0) id = idValue;
    }

    const dateFromVal = dateFrom.value?.trim() || undefined;
    const dateToVal = dateTo.value?.trim() || undefined;

    const readySolutions = activeTab.value === 'templates';

    const result = await projectAPI.loadProjects(
      {
        designerValue,
        name,
        id,
        dateFrom: dateFromVal,
        dateTo: dateToVal,
        elementsOnPage: PAGE_SIZE,
        currentPage: currentPage.value,
        readySolutions,
      },
      delay,
    );
    projects.value = result.items;
    totalElements.value = result.totalElements;

    if (result.items.length === 0 && !name && id == null) {
      loadError.value = "Не удалось загрузить проекты";
    }
  } catch (error) {
    console.error("Ошибка загрузки проектов:", error);
    loadError.value = "Ошибка загрузки проектов";
  } finally {
    isLoading.value = false;
  }
};

const retryLoad = async () => {
  await loadProjects(0);
};

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

const onLoadByIdSubmit = () => {
  const raw = loadByIdValue.value?.trim();
  if (!raw) return;
  const id = parseInt(raw, 10);
  if (isNaN(id) || id <= 0) {
    toaster.error("Введите корректный ID проекта");
    return;
  }
  loadProject(id);
};

const loadProject = async (id: string | number) => {
  if (!id) return;

  isProjectLoading.value = true;

  try {
    const projectData = await projectAPI.loadProject(id.toString());
    if (projectData) {
      projectState.resetState();
      projectState.setInitialState(projectData);
      console.log(projectData, "----PROD");

      try {
        schemeTransition.clearStore();
        // Очищаем текущую комнату перед загрузкой нового проекта
        roomState.clearCurrentRoomId();

        // 1. Обновляем данные проекта в sceneState
        await sceneState.loadProjectFromData(projectData);
        sceneState.updateProjectParams({});

        // 2. Устанавливаем данные в schemeTransition
        schemeTransition.setAppData(projectData.rooms);
        roomState.routConvertData("/3d");

        const currentPath = route.path;
        const is3DView = currentPath === "/3d";

        if (is3DView) {
          // Если мы на 3D, конвертируем данные только для 3D
          roomState.routConvertData("/3d");

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
        } else {
          // Если мы на 2D или другом маршруте, конвертируем данные для 2D
          // 3. Конвертируем данные для 3D (чтобы rooms.value был заполнен)
          roomState.routConvertData("/3d");

          // 4. Устанавливаем первую комнату как текущую активную сразу после загрузки комнат
          await nextTick(); // Ждем, чтобы комнаты успели загрузиться
          const rooms = roomState.getRooms;
          if (rooms && rooms.length > 0) {
            // Всегда устанавливаем первую комнату из загруженного проекта
            roomState.setCurrentRoomId(rooms[0].id);
          }

          // 5. Конвертируем данные для 2D (чтобы данные были в правильном формате)
          roomState.routConvertData("/2d");

          // 6. Устанавливаем ID проекта в store
          projectState.setProjectId(id.toString());

          // 7. Уведомляем о загрузке контента
          eventBus.emit("A:ContantLoaded", true);

          toaster.success("Проект загружен");

          // 8. Переходим на 2D конструктор
          await router.push("/2d");

          // 9. Ждем готовности C2D и инициализируем слои
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

          // 10. Закрываем попап только после успешной инициализации
          closePopup();
        }
      } catch (error) {
        console.error("Ошибка применения данных проекта:", error);
        toaster.error("Ошибка загрузки проекта");
      }
    } else {
      toaster.error("Проект не найден");
    }
  } catch (error) {
    console.error("Ошибка загрузки проекта:", error);
    toaster.error("Ошибка загрузки проекта");
  } finally {
    isProjectLoading.value = false;
  }
};

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

const saveProject = async () => {
  projectState.isSaving = true;

  try {
    const result = await projectAPI.saveProject(projectState.currentProjectId);

    if (result.success) {
      if (result.data?.ID) projectState.setProjectId(result.data.ID);
      projectState.updateAfterSave();
      const roomsData = schemeTransition.getAllData() ?? [];
      if (roomsData.length > 0) {
        constructor2DHistory.clearHistory(JSON.parse(JSON.stringify(roomsData)));
      }
      await loadProjects(0);
    } else {
      console.error("❌ Ошибка сохранения:", result.error);
    }
  } catch (error) {
    console.error("❌ Исключение при сохранении:", error);
    alert("Ошибка сохранения проекта");
  } finally {
    projectState.isSaving = false;
    toaster.success("Сохранено");
  }
};

const createNewProject = async () => {
  try {
    sceneState.createNewProject();
    projectState.resetState();
    projectState.setInitialState(sceneState.getCurrentProjectParams);

    await router.push("/2d");
    closePopup();
    toaster.success("Создано");
  } catch (error) {
    console.error("Ошибка создания нового проекта:", error);
  }
};

const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement;
  target.src = "/src/assets/img/proj.png";
};

const initializeState = () => {
  const currentState = sceneState.getCurrentProjectParams;
  projectState.setInitialState(currentState);
};

const copyProjectId = async (id: string | number) => {
  try {
    await navigator.clipboard.writeText(String(id));
    toaster.success(`ID ${id} скопирован`);
  } catch (e) {
    console.error("Ошибка копирования:", e);
    toaster.error("Не удалось скопировать ID");
  }
};

const copyProjectLink = async (id: string | number) => {
  try {
    const link = buildProjectLink(router, id);
    await navigator.clipboard.writeText(link);
    toaster.success("Ссылка на проект скопирована");
  } catch (e) {
    console.error("Ошибка копирования ссылки:", e);
    toaster.error("Не удалось скопировать ссылку");
  }
};

onMounted(async () => {
  await loadProjects(0);
  initializeState();
});
</script>

<style lang="scss" scoped>
// Базовый компонент
.popUp {
  &__container {
    padding: 0;
  }

  &__close {

    top: 1rem;
    right: 1rem;

  }
}

.project {
  width: var(--modal-large-width);
  max-width: 100%;
  height: var(--modal-large-height);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  font-size: 1.4rem;

  &__title {
    text-align: center;
    margin-bottom: 30px;
    font-size: 3.2rem;
    font-weight: 600;
  }

  &__container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    flex: 1;
    min-height: 0;
  }

  &__pagination {
    flex-shrink: 0;
    width: 100%;
    padding-top: 10px;
    border-top: 1px solid $stroke;
  }
}

// Хедер проекта
.project-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.7rem;
  border: 1px solid $stroke;
  border-radius: 15px;
}

.project-search {
  display: flex;
  align-items: center;
  gap: 10px;

  &__input {
    min-width: 150px;
    width: 200px;
    padding: 12px;
  }

  &__select {
    cursor: pointer;
  }
}

.date-filter {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;

  &__input {
    min-width: 140px;
    width: auto;
  }

  &__separator {
    color: #666;
    flex-shrink: 0;
  }
}

.load-by-id {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: 100px;
  padding-left: 16px;

  &__input {
    min-width: 120px;
    width: 140px;
  }
}

.project-buttons {
  display: flex;
  align-items: center;
  gap: 10px;
}

// Варнинг компонент
.project-warning {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f6f5fa;
  border-radius: 15px;
  padding: 19px 15px;

  &__text {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
}

// Список проектов
.project-list {
  min-height: 0;
  display: flex;
  flex-wrap: wrap;
  overflow-y: auto;
  gap: 1rem;
  justify-content: center;

  &--loading {
    .project-item {
      opacity: 0;
      pointer-events: none;
    }
  }
}

// Лоадер
.project-loader {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;

  &__spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 20px;
  }

  &__text {
    color: #666;
    font-size: 1.6rem;
  }
}

// Ошибка
.project-error {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  gap: 20px;

  &__text {
    color: #e74c3c;
    font-size: 1.6rem;
    text-align: center;
  }
}

// Пустое состояние
.project-empty {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;

  &__text {
    color: #666;
    font-size: 1.6rem;
  }
}

// Новая карточка (создание проекта)
.project-new {
  width: 323px;
  height: 269px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  border: 1px solid $stroke;
  border-radius: 16px;
  box-sizing: border-box;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f8f8f8;
  }
}

// Карточка проекта
.project-item {
  width: 100%;
  max-width: 300px;
  max-height: 300px;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  background-color: $bg;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &__main {
    display: flex;
    flex-direction: column;
    cursor: pointer;
  }

  &__image-wrap {
    display: flex;
    position: relative;
    width: 100%;
    max-height: 150px;
  }

  &__image {
    margin: 0;
    width: 100%;
    max-width: 200px;
    object-fit: cover;
  }

  &__delete-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 1;
    cursor: pointer;
  }

  &__info {
    width: 100%;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding: 15px 10px;
    box-sizing: border-box;
  }

  &__id-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }
}

// Кнопки копирования
.copy-id-button {
  width: 22px;
  height: 22px;
  min-width: 22px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #000;
  border-radius: 4px;
  background: #000;
  cursor: pointer;
  transition: all 0.15s ease;

  img {
    width: 14px;
    height: 14px;
    filter: brightness(0) invert(1);
  }

  &:hover {
    background: #fff;
    border-color: $stroke;

    img {
      filter: none;
    }
  }

  &:active {
    transform: scale(0.95);
  }
}

.copy-link-button {
  width: 22px;
  height: 22px;
  min-width: 22px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid $stroke;
  border-radius: 4px;
  background: #e77177;
  cursor: pointer;
  transition: all 0.15s ease;

  img {
    width: 14px;
    height: 14px;
  }

  &:hover {
    background: #f3f3f3;
  }

  &:active {
    transform: scale(0.95);
  }
}

// Диалог подтверждения удаления
.delete-confirm-dialog {
  padding: 24px;
  min-width: 280px;
  background: #fff;
  border-radius: 16px;

  &__text {
    margin: 0 0 20px;
    font-size: 1.6rem;
    color: #333;
  }

  &__actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }
}

// Попап проекта
.project-popup-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  height: var(--modal-large-height);
  padding: 1.5rem;

  .project {
    border-radius: 0 16px 16px 16px;
    background-color: #fff;
    padding: 1rem 0;
  }
}

// Табы
.project-tabs {
  display: flex;
  align-self: flex-start;
  margin-left: 30px;

  &__tab {
    padding: 12px 24px;
    font-size: 1.4rem;
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    border-radius: 12px 12px 0 0;
    background-color: #e0e0e0;
    color: #666;
    position: relative;
    margin-right: 4px;

    &:hover:not(&--active) {
      background-color: #d0d0d0;
    }

    &--active {
      background-color: #fff;
      color: #333;
      font-weight: 600;
      z-index: 1;
    }
  }
}

.item {
  &-image {
    position: absolute;
    // max-width: 200px;
    width: 100%;
    width: 100%;

    &__wrap {
      position: relative;
      height: 150px;
      overflow: hidden;
    }
  }

  &-delete {
    &-btn {
      position: absolute;
      right: 0.5rem;
      top: 0.5rem;

      z-index: 1;
      padding: 1.5rem;
      border-radius: 100px;
      border: 1px solid $dark-stroke;
      background-color: $white;
      transition-property: border-color background-color;
      transition-duration: 0.25s;
      transition-timing-function: ease;

      svg {
        position: absolute;
        top: .5rem;
        right: .5rem;
        transform: translate(50% 50%);

        transition-property: fill ;
        transition-duration: 0.25s;
        transition-timing-function: ease;
      }

      @media (hover: hover) {
        &:hover {
          background-color: $dark-grey;
          border-color: $white;

        }
      }

    }
  }

  &-info {
    display: flex;
    flex-direction: column;
  }

}

.info {
  &-id {
    display: flex;
    flex-direction: column;
  }
}

.id {
  &__row {
    display: flex;
    gap: 1rem;
  }

  &__actions {
    display: flex;
    gap: 0.25rem;
  }
}

.backend {
  &-ids-select {}

}

.search {
  &-input {
    padding: 0.5rem 0.5rem 0.5rem 1rem;
  }
}

// Анимация
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}
</style>
