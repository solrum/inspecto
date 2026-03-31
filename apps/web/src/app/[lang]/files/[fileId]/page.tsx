'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { files as filesApi, comments as commentsApi } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { useViewerStore } from '@/stores/viewer';
import { PenViewer } from '@/components/pen-renderer';
import type { PenDocument, CommentPin } from '@/components/pen-renderer';
import { Spinner } from '@/components/ui/spinner';
import { Avatar } from '@/components/ui/avatar';
import { CommentsPanel } from '@/components/comments-panel';
import { Tabs } from '@/components/ui/tabs';
import { ChevronRight } from 'lucide-react';
import { LogoMark } from '@/components/ui/logo';
import { useT } from '@/components/dictionary-provider';
import { useLocalePath } from '@/hooks/use-locale-path';
import { getLastOrgId } from '@/hooks/use-last-org';


type Tab = 'design' | 'comments';

function findNodeInFrames(frames: any[], nodeId: string): { frameId: string; node: any } | null {
  for (const frame of frames) {
    if (frame.id === nodeId) return { frameId: frame.id, node: frame };
    const found = findNodeInChildren(frame.children ?? [], nodeId);
    if (found) return { frameId: frame.id, node: found };
  }
  return null;
}

function findNodeInChildren(children: any[], id: string): any | null {
  for (const child of children) {
    if (child.id === id) return child;
    if (child.children?.length) {
      const found = findNodeInChildren(child.children, id);
      if (found) return found;
    }
  }
  return null;
}

export default function FileViewerPage() {
  const { isAuthenticated } = useAuthGuard();
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileId = params.fileId as string;
  const { user } = useAuth();
  const t = useT('fileViewer');
  const tn = useT('nav');
  const lp = useLocalePath();

  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [focusNodeId, setFocusNodeId] = useState<string | undefined>(undefined);

  // Persisted viewer state — read once on mount, write without causing re-render
  const viewerStateRef = useRef(useViewerStore.getState().get(fileId));
  const setViewerState = useViewerStore((s) => s.set);
  const [activeTab, setActiveTabState] = useState<Tab>(() => (viewerStateRef.current.activeTab as Tab) ?? 'design');
  const setActiveTab = (tab: Tab) => { setActiveTabState(tab); setViewerState(fileId, { activeTab: tab }); };

  // Loading overlay — covers viewer while it restores state, then fades out
  const hasRestoredState = !!viewerStateRef.current.transform;
  const [showOverlay, setShowOverlay] = useState(hasRestoredState);
  useEffect(() => {
    if (!showOverlay) return;
    // Wait for PenViewer to mount + apply saved transform, then fade out
    const timer = setTimeout(() => setShowOverlay(false), 150);
    return () => clearTimeout(timer);
  }, [showOverlay]);

  // Stable callbacks for persist — do NOT trigger re-render
  const handleTransformChange = useCallback((t: { x: number; y: number; scale: number }) => {
    setViewerState(fileId, { transform: t });
  }, [fileId, setViewerState]);

  const handleSelectedFrameChange = useCallback((id: string) => {
    setViewerState(fileId, { selectedFrameId: id });
  }, [fileId, setViewerState]);

  const { data: fileData, isLoading } = useQuery({
    queryKey: ['file', fileId],
    queryFn: () => filesApi.get(fileId),
    enabled: isAuthenticated,
  });

  const currentVersion = fileData?.versions?.[0];

  const { data: penDocument, isLoading: isLoadingContent } = useQuery({
    queryKey: ['file-content', fileId, currentVersion?.id],
    queryFn: () => filesApi.getContent(fileId, currentVersion?.id),
    enabled: !!currentVersion?.id,
  });

  const { data: commentList = [] } = useQuery({
    queryKey: ['comments', fileId],
    queryFn: () => commentsApi.list(fileId),
    enabled: isAuthenticated && !!fileId,
  });

  const addCommentMutation = useMutation({
    mutationFn: (data: Parameters<typeof commentsApi.create>[1]) =>
      commentsApi.create(fileId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', fileId] });
    },
  });

  const handleAddComment = useCallback((nodeId: string, body: string, pinXRatio: number, pinYRatio: number) => {
    if (!penDocument) return;
    const doc = penDocument as PenDocument;
    const result = findNodeInFrames(doc.children, nodeId);
    if (!result) return;

    addCommentMutation.mutate({
      body,
      frameId: result.frameId,
      versionId: currentVersion?.id,
      nodeId,
      pinXRatio,
      pinYRatio,
      anchorMeta: {
        name: result.node.name ?? null,
        type: result.node.type,
        parentId: null,
        bbox: {
          x: typeof result.node.x === 'number' ? result.node.x : null,
          y: typeof result.node.y === 'number' ? result.node.y : null,
          w: typeof result.node.width === 'number' ? result.node.width : null,
          h: typeof result.node.height === 'number' ? result.node.height : null,
        },
      },
    });
  }, [penDocument, currentVersion?.id, addCommentMutation]);

  // Compute comment pins for all frames
  const commentPins = useMemo<CommentPin[]>(() => {
    if (!penDocument || !commentList.length) return [];
    const doc = penDocument as PenDocument;
    return commentList
      .filter((c: any) => !c.parentCommentId && (c.nodeId || (typeof c.pinXRatio === 'number' && typeof c.pinYRatio === 'number')))
      .map((c: any) => {
        // Find parent frame for this comment
        const frame = doc.children.find((f: any) => f.id === c.frameId) as any;
        const fw = frame ? (typeof frame.width === 'number' ? frame.width : 1) : 1;
        const fh = frame ? (typeof frame.height === 'number' ? frame.height : 1) : 1;
        const fx = frame ? (typeof frame.x === 'number' ? frame.x : 0) : 0;
        const fy = frame ? (typeof frame.y === 'number' ? frame.y : 0) : 0;
        return {
          id: c.id,
          nodeId: c.nodeId ?? null,
          fallbackDocX: typeof c.pinXRatio === 'number' ? fx + c.pinXRatio * fw : undefined,
          fallbackDocY: typeof c.pinYRatio === 'number' ? fy + c.pinYRatio * fh : undefined,
          anchorStatus: c.anchorStatus ?? 'active',
          resolved: !!c.resolved,
          authorName: c.authorName,
          body: c.body,
        };
      });
  }, [commentList, penDocument]);

  const handleClickPin = useCallback((commentId: string) => {
    setHighlightedId(commentId);
    setActiveTab('comments');
  }, []);

  // Click comment in panel → focus camera on its node
  const handleFocusComment = useCallback((commentId: string) => {
    setHighlightedId(commentId);
    const comment = commentList.find((c: any) => c.id === commentId);
    console.log('[FileViewer] handleFocusComment:', commentId, 'nodeId:', comment?.nodeId);
    if (comment?.nodeId) {
      setFocusNodeId(`${comment.nodeId}__${Date.now()}`);
    }
  }, [commentList]);

  if (!isAuthenticated) return null;

  if (isLoading || isLoadingContent) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner size={28} />
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'design', label: t('design') },
    { key: 'comments', label: t('comments') },
  ];

  const showComments = activeTab === 'comments';

  const customTopBar = (
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
        <span className="font-sans text-[13px] font-medium text-foreground">{fileData?.name}</span>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
        {tabs.map((tab) => (
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
        {user && <Avatar name={user.name ?? user.email ?? 'U'} />}
      </div>
    </header>
  );

  return (
    <div className="flex flex-col h-screen relative">
      {/* Loading overlay — covers viewer during state restore */}
      {showOverlay && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background transition-opacity duration-150 ease-out">
          <Spinner size={24} />
        </div>
      )}

      {penDocument ? (
        <>
          {/* TopBar spans full width */}
          {customTopBar}
          {/* Body: PenViewer (without its own topbar) + optional CommentsPanel */}
          <div className="flex flex-1 overflow-hidden min-h-0">
            <div className="flex-1 min-w-0 overflow-hidden">
            <PenViewer
              document={penDocument as PenDocument}
              config={{
                mode: 'all-frames',
                hideTopBar: true,
                hideInspector: showComments,
                canComment: true,
                onAddComment: handleAddComment,
                onNavigateFrame: (fid) => router.push(lp(`/files/${fileId}/${fid}`)),
              }}
              height="100%"
              savedTransform={viewerStateRef.current.transform}
              onTransformChange={handleTransformChange}
              defaultSelectedFrameId={viewerStateRef.current.selectedFrameId}
              onSelectedFrameChange={handleSelectedFrameChange}
              userName={user?.name ?? user?.email}
              focusNodeId={focusNodeId}
              commentPins={commentPins}
              onClickPin={handleClickPin}
            />
            </div>
            {showComments && (
              <CommentsPanel
                fileId={fileId}
                versionId={currentVersion?.id}
                onClose={() => setActiveTab('design')}
                highlightedId={highlightedId}
                onFocusComment={handleFocusComment}
              />
            )}
          </div>
        </>
      ) : (
        <>
          {customTopBar}
          <div className="flex-1 flex items-center justify-center">
            <Spinner size={24} />
          </div>
        </>
      )}

    </div>
  );
}


