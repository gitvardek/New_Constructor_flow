import { createApp } from 'vue'
import '@vueform/slider/themes/default.css'
import '@vueform/toggle/themes/default.css'
import '@/style.scss'
import App from './App.vue'
import createAppRouter from './router'
import { createPinia, setActivePinia } from 'pinia'
import { COOKIE_NAMES, getCookie } from './components/authorization/utils/cookieUtils'
import { useAppData } from './store/appliction/useAppData'
import {vMaska} from "maska/vue";
import { BASE_DOMAIN } from "@/utils/originalDomain";
// Функция для загрузки скриптов
// function loadScript(src: string): Promise<void> {
//   return new Promise((resolve, reject) => {
//     const script = document.createElement('script')
//     script.src = src
//     script.onload = () => resolve()
//     script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
//     document.head.appendChild(script)
//   })
// }
// Загрузки скриптов для детального описание карточки товара общего каталога
// async function loadDependencies() {
//   try {
//     await loadScript('./libold/jquery-3.4.1.min.js')
//     await loadScript('./libold/jquery-migrate-3.1.0.min.js')
//     await loadScript('./libold/jquery-ui.min.js')
//     await loadScript('./libold/jquery.fancybox.pack.js')
//     await loadScript('./libold/toastr.min.js')
//     await loadScript('./libold/bootstrap.min.js')
//     await loadScript('./libold/bootstrap-select.min.js')
//     await loadScript('./libold/custom_slider.js')
//   } catch (error) {
//     console.error('Error loading dependencies:', error)
//   }
// }

// async function bootApp() {


//   const app = createApp(App)
//   const pinia = createPinia()

//   app.use(pinia)
//   app.use(router)

//   await router.isReady()

//   const token = getCookie(COOKIE_NAMES.AUTH_TOKEN);

//   if (!token) {
//     // Нет токена — показываем /auth
//     if (router.currentRoute.value.path !== '/auth') {
//       await router.push('/auth')
//     }
//     app.mount('#app')
//     return
//   }

//   // Есть токен — начинаем загрузку данных
//   // Пока данные не загрузились — остаёмся на /auth
//   if (router.currentRoute.value.path !== '/auth') {
//     await router.push('/auth')
//   }

//   // Данные загрузились — редиректим в /2d
//   await router.push('/2d')

//   app.mount('#app')
// }

// async function bootApp() {
//   await loadDependencies()

//   const app = createApp(App)
//   const pinia = createPinia()

//   app.use(pinia)
//   app.use(router)

//   await router.isReady()

//   const token = getCookie(COOKIE_NAMES.AUTH_TOKEN);
//   // const appDataStore = useAppData()
//   // await appDataStore.initAppData()

//   if (!token) {
//     // Нет токена — показываем /auth
//     if (router.currentRoute.value.path !== '/auth') {
//       await router.push('/auth')
//     }

//     app.mount('#app')
//     return
//   }

//   // Есть токен — начинаем загрузку данных
//   // Пока данные не загрузились — остаёмся на /auth
//   if (router.currentRoute.value.path !== '/auth') {
//     const appDataStore = useAppData()
//     await appDataStore.initAppData()
//     await router.push('/auth')
//   }

//   const appDataStore = useAppData()
//   await appDataStore.initAppData()


//   // Данные загрузились — редиректим в /2d
//   await router.push('/2d')

//   app.mount('#app')

// }

async function bootApp() {
  // await loadDependencies()

  console.log(BASE_DOMAIN, 'BASE_DOMAIN')


  const app = createApp(App)
  app.config.warnHandler = () => null
  const pinia = createPinia()
  setActivePinia(pinia)  // Активируем Pinia для глобального доступа к stores

  app.use(pinia)

  const router = await createAppRouter()
  app.use(router)
  app.directive('mask', vMaska)
  await router.isReady()

  const token = getCookie(COOKIE_NAMES.AUTH_TOKEN)

  const initialRoute = router.currentRoute.value
  console.log('initialRoute', initialRoute)
  const preservedQuery = initialRoute.query
  const preservedHash = initialRoute.hash ?? ''

  // Всегда стартуем с /auth как loading (если не там)
  if (router.currentRoute.value.path !== '/auth') {
    await router.push({ path: '/auth', query: preservedQuery, hash: preservedHash })
  }

  app.mount('#app')  // Монтируем рано — пользователь видит loading сразу

  if (!token) {
    // Нет токена — остаёмся на /auth (форма авторизации)
    return
  }

  // Есть токен — инициализируем данные
  const appDataStore = useAppData()
  try {
    await appDataStore.initAppData()
   
  } catch (error) {
    console.error('Failed to init app data:', error)
    // Fallback: остаёмся на /auth (или можно push на error-страницу)
    return
  }

  // Данные загружены — редиректим в /2d
  await router.push({ path: '/2d', query: preservedQuery, hash: preservedHash })
}

bootApp()
