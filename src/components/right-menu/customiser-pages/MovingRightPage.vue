<template>
  <div class="move">
    <div class="customiser-section-non">
      <p class="customiser-section-non__title">Направляющие</p>
      <div class="settings-move">
        <!-- component -->
        <div v-for="(item, index) in 3" :key="index" class="item-group-move">
          <div class="item-group-name">
            <img src="../../../assets/img/right-menu/bg.png" class="name__bg" />
            <p class="name__text">Направляющие роликовые</p>
          </div>
          <img src="../../../assets/svg/right-menu/help.svg" class="item-group__question" />
        </div>
      </div>
      <!-- component -->
      <div class="move-checkboxes">
        <div v-for="(item, index) in 4" :key="index" class="item__checkbox">
          <input type="checkbox" name="" id="1">
          <label for="1">Без петель</label>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import MainButton from "@/components/ui/buttons/MainButton.vue";
import MainInput from "@/components/ui/inputs/MainInput.vue";
</script>
<style lang="scss" scoped>
.move {
  max-height: calc(100vh - 220px);
  display: flex;
  flex-direction: column;
  gap: 10px;
  &__links {
    display: flex;
    gap: 5px;
  }
  .customiser-section-non {
    display: flex;
    flex-direction: column;
    gap: 10px;
    &__title {
      font-size: 1.8rem;
      font-weight: 600;
    }
    .settings-move {
      display: flex;
      flex-direction: column;
      gap: 5px;
      margin-bottom: 5px;
      .item-group-move {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px;
        border-radius: 15px;
        background-color: $bg;
        .item-group-name {
          display: flex;
          align-items: center;
          gap: 10px;
          .name__text {
            font-weight: 500;
          }
        }
      }
    }
    .move-checkboxes {
      display: flex;
      flex-direction: column;
      gap: 5px;
      padding: 0 10px;
      .item__checkbox {
        display: flex;
        align-items: center;
        gap: 5px;
        label {
          font-size: 0.9rem;
          font-weight: 500;
        }
      }
    }
  }
}
</style>
