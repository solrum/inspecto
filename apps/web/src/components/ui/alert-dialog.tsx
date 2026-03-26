'use client';

import { useEffect, type ReactNode } from 'react';
import { TriangleAlert, XCircle } from 'lucide-react';
import { Button } from './button';

interface AlertDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  description: string;
  variant?: 'confirm' | 'error';
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  details?: string;
  children?: ReactNode;
}

export function AlertDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  variant = 'confirm',
  confirmLabel,
  cancelLabel = 'Cancel',
  loading = false,
  details,
}: AlertDialogProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const isError = variant === 'error';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-overlay backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-[420px] animate-scale-in rounded-xl bg-card p-8 shadow-[0_8px_32px_rgba(0,0,0,0.15)]">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          {isError ? (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-error-light">
              <XCircle size={28} className="text-error" />
            </div>
          ) : (
            <TriangleAlert size={48} className="text-warning" />
          )}
        </div>

        {/* Text */}
        <div className="text-center">
          <h2 className="font-display text-xl font-bold text-foreground">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">{description}</p>
        </div>

        {/* Error details */}
        {details && (
          <div className="mt-4 rounded-md bg-surface p-3">
            <code className="text-xs text-foreground-secondary">{details}</code>
          </div>
        )}

        {/* Buttons */}
        <div className="mt-6 flex gap-3">
          <Button variant="secondary" className="flex-1" size="lg" onClick={onClose}>
            {cancelLabel}
          </Button>
          {onConfirm && (
            <Button
              variant={isError ? 'primary' : 'danger'}
              className="flex-1"
              size="lg"
              onClick={onConfirm}
              disabled={loading}
            >
              {loading
                ? isError ? 'Retrying...' : 'Processing...'
                : (confirmLabel ?? (isError ? 'Try Again' : 'Delete'))}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
