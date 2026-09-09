import { createApp } from 'vue'
import '@vueform/slider/themes/default.css'
import '@vueform/toggle/themes/default.css'
import '@/style.scss'
import App from './App.vue'
import createAppRouter from './router'
import { createPinia, setActivePinia } from 'pinia'
import { COOKIE_NAMES, getCookie } from './components/authorization/utils/cookieUtils'
import { useAppData } from './store/appliction/useAppData'
import { vMaska } from "maska/vue";
import { BASE_DOMAIN } from "@/utils/originalDomain";

const DEV_AUTH_BYPASS = import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_BYPASS === 'true'


async function bootApp() {
  console.log('STARTUEM')

  // await loadDependencies()

  const app = createApp(App)
  app.config.warnHandler = () => false
  const pinia = createPinia()
  setActivePinia(pinia)  // Активируем Pinia для глобального доступа к stores

  app.use(pinia)

  const router = await createAppRouter()
  app.use(router)
  app.directive('mask', vMaska)
  await router.isReady()

  const token = DEV_AUTH_BYPASS ? 'dev-bypass-token' : getCookie(COOKIE_NAMES.AUTH_TOKEN)

  const initialRoute = router.currentRoute.value

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
