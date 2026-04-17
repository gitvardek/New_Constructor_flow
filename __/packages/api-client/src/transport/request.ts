import { TRANSPORT_ERROR_MESSAGES } from './error-messages'
import { ApiClientError } from './api-client-error'
import { toApiClientError } from './to-api-client-error'

type ApiRequestResult<T> = {
  data?: T
  error?: unknown
}

const executeRequest = async <T>(
  request: () => Promise<ApiRequestResult<T>>
): Promise<ApiRequestResult<T>> => {
  try {
    return await request()
  } catch (error) {
    throw toApiClientError(error)
  }
}

const throwIfRequestFailed = (error: unknown): void => {
  if (error) {
    throw toApiClientError(error)
  }
}

export const requestOrThrow = async <T>(
  request: () => Promise<ApiRequestResult<T>>
): Promise<T> => {
  const result = await executeRequest(request)

  throwIfRequestFailed(result.error)

  if (result.data == null) {
    throw new ApiClientError(TRANSPORT_ERROR_MESSAGES.emptyResponseData)
  }

  return result.data
}

export const requestOptionalData = async <T>(
  request: () => Promise<ApiRequestResult<T>>
): Promise<T | null> => {
  const result = await executeRequest(request)

  throwIfRequestFailed(result.error)

  return result.data ?? null
}
