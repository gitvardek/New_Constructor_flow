import { ref } from 'vue';
import type { NodeId, TabNode } from '@/api/types';

export type IndexMaps = {
  nodesById: Map<NodeId, TabNode>;
  parentById: Map<NodeId, NodeId | null>;
  childrenById: Map<NodeId | null, NodeId[]>; // null → корневые дети
};

export function useIndex() {
  const maps = ref<IndexMaps>({
    nodesById: new Map(),
    parentById: new Map(),
    childrenById: new Map(),
  });

  const pushChild = (parent: NodeId | null, child: NodeId) => {
    const list = maps.value.childrenById.get(parent) ?? [];
    if (!list.includes(child)) list.push(child);
    maps.value.childrenById.set(parent, list);
  };

  const build = (tree: TabNode[]): void => {
    maps.value.nodesById.clear();
    maps.value.parentById.clear();
    maps.value.childrenById.clear();

    const traverse = (node: TabNode, parent: NodeId | null) => {
      maps.value.nodesById.set(node.id, { ...node, children: node.children ?? [] });
      maps.value.parentById.set(node.id, parent);
      pushChild(parent, node.id);
      if (node.children && node.children.length) {
        for (const child of node.children) traverse(child, node.id);
      }
    };

    for (const root of tree) traverse(root, null);
  };

  const getChildren = (parent: NodeId | null): NodeId[] => {
    return maps.value.childrenById.get(parent) ?? [];
  };

  const getNode = (id: NodeId | null): TabNode | undefined => {
    return id === null ? undefined : maps.value.nodesById.get(id);
  };

  const isLeaf = (id: NodeId): boolean => {
    return (maps.value.childrenById.get(id) ?? []).length === 0;
  };

  const buildPathTo = (id: NodeId): NodeId[] => {
    const path: NodeId[] = [];
    let current: NodeId | null = id;
    while (current !== null) {
      path.push(current);
      current = maps.value.parentById.get(current) ?? null;
    }
    return path.reverse();
  };

  return { maps, build, getChildren, getNode, isLeaf, buildPathTo }
} 