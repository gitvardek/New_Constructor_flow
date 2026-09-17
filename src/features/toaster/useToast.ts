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
  timeOut: 3500,
  extendedTimeOut: 1000,
  showEasing: "swing",
  hideEasing: "linear",
  showMethod: "fadeIn",
  hideMethod: "fadeOut",
}

const CONTAINER_ID = "toast-container"


const toastHost = (): Element =>
  [...document.querySelectorAll("dialog[open]")].pop() ?? document.body

export const useToast = () => {
  const show = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    const host = toastHost()
    const container = document.getElementById(CONTAINER_ID)
    if (container && container.parentElement !== host) {
      container.remove()
    }

    toastr.options.target = host
    toastr[type](message)
  }

  return {
    success: (msg: string) => show('success', msg),
    error: (msg: string) => show('error', msg),
    info: (msg: string) => show('info', msg),
    warning: (msg: string) => show('warning', msg),
    clear: () => toastr.clear()
  }
}
