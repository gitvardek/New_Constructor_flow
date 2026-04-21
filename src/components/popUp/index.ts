import BasketPopUpView from '@/components/popUp/popup-views/BasketPopUpView.vue';
import BasketFormPopUpView from '@/components/popUp/popup-views/BasketFormPopUpView.vue';
import StudyPopUpView from '@/features/quickActions/learning/components/StudyPopUpView.vue';
import ErrorPopUpView from '@/features/quickActions/report/ErrorPopUpView.vue';
import ProjectPopUpView from '@/features/quickActions/project/ProjectPopUpView.vue';
import { Component } from 'vue';
import CatalogPopUpView from './popup-views/CatalogPopUpView.vue';
import TechnologistPopUpView from "@/components/popUp/popup-views/TechnologistPopUpView.vue";
import TechnologistForm from "@/components/Technologist/TechnologistForm.vue";
import TechnologistComments from "@/components/Technologist/TechnologistComments.vue";
import FilePopUpView from "@/components/popUp/popup-views/FilePopUpView.vue";
import ProjectParamsPopUpView from "@/components/popUp/popup-views/ProjectParamsPopUpView.vue";


export type PopupKey =
    'basket' |
    'study' |
    'error' |
    'project' |
    'projectParams' |
    'catalog' |
    'technologist' |
    'technologist-form' |
    'technologist-comments' |
    'file' |
    'formbasket'

export type Popup = {
  title?: string,
  component: Component
}

export type PopupsConfig = Record<PopupKey, Popup>

export const POPUP_CONFIG: PopupsConfig = {
  basket: {
    title: 'Корзина',
    component: BasketPopUpView
  },
  study: {
    title: 'Обучение',
    component: StudyPopUpView
  },
  error: {
    title: 'Ошибка',
    component: ErrorPopUpView
  },
  project: {
    title: 'Проект',
    component: ProjectPopUpView
  },
  projectParams: {
    title: 'Задайте параметры проекта',
    component: ProjectParamsPopUpView
  },
  catalog: {
    title: 'Каталог',
    component: CatalogPopUpView
  },
  formbasket: {
    title: 'Корзина',
    component: BasketFormPopUpView
  },
  technologist: {
    title: 'Технолог',
    component: TechnologistPopUpView
  },
  "technologist-form": {
    title: 'Заявка технолог',
    component: TechnologistForm
  },
  "technologist-comments": {
    title: 'Комментарии технолог',
    component: TechnologistComments
  },
  file:{
    component: FilePopUpView
  }
} as const;