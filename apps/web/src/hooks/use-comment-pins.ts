'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { comments as commentsApi } from '@/lib/api'
import type { CommentPin } from '@/components/pen-renderer/CommentOverlay'
import type { PenDocument, PenChild } from '@/components/pen-renderer/types'

// ---- Helpers ----

function findNodeInChildren(children: any[], id: string): any | null {
  for (const child of children) {
    if (child.id === id) return child
    if (child.children?.length) {
      const found = findNodeInChildren(child.children, id)
      if (found) return found
    }
  }
  return null
}

function findNodeInFrames(frames: any[], nodeId: string): { frameId: string; node: any } | null {
  for (const frame of frames) {
    if (frame.id === nodeId) return { frameId: frame.id, node: frame }
    const found = findNodeInChildren(frame.children ?? [], nodeId)
    if (found) return { frameId: frame.id, node: found }
  }
  return null
}

/** Find node by id with computed absolute position within frame */
function findNodeAbsolute(children: any[], id: string, offsetX = 0, offsetY = 0): any | null {
  for (const child of children) {
    const cx = offsetX + (typeof child.x === 'number' ? child.x : 0)
    const cy = offsetY + (typeof child.y === 'number' ? child.y : 0)
    if (child.id === id) return { ...child, _absX: cx, _absY: cy }
    if (child.children?.length) {
      const found = findNodeAbsolute(child.children, id, cx, cy)
      if (found) return found
    }
  }
  return null
}

// ---- Hook ----

interface UseCommentPinsOptions {
  fileId: string
  /** Pen document (full, not filtered) */
  document: PenDocument | undefined | null
  /** Current version id */
  versionId?: string
  /** Single-frame mode: only load comments for this frame */
  frameId?: string
  /** Enabled flag (e.g. isAuthenticated) */
  enabled?: boolean
}

export interface UseCommentPinsResult {
  /** Comment pins ready for CanvasView */
  commentPins: CommentPin[]
  /** Raw comment list from API */
  commentList: any[]
  /** Add comment handler — pass to PenViewer config.onAddComment */
  handleAddComment: (nodeId: string, body: string, pinXRatio: number, pinYRatio: number) => void
  /** Focus comment handler — sets focusNodeId for camera pan */
  handleFocusComment: (commentId: string) => void
  /** Focus node id with cache-bust suffix (pass to PenViewer.focusNodeId) */
  focusNodeId: string | undefined
}

export function useCommentPins({
  fileId,
  document: doc,
  versionId,
  frameId,
  enabled = true,
}: UseCommentPinsOptions): UseCommentPinsResult {
  const queryClient = useQueryClient()
  const [focusNodeId, setFocusNodeId] = useState<string | undefined>(undefined)

  // Query comments — scoped to frame if provided
  const queryKey = frameId
    ? ['comments', fileId, frameId, versionId]
    : ['comments', fileId]

  const { data: commentList = [] } = useQuery({
    queryKey,
    queryFn: () => frameId
      ? commentsApi.list(fileId, { frameId, versionId })
      : commentsApi.list(fileId),
    enabled: enabled && !!fileId,
  })

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: (data: Parameters<typeof commentsApi.create>[1]) =>
      commentsApi.create(fileId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', fileId] })
    },
  })

  // Compute comment pins
  const commentPins = useMemo<CommentPin[]>(() => {
    if (!doc || !commentList.length) return []

    const frames = frameId
      ? doc.children.filter(f => f.id === frameId)
      : doc.children

    return commentList
      .filter((c: any) => !c.parentCommentId && (c.nodeId || (typeof c.pinXRatio === 'number' && typeof c.pinYRatio === 'number')))
      .map((c: any) => {
        const frame = frames.find((f: any) => f.id === c.frameId) as any
        const fw = frame ? (typeof frame.width === 'number' ? frame.width : 1) : 1
        const fh = frame ? (typeof frame.height === 'number' ? frame.height : 1) : 1
        const fx = frame ? (typeof frame.x === 'number' ? frame.x : 0) : 0
        const fy = frame ? (typeof frame.y === 'number' ? frame.y : 0) : 0
        return {
          id: c.id,
          nodeId: c.nodeId ?? null,
          fallbackDocX: typeof c.pinXRatio === 'number' ? fx + c.pinXRatio * fw : undefined,
          fallbackDocY: typeof c.pinYRatio === 'number' ? fy + c.pinYRatio * fh : undefined,
          anchorStatus: c.anchorStatus ?? 'active',
          resolved: !!c.resolved,
          authorName: c.authorName,
          body: c.body,
        }
      })
  }, [commentList, doc, frameId])

  // Add comment handler
  const handleAddComment = useCallback((nodeId: string, body: string, pinXRatio: number, pinYRatio: number) => {
    if (!doc) return

    // Determine frame and node info
    let targetFrameId = frameId
    let anchorMeta: any = undefined

    if (frameId) {
      // Single-frame mode: search within the frame
      const frame = doc.children.find(f => f.id === frameId) as any
      const node = frame ? findNodeAbsolute(frame.children ?? [], nodeId) : null
      targetFrameId = frameId
      if (node) {
        anchorMeta = {
          name: node.name ?? null,
          type: node.type,
          parentId: null,
          bbox: {
            x: node._absX ?? null,
            y: node._absY ?? null,
            w: typeof node.width === 'number' ? node.width : null,
            h: typeof node.height === 'number' ? node.height : null,
          },
        }
      }
    } else {
      // All-frames mode: find which frame contains the node
      const result = findNodeInFrames(doc.children, nodeId)
      if (!result) return
      targetFrameId = result.frameId
      anchorMeta = {
        name: result.node.name ?? null,
        type: result.node.type,
        parentId: null,
        bbox: {
          x: typeof result.node.x === 'number' ? result.node.x : null,
          y: typeof result.node.y === 'number' ? result.node.y : null,
          w: typeof result.node.width === 'number' ? result.node.width : null,
          h: typeof result.node.height === 'number' ? result.node.height : null,
        },
      }
    }

    addCommentMutation.mutate({
      body,
      frameId: targetFrameId!,
      versionId,
      nodeId,
      pinXRatio,
      pinYRatio,
      anchorMeta,
    })
  }, [doc, frameId, versionId, addCommentMutation])

  const handleFocusComment = useCallback((commentId: string) => {
    const comment = commentList.find((c: any) => c.id === commentId)
    if (comment?.nodeId) {
      setFocusNodeId(`${comment.nodeId}__${Date.now()}`)
    }
  }, [commentList])

  return {
    commentPins,
    commentList,
    handleAddComment,
    handleFocusComment,
    focusNodeId,
  }
}
