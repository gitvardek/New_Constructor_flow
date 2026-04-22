// utils/cookieUtils.ts

/**
 * Утилиты для работы с cookies
 */

/**
 * Установка cookie
 * @param name - название cookie
 * @param value - значение cookie
 * @param days - количество дней для хранения
 */
export const setCookie = (name: string, value: string, days: number = 7): void => {
  const date = new Date()
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000))
  const expires = `expires=${date.toUTCString()}`
  
  // Проверяем, работает ли сайт по HTTPS
  const isSecure = window.location.protocol === 'https:'
  const secureFlag = isSecure ? ';secure' : ''
  
  document.cookie = `${name}=${value};${expires};path=/;samesite=strict${secureFlag}`
}

/**
 * Получение значения cookie
 * @param name - название cookie
 * @returns значение cookie или null если не найдено
 */
export const getCookie = (name: string): string | null => {
  const nameEQ = name + '='
  const ca = document.cookie.split(';')
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) === ' ') c = c.substring(1, c.length)
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
  }
  return null
}

/**
 * Удаление cookie
 * @param name - название cookie
 */
export const deleteCookie = (name: string): void => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
}

/**
 * Проверка существования cookie
 * @param name - название cookie
 * @returns true если cookie существует
 */
export const hasCookie = (name: string): boolean => {
  return getCookie(name) !== null
}

/**
 * Очистка всех cookies
 */
export const clearAllCookies = (): void => {
  document.cookie.split(';').forEach(cookie => {
    const eqPos = cookie.indexOf('=')
    const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
    deleteCookie(name)
  })
}

// Константы для часто используемых названий cookies
export const COOKIE_NAMES = {
  AUTH_TOKEN: 'auth_token',
  BASKET_TOKEN: 'basket_token',
  TOKEN_EXPIRATION: 'token_expiration',
  USER_DATA: 'user_data'
} as const
