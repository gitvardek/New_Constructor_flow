

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useEventBus = defineStore('EventBus', () => {

  const events = ref<{ [key: string]: Function[] }>({});
  const emitHooks = ref<((event: string, payload: any) => void | Promise<void>)[]>([]);

  const emit = (event: string, payload?: any) => {
    emitHooks.value.forEach(listener => listener(event, payload));
    if (!events.value[event]) {
      // console.warn(`Event "${event}" not found`);
      return;
    }
    events.value[event].forEach(callback => callback(payload));
  }

  const on = (event: string, callback: Function) => {
    if (!events.value[event]) {
      events.value[event] = [];
    }
    events.value[event].push(callback);

  }

  // const off = (event: string, callback?: Function) => {
  //   if (!events.value[event]) {
  //     return;
  //   }

  //   if (callback) {
  //     // Удаляем конкретный callback
  //     events.value[event] = events.value[event].filter(cb => cb !== callback);
  //   } else {
  //     // Если callback не указан, удаляем все обработчики для этого события
  //     events.value[event] = [];
  //   }

  //   // Если массив пустой, удаляем событие
  //   if (events.value[event].length === 0) {
  //     delete events.value[event];
  //   }
  // }

  const off = (event: string, callback: Function) => {
    if (events.value[event]) {
      events.value[event] = events.value[event].filter(cb => cb !== callback);
    }
  }

  const offAll = (event: string) => {
    if (events.value[event]) {
      events.value[event] = [];
      delete events.value[event];
    }
  }

  const clearEvents = () => {
    events.value = {}
    emitHooks.value = []
  }

  const getEvents = computed(() => {
    return events.value
  })

  const onEmitCalled = (listener: (event: string, payload: any) => void | Promise<void>) => {
    emitHooks.value.push(listener);
  };

  return { emit, on, off, offAll, getEvents, clearEvents, onEmitCalled };
});