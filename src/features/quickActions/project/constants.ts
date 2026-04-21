// API константы

import { BASE_DOMAIN } from "@/utils/originalDomain";
// export const API_BASE_URL = 'https://dev.vardek.online/api/modeller/projectq'
export const API_BASE_URL = `https://${BASE_DOMAIN}/api/modeller/projectq`

// Endpoints
export const API_ENDPOINTS = {
  GET_PROJECT_LIST: `${API_BASE_URL}/getprojectlist/`,
  GET_PROJECT_BY_ID: `${API_BASE_URL}/getprojectbyid/`,
  UPDATE_PROJECT: `${API_BASE_URL}/updateprojectbyid/`,
  SAVE_PROJECT: `${API_BASE_URL}/SaveProject/`
} as const

// Запрос константы
export const REQUEST_CONSTANTS = {
  CITY: 17281,
  DESIGNER: '14240',
  CONFIG: 43830,
  USER_HASH: '08a57654db94bdcfe44a9ee10b2f0778',
  USER_ID: '14240',
  STYLE: '689680',
  PROVIDER: 'vardek'
} as const

// UI константы
export const UI_CONSTANTS = {
  DEBOUNCE_DELAY: 500,
  DEFAULT_PROJECT_NAME: 'Новый проект',
  FALLBACK_IMAGE: '/src/assets/img/proj.png'
} as const

// Сообщения об ошибках
export const ERROR_MESSAGES = {
  LOAD_PROJECTS: 'Не удалось загрузить проекты',
  LOAD_PROJECT: 'Не удалось загрузить проект',
  SAVE_PROJECT: 'Ошибка сохранения проекта',
  INVALID_PROJECT_DATA: 'Данные проекта невалидны',
  MISSING_PROJECT_ID: 'ID проекта не указан',
  DELETE_PROJECT: 'Не удалось удалить проект'
} as const

// Сообщения для пользователя
export const USER_MESSAGES = {
  LOADING: 'Загрузка проектов...',
  NO_PROJECTS: 'Проекты не найдены',
  SAVING: 'Сохранение...',
  SAVE: 'Сохранить',
  RETRY: 'Попробовать снова'
} as const 