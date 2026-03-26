import { type InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/cn';

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  width?: number;
}

export function SearchInput({ className, width = 240, ...props }: SearchInputProps) {
  return (
    <div
      className={cn(
        'flex h-10 items-center gap-2 rounded-md bg-card px-3 inset-shadow-border',
        className,
      )}
      style={{ width }}
    >
      <Search size={16} className="shrink-0 text-foreground-muted" />
      <input
        type="text"
        className="flex-1 border-none bg-transparent font-sans text-sm text-foreground outline-none placeholder:text-foreground-muted"
        {...props}
      />
    </div>
  );
}
