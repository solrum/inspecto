import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface FormCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function FormCard({ title, subtitle, children, actions, className }: FormCardProps) {
  return (
    <div className={cn('w-[520px] max-w-full rounded-lg bg-card p-8 inset-shadow-border shadow-sm', className)}>
      <div className="mb-6 flex flex-col gap-1.5">
        <h2 className="m-0 font-display text-[22px] font-semibold text-foreground">{title}</h2>
        {subtitle && (
          <p className="m-0 font-sans text-sm text-foreground-secondary">{subtitle}</p>
        )}
      </div>
      <div className="flex flex-col gap-5">{children}</div>
      {actions && (
        <div className="mt-6 flex items-center justify-end gap-3">{actions}</div>
      )}
    </div>
  );
}
