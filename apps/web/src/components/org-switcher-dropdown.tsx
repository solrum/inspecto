'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Check, Plus, Settings, User } from 'lucide-react';
import { orgs as orgsApi } from '@/lib/api';
import { useT } from '@/components/dictionary-provider';
import { useLocalePath } from '@/hooks/use-locale-path';
import { cn } from '@/lib/cn';

interface OrgSwitcherDropdownProps {
  currentOrgId: string;
  onClose: () => void;
  onCreateOrg: () => void;
}

function OrgAvatar({ name }: { name: string }) {
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary-light font-sans text-[10px] font-semibold text-primary">
      {initials}
    </div>
  );
}

export function OrgSwitcherDropdown({ currentOrgId, onClose, onCreateOrg }: OrgSwitcherDropdownProps) {
  const router = useRouter();
  const lp = useLocalePath();
  const t = useT('orgSwitcher');
  const ref = useRef<HTMLDivElement>(null);

  const { data: orgList = [] } = useQuery({
    queryKey: ['orgs'],
    queryFn: () => orgsApi.list(),
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  function switchOrg(orgId: string) {
    router.push(lp(`/org/${orgId}/overview`));
    onClose();
  }

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-lg bg-card py-1 shadow-lg inset-shadow-border"
    >
      {/* Org list */}
      {orgList.map((org: any) => {
        const isCurrent = org.id === currentOrgId;
        return (
          <button
            key={org.id}
            onClick={() => switchOrg(org.id)}
            className={cn(
              'flex w-full items-center gap-2.5 px-3 py-2 text-left transition',
              isCurrent
                ? 'bg-primary-light'
                : 'hover:bg-surface',
            )}
          >
            <OrgAvatar name={org.name} />
            <span className={cn('flex-1 truncate font-sans text-[13px] font-medium', isCurrent ? 'text-primary' : 'text-foreground')}>
              {org.name}
            </span>
            {isCurrent && <Check size={14} className="shrink-0 text-primary" />}
          </button>
        );
      })}

      {/* Personal Workspace */}
      <button className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-surface">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-elevated inset-shadow-border">
          <User size={12} className="text-foreground-secondary" />
        </div>
        <span className="flex-1 truncate font-sans text-[13px] font-medium text-foreground">
          {t('personalWorkspace')}
        </span>
      </button>

      <div className="my-1 h-px bg-border" />

      {/* Create new org */}
      <button
        onClick={() => { onClose(); onCreateOrg(); }}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-surface"
      >
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-elevated inset-shadow-border">
          <Plus size={12} className="text-foreground-secondary" />
        </div>
        <span className="font-sans text-[13px] font-medium text-foreground">
          {t('createNewOrg')}
        </span>
      </button>

      <div className="my-1 h-px bg-border" />

      {/* Settings */}
      <Link
        href={lp(`/org/${currentOrgId}/settings`)}
        onClick={onClose}
        className="flex items-center gap-2.5 px-3 py-2 transition hover:bg-surface"
      >
        <Settings size={14} className="shrink-0 text-foreground-muted" />
        <span className="font-sans text-[13px] text-foreground-secondary">
          {t('settings')}
        </span>
      </Link>
    </div>
  );
}
