'use client';

import { cn } from '@/lib/cn';
import {
  Frame,
  Type,
  Circle,
  Square,
  Layers,
  Image,
  Minus,
  Pentagon,
  Spline,
  StickyNote,
  Sparkles,
  BookOpen,
  Smile,
  Search,
} from 'lucide-react';
import { useState } from 'react';
import { useT } from '@/components/dictionary-provider';

const TYPE_ICONS: Record<string, typeof Frame> = {
  frame: Frame,
  text: Type,
  ellipse: Circle,
  rectangle: Square,
  group: Layers,
  ref: Image,
  line: Minus,
  polygon: Pentagon,
  path: Spline,
  note: StickyNote,
  prompt: Sparkles,
  context: BookOpen,
  icon_font: Smile,
};

const TYPE_COLORS: Record<string, string> = {
  frame: 'text-blue-500',
  text: 'text-amber-500',
  ellipse: 'text-violet-500',
  rectangle: 'text-emerald-500',
  group: 'text-orange-500',
  ref: 'text-cyan-500',
};

interface NodeSummaryItem {
  id: string;
  name: string | null;
  type: string;
}

interface NodeTreeProps {
  nodes: NodeSummaryItem[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  commentCounts?: Record<string, number>;
}

export function NodeTree({ nodes, selectedNodeId, onSelectNode, commentCounts = {} }: NodeTreeProps) {
  const t = useT('nodeTree');
  const [search, setSearch] = useState('');

  const filtered = search
    ? nodes.filter(
        (n) =>
          (n.name ?? n.id).toLowerCase().includes(search.toLowerCase()) ||
          n.type.toLowerCase().includes(search.toLowerCase()),
      )
    : nodes;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-neutral-100 px-3 py-2.5">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="h-8 w-full rounded-lg border border-neutral-200 bg-neutral-50 pl-8 pr-3 text-xs transition focus:border-neutral-400 focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Count */}
      <div className="px-4 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          {t('nodeCount', { count: filtered.length })}
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <div className="space-y-px">
          {filtered.map((node) => {
            const Icon = TYPE_ICONS[node.type] ?? Square;
            const iconColor = TYPE_COLORS[node.type] ?? 'text-neutral-400';
            const isSelected = node.id === selectedNodeId;
            const count = commentCounts[node.id] ?? 0;

            return (
              <button
                key={node.id}
                onClick={() => onSelectNode(node.id)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition',
                  isSelected
                    ? 'bg-blue-50 text-blue-800 ring-1 ring-blue-200'
                    : 'text-neutral-700 hover:bg-neutral-50',
                )}
              >
                <Icon size={14} className={cn('shrink-0', isSelected ? 'text-blue-500' : iconColor)} />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {node.name ?? node.id}
                </span>
                <span className={cn(
                  'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium',
                  isSelected ? 'bg-blue-100 text-blue-600' : 'bg-neutral-100 text-neutral-400',
                )}>
                  {node.type}
                </span>
                {count > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-100 px-1 text-[10px] font-bold text-amber-700">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
