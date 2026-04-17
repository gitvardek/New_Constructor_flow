import type { components } from '@my-app/api-types'

export type Notification = components['schemas']['Notification']
export type SseNotificationNew = components['schemas']['SseNotificationNew']
export type SseNotificationRead = components['schemas']['SseNotificationRead']
export type SseNotificationArchived = components['schemas']['SseNotificationArchived']
export type SsePing = components['schemas']['SsePing']
export type SseNotificationEvent = components['schemas']['SseNotificationEvent']
export type SseNotificationEventType = SseNotificationEvent['event']
