//@ts-nocheck

import { readonly, ref } from 'vue'
import { TechnologistService} from "@/services/technologistService.ts";
import {TechnologistCommentsResponse, TechnologistFormResponse, TechnologistResponse} from "@/types/technologist.ts";
import {useTechnologistStorage} from "@/store/appStore/technologist/useTechnologistStorage.ts";
import {useToast} from "@/features/toaster/useToast.ts";

export const useTechnologistApi = () => {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const technologistStorage = useTechnologistStorage();
  const toaster = useToast();

  const submitTechForm = async (formItem: FormData): Promise<TechnologistFormResponse | null> => {
    loading.value = true
    error.value = null

    try {
      const response = await TechnologistService.submitTechForm(formItem)

      if (response.DATA.error) {
        technologistStorage.setTechFormError(response.DATA)
      } else {
        technologistStorage.setTechFormError({})
      }

      toaster.success("Заявка отправлена!")
      return <TechnologistFormResponse>{ ...response }
    }
    catch (err: any) {
      error.value = err.message || 'Ошибка при отправке заявки'
      return null
    }
    finally {
      loading.value = false
    }
  }

  const getList = async (formItem: FormData): Promise<TechnologistResponse | null> => {
    loading.value = true
    error.value = null

    try {
      const response = await TechnologistService.getList(formItem)
      return <TechnologistResponse>{ ...response }
    }
    catch (err: any) {
      error.value = err.message || 'Ошибка при получении списка заявок'
      return null
    }
    finally {
      loading.value = false
    }
  }

  const setStatus = async (formItem: FormData): Promise<TechnologistResponse | null> => {
    loading.value = true
    error.value = null

    try {
      const response = await TechnologistService.setStatus(formItem)
      toaster.success("Статус изменен!")
      return <TechnologistResponse>{ ...response }
    }
    catch (err: any) {
      error.value = err.message || 'Ошибка при смене статуса заявки'
      return null
    }
    finally {
      loading.value = false
    }
  }

  const setProjectForDeal = async (formItem: FormData): Promise<TechnologistResponse | null> => {
    loading.value = true
    error.value = null

    try {
      const response = await TechnologistService.setProjectForDeal(formItem)
      return <TechnologistResponse>{ ...response }
    }
    catch (err: any) {
      error.value = err.message || 'Ошибка при смене ID проекта заявки'
      return null
    }
    finally {
      loading.value = false
    }
  }

  const setComments = async (formItem: FormData): Promise<TechnologistResponse | null> => {
    loading.value = true
    error.value = null

    try {
      const response = await TechnologistService.setComments(formItem)
      return <TechnologistResponse>{ ...response }
    }
    catch (err: any) {
      error.value = err.message || 'Ошибка при отправке комментариев'
      return null
    }
    finally {
      loading.value = false
    }
  }

  const getComments = async (formItem: FormData): Promise<TechnologistCommentsResponse | null> => {
    loading.value = true
    error.value = null

    try {
      const response = await TechnologistService.getComments(formItem)
      return <TechnologistCommentsResponse>{ ...response }
    }
    catch (err: any) {
      error.value = err.message || 'Ошибка получения списка комментариев'
      return null
    }
    finally {
      loading.value = false
    }
  }

  const getImgById = async (formItem: FormData): Promise<TechnologistResponse | null> => {
    loading.value = true
    error.value = null

    try {
      const response = await TechnologistService.getImgById(formItem)
      return <TechnologistResponse>{ ...response }
    }
    catch (err: any) {
      error.value = err.message || 'Ошибка получения превью файла'
      return null
    }
    finally {
      loading.value = false
    }
  }

  return {
    loading: readonly(loading),
    error: readonly(error),
    submitTechForm,
    getList,
    setStatus,
    setProjectForDeal,
    setComments,
    getComments,
    getImgById,
  }
}