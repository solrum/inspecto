'use client'

import React, { useState, useEffect, useMemo, type ReactNode } from 'react'
import type { PenDocument, PenChild, PenTheme } from './types'
import { VarResolver } from './resolver'
import { PenDocumentRenderer } from './renderer'
import { ZoomControl } from './ZoomControl'
import { CanvasBgPicker } from './CanvasBgPicker'
import { FrameNavZone } from './FrameNavZone'
import { useCanvasTransform } from './useCanvasTransform'
import { CanvasProvider } from './canvas-context'

export type { CommentPin } from './CommentOverlay'

interface CanvasViewProps {
  document: PenDocument
  activeTheme?: PenTheme
  onSelectNode?: (id: string, node: PenChild) => void
  selectedId?: string | null
  initialFrame?: string
  canvasBg?: string
  onCanvasBgChange?: (color: string) => void
  focusNodeId?: string
  savedTransform?: { x: number; y: number; scale: number } | null
  onTransformChange?: (t: { x: number; y: number; scale: number }) => void
  showRefocus?: boolean
  onRefocus?: () => void
  /** Show "open frame" button — navigates to parent frame detail */
  onExpandFrame?: (() => void) | null
  onUserTransform?: () => void
  onPrevFrame?: (() => void) | null
  onNextFrame?: (() => void) | null
  /** Children rendered inside the content div (document space — follows pan/zoom) */
  children?: ReactNode
  /** Children rendered inside the canvas container but outside content (screen space — fixed position) */
  screenChildren?: ReactNode
}

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
  onExpandFrame,
  children,
  screenChildren,
}: CanvasViewProps) {
  const {
    containerRef,
    contentRef,
    canvasRef,
    transformRef,
    handle,
    zoomDisplay,
    setScale,
    fitAll,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  } = useCanvasTransform({
    frames: doc.children,
    savedTransform,
    onTransformChange,
    onUserTransform,
    initialFrame,
    focusNodeId,
  })

  const [bg, setBg] = useState(canvasBg ?? DEFAULT_CANVAS_BG)

  // Sync controlled canvasBg prop
  useEffect(() => {
    if (canvasBg !== undefined) setBg(canvasBg)
  }, [canvasBg])

  const handleBgChange = (color: string) => {
    setBg(color)
    onCanvasBgChange?.(color)
  }

  const resolver = useMemo(
    () => new VarResolver(doc.variables, activeTheme),
    [doc.variables, activeTheme]
  )

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

  const ctxValue = useMemo(() => ({
    transform: handle,
    transformRef,
    zoomDisplay,
    document: doc,
    resolver,
    selectedId: selectedId ?? null,
    canvasBg: bg,
    setCanvasBg: handleBgChange,
    containerRef,
    contentRef,
  }), [handle, transformRef, zoomDisplay, doc, resolver, selectedId, bg, containerRef, contentRef]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <CanvasProvider value={ctxValue}>
      <div style={styles.root}>
        <div
          ref={(el) => { containerRef.current = el; canvasRef.current = el }}
          style={{ ...styles.canvas, backgroundColor: bg }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div ref={contentRef} style={styles.content}>
            {frameLabels}

            <PenDocumentRenderer
              document={doc}
              resolver={resolver}
              selectedId={selectedId}
              onSelectNode={onSelectNode}
              scale={1}
            />

            {/* Document-space children (comment pins, add-comment trigger, etc.) */}
            {children}
          </div>

          {/* Screen-space children (popups, tooltips — not affected by pan/zoom) */}
          {screenChildren}

          {/* Bottom-right controls */}
          <div style={styles.zoomWrapper}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {onExpandFrame && (
                <button
                  onClick={onExpandFrame}
                  title="Open frame detail"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 36, height: 36,
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-surface-elevated)',
                    color: 'var(--color-foreground)',
                    boxShadow: 'inset 0 0 0 1px var(--color-border), 0 2px 8px 0 var(--color-shadow)',
                    border: 'none', cursor: 'pointer',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/>
                  </svg>
                </button>
              )}
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
              <CanvasBgPicker value={bg} onChange={handleBgChange} />
              <ZoomControl zoomDisplay={zoomDisplay} setScale={setScale} fitAll={fitAll} dropUp />
            </div>
          </div>

          {/* Frame navigation hover zones — direct children of canvas container */}
          {onPrevFrame && <FrameNavZone side="left" onClick={onPrevFrame} />}
          {onNextFrame && <FrameNavZone side="right" onClick={onNextFrame} />}
        </div>
      </div>
    </CanvasProvider>
  )
}

// ---- Static styles ----
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
    position: 'relative' as const,
  },
  content: {
    position: 'absolute' as const,
    transformOrigin: '0 0',
    willChange: 'transform',
  },
  zoomWrapper: {
    position: 'absolute' as const,
    bottom: 16,
    right: 16,
    zIndex: 20,
  },
} as const
