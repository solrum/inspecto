'use client'

import React, { useRef, useState, useEffect, useCallback, useMemo, memo, type MouseEvent as ReactMouseEvent } from 'react'
import type { PenDocument, PenChild, PenTheme } from './types'
import { VarResolver } from './resolver'
import { PenDocumentRenderer } from './renderer'
import { ZoomControl } from './ZoomControl'

// ---- Types ----
interface Transform {
  x: number
  y: number
  scale: number
}

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

interface CanvasViewProps {
  document: PenDocument
  activeTheme?: PenTheme
  onSelectNode?: (id: string, node: PenChild) => void
  selectedId?: string | null
  initialFrame?: string
  /** Canvas background color (user-selectable) */
  canvasBg?: string
  onCanvasBgChange?: (color: string) => void
  /** Focus on a specific node id (set from layers panel) */
  focusNodeId?: string
  /** Restore saved transform on mount */
  savedTransform?: { x: number; y: number; scale: number } | null
  /** Called when transform changes (for persisting) */
  onTransformChange?: (t: { x: number; y: number; scale: number }) => void
  /** Show refocus button */
  showRefocus?: boolean
  /** Called when refocus button clicked */
  onRefocus?: () => void
  /** Called when user manually pans/zooms */
  onUserTransform?: () => void
  /** Frame navigation (single-frame mode) — prev/next callbacks */
  onPrevFrame?: (() => void) | null
  onNextFrame?: (() => void) | null
  /** Add comment on selected node. pinXRatio/pinYRatio are DOM-computed relative to frame. */
  onAddComment?: (nodeId: string, body: string, pinXRatio: number, pinYRatio: number) => void
  /** Current user name for comment popup */
  userName?: string
  /** Comment pins to render in document space */
  commentPins?: CommentPin[]
  /** Called when a pin is clicked */
  onClickPin?: (commentId: string) => void
}

const MIN_SCALE = 0.05
const MAX_SCALE = 4

const DEFAULT_CANVAS_BG = '#EDEDF0'

