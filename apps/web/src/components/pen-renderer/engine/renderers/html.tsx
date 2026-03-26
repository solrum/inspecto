'use client'

/**
 * HTMLRenderer
 *
 * Renders IRenderNode tree → React divs with CSS.
 * Uses React.memo + context for selection to avoid full re-renders.
 */

import React, { createContext, useContext, memo, useMemo, useRef, type CSSProperties } from 'react'
import type { IRenderNode, IRenderer } from '../interfaces'

// ─── Selection Context (prevents full re-render on click) ───

interface SelectionState {
  selectedId: string | null
  onSelect: (id: string, sourceNode: any) => void
}

const SelectionCtx = createContext<SelectionState>({
  selectedId: null,
  onSelect: () => {},
})

// ─── Public API ───

export function HTMLRendererComponent({
  trees,
  selectedId,
  onSelectNode,
  originAtZero = false,
}: {
  trees: IRenderNode[]
  selectedId: string | null
  onSelectNode: (id: string, sourceNode: any) => void
  /** When true, ignore sourceNode x/y — render all trees at (0,0). Used for single frame view. */
  originAtZero?: boolean
}) {
  // Stabilize context value — only recreate when selectedId changes
  const onSelectRef = useRef(onSelectNode)
  onSelectRef.current = onSelectNode

  const stableOnSelect = useMemo(() => (id: string, sourceNode: any) => {
    onSelectRef.current(id, sourceNode)
  }, [])

  const ctxValue = useMemo(
    () => ({ selectedId, onSelect: stableOnSelect }),
    [selectedId, stableOnSelect]
  )

  return (
    <SelectionCtx.Provider value={ctxValue}>
      {trees.map((tree) => (
        <div
          key={tree.id}
          style={originAtZero ? emptyStyle : {
            position: 'absolute',
            top: tree.sourceNode.y != null ? `${tree.sourceNode.y}px` : 0,
            left: tree.sourceNode.x != null ? `${tree.sourceNode.x}px` : 0,
          }}
        >
          <RenderNode node={tree} />
        </div>
      ))}
    </SelectionCtx.Provider>
  )
}

const emptyStyle: CSSProperties = {}

// ─── Memoized Node Component ───

const RenderNode = memo(function RenderNode({ node }: { node: IRenderNode }) {
  const { selectedId, onSelect } = useContext(SelectionCtx)
  const isSelected = selectedId === node.id

  const style = useMemo(() => {
    const s = buildCSS(node)
    if (isSelected) {
      return { ...s, outline: '2px solid #7C3AED', outlineOffset: '1px' }
    }
    return s
  }, [node, isSelected])

  const handleClick = useMemo(() => (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect(node.id, node.sourceNode)
  }, [node.id, node.sourceNode, onSelect])

  return (
    <div
      data-pen-id={node.id}
      data-pen-type={node.type}
      style={style}
      onClick={handleClick}
    >
      {node.textContent || null}

      {node.iconName && (
        <IconMask
          name={node.iconName}
          family={node.iconFamily ?? 'lucide'}
          color={node.iconColor ?? 'currentColor'}
          size={node.iconSize ?? 16}
        />
      )}

      {node.children?.map((child) => {
        if (child.position === 'absolute') {
          return (
            <AbsoluteWrapper key={child.id} node={child} />
          )
        }
        return <RenderNode key={child.id} node={child} />
      })}
    </div>
  )
})

// Memoized wrapper for absolute-positioned children
const AbsoluteWrapper = memo(function AbsoluteWrapper({ node }: { node: IRenderNode }) {
  const style = useMemo<CSSProperties>(() => ({
    position: 'absolute',
    top: node.y != null ? `${node.y}px` : undefined,
    left: node.x != null ? `${node.x}px` : undefined,
    zIndex: node.zIndex,
  }), [node.x, node.y, node.zIndex])

  return (
    <div style={style}>
      <RenderNode node={node} />
    </div>
  )
})

// ─── CSS Builder (pure function) ───

