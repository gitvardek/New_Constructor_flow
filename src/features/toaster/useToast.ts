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
  extendedTimeOut: 200,
  showEasing: "swing",
  hideEasing: "linear",
  showMethod: "fadeIn",
  hideMethod: "fadeOut",
}

const CONTAINER_ID = "toast-container"

// Конструкторы открыты как dialog.showModal(): диалог уходит в верхний слой и перекрывает
// всё, что висит в body, — сообщение оказывалось под его подложкой и размывалось ею.
// Поэтому пока модалка открыта, контейнер держим внутри неё, а когда закрыта — в body.
//
// Решаем по состоянию страницы, а не по аргументу вызова: половина сообщений, всплывающих
// при открытом конструкторе, приходит из мест, которые про модалку ничего не знают.
// Берём саму модалку, а не элемент внутри неё: у панелей конструктора свои контексты
// наложения, и сообщение уходит под них. Так же поступает Tooltip — телепортирует
// подсказку в dialog[open]
const toastHost = (): Element =>
  [...document.querySelectorAll("dialog[open]")].pop() ?? document.body

export const useToast = () => {
  const show = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    const host = toastHost()
    const container = document.getElementById(CONTAINER_ID)

    // toastr создаёт контейнер один раз и дальше находит его по id, а на options.target
    // при повторных вызовах уже не смотрит. Поэтому оказавшийся не на месте контейнер
    // сносим — toastr создаст новый там, где нужно. Сверяем прямого родителя: контейнер
    // внутри закрытой модалки формально лежит и внутри body
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
