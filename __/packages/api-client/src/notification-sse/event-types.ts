import type { SseNotificationEventType } from './types'

export const SSE_NOTIFICATION_EVENT_TYPES = [
  'notification.new',
  'notification.read',
  'notification.archived',
  'ping',
] as const satisfies readonly SseNotificationEventType[]

export const assertKnownEventType = (
  eventType: string
): SseNotificationEventType => {
  if ((SSE_NOTIFICATION_EVENT_TYPES as readonly string[]).includes(eventType)) {
    return eventType as SseNotificationEventType
  }

  throw new Error(`Unknown SSE event type: ${eventType}`)
}
