import { defineStore } from 'pinia';
import { ref } from 'vue';
import { educationApi } from '@/features/quickActions/learning/api/learningApi';
import type { NodeId, TabContent, TabNode } from '@/api/types';
import { useIndex } from '@/features/quickActions/learning/composables/useIndex';
import { useTreeLevels } from '@/features/quickActions/learning/composables/useTreeLevels';
import { useLearningSearch } from '@/features/quickActions/learning/composables/useLearningSearch';

export const useLearningTabsStore = defineStore('learningTabs', () => {
  const index = useIndex();
  const rawTree = ref<TabNode[]>([]);

  const activePath = ref<NodeId[]>([]);
  const selectedLeafId = ref<NodeId | null>(null);

  const tabContent = ref<TabContent | null>(null);
  const hasErrorTree = ref(false);
  const loadingTree = ref(false);
  const hasErrorContent = ref(false);
  const loadingContent = ref(false);

  async function fetchTree() {
    loadingTree.value = true;
    hasErrorTree.value = false;

    const { data, error } = await educationApi.getTree();

    if (data)
      rawTree.value = data;

    if (error) 
      hasErrorTree.value = true;

    index.build(rawTree.value);

    activePath.value = [];
    selectedLeafId.value = null;

    loadingTree.value = false;
  }

  async function fetchTabContent(id: NodeId) {
    loadingContent.value = true;
    hasErrorContent.value = false;

    const { data, error } = await educationApi.getById(id);
    if (data) 
      tabContent.value = data?.DATA ?? null;

    if (error) 
      hasErrorContent.value = true;

    loadingContent.value = false;
  }

  const getNode = (id: NodeId | null): TabNode | undefined => index.getNode(id);

  const { levels } = useTreeLevels(index.getChildren, activePath);

  async function setActiveAtLevel(level: number, id: NodeId) {
    activePath.value = activePath.value.slice(0, level);
    activePath.value.push(id);

    if (index.isLeaf(id)) {
      selectedLeafId.value = id;
      await fetchTabContent(id);
    } else {
      selectedLeafId.value = null;
    }
  }

  const search = useLearningSearch(index.maps);

  async function selectFromSearch(id: NodeId) {
    const path = index.buildPathTo(id);
    activePath.value = path;
    if (index.isLeaf(id)) {
      selectedLeafId.value = id;
      await fetchTabContent(id);
    } else {
      selectedLeafId.value = null;
    }
    search.clearQuery();
  }

  return {
    hasErrorTree,
    loadingTree,
    hasErrorContent,
    loadingContent,

    fetchTree,
    fetchTabContent,

    getNode,
    levels,
    activePath,
    setActiveAtLevel,

    tabContent: tabContent,
    selectedLeafId,

    // search api
    search,
    selectFromSearch,
  };
}); 