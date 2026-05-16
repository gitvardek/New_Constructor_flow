<template>
  <div class="image-swiper">
    <div class="swiper" ref="swiperEl">
      <div class="swiper-wrapper">
        <div 
          class="swiper-slide" 
          v-for="(image, index) in images" 
          :key="index"
        >
          <img 
            :src="`${API_URL}/${image.src}`" 
            :alt="image.alt || 'Slide image'" 
            class="swiper-image" 
          />
          <div class="image-swiper__description">
            <div class="image-swiper__description-title">{{ image.name }}</div>
            <div class="image-swiper__description-text">{{ image.alt }}</div>
          </div>
        </div>
      </div>

    </div>
    <div class="swiper-pagination swiper-pagination-numbers" v-if="showPagination"></div>

    <div class="swiper-button-prev" v-if="showNavigation">
      <ArrowSVG />
    </div>
    <div class="swiper-button-next" v-if="showNavigation">
      <ArrowSVG />
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted } from 'vue'
  import Swiper from 'swiper'
  import { Pagination, Navigation, Autoplay } from 'swiper/modules'
  import 'swiper/css'
  import 'swiper/css/pagination'
  import 'swiper/css/navigation'
  import 'swiper/css/autoplay'
  import ArrowSVG from '../ui/svg/auth/ArrowSVG.vue'
  import { BASE_DOMAIN } from "@/utils/originalDomain";

  const props = defineProps({
    images: {
      type: Array,
      required: true,
      validator: value => value.every(img => 'src' in img)
    },
    options: {
      type: Object,
      default: () => ({})
    },
    showPagination: {
      type: Boolean,
      default: true
    },
    showNavigation: {
      type: Boolean,
      default: true
    },
    autoplay: {
      type: [Boolean, Object],
      default: false
    }
  })

  // const API_URL = 'https://dev.vardek.online'
    const API_URL = `https://${BASE_DOMAIN}`


  const swiperEl = ref(null)
  const swiperInstance = ref(null)

  onMounted(() => {
    const baseOptions = {
      modules: [Pagination, Navigation, Autoplay],
      loop: true,
      slidesPerView: 1, // Количество видимых слайдов
      centeredSlides: true, // Центрирование слайдов
      spaceBetween: 20, // Отступ между слайдами
      // pagination: {
      //   el: '.swiper-pagination',
      //   // el: '.swiper-pagination-numbers',
      //   // type: 'custom',
      //   // renderCustom: function (swiper, current, total) {
      //   //     // const realIndex = swiper.realIndex + 1; 
      //   //     const displayIndex = (current - 1) % total + 1;
      //   //     console.log(displayIndex)
      //   //     return `<span class="current">${displayIndex}</span>
      //   //             <span class="separator">/</span>
      //   //             <span class="total">${total}</span>`;
      //   //       },
      //   clickable: true
      // },
      navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev'
      },
      autoplay: props.autoplay ? (
        typeof props.autoplay === 'object' ? props.autoplay : { delay: 5000 }
      ) : false,
      ...props.options
    }

    swiperInstance.value = new Swiper(swiperEl.value, baseOptions)
  })

  defineExpose({
    swiper: swiperInstance
  })
</script>

<style scoped lang="scss">
  .image-swiper {
    position: relative;  
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    &__description {
      color: #fFffff;
      text-align: center;
      font-weight: 600;
      line-height: 100%;
      letter-spacing: 0%;
      vertical-align: middle;
      &-title {
        font-size: 3.2rem;
        margin-top: 1rem;
        margin-bottom: 20px;
      }
      &-name {
        font-size: 1.4rem;

      }
    }
  }

  .swiper {
    width: 80%; 
    max-width: 1200px;
    height: auto; 
    margin: 0 auto;
  }

  .swiper-wrapper {
    align-items: center; 
  }

  .swiper-slide {
    width: 100%;
    height: auto;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
  }

  .swiper-image {
    width: 100%;
    height: auto;
    max-height: 80vh; 
    object-fit: contain; 
    border-radius: 10px;
    transition: transform 0.5s ease;
  }

  .swiper-pagination {
    position: absolute;
    bottom: 30px;
  }

  .swiper-pagination :deep(.swiper-pagination-bullet) {
    background: hsla(0, 0%, 100%, 0.2);
    opacity: 0.6;
    width: 60px;
    height: 6px;
    border-radius: 5px !important;
  }

  .swiper-pagination :deep(.swiper-pagination-bullet-active) {
    background: #fff;
    opacity: 1;
  }

  .swiper-button-prev,
  .swiper-button-next {
    color: #ffffff6b;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.3s ease;
    
    &::after {
      content: none;
    }
    top: 100%; 
    transform: translateY(-100%); 
    transition: all .3s;
    &:hover {
      color: #fff;
    }
  }

  .swiper-button-prev {
    left: 25%;
    
    svg {
      transform: rotate(180deg); 
    }
  }

  .swiper-button-next {
    right: 25%;
  }

  .swiper-pagination-numbers {
    position: absolute;
    bottom: 41px;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    gap: 8px;
    font-size: 2.6rem;
    font-weight: 500;
    color: #fFf;
  }

</style>