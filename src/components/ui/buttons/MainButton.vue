<script setup lang="ts">
import { defineProps, defineEmits, defineExpose, ref } from "vue";

// Определение пропсов
const props = defineProps({
  className: {
    type: String,
    default: "",
  },
  size: {
    type: String,
    default: "",
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

// Определение событий
const emit = defineEmits(["click"]);
const buttonRef = ref<HTMLButtonElement | null>(null);

const handleClick = () => {
  if (!props.disabled) {
    emit("click");
  }
};

defineExpose({
  buttonRef,
});
</script>

<template>
  <button :class="className + ` ` + size" @click="handleClick" ref="buttonRef">
    <slot></slot>
  </button>
</template>

<style lang="scss" scoped>

button {
  border: none;
  border-radius: 15px;
  font-size: 1.6rem;
  padding: 15px 25px;
  font-weight: 600;
  outline: none;
  background: $bg;
  color: $strong-grey;
  transition-property: background-color, color;
  transition-duration: 0.25s;
  transition-timing-function: ease;
  &.right-menu {
    padding: 10px 15px;
  }

  &:hover {
    background-color: $red;
    color: $white;
  }
}
.btn-active {
  background-color: $red;
  color: $white;
}
.red__button {
  background-color: $red;
  color: $white;
}

.blue__button {
  background-color: $blue;
  color: $white;
}
</style>