export function CanvasView({
  document: doc,
  activeTheme = {},
  onSelectNode,
  selectedId,
  initialFrame,
  canvasBg,
  onCanvasBgChange,
  focusNodeId,
  savedTransform,
  onTransformChange,
  showRefocus,
  onRefocus,
  onUserTransform,
  onPrevFrame,
  onNextFrame,
  onAddComment,
  userName,
  commentPins,
  onClickPin,
}: CanvasViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const transformRef = useRef<Transform>(savedTransform ?? { x: 40, y: 40, scale: 0.5 })
  const isPanning = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const [zoomDisplay, setZoomDisplay] = useState(savedTransform ? Math.round(savedTransform.scale * 100) : 50)

  // Comment popup state
  const [commentPopup, setCommentPopup] = useState<{ nodeId: string; x: number; y: number } | null>(null)

  // Close comment popup when selected node changes or deselects
  useEffect(() => {
    setCommentPopup(null)
  }, [selectedId])

  const onUserTransformRef = useRef(onUserTransform)
  onUserTransformRef.current = onUserTransform

  const resolver = useMemo(
    () => new VarResolver(doc.variables, activeTheme),
    [doc.variables, activeTheme]
  )

  // Persist transform — debounced to avoid store thrashing
  const onTransformChangeRef = useRef(onTransformChange)
  onTransformChangeRef.current = onTransformChange
  const persistRAF = useRef<number>(0)
  const persistTransform = useCallback(() => {
    cancelAnimationFrame(persistRAF.current)
    persistRAF.current = requestAnimationFrame(() => {
      onTransformChangeRef.current?.({ ...transformRef.current })
    })
  }, [])

  // Apply transform directly to DOM — no React re-render
  const applyTransform = useCallback(() => {
    const t = transformRef.current
    if (contentRef.current) {
      contentRef.current.style.transform = `translate(${t.x}px, ${t.y}px) scale(${t.scale})`
    }
    if (canvasRef.current) {
      const size = 20 * t.scale
      canvasRef.current.style.backgroundSize = `${size}px ${size}px`
      canvasRef.current.style.backgroundPosition = `${t.x}px ${t.y}px`
    }
    persistTransform()
  }, [persistTransform])

  // Debounced zoom display update (only for toolbar %)
  const zoomRAF = useRef<number>(0)
  const scheduleZoomDisplay = useCallback(() => {
    cancelAnimationFrame(zoomRAF.current)
    zoomRAF.current = requestAnimationFrame(() => {
      setZoomDisplay(Math.round(transformRef.current.scale * 100))
    })
  }, [])

  // Focus on a specific frame — center it in viewport
  const focusFrame = useCallback(
    (frameId: string, animate = false) => {
      const frame = doc.children.find((f) => f.id === frameId)
      if (!frame || !containerRef.current) return
      const container = containerRef.current
      const cw = container.clientWidth
      const ch = container.clientHeight
      const fx = frame.x ?? 0
      const fy = frame.y ?? 0
      const fw = typeof frame.width === 'number' ? frame.width : 400
      const fh = typeof frame.height === 'number' ? frame.height : 800

      const scale = Math.min((cw - 60) / fw, (ch - 60) / fh, 1)
      transformRef.current = {
        x: cw / 2 - (fx + fw / 2) * scale,
        y: ch / 2 - (fy + fh / 2) * scale,
        scale,
      }

      // Smooth transition for user-initiated focus
      if (animate && contentRef.current) {
        contentRef.current.style.transition = 'transform 0.3s ease-out'
        requestAnimationFrame(() => {
          applyTransform()
          scheduleZoomDisplay()
          // Remove transition after animation
          setTimeout(() => {
            if (contentRef.current) contentRef.current.style.transition = ''
          }, 320)
        })
      } else {
        applyTransform()
        scheduleZoomDisplay()
      }
    },
    [doc.children, applyTransform, scheduleZoomDisplay]
  )

  // Mount: restore saved transform instantly, OR focus first frame
  const didMount = useRef(false)
  useEffect(() => {
    if (didMount.current) return
    didMount.current = true
    if (savedTransform) {
      // Restore instantly — no focus, no animation
      applyTransform()
    } else if (initialFrame) {
      const frameId = initialFrame.split('__')[0]
      focusFrame(frameId, false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Subsequent initialFrame changes (user clicks frame in layers) — animate
  const prevInitialFrame = useRef(initialFrame)
  useEffect(() => {
    if (prevInitialFrame.current === initialFrame) return
    prevInitialFrame.current = initialFrame
    if (!initialFrame) return
    const frameId = initialFrame.split('__')[0]
    focusFrame(frameId, true)
  }, [initialFrame, focusFrame])

  // Focus on any node by id — find its rendered DOM element and pan to it
  const focusNodeById = useCallback((nodeId: string) => {
    if (!containerRef.current || !contentRef.current) return
    const el = contentRef.current.querySelector(`[data-pen-id="${nodeId}"]`) as HTMLElement | null
    if (!el) return

    const container = containerRef.current
    const cw = container.clientWidth
    const ch = container.clientHeight
    const scale = transformRef.current.scale

    // Get node position relative to content (unscaled)
    const contentRect = contentRef.current.getBoundingClientRect()
    const nodeRect = el.getBoundingClientRect()
    const nodeX = (nodeRect.left - contentRect.left) / scale
    const nodeY = (nodeRect.top - contentRect.top) / scale
    const nodeW = nodeRect.width / scale
    const nodeH = nodeRect.height / scale

    // Pan so node is centered in viewport
    transformRef.current = {
      ...transformRef.current,
      x: cw / 2 - (nodeX + nodeW / 2) * scale,
      y: ch / 2 - (nodeY + nodeH / 2) * scale,
    }
    applyTransform()
  }, [applyTransform])

  useEffect(() => {
    if (!focusNodeId) return
    // Small delay to ensure DOM has rendered
    requestAnimationFrame(() => focusNodeById(focusNodeId.split('__')[0]))
  }, [focusNodeId, focusNodeById])

  // Wheel: normal scroll = pan, Ctrl/Cmd+scroll = zoom
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const prev = transformRef.current

      if (e.ctrlKey || e.metaKey) {
        const delta = -e.deltaY * 0.003
        const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * (1 + delta)))
        const rect = el.getBoundingClientRect()
        const cx = e.clientX - rect.left
        const cy = e.clientY - rect.top
        const factor = nextScale / prev.scale
        transformRef.current = {
          x: cx - (cx - prev.x) * factor,
          y: cy - (cy - prev.y) * factor,
          scale: nextScale,
        }
        scheduleZoomDisplay()
      } else {
        transformRef.current = {
          ...prev,
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }
      }
      applyTransform()
      onUserTransformRef.current?.()
      setCommentPopup(null)
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [applyTransform, scheduleZoomDisplay])

  // Mouse pan (middle-click or Alt+drag)
  const handleMouseDown = useCallback((e: ReactMouseEvent) => {
    // Close comment popup on any canvas click
    setCommentPopup(null)

    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      isPanning.current = true
      lastMouse.current = { x: e.clientX, y: e.clientY }
      e.preventDefault()
    }
  }, [])

  const handleMouseMove = useCallback((e: ReactMouseEvent) => {
    if (!isPanning.current) return
    const dx = e.clientX - lastMouse.current.x
    const dy = e.clientY - lastMouse.current.y
    lastMouse.current = { x: e.clientX, y: e.clientY }
    const prev = transformRef.current
    transformRef.current = { ...prev, x: prev.x + dx, y: prev.y + dy }
    applyTransform()
    onUserTransformRef.current?.()
  }, [applyTransform])

  const handleMouseUp = useCallback(() => {
    isPanning.current = false
  }, [])

  const setScale = useCallback((scale: number) => {
    if (!containerRef.current) return
    const cw = containerRef.current.clientWidth
    const ch = containerRef.current.clientHeight
    const prev = transformRef.current
    const factor = scale / prev.scale
    const cx = cw / 2
    const cy = ch / 2
    transformRef.current = {
      x: cx - (cx - prev.x) * factor,
      y: cy - (cy - prev.y) * factor,
      scale,
    }
    applyTransform()
    scheduleZoomDisplay()
  }, [applyTransform, scheduleZoomDisplay])

  const fitAll = useCallback(() => {
    if (!containerRef.current || doc.children.length === 0) return
    const frames = doc.children
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const f of frames) {
      const fx = f.x ?? 0
      const fy = f.y ?? 0
      const fw = typeof f.width === 'number' ? f.width : 400
      const fh = typeof f.height === 'number' ? f.height : 600
      minX = Math.min(minX, fx)
      minY = Math.min(minY, fy)
      maxX = Math.max(maxX, fx + fw)
      maxY = Math.max(maxY, fy + fh)
    }
    const cw = containerRef.current.clientWidth
    const ch = containerRef.current.clientHeight
    const totalW = maxX - minX
    const totalH = maxY - minY
    const scale = Math.min(cw / (totalW + 80), ch / (totalH + 80), 1)
    transformRef.current = {
      x: (cw - totalW * scale) / 2 - minX * scale,
      y: (ch - totalH * scale) / 2 - minY * scale,
      scale,
    }
    applyTransform()
    scheduleZoomDisplay()
  }, [doc.children, applyTransform, scheduleZoomDisplay])

  // Memoized frame labels
  const frameLabels = useMemo(() => doc.children.map((child) => (
    <div
      key={`label-${child.id}`}
      style={{
        position: 'absolute',
        top: `${(child.y ?? 0) - 28}px`,
        left: `${child.x ?? 0}px`,
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--color-foreground-secondary)',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      {child.name ?? child.id}
    </div>
  )), [doc.children])

  return (
    <div style={styles.root}>
      {/* Canvas area — layout=none (absolute children) */}
      <div
        ref={(el) => { containerRef.current = el; canvasRef.current = el }}
        style={{ ...styles.canvas, backgroundColor: canvasBg ?? DEFAULT_CANVAS_BG }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          ref={contentRef}
          style={styles.content}
        >
          {frameLabels}

          <PenDocumentRenderer
            document={doc}
            resolver={resolver}
            selectedId={selectedId}
            onSelectNode={onSelectNode}
            scale={1}
          />

          {/* Comment pins — rendered in document space so they follow pan/zoom */}
          {commentPins?.map((pin, i) => (
            <CommentPinMarker
              key={pin.id}
              pin={pin}
              index={i}
              contentRef={contentRef}
              onClick={() => onClickPin?.(pin.id)}
            />
          ))}

          {/* Add Comment button — rendered in document space near selected node */}
          {selectedId && onAddComment && !commentPopup && (
            <AddCommentTrigger
              contentRef={contentRef}
              selectedId={selectedId}
              onOpen={(nodeId, docX, docY) => setCommentPopup({ nodeId, x: docX, y: docY })}
            />
          )}
        </div>

        {/* Comment popup — screen space, convert from document coords */}
        {commentPopup && onAddComment && (() => {
          const t = transformRef.current
          const screenX = commentPopup.x * t.scale + t.x
          const screenY = commentPopup.y * t.scale + t.y
          return (
            <CommentPopup
              x={screenX}
              y={screenY}
              userName={userName ?? 'You'}
              onSubmit={(body) => {
                // Compute pinXRatio/pinYRatio from DOM
                let pinXRatio = 0.5, pinYRatio = 0.5
                if (contentRef.current) {
                  const nodeEl = contentRef.current.querySelector(`[data-pen-id="${commentPopup.nodeId}"]`) as HTMLElement | null
                  // Find parent frame element (first top-level child of contentRef with data-pen-id)
                  const frameEl = contentRef.current.querySelector(':scope > [data-pen-id] [data-pen-id]')?.closest('[data-pen-id]')?.parentElement?.closest('[data-pen-id]') as HTMLElement | null
                    ?? contentRef.current.querySelector(':scope > div > [data-pen-id]') as HTMLElement | null
                  if (nodeEl && frameEl) {
                    const nodeRect = nodeEl.getBoundingClientRect()
                    const frameRect = frameEl.getBoundingClientRect()
                    const fw = frameRect.width || 1
                    const fh = frameRect.height || 1
                    pinXRatio = Math.max(0, Math.min(1, (nodeRect.left - frameRect.left) / fw))
                    pinYRatio = Math.max(0, Math.min(1, (nodeRect.top - frameRect.top) / fh))
                  }
                }
                onAddComment(commentPopup.nodeId, body, pinXRatio, pinYRatio)
                setCommentPopup(null)
              }}
              onCancel={() => setCommentPopup(null)}
            />
          )
        })()}

        {/* Bottom-right controls: Refocus + Bg picker + Zoom */}
        <div style={styles.zoomWrapper}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Refocus button — appears when user pans away from selected frame */}
            {showRefocus && onRefocus && (
              <button
                onClick={onRefocus}
                title="Re-center on selected frame"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 36, height: 36,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-primary-foreground)',
                  boxShadow: '0 2px 8px 0 var(--color-shadow)',
                  border: 'none', cursor: 'pointer',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
                </svg>
              </button>
            )}
            <CanvasBgPicker value={canvasBg ?? DEFAULT_CANVAS_BG} onChange={onCanvasBgChange} />
            <ZoomControl zoomDisplay={zoomDisplay} setScale={setScale} fitAll={fitAll} dropUp />
          </div>
        {/* Frame navigation hover zones (single-frame mode) */}
        {onPrevFrame && <FrameNavZone side="left" onClick={onPrevFrame} />}
        {onNextFrame && <FrameNavZone side="right" onClick={onNextFrame} />}
        </div>
      </div>
    </div>
  )
}

