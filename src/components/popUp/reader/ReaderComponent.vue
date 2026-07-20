
<script lang="ts" setup>
// @ts-nocheck 31
 
import { ref } from 'vue'
import { Swiper, SwiperSlide } from 'swiper/vue'
import 'swiper/swiper-bundle.css'
import { Pagination, Navigation } from 'swiper/modules'

interface Props {
  title?: string
  description?: string
  image?: string
  videoUrl?: string
  videoPoster?: string
  images?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  image: 'https://picsum.photos/200/300',
  videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  videoPoster: 'https://picsum.photos/200/300',
  images: () => [
    'https://picsum.photos/200/300',
    'https://picsum.photos/200/300',
    'https://picsum.photos/200/300',
    'https://picsum.photos/200/300',
    'https://picsum.photos/200/300',
    'https://picsum.photos/200/300',
  ]
})

</script>

<template>
  <div class="reader">
    <div class="reader-imtext">
      <img :src="image" class="reader-imtext__image" />
      <p class="reader-text">
        {{ description }}
      </p>
    </div>
    <p class="reader-text">
      {{ description }}
    </p>
    <div v-if="videoUrl" class="reader-video">
      <video
        controls
        :src="videoUrl"
        :poster="videoPoster"
        class="video-player"
      ></video>
    </div>
    <swiper 
      v-if="images && images.length" 
      :modules="[Pagination, Navigation]" 
      navigation 
      pagination 
      :slides-per-view="3"
      :space-between="10"
      class="reader-slider"
    >
      <swiper-slide v-for="(image, index) in images" :key="index">
        <img :src="image" alt="Slide image" class="slide-image" />
      </swiper-slide>
    </swiper>
  </div>
</template>

<style lang="scss" scoped>
.reader {
  display: flex;
  flex-direction: column;
  gap: 15px;

  .reader-text {
    font-size: 1.6rem;
  }

  .reader-imtext {
    display: flex;
    gap: 20px;

    &__image {
      max-width: 260px;
      height: 205px;
    }
  }

  .reader-video {
    width: 100%;
    
    .video-player {
      width: 100%;
      height: 205px;
      border-radius: 8px;
      object-fit: cover;
    }
  }

  .reader-slider {
    width: 100%;
    height: 200px;
    position: relative;
    
    .my-swiper {
      width: 100%;
      max-width: 600px;
    }

    .slide-image {
      width: 100%;
      border-radius: 8px;
    }
    
    :deep(.swiper-button-next),
    :deep(.swiper-button-prev) {
      width: 26px;
      height: 26px;
      background: rgba(255, 255, 255, 0.9);
      border-radius: 50%;
      border: 1px solid #ECEBF1;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
      
      &::after {
        font-size: 0.7rem;
        color: #A3A9B5;
        font-weight: bold;
      }
    }
    
    :deep(.swiper-button-next) {
      right: 10px;
    }
    
    :deep(.swiper-button-prev) {
      left: 10px;
    }
    
    :deep(.swiper-pagination) {
      bottom: 10px;
      
      .swiper-pagination-bullet {
        background: rgba(255, 255, 255, 0.8);
        opacity: 0.5;
        
        &.swiper-pagination-bullet-active {
          opacity: 1;
          background: #fff;
        }
      }
    }
  }
}
</style>
