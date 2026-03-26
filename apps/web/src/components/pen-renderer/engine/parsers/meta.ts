import type { PenChild } from '../../types'
import type { VarResolver } from '../../resolver'
import type { INodeParser, IRenderNode, ChildParser } from '../interfaces'
import { extractTextContent } from '../helpers'

/** Handles: note, prompt, context — non-visual metadata nodes */
export class MetaParser implements INodeParser {
  private static TYPES = new Set(['note', 'prompt', 'context'])

  canParse(node: PenChild) { return MetaParser.TYPES.has(node.type) }

  parse(node: PenChild, resolver: VarResolver, parentLayout: string, childIndex: number): IRenderNode {
    const n = node as any
    // Minimal render — notes are design-time only
    return {
      id: n.id,
      type: n.type,
      name: n.name,
      layout: 'none',
      position: 'flex',
      sourceNode: node,
      // Don't render prompt/context at all
      ...(n.type === 'note' ? { textContent: extractTextContent(n.content) } : {}),
    }
  }
}
