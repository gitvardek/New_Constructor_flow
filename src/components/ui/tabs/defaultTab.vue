<script lang="ts" setup>
//@ts-nocheck
import { TFasadeProp } from "@/types/types";
import { ref, defineProps, defineEmits, computed, defineExpose } from "vue";

// Интерфейс для табов
export interface Tab {
  name: string;
  label: string;
  title?: string;
  type?: string;
  props?: TFasadeProp;
  disabled?: boolean;
  action?: Function;
}

// Пропсы
const props = defineProps({
  tabs: {
    type: Array as () => Tab[],
    required: true,
  },
  initialTab: {
    type: String,
    default: null,
  },
});

// События
const emit = defineEmits<{
  "tab-change": [{ tab: Tab; index: number }];
}>();

// Состояние
const selectedTab = ref<string | null>(null);

// Установка начального таба
selectedTab.value =
  props.initialTab || (props.tabs.length > 0 ? props.tabs[0].name : null);

// Метод для смены таба
const selectTab = (tab: Tab, index: number, local?: boolean = false) => {
  selectedTab.value = tab.name;
  if (!local) emit("tab-change", { tab: tab, index: index });
};

// Вычисляемое свойство для проверки активного таба
const isTabActive = (tabName: string) => {
  return selectedTab.value === tabName;
};

defineExpose({
  selectTab,
});
</script>

<template>
  <div>
    <!-- Навигация -->
    <div class="tabs-navigation">
      <button
        v-for="(tab, i) in tabs"
        :key="tab.name"
        :class="[{ active: isTabActive(tab.name) }, { disabled: tab.disabled }]"
        @click="selectTab(tab, i)"
        :aria-label="`Переключить на ${tab.label}`"
        :tabindex="0"
        @keydown.enter="selectTab(tab.name, i)"
        @keydown.space.prevent="selectTab(tab.name, i)"
      >
        {{ tab.label }}
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.tabs-navigation {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 8px;
  box-sizing: border-box;
}

button {
  border: none;
  border-radius: 15px;
  font-size: 1.6rem;
  padding: 0.5rem 1rem;
  min-width: 60px;
  font-weight: 600;
  font-size: small;
  outline: none;
  background: $bg;
  color: $strong-grey;
  transition: background-color 0.2s, transform 0.1s;

  @media (min-height: 1000px) {
    font-size: medium;
    padding: 15px 25px;
  }
}

button:hover {
  background-color: #e0e0e0;
}

button.active {
  background: $red;
  color: $white;
}
.tabs-content {
  margin-top: 16px;
}
.disabled {
  display: none;
}
</style>
