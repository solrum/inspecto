import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface SettingsSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
  danger?: boolean;
}

export function SettingsSection({ title, children, className, danger }: SettingsSectionProps) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <h2
        className={cn(
          'font-sans text-sm font-semibold uppercase tracking-wide',
          danger ? 'text-error' : 'text-foreground-secondary',
        )}
      >
        {title}
      </h2>
      <div
        className={cn(
          'rounded-lg bg-card p-5',
          danger ? 'inset-shadow-border-error' : 'inset-shadow-border',
        )}
      >
        {children}
      </div>
    </div>
  );
}
