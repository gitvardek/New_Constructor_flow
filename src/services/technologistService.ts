//@ts-nocheck
import { COOKIE_NAMES, getCookie, setCookie } from '@/components/authorization/utils/cookieUtils';
import axios, { AxiosError } from 'axios';
import {TechnologistResponse, TechnologistFormResponse, TechnologistCommentsResponse} from "@/types/technologist.ts";
import {_URL} from "@/types/constants.ts";

const FORM_API_URL = _URL + '/api/modellerjwt/formtech';
const BASE_API_URL = _URL + '/api/modellerjwt/technologist';
const REQUEST_TIMEOUT = 10000; // 10 секунд

// У загрузки файлов не может быть общего с JSON-запросами дедлайна: форма технолога —
// это multipart с тремя блоками вложений, и на слабом аплинке 10 секунд не хватает
// даже на пару фото. Вместо жёсткого лимита следим за простоем: пока данные уходят,
// запрос живёт сколько нужно, и обрывается только если прогресс встал
const UPLOAD_STALL_TIMEOUT = 15000; // нет движения по отправке — считаем соединение мёртвым
const RESPONSE_TIMEOUT = 60000;     // тело ушло целиком, ждём ответ сервера
const STALL_CHECK_INTERVAL = 1000;

export const TechnologistService = {
  /**
   * Отправляет заявку на проверку проекта технологом
   * @param techForm - объект данных заявки
   * @returns Promise<TechnologistFormResponse>
   */
  async submitTechForm(techForm: FormData): Promise<TechnologistFormResponse> {
    const token = getCookie(COOKIE_NAMES.AUTH_TOKEN);

    const controller = new AbortController();
    let lastProgressAt = Date.now();
    let uploadFinished = false;
    let stalledOut = false;

    const watchdog = setInterval(() => {
      // Пока тело уходит — ждём движения прогресса, после отправки — ответа сервера
      const limit = uploadFinished ? RESPONSE_TIMEOUT : UPLOAD_STALL_TIMEOUT;

      if (Date.now() - lastProgressAt < limit) return;

      stalledOut = true;
      controller.abort();
    }, STALL_CHECK_INTERVAL);

    try {
      const { data } = await axios.post<TechnologistFormResponse>(
          `${FORM_API_URL}/SendForm/`,
          techForm,
          {
            headers: {
              "Authorization": `Bearer ${token}`,
            },
            signal: controller.signal,
            onUploadProgress: (event) => {
              lastProgressAt = Date.now();

              // Дальше прогресса не будет — начинается ожидание ответа
              if (event.total && event.loaded >= event.total)
                uploadFinished = true;
            },
          }
      );

      return data;
    } catch (error) {
      if (stalledOut)
        throw new Error('Отправка прервана: соединение перестало отвечать. Проверьте интернет и попробуйте ещё раз');

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<TechnologistFormResponse>;
        const message =
          axiosError.response?.data?.message ||
          'Ошибка при отправке заявки';
        throw new Error(message);
      }
      throw new Error('Неизвестная ошибка при запросе к серверу');
    } finally {
      clearInterval(watchdog);
    }
  },

  async getList(techForm: FormData): Promise<TechnologistResponse> {
    const token = getCookie(COOKIE_NAMES.AUTH_TOKEN);

    try {
      const { data } = await axios.post<TechnologistResponse>(
          `${BASE_API_URL}/GetList/`,
          techForm,
          {
            headers: {
              "Authorization": `Bearer ${token}`,
            },
            timeout: REQUEST_TIMEOUT,
          }
      );

      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<TechnologistResponse>;
        const message =
            axiosError.response?.data?.message ||
            'Ошибка при получении списка заявок';
        throw new Error(message);
      }
      throw new Error('Неизвестная ошибка при запросе к серверу');
    }
  },

  async setStatus(techForm: FormData): Promise<TechnologistResponse> {
    const token = getCookie(COOKIE_NAMES.AUTH_TOKEN);

    try {
      const { data } = await axios.post<TechnologistResponse>(
          `${BASE_API_URL}/SetStatus/`,
          techForm,
          {
            headers: {
              "Authorization": `Bearer ${token}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: REQUEST_TIMEOUT,
          }
      );

      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<TechnologistResponse>;
        const message =
            axiosError.response?.data?.message ||
            'Ошибка при смене статуса заявки';
        throw new Error(message);
      }
      throw new Error('Неизвестная ошибка при запросе к серверу');
    }
  },

  async setProjectForDeal(techForm: FormData): Promise<TechnologistResponse> {
    const token = getCookie(COOKIE_NAMES.AUTH_TOKEN);

    try {
      const { data } = await axios.post<TechnologistResponse>(
          `${BASE_API_URL}/SetProjectForDeal/`,
          techForm,
          {
            headers: {
              "Authorization": `Bearer ${token}`,
            },
            timeout: REQUEST_TIMEOUT,
          }
      );

      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<TechnologistResponse>;
        const message =
            axiosError.response?.data?.message ||
            'Ошибка при смене ID проекта заявки';
        throw new Error(message);
      }
      throw new Error('Неизвестная ошибка при запросе к серверу');
    }
  },

  async setComments(techForm: FormData): Promise<TechnologistResponse> {
    const token = getCookie(COOKIE_NAMES.AUTH_TOKEN);

    try {
      const { data } = await axios.post<TechnologistResponse>(
          `${BASE_API_URL}/SetComments/`,
          techForm,
          {
            headers: {
              "Authorization": `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            },
            timeout: REQUEST_TIMEOUT,
          }
      );

      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<TechnologistResponse>;
        const message =
            axiosError.response?.data?.message ||
            'Ошибка при отправке комментариев';
        throw new Error(message);
      }
      throw new Error('Неизвестная ошибка при запросе к серверу');
    }
  },

  async getComments(techForm: FormData): Promise<TechnologistCommentsResponse> {
    const token = getCookie(COOKIE_NAMES.AUTH_TOKEN);

    try {
      const { data } = await axios.post<TechnologistCommentsResponse>(
          `${BASE_API_URL}/GetComments/`,
          techForm,
          {
            headers: {
              "Authorization": `Bearer ${token}`,
            },
            timeout: REQUEST_TIMEOUT,
          }
      );

      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<TechnologistCommentsResponse>;
        const message =
            axiosError.response?.data?.message ||
            'Ошибка получения списка комментариев';
        throw new Error(message);
      }
      throw new Error('Неизвестная ошибка при запросе к серверу');
    }
  },

  async getImgById(techForm: FormData): Promise<TechnologistCommentsResponse> {
    const token = getCookie(COOKIE_NAMES.AUTH_TOKEN);

    try {
      const { data } = await axios.post<TechnologistCommentsResponse>(
          `${BASE_API_URL}/GetImgById/`,
          techForm,
          {
            headers: {
              "Authorization": `Bearer ${token}`,
            },
            timeout: REQUEST_TIMEOUT,
          }
      );

      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<TechnologistCommentsResponse>;
        const message =
            axiosError.response?.data?.message ||
            'Ошибка получения превью файла';
        throw new Error(message);
      }
      throw new Error('Неизвестная ошибка при запросе к серверу');
    }
  },

};