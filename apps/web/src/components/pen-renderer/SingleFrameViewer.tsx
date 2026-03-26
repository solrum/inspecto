'use client'

/**
 * SingleFrameViewer
 *
 * Renders exactly 1 frame from a PenDocument.
 * Fits frame to container, with zoom/pan support.
 * Provides next/prev navigation between frames.
 * Uses ref-based transform to avoid re-renders during scroll/pan/zoom.
 */

import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react'
import type { PenDocument, PenChild, PenTheme } from './types'
import { VarResolver } from './resolver'
import { createParserFactory, buildComponentRegistry } from './engine'
import { HTMLRendererComponent } from './engine/renderers/html'
import { NodeInspector } from './NodeInspector'
import { ZoomControl } from './ZoomControl'
import { FramePicker } from './CanvasView'

interface SingleFrameViewerProps {
  document: PenDocument
  frameId: string
  defaultTheme?: PenTheme
  height?: string
  onNavigate?: (frameId: string) => void
  /** Replace the built-in top bar */
  topBar?: React.ReactNode
  /** Hide built-in top bar entirely */
  hideTopBar?: boolean
}

export function SingleFrameViewer({
  document: doc,
  frameId,
  defaultTheme = {},
  height = '100vh',
  onNavigate,
  topBar,
  hideTopBar = false,
}: SingleFrameViewerProps) {
  const [selectedNode, setSelectedNode] = useState<PenChild | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [activeTheme, setActiveTheme] = useState<PenTheme>(defaultTheme)
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const transformRef = useRef({ x: 0, y: 0, scale: 1 })
  const isPanning = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const [zoomDisplay, setZoomDisplay] = useState(100)

  const resolver = useMemo(
    () => new VarResolver(doc.variables, activeTheme),
    [doc.variables, activeTheme],
  )

  // Find current frame and neighbors
  const frames = useMemo(() =>
    doc.children.filter((c: any) => c.type === 'frame' || c.type === 'group'),
    [doc.children]
  )
  const currentIndex = frames.findIndex((f) => f.id === frameId)
  const currentFrame = currentIndex >= 0 ? frames[currentIndex] : null
  const prevFrame = currentIndex > 0 ? frames[currentIndex - 1] : null
  const nextFrame = currentIndex < frames.length - 1 ? frames[currentIndex + 1] : null

  // Parse only the single frame
  const factory = useMemo(() => {
    const registry = buildComponentRegistry(doc.children)
    return createParserFactory(registry)
  }, [doc.children])

  const renderTree = useMemo(() => {
    if (!currentFrame) return null
    return factory.parse(currentFrame, resolver, 'none', 0)
  }, [currentFrame, factory, resolver])

  // Apply transform directly to DOM
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
  }, [])

  const zoomRAF = useRef<number>(0)
  const scheduleZoomDisplay = useCallback(() => {
    cancelAnimationFrame(zoomRAF.current)
    zoomRAF.current = requestAnimationFrame(() => {
      setZoomDisplay(Math.round(transformRef.current.scale * 100))
    })
  }, [])

  // Fit frame to container on mount/frame change
  useEffect(() => {
    if (!containerRef.current || !currentFrame) return
    const cw = containerRef.current.clientWidth
    const ch = containerRef.current.clientHeight
    const fw = typeof currentFrame.width === 'number' ? currentFrame.width : 400
    const fh = typeof currentFrame.height === 'number' ? currentFrame.height : 800
    const scale = Math.min((cw - 40) / fw, (ch - 40) / fh, 1)
    transformRef.current = {
      x: (cw - fw * scale) / 2,
      y: (ch - fh * scale) / 2,
      scale,
    }
    applyTransform()
    scheduleZoomDisplay()
  }, [frameId, currentFrame, applyTransform, scheduleZoomDisplay])

  // Zoom
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const prev = transformRef.current
      if (e.ctrlKey || e.metaKey) {
        const delta = -e.deltaY * 0.003
        const nextScale = Math.min(4, Math.max(0.1, prev.scale * (1 + delta)))
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
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [applyTransform, scheduleZoomDisplay])

  // Pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      isPanning.current = true
      lastMouse.current = { x: e.clientX, y: e.clientY }
      e.preventDefault()
    }
  }, [])
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return
    const dx = e.clientX - lastMouse.current.x
    const dy = e.clientY - lastMouse.current.y
    lastMouse.current = { x: e.clientX, y: e.clientY }
    const prev = transformRef.current
    transformRef.current = { ...prev, x: prev.x + dx, y: prev.y + dy }
    applyTransform()
  }, [applyTransform])
  const handleMouseUp = useCallback(() => { isPanning.current = false }, [])

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

  const handleSelectNode = useCallback((id: string, node: PenChild) => {
    setSelectedNodeId(id)
    setSelectedNode(node)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && prevFrame && onNavigate) {
        onNavigate(prevFrame.id)
      } else if (e.key === 'ArrowRight' && nextFrame && onNavigate) {
        onNavigate(nextFrame.id)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [prevFrame, nextFrame, onNavigate])

  if (!currentFrame || !renderTree) {
    return (
      <div style={sfvStyles.notFound}>
        Frame not found
      </div>
    )
  }

  return (
    <div style={{ ...sfvStyles.root, height }}>
      {/* Top bar */}
      {!hideTopBar && (
        topBar ?? (
          <div style={sfvStyles.topBar}>
            <div style={sfvStyles.navGroup}>
              <button
                disabled={!prevFrame}
                onClick={() => prevFrame && onNavigate?.(prevFrame.id)}
                style={{
                  ...sfvStyles.navBtn,
                  color: prevFrame ? 'var(--color-foreground)' : 'var(--color-foreground-muted)',
                  cursor: prevFrame ? 'pointer' : 'default',
                }}
              >
                ←
              </button>
              <div>
                <span style={sfvStyles.frameName}>
                  {currentFrame.name ?? currentFrame.id}
                </span>
                <span style={sfvStyles.frameIndex}>
                  {currentIndex + 1} / {frames.length}
                </span>
              </div>
              <button
                disabled={!nextFrame}
                onClick={() => nextFrame && onNavigate?.(nextFrame.id)}
                style={{
                  ...sfvStyles.navBtn,
                  color: nextFrame ? 'var(--color-foreground)' : 'var(--color-foreground-muted)',
                  cursor: nextFrame ? 'pointer' : 'default',
                }}
              >
                →
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <ZoomControl zoomDisplay={zoomDisplay} setScale={setScale} dropUp={false} />
              <span style={sfvStyles.hint}>
                ← → navigate · ⌘+Scroll zoom
              </span>
            </div>
          </div>
        )
      )}

      {/* Main */}
      <div style={sfvStyles.mainArea}>
        {/* Layers — shows current frame as single root with its children */}
        <FramePicker
          frames={[currentFrame]}
          selectedFrameId={selectedNodeId}
          onSelect={(id) => handleSelectNode(id, currentFrame)}
        />

        {/* Canvas */}
        <div
          ref={(el) => { containerRef.current = el; canvasRef.current = el }}
          style={sfvStyles.canvas}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div ref={contentRef} style={sfvStyles.content}>
            <div style={sfvStyles.frameLabel}>
              {currentFrame.name ?? currentFrame.id}
            </div>
            <HTMLRendererComponent
              trees={[renderTree]}
              selectedId={selectedNodeId}
              onSelectNode={handleSelectNode}
              originAtZero
            />
          </div>
        </div>

        <NodeInspector node={selectedNode} resolver={resolver} />
      </div>
    </div>
  )
}

