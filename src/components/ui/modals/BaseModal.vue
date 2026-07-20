<script setup lang="ts">
interface IProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  showCloseButton?: boolean;
  closeOnOverlay?: boolean;
  maxWidth?: string;
  maxHeight?: string;
}

withDefaults(defineProps<IProps>(), {
  title: '',
  subtitle: '',
  showCloseButton: true,
  closeOnOverlay: true,
  maxWidth: '1010px',
  maxHeight: '70vh'
});

const emit = defineEmits<{ (e: 'close'): void }>();

const closeModal = () => {
  emit('close');
};
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" :class="$style.baseModal">
      <div
        v-if="closeOnOverlay"
        :class="$style.overlay"
        @click="closeModal"
      ></div>
      <div
        :class="$style.container"
        :style="{
          maxWidth: maxWidth,
          maxHeight: maxHeight
        }"
      >
        <header v-if="title || showCloseButton" :class="$style.header">
          <div :class="$style.headerContent">
            <slot name="title">
              <h2 v-if="title" :class="$style.title">{{ title }}</h2>
            </slot>
            
            <slot name="subtitle">
              <p v-if="subtitle" :class="$style.subtitle">{{ subtitle }}</p>
            </slot>
          </div>

          <slot name="close-button">
            <button
              v-if="showCloseButton"
              :class="$style.close"
              @click="closeModal"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </slot>
        </header>

        <div :class="$style.content">
          <div :class="$style.body">
            <slot name="body"></slot>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style module lang="scss">
.baseModal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;

  .overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: $black-bg;
  }

  .container {
    position: relative;
    width: 90%;
    background: $white;
    border-radius: 15px;
    display: flex;
    flex-direction: column;
    z-index: 1;
    max-height: 70vh;
  }

  .header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 25px 25px 0 25px;
    flex-shrink: 0;
  }

  .headerContent {
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex: 1;
  }

  .title {
    margin: 0;
    font-size: 3.2rem;
    font-weight: 600;
    text-align: center;
  }

  .close {
    flex-shrink: 0;
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    transition: background-color 0.2s ease;
    color: #666;

    svg {
      width: 20px;
      height: 20px;
    }
  }

  .content {
    display: flex;
    flex-direction: column;
    padding: 20px 25px 25px 25px;
    flex: 1;
    overflow: auto;
  }

  .subtitle {
    margin: 0;
    font-size: 1.8rem;
    color: #A3A9B5;
    text-align: center;
  }

  .body {
    flex: 1;
    overflow-y: auto;
    
    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 3px;
    }
  }
}
</style> 