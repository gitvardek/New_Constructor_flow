import { assertKnownEventType } from './event-types'
import {
  isArchivedPayload,
  isNotification,
  isPingPayload,
  isReadPayload,
} from './guards'
import type { SseNotificationEvent } from './types'

const parseEventData = (raw: MessageEvent): unknown => {
  return JSON.parse(raw.data)
}

export const parseSseEvent = (
  raw: MessageEvent<string>
): SseNotificationEvent => {
  const eventType = assertKnownEventType(raw.type)
  const data = parseEventData(raw)
  const eventId = raw.lastEventId || undefined

  switch (eventType) {
    case 'notification.new':
      if (!eventId || !isNotification(data)) {
        break
      }

      return {
        event: eventType,
        id: eventId,
        data,
      }

    case 'notification.read':
      if (!eventId || !isReadPayload(data)) {
        break
      }

      return {
        event: eventType,
        id: eventId,
        data,
      }

    case 'notification.archived':
      if (!eventId || !isArchivedPayload(data)) {
        break
      }

      return {
        event: eventType,
        id: eventId,
        data,
      }

    case 'ping':
      if (!isPingPayload(data)) {
        break
      }

      return {
        event: eventType,
        data,
      }
  }

  throw new Error(`Invalid SSE payload for event: ${eventType}`)
}
