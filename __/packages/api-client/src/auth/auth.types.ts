import type { components } from '@my-app/api-types'

export type AuthSession = components['schemas']['AuthSession']
export type AuthRefreshResponse = components['schemas']['AuthRefreshResponse']
export type AuthLoginUrlResponse = components['schemas']['AuthLoginUrlResponse']
export type AuthLogoutResponse = components['schemas']['AuthLogoutResponse']

export interface AuthHttpClient {
  getSession: () => Promise<AuthSession>
  logout: () => Promise<AuthLogoutResponse>
  refresh: () => Promise<AuthRefreshResponse>
  getLoginUrl: () => Promise<AuthLoginUrlResponse>
}
