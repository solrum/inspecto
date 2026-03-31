'use client'

import { useRef, useState, useEffect, useCallback, type MouseEvent as ReactMouseEvent } from 'react'
import type { PenChild } from './types'

// ---- Types ----

interface Transform {
  x: number
  y: number
  scale: number
}

export interface CanvasTransformHandle {
  /** Current transform value (read from ref — no re-render) */
  get: () => Transform
  /** Focus on a specific frame by id */
  focusFrame: (frameId: string, animate?: boolean) => void
  /** Focus on any node by id — pans so node is centered */
  focusNodeById: (nodeId: string) => void
  /** Set zoom scale centered on viewport */
  setScale: (scale: number) => void
  /** Fit all frames into viewport */
  fitAll: () => void
}

export interface UseCanvasTransformOptions {
  frames: PenChild[]
  savedTransform?: { x: number; y: number; scale: number } | null
  onTransformChange?: (t: { x: number; y: number; scale: number }) => void
  onUserTransform?: () => void
  initialFrame?: string
  focusNodeId?: string
}

const MIN_SCALE = 0.05
const MAX_SCALE = 4

export function useCanvasTransform({
  frames,
  savedTransform,
  onTransformChange,
  onUserTransform,
  initialFrame,
  focusNodeId,
}: UseCanvasTransformOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const transformRef = useRef<Transform>(savedTransform ?? { x: 40, y: 40, scale: 0.5 })
  const isPanning = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const [zoomDisplay, setZoomDisplay] = useState(savedTransform ? Math.round(savedTransform.scale * 100) : 50)

  const onUserTransformRef = useRef(onUserTransform)
  onUserTransformRef.current = onUserTransform

  // Persist transform — debounced
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

  // Debounced zoom display update
  const zoomRAF = useRef<number>(0)
  const scheduleZoomDisplay = useCallback(() => {
    cancelAnimationFrame(zoomRAF.current)
    zoomRAF.current = requestAnimationFrame(() => {
      setZoomDisplay(Math.round(transformRef.current.scale * 100))
    })
  }, [])

  // Shared animation helper — set transform with optional CSS transition
  const animateTransform = useCallback((newTransform: Transform, animate: boolean) => {
    if (animate && contentRef.current) {
      contentRef.current.style.transition = 'transform 0.3s ease-out'
      requestAnimationFrame(() => {
        transformRef.current = newTransform
        applyTransform()
        scheduleZoomDisplay()
        setTimeout(() => {
          if (contentRef.current) contentRef.current.style.transition = ''
        }, 320)
      })
    } else {
      transformRef.current = newTransform
      applyTransform()
      scheduleZoomDisplay()
    }
  }, [applyTransform, scheduleZoomDisplay])

  // Focus on a specific frame — center it in viewport
  const focusFrame = useCallback(
    (frameId: string, animate = false) => {
      const frame = frames.find((f) => f.id === frameId)
      if (!frame || !containerRef.current) return
      const container = containerRef.current
      const cw = container.clientWidth
      const ch = container.clientHeight
      const fx = frame.x ?? 0
      const fy = frame.y ?? 0
      const fw = typeof frame.width === 'number' ? frame.width : 400
      const fh = typeof frame.height === 'number' ? frame.height : 800

      const scale = Math.min((cw - 60) / fw, (ch - 60) / fh, 1)
      animateTransform({
        x: cw / 2 - (fx + fw / 2) * scale,
        y: ch / 2 - (fy + fh / 2) * scale,
        scale,
      }, animate)
    },
    [frames, animateTransform]
  )

  // Mount: restore saved transform instantly, OR focus first frame
  const didMount = useRef(false)
  useEffect(() => {
    if (didMount.current) return
    didMount.current = true
    if (savedTransform) {
      applyTransform()
    } else if (initialFrame) {
      const frameId = initialFrame.split('__')[0]
      focusFrame(frameId, false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Subsequent initialFrame changes — animate
  const prevInitialFrame = useRef(initialFrame)
  useEffect(() => {
    if (prevInitialFrame.current === initialFrame) return
    prevInitialFrame.current = initialFrame
    if (!initialFrame) return
    const frameId = initialFrame.split('__')[0]
    focusFrame(frameId, true)
  }, [initialFrame, focusFrame])

  // Focus on any node by id — find its rendered DOM element and pan to it
  const focusNodeById = useCallback((nodeId: string, animate = false) => {
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
    animateTransform({
      ...transformRef.current,
      x: cw / 2 - (nodeX + nodeW / 2) * scale,
      y: ch / 2 - (nodeY + nodeH / 2) * scale,
    }, animate)
  }, [animateTransform])

  // One-shot focus — only react to focusNodeId changes, not focusNodeById identity
  const prevFocusNodeId = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!focusNodeId || focusNodeId === prevFocusNodeId.current) return
    prevFocusNodeId.current = focusNodeId
    // Wait for DOM to be ready before focusing
    requestAnimationFrame(() => {
      focusNodeById(focusNodeId.split('__')[0], true)
    })
  }, [focusNodeId, focusNodeById])

  // Wheel: normal scroll = pan, Ctrl/Cmd+scroll = zoom
  const onWheelClosePopup = useRef<(() => void) | null>(null)
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
      onWheelClosePopup.current?.()
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [applyTransform, scheduleZoomDisplay])

  // Mouse pan (middle-click or Alt+drag)
  const handleMouseDown = useCallback((e: ReactMouseEvent) => {
    onWheelClosePopup.current?.()

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
    if (!containerRef.current || frames.length === 0) return
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
  }, [frames, applyTransform, scheduleZoomDisplay])

  // Stable imperative handle
  const handle: CanvasTransformHandle = {
    get: () => transformRef.current,
    focusFrame,
    focusNodeById,
    setScale,
    fitAll,
  }

  return {
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
    /** Register a callback to close popups on wheel/mousedown */
    onWheelClosePopup,
  }
}
