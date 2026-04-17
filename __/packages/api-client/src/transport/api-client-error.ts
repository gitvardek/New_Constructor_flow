export interface ApiClientErrorOptions {
  readonly cause?: unknown
  readonly details?: unknown
  readonly errorCode?: string
  readonly statusCode?: number
}

export class ApiClientError extends Error {
  override readonly cause?: unknown
  readonly details?: unknown
  readonly errorCode?: string
  readonly statusCode?: number

  constructor(message: string, options: ApiClientErrorOptions = {}) {
    super(message)
    this.name = 'ApiClientError'
    this.cause = options.cause
    this.details = options.details
    this.errorCode = options.errorCode
    this.statusCode = options.statusCode
  }
}
