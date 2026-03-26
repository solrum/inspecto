'use client';

import { cn } from '@/lib/cn';

interface Tab {
  key: string;
  label: string;
  badge?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeKey, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex items-center gap-1 rounded-lg bg-surface p-1', className)}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={cn(
              'flex items-center gap-1.5 rounded-md border-none px-4 py-1.5 font-sans text-[13px] cursor-pointer transition',
              isActive
                ? 'bg-primary-light font-medium text-primary'
                : 'bg-transparent text-foreground-secondary hover:text-foreground',
            )}
          >
            {tab.label}
            {tab.badge != null && tab.badge > 0 && (
              <span className={cn(
                'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold',
                isActive ? 'bg-primary text-primary-foreground' : 'bg-border text-foreground-muted',
              )}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
