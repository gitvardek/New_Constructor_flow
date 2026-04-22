// @ts-nocheck
import { client } from '@/api/api'
import { ApiResponse, LoginData } from '@/types/authTypes'
import axios from 'axios'
import { BASE_DOMAIN } from "@/utils/originalDomain";

// const API_URL = 'https://dev.vardek.online';
const API_URL = `https://${BASE_DOMAIN}`;
const REQUEST_TIMEOUT = 10000

//можно это сделать хуком
export const AuthService = {
  
  async login(credentials: LoginData): Promise<ApiResponse> {
    try {
      const { data } = await axios.post<ApiResponse>(
        `${API_URL}/api/modellerjwt/auth/login/`,
        {
          login: credentials.login.trim(),
          password: credentials.password
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: REQUEST_TIMEOUT
        }
      )
      return data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Ошибка при подключении к серверу')
      }
      throw error
    }
  },

  async getUserData(token: string): Promise<ApiResponse> {
    try {
      const { data } = await axios.get<ApiResponse>(
        `${API_URL}/api/modellerjwt/auth/GetUserByToken/`,
        {
          headers: {
              "Authorization": `Bearer ${token}`,
          },
          timeout: 10000
        }
      )
      return data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Ошибка при подключении к серверу')
      }
      throw error
    }
  },

  async getSalonOwner(token: string): Promise<ApiResponse> {
    try {
      const { data } = await axios.get<ApiResponse>(
        `${API_URL}/api/Modellerjwt/user/getsalonowner`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
          timeout: REQUEST_TIMEOUT
        }
      )
      return data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Ошибка при подключении к серверу')
      }
      throw error
    }
  },
  async getCheckUser(token: string): Promise<ApiResponse> {
    const currentUrl = window.location.href;
    try {
      const { data } = await axios.get<ApiResponse>(
        `${API_URL}/api/modellerjwt/auth/checkpromission/`,
        {
          headers: {
              "Authorization": `Bearer ${token}`,
          },
          params: {
            currentUrl: currentUrl
          },
          timeout: 10000
        }
      )
      return data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Ошибка при подключении к серверу')
      }
      throw error
    }
  },
  
  async getCheckURL(name: string): Promise<ApiResponse> {
    try {
      const { data } = await axios.post<ApiResponse>(
        `${API_URL}/api/modellerjwt/auth/checkurl/`,
        {
          code : name,
        },
        {
          timeout: REQUEST_TIMEOUT
        }
      )
      return data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Ошибка при подключении к серверу')
      }
      throw error
    }
  },
}
