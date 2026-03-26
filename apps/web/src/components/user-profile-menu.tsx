'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, LifeBuoy, LogOut } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { useT } from '@/components/dictionary-provider';
import { useLocalePath } from '@/hooks/use-locale-path';

interface UserProfileMenuProps {
  orgId: string;
  user: { name: string; email?: string; avatarUrl?: string } | null;
  onClose: () => void;
  onLogout: () => void;
}

export function UserProfileMenu({ orgId, user, onClose, onLogout }: UserProfileMenuProps) {
  const lp = useLocalePath();
  const t = useT('profileMenu');
  const tCommon = useT('common');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const name = user?.name ?? 'User';
  const email = user?.email ?? '';

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 z-50 mb-1 w-full overflow-hidden rounded-lg bg-card shadow-lg inset-shadow-border"
    >
      {/* User info */}
      <div className="flex items-center gap-3 px-3 py-3">
        <Avatar name={name} imageUrl={user?.avatarUrl} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-sans text-[13px] font-semibold text-foreground">{name}</p>
          <p className="truncate font-sans text-xs text-foreground-muted">{email}</p>
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Account Settings */}
      <Link
        href={lp(`/org/${orgId}/account-settings`)}
        onClick={onClose}
        className="flex items-center gap-2.5 px-3 py-2 transition hover:bg-surface"
      >
        <User size={14} className="shrink-0 text-foreground-muted" />
        <span className="font-sans text-[13px] text-foreground">{t('accountSettings')}</span>
      </Link>

      {/* Help & Support */}
      <Link
        href={lp(`/org/${orgId}/help`)}
        onClick={onClose}
        className="flex items-center gap-2.5 px-3 py-2 transition hover:bg-surface"
      >
        <LifeBuoy size={14} className="shrink-0 text-foreground-muted" />
        <span className="font-sans text-[13px] text-foreground">{t('helpSupport')}</span>
      </Link>

      <div className="h-px bg-border" />

      {/* Sign out */}
      <button
        onClick={() => { onClose(); onLogout(); }}
        className="flex w-full items-center gap-2.5 border-none bg-transparent px-3 py-2 text-left transition hover:bg-surface"
      >
        <LogOut size={14} className="shrink-0 text-error" />
        <span className="cursor-pointer font-sans text-[13px] text-error">{tCommon('signOut')}</span>
      </button>
    </div>
  );
}
