'use client'

import React, { memo } from 'react'
import type { PenChild } from './types'

// ---- Frame picker sidebar ----
interface FramePickerProps {
  frames: PenChild[]
  selectedFrameId?: string | null
  onSelect: (id: string) => void
  onNavigate?: (id: string) => void
  /** Auto-expand tree path to this node id */
  autoExpandTo?: string | null
}

/** Find path of ancestor ids from root to target node */
function findAncestorPath(nodes: PenChild[], targetId: string, path: string[] = []): string[] | null {
  for (const node of nodes) {
    if (node.id === targetId) return path
    const n = node as any
    if (n.children?.length) {
      const found = findAncestorPath(n.children, targetId, [...path, node.id])
      if (found) return found
    }
  }
  return null
}

/** Recursively collect all node ids + names for search filtering */
function collectAllNodes(nodes: PenChild[]): Array<{ id: string; name: string }> {
  const result: Array<{ id: string; name: string }> = []
  function walk(list: PenChild[]) {
    for (const n of list) {
      result.push({ id: n.id, name: (n as any).name ?? n.id })
      if ('children' in n && Array.isArray((n as any).children)) walk((n as any).children)
    }
  }
  walk(nodes)
  return result
}

/**
 * FramePicker — hierarchical tree matching design's Layers Panel.
 *
 * Design specs per layer item:
 *   padding=[6, 8, 6, indent], gap=6, alignItems=center
 *   Indentation: depth 0→8, 1→20, 2→32, 3→50, 4→62, 5→74
 *   Chevron: chevron-down (expanded) / chevron-right (collapsed), 12x12
 *   Type icon: file/square/type/star, 14x14, color=foreground-muted
 *   Selected: bg=primary-light, icon+text=primary, fontWeight=500
 *   Normal: text=foreground (containers 500) or foreground-secondary (leaves normal)
 */
export const FramePicker = memo(function FramePicker({ frames, selectedFrameId, onSelect, onNavigate, autoExpandTo }: FramePickerProps) {
  const [expanded, setExpanded] = React.useState<Set<string>>(() => {
    const s = new Set<string>()
    if (frames[0]) s.add(frames[0].id)
    return s
  })
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  const listRef = React.useRef<HTMLDivElement>(null)

  // All nodes flat list for search
  const allNodes = React.useMemo(() => collectAllNodes(frames), [frames])
  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    return allNodes.filter(n => n.name.toLowerCase().includes(q))
  }, [searchQuery, allNodes])

  // Auto-expand tree to reveal a node, then scroll to center after DOM updates
  React.useEffect(() => {
    if (!autoExpandTo) return

    // Step 1: expand ancestors
    const path = findAncestorPath(frames, autoExpandTo)
    if (path && path.length > 0) {
      setExpanded(prev => {
        const next = new Set(prev)
        for (const id of path) next.add(id)
        return next
      })
    }

    // Step 2: wait for React to re-render expanded tree, then scroll
    // Double rAF ensures DOM has fully laid out after state update
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!listRef.current) return
        const el = listRef.current.querySelector(`[data-layer-id="${autoExpandTo}"]`) as HTMLElement | null
        if (!el) return
        const listRect = listRef.current.getBoundingClientRect()
        const elRect = el.getBoundingClientRect()
        const elTopInList = elRect.top - listRect.top + listRef.current.scrollTop
        const targetScroll = elTopInList - listRef.current.clientHeight / 2 + elRect.height / 2
        const currentScroll = listRef.current.scrollTop
        if (Math.abs(targetScroll - currentScroll) > 80) {
          listRef.current.scrollTo({ top: targetScroll, behavior: 'smooth' })
        }
      })
    })
  }, [autoExpandTo, frames])

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSelect(id: string) {
    onSelect(id)
  }

  return (
    <div style={fpStyles.container}>
      {/* Header: title + search — both always rendered, animated crossfade */}
      <div style={{ ...fpStyles.header, position: 'relative', overflow: 'hidden', height: 44 }}>
        {/* Title row — fades out when search opens */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: 'inherit',
          opacity: searchOpen ? 0 : 1,
          transform: searchOpen ? 'translateY(-8px)' : 'translateY(0)',
          transition: 'opacity 0.2s, transform 0.2s',
          pointerEvents: searchOpen ? 'none' : 'auto',
        }}>
          <span style={fpStyles.headerTitle}>Layers</span>
          <button
            onClick={() => { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 50) }}
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, color: 'var(--color-foreground-muted)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
          </button>
        </div>

        {/* Search row — fades in when search opens */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: 'inherit',
          opacity: searchOpen ? 1 : 0,
          transform: searchOpen ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.2s, transform 0.2s',
          pointerEvents: searchOpen ? 'auto' : 'none',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-foreground-muted)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery('') } }}
            placeholder="Search layers..."
            tabIndex={searchOpen ? 0 : -1}
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'var(--color-foreground)',
            }}
          />
          <button
            onClick={() => { setSearchOpen(false); setSearchQuery('') }}
            tabIndex={searchOpen ? 0 : -1}
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, color: 'var(--color-foreground-muted)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
      </div>

      {/* Search results or tree */}
      {searchOpen && searchQuery.trim() ? (
        <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
          {searchResults.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'var(--color-foreground-muted)' }}>
              No results for &quot;{searchQuery}&quot;
            </div>
          ) : (
            searchResults.map(r => (
              <button
                key={r.id}
                onClick={() => { onSelect(r.id); setSearchOpen(false); setSearchQuery('') }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                  padding: '6px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
                  fontFamily: 'Inter, sans-serif', fontSize: 13,
                  backgroundColor: r.id === selectedFrameId ? 'var(--color-primary-light)' : 'transparent',
                  color: r.id === selectedFrameId ? 'var(--color-primary)' : 'var(--color-foreground)',
                }}
              >
                {r.name}
              </button>
            ))
          )}
        </div>
      ) : (
      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {frames.map((frame) => (
          <LayerNode
            key={frame.id}
            node={frame}
            depth={0}
            selectedId={selectedFrameId}
            expanded={expanded}
            onToggle={toggle}
            onSelect={handleSelect}
            onNavigate={onNavigate}
          />
        ))}
      </div>
      )}
    </div>
  )
})

