<template>
  <div class="quick-actions">
    <Tooltip
      v-for="(action, index) in actions"
      :key="index"
      :content="action.tooltip"
      position="bottom"
      v-show="action.path == 'default' || route.path == action.path"
    >
      <template #trigger>
        <button class="grey-radial__button" @click="action.action">
          <!-- <span v-if="action.iconSrc === 'folder'" class="icon">
            <img :src="folderIcon" alt="" class="icon-svg" />
          </span>
          <span v-else-if="action.iconSrc === 'book'" class="icon">
            <img :src="bookIcon" alt="" class="icon-svg" />
          </span>
          <span v-else-if="action.iconSrc" class="icon">
            <img :src="action.iconSrc" alt="" class="icon-svg" />
          </span> -->
          <span class="icon" :class="action.iconClass"></span>
        </button>
      </template>
    </Tooltip>

    <!-- Модальное окно для ввода имени проекта -->
    <Modal ref="saveDialogRef">
      <template #modalBody="{ onModalClose }">
        <InputDialog
          label="Назовите проект"
          placeholder="Введите название"
          :initialValue="currentProjectName"
          confirmText="Сохранить"
          @confirm="handleSaveConfirm"
          @cancel="onModalClose"
        >
          <template #confirmButton="{ onConfirm }">
            <MainButton
              @click="
                () => {
                  onConfirm();
                }
              "
            >
              Сохранить
            </MainButton>
          </template>
          <template #checkBox>
            <div class="checkbox_wrap">
              <div>
                <input type="checkbox" v-model="kpCheckbox" />
                <label class="checkbox_label">Сохранить КП</label>
              </div>
              <div>
                <input
                  type="checkbox"
                  v-model="centeringCheckbox"
                  @change="changeCamera()"
                />
                <label class="checkbox_label">Отцентровать</label>
              </div>
            </div>
          </template>
          <template #cancelButton>
            <MainButton @click="onModalClose">Отменить</MainButton>
          </template>
        </InputDialog>
      </template>
    </Modal>

    <!-- Закомментировано: модальное окно выбора действия (обновить / сохранить как новый). При сохранении сразу срабатывает "Сохранить как новый проект". -->
    <!-- <Modal ref="updateDialogRef">
      <template #modalBody="{ onModalClose }">
        <Update
          label="Сохранение проекта"
          optionOneLabel="Обновить текущий проект"
          optionTwoLabel="Сохранить как новый проект"
          optionOneValue="update"
          optionTwoValue="saveAsNew"
          @confirm="handleUpdateChoice"
          @cancel="onModalClose"
        >
          <template #confirmButton="{ onConfirm }">
            <MainButton
              @click="
                () => {
                  onConfirm();
                }
              "
            >
              Продолжить
            </MainButton>
          </template>
          <template #cancelButton="{ onCancel }">
            <MainButton @click="onCancel">Отменить</MainButton>
          </template>
        </Update>
      </template>
    </Modal> -->

    <Modal ref="kpDialogRef">
      <template #modalBody="{ onModalClose }">
        <Notification
          :label="'Коммерческое предложение'"
          :description="kpData?.text"
          :link="kpData?.link"
          @cancel="onModalClose"
        >
          <template #cancelButton>
            <MainButton @click="onModalClose">Закрыть</MainButton>
          </template>
        </Notification>
      </template>
    </Modal>
  </div>
  <GenericLoader v-show="projectStore.isSaving" />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import Tooltip from "@/components/ui/tooltip/Tooltip.vue";
import Modal from "@/components/ui/modals/Modal.vue";
import InputDialog from "@/components/ui/inputs/InputDialog.vue";
// import Update from "@/components/ui/inputs/Update.vue"; // закомментировано — модалка выбора не используется
import MainButton from "@/components/ui/buttons/MainButton.vue";
import GenericLoader from "@/components/ui/loader/GenericLoader.vue";
import Notification from "@/components/ui/inputs/Notification.vue";

import { useQuickActionsToolbar } from "./useQuickActionsToolbar";
import { useRoute } from "vue-router";
import { useSceneState } from "@/store/appliction/useSceneState";
import { useToast } from "@/features/toaster/useToast";
import { useEventBus } from "@/store/appliction/useEventBus";
import { useProjectStore } from "./project/store/useProjectStore";
// import folderIcon from "@/assets/svg/folder.svg";
// import bookIcon from "@/assets/svg/book.svg";

const {
  actions,
  openSaveDialog,
  // openUpdateDialog, // закомментировано — при сохранении сразу "Сохранить как новый"
  openSaveAsNewDialog,
  handleSaveConfirm: handleSaveConfirmFromComposable,
  // updateExistingProject // закомментировано — использовался в handleUpdateChoice (модалка Update)
} = useQuickActionsToolbar();

