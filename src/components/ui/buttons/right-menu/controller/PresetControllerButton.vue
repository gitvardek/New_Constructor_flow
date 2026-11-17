<template>
  <!-- «Сохранить как пресет» для выделенного УМ/гардеробной системы.
       Позиция top-t — свободный слот левой дуги контроллера (ниже удаления). -->
  <button class="right-menu__button top-t" title="Сохранить как пресет">
    <svg viewBox="0 0 32 32" fill="currentColor" width="32" height="32" xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink">
      <path
        d="M27.895 8.5525l-2-4A1 1 0 0 0 25 4H7a1 1 0 0 0-0.895 0.5525l-2 4A1.01 1.01 0 0 0 4 9v17a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V9a1.01 1.01 0 0 0-0.105-0.4475zM7.6175 6h16.765l1 2H6.6175zM26 26H6V10h20zM20.7075 16.2925a1.0006 1.0006 0 0 1-1.415 1.415L17 15.4138V23a1 1 0 0 1-2 0v-7.5862l-2.2925 2.2937a1.0006 1.0006 0 0 1-1.415-1.415l4-4a1 1 0 0 1 1.415 0z" />
    </svg>
  </button>
</template>

<style lang="scss" scoped>
.top-t {
  top: 140px;
  left: -20px;
  pointer-events: auto;
}
</style>
