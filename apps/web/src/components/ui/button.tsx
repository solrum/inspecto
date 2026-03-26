import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const variants = {
  primary: 'bg-primary text-primary-foreground',
  secondary: 'bg-background text-foreground inset-shadow-border',
  ghost: 'bg-transparent text-foreground-secondary',
  danger: 'bg-error text-primary-foreground',
  'danger-ghost': 'bg-transparent text-error',
} as const;

const sizes = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-5',
  lg: 'h-11 px-6',
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md border-none font-sans text-sm font-medium outline-none cursor-pointer transition-[opacity,filter]',
        'hover:opacity-90 active:opacity-80',
        'focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
