import type { PenChild } from '../../types'
import { ParserFactory } from '../factory'
import { FrameParser } from './frame'
import { GroupParser } from './group'
import { ShapeParser } from './shape'
import { TextParser } from './text'
import { IconParser } from './icon'
import { RefParser } from './ref'
import { MetaParser } from './meta'

/**
 * Create a fully configured ParserFactory with all built-in parsers registered.
 * RefParser needs the component registry, so it's provided at creation time.
 */
export function createParserFactory(componentRegistry: Map<string, PenChild>): ParserFactory {
  const factory = new ParserFactory()

  // Register in priority order (first match wins)
  factory.register(new FrameParser())
  factory.register(new GroupParser())
  factory.register(new TextParser())
  factory.register(new IconParser())
  factory.register(new RefParser(componentRegistry))
  factory.register(new ShapeParser())
  factory.register(new MetaParser())

  return factory
}

/**
 * Build component registry from document children.
 * Walks entire tree collecting reusable: true nodes.
 */
export function buildComponentRegistry(children: PenChild[]): Map<string, PenChild> {
  const registry = new Map<string, PenChild>()
  function walk(nodes: PenChild[]) {
    for (const node of nodes) {
      if ('reusable' in node && node.reusable) {
        registry.set(node.id, node)
      }
      if ('children' in node && (node as any).children) {
        walk((node as any).children)
      }
    }
  }
  walk(children)
  return registry
}
