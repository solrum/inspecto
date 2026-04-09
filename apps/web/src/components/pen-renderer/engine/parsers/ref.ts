import type { PenChild } from '../../types'
import type { VarResolver } from '../../resolver'
import type { INodeParser, IRenderNode, ChildParser } from '../interfaces'

export class RefParser implements INodeParser {
  private componentRegistry: Map<string, PenChild>

  constructor(registry: Map<string, PenChild>) {
    this.componentRegistry = registry
  }

  canParse(node: PenChild) { return node.type === 'ref' }

  parse(node: PenChild, resolver: VarResolver, parentLayout: string, childIndex: number, parseChild: ChildParser): IRenderNode {
    const n = node as any
    const component = this.componentRegistry.get(n.ref)

    if (!component) {
      return {
        id: n.id,
        type: 'ref',
        name: n.name,
        layout: 'none',
        position: 'flex',
        sourceNode: node,
        textContent: `ref:${n.ref}`,
      }
    }

    // Clone component and apply root overrides
    const merged = deepClone(component) as any
    const skipKeys = new Set(['id', 'type', 'ref', 'descendants', 'reusable', 'x', 'y', 'layoutPosition'])
    for (const [key, val] of Object.entries(n)) {
      if (!skipKeys.has(key) && val !== undefined) {
        merged[key] = val
      }
    }
    merged.id = n.id
    merged.reusable = false

    // Apply descendants overrides for nested customization
    if (n.descendants && merged.children) {
      applyDescendants(merged.children, n.descendants)
    }

    // Re-parse the merged node as its actual type
    return parseChild(merged, parentLayout, childIndex)
  }
}

// ─── Helpers ───

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Apply descendants overrides to a children tree.
 * Keys in `overrides` can be:
 * - Simple ID: "nodeId" → override that node's properties
 * - Path: "parentId/childId" → override nested node
 */
function applyDescendants(children: any[], overrides: Record<string, any>) {
  for (const [idPath, props] of Object.entries(overrides)) {
    const ids = idPath.split('/')
    const targetId = ids[ids.length - 1]
    applyToNode(children, targetId, props)
  }
}

function applyToNode(children: any[], targetId: string, props: Record<string, any>): boolean {
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    if (child.id === targetId) {
      // Apply overrides (skip structural keys)
      const skip = new Set(['id', 'type', 'children'])
      for (const [key, val] of Object.entries(props)) {
        if (!skip.has(key) && val !== undefined) {
          child[key] = val
        }
      }
      return true
    }
    // Recurse into nested children
    if (child.children && applyToNode(child.children, targetId, props)) {
      return true
    }
  }
  return false
}
