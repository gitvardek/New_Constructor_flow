<script setup lang="ts">
// Крошки уровней редактора: предыдущие уровни — кнопки перехода, текущий — текст.
import type { EditorNavigation } from "./editorNavigation.ts";

const props = defineProps<{ navigation: EditorNavigation }>();
</script>

<template>
  <nav class="UM no-select editor-breadcrumbs">
    <template v-for="(level, index) in props.navigation.levels.value" :key="level.id">
      <span v-if="index > 0" class="editor-breadcrumbs__separator">›</span>
      <button v-if="index < props.navigation.depth.value - 1" class="editor-breadcrumbs__link"
        @click="props.navigation.goTo(index)">
        {{ level.title }}
      </button>
      <h1 v-else class="editor-breadcrumbs__current">{{ level.title }}</h1>
    </template>
  </nav>
</template>

<style scoped lang="scss">
.editor-breadcrumbs {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;

  &__separator {
    opacity: 0.5;
    font-size: 2rem;
  }

  &__link {
    padding: 0;
    border: none;
    background: none;
    font-size: 2rem;
    color: $dark-stroke;
    opacity: 0.6;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 0.3rem;

    @media (hover:hover) {
      &:hover {
        opacity: 1;
      }
    }
  }

  &__current {
    margin: 0;
  }
}
</style>
