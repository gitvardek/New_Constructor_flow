<script setup lang="ts">
interface IProps {
  isActive?: boolean
}

withDefaults(defineProps<IProps>(), {
  isActive: false
})

const emit = defineEmits<{ (e: 'click'): void }>()

const handleClick = () => {
  emit('click')
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    handleClick()
  }
}
</script>

<template>
  <button 
    :class="[$style.buttonTransitionDrawing, { [$style.active]: isActive }]" 
    @click="handleClick"
    @keydown="handleKeyDown"
    :aria-label="isActive ? 'Переходящий рисунок активен' : 'Переключить на переходящий рисунок'"
    :aria-pressed="isActive"
    tabindex="0"
  >
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g clip-path="url(#clip0_2772_77749)">
        <path d="M7.50008 13.3333C10.7217 13.3333 13.3334 10.7216 13.3334 7.49996C13.3334 4.2783 10.7217 1.66663 7.50008 1.66663C4.27842 1.66663 1.66675 4.2783 1.66675 7.49996C1.66675 10.7216 4.27842 13.3333 7.50008 13.3333Z" stroke="#131313" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M12.5001 18.3333C15.7217 18.3333 18.3334 15.7216 18.3334 12.5C18.3334 9.2783 15.7217 6.66663 12.5001 6.66663C9.27842 6.66663 6.66675 9.2783 6.66675 12.5C6.66675 15.7216 9.27842 18.3333 12.5001 18.3333Z" stroke="#131313" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
      <defs>
        <clipPath id="clip0_2772_77749">
          <rect width="20" height="20" fill="white"/>
        </clipPath> 
      </defs>
    </svg>
    Переходящий рисунок
  </button>
</template>

<style module lang="scss">
.buttonTransitionDrawing {
  background: $white;
  border: none;
  color: $strong-grey;
  cursor: pointer;
  font-size: 1.6rem;
  font-weight: 600;
  color: $strong-grey;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 15px;
  border-radius: 15px;
  transition: all 0.2s;
  
  &:hover {
    background: $light-grey;
  }
  
  &.active {
    color: $white;
    background: $clicked-red;
    svg {
      path {
        stroke: $white;
      }
    }
  }
}
</style> 