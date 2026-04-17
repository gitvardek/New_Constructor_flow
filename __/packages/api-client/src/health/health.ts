import type { ApiClient } from '../transport/client'
import { requestOrThrow } from '../transport/request'

import type { HealthResponse } from './health.types'

export const getHealth = (apiClient: ApiClient): Promise<HealthResponse> =>
  requestOrThrow(() => apiClient.GET('/health'))