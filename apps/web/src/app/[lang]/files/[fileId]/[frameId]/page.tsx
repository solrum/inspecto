'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { useState, useMemo, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { files as filesApi } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { useAuthGuard } from '@/hooks/use-auth-guard'
import { useCommentPins } from '@/hooks/use-comment-pins'
import { PenViewer } from '@/components/pen-renderer'
import type { PenDocument, ViewerConfig } from '@/components/pen-renderer'
import { CommentsPanel } from '@/components/comments-panel'
import { Avatar } from '@/components/ui/avatar'
import { Spinner } from '@/components/ui/spinner'
import { ChevronRight } from 'lucide-react';
import { LogoMark } from '@/components/ui/logo';
import { useT } from '@/components/dictionary-provider'
import { useLocalePath } from '@/hooks/use-locale-path';
import { getLastOrgId } from '@/hooks/use-last-org';

type Tab = 'design' | 'comments'

export default function SingleFramePage() {
  const { isAuthenticated } = useAuthGuard()
  const params = useParams()
  const router = useRouter()
  const fileId = params.fileId as string
  const frameId = params.frameId as string
  const { user } = useAuth()
  const t = useT('fileViewer')
  const tn = useT('nav')
  const lp = useLocalePath()
  const [activeTab, setActiveTab] = useState<Tab>('design')
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

  // Frame node from document
  const currentFrame = useMemo(() => {
    if (!penDocument) return null
    return (penDocument as PenDocument).children.find(f => f.id === frameId) ?? null
  }, [penDocument, frameId])

  const {
    commentPins,
    commentList,
    handleAddComment,
    handleFocusComment,
    focusNodeId,
  } = useCommentPins({
    fileId,
    document: penDocument as PenDocument | undefined,
    versionId: currentVersion?.id,
    frameId,
    enabled: isAuthenticated,
  })

  const handleClickPin = useCallback((commentId: string) => {
    handleFocusComment(commentId)
    setActiveTab('comments')
  }, [handleFocusComment])


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
            focusNodeId={focusNodeId}
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
            onFocusComment={handleFocusComment}
          />
        )}
      </div>
    </div>
  )
}