const route = useRoute();
const sceneState = useSceneState();
const toaster = useToast();
const eventBus = useEventBus();
const projectStore = useProjectStore();

const saveAsNewMode = ref(false);
const kpCheckbox = ref(false);
const centeringCheckbox = ref(false);
const changeCamera = () => {
  if (centeringCheckbox.value) {
    eventBus.emit("A:ChangeCameraPos", 4);
  }
};

// Рефы для модальных окон
const saveDialogRef = ref<InstanceType<typeof Modal> | null>(null);
// const updateDialogRef = ref<InstanceType<typeof Modal> | null>(null); // закомментировано — модалка Update не используется
const kpDialogRef = ref<InstanceType<typeof Modal> | null>(null);

const kpData = ref<{ link: string; text: string } | null>(null);

const openKpModal = (kp: { link: string; text: string }) => {
  kpData.value = kp;
  kpDialogRef.value?.openModal();
};

// Текущее название проекта
const currentProjectName = computed(() => {
  const projectData = sceneState.getCurrentProjectParams;
  return (projectData.project_name as string) || "Новый проект";
});

// Обработка подтверждения сохранения с названием проекта
const handleSaveConfirm = async (projectName: string) => {
  if (!projectName.trim()) {
    toaster.error("Введите название проекта");
    return;
  }
  if (saveAsNewMode.value && projectStore.currentProjectId) {
    // @ts-ignore
    projectStore.currentProjectId = null;
  }

  // Вызываем композицию сохранения
  const result = await handleSaveConfirmFromComposable(
    projectName.trim(),
    () => {
      saveDialogRef.value?.closeModal();
    },
    kpCheckbox.value,
  );

  // Если сохранение провалилось — просто выходим
  //@ts-ignore
  if (!result?.success) return;

  // Если пользователь ставил галочку "Сохранить КП" и сервер вернул kp
  //@ts-ignore
  if (kpCheckbox.value && result.kp) {
    //@ts-ignore
    openKpModal(result.kp);
  }
};

// Закомментировано: обработка выбора в модалке Update (обновить / сохранить как новый)
// const handleUpdateChoice = async (choice: string) => {
//   if (choice === "update") {
//     updateDialogRef.value?.closeModal();
//     await updateExistingProject();
//     return;
//   }
//   if (choice === "saveAsNew") {
//     saveAsNewMode.value = true;
//     updateDialogRef.value?.closeModal();
//     saveDialogRef.value?.openModal();
//   }
// };

// Функция открытия модального окна сохранения
const openModal = () => {
  saveDialogRef.value?.openModal();
};

// Сценарий "Сохранить как новый проект" — сразу открываем диалог ввода имени (без выбора в Update)
const openSaveAsNewModal = () => {
  saveAsNewMode.value = true;
  saveDialogRef.value?.openModal();
};

// Функция открытия модального окна выбора действия для существующего проекта (закомментировано — не используется)
// const openUpdateModal = () => {
//   updateDialogRef.value?.openModal();
// };

// Передаем функции открытия модальных окон в composable после монтирования
onMounted(() => {
  if (openSaveDialog) {
    openSaveDialog.value = openModal;
  }
  // if (openUpdateDialog) {
  //   openUpdateDialog.value = openUpdateModal;
  // }
  if (openSaveAsNewDialog) {
    openSaveAsNewDialog.value = openSaveAsNewModal;
  }
});
</script>

<style lang="scss" scoped>
.quick-actions {
  display: flex;
  gap: 8px;
}

.icon-svg {
  width: 40%;
  height: 40%;
  object-fit: contain;
}

.checkbox_label {
  font-size: 1.6rem;
  padding-left: 7px;
}

.checkbox_wrap {
  display: flex;
  justify-content: space-between;
}

.grey-radial__button {
  border: 1px solid $stroke;
  transition-property: background-color, color, border-color;
  transition-timing-function: ease;
  transition-duration: 0.25s;
  &:focus {
    outline: none;
  }
  svg {
    path {
      fill: $strong-grey;
    }

    g {
      path {
        transition-property: fill;
        transition-duration: 0.3s;
        transition-timing-function: ease;
        fill: $strong-grey;
      }
    }
  }

  &.active {
    background-color: $red;

    svg {
      path {
        fill: $white;
      }

      g {
        path {
          fill: $white;
        }
      }
    }

    &:active {
      background-color: $clicked-red;
    }
  }
  @media (hover: hover) {
    &:hover {
      background-color: black;
      color: $white;
      border-color: $white;
    }
  }
}
</style>
