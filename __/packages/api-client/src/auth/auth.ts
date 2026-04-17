import type { ApiClient } from '../transport/client'
import { requestOrThrow } from '../transport/request'

import type { AuthHttpClient } from './auth.types'

export const createAuthHttpClient = (
  apiClient: ApiClient
): AuthHttpClient => ({
  getSession: () => requestOrThrow(() => apiClient.GET('/auth/session')),
  logout: () => requestOrThrow(() => apiClient.POST('/auth/logout')),
  refresh: () => requestOrThrow(() => apiClient.POST('/auth/refresh')),
  getLoginUrl: () => requestOrThrow(() => apiClient.GET('/auth/login-url')),
})
