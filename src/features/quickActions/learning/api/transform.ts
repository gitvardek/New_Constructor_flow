import type { TabNode } from '@/api/types'

// Transforms map-like tree { [id]: Node } into TabNode[] expected by UI
export function transformEducationTreeFromMap(raw: unknown): TabNode[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    // Already in expected shape or invalid
    return (raw as TabNode[]) ?? []
  }

  const values = Object.values(raw as Record<string, any>)
  const sorted = values.sort((a, b) => Number(a?.LEFT_MARGIN ?? 0) - Number(b?.LEFT_MARGIN ?? 0))
  return sorted.map(transformNode)
}

function transformNode(node: any): TabNode {
  const id = Number(node?.ID)
  const title = String(node?.NAME ?? '')

  let rawChildren: any[] = []
  const childrenField = node?.CHILDREN

  if (childrenField) {
    if (Array.isArray(childrenField)) {
      rawChildren = []
    } else if (typeof childrenField === 'object') {
      rawChildren = Object.values(childrenField)
    }
  }

  rawChildren.sort((a, b) => Number(a?.LEFT_MARGIN ?? 0) - Number(b?.LEFT_MARGIN ?? 0))

  const children = rawChildren.map(transformNode)

  return { id, title, children }
} 