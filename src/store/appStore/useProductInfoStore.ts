// @ts-nocheck
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/**
 * Режим «Информация о товаре» (тулбар быстрых действий, только 3D).
 *
 * enabled — тумблер режима;
 * hovered — товар под курсором:
 *   basketId  — id объекта сцены (object.userData.basketId === object.id),
 *               по нему подсказка находит позицию в корзине (BASKETID),
 *   productId — PROPS.PRODUCT, запасной источник названия из каталога,
 *   x/y       — координаты курсора в окне (у подсказки position: fixed).
 */
export const useProductInfoStore = defineStore('productInfo', () => {

  const enabled = ref<boolean>(false)
  const hovered = ref<{
    basketId: string
    productId: string | number | null
    x: number
    y: number
  } | null>(null)

  const getEnabled = computed(() => enabled.value)
  const getHovered = computed(() => hovered.value)

  const setEnabled = (value: boolean) => {
    enabled.value = value
    // Выключение режима снимает подсказку: события мыши больше не придут
    if (!value) hovered.value = null
  }

  const toggleEnabled = (): boolean => {
    setEnabled(!enabled.value)
    return enabled.value
  }

  const setHovered = (value: typeof hovered.value) => {
    hovered.value = value
  }

  const clearHovered = () => {
    hovered.value = null
  }

  return {
    enabled,
    hovered,

    getEnabled,
    getHovered,

    setEnabled,
    toggleEnabled,
    setHovered,
    clearHovered,
  }
})