/**
 * Lucide-style SVG icons for layer tree — consistent 14x14 set.
 * Frame/group: no icon (just chevron + name).
 * Leaf nodes: type-specific icon.
 */
function LayerIcon({ type, color }: { type: string; color: string }) {
  const s = { width: 14, height: 14, flexShrink: 0, color } as const
  const props = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, style: s }

  switch (type) {
    case 'text':
      return <svg {...props}><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>
    case 'icon_font':
      return <svg {...props}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
    case 'rectangle':
      return <svg {...props}><rect width="18" height="18" x="3" y="3" rx="2"/></svg>
    case 'ellipse':
      return <svg {...props}><circle cx="12" cy="12" r="10"/></svg>
    case 'line':
      return <svg {...props}><path d="M5 12h14"/></svg>
    case 'polygon':
      return <svg {...props}><path d="M12 2l9 7-3.5 10h-11L3 9z"/></svg>
    case 'path':
      return <svg {...props}><path d="M3 17c3-4.5 5-8 9-5s6 .5 9-5"/></svg>
    case 'ref':
      return <svg {...props}><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="M3 9h18"/></svg>
    case 'image':
      return <svg {...props}><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>
    default:
      // note, prompt, context, unknown — generic square
      return <svg {...props}><rect width="18" height="18" x="3" y="3" rx="2"/></svg>
  }
}

function LayerNode({ node, depth, selectedId, expanded, onToggle, onSelect, onNavigate }: {
  node: PenChild
  depth: number
  selectedId: string | null | undefined
  expanded: Set<string>
  onToggle: (id: string) => void
  onSelect: (id: string) => void
  onNavigate?: (id: string) => void
}) {
  const n = node as any
  const hasChildren = n.children?.length > 0
  const isExpanded = expanded.has(n.id)
  const isSelected = selectedId === n.id
  const isFrame = n.type === 'frame' || n.type === 'group'
  const isTopFrame = isFrame && depth === 0

  const indentPx = 8 + depth * 14
  const iconColor = isSelected ? 'var(--color-primary)' : 'var(--color-foreground-muted)'

  return (
    <>
      <div
        data-layer-id={n.id}
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          backgroundColor: isSelected ? 'var(--color-primary-light)' : 'transparent',
        }}
      >
        {/* Main clickable row */}
        <button
          onClick={() => {
            onSelect(n.id)
            if (hasChildren && !isExpanded) onToggle(n.id)
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flex: 1,
            minWidth: 0,
            padding: `6px 8px 6px ${indentPx}px`,
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
            fontSize: 13,
            textAlign: 'left',
            backgroundColor: 'transparent',
            color: isSelected ? 'var(--color-primary)' : isFrame ? 'var(--color-foreground)' : 'var(--color-foreground-secondary)',
            fontWeight: isSelected || isFrame ? 500 : 'normal',
          }}
        >
          {/* Chevron */}
          {hasChildren ? (
            <span
              onClick={(e) => { e.stopPropagation(); onToggle(n.id) }}
              style={{ flexShrink: 0, width: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: iconColor, transform: isExpanded ? 'rotate(90deg)' : undefined, transition: 'transform 0.15s' }}>
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </span>
          ) : (
            <span style={{ width: 12, flexShrink: 0 }} />
          )}

          {/* Type icon — frames/groups: no icon */}
          {!isFrame && <LayerIcon type={n.type} color={iconColor} />}

          {/* Name */}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {n.name ?? n.id}
          </span>
        </button>

        {/* Expand button — only for selected top-level frames */}
        {isTopFrame && isSelected && onNavigate && (
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate(n.id) }}
            title="View frame detail"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 24, height: 24, flexShrink: 0, marginRight: 4,
              border: 'none', background: 'none', cursor: 'pointer',
              color: 'var(--color-primary)', borderRadius: 'var(--radius-sm)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/>
            </svg>
          </button>
        )}
      </div>

      {hasChildren && isExpanded && n.children.filter((c: any) => c.enabled !== false).map((child: PenChild) => (
        <LayerNode
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedId={selectedId}
          expanded={expanded}
          onToggle={onToggle}
          onSelect={onSelect}
          onNavigate={onNavigate}
        />
      ))}
    </>
  )
}

/**
 * FramePicker (Layers Panel) styles — engine-accurate:
 * w=240, bg=surface, stroke inside right → inset shadow
 * Header: "Layers" + search icon, justify=space-between, padding=[12,16], stroke inside bottom
 */
const fpStyles = {
  container: {
    width: 240,
    boxShadow: 'inset -1px 0 0 0 var(--color-border)',
    flexShrink: 0,
    backgroundColor: 'var(--color-surface)',
    fontFamily: 'Inter, sans-serif',
    display: 'flex' as const,
    flexDirection: 'column' as const,
    overflow: 'hidden' as const,
  },
  header: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: '12px 16px',
    boxShadow: 'inset 0 -1px 0 0 var(--color-border)',
    flexShrink: 0,
  },
  headerTitle: {
    fontFamily: 'Space Grotesk, sans-serif',
    fontWeight: 600,
    fontSize: 14,
    color: 'var(--color-foreground)',
  },
  headerIcon: {
    fontSize: 14,
    color: 'var(--color-foreground-muted)',
    cursor: 'pointer' as const,
  },
} as const
