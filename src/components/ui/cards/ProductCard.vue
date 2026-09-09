<script setup lang="ts">
// Карточка товара (картинка + название) для списков наполнения — вынесена
// как переиспользуемый UI-примитив (было продублировано в box-UM
// FillingsInsertPanel.vue и гардеробной системе WardrobeInsertView.vue —
// один и тот же паттерн {PREVIEW_PICTURE, NAME}, отличался только источник
// списка). Картинка передаётся ГОТОВОЙ ссылкой (с _URL) — компонент не
// знает про каталожные детали.
interface IProps {
  name: string;
  image?: string | null;
  disabled?: boolean;
}

defineProps<IProps>();

const emit = defineEmits<{
  (e: "click"): void;
}>();

const onClick = () => {
  emit("click");
};
</script>

<template>
  <div class="product-card" :class="{ 'product-card--disabled': disabled }" @click="onClick">
    <img v-if="image" class="product-card__img" :src="image" alt="" />
    <div v-else class="product-card__img product-card__img--empty"></div>
    <p class="product-card__name">{{ name }}</p>
  </div>
</template>

<style scoped lang="scss">
.product-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: 100%;
  max-width: 100px;
  cursor: pointer;

  &--disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &__img {
    width: 50px;

    &--empty {
      height: 50px;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.05);
    }
  }

  &__name {
    font-size: 1.2rem;
    text-align: center;
    margin: 0;
  }
}
</style>
