import { ref } from 'vue'
import {defineStore} from "pinia";
import {useToast} from "@/features/toaster/useToast.ts";
import {usePopupStore} from "@/store/appStore/popUpsStore.ts";

export const useFilePopUpStorage = defineStore('file-popup-data', () => {
  const storedFile = ref<File | null>(null)
  const filesCash = <any>ref({})
  const toaster = useToast();
  const popupStore = usePopupStore();

  const setFile = (file?: File) => {
    if (file) {
      storedFile.value = file
    }
  }

  const getFile = () => {
    return storedFile.value
  }

  const clearFile = () => {
    storedFile.value = null
  }

  const clearCash = () => {
    filesCash.value = {}
  }

  const openFileFromComment = async (file: any) => {
    try {

      let fetchedFile
      if(filesCash.value[file.id]) {
        fetchedFile = filesCash.value[file.id]
      }
      else {
        const url = file.customLink || file.customDownload;

        if (!url) {
          //alert("Ссылка на файл недоступна");
          toaster.error("Ссылка на файл недоступна")
          return;
        }

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Ошибка загрузки файла");
        }

        const blob = await response.blob();
        const fileName = file.name || url.split("/").pop() || "file";
        const fileType = blob.type || file.type || "application/octet-stream";

        fetchedFile = new File([blob], fileName, { type: fileType });
        filesCash.value[file.id] = fetchedFile;
      }

      setFile(fetchedFile);
      popupStore.openPopup("file");
    }
    catch (e) {
      console.error(e);
      //alert("Не удалось открыть файл");
      toaster.error("Не удалось открыть файл")
    }
  }

  return {
    setFile,
    getFile,
    clearFile,
    clearCash,
    openFileFromComment,
  }
})