import type { components } from '@my-app/api-types'

import { isRecord } from '@my-app/utils'
import { TRANSPORT_ERROR_MESSAGES } from './error-messages'
import { ApiClientError } from './api-client-error'

type BackendApiError = components['schemas']['ApiError']

const isBackendApiError = (value: unknown): value is BackendApiError => {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.message === 'string' &&
    typeof value.errorCode === 'string' &&
    typeof value.statusCode === 'number' &&
    (value.details === undefined || isRecord(value.details))
  )
}

export const toApiClientError = (cause: unknown) => {
  if (isBackendApiError(cause)) {
    const { message, details, errorCode, statusCode } = cause

    return new ApiClientError(
      message,
      {
        cause,
        details,
        errorCode,
        statusCode,
      }
    )
  }

  const message =
    cause instanceof Error && cause.message
      ? cause.message
      : TRANSPORT_ERROR_MESSAGES.requestFailed

  return new ApiClientError(message, { cause })
}
