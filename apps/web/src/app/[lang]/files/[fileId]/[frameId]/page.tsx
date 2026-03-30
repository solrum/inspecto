'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { useState, useMemo, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { files as filesApi, comments as commentsApi } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { useAuthGuard } from '@/hooks/use-auth-guard'
import { PenViewer } from '@/components/pen-renderer'
import type { PenDocument, ViewerConfig, CommentPin } from '@/components/pen-renderer'
import { CommentsPanel } from '@/components/comments-panel'
import { Avatar } from '@/components/ui/avatar'
import { Spinner } from '@/components/ui/spinner'
import { ChevronRight } from 'lucide-react';
import { LogoMark } from '@/components/ui/logo';
import { useT } from '@/components/dictionary-provider'
import { useLocalePath } from '@/hooks/use-locale-path';
import { getLastOrgId } from '@/hooks/use-last-org';

type Tab = 'design' | 'comments'

// Recursively find a node by id, returning it with absolute position within the frame
function findNodeById(children: any[], id: string, offsetX = 0, offsetY = 0): any | null {
  for (const child of children) {
    const cx = offsetX + (typeof child.x === 'number' ? child.x : 0)
    const cy = offsetY + (typeof child.y === 'number' ? child.y : 0)
    if (child.id === id) {
      return { ...child, _absX: cx, _absY: cy }
    }
    if (child.children?.length) {
      const found = findNodeById(child.children, id, cx, cy)
      if (found) return found
    }
  }
  return null
}

