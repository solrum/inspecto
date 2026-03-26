'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { notifications } from '@/lib/api';
import { Avatar } from '@/components/ui/avatar';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/cn';

const LABELS = {
  notifications: 'Notifications',
  markAllRead: 'Mark all read',
  noNotifications: 'No notifications',
  noNotificationsDesc: 'You\'re all caught up.',
} as const;

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const { isAuthenticated } = useAuthGuard();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, right: 0 });

  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notifications.unreadCount(),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const { data: notifList = [] } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => notifications.list({ limit: 20 }),
    enabled: isAuthenticated && open,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notifications.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => notifications.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (triggerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  function handleToggle() {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setOpen((prev) => !prev);
  }

  const count = unreadData?.count ?? 0;

  return (
    <>
      <button
        ref={triggerRef}
        onClick={handleToggle}
        className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-foreground-secondary transition hover:text-foreground"
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-error px-1 font-sans text-[10px] font-bold text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && createPortal(
        <div
          className="fixed z-50 w-[380px] rounded-lg bg-card shadow-dialog inset-shadow-border animate-scale-in"
          style={{ top: coords.top, right: coords.right }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 inset-shadow-border-b">
            <h3 className="m-0 font-display text-sm font-semibold text-foreground">
              {LABELS.notifications}
            </h3>
            {count > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="flex cursor-pointer items-center gap-1 border-none bg-transparent font-sans text-xs font-medium text-primary"
              >
                <CheckCheck size={14} /> {LABELS.markAllRead}
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifList.length === 0 ? (
              <div className="flex flex-col items-center gap-1 py-10">
                <Bell size={24} className="text-foreground-muted" />
                <p className="m-0 font-sans text-sm font-medium text-foreground-muted">{LABELS.noNotifications}</p>
                <p className="m-0 font-sans text-xs text-foreground-muted">{LABELS.noNotificationsDesc}</p>
              </div>
            ) : (
              notifList.map((n: any) => (
                <div
                  key={n.id}
                  className={cn(
                    'flex cursor-pointer gap-3 px-4 py-3 transition hover:bg-surface',
                    !n.read && 'bg-primary-light/30',
                  )}
                  onClick={() => { if (!n.read) markRead.mutate(n.id); }}
                >
                  <Avatar name={n.actorName ?? '?'} imageUrl={n.actorAvatarUrl} size="sm" className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="m-0 font-sans text-[13px] font-medium text-foreground">{n.title}</p>
                    <p className="m-0 mt-0.5 truncate font-sans text-xs text-foreground-muted">{n.body}</p>
                    <p className="m-0 mt-1 font-sans text-[11px] text-foreground-muted">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.read && (
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
