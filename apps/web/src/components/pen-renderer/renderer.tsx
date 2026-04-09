'use client'

/**
 * PenDocumentRenderer
 *
 * Parse .pen JSON → IRenderNode tree (memoized, stable).
 * Render via HTMLRendererComponent (selection via context, no full re-render).
 */

import React, { useMemo, useCallback, memo } from 'react'
import type { PenDocument, PenChild } from './types'
import { VarResolver } from './resolver'
import { createParserFactory, buildComponentRegistry } from './engine'
import { HTMLRendererComponent } from './engine/renderers/html'

export interface PenRendererProps {
  document: PenDocument
  resolver: VarResolver
  selectedId?: string | null
  onSelectNode?: (id: string, node: PenChild) => void
  scale?: number
}

const scaleStyle = (scale: number) =>
  scale === 1
    ? staticScaleStyle
    : { position: 'relative' as const, transformOrigin: 'top left', transform: `scale(${scale})` }

const staticScaleStyle = { position: 'relative' as const, transformOrigin: 'top left' }

export const PenDocumentRenderer = memo(function PenDocumentRenderer({
  document: doc,
  resolver,
  selectedId = null,
  onSelectNode,
  scale = 1,
}: PenRendererProps) {
  const factory = useMemo(() => {
    const registry = buildComponentRegistry(doc.children)
    return createParserFactory(registry)
  }, [doc.children])

  const renderTrees = useMemo(() => {
    return doc.children
      .filter((child: any) => resolver.resolveBoolean(child.enabled) !== false)
      .map((child, i) => factory.parse(child, resolver, 'none', i))
  }, [doc.children, factory, resolver])

  const handleSelect = useCallback((id: string, sourceNode: any) => {
    onSelectNode?.(id, sourceNode)
  }, [onSelectNode])

  const style = useMemo(() => scaleStyle(scale), [scale])

  return (
    <div style={style}>
      <HTMLRendererComponent
        trees={renderTrees}
        selectedId={selectedId}
        onSelectNode={handleSelect}
      />
    </div>
  )
})