const sfvStyles = {
  root: {
    display: 'flex',
    flexDirection: 'column' as const,
    fontFamily: 'Inter, system-ui, sans-serif',
    backgroundColor: 'var(--color-background)',
  },
  notFound: {
    display: 'flex',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    height: '100vh',
    color: 'var(--color-foreground-muted)',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: '12px 20px',
    backgroundColor: 'var(--color-surface)',
    boxShadow: 'inset 0 -1px 0 0 var(--color-border)',
    flexShrink: 0,
  },
  navGroup: { display: 'flex', alignItems: 'center' as const, gap: 12 },
  navBtn: {
    border: 'none',
    background: 'none',
    fontSize: 16,
    padding: '2px 6px',
  },
  frameName: { fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: 'var(--color-foreground)' },
  frameIndex: { fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'var(--color-foreground-muted)', marginLeft: 8 },
  hint: { fontFamily: 'Inter, sans-serif', fontSize: 10, color: 'var(--color-foreground-muted)' },
  mainArea: { display: 'flex', flex: 1, overflow: 'hidden' as const },
  canvas: {
    flex: 1,
    overflow: 'hidden' as const,
    backgroundColor: '#EDEDF0',
    position: 'relative' as const,
    backgroundImage: 'radial-gradient(circle, #D8D8DC 1px, transparent 1px)',
    backgroundSize: '20px 20px',
    backgroundPosition: '0px 0px',
  },
  content: {
    position: 'absolute' as const,
    transformOrigin: '0 0',
    willChange: 'transform' as const,
  },
  frameLabel: {
    position: 'absolute' as const,
    top: -28,
    left: 0,
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--color-foreground-secondary)',
    whiteSpace: 'nowrap' as const,
    pointerEvents: 'none' as const,
    userSelect: 'none' as const,
  },
} as const
