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
  /** Full document children for component registry (used in single-frame mode where document.children is filtered) */
  allChildren?: PenChild[]
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
  allChildren,
  resolver,
  selectedId = null,
  onSelectNode,
  scale = 1,
}: PenRendererProps) {
  // Build registry from ALL children (not filtered view) so refs resolve in single-frame mode
  const registrySource = allChildren ?? doc.children
  const factory = useMemo(() => {
    const registry = buildComponentRegistry(registrySource)
    return createParserFactory(registry)
  }, [registrySource])

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
