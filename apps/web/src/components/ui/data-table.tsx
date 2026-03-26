'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  width?: string | number;
  headerClassName?: string;
  render: (item: T, index: number) => ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (item: T, index: number) => string;
  className?: string;
}

export function DataTable<T>({ columns, data, rowKey, className }: DataTableProps<T>) {
  return (
    <div className={cn('overflow-hidden rounded-lg inset-shadow-border', className)}>
      {/* Header */}
      <div className="flex items-center bg-surface px-5 py-3 inset-shadow-border-b">
        {columns.map((col) => (
          <div
            key={col.key}
            className={cn('font-sans text-xs font-semibold text-foreground-secondary', col.headerClassName)}
            style={col.width ? { width: col.width, flexShrink: 0 } : { flex: 1 }}
          >
            {col.header}
          </div>
        ))}
      </div>

      {/* Rows */}
      {data.map((item, i) => (
        <div
          key={rowKey(item, i)}
          className={cn(
            'flex items-center px-5 py-3.5',
            i % 2 === 1 && 'bg-surface',
            i < data.length - 1 && 'inset-shadow-border-b',
          )}
        >
          {columns.map((col) => (
            <div
              key={col.key}
              style={col.width ? { width: col.width, flexShrink: 0 } : { flex: 1 }}
            >
              {col.render(item, i)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
