import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, id, className, ...props }, ref) => (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block font-sans text-[13px] font-medium text-foreground">
          {label}
        </label>
      )}
      {icon ? (
        <div
          className={cn(
            'flex h-11 w-full items-center gap-2.5 rounded-md bg-background px-3.5',
            error
              ? 'inset-shadow-border-error'
              : 'inset-shadow-border',
            'focus-within:shadow-[inset_0_0_0_1px_var(--color-primary),0_0_0_2px_rgba(124,58,237,0.2)]',
          )}
        >
          <span className="shrink-0 text-foreground-muted">{icon}</span>
          <input
            ref={ref}
            id={id}
            className="h-full flex-1 border-none bg-transparent font-sans text-sm text-foreground outline-none placeholder:text-foreground-muted"
            {...props}
          />
        </div>
      ) : (
        <input
          ref={ref}
          id={id}
          className={cn(
            'flex h-11 w-full items-center rounded-md bg-background px-3.5 font-sans text-sm text-foreground outline-none',
            error
              ? 'inset-shadow-border-error'
              : 'inset-shadow-border',
            'placeholder:text-foreground-muted',
            'focus:shadow-[inset_0_0_0_1px_var(--color-primary),0_0_0_2px_rgba(124,58,237,0.2)]',
          )}
          {...props}
        />
      )}
      {error && (
        <p className="mt-1 font-sans text-xs text-error">{error}</p>
      )}
    </div>
  ),
);
Input.displayName = 'Input';