export default function SingleFramePage() {
  const { isAuthenticated } = useAuthGuard()
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const fileId = params.fileId as string
  const frameId = params.frameId as string
  const { user } = useAuth()
  const t = useT('fileViewer')
  const tn = useT('nav')
  const lp = useLocalePath()
  const [activeTab, setActiveTab] = useState<Tab>('design')
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const showComments = activeTab === 'comments'

  const { data: fileData } = useQuery({
    queryKey: ['file', fileId],
    queryFn: () => filesApi.get(fileId),
    enabled: isAuthenticated,
  })

  const currentVersion = fileData?.versions?.[0]

  const { data: penDocument, isLoading } = useQuery({
    queryKey: ['file-content', fileId, currentVersion?.id],
    queryFn: () => filesApi.getContent(fileId, currentVersion?.id),
    enabled: !!currentVersion?.id,
  })

  const { data: commentList = [] } = useQuery({
    queryKey: ['comments', fileId, frameId, currentVersion?.id],
    queryFn: () => commentsApi.list(fileId, { frameId, versionId: currentVersion?.id }),
    enabled: isAuthenticated && !!fileId,
  })

  // Frame node from document
  const currentFrame = useMemo(() => {
    if (!penDocument) return null
    return (penDocument as PenDocument).children.find(f => f.id === frameId) ?? null
  }, [penDocument, frameId])

  // Compute comment pins — position resolved from DOM via nodeId, with ratio-based fallback
  const commentPins = useMemo<CommentPin[]>(() => {
    if (!currentFrame || !commentList.length) return []
    const frame = currentFrame as any
    const fw = typeof frame.width === 'number' ? frame.width : 1
    const fh = typeof frame.height === 'number' ? frame.height : 1
    const fx = typeof frame.x === 'number' ? frame.x : 0
    const fy = typeof frame.y === 'number' ? frame.y : 0

    return commentList
      .filter((c: any) => !c.parentCommentId && (c.nodeId || (typeof c.pinXRatio === 'number' && typeof c.pinYRatio === 'number')))
      .map((c: any) => ({
        id: c.id,
        nodeId: c.nodeId ?? null,
        // Fallback: ratio-based position (used when nodeId element not found in DOM)
        fallbackDocX: typeof c.pinXRatio === 'number' ? fx + c.pinXRatio * fw : undefined,
        fallbackDocY: typeof c.pinYRatio === 'number' ? fy + c.pinYRatio * fh : undefined,
        anchorStatus: c.anchorStatus ?? 'active',
        resolved: !!c.resolved,
        authorName: c.authorName,
        body: c.body,
      }))
  }, [commentList, currentFrame])

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: (data: Parameters<typeof commentsApi.create>[1]) =>
      commentsApi.create(fileId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', fileId] })
    },
  })

  // Called by CanvasView when user submits a comment on a node
  // pinXRatio/pinYRatio are DOM-computed by CanvasView relative to frame
  const handleAddComment = useCallback((nodeId: string, body: string, pinXRatio: number, pinYRatio: number) => {
    if (!penDocument || !currentFrame) return

    const node = findNodeById((currentFrame as any).children ?? [], nodeId)

    addCommentMutation.mutate({
      body,
      frameId,
      versionId: currentVersion?.id,
      nodeId,
      pinXRatio,
      pinYRatio,
      anchorMeta: node ? {
        name: node.name ?? null,
        type: node.type,
        parentId: null,
        bbox: {
          x: node._absX ?? null,
          y: node._absY ?? null,
          w: typeof node.width === 'number' ? node.width : null,
          h: typeof node.height === 'number' ? node.height : null,
        },
      } : undefined,
    })
  }, [penDocument, currentFrame, frameId, currentVersion?.id, addCommentMutation])

  // Pin click: highlight comment in panel + switch to comments tab
  const handleClickPin = useCallback((commentId: string) => {
    setHighlightedId(commentId)
    setActiveTab('comments')
  }, [])

  // Keyboard: Esc back
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') router.push(lp(`/files/${fileId}`))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [fileId, router, lp])

  const viewerConfig = useMemo<ViewerConfig>(() => ({
    mode: 'single-frame',
    frameId,
    hideTopBar: true,
    hideInspector: showComments,
    canComment: true,
    onAddComment: handleAddComment,
    onNavigateFrame: (id) => router.replace(lp(`/files/${fileId}/${id}`)),
  }), [frameId, fileId, router, lp, showComments, handleAddComment])

  if (!isAuthenticated || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner size={28} />
      </div>
    )
  }

  if (!penDocument || !currentFrame) {
    return (
      <div className="flex h-screen items-center justify-center text-foreground-secondary">
        Frame not found
      </div>
    )
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'design', label: t('design') },
    { key: 'comments', label: t('comments') },
  ]

  const topBar = (
    <header className="relative flex items-center justify-between h-[52px] px-5 bg-surface inset-shadow-border-b shrink-0">
      {/* Breadcrumbs */}
      <div className="relative z-10 flex items-center gap-2">
        <a href="/" className="flex items-center">
          <LogoMark size="sm" />
        </a>
        <span className="font-sans text-[13px] text-foreground-muted">/</span>
        <Link
          href={lp(`/org/${fileData?.project?.orgId ?? getLastOrgId() ?? ''}/projects`)}
          className="font-sans text-[13px] text-foreground-secondary no-underline"
        >
          {tn('projects')}
        </Link>
        <ChevronRight size={14} className="text-foreground-muted shrink-0" />
        {fileData?.project?.name && (
          <>
            <Link href={lp(`/projects/${fileData.project.id}`)} className="font-sans text-[13px] text-foreground-secondary no-underline">{fileData.project.name}</Link>
            <ChevronRight size={14} className="text-foreground-muted shrink-0" />
          </>
        )}
        <Link href={lp(`/files/${fileId}`)} className="font-sans text-[13px] text-foreground-secondary no-underline">{fileData?.name}</Link>
        <ChevronRight size={14} className="text-foreground-muted shrink-0" />
        <span className="font-sans text-[13px] font-medium text-foreground">{(currentFrame as any).name ?? frameId}</span>
      </div>

      {/* Tabs — absolute center */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={activeTab === tab.key ? 'flex items-center px-4 py-2 rounded-t-md bg-primary-light font-sans text-[13px] font-medium text-primary border-none cursor-pointer' : 'flex items-center px-4 py-2 bg-transparent font-sans text-[13px] text-foreground-secondary border-none cursor-pointer'}>
            {tab.label}
            {tab.key === 'comments' && commentList.length > 0 && (
              <span className="ml-1.5 px-1.5 py-px rounded-full bg-primary-light text-[10px] font-semibold text-primary">
                {commentList.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Link href={lp(`/files/${fileId}`)} className="flex items-center gap-1.5 font-sans text-[13px] font-medium text-primary no-underline">{t('allFrames')}</Link>
        {user && <Avatar name={user.name ?? user.email ?? 'U'} />}
      </div>
    </header>
  )

  return (
    <div className="flex flex-col h-screen">
      {topBar}
      <div className="flex flex-1 overflow-hidden min-h-0">
        <div className="flex-1 min-w-0 overflow-hidden">
          <PenViewer
            document={penDocument as PenDocument}
            config={viewerConfig}
            height="100%"
            userName={user?.name ?? user?.email}
            commentPins={commentPins}
            onClickPin={handleClickPin}
          />
        </div>
        {showComments && (
          <CommentsPanel
            fileId={fileId}
            frameId={frameId}
            versionId={currentVersion?.id}
            onClose={() => setActiveTab('design')}
            highlightedId={highlightedId}
            onFocusComment={(id) => setHighlightedId(id)}
          />
        )}
      </div>
    </div>
  )
}

