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
    const merged = { ...component } as any
    const skipKeys = new Set(['id', 'type', 'ref', 'descendants', 'reusable', 'x', 'y', 'layoutPosition'])
    for (const [key, val] of Object.entries(n)) {
      if (!skipKeys.has(key) && val !== undefined) {
        merged[key] = val
      }
    }
    merged.id = n.id
    merged.reusable = false

    // TODO: Apply descendants overrides for nested customization

    // Re-parse the merged node as its actual type
    return parseChild(merged, parentLayout, childIndex)
  }
}
