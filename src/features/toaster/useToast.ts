import toastr from 'toastr'
import 'toastr/build/toastr.min.css'

toastr.options = {
  closeButton: true,
  debug: false,
  newestOnTop: false,
  progressBar: false,
  positionClass: "toast-bottom-right",
  preventDuplicates: true,
  onclick: null,
  // showDuration: "300",
  // hideDuration: "1000",
  timeOut: 1000,
  extendedTimeOut: 200,
  showEasing: "swing",
  hideEasing: "linear",
  showMethod: "fadeIn",
  hideMethod: "fadeOut",
}


// export const useToast = () => {
//   const success = (message: string) => {
//     toastr.success(message)
//   }

//   const error = (message: string) => {
//     toastr.error(message)
//   }

//   const positions = {
//     'top-right': 'toast-top-right',
//     'top-left': 'toast-top-left',
//     'top-center': 'toast-top-center',
//     'bottom-right': 'toast-bottom-right',
//     'bottom-left': 'toast-bottom-left',
//     'bottom-center': 'toast-bottom-center'
//   };

//   toastr.options = {
//   closeButton: true,
//   progressBar: true,
//   positionClass: positions['bottom-right'],
//   timeOut: 2000,
//   extendedTimeOut: 2000,
//   tapToDismiss: false,
//   preventDuplicates: false,
//   newestOnTop: true
// }

//   return { success, error }
// } 

export const useToast = () => {
  const show = (type: 'success' | 'error' | 'info' | 'warning', message: string, target?: string | HTMLElement) => {
    const prev = toastr.options.target
    if (target) toastr.options.target = target
    toastr[type](message)
    toastr.options.target = prev
  }

  return {
    success: (msg: string, target?: string | HTMLElement) => show('success', msg, target),
    error: (msg: string, target?: string | HTMLElement) => show('error', msg, target),
    info: (msg: string, target?: string | HTMLElement) => show('info', msg, target),
    warning: (msg: string, target?: string | HTMLElement) => show('warning', msg, target),
  }
}
