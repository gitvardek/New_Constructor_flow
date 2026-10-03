<script setup lang="ts">
// Миниатюра материала в карточках панелей v2: картинка из каталога, у цвета
// палитры (RAL/NCS) — плашка его цвета (HTML без "#"), иначе пустая плитка.
import { computed } from "vue";
import { _URL } from "@/types/constants";

const props = defineProps<{
  item: { PREVIEW_PICTURE?: string; HTML?: string } | null | undefined;
}>();

const imageUrl = computed(() => (props.item?.PREVIEW_PICTURE ? _URL + props.item.PREVIEW_PICTURE : null));
const color = computed(() => {
  const html = props.item?.HTML;
  if (!html) return null;
  return html.startsWith("#") ? html : `#${html}`;
});
</script>

<template>
  <img v-if="imageUrl" class="material-thumb" :src="imageUrl" alt="" />
  <div v-else-if="color" class="material-thumb" :style="{ backgroundColor: color }"></div>
  <div v-else class="material-thumb material-thumb--empty"></div>
</template>

<style scoped lang="scss">
.material-thumb {
  height: 45px;
  width: 45px;
  flex-shrink: 0;
  border-radius: 12px;
  box-shadow: 0px 0px 6px 0px rgba(48, 48, 48, 0.1);

  &--empty {
    background: rgba(0, 0, 0, 0.05);
  }
}
</style>
