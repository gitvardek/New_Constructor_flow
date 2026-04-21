import { defineStore } from 'pinia';
import { ref } from 'vue';

// Определяем типы событий
export type EventName = 
    'C2D:modify-wall' 
  | 'C2D:remove-wall' 
  | 'C2D:show-form-modify-wall' 
  | 'C2D:hide-form-modify-wall' 
  | 'C2D:update-form-modify-wall' 
  | 'C2D:add-room' 
  | 'C2D:remove-room'
  | 'C2D:set-room-label'
  | 'C2D:update-input-room-label'
  | 'C2D:show-form-room-label'
  | 'C2D:hide-form-room-label'
  | 'C2D:show-angle-input-modal'
  | 'C2D:hide-angle-input-modal';

// Определяем тип обработчиков событий
type EventCallback<T = any> = (payload: T) => void;

interface EventListeners {
  [key: string]: EventCallback[];
}

export const useEventBus = defineStore('eventBus', () => {
  const listeners = ref<EventListeners>({});

  function on<T = any>(event: EventName, callback: EventCallback<T>) {
    if (!listeners.value[event]) {
      listeners.value[event] = [];
    }
    listeners.value[event].push(callback);
  }

  function off<T = any>(event: EventName, callback: EventCallback<T>) {
    if (listeners.value[event]) {
      listeners.value[event] = listeners.value[event].filter(cb => cb !== callback);
      // console.log('destroy off event:', event);
    }
  }

  function emit<T = any>(event: EventName, payload?: T) {
    if (listeners.value[event]) {
      listeners.value[event].forEach(callback => callback(payload as T));
    }
  }

  return { listeners, on, off, emit };
});