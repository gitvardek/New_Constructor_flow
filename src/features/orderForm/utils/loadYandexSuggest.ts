// Загрузчик скрипта Яндекс.Карт для SuggestView.
// Используем глобальную промис-переменную, чтобы не грузить скрипт повторно.

export function loadYandexSuggest(
  mapsApiKey: string,
  suggestApiKey: string
): Promise<any> {
  const w = window as any

  // Быстрый путь: если уже есть ymaps и SuggestView — корректный конструктор
  if (w.ymaps?.SuggestView && typeof w.ymaps.SuggestView === 'function') {
    return Promise.resolve(w.ymaps)
  }
  if (w.__ymapsSuggestLoadPromise) return w.__ymapsSuggestLoadPromise as Promise<any>

  w.__ymapsSuggestLoadPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById('yandex-suggest-script') as HTMLScriptElement | null

    const ensureReady = () => {
      if (!w.ymaps) {
        reject(new Error('ymaps is not available after script load'))
        return
      }
      w.ymaps.ready(() => resolve(w.ymaps))
    }

    if (existingScript) {
      // Если скрипт уже вставлен, но SuggestView не появился — значит скрипт был загружен
      // не с теми модулями. Перегружаем его.
      if (w.ymaps?.SuggestView && typeof w.ymaps.SuggestView === 'function') {
        ensureReady()
        return
      }

      existingScript.remove()
      delete w.__ymapsSuggestLoadPromise
    }

    const script = document.createElement('script')
    script.id = 'yandex-suggest-script'

    // Важно: нужны оба ключа: apikey и suggest_apikey.
    // SuggestView грузим через параметр load=SuggestView.
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(
      mapsApiKey
    )}&suggest_apikey=${encodeURIComponent(
      suggestApiKey
    )}&lang=ru_RU&load=SuggestView`
    script.async = true

    script.onload = () => ensureReady()
    script.onerror = () => reject(new Error('Failed to load Yandex SuggestView script'))

    document.head.appendChild(script)
  })

  return w.__ymapsSuggestLoadPromise as Promise<any>
}

