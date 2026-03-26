import type { PenChild } from '../../types'
import type { VarResolver } from '../../resolver'
import type { INodeParser, IRenderNode, ChildParser } from '../interfaces'
import { resolveSize, resolveEffects, resolveLayoutProps } from '../helpers'

export class GroupParser implements INodeParser {
  canParse(node: PenChild) { return node.type === 'group' }

  parse(node: PenChild, resolver: VarResolver, parentLayout: string, childIndex: number, parseChild: ChildParser): IRenderNode {
    const n = node as any
    const result: IRenderNode = {
      id: n.id,
      type: 'group',
      name: n.name,
      layout: n.layout ?? 'none',
      position: (parentLayout === 'none' || n.layoutPosition === 'absolute') ? 'absolute' : 'flex',
      x: n.x,
      y: n.y,
      zIndex: childIndex,
      sourceNode: node,
    }

    resolveLayoutProps(result, n, resolver, 'none')
    resolveSize(result, n.width, n.height, resolver, parentLayout)
    resolveEffects(result, n.effect, resolver)

    const ownLayout = result.layout
    if (n.children?.length) {
      result.children = n.children
        .filter((c: any) => c.enabled !== false)
        .map((child: PenChild, i: number) => parseChild(child, ownLayout, i))
    }

    return result
  }
}
