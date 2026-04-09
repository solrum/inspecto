import type { PenChild } from '../../types'
import type { VarResolver } from '../../resolver'
import type { INodeParser, IRenderNode, ChildParser } from '../interfaces'
import { resolveSize, resolveBackgroundFill, resolveStroke, resolveCornerRadius, resolveEffects, resolveTransform } from '../helpers'

/** Handles: rectangle, ellipse, polygon, path, line */
export class ShapeParser implements INodeParser {
  private static TYPES = new Set(['rectangle', 'ellipse', 'polygon', 'path', 'line'])

  canParse(node: PenChild) { return ShapeParser.TYPES.has(node.type) }

  parse(node: PenChild, resolver: VarResolver, parentLayout: string, childIndex: number): IRenderNode {
    const n = node as any
    const result: IRenderNode = {
      id: n.id,
      type: n.type,
      name: n.name,
      layout: 'none',
      position: (parentLayout === 'none' || n.layoutPosition === 'absolute') ? 'absolute' : 'flex',
      x: n.x,
      y: n.y,
      zIndex: childIndex,
      sourceNode: node,
    }

    resolveSize(result, n.width, n.height, resolver, parentLayout)
    resolveBackgroundFill(result, n.fill, resolver)
    resolveStroke(result, n.stroke, resolver)
    resolveEffects(result, n.effect, resolver)
    resolveTransform(result, n, resolver)

    if (n.opacity !== undefined) {
      const op = resolver.resolveNumber(n.opacity)
      if (op !== undefined && op < 1) result.opacity = op
    }

    // Type-specific
    if (n.type === 'ellipse') result.isEllipse = true
    if (n.type === 'line') { if (!result.height) result.height = 1; result.flexShrink = 0 }
    if (n.type === 'path' && n.geometry) { result.svgGeometry = n.geometry; result.svgFillRule = n.fillRule }
    if (n.type !== 'ellipse') resolveCornerRadius(result, n.cornerRadius, resolver)

    return result
  }
}
