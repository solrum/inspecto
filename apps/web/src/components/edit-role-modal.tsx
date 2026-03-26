'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Avatar } from '@/components/ui/avatar';

interface EditRoleModalProps {
  member: { name: string; email: string; avatarUrl?: string; role: string };
  roleOptions: { value: string; label: string }[];
  isPending?: boolean;
  title: string;
  subtitle: string;
  saveLabel: string;
  cancelLabel: string;
  roleLabel: string;
  onSave: (role: string) => void;
  onCancel: () => void;
}

export function EditRoleModal({
  member, roleOptions, isPending, title, subtitle, saveLabel, cancelLabel, roleLabel, onSave, onCancel,
}: EditRoleModalProps) {
  const [role, setRole] = useState(member.role);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onCancel(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-overlay" onClick={onCancel} />
      <div className="relative w-[420px] rounded-xl bg-card p-8 shadow-dialog">
        <div className="mb-6 flex flex-col gap-1.5">
          <h2 className="m-0 font-display text-xl font-semibold text-foreground">{title}</h2>
          <p className="m-0 font-sans text-sm text-foreground-secondary">{subtitle}</p>
        </div>

        <div className="mb-4 flex items-center gap-3 rounded-lg bg-surface p-3">
          <Avatar name={member.name} imageUrl={member.avatarUrl} size="md" />
          <div className="min-w-0">
            <p className="m-0 truncate font-sans text-sm font-medium text-foreground">{member.name}</p>
            <p className="m-0 truncate font-sans text-xs text-foreground-muted">{member.email}</p>
          </div>
        </div>

        <Select
          label={roleLabel}
          value={role}
          onChange={(e) => setRole(e.target.value)}
          options={roleOptions}
        />

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
          <Button onClick={() => onSave(role)} disabled={isPending || role === member.role}>
            {saveLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
