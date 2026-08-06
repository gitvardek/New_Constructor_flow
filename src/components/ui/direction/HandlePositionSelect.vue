<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { FasadeTextAlignAction } from '@/types/types'
import Accordion from '@/components/ui/accordion/Accordion.vue'

const POSITION_NAMES: Record<number, string> = {
  [FasadeTextAlignAction.left_top]: 'Правый верх',
  [FasadeTextAlignAction.top]: 'Центр верх',
  [FasadeTextAlignAction.right_top]: 'Левый верх',
  [FasadeTextAlignAction.left]: 'Центр право',
  [FasadeTextAlignAction.center]: 'Центр',
  [FasadeTextAlignAction.right]: 'Центр лево',
  [FasadeTextAlignAction.left_down]: 'Правый низ',
  [FasadeTextAlignAction.bottom]: 'Центр низ',
  [FasadeTextAlignAction.right_down]: 'Левый низ',
}

const ALL_POSITIONS = [
  FasadeTextAlignAction.left_top,
  FasadeTextAlignAction.top,
  FasadeTextAlignAction.right_top,
  FasadeTextAlignAction.left,
  FasadeTextAlignAction.center,
  FasadeTextAlignAction.right,
  FasadeTextAlignAction.left_down,
  FasadeTextAlignAction.bottom,
  FasadeTextAlignAction.right_down,
]

const props = defineProps<{
  modelValue: number | null
  allowedCodes?: string[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
}>()

const isOpen = ref(false)
const localValue = ref(props.modelValue)

watch(() => props.modelValue, (v) => { localValue.value = v })

const options = computed(() => {
  if (!props.allowedCodes || props.allowedCodes.length === 0) {
    return ALL_POSITIONS.map(val => ({ value: val, label: POSITION_NAMES[val] }))
  }
  return props.allowedCodes
    .map(code => {
      const val = FasadeTextAlignAction[code as keyof typeof FasadeTextAlignAction]
      return { value: val as number, label: POSITION_NAMES[val as number] }
    })
    .filter(o => o.value !== undefined && o.label !== undefined)
})

const selectedLabel = computed(() =>
  localValue.value !== null && localValue.value !== undefined
    ? (POSITION_NAMES[localValue.value] ?? '—')
    : '—'
)

const onSelect = (value: number, toggle: () => void) => {
  localValue.value = value
  emit('update:modelValue', value)
  toggle()
}
</script>

<template>
  <Accordion :open="isOpen" @toggle="(v) => isOpen = v">
    <template #title>
      <span class="hps__title">{{ selectedLabel }}</span>
    </template>
    <template #params="{ onToggle }">
      <ul class="hps__list">
        <li v-for="opt in options" :key="opt.value" class="hps__item" :class="{ active: opt.value === localValue }"
          @click="onSelect(opt.value, onToggle)">
          {{ opt.label }}
        </li>
      </ul>
    </template>
  </Accordion>
</template>

<style scoped lang="scss">
.hps {
  &__title {
    padding: 8px 12px;
    font-size: 1.3rem;
  }

  &__list {
    list-style: none;
    margin: 0;
    padding: 4px 0;
  }

  &__item {
    padding: 6px 12px;
    font-size: 1.3rem;
    cursor: pointer;
    border-radius: 8px;
    transition: background 0.15s;

    &:hover {
      background: #f0effa;
    }

    &.active {
      font-weight: 600;
      color: #3a3768;
    }
  }
}

.accordion {
  padding: 0rem 1rem;
  border-bottom: 1px solid $dark-stroke;
  gap: 0;
  width:fit-content;
  align-self: flex-start;

  &-fillings_list {
    padding: 1rem 0;
  }
}
</style>
