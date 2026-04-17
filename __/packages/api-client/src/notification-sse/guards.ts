import type {
  Notification,
  SseNotificationArchived,
  SseNotificationNew,
  SseNotificationRead,
  SsePing,
} from './types'

import { isRecord } from '@my-app/utils'

const isString = (value: unknown): value is string => {
  return typeof value === 'string'
}

const hasString = (
  value: Record<string, unknown>,
  key: string
): value is Record<string, string> => {
  return isString(value[key])
}

export const isNotification = (value: unknown): value is Notification => {
  if (!isRecord(value)) {
    return false
  }

  return hasString(value, 'title') && hasString(value, 'priority')
}

export const isReadPayload = (
  value: unknown
): value is SseNotificationRead['data'] => {
  return isRecord(value) && hasString(value, 'id') && hasString(value, 'readAt')
}

export const isArchivedPayload = (
  value: unknown
): value is SseNotificationArchived['data'] => {
  return isRecord(value) && hasString(value, 'id')
}

export const isPingPayload = (value: unknown): value is SsePing['data'] => {
  return isRecord(value) && hasString(value, 'timestamp')
}

export const isNotificationNew = (
  e: import('./types').SseNotificationEvent
): e is SseNotificationNew => {
  return e.event === 'notification.new'
}

export const isNotificationRead = (
  e: import('./types').SseNotificationEvent
): e is SseNotificationRead => {
  return e.event === 'notification.read'
}

export const isNotificationArchived = (
  e: import('./types').SseNotificationEvent
): e is SseNotificationArchived => {
  return e.event === 'notification.archived'
}

export const isPing = (
  e: import('./types').SseNotificationEvent
): e is SsePing => {
  return e.event === 'ping'
}
