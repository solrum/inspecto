'use client'

import React, { useState, useMemo, useCallback, useEffect, useRef, type ReactNode } from 'react'
import type { PenDocument, PenChild, PenTheme } from './types'
import { VarResolver } from './resolver'
import { CanvasView, type CommentPin } from './CanvasView'
import { FramePicker } from './FramePicker'
import { NodeInspector } from './NodeInspector'
import { createParserFactory, buildComponentRegistry } from './engine'
import { HTMLRendererComponent } from './engine/renderers/html'
import { ZoomControl } from './ZoomControl'

// ═══ ViewerConfig ═══

export interface ViewerConfig {
  /** 'all-frames' shows all frames, 'single-frame' shows one frame fit-to-container */
  mode: 'all-frames' | 'single-frame'
  /** Frame id for single-frame mode */
  frameId?: string
  /** Read-only mode (disable selection highlight on canvas) */
  readOnly?: boolean
  /** Enable add-comment on selected node */
  canComment?: boolean
  /** Callback when user adds a comment. pinXRatio/pinYRatio are DOM-computed relative to frame. */
  onAddComment?: (nodeId: string, body: string, pinXRatio: number, pinYRatio: number) => void
  /** Hide layers panel */
  hideLayersPanel?: boolean
  /** Hide inspector panel */
  hideInspector?: boolean
  /** Hide top bar */
  hideTopBar?: boolean
  /** Navigate between frames in single-frame mode */
  onNavigateFrame?: (frameId: string) => void
}

const defaultConfig: ViewerConfig = { mode: 'all-frames' }

// ═══ PenViewer Props ═══

interface PenViewerProps {
  document: PenDocument
  config?: ViewerConfig
  defaultTheme?: PenTheme
  height?: string
  title?: string
  topBar?: ReactNode
  onSelectNode?: (id: string, node: PenChild) => void
  selectedId?: string | null
  /** Saved canvas transform to restore */
  savedTransform?: { x: number; y: number; scale: number } | null
  onTransformChange?: (t: { x: number; y: number; scale: number }) => void
  defaultSelectedFrameId?: string | null
  onSelectedFrameChange?: (id: string) => void
  /** Current user name for comment popup */
  userName?: string
  /** Focus camera on a specific node */
  focusNodeId?: string
  /** Comment pins to render in document space */
  commentPins?: CommentPin[]
  /** Called when a pin is clicked */
  onClickPin?: (commentId: string) => void
}

// ═══ PenViewer ═══

