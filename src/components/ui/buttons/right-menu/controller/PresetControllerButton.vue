<template>
  <!-- «Сохранить как пресет» для выделенного УМ/гардеробной системы.
       Позиция top-t — свободный слот левой дуги контроллера (ниже удаления). -->
  <button class="right-menu__button top-t" title="Сохранить как пресет">
    <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10.4551 2.5L12.7195 7.0896L17.7859 7.8229L14.1205 11.3926L14.9839 16.4375L10.4551 14.0521L5.92627 16.4375L6.78967 11.3926L3.12427 7.8229L8.19067 7.0896L10.4551 2.5Z"
        fill="#5D6069" />
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
