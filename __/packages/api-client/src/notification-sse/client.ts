import { API_CONFIG } from '@my-app/configs'

import type { SseNotificationEvent } from './types'

export interface NotificationSseConfig {
  readonly baseUrl: string
  readonly pingIntervalMs?: number
  readonly maxRetries?: number
  readonly retryBaseDelayMs?: number
  readonly withCredentials?: boolean
}

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'failed'

export type SseEventHandler<T extends SseNotificationEvent> = (event: T) => void
export type SseStatusHandler = (status: ConnectionStatus) => void

export interface INotificationSseClient {
  readonly status: ConnectionStatus
  connect(): void
  disconnect(): void
  subscribe<T extends SseNotificationEvent>(
    eventType: T['event'],
    handler: SseEventHandler<T>
  ): () => void
  onStatusChange(handler: SseStatusHandler): () => void
}

export abstract class NotificationSseClient implements INotificationSseClient {
  abstract readonly status: ConnectionStatus
  abstract connect(): void
  abstract disconnect(): void
  abstract subscribe<T extends SseNotificationEvent>(
    eventType: T['event'],
    handler: SseEventHandler<T>
  ): () => void
  abstract onStatusChange(handler: SseStatusHandler): () => void

  protected readonly SSE_PATH = API_CONFIG.notificationSsePath

  protected calcRetryDelay(attempt: number, baseDelayMs: number): number {
    const exponential = baseDelayMs * Math.pow(2, attempt)
    const jitter = Math.random() * API_CONFIG.retryJitterMs
    return Math.min(exponential + jitter, API_CONFIG.maxRetryDelayMs)
  }

  protected buildSseUrl(baseUrl: string): string {
    const url = new URL(this.SSE_PATH, baseUrl)
    return url.toString()
  }
}
