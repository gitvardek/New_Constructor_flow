//@ts-nocheck
import { COOKIE_NAMES, getCookie, setCookie } from '@/components/authorization/utils/cookieUtils';
import axios, { AxiosError } from 'axios';
import { BASE_DOMAIN } from "@/utils/originalDomain";

// Предполагаемые типы (настройте под ваш бэкенд)
interface BasketItem {
  id: string;
  quantity: number;
  // другие поля...
}

interface BasketResponse {
  success: boolean;
  data: BasketItem[];
  message?: string;
}
interface Sendorder {
  basket: Proxy<BasketData>;
  cityID: string;
  comment: string;
  config: string;
  fio: string;
  phone: string;
  project: Proxy<Project>;
  project_img: string;
  project_name: string;
  style: string;
}

interface NewBasketRequest {
  items: BasketItem[];
  // другие поля, если нужны (например, userId, sessionId и т.д.)
}

// const BASE_API_URL = 'https://dev.vardek.online/api/modellerjwt/basket';
// const API_URL_SENDORDER = 'https://dev.vardek.online/api/Modellerjwt/petrovich/sendorder/';

const BASE_API_URL = `https://${BASE_DOMAIN}/api/modellerjwt/basket`;
const API_URL_SENDORDER = `https://${BASE_DOMAIN}/api/Modellerjwt/petrovich/sendorder/`;
// const BASE_API_URL = 'https://dev.vardek.online/api/modeller/basket';
const REQUEST_TIMEOUT = 10000; // 10 секунд

export const BasketService = {
  /**
   * Отправляет данные корзины и получает обновлённую корзину
   * @param newBasket - объект с данными новой корзины
   * @returns Promise<BasketResponse>
   */
  async getBasket(newBasket: NewBasketRequest): Promise<BasketResponse> {

    console.log(newBasket, 'newBasket')

    const token = getCookie(COOKIE_NAMES.AUTH_TOKEN);
    
    try {
      const { data } = await axios.post<BasketResponse>(
        `${BASE_API_URL}/GetBasket/`,
        newBasket,
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            "Authorization": `Bearer ${token}`,

          },
          timeout: REQUEST_TIMEOUT,
        }
      );



      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<BasketResponse>;
        const message =
          axiosError.response?.data?.message ||
          'Ошибка при получении корзины';
        throw new Error(message);
      }
      throw new Error('Неизвестная ошибка при запросе к серверу');
    }
  },

  async getProductDelay(newBasket: NewBasketRequest): Promise<BasketResponse> {
    const token = getCookie(COOKIE_NAMES.AUTH_TOKEN);
    
    try {
      const { data } = await axios.post<BasketResponse>(
        `${BASE_API_URL}/GetProductDelay/`,
        newBasket,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            "Authorization": `Bearer ${token}`,
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<BasketResponse>;
        const message =
          axiosError.response?.data?.message ||
          'Ошибка при получении корзины';
        throw new Error(message);
      }
      throw new Error('Неизвестная ошибка при запросе к серверу');
    }
  },

  /**
   * очистка корзины
   */
  async clearBasket(): Promise<BasketResponse> {
    try {
      const { data } = await axios.post<BasketResponse>(
        `${BASE_API_URL}/GetBasket/`,
        [],
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          timeout: REQUEST_TIMEOUT,
        }
      );
      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<BasketResponse>;
        const message =
          axiosError.response?.data?.message || 'Ошибка при очистке корзины';
        throw new Error(message);
      }
      throw new Error('Неизвестная ошибка');
    }
  },

  async invoceBasket(basket:any): Promise<BasketResponse> {
    const token = getCookie(COOKIE_NAMES.AUTH_TOKEN);
    
    try {
      const { data } = await axios.post<BasketResponse>(
        `${BASE_API_URL}/addtobasket/`,
        basket,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            "Authorization": `Bearer ${token}`
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      // Проверяем успешный ответ и наличие токена

      if (data.DATA && data.DATA.type === "success" && data.DATA.token) {
        // Сохраняем токен в cookie

        // Делаем редирект в новое окно
        // window.open(`https://dev.vardek.online/personal/basket?basket_token=${data.DATA.token}`, '_blank');
           window.open(`https://${BASE_DOMAIN}/personal/basket?basket_token=${data.DATA.token}`, '_blank');
      }

      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<BasketResponse>;
        const message =
          axiosError.response?.data?.message || 'Ошибка при очистке корзины';
        throw new Error(message);
      }
      throw new Error('Неизвестная ошибка');
    }
  },

  // https://dev.vardek.online/api/Modellerjwt/petrovich/sendorder/
  async getSendorder(sendorder: Sendorder): Promise<Sendorder> {
    const token = getCookie(COOKIE_NAMES.AUTH_TOKEN);
    
    try {
      const { data } = await axios.post<Sendorder>(
        `${API_URL_SENDORDER}`,
        sendorder,
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            "Authorization": `Bearer ${token}`,

          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<BasketResponse>;
        const message =
          axiosError.response?.data?.message ||
          'Ошибка при получении корзины';
        throw new Error(message);
      }
      throw new Error('Неизвестная ошибка при запросе к серверу');
    }
  },



};