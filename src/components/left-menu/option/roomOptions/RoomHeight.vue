<script setup lang="ts">
import { computed, ref, watch } from "vue";
import MainInput from "@/components/ui/inputs/MainInput.vue";
import MainButton from "@/components/ui/buttons/MainButton.vue";
import { useWallHeightStore } from "@/store/constructor2d/store/useWallHeightStore";

const props = defineProps<{ clampHeight: number | null }>();
const emit = defineEmits<{ (e: "apply", value: number | null): void }>();

const wallHeightStore = useWallHeightStore();

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
    <MainInput
      v-model="localHeight"
      :min="500"
      :max="maxHeight"
      class="input__search"
      type="number"
      :placeholder="maxHeight"
    />
    <MainButton :className="'red__button right-menu'" @click="apply">
      Применить
    </MainButton>
  </div>
</template>

<style lang="scss" scoped>
.room-modheight {
  display: flex;
  align-items: center;
  gap: 15px;
}

.input__search {
  width: 140px;
}
</style>
