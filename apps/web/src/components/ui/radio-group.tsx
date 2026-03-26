'use client';

import { cn } from '@/lib/cn';

interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function RadioGroup({ name, options, value, onChange, className }: RadioGroupProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <label
            key={option.value}
            className="flex cursor-pointer items-center gap-3 px-6 py-4 inset-shadow-border-b last:shadow-none"
          >
            <span
              className={cn(
                'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full',
                isSelected
                  ? 'bg-primary'
                  : 'inset-shadow-border-strong',
              )}
            >
              {isSelected && (
                <span className="h-2 w-2 rounded-full bg-white" />
              )}
            </span>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={isSelected}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <div className="min-w-0">
              <span className="font-sans text-sm font-medium text-foreground">{option.label}</span>
              {option.description && (
                <p className="m-0 mt-0.5 font-sans text-xs text-foreground-muted">{option.description}</p>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
}
