'use client'

import { createContext, useContext, type RefObject } from 'react'
import type { PenDocument, PenTheme } from './types'
import type { CanvasTransformHandle } from './useCanvasTransform'
import type { VarResolver } from './resolver'

export interface CanvasContextValue {
  /** Imperative transform API (stable ref — never triggers re-renders for pan/zoom) */
  transform: CanvasTransformHandle
  /** Current transform ref for reading raw values */
  transformRef: React.MutableRefObject<{ x: number; y: number; scale: number }>
  /** Current zoom display percentage (reactive state) */
  zoomDisplay: number
  /** The pen document being rendered */
  document: PenDocument
  /** Variable resolver for the current theme */
  resolver: VarResolver
  /** Currently selected node id */
  selectedId: string | null
  /** Canvas background color */
  canvasBg: string
  /** Update canvas background */
  setCanvasBg: (color: string) => void
  /** Container DOM ref (the scrollable canvas area) */
  containerRef: RefObject<HTMLDivElement | null>
  /** Content DOM ref (the transformed content layer) */
  contentRef: RefObject<HTMLDivElement | null>
}

const CanvasContext = createContext<CanvasContextValue | null>(null)

export const CanvasProvider = CanvasContext.Provider

export function useCanvas(): CanvasContextValue {
  const ctx = useContext(CanvasContext)
  if (!ctx) throw new Error('useCanvas must be used within a CanvasProvider')
  return ctx
}
