import { cn } from '@/lib/cn';

/**
 * Badge — engine-accurate CSS from Component Library.
 *
 * Default: bg=var(--color-surface), borderRadius=9999px,
 *          padding=4px 10px, boxShadow=inset 0 0 0 1px var(--color-border)
 *          text: Inter 12px 500, color=var(--color-foreground-secondary)
 *
 * Primary: bg=var(--color-primary-light), no stroke
 *          text: color=var(--color-primary)
 */

const variantClasses: Record<string, string> = {
  default: 'bg-surface text-foreground-secondary inset-shadow-border',
  primary: 'bg-primary-light text-primary',
  success: 'bg-success-light text-success',
  warning: 'bg-warning-light text-warning',
  danger: 'bg-error-light text-error',
  info: 'bg-info-light text-info',
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: keyof typeof variantClasses;
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full px-2.5 py-1 font-sans text-xs font-medium leading-none',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