// ---- Comment Pin Marker (rendered in document space) ----
const ANCHOR_PIN_BG: Record<string, string> = {
  active: 'var(--color-primary)',
  moved: 'var(--color-warning)',
  fuzzy_matched: 'var(--color-info)',
  orphaned: 'var(--color-foreground-muted)',
}

function CommentPinMarker({ pin, index, contentRef, onClick }: {
  pin: CommentPin; index: number;
  contentRef: React.RefObject<HTMLDivElement | null>;
  onClick: () => void
}) {
  const bg = ANCHOR_PIN_BG[pin.anchorStatus] ?? ANCHOR_PIN_BG.active

  // Resolve position from DOM via nodeId, fallback to ratio-based position
  const [pos, setPos] = React.useState<{ x: number; y: number } | null>(null)

  React.useEffect(() => {
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
function AddCommentTrigger({ contentRef, selectedId, onOpen }: {
  contentRef: React.RefObject<HTMLDivElement | null>
  selectedId: string
  onOpen: (nodeId: string, docX: number, docY: number) => void
}) {
  const [pos, setPos] = React.useState<{ x: number; y: number } | null>(null)

  React.useEffect(() => {
    if (!contentRef.current) return
    const el = contentRef.current.querySelector(`[data-pen-id="${selectedId}"]`) as HTMLElement | null
    if (!el) { setPos(null); return }
    // Get position relative to contentRef (document space)
    const contentRect = contentRef.current.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    const scale = contentRef.current.style.transform
      ? parseFloat(contentRef.current.style.transform.match(/scale\(([^)]+)\)/)?.[1] ?? '1')
      : 1
    setPos({
      x: (elRect.right - contentRect.left) / scale + 8,
      y: (elRect.top - contentRect.top) / scale,
    })
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
function CommentPopup({ x, y, userName, onSubmit, onCancel }: {
  x: number; y: number; userName: string
  onSubmit: (body: string) => void; onCancel: () => void
}) {
  const [body, setBody] = React.useState('')
  const inputRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50) }, [])

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

      {/* Input area: h=72, rounded=md, bg=background, stroke inside */}
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

      {/* Actions: icons | spacer | Cancel + Comment */}
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

// ---- Frame Nav Hover Zone ----
function FrameNavZone({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  const [hovered, setHovered] = React.useState(false)
  const isLeft = side === 'left'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        [isLeft ? 'left' : 'right']: 0,
        width: 60,
        cursor: 'pointer',
        zIndex: 5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // Gradient fade from edge
        background: hovered
          ? `linear-gradient(${isLeft ? '90deg' : '270deg'}, rgba(0,0,0,0.04) 0%, transparent 100%)`
          : 'transparent',
        transition: 'background 0.2s',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        borderRadius: 9999,
        backgroundColor: hovered ? 'var(--color-surface-elevated)' : 'transparent',
        boxShadow: hovered ? 'inset 0 0 0 1px var(--color-border), 0 2px 8px var(--color-shadow)' : 'none',
        opacity: hovered ? 1 : 0,
        transition: 'opacity 0.2s, background-color 0.2s, box-shadow 0.2s',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-foreground)' }}>
          {isLeft ? <path d="m15 18-6-6 6-6"/> : <path d="m9 18 6-6-6-6"/>}
        </svg>
      </div>
    </div>
  )
}

// ---- Canvas Background Picker ----
const BG_PRESETS = [
  { color: '#EDEDF0', label: 'Light gray' },
  { color: '#FFFFFF', label: 'White' },
  { color: '#F5F5F5', label: 'Warm gray' },
  { color: '#1E1E1E', label: 'Dark' },
  { color: '#2C2C2C', label: 'Charcoal' },
  { color: '#0D1117', label: 'Midnight' },
]

const CanvasBgPicker = memo(function CanvasBgPicker({
  value,
  onChange,
}: {
  value: string
  onChange?: (color: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: globalThis.MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger — same visual style as ZoomControl */}
      <button
        onClick={() => setOpen(!open)}
        title="Canvas background"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          height: 36,
          padding: '0 8px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--color-surface-elevated)',
          boxShadow: 'inset 0 0 0 1px var(--color-border), 0 2px 8px 0 var(--color-shadow)',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <div style={{
          width: 18,
          height: 18,
          borderRadius: 'var(--radius-sm)',
          backgroundColor: value,
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.15)',
          flexShrink: 0,
        }} />
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 500, color: 'var(--color-foreground-secondary)' }}>BG</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          right: 0,
          marginBottom: 4,
          padding: 8,
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--color-surface-elevated)',
          boxShadow: 'inset 0 0 0 1px var(--color-border), 0 4px 12px var(--color-shadow)',
          zIndex: 100,
          width: 200,
        }}>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: 'var(--color-foreground-muted)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>
            Canvas Background
          </p>

          {/* Presets */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {BG_PRESETS.map((p) => (
              <button
                key={p.color}
                onClick={() => { onChange?.(p.color); setOpen(false) }}
                title={p.label}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: p.color,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: value === p.color
                    ? `inset 0 0 0 2px var(--color-primary), 0 0 0 1px rgba(0,0,0,0.1)`
                    : 'inset 0 0 0 1px rgba(0,0,0,0.12)',
                }}
              />
            ))}
          </div>

          {/* Custom color input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="color"
              value={value}
              onChange={(e) => onChange?.(e.target.value)}
              style={{ width: 28, height: 28, border: 'none', padding: 0, cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}
            />
            <input
              type="text"
              value={value}
              onChange={(e) => {
                const v = e.target.value
                if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) onChange?.(v)
              }}
              style={{
                flex: 1,
                height: 28,
                border: 'none',
                outline: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '0 8px',
                fontFamily: 'Inter, sans-serif',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--color-foreground)',
                backgroundColor: 'var(--color-background)',
                boxShadow: 'inset 0 0 0 1px var(--color-border)',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
})

// ---- Static styles (using CSS vars for theme support) ----
const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
  },
  canvas: {
    flex: 1,
    overflow: 'hidden' as const,
    backgroundColor: '#EDEDF0',
    backgroundImage: 'radial-gradient(circle, #D8D8DC 1px, transparent 1px)',
    backgroundSize: '20px 20px',
    backgroundPosition: '40px 40px',
    position: 'relative' as const,
  },
  content: {
    position: 'absolute' as const,
    transformOrigin: '0 0',
    transform: 'translate(40px, 40px) scale(0.5)',
    willChange: 'transform',
  },
  // Zoom controls — absolute bottom-right of canvas
  zoomWrapper: {
    position: 'absolute' as const,
    bottom: 16,
    right: 16,
    zIndex: 10,
  },
} as const

// ---- Frame picker sidebar ----
interface FramePickerProps {
  frames: PenChild[]
  selectedFrameId?: string | null
  onSelect: (id: string) => void
  onNavigate?: (id: string) => void
  /** Auto-expand tree path to this node id */
  autoExpandTo?: string | null
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
        const listH = listRef.current.clientHeight
        const elTop = el.offsetTop - listRef.current.offsetTop
        const elH = el.offsetHeight
        const targetScroll = elTop - listH / 2 + elH / 2
        const currentScroll = listRef.current.scrollTop
        // Skip scroll if already within 80px of center
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
              No results for "{searchQuery}"
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
