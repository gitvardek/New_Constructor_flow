<template>
  <StudyArea>
    <template #close>
      <ClosePopUpButton class="popup__close" @close="popupStore.closePopup('study')" />
    </template>

    <template #tree>
      <div v-if="learningStore.loadingTree" class="study-loader">
        <div class="study-loader__spinner" aria-label="Загрузка"></div>
      </div>
      <template v-else>
        <div class="tree-levels" v-if="!learningStore.search.isActive">
          <div class="level" v-for="(ids, level) in learningStore.levels" :key="level">
            <div class="level-list">
              <MainButton
                v-for="id in ids"
                :key="id"
                :className="learningStore.activePath[level] === id ? 'red__button' : 'grey__button'"
                @click="() => learningStore.setActiveAtLevel(level, id)"
              >
                {{ learningStore.getNode(id)?.title }}
              </MainButton>
            </div>
          </div>
        </div>
        <div class="search-results" v-if="learningStore.search.isActive">
          <template v-if="learningStore.search.results && learningStore.search.results.length > 0">
            <MainButton
              v-for="id in learningStore.search.results"
              :key="id"
              :className="'grey__button'"
              @click="() => learningStore.selectFromSearch(id)"
            >
              {{ learningStore.getNode(id)?.title }}
            </MainButton>
          </template>
          <div v-else class="search-empty">Ничего не найдено</div>
        </div>
      </template>
    </template>

    <template #search>
      <div class="search-row">
        <MainInput
          class="input__search"
          type="text"
          placeholder="Поиск..."
          v-model="learningStore.search.query"
        />
      </div>
    </template>

    <template #content>
      <div v-if="learningStore.loadingContent">Загрузка...</div>
      <div v-else-if="learningStore.hasErrorContent">Ошибка загрузки контента</div>
      <div v-else-if="learningStore.selectedLeafId !== null">
        <div v-if="learningStore.tabContent">
          <h4>{{ learningStore.tabContent?.title }}</h4>
          <div v-if="learningStore.tabContent?.content.images.length">
            <ul>
              <img v-if="learningStore.tabContent?.content?.images?.length > 0"
                :src="learningStore.tabContent.content.images[0]" alt="image 1" class="first-image" />
            </ul>
          </div>
          <div>{{ learningStore.tabContent?.content.text }}</div>
          <img v-if="learningStore.tabContent?.content?.images?.length > 1"
                :src="learningStore.tabContent.content.images[1]" alt="image 2" class="second-image"/>
        </div>
        <div v-else>Нет контента</div>
      </div>
      <div v-else>Выберите пункт</div>
    </template>
  </StudyArea>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import MainInput from "@/components/ui/inputs/MainInput.vue";
import MainButton from "@/components/ui/buttons/MainButton.vue";
import ClosePopUpButton from "@/components/ui/svg/ClosePopUpButton.vue";
import { usePopupStore } from '@/store/appStore/popUpsStore';
import StudyArea from './StudyArea.vue';
import { useLearningTabsStore } from '../useLearningStore';

const popupStore = usePopupStore();
const learningStore = useLearningTabsStore();

onMounted(async () => {
  await learningStore.fetchTree();
});
</script>

<style scoped>
.tree-levels {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}
.level {
  display: block;
  width: 100%;
}
.level-list {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 6px;
  width: 100%;
}
.search-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.search-label {
  font-size: 1.4rem;
  color: #7b7b7b;
}
.search-results {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 6px;
  width: 100%;
}
.search-empty {
  width: 100%;
  text-align: center;
  color: #7b7b7b;
  font-size: 1.4rem;
  padding: 16px;
}
.first-image {
  float: left;
  max-width: 40%;
}
.second-image {
  width: 100%;
  max-width: 100%;
}
.study-loader {
  display: flex;
  justify-content: center;
  padding: 16px;
}
.study-loader__spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #e6e6e6;
  border-top-color: #ed1c29;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style> 