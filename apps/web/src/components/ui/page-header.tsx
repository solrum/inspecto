import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="flex flex-col gap-1 min-w-0">
        <h1 className="m-0 font-display text-[28px] font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="m-0 font-sans text-sm text-foreground-secondary leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
