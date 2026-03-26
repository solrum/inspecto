import type { PenChild } from '../../types'
import type { VarResolver } from '../../resolver'
import type { INodeParser, IRenderNode, ChildParser } from '../interfaces'
import { resolveSize, resolveForegroundFill, resolveEffects, extractTextContent } from '../helpers'

export class TextParser implements INodeParser {
  canParse(node: PenChild) { return node.type === 'text' }

  parse(node: PenChild, resolver: VarResolver, parentLayout: string, childIndex: number): IRenderNode {
    const n = node as any
    const result: IRenderNode = {
      id: n.id,
      type: 'text',
      name: n.name,
      layout: 'none',
      position: (parentLayout === 'none' || n.layoutPosition === 'absolute') ? 'absolute' : 'flex',
      x: n.x,
      y: n.y,
      zIndex: childIndex,
      sourceNode: node,
    }

    // Size
    resolveSize(result, n.width, n.height, resolver, parentLayout)

    // Foreground color (fill = text color, NOT background)
    const color = resolveForegroundFill(n.fill, resolver)
    if (color) result.color = color

    // Font properties
    const ff = resolver.resolveFontFamily(n.fontFamily)
    if (ff) result.fontFamily = ff

    const fs = resolver.resolveNumber(n.fontSize)
    if (fs) result.fontSize = fs

    const fw = resolver.resolveString(n.fontWeight) ?? n.fontWeight
    if (fw) result.fontWeight = String(fw)

    const fst = resolver.resolveString(n.fontStyle)
    if (fst) result.fontStyle = fst

    if (n.letterSpacing !== undefined) {
      const ls = resolver.resolveNumber(n.letterSpacing)
      if (ls !== undefined) result.letterSpacing = ls
    }

    if (n.lineHeight !== undefined) {
      const lh = resolver.resolveNumber(n.lineHeight)
      if (lh !== undefined) result.lineHeight = lh
    }

    if (n.textAlign) {
      const map: Record<string, string> = { left: 'left', center: 'center', right: 'right', justify: 'justify' }
      result.textAlign = map[n.textAlign]
    }

    if (n.underline) result.textDecoration = 'underline'
    if (n.strikethrough) result.textDecoration = 'line-through'

    // textGrowth controls sizing
    const tg = n.textGrowth ?? 'auto'
    if (tg === 'fixed-width') {
      result.wordWrap = 'break-word'
      result.overflowWrap = 'break-word'
    } else if (tg === 'fixed-width-height') {
      result.overflow = 'hidden'
    } else {
      // auto — handle explicit width (fill_container) or intrinsic
      result.whiteSpace = 'pre-wrap'
      if (!n.width) result.flexShrink = 0
    }

    // Effects (shadows on text)
    resolveEffects(result, n.effect, resolver)

    if (n.opacity !== undefined) {
      const op = resolver.resolveNumber(n.opacity)
      if (op !== undefined && op < 1) result.opacity = op
    }

    // Text content
    result.textContent = extractTextContent(n.content)

    return result
  }
}