export function PenViewer({
  document: doc,
  config: configProp,
  defaultTheme = {},
  height = '100vh',
  title = 'Pen Viewer',
  topBar,
  onSelectNode: onSelectNodeProp,
  selectedId: controlledSelectedId,
  savedTransform,
  onTransformChange,
  defaultSelectedFrameId,
  onSelectedFrameChange,
  userName,
  focusNodeId,
  commentPins,
  onClickPin,
}: PenViewerProps) {
  const config = configProp ?? defaultConfig
  const isSingleFrame = config.mode === 'single-frame'

  // In single-frame mode, create a filtered document with only the target frame
  const { viewDoc, viewFrames } = useMemo(() => {
    if (!isSingleFrame || !config.frameId) {
      return { viewDoc: doc, viewFrames: doc.children }
    }
    const frame = doc.children.find(f => f.id === config.frameId)
    if (!frame) return { viewDoc: doc, viewFrames: doc.children }
    return {
      viewDoc: { ...doc, children: [frame] },
      viewFrames: [frame],
    }
  }, [doc, isSingleFrame, config.frameId])

  const firstFrameId = viewFrames[0]?.id ?? null

  // Frame navigation for single-frame mode
  const { onPrevFrame, onNextFrame } = useMemo(() => {
    if (!isSingleFrame || !config.frameId || !config.onNavigateFrame) return { onPrevFrame: null, onNextFrame: null }
    const allFrames = doc.children.filter((c: any) => c.type === 'frame' || c.type === 'group')
    const idx = allFrames.findIndex(f => f.id === config.frameId)
    const prev = idx > 0 ? allFrames[idx - 1] : null
    const next = idx < allFrames.length - 1 ? allFrames[idx + 1] : null
    return {
      onPrevFrame: prev ? () => config.onNavigateFrame!(prev.id) : null,
      onNextFrame: next ? () => config.onNavigateFrame!(next.id) : null,
    }
  }, [isSingleFrame, config.frameId, config.onNavigateFrame, doc.children])

  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(
    defaultSelectedFrameId ?? firstFrameId
  )
  const [internalSelectedNode, setInternalSelectedNode] = useState<PenChild | null>(null)
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null)
  const [activeTheme, setActiveTheme] = useState<PenTheme>(defaultTheme)
  const focusCounter = useRef(0)
  const [focusFrame, setFocusFrame] = useState<string | undefined>(
    savedTransform ? undefined : firstFrameId ?? undefined
  )
  const [canvasBg, setCanvasBg] = useState<string | undefined>(undefined)
  const [autoExpandTo, setAutoExpandTo] = useState<string | null>(null)
  const [needsRefocus, setNeedsRefocus] = useState(false)

  const selectedNodeId = controlledSelectedId ?? internalSelectedId

  // Focus helper
  const triggerFocus = useCallback((frameId: string) => {
    focusCounter.current += 1
    setFocusFrame(`${frameId}__${focusCounter.current}`)
  }, [])

  // Single-frame mode: auto-focus when frameId changes
  useEffect(() => {
    if (!isSingleFrame || !config.frameId) return
    setSelectedFrameId(config.frameId)
    triggerFocus(config.frameId)
  }, [isSingleFrame, config.frameId, triggerFocus])

  const resolver = useMemo(
    () => new VarResolver(doc.variables, activeTheme),
    [doc.variables, activeTheme]
  )

  const onSelectedFrameChangeRef = useRef(onSelectedFrameChange)
  onSelectedFrameChangeRef.current = onSelectedFrameChange

  // ═══ Unified node selection ═══

  const selectNode = useCallback((id: string, node: PenChild | null, source: 'layers' | 'canvas') => {
    if (config.readOnly) return

    const resolvedNode = node ?? findNodeInTree(doc.children, id)
    setInternalSelectedId(id)
    setInternalSelectedNode(resolvedNode)
    onSelectNodeProp?.(id, resolvedNode!)

    const parentFrameId = findParentFrameId(doc.children, id) ?? id
    const isNewFrame = parentFrameId !== selectedFrameId
    if (isNewFrame) {
      setSelectedFrameId(parentFrameId)
      onSelectedFrameChangeRef.current?.(parentFrameId)
    }

    if (source === 'layers') {
      if (isNewFrame && !isSingleFrame) {
        triggerFocus(parentFrameId)
        setNeedsRefocus(false)
      }
    } else {
      setAutoExpandTo(id)
    }
  }, [doc.children, onSelectNodeProp, triggerFocus, selectedFrameId, config.readOnly, isSingleFrame])

  const handleSelectFromLayers = useCallback((id: string) => selectNode(id, null, 'layers'), [selectNode])
  const handleSelectFromCanvas = useCallback((id: string, node: PenChild) => selectNode(id, node, 'canvas'), [selectNode])

  // ═══ Refocus ═══

  const getRefocusFrameId = useCallback((): string | null => {
    if (selectedFrameId) return selectedFrameId
    const nodeId = controlledSelectedId ?? internalSelectedId
    if (!nodeId) return firstFrameId
    return findParentFrameId(doc.children, nodeId) ?? firstFrameId
  }, [selectedFrameId, controlledSelectedId, internalSelectedId, doc.children, firstFrameId])

  const handleRefocus = useCallback(() => {
    const frameId = getRefocusFrameId()
    if (frameId) { triggerFocus(frameId); setNeedsRefocus(false) }
  }, [getRefocusFrameId, triggerFocus])

  // ═══ Theme ═══

  const themeAxes = useMemo(() => {
    if (!doc.themes) return []
    return Object.entries(doc.themes).map(([axis, values]) => ({ axis, values }))
  }, [doc.themes])

  const handleThemeChange = useCallback((axis: string, value: string) => {
    setActiveTheme(prev => ({ ...prev, [axis]: value }))
  }, [])

  // ═══ Layers data ═══
  // In single-frame mode, show children of the frame. In all-frames, show all.
  const layerFrames = isSingleFrame && config.frameId
    ? (viewFrames[0] ? [viewFrames[0]] : [])
    : doc.children

  // ═══ Render ═══

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height, fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: 'var(--color-background)' }}>
      {/* Top bar */}
      {!config.hideTopBar && (
        topBar ?? (
          <div style={barStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-foreground)' }}>{title}</span>
              <span style={{ fontSize: 11, color: 'var(--color-foreground-muted)' }}>v{doc.version}</span>
            </div>
            {themeAxes.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {themeAxes.map(({ axis, values }) => (
                  <div key={axis} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--color-foreground-muted)' }}>{axis}:</span>
                    {values.map(val => (
                      <button key={val} onClick={() => handleThemeChange(axis, val)} style={{
                        padding: '2px 10px', fontSize: 11, cursor: 'pointer', border: 'none', borderRadius: 'var(--radius-sm)',
                        backgroundColor: activeTheme[axis] === val ? 'var(--color-primary)' : 'var(--color-surface)',
                        color: activeTheme[axis] === val ? 'var(--color-primary-foreground)' : 'var(--color-foreground-secondary)',
                      }}>{val}</button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      )}

      {/* Main area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {/* Layers panel */}
        {!config.hideLayersPanel && (
          <FramePicker
            frames={layerFrames}
            selectedFrameId={internalSelectedId ?? selectedFrameId}
            onSelect={handleSelectFromLayers}
            onNavigate={isSingleFrame ? undefined : config.onNavigateFrame}
            autoExpandTo={autoExpandTo}
          />
        )}

        {/* Canvas */}
        <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
          <CanvasView
            document={isSingleFrame ? viewDoc : doc}
            activeTheme={activeTheme}
            selectedId={config.readOnly ? null : selectedNodeId}
            onSelectNode={config.readOnly ? undefined : handleSelectFromCanvas}
            initialFrame={focusFrame}
            focusNodeId={focusNodeId}
            canvasBg={canvasBg}
            onCanvasBgChange={setCanvasBg}
            onRefocus={handleRefocus}
            showRefocus={needsRefocus}
            onUserTransform={() => setNeedsRefocus(true)}
            savedTransform={savedTransform}
            onTransformChange={onTransformChange}
            onPrevFrame={onPrevFrame}
            onNextFrame={onNextFrame}
            onAddComment={config.canComment ? config.onAddComment : undefined}
            userName={userName}
            commentPins={commentPins}
            onClickPin={onClickPin}
          />
        </div>

        {/* Inspector */}
        {!config.hideInspector && (
          <NodeInspector node={internalSelectedNode} resolver={resolver} />
        )}
      </div>
    </div>
  )
}

// ═══ Helpers ═══

function findNodeInTree(children: PenChild[], id: string): PenChild | null {
  for (const child of children) {
    if (child.id === id) return child
    if ('children' in child && Array.isArray((child as any).children)) {
      const found = findNodeInTree((child as any).children, id)
      if (found) return found
    }
  }
  return null
}

function findParentFrameId(topChildren: PenChild[], targetId: string): string | null {
  for (const frame of topChildren) {
    if (frame.id === targetId) return frame.id
    if ('children' in frame && Array.isArray((frame as any).children)) {
      if (findNodeInTree((frame as any).children, targetId)) return frame.id
    }
  }
  return null
}

const barStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  height: 52, padding: '0 20px',
  backgroundColor: 'var(--color-surface)', boxShadow: 'inset 0 -1px 0 0 var(--color-border)', flexShrink: 0,
}
