import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="mb-4 rounded-xl bg-primary-light p-4">
        <Icon size={28} className="text-primary" />
      </div>
      <h3 className="font-display text-sm font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 w-[280px] max-w-full text-center text-sm text-foreground-secondary">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
