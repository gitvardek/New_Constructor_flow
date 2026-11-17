<template>
  <div class="basket-loader-overlay">
    <div class="basket-loader"></div>
  </div>
</template>

<script lang="ts" setup>
</script>

<style lang="scss" scoped>
.basket-loader-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: transparent; /* или другой цвет и прозрачность */
  // backdrop-filter: blur(15px); /* опционально: размытие фона */
  z-index: 998;
  display: flex;
  align-items: center;
  justify-content: center;
}
.basket-loader {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 999;
  animation: rotate 1s linear infinite;
}

.basket-loader::before,
.basket-loader::after {
  content: "";
  box-sizing: border-box;
  position: absolute;
  inset: 0px;
  border-radius: 50%;
  border: 10px solid #f9041073;
  animation: prixClipFix 2s linear infinite;
}

.basket-loader::after {
  border-color: #f50814;
  animation: prixClipFix 2s linear infinite, rotateReverse 0.5s linear infinite;
  inset: 10px;
}

@keyframes rotate {
  0% {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  100% {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

@keyframes rotateReverse {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(-360deg);
  }
}

@keyframes prixClipFix {
  0% {
    clip-path: polygon(50% 50%, 0 0, 0 0, 0 0, 0 0, 0 0);
  }
  25% {
    clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 0, 100% 0, 100% 0);
  }
  50% {
    clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 100%, 100% 100%, 100% 100%);
  }
  75% {
    clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 100%, 0 100%, 0 100%);
  }
  100% {
    clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 100%, 0 100%, 0 0);
  }
}
</style>

