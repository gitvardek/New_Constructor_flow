<script setup lang="ts">
import { computed, ref, watch } from "vue";
import MainInput from "@/components/ui/inputs/MainInput.vue";
import MainButton from "@/components/ui/buttons/MainButton.vue";
import { useWallHeightStore } from "@/store/constructor2d/store/useWallHeightStore";

const props = defineProps<{ clampHeight: number | null }>();
const emit = defineEmits<{ (e: "apply", value: number | null): void }>();

const wallHeightStore = useWallHeightStore();

// Ограничение сверху — фактическая высота комнаты. В сторе она хранится в сантиметрах,
// поэтому переводим в мм (так же считает DoorWindowOpeningSizePopUpView).
// Значение обновляют попапы параметров комнаты и высоты стены
const maxHeight = computed(() => wallHeightStore.wallHeightMm * 10);

const localHeight = ref<number | null>(props.clampHeight ?? null);

watch(
  () => props.clampHeight,
  (val) => {
    localHeight.value = val ?? null;
  }
);

const apply = () => {
  emit("apply", localHeight.value);
};
</script>

<template>
  <div class="room-modheight">
    <MainInput v-model="localHeight" :min="500" :max="maxHeight" class="room-modheight--search" type="number"
      :placeholder="maxHeight" />
    <button class="room-modheight--button" @click="apply">
      Применить
    </button>
    <!-- <MainButton :className="'red__button right-menu'" @click="apply">
      Применить
    </MainButton> -->
  </div>
</template>

<style lang="scss" scoped>
.room-modheight {
  display: flex;
  align-items: center;
  gap: 15px;

  &--search {
    padding: 0.25rem 0.5rem;
    background-color: $white;
  }

  &--button {
    padding: 0.25rem 0.5rem;
    border: 1px solid $black;
    border-radius: 1rem;
    background-color: transparent;
    transition-property: color, border-color, background-color;
    transition-timing-function: ease;
    transition-duration: 0.25s;

    @media(hover: hover) {
      &:hover {
        border-color: $black;
        background-color: $black;
        color: $bg;
      }
    }

  }
}


.input__search {
  width: 140px;
}
</style>
