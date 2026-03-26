import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, id, className, ...props }, ref) => (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block font-sans text-[13px] font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={id}
          className={cn(
            'flex h-11 w-full appearance-none items-center rounded-md bg-background pr-10 pl-3.5 font-sans text-sm text-foreground outline-none',
            error ? 'inset-shadow-border-error' : 'inset-shadow-border',
            'focus:shadow-[inset_0_0_0_1px_var(--color-primary),0_0_0_2px_rgba(124,58,237,0.2)]',
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-foreground-muted"
        />
      </div>
      {error && <p className="mt-1 font-sans text-xs text-error">{error}</p>}
    </div>
  ),
);
Select.displayName = 'Select';
