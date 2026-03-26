'use client';

import { cn } from '@/lib/cn';

interface UnderlineTab {
  key: string;
  label: string;
}

interface UnderlineTabsProps {
  tabs: UnderlineTab[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}

export function UnderlineTabs({ tabs, activeKey, onChange, className }: UnderlineTabsProps) {
  return (
    <div className={cn('flex w-full inset-shadow-border-b', className)}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={cn(
              'cursor-pointer border-none bg-transparent px-4 py-2.5 font-sans text-sm transition',
              isActive
                ? 'font-medium text-primary shadow-[inset_0_-2px_0_0_var(--color-primary)]'
                : 'text-foreground-secondary hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
