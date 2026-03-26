'use client';

import { useEffect } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const ROLE_VARIANT: Record<string, 'primary' | 'success' | 'default'> = {
  admin: 'primary',
  member: 'success',
  viewer: 'default',
};

interface MemberProfileModalProps {
  member: {
    name: string;
    email: string;
    avatarUrl?: string;
    role: string;
    joinedAt?: string;
  };
  title: string;
  joinedLabel: string;
  closeLabel: string;
  onClose: () => void;
}

export function MemberProfileModal({ member, title, joinedLabel, closeLabel, onClose }: MemberProfileModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const joinedDate = member.joinedAt
    ? new Date(member.joinedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-overlay" onClick={onClose} />
      <div className="relative w-[400px] rounded-xl bg-card p-8 shadow-dialog">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 cursor-pointer rounded-md border-none bg-transparent p-1 text-foreground-muted hover:text-foreground"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center gap-4">
          <Avatar name={member.name} imageUrl={member.avatarUrl} size="lg" />
          <div className="flex flex-col items-center gap-1">
            <h2 className="m-0 font-display text-lg font-semibold text-foreground">{member.name}</h2>
            <p className="m-0 font-sans text-sm text-foreground-secondary">{member.email}</p>
          </div>
          <Badge variant={ROLE_VARIANT[member.role] ?? 'default'}>{member.role}</Badge>
          {joinedDate && (
            <p className="m-0 font-sans text-xs text-foreground-muted">
              {joinedLabel} {joinedDate}
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-center">
          <Button variant="secondary" onClick={onClose}>{closeLabel}</Button>
        </div>
      </div>
    </div>
  );
}
