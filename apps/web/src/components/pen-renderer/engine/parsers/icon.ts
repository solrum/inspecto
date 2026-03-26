import type { PenChild } from '../../types'
import type { VarResolver } from '../../resolver'
import type { INodeParser, IRenderNode, ChildParser } from '../interfaces'
import { resolveSize, resolveForegroundFill, resolveEffects } from '../helpers'

export class IconParser implements INodeParser {
  canParse(node: PenChild) { return node.type === 'icon_font' }

  parse(node: PenChild, resolver: VarResolver, parentLayout: string, childIndex: number): IRenderNode {
    const n = node as any
    const result: IRenderNode = {
      id: n.id,
      type: 'icon_font',
      name: n.name,
      layout: 'none',
      position: (parentLayout === 'none' || n.layoutPosition === 'absolute') ? 'absolute' : 'flex',
      x: n.x,
      y: n.y,
      zIndex: childIndex,
      flexShrink: 0,
      sourceNode: node,
    }

    resolveSize(result, n.width, n.height, resolver, parentLayout)
    resolveEffects(result, n.effect, resolver)

    // Icon color (fill = foreground, NOT background)
    result.iconColor = resolveForegroundFill(n.fill, resolver) ?? 'currentColor'
    result.iconName = resolver.resolveString(n.iconFontName) ?? ''
    result.iconFamily = resolver.resolveString(n.iconFontFamily) ?? 'lucide'
    result.iconSize = resolver.resolveNumber(n.width) ?? resolver.resolveNumber(n.height) ?? 16

    if (n.opacity !== undefined) {
      const op = resolver.resolveNumber(n.opacity)
      if (op !== undefined && op < 1) result.opacity = op
    }

    return result
  }
}
