<script setup lang="ts">
import { ref } from "vue";

// Текстовый поиск по списку объектов с фильтрацией по одному полю (по
// умолчанию NAME) — переиспользуемый UI-примитив, вынесен из box-UM
// FillingsInsertPanel.vue::onSearchChange (тот же паттерн теперь и в
// гардеробной системе, WardrobeInsertView.vue). Компонент сам фильтрует
// props.items и эмитит результат — родителю остаётся только отрисовать то,
// что пришло в update:filtered. Пустой запрос эмитит [] (не полный список) —
// сохраняем поведение оригинала 1:1, потребители сами решают, что показывать
// при пустом фильтре (обычно — полный список, через isSearch/computed).
//
// .includes() вместо оригинального new RegExp(query).test(...) — та же
// посимвольная фильтрация по подстроке для обычного текста, но без риска
// упасть/дать неожиданный результат на спецсимволах регулярных выражений
// в вводе пользователя (`(`, `[`, `*` и т.п.).
interface IProps {
  items: any[];
  searchKey?: string;
  placeholder?: string;
}

const props = withDefaults(defineProps<IProps>(), {
  searchKey: "NAME",
  placeholder: "Поиск",
});

const emit = defineEmits<{
  (e: "update:filtered", value: any[]): void;
}>();

const query = ref("");

const onInput = (e: Event) => {
  query.value = (e.target as HTMLInputElement).value;
  const q = query.value.toLowerCase();

  if (!q) {
    emit("update:filtered", []);
    return;
  }

  emit(
    "update:filtered",
    props.items.filter((item) => String(item?.[props.searchKey] ?? "").toLowerCase().includes(q)),
  );
};
</script>

<template>
  <input class="ui-search-input" type="text" :placeholder="placeholder" :value="query" @input="onInput" />
</template>

<style scoped lang="scss">
.ui-search-input {
  width: 100%;
  padding: 0.5rem 1rem;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  font-size: 1.3rem;
  box-sizing: border-box;

  &::placeholder {
    color: rgba(0, 0, 0, 0.4);
  }
}
</style>
