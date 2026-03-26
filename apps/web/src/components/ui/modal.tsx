'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

/**
 * Modal — engine-accurate CSS.
 *
 * Overlay: bg=var(--color-overlay)
 * Card: bg=var(--color-card), borderRadius=16px (--radius-xl),
 *        boxShadow=inset 0 0 0 1px var(--color-border), 0px 8px 24px -4px var(--color-shadow)
 */

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[480px] rounded-xl bg-card inset-shadow-border shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 inset-shadow-border-b">
          <h2 className="font-display text-base font-semibold text-foreground">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="cursor-pointer border-none bg-transparent p-1 rounded-md text-foreground-muted"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
