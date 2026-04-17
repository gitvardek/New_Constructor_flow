export const API_CONFIG = {
  requestTimeoutMs: 30_000,
  retryCount: 3,
  retryBaseDelayMs: 1_000,
  maxRetryDelayMs: 30_000,
  retryJitterMs: 1_000,
  notificationSsePath: '/notifications/stream',
} as const
