<template>
  <div class="study">
    <div class="study-header">
      <div class="study__title">Обучение</div>
      <slot name="close" />
    </div>
    <div class="tree-scroll">
      <div class="study-parts tree-root">
        <slot name="tree" />
      </div>
    </div>
    <slot name="search" />
    <div class="study-main">
      <slot name="content" />
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style lang="scss" scoped>
.study {
  width: 100%;
  max-width: 80vh;
  height: 100%;
  max-height: 80vh;
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;

  &-header {
    .study__title {
      margin-bottom: 20px;
      font-size: 3.2rem;
      font-weight: 600;
      text-align: center;
    }
  }

  .study-parts {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
    padding: 5px 0;
    margin-bottom: 10px;
    border-top: 1px solid $stroke;
    border-bottom: 1px solid $stroke;
    min-width: 350px;
  }

  .level-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
    flex-wrap: wrap;
  }

  .tree-scroll {
    overflow-x: auto;
    max-width: 100vw;
    padding-bottom: 8px;
  }

  .tree-root {
    min-width: 400px;
    max-width: 800px;
  }

  .study-main {
    margin-top: 30px;
  }
}
</style> 