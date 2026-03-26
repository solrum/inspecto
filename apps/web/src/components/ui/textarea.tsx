import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, id, className, ...props }, ref) => (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block font-sans text-[13px] font-medium text-foreground">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        className={cn(
          'flex w-full resize-none rounded-md bg-background px-3.5 py-2.5 font-sans text-sm leading-relaxed text-foreground outline-none',
          error ? 'inset-shadow-border-error' : 'inset-shadow-border',
          'placeholder:text-foreground-muted',
          'focus:shadow-[inset_0_0_0_1px_var(--color-primary),0_0_0_2px_rgba(124,58,237,0.2)]',
        )}
        {...props}
      />
      {error && <p className="mt-1 font-sans text-xs text-error">{error}</p>}
    </div>
  ),
);
Textarea.displayName = 'Textarea';
