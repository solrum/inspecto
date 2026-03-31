'use client'

import React, { useState, useMemo, useCallback, useEffect, useRef, type ReactNode } from 'react'
import type { PenDocument, PenChild, PenTheme } from './types'
import { VarResolver } from './resolver'
import { CanvasView } from './CanvasView'
import type { CommentPin } from './CommentOverlay'
import { CommentPinMarker, AddCommentTrigger, CommentPopup } from './CommentOverlay'
import { FramePicker } from './FramePicker'
import { NodeInspector } from './NodeInspector'
import { useCanvas } from './canvas-context'

// ═══ ViewerConfig ═══

export interface ViewerConfig {
  mode: 'all-frames' | 'single-frame'
  frameId?: string
  readOnly?: boolean
  canComment?: boolean
  onAddComment?: (nodeId: string, body: string, pinXRatio: number, pinYRatio: number) => void
  hideLayersPanel?: boolean
  hideInspector?: boolean
  hideTopBar?: boolean
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
  savedTransform?: { x: number; y: number; scale: number } | null
  onTransformChange?: (t: { x: number; y: number; scale: number }) => void
  defaultSelectedFrameId?: string | null
  onSelectedFrameChange?: (id: string) => void
  userName?: string
  focusNodeId?: string
  commentPins?: CommentPin[]
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

  // ═══ External focus (from comment click) → also select the node ═══
  const prevFocusNodeId = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!focusNodeId || focusNodeId === prevFocusNodeId.current) return
    prevFocusNodeId.current = focusNodeId
    const nodeId = focusNodeId.split('__')[0]
    const node = findNodeInTree(doc.children, nodeId)
    if (node) {
      setInternalSelectedId(nodeId)
      setInternalSelectedNode(node)
      setAutoExpandTo(nodeId)
      onSelectNodeProp?.(nodeId, node)
    }
  }, [focusNodeId, doc.children, onSelectNodeProp])

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
        <CommentPopupProvider>
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
            onExpandFrame={!isSingleFrame && config.onNavigateFrame && selectedFrameId ? () => config.onNavigateFrame!(selectedFrameId) : null}
            screenChildren={
              config.canComment ? (
                <CommentScreenLayer
                  onAddComment={config.onAddComment}
                  userName={userName}
                />
              ) : undefined
            }
          >
            {/* Comment pins + add trigger — document space (follows pan/zoom) */}
            {config.canComment && (
              <CommentDocLayer
                commentPins={commentPins}
                onClickPin={onClickPin}
                selectedId={config.readOnly ? null : selectedNodeId ?? null}
                onAddComment={config.onAddComment}
              />
            )}
          </CanvasView>
        </div>
        </CommentPopupProvider>

        {/* Inspector */}
        {!config.hideInspector && (
          <NodeInspector node={internalSelectedNode} resolver={resolver} />
        )}
      </div>
    </div>
  )
}

// ═══ Comment popup shared state (between doc layer and screen layer) ═══

const CommentPopupContext = React.createContext<{
  popup: { nodeId: string; x: number; y: number } | null
  setPopup: (v: { nodeId: string; x: number; y: number } | null) => void
}>({ popup: null, setPopup: () => {} })

function CommentPopupProvider({ children }: { children: React.ReactNode }) {
  const [popup, setPopup] = useState<{ nodeId: string; x: number; y: number } | null>(null)
  const value = useMemo(() => ({ popup, setPopup }), [popup])
  return <CommentPopupContext.Provider value={value}>{children}</CommentPopupContext.Provider>
}

// ═══ Document-space layer: pins + add-comment trigger ═══

function CommentDocLayer({
  commentPins,
  onClickPin,
  selectedId,
  onAddComment,
}: {
  commentPins?: CommentPin[]
  onClickPin?: (commentId: string) => void
  selectedId: string | null
  onAddComment?: (nodeId: string, body: string, pinXRatio: number, pinYRatio: number) => void
}) {
  const { contentRef } = useCanvas()
  const { popup, setPopup } = React.useContext(CommentPopupContext)

  // Close popup on selection change
  useEffect(() => { setPopup(null) }, [selectedId, setPopup])

  return (
    <>
      {commentPins?.map((pin, i) => (
        <CommentPinMarker
          key={pin.id}
          pin={pin}
          index={i}
          contentRef={contentRef}
          onClick={() => onClickPin?.(pin.id)}
        />
      ))}

      {selectedId && onAddComment && !popup && (
        <AddCommentTrigger
          contentRef={contentRef}
          selectedId={selectedId}
          onOpen={(nodeId, docX, docY) => setPopup({ nodeId, x: docX, y: docY })}
        />
      )}
    </>
  )
}

// ═══ Screen-space layer: comment popup (not affected by pan/zoom) ═══

function CommentScreenLayer({
  onAddComment,
  userName,
}: {
  onAddComment?: (nodeId: string, body: string, pinXRatio: number, pinYRatio: number) => void
  userName?: string
}) {
  const { contentRef, transformRef } = useCanvas()
  const { popup, setPopup } = React.useContext(CommentPopupContext)

  if (!popup || !onAddComment) return null

  const t = transformRef.current
  const screenX = popup.x * t.scale + t.x
  const screenY = popup.y * t.scale + t.y

  return (
    <CommentPopup
      x={screenX}
      y={screenY}
      userName={userName ?? 'You'}
      onSubmit={(body) => {
        let pinXRatio = 0.5, pinYRatio = 0.5
        if (contentRef.current) {
          const nodeEl = contentRef.current.querySelector(`[data-pen-id="${popup.nodeId}"]`) as HTMLElement | null
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
        onAddComment(popup.nodeId, body, pinXRatio, pinYRatio)
        setPopup(null)
      }}
      onCancel={() => setPopup(null)}
    />
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
