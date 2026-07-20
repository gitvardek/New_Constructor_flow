import { computed, type Ref } from 'vue';
import type { NodeId } from '@/api/types';

export function useTreeLevels(getChildren: (parent: NodeId | null) => NodeId[], activePath: Ref<NodeId[]>) {
  const levels = computed<NodeId[][]>(() => {
    const lvl: NodeId[][] = [];
    let parent: NodeId | null = null;
    while (true) {
      const ids = getChildren(parent);
      if (ids.length === 0) break;
      lvl.push(ids);
      const levelIndex = lvl.length - 1;
      const selectedAtLevel = activePath.value[levelIndex];
      if (selectedAtLevel == null) break;
      parent = selectedAtLevel;
    }
    return lvl;
  });

  return { levels }
} 