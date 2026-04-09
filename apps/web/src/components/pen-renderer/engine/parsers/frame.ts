import type { PenChild } from '../../types'
import type { VarResolver } from '../../resolver'
import type { INodeParser, IRenderNode, ChildParser } from '../interfaces'
import { resolveSize, resolveBackgroundFill, resolveStroke, resolveCornerRadius, resolveEffects, resolveLayoutProps, resolveTransform } from '../helpers'

export class FrameParser implements INodeParser {
  canParse(node: PenChild) { return node.type === 'frame' }

  parse(node: PenChild, resolver: VarResolver, parentLayout: string, childIndex: number, parseChild: ChildParser): IRenderNode {
    const n = node as any
    const result: IRenderNode = {
      id: n.id,
      type: 'frame',
      name: n.name,
      layout: n.layout ?? 'horizontal',
      position: (parentLayout === 'none' || n.layoutPosition === 'absolute') ? 'absolute' : 'flex',
      x: n.x,
      y: n.y,
      zIndex: childIndex,
      sourceNode: node,
    }

    resolveLayoutProps(result, n, resolver, 'horizontal')
    resolveSize(result, n.width, n.height, resolver, parentLayout)
    resolveBackgroundFill(result, n.fill, resolver)
    resolveStroke(result, n.stroke, resolver)
    resolveCornerRadius(result, n.cornerRadius, resolver)
    resolveEffects(result, n.effect, resolver)
    resolveTransform(result, n, resolver)

    if (n.opacity !== undefined) {
      const op = resolver.resolveNumber(n.opacity)
      if (op !== undefined && op < 1) result.opacity = op
    }

    // Parse children recursively
    const ownLayout = result.layout
    if (n.children?.length) {
      result.children = n.children
        .filter((c: any) => resolver.resolveBoolean(c.enabled) !== false)
        .map((child: PenChild, i: number) => parseChild(child, ownLayout, i))
    }

    return result
  }
}