function buildCSS(node: IRenderNode): CSSProperties {
  const s: CSSProperties = { boxSizing: 'border-box' }

  // Layout
  if (node.layout !== 'none' && node.children?.length) {
    s.display = 'flex'
    s.position = 'relative'
    s.flexDirection = node.layout === 'vertical' ? 'column' : 'row'
    if (node.gap) s.gap = `${node.gap}px`
    if (node.justifyContent) s.justifyContent = node.justifyContent
    if (node.alignItems) s.alignItems = node.alignItems
  } else if (node.children?.length) {
    s.position = 'relative'
  }

  // Size
  if (typeof node.width === 'number') s.width = `${node.width}px`
  else if (typeof node.width === 'string') s.width = node.width
  if (typeof node.height === 'number') s.height = `${node.height}px`
  else if (typeof node.height === 'string') s.height = node.height
  if (node.flex) s.flex = node.flex
  if (node.minWidth !== undefined) s.minWidth = node.minWidth
  if (node.minHeight !== undefined) s.minHeight = node.minHeight
  if (node.alignSelf) s.alignSelf = node.alignSelf as CSSProperties['alignSelf']
  if (node.flexShrink !== undefined) s.flexShrink = node.flexShrink

  // Padding
  if (node.padding) {
    const [t, r, b, l] = node.padding
    if (t || r || b || l) s.padding = `${t}px ${r}px ${b}px ${l}px`
  }

  // Overflow
  if (node.overflow) s.overflow = node.overflow

  // Background
  if (node.backgroundColor) s.backgroundColor = node.backgroundColor
  if (node.background) s.background = node.background
  if (node.backgroundImage) s.backgroundImage = node.backgroundImage
  if (node.backgroundSize) s.backgroundSize = node.backgroundSize
  if (node.backgroundPosition) s.backgroundPosition = node.backgroundPosition
  if (node.backgroundRepeat) s.backgroundRepeat = node.backgroundRepeat

  // Border
  if (node.borderRadius) s.borderRadius = node.borderRadius
  if (node.isEllipse) s.borderRadius = '50%'
  if (node.border) s.border = node.border
  if (node.borderTop) s.borderTop = node.borderTop
  if (node.borderRight) s.borderRight = node.borderRight
  if (node.borderBottom) s.borderBottom = node.borderBottom
  if (node.borderLeft) s.borderLeft = node.borderLeft
  if (node.boxShadow) s.boxShadow = node.boxShadow
  if (node.outline) s.outline = node.outline

  // Opacity & filters
  if (node.opacity !== undefined) s.opacity = node.opacity
  if (node.filter) s.filter = node.filter
  if (node.backdropFilter) s.backdropFilter = node.backdropFilter

  // Text
  if (node.color) s.color = node.color
  if (node.fontFamily) s.fontFamily = node.fontFamily
  if (node.fontSize) s.fontSize = `${node.fontSize}px`
  if (node.fontWeight) s.fontWeight = node.fontWeight as CSSProperties['fontWeight']
  if (node.fontStyle) s.fontStyle = node.fontStyle as CSSProperties['fontStyle']
  if (node.lineHeight !== undefined) s.lineHeight = String(node.lineHeight)
  if (node.textAlign) s.textAlign = node.textAlign as CSSProperties['textAlign']
  if (node.letterSpacing !== undefined) s.letterSpacing = `${node.letterSpacing}px`
  if (node.whiteSpace) s.whiteSpace = node.whiteSpace as CSSProperties['whiteSpace']
  if (node.wordWrap) s.wordWrap = node.wordWrap as CSSProperties['wordWrap']
  if (node.overflowWrap) s.overflowWrap = node.overflowWrap as CSSProperties['overflowWrap']
  if (node.textDecoration) s.textDecoration = node.textDecoration

  // Icon
  if (node.iconName) {
    s.display = 'inline-flex'
    s.alignItems = 'center'
    s.justifyContent = 'center'
    s.flexShrink = 0
  }

  return s
}

// ─── Icon Mask ───

const IconMask = memo(function IconMask({ name, family, color, size }: {
  name: string; family: string; color: string; size: number
}) {
  const iconUrl = `/api/icons/${encodeURIComponent(family)}/${encodeURIComponent(name)}.svg`

  const style = useMemo<CSSProperties>(() => ({
    width: `${size}px`,
    height: `${size}px`,
    backgroundColor: color,
    WebkitMaskImage: `url("${iconUrl}")`,
    WebkitMaskSize: 'contain',
    WebkitMaskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
    maskImage: `url("${iconUrl}")`,
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    maskPosition: 'center',
  }), [size, color, iconUrl])

  return <div style={style} />
})

// ─── Legacy class interface (for IRenderer compatibility) ───

export class HTMLRenderer implements IRenderer {
  render(node: IRenderNode): React.ReactElement {
    return <RenderNode node={node} />
  }
}
