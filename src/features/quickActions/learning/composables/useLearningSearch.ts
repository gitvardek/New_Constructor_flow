import { computed, ref, type Ref } from 'vue';
import type { NodeId } from '@/api/types';
import type { IndexMaps } from './useIndex';

export function useLearningSearch(indexes: Ref<IndexMaps>, initialQuery = '') {
  const query = ref<string>(initialQuery);

  const setQuery = (value: string) => { query.value = value; };
  const clearQuery = () => { query.value = ''; };

  const results = computed<NodeId[] | null>(() => {
    const q = query.value.trim().toLowerCase();
    if (!q) return null;
    const ids: NodeId[] = [];
    indexes.value.nodesById.forEach((node, id) => {
      if (node.title.toLowerCase().includes(q)) ids.push(id);
    });
    return ids;
  });

  const isActive = computed(() => query.value.trim().length > 0);

  return { query, setQuery, clearQuery, results, isActive }
} 