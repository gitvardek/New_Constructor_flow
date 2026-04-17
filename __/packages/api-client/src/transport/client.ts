import createClient, { type ClientOptions } from 'openapi-fetch'

import type { paths } from '@my-app/api-types'

export type ApiClientConfig = Omit<ClientOptions, 'baseUrl'> & {
  readonly baseUrl: string
}

export type ApiClient = ReturnType<typeof createClient<paths>>

export const createApiClient = (config: ApiClientConfig): ApiClient =>
  createClient<paths>(config)
