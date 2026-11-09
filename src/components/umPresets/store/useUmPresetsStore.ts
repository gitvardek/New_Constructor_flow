// Стор каталога пресетов: постраничная загрузка (бек сортирует по created_at
// desc), клиентские фильтр и поиск по уже загруженным страницам — поиска по
// имени у эндпоинта нет.

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { umPresetsApi } from '@/components/umPresets/umPresetsApi'
import { validateUmPreset } from '@/components/umPresets/umPresetValidation'
import type { UmPreset, UmPresetData, UmPresetsFilter } from '@/components/umPresets/types'

const PAGE_SIZE = 20

export const useUmPresetsStore = defineStore('umPresets', () => {
  const items = ref<UmPreset[]>([])
  const total = ref(0)
  const pages = ref(0)
  const loadedPage = ref(0)

  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref<string | null>(null)

  const filter = ref<UmPresetsFilter>('all')
  const search = ref('')

  const hasMore = computed(() => loadedPage.value < pages.value)
  const isEmpty = computed(() => !isLoading.value && !items.value.length)

  const matchesFilter = (preset: UmPreset): boolean => {
    if (filter.value === 'mine') return !preset.isVardek
    if (filter.value === 'vardek') return preset.isVardek
    return true
  }

  const matchesSearch = (preset: UmPreset): boolean => {
    const query = search.value.trim().toLowerCase()
    if (!query) return true

    const haystack = `${preset.name} ${preset.data?.meta?.productName ?? ''}`.toLowerCase()
    return query.split(/\s+/).every((word) => haystack.includes(word))
  }

  const visibleItems = computed(() =>
    items.value.filter((item) => matchesFilter(item) && matchesSearch(item))
  )

  /**
   * Строки списка вместе с проверкой материалов и наполнения. Считается здесь,
   * а не в карточке, чтобы обход снимка шёл раз на изменение списка, а не на
   * каждый ререндер.
   */
  const visibleRows = computed(() =>
    visibleItems.value.map((preset) => ({ preset, validation: validateUmPreset(preset) }))
  )

  const loadPage = async (page: number) => {
    if (isLoading.value) return

    isLoading.value = true
    error.value = null

    try {
      const result = await umPresetsApi.getByUser({ page, pageSize: PAGE_SIZE })

      console.log(result, 'result')
      // Страницу 1 всегда заменяем целиком (reload), остальные — дописываем,
      // отсекая id, которые уже в списке (запись могли добавить между запросами).
      const known = new Set(page === 1 ? [] : items.value.map((item) => item.id))
      const fresh = result.items.filter((item) => !known.has(item.id))

      items.value = page === 1 ? result.items : [...items.value, ...fresh]
      total.value = result.total
      pages.value = result.pages
      loadedPage.value = result.page

      console.log( items.value, result )
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось загрузить список пресетов'
    } finally {
      isLoading.value = false
    }
  }

  const reload = () => loadPage(1)

  /** Загрузка при открытии попапа: список кэшируется на сессию. */
  const loadIfEmpty = async () => {
    if (items.value.length || isLoading.value) return
    await reload()
  }

  const loadMore = async () => {
    if (!hasMore.value) return
    await loadPage(loadedPage.value + 1)
  }

  /**
   * Создание пресета. Новая запись дописывается в начало списка локально
   * (сортировка по created_at desc) — без повторного запроса страницы.
   */
  const create = async (name: string, data: UmPresetData, image?: string | null): Promise<number> => {
    isSaving.value = true

    try {
      const id = await umPresetsApi.add(name, data, image)

      if (items.value.length) {
        items.value = [
          {
            id,
            name,
            userId: null,
            isVardek: false,
            createdAt: new Date().toISOString(),
            data,
            image: image ?? null,
          },
          ...items.value,
        ]
      }

      total.value += 1
      return id
    } finally {
      isSaving.value = false
    }
  }

  const remove = async (id: number): Promise<void> => {
    await umPresetsApi.deleteById(id)

    items.value = items.value.filter((item) => item.id !== id)
    total.value = Math.max(total.value - 1, 0)
  }

  const setFilter = (value: UmPresetsFilter) => {
    filter.value = value
  }

  return {
    items,
    total,
    pages,
    loadedPage,
    isLoading,
    isSaving,
    error,
    filter,
    search,

    hasMore,
    isEmpty,
    visibleItems,
    visibleRows,

    loadIfEmpty,
    reload,
    loadMore,
    create,
    remove,
    setFilter,
  }
})
