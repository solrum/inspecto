'use client';

import { TriangleAlert } from 'lucide-react';

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-[420px] max-w-full flex-col items-center gap-6 rounded-xl bg-card p-8 shadow-xl"
      >
        <TriangleAlert size={48} className="text-warning" />

        <div className="flex flex-col items-center gap-2">
          <h2 className="m-0 text-center font-display text-xl font-bold text-foreground">
            {title}
          </h2>
          <p className="m-0 text-center font-sans text-sm leading-normal text-foreground-secondary">
            {description}
          </p>
        </div>

        <div className="flex w-full gap-3">
          <button
            onClick={onCancel}
            className="flex-1 cursor-pointer rounded-md border border-border-strong bg-transparent px-4 py-2.5 font-sans text-sm font-medium text-foreground transition hover:bg-surface"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 cursor-pointer rounded-md border-none bg-error px-4 py-2.5 font-sans text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
