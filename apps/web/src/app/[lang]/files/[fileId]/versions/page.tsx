'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { files as filesApi } from '@/lib/api';
import { Shell } from '@/components/shell';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import { PenUploadPanel } from '@/components/pen-upload-panel';
import { cn } from '@/lib/cn';
import {
  ArrowLeft,
  Download,
  Clock,
  FileText,
  GitCommitHorizontal,
  History,
} from 'lucide-react';
import { useT } from '@/components/dictionary-provider';
import { useLocalePath } from '@/hooks/use-locale-path';

export default function VersionHistoryPage() {
  const { isAuthenticated } = useAuthGuard();
  const params = useParams();
  const fileId = params.fileId as string;
  const queryClient = useQueryClient();
  const toast = useToast();
  const t = useT('versions');
  const tc = useT('common');
  const tf = useT('fileViewer');
  const lp = useLocalePath();
  const [commitMsg, setCommitMsg] = useState('');

  const { data: fileData } = useQuery({
    queryKey: ['file', fileId],
    queryFn: () => filesApi.get(fileId),
    enabled: isAuthenticated,
  });

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['versions', fileId],
    queryFn: () => filesApi.listVersions(fileId),
    enabled: isAuthenticated,
  });

  const uploadVersion = useMutation({
    mutationFn: ({ file, images }: { file: File; images: File[] }) =>
      filesApi.uploadVersion(fileId, file, images, commitMsg || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['versions', fileId] });
      queryClient.invalidateQueries({ queryKey: ['file', fileId] });
      setCommitMsg('');
      toast.add(t('newVersionUploaded'), 'success');
    },
    onError: (err: any) => toast.add(err.message, 'error'),
  });

  function handleUpload(file: File, images: File[]) {
    uploadVersion.mutate({ file, images });
  }

  async function handleDownload(versionId: string) {
    const { url } = await filesApi.download(fileId, versionId);
    window.open(url, '_blank');
  }

  if (!isAuthenticated) return null;

  return (
    <Shell>
      <div className="mb-8">
        <Link
          href={lp(`/files/${fileId}`)}
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-foreground-secondary transition hover:text-foreground"
        >
          <ArrowLeft size={14} /> {tf('backToFile')}
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface">
            <History size={20} className="text-foreground-secondary" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display">{t('title')}</h1>
            <p className="text-sm text-foreground-secondary">{fileData?.name ?? 'File'}</p>
          </div>
        </div>
      </div>

      {/* Upload new version */}
      <div className="mb-8 overflow-hidden rounded-lg border border-border bg-card shadow-[0_2px_8px_-2px_var(--color-shadow)]">
        <div className="border-b border-surface bg-surface/50 px-5 py-3">
          <h2 className="text-sm font-semibold">{t('uploadNewVersion')}</h2>
        </div>
        <div className="p-5">
          <Input
            value={commitMsg}
            onChange={(e) => setCommitMsg(e.target.value)}
            placeholder={t('commitPlaceholder')}
            className="mb-3"
          />
          <PenUploadPanel onUpload={handleUpload} isPending={uploadVersion.isPending} />
        </div>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size={24} /></div>
      ) : versions.length === 0 ? (
        <EmptyState icon={FileText} title={t('noVersions')} description={t('noVersionsDescription')} />
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[27px] top-0 bottom-0 w-px bg-border" />

          <div className="space-y-4">
            {versions.map((version: any, idx: number) => {
              const isLatest = idx === 0;
              const size = (version.fileSizeBytes / 1024).toFixed(1);

              return (
                <div key={version.id} className="relative flex gap-4 pl-2">
                  {/* Timeline dot */}
                  <div className={cn(
                    'relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2',
                    isLatest
                      ? 'border-info bg-info-light'
                      : 'border-foreground-muted bg-card',
                  )}>
                    <GitCommitHorizontal size={12} className={isLatest ? 'text-info' : 'text-foreground-muted'} />
                  </div>

                  {/* Card */}
                  <div className={cn(
                    'flex-1 rounded-lg border bg-card p-4 transition hover:shadow-sm',
                    isLatest ? 'border-info/40 shadow-sm' : 'border-border',
                  )}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold font-display">v{version.versionNumber}</span>
                          {isLatest && <Badge variant="primary">{t('latest')}</Badge>}
                        </div>
                        {version.commitMessage && (
                          <p className="mt-1 text-sm text-foreground-secondary">{version.commitMessage}</p>
                        )}
                        <div className="mt-2 flex items-center gap-3 text-xs text-foreground-secondary">
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {new Date(version.createdAt).toLocaleString('en-US', {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Avatar name={version.uploaderName ?? 'User'} size="sm" />
                            {version.uploaderName ?? t('unknown')}
                          </span>
                          <span>{size} KB</span>
                        </div>
                      </div>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDownload(version.id)}
                      >
                        <Download size={13} /> {tc('download')}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Shell>
  );
}
