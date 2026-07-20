import { ref } from 'vue'
import {TechnologistFormError, TechnologistFormReview, TechnologistTechList} from "@/types/technologist.ts";
import {defineStore} from "pinia";

/*const STORAGE_KEY = 'technologist-data'*/
export interface Deal {
  dealId: number|boolean;
  dealStatus: string|boolean;
  techProjectId: number|boolean;
  techProject: string|boolean;
}

const defaultDeal = <Deal>{
  'dealId': false,
  'dealStatus': false,
  'techProjectId': false,
  'techProject': false,
}

export const useTechnologistStorage = defineStore('technologist-data', () => {
  const currentProjectID = ref<number|boolean>(false)
  const techFormError = ref<TechnologistFormError>(<TechnologistFormError>{})
  const techList = ref<TechnologistTechList>(<TechnologistTechList>{filter: 0})
  const formReview = ref<TechnologistFormReview>(<TechnologistFormReview>{result: {}})
  const deal = ref(Object.assign({}, defaultDeal))
  const dealOfSelectedApplication = ref(Object.assign({}, defaultDeal))
  const technologistProject = ref<boolean>(false)

  const setCurrentProjectID = (id: number) => {
    if(id && currentProjectID.value !== id) {
      currentProjectID.value = id
    }
  }

  const setTechFormError = (error: TechnologistFormError) => {
    if(error) {
      techFormError.value = error
    }
  }

  const setDeal = (_deal: Deal = defaultDeal) => {
    if(_deal) {
      deal.value = _deal
    }
  }

  const getDeal = () => {
    return deal.value;
  }

  const setDealOfSelectedApplication = (_deal: Deal = defaultDeal) => {
    if(_deal) {
      dealOfSelectedApplication.value = _deal
    }
  }

  const getDealOfSelectedApplication = () => {
    return dealOfSelectedApplication.value;
  }

  const setTechnologistProject = (status: boolean) => {
    technologistProject.value = status
  }

  const getTechnologistProject = () => {
    return technologistProject.value;
  }

  const getCurrentProjectID = () => {
    return currentProjectID.value;
  }

  const getTechFormError = () => {
    return techFormError.value?.error || {};
  }

  const getTechList = () => {
    return techList.value;
  }

  const setTechList = (value: TechnologistTechList) => {
    techList.value = value;
  }

  const getFormReview = () => {
    return formReview.value;
  }

  const setFormReview = (value: TechnologistFormReview) => {
    formReview.value = value;
  }

  const clearTechList = () => {
    techList.value = <TechnologistTechList>{filter: 0};
  }

  const clearStorage = () => {
    currentProjectID.value = false
    clearError()
    clearFormReview()
  }

  const clearError = () => {
    techFormError.value = <TechnologistFormError>{}
  }

  const clearFormReview = () => {
    formReview.value = <TechnologistFormReview>{result: {}}
  }

  return {
    techList,
    formReview,
    technologistProject,
    setTechnologistProject,
    getTechnologistProject,
    deal,
    setDeal,
    setDealOfSelectedApplication,
    getDealOfSelectedApplication,
    getDeal,
    setTechFormError,
    getTechFormError,
    getCurrentProjectID,
    setCurrentProjectID,
    clearStorage,
    clearError,
    getTechList,
    setTechList,
    clearTechList,
    clearFormReview,
    setFormReview,
    getFormReview,
  }
})