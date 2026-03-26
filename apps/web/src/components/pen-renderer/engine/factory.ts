/**
 * ParserFactory
 *
 * Registry of INodeParser implementations.
 * Dispatches .pen nodes to the correct parser and recursively builds IRenderNode tree.
 */

import type { PenChild } from '../types'
import type { VarResolver } from '../resolver'
import type { INodeParser, IParserFactory, IRenderNode } from './interfaces'

export class ParserFactory implements IParserFactory {
  private parsers: INodeParser[] = []

  register(parser: INodeParser): void {
    this.parsers.push(parser)
  }

  getParser(node: PenChild): INodeParser | undefined {
    return this.parsers.find(p => p.canParse(node))
  }

  parse(
    node: PenChild,
    resolver: VarResolver,
    parentLayout: string,
    childIndex: number,
  ): IRenderNode {
    const parser = this.getParser(node)

    if (!parser) {
      // Fallback: render as empty box
      return {
        id: node.id,
        type: node.type,
        name: node.name,
        layout: 'none',
        position: 'flex',
        sourceNode: node,
      }
    }

    // Provide child parser callback for recursive parsing
    const parseChild = (child: PenChild, pLayout: string, idx: number) =>
      this.parse(child, resolver, pLayout, idx)

    return parser.parse(node, resolver, parentLayout, childIndex, parseChild)
  }
}
