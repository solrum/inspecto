// Public API
export type {
  PenDocument,
  PenChild,
  PenFrame,
  PenGroup,
  PenRectangle,
  PenEllipse,
  PenLine,
  PenPolygon,
  PenPath,
  PenText,
  PenIconFont,
  PenRef,
  PenNote,
  PenPrompt,
  PenContext,
  PenVariables,
  PenVariable,
  PenTheme,
  PenFill,
  PenFills,
  PenStroke,
  PenEffect,
  PenEffects,
} from './types'
export { VarResolver } from './resolver'
export { PenViewer } from './PenViewer'
export type { ViewerConfig } from './PenViewer'
export { PenDocumentRenderer } from './renderer'
export { CanvasView } from './CanvasView'
export { FramePicker } from './FramePicker'
export { CanvasBgPicker } from './CanvasBgPicker'
export { FrameNavZone } from './FrameNavZone'
export { CommentPinMarker, AddCommentTrigger, CommentPopup } from './CommentOverlay'
export type { CommentPin } from './CommentOverlay'
export { NodeInspector } from './NodeInspector'
export { useCanvas, CanvasProvider } from './canvas-context'
export type { CanvasContextValue } from './canvas-context'
export { useCanvasTransform } from './useCanvasTransform'
export type { CanvasTransformHandle } from './useCanvasTransform'
// Legacy — SingleFrameViewer still exists but PenViewer with config.mode='single-frame' is preferred
export { SingleFrameViewer } from './SingleFrameViewer'
