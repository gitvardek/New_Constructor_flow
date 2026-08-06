<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Accordion from '@/components/ui/accordion/Accordion.vue'

type TLoopOption = {
  action: number
  id: number
  active: boolean
  name: string
}

const props = defineProps<{
  options: TLoopOption[]
}>()

const emit = defineEmits<{
  (e: 'change', action: number, id: number): void
}>()

const isOpen = ref(false)

const activeOption = computed(() => props.options.find(o => o.active) ?? null)
const localActiveId = ref<number | null>(activeOption.value?.id ?? null)

watch(activeOption, (value) => { localActiveId.value = value?.id ?? null })

const localLabel = computed(() =>
  props.options.find(option => option.id === localActiveId.value)?.name ?? '—'
)

const onSelect = (opt: TLoopOption, toggle: () => void) => {
  localActiveId.value = opt.id
  console.log(opt)
  emit('change', opt.action, opt.id)
  toggle()
}
</script>

<template>
  <Accordion :open="isOpen" @toggle="(v) => isOpen = v">
    <template #title>
      <span class="lps__title">{{ localLabel }}</span>
    </template>
    <template #params="{ onToggle }">
      <ul class="lps__list">
        <li v-for="opt in options" :key="opt.id" class="lps__item" :class="{ active: opt.id === localActiveId }"
          @click="onSelect(opt, onToggle)">
          {{ opt.name }}
        </li>
      </ul>
    </template>
  </Accordion>
</template>

<style scoped lang="scss">
.lps {
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
  width: fit-content;
  align-self: flex-start;

  &-fillings_list {
    padding: 1rem 0;
  }
}
</style>
