//@ts-nocheck
import { COOKIE_NAMES, getCookie, setCookie } from '@/components/authorization/utils/cookieUtils';
import axios, { AxiosError } from 'axios';
import {TechnologistResponse, TechnologistFormResponse, TechnologistCommentsResponse} from "@/types/technologist.ts";
import {_URL} from "@/types/constants.ts";

const FORM_API_URL = _URL + '/api/modellerjwt/formtech';
const BASE_API_URL = _URL + '/api/modellerjwt/technologist';
const REQUEST_TIMEOUT = 10000; // 10 секунд

export const TechnologistService = {
  /**
   * Отправляет заявку на проверку проекта технологом
   * @param techForm - объект данных заявки
   * @returns Promise<TechnologistFormResponse>
   */
  async submitTechForm(techForm: FormData): Promise<TechnologistFormResponse> {
    const token = getCookie(COOKIE_NAMES.AUTH_TOKEN);
    
    try {
      const { data } = await axios.post<TechnologistFormResponse>(
          `${FORM_API_URL}/SendForm/`,
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
        const axiosError = error as AxiosError<TechnologistFormResponse>;
        const message =
          axiosError.response?.data?.message ||
          'Ошибка при отправке заявки';
        throw new Error(message);
      }
      throw new Error('Неизвестная ошибка при запросе к серверу');
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