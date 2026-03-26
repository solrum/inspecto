'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useT } from '@/components/dictionary-provider';
import { share as shareApi } from '@/lib/api';
import { NodeTree } from '@/components/node-tree';
import { PenDocumentRenderer } from '@/components/pen-renderer';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Lock, Download } from 'lucide-react';

export default function SharedFilePage() {
  const t = useT('share');
  const params = useParams();
  const token = params.token as string;
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['shared', token],
    queryFn: () => shareApi.getShared(token),
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner size={28} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-surface">
            <Lock size={28} className="text-foreground-muted" />
          </div>
          <h1 className="text-lg font-bold font-display text-foreground">{t('linkUnavailable')}</h1>
          <p className="mt-1 max-w-xs text-sm text-foreground-secondary">
            {t('linkExpired')}
          </p>
        </div>
      </div>
    );
  }

  const { file, version, permission } = data;
  const nodeSummary: any[] = version?.nodeSummary ?? [];

  const permLabel: Record<string, string> = {
    view: t('viewOnly'),
    download: t('download'),
    comment: t('comment'),
  };

  // Note: shared view doesn't fetch full content yet (would need a public content endpoint)
  // For now, show node tree only
  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/80 bg-card px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <span className="text-sm font-bold text-white">I</span>
          </div>
          <span className="text-sm font-semibold">{file.name}</span>
          {version && <Badge variant="primary">v{version.versionNumber}</Badge>}
          <Badge variant="default">{permLabel[permission] ?? permission}</Badge>
        </div>
        {permission !== 'view' && (
          <button className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground-secondary transition hover:bg-surface">
            <Download size={13} /> Download
          </button>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 shrink-0 border-r border-border/80 bg-card">
          <NodeTree
            nodes={nodeSummary}
            selectedNodeId={selectedNodeId}
            onSelectNode={(id) => setSelectedNodeId(id === selectedNodeId ? null : id)}
          />
        </aside>

        <div className="flex flex-1 items-center justify-center bg-[#f5f5f5] bg-[radial-gradient(circle,#e0e0e0_1px,transparent_1px)] bg-[size:20px_20px]">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-light">
              <span className="text-xl font-bold text-primary">I</span>
            </div>
            <p className="text-sm font-medium text-foreground-secondary">{file.name}</p>
            <p className="mt-1 text-xs text-foreground-muted">{t('nodeCount', { count: nodeSummary.length })}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
