<script setup lang="ts">
import BaseModal from "@/components/ui/modals/BaseModal.vue"; 
import { Swiper, SwiperSlide } from 'swiper/vue'
import 'swiper/swiper-bundle.css'
import { Pagination, Navigation } from 'swiper/modules'

interface IProps {
  title?: string
  detailText?: string
  image?: string
  previewText?: string
  videoUrl?: string
  videoPoster?: string
  images?: string[]
}

const props = withDefaults(defineProps<IProps>(), {
  title: '',
  detailText: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
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
const emit = defineEmits<{ (e: 'close'): void }>();

const closeInfoPopup = () => {
  emit('close');
};
</script>

<template>
  <BaseModal
    is-open
    title="Информация о товаре"
    :subtitle="props.title"
    @close="closeInfoPopup"
  >
    <template #body>
      <div :class="$style.content">
        <div :class="$style.imageTextBlock">
          <img :src="props.image" :class="$style.imageTextBlockImage" />
          <p v-html="props.detailText" :class="$style.descriptionText"/>
        </div>
        <div v-if="props.videoUrl" :class="$style.videoBlock">
          <video
            controls
            :src="props.videoUrl" 
            :poster="props.videoPoster"
            :class="$style.videoPlayer"
          ></video>
        </div>
        
        <div :class="$style.infoBlock">
          <div v-html="props.previewText" :class="$style.descriptionText"></div>
        </div>
        
        <swiper 
          v-if="props.images && props.images.length" 
          :modules="[Pagination, Navigation]" 
          navigation 
          pagination 
          :slides-per-view="3"
          :space-between="10"
          :class="$style.imageSlider"
        >
          <swiper-slide v-for="(image, index) in images" :key="index">
            <img :src="image" alt="Slide image" :class="$style.slideImage" />
          </swiper-slide>
        </swiper>
    </div>
    </template>
  </BaseModal>
</template>

<style module lang="scss">
.content {
  display: flex;
  flex-direction: column;
  gap: 30px;

  .descriptionText {
    font-size: 1.4rem;
  }

  .imageTextBlock {
    overflow: hidden;

    &Image {
      width: 260px;
      height: 205px;
      border-radius: 10px;
      object-fit: contain;
      float: left;
      margin-right: 20px;
      margin-bottom: 10px;
    }
  }

  .videoBlock {
    width: 100%;
    
    .videoPlayer {
      width: 100%;
      height: 205px;
      border-radius: 8px;
      object-fit: cover;
    }
  }

  .infoBlock {
    width: 100%;
    background: $white;
    border-radius: 10px;
    margin: 16px 0;
    
    .infoTitle {
      font-size: 1.8rem;
      font-weight: 600;
      margin: 0 0 10px 0;
      color: $black;
    }
    
    .infoList {
      margin: 0;
      padding-left: 20px;
      list-style-type: disc;
      li {
        font-size: 1.4rem;
        line-height: 1.5;
        margin-bottom: 10px;
        color: $black;
        
        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  }

  .imageSlider {
    width: 100%;
    height: 200px;
    position: relative;
    
    .mySwiper {
      width: 100%;
      max-width: 600px;
    }

    .slideImage {
      width: 100%;
      border-radius: 8px;
    }
    
    :global(.swiper-button-next),
    :global(.swiper-button-prev) {
      width: 26px;
      height: 26px;
      background: rgba(255, 255, 255, 0.9);
      border-radius: 50%;
      border: 1px solid #ECEBF1;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      
      &::after {
        font-size: 0.7rem;
        color: #A3A9B5;
        font-weight: bold;
      }
    }
    
    :global(.swiper-button-next) {
      right: 10px;
      top: 60%;
    }
    
    :global(.swiper-button-prev) {
      left: 10px;
      top: 60%;
    }
    
    :global(.swiper-pagination-bullet) {
      background: rgba(255, 255, 255, 0.8);
    }
    :global(.swiper-pagination-bullet-active) {
      background: #fff;
      opacity: 1;
    }

    :global(.swiper-pagination) {
      bottom: 10px;
    }
  }
}
</style>