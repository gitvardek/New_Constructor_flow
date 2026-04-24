// @ts-nocheck
import { createRouter, createWebHistory, createWebHashHistory, RouteRecordRaw } from "vue-router";
import { getCookie, COOKIE_NAMES } from '@/components/authorization/utils/cookieUtils';
import { useAppData } from "@/store/appliction/useAppData";
import { useAuthStore } from "@/store/appStore/authStore";
import { AuthService } from "@/services/authService";

const DEV_AUTH_BYPASS = import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_BYPASS === 'true'

const getBaseFromSubdomain = async () =>  {
  if (DEV_AUTH_BYPASS) {
    return '/dev_modeller';
  }
  const pathname = window.location.pathname;
  const parts = pathname.split('/');
  const isURL = await AuthService.getCheckURL(parts[2]);
  if (parts && parts.length > 2 && isURL.DATA) {
    return `/dev_modeller/${parts[2]}`;
  } else {
    return '/dev_modeller';
  }
  
}


const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    name: "Public",
    component: () => import('@/layouts/DefaultLayout.vue'),
    redirect: { path: "/2d" },
    children: [
      {
        path: "/2d",
        name: "Constructor2d",
        component: () => import('@/views/Constructor2D.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: "/3d",
        name: "Constructor3d",
        component: () => import('@/views/The3D.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: "/Main",
        name: "Main",
        component: () => import('@/views/MainView.vue'),
        meta: { requiresAuth: true }
      },
    ],
  },
  {
    path: "/auth",
    name: "Auth",
    component: () => import('@/views/AuthView.vue'),
    meta: { requiresAuth: false }
  },
];

//только в дев моде
if (import.meta.env.DEV) {
  routes.push({
    path: '/swagger',
    name: 'Swagger',
    component: () => import('@/views/dev/SwaggerUI.vue'),
    meta: { requiresAuth: false }
  });
}

async function createAppRouter() {
  const base = await getBaseFromSubdomain()
  
  const router = createRouter({
    history: createWebHistory(base),
    routes,
  });
  
  router.beforeEach((to, from, next) => {
    if (DEV_AUTH_BYPASS) {
      if (to.path === '/auth') {
        next({ path: '/2d', query: to.query, hash: to.hash });
        return;
      }

      next();
      return;
    }
    

    const token = getCookie(COOKIE_NAMES.AUTH_TOKEN);
    const expirationTime = getCookie(COOKIE_NAMES.TOKEN_EXPIRATION);
    const appDataStore = useAppData()
    const authStore = useAuthStore()
  

    if (token && expirationTime) {
      const expirationTimestamp = parseInt(expirationTime);
      if (Date.now() > expirationTimestamp) {
        // Удаляем просроченные куки
        document.cookie = `${COOKIE_NAMES.AUTH_TOKEN}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        document.cookie = `${COOKIE_NAMES.TOKEN_EXPIRATION}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        next({ path: '/auth', query: to.query, hash: to.hash });
        return;
      } else {
        const secondsLeft = Math.round((expirationTimestamp - Date.now()) / 1000);
        const hoursLeft = Math.round(secondsLeft / 3600);
        // next('/2d');
      }
    }
  
    if (to.meta.requiresAuth && !token) {
  
      // Перенаправляем на страницу авторизации, если требуется аутентификация
  
      next({ path: '/auth', query: to.query, hash: to.hash });
    } else if (to.path === '/auth' && token) {
      // Если пользователь уже авторизован, но пытается попасть на страницу авторизации
  
      next({ path: '/2d', query: to.query, hash: to.hash });
  
    } else {
      // В остальных случаях разрешаем переход
      next()
    }
  });
  
  router.afterEach((to, from) => {

  });

  return router
}


export default createAppRouter;
