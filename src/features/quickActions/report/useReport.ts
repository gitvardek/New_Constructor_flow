import { ref } from "vue";
import * as yup from "yup";
import { useForm } from "vee-validate";
import { client } from "@/api/api";
import { usePopupStore } from '@/store/appStore/popUpsStore'
import { useToast } from '@/features/toaster/useToast'

//TODO
const validationSchema = yup.object({
    description: yup
      .string()
      .min(10, "*Минимальная длина сообщения - 10 символов")
      .required("Описание ошибки обязательно для заполнения"),
  });

export const useReport = () => {
  const hasError = ref(false);
  const popupStore = usePopupStore();
  const { success: showSuccess } = useToast();

  const { handleSubmit, isSubmitting, resetForm, errors } = useForm({
    validationSchema,
  });

  const sendReport = handleSubmit(async (values) => {
    hasError.value = false;

      const { error } = await client.POST("/api/modeller/message/senderror/", {
        body: { MESSAGE: values.description },
      });

      if (error) {
        hasError.value = true;
      } else {
        resetForm();
        popupStore.closePopup('error');
        showSuccess('Сообщение отправлено');
      }
  });

  return {
    sendReport,
    isSubmitting,
    errors,
    hasError,
    resetForm,
  };
}; 