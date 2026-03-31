'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { comments as commentsApi } from '@/lib/api';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { MessageSquare, CheckCircle2, AlertCircle, AlertTriangle, Sparkles } from 'lucide-react';
import { useT } from '@/components/dictionary-provider';

interface CommentsPanelProps {
  fileId: string;
  frameId?: string;
  versionId?: string;
  onClose?: () => void;
  /** Called when user clicks a comment — canvas scrolls to pin */
  onFocusComment?: (commentId: string) => void;
}

type Filter = 'all' | 'open' | 'resolved';

const ANCHOR_STATUS_ICONS = {
  active:        { color: 'text-primary',            Icon: CheckCircle2  },
  moved:         { color: 'text-warning',            Icon: AlertTriangle },
  fuzzy_matched: { color: 'text-info', Icon: Sparkles },
  orphaned:      { color: 'text-foreground-muted',   Icon: AlertCircle   },
} as const;

const ANCHOR_STATUS_KEYS = {
  active: 'anchorActive',
  moved: 'anchorMoved',
  fuzzy_matched: 'anchorSimilar',
  orphaned: 'anchorDeleted',
} as const;

export function CommentsPanel({
  fileId,
  frameId,
  versionId,
  onClose,
  onFocusComment,
}: CommentsPanelProps) {
  const queryClient = useQueryClient();
  const t = useT('comments');
  const [newComment, setNewComment] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const { data: commentList = [] } = useQuery({
    queryKey: ['comments', fileId, frameId, versionId],
    queryFn: () => commentsApi.list(fileId, { frameId, versionId }),
    enabled: !!fileId,
  });

  const addComment = useMutation({
    mutationFn: (body: string) =>
      commentsApi.create(fileId, { body, frameId, versionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', fileId] });
      setNewComment('');
    },
  });

  const resolveComment = useMutation({
    mutationFn: (id: string) => commentsApi.resolve(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', fileId] }),
  });

  const filtered = commentList.filter((c: any) => {
    if (filter === 'open') return !c.resolved;
    if (filter === 'resolved') return c.resolved;
    return true;
  });

  const topLevelComments = filtered.filter((c: any) => !c.parentCommentId);

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: t('all') },
    { key: 'open', label: t('open') },
    { key: 'resolved', label: t('resolved') },
  ];

  return (
    <div className="flex h-full w-[340px] shrink-0 flex-col bg-card inset-shadow-border-l">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between px-5 py-4 inset-shadow-border-b">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-foreground" />
          <span className="font-display text-[15px] font-semibold text-foreground">
            {t('title')}
          </span>
          {commentList.length > 0 && (
            <span className="rounded-full bg-primary-light px-2 py-0.5 font-sans text-[11px] font-semibold text-primary">
              {commentList.length}
            </span>
          )}
          {frameId && (
            <span className="rounded-full bg-surface px-2 py-0.5 font-sans text-[11px] text-foreground-secondary">
              {t('thisFrame')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'cursor-pointer border-none rounded-sm px-2.5 py-1 font-sans text-[11px]',
                filter === f.key
                  ? 'bg-primary-light font-medium text-primary'
                  : 'bg-transparent font-normal text-foreground-secondary',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto">
        {topLevelComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-light">
              <MessageSquare size={20} className="text-primary" />
            </div>
            <span className="font-sans text-sm font-medium text-foreground">{t('noComments')}</span>
            <span className="mt-1 font-sans text-[13px] text-foreground-muted">
              {frameId ? t('addCommentFrame') : t('addCommentDesign')}
            </span>
          </div>
        ) : (
          topLevelComments.map((comment: any) => {
            const replies = filtered.filter((c: any) => c.parentCommentId === comment.id);
            return (
              <div
                key={comment.id}
                className="flex cursor-pointer flex-col gap-2.5 px-5 py-4 inset-shadow-border-b transition-colors duration-100 hover:bg-surface"
                onClick={() => onFocusComment?.(comment.id)}
              >
                <CommentItem
                  comment={comment}
                  onResolve={() => resolveComment.mutate(comment.id)}
                />
                {replies.map((reply: any) => (
                  <div key={reply.id} className="pl-9">
                    <CommentItem comment={reply} />
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 bg-card px-5 py-4 inset-shadow-border-l">
        <div className="flex flex-col gap-2 rounded-md bg-background p-2.5 px-3 inset-shadow-border">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && newComment.trim()) {
                addComment.mutate(newComment.trim());
              }
            }}
            placeholder={frameId ? t('commentPlaceholderFrame') : t('commentPlaceholderDesign')}
            rows={3}
            className="w-full resize-none border-none bg-transparent font-sans text-[13px] leading-normal text-foreground outline-none"
          />
          <div className="flex items-center justify-end">
            <Button
              size="sm"
              onClick={() => { if (newComment.trim()) addComment.mutate(newComment.trim()); }}
              disabled={!newComment.trim() || addComment.isPending}
            >
              <MessageSquare size={12} /> {t('commentBtn')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentItem({ comment, onResolve }: { comment: any; onResolve?: () => void }) {
  const t = useT('comments');
  const statusInfo = comment.anchorStatus
    ? ANCHOR_STATUS_ICONS[comment.anchorStatus as keyof typeof ANCHOR_STATUS_ICONS]
    : null;
  const statusLabelKey = comment.anchorStatus
    ? ANCHOR_STATUS_KEYS[comment.anchorStatus as keyof typeof ANCHOR_STATUS_KEYS]
    : null;

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar name={comment.authorName ?? comment.authorId ?? 'U'} size="sm" />
          <span className="font-sans text-[13px] font-semibold text-foreground">
            {comment.authorName ?? 'User'}
          </span>
          <span className="font-sans text-[11px] text-foreground-muted">
            {formatRelative(comment.createdAt)}
          </span>
        </div>
        {comment.resolved && (
          <CheckCircle2 size={14} className="text-success" />
        )}
      </div>

      {/* Node anchor tag */}
      {comment.nodeId && comment.anchorMeta && (
        <div className="inline-flex items-center gap-1.5 self-start rounded-sm bg-surface px-2 py-0.5">
          {statusInfo && (
            <statusInfo.Icon size={11} className={cn(statusInfo.color, 'shrink-0')} />
          )}
          <span className="font-sans text-[11px] font-medium text-primary">
            {comment.anchorMeta.name ?? comment.nodeId}
          </span>
          {statusInfo && statusLabelKey && comment.anchorStatus !== 'active' && (
            <span className={cn('font-sans text-[10px]', statusInfo.color)}>
              · {t(statusLabelKey)}
            </span>
          )}
        </div>
      )}

      {/* Body */}
      <p className={cn(
        'm-0 font-sans text-[13px] leading-normal',
        comment.resolved ? 'text-foreground-muted line-through' : 'text-foreground',
      )}>
        {comment.body}
      </p>

      {/* Actions */}
      {!comment.resolved && onResolve && (
        <div className="flex items-center gap-3">
          <button
            className="cursor-pointer border-none bg-transparent p-0 font-sans text-[11px] font-medium text-foreground-muted"
            onClick={(e) => { e.stopPropagation(); onResolve(); }}
          >
            {t('resolve')}
          </button>
        </div>
      )}
    </div>
  );
}

function formatRelative(dateStr: string) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return new Date(dateStr).toLocaleDateString();
}
