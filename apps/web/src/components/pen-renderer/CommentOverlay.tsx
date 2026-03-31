'use client'

import React, { useState, useRef, useEffect } from 'react'

// ---- Types ----

export interface CommentPin {
  id: string
  /** Node ID this comment is anchored to — position resolved from DOM */
  nodeId: string | null
  /** Fallback: ratio-based position within frame (used when nodeId not found in DOM) */
  fallbackDocX?: number
  fallbackDocY?: number
  anchorStatus: 'active' | 'moved' | 'orphaned' | 'fuzzy_matched'
  resolved: boolean
  authorName?: string
  body: string
}

// ---- Comment Pin Marker (rendered in document space) ----

const ANCHOR_PIN_BG: Record<string, string> = {
  active: 'var(--color-primary)',
  moved: 'var(--color-warning)',
  fuzzy_matched: 'var(--color-info)',
  orphaned: 'var(--color-foreground-muted)',
}

export function CommentPinMarker({ pin, index, contentRef, onClick }: {
  pin: CommentPin; index: number;
  contentRef: React.RefObject<HTMLDivElement | null>;
  onClick: () => void
}) {
  const bg = ANCHOR_PIN_BG[pin.anchorStatus] ?? ANCHOR_PIN_BG.active

  // Resolve position from DOM via nodeId, fallback to ratio-based position
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!contentRef.current) return
    if (pin.nodeId) {
      const el = contentRef.current.querySelector(`[data-pen-id="${pin.nodeId}"]`) as HTMLElement | null
      if (el) {
        const contentRect = contentRef.current.getBoundingClientRect()
        const elRect = el.getBoundingClientRect()
        const scale = contentRef.current.style.transform
          ? parseFloat(contentRef.current.style.transform.match(/scale\(([^)]+)\)/)?.[1] ?? '1')
          : 1
        // Position at top-left corner of the node
        setPos({
          x: (elRect.left - contentRect.left) / scale,
          y: (elRect.top - contentRect.top) / scale,
        })
        return
      }
    }
    // Fallback to stored ratio-based position
    if (pin.fallbackDocX != null && pin.fallbackDocY != null) {
      setPos({ x: pin.fallbackDocX, y: pin.fallbackDocY })
    }
  }, [pin.nodeId, pin.fallbackDocX, pin.fallbackDocY, contentRef])

  if (!pos) return null

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      onMouseDown={(e) => e.stopPropagation()}
      title={pin.body}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        transform: 'translate(-50%, -50%)',
        zIndex: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28,
        borderRadius: 9999,
        backgroundColor: bg,
        border: 'none',
        boxShadow: '0 2px 8px rgba(124, 58, 237, 0.1)',
        cursor: 'pointer',
        padding: 0,
        opacity: pin.resolved ? 0.5 : 1,
        fontFamily: 'Inter, sans-serif',
        fontSize: 12,
        fontWeight: 700,
        color: '#FFFFFF',
      }}
    >
      {index + 1}
    </button>
  )
}

// ---- Add Comment Trigger (rendered in document space near selected node) ----

export function AddCommentTrigger({ contentRef, selectedId, onOpen }: {
  contentRef: React.RefObject<HTMLDivElement | null>
  selectedId: string
  onOpen: (nodeId: string, docX: number, docY: number) => void
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!contentRef.current) return
    // Delay to ensure DOM is painted after selection change
    const raf = requestAnimationFrame(() => {
      if (!contentRef.current) return
      const el = contentRef.current.querySelector(`[data-pen-id="${selectedId}"]`) as HTMLElement | null
      if (!el) { setPos(null); return }
      const contentRect = contentRef.current.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      const scale = contentRef.current.style.transform
        ? parseFloat(contentRef.current.style.transform.match(/scale\(([^)]+)\)/)?.[1] ?? '1')
        : 1
      setPos({
        x: (elRect.right - contentRect.left) / scale + 8,
        y: (elRect.top - contentRect.top) / scale,
      })
    })
    return () => cancelAnimationFrame(raf)
  }, [selectedId, contentRef])

  if (!pos) return null

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onOpen(selectedId, pos.x, pos.y) }}
      title="Add comment"
      style={{
        position: 'absolute', left: pos.x, top: pos.y, zIndex: 8,
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)',
        border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500,
        boxShadow: '0 2px 8px var(--color-shadow)',
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>
      </svg>
      Comment
    </button>
  )
}

// ---- Comment Popup (design-accurate) ----

export function CommentPopup({ x, y, userName, onSubmit, onCancel }: {
  x: number; y: number; userName: string
  onSubmit: (body: string) => void; onCancel: () => void
}) {
  const [body, setBody] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50) }, [])

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: 'absolute', left: x, top: y, zIndex: 20, width: 320,
        padding: 16, borderRadius: 'var(--radius-lg)', gap: 12,
        display: 'flex', flexDirection: 'column',
        backgroundColor: 'var(--color-card)',
        boxShadow: 'inset 0 0 0 1px var(--color-border), 0 8px 16px var(--color-shadow)',
        fontFamily: 'Inter, sans-serif',
      }}>
      {/* Header: avatar + name + time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9999, backgroundColor: 'var(--color-primary)', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-foreground)' }}>{userName}</div>
          <div style={{ fontSize: 11, color: 'var(--color-foreground-muted)' }}>Just now</div>
        </div>
      </div>

      {/* Input area */}
      <textarea
        ref={inputRef}
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="Add a comment..."
        onKeyDown={e => { if (e.key === 'Escape') onCancel() }}
        style={{
          width: '100%', height: 72, resize: 'none', border: 'none', outline: 'none',
          padding: '10px 12px', borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--color-background)',
          boxShadow: 'inset 0 0 0 1px var(--color-border)',
          fontSize: 13, lineHeight: 1.4, color: 'var(--color-foreground)',
        }}
      />

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-foreground-muted)', cursor: 'pointer' }}>
          <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
        </svg>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-foreground-muted)', cursor: 'pointer' }}>
          <circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/>
        </svg>
        <div style={{ flex: 1 }} />
        <button onClick={onCancel} style={{
          padding: '8px 16px', borderRadius: 'var(--radius-md)',
          boxShadow: 'inset 0 0 0 1px var(--color-border)',
          border: 'none', background: 'none', cursor: 'pointer',
          fontSize: 13, fontWeight: 500, color: 'var(--color-foreground-secondary)',
        }}>Cancel</button>
        <button onClick={() => { if (body.trim()) onSubmit(body.trim()) }} style={{
          padding: '8px 16px', borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--color-primary)', border: 'none', cursor: 'pointer',
          fontSize: 13, fontWeight: 600, color: 'var(--color-primary-foreground)',
        }}>Comment</button>
      </div>
    </div>
  )
}
