'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import type { LucideIcon } from 'lucide-react';

interface DropdownMenuItem {
  key: string;
  label: string;
  icon?: LucideIcon;
  danger?: boolean;
  onClick: () => void;
}

interface DropdownMenuDivider {
  key: string;
  type: 'divider';
}

type DropdownMenuEntry = DropdownMenuItem | DropdownMenuDivider;

interface DropdownMenuProps {
  trigger: ReactNode;
  items: DropdownMenuEntry[];
  align?: 'left' | 'right';
  className?: string;
}

function isDivider(entry: DropdownMenuEntry): entry is DropdownMenuDivider {
  return 'type' in entry && entry.type === 'divider';
}

export function DropdownMenu({ trigger, items, align = 'right', className }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

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
      setCoords({
        top: rect.bottom + 4,
        left: align === 'right' ? rect.right : rect.left,
      });
    }
    setOpen((prev) => !prev);
  }

  return (
    <>
      <div ref={triggerRef} onClick={handleToggle} className={cn('inline-flex', className)}>
        {trigger}
      </div>
      {open &&
        createPortal(
          <div
            className="fixed z-50 min-w-[200px] rounded-lg bg-card py-1 shadow-lg inset-shadow-border animate-scale-in"
            style={{
              top: coords.top,
              ...(align === 'right'
                ? { right: window.innerWidth - coords.left }
                : { left: coords.left }),
            }}
          >
            {items.map((entry) =>
              isDivider(entry) ? (
                <div key={entry.key} className="my-1 h-px bg-border" />
              ) : (
                <button
                  key={entry.key}
                  onClick={() => {
                    setOpen(false);
                    entry.onClick();
                  }}
                  className={cn(
                    'flex w-full cursor-pointer items-center gap-2.5 border-none bg-transparent px-3.5 py-2.5 font-sans text-[13px] font-medium transition',
                    entry.danger
                      ? 'text-error hover:bg-error-light'
                      : 'text-foreground hover:bg-surface',
                  )}
                >
                  {entry.icon && <entry.icon size={16} className={entry.danger ? 'text-error' : 'text-foreground-secondary'} />}
                  {entry.label}
                </button>
              ),
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
