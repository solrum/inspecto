'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useT } from '@/components/dictionary-provider';
import { useLocalePath } from '@/hooks/use-locale-path';
import { getLastOrgId } from '@/hooks/use-last-org';
import { files as filesApi, projects as projectsApi, orgs } from '@/lib/api';
import { SidebarLayout } from '@/components/sidebar-layout';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { useToast } from '@/components/ui/toast';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Card } from '@/components/ui/card';
import {
  FileText,
  Upload,
  Image,
  Layers,
  MoreHorizontal,
  Trash2,
  Download,
  ExternalLink,
} from 'lucide-react';

// Deterministic avatar color from a string
const AVATAR_PALETTE = ['var(--color-primary)', 'var(--color-accent-pink)', 'var(--color-accent-indigo)', 'var(--color-accent-teal)', 'var(--color-success)', 'var(--color-warning)', 'var(--color-error)'];
function avatarColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}
function initials(userId: string) {
  return userId.slice(0, 2).toUpperCase();
}

// Badge style by file extension
function typeBadge(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'pen';
  const map: Record<string, { bg: string; color: string }> = {
    pen:    { bg: 'var(--color-primary-light)', color: 'var(--color-primary)' },
    fig:    { bg: 'var(--color-info-light)', color: 'var(--color-info)' },
    sketch: { bg: 'var(--color-warning-light)', color: 'var(--color-warning)' },
    xd:     { bg: 'var(--color-error-light)', color: 'var(--color-error)' },
  };
  return { label: `.${ext}`, ...( map[ext] ?? { bg: 'var(--color-surface)', color: 'var(--color-foreground-secondary)' }) };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const TAB_KEYS = ['designFiles', 'variables', 'designTokens', 'activity'] as const;

export default function ProjectPage() {
  const { isAuthenticated } = useAuthGuard();
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const queryClient = useQueryClient();
  const toast = useToast();
  const t = useT('projectDetail');
  const tc = useT('common');
  const tn = useT('nav');
  const lp = useLocalePath();
  const [activeTab, setActiveTab] = useState<typeof TAB_KEYS[number]>('designFiles');
  const [menuFileId, setMenuFileId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<{ id: string; name: string } | null>(null);

  function openMenu(fileId: string, btnEl: HTMLButtonElement) {
    const rect = btnEl.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setMenuFileId(fileId);
  }

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId),
    enabled: isAuthenticated,
  });

  const { data: org } = useQuery({
    queryKey: ['org', project?.orgId],
    queryFn: () => orgs.get(project!.orgId),
    enabled: isAuthenticated && !!project?.orgId,
  });

  const { data: fileList = [], isLoading } = useQuery({
    queryKey: ['files', projectId],
    queryFn: () => filesApi.list(projectId),
    enabled: isAuthenticated,
  });

  const deleteFile = useMutation({
    mutationFn: (fileId: string) => filesApi.remove(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects', project?.orgId] });
      toast.add(t('fileDeleted'), 'success');
      setMenuFileId(null);
    },
    onError: (err: any) => toast.add(err.message, 'error'),
  });

  async function handleDownload(fileId: string) {
    const { url } = await filesApi.download(fileId);
    window.open(url, '_blank');
  }

  if (!isAuthenticated) return null;

  const orgId = project?.orgId;
  const orgHref = orgId ? lp(`/org/${orgId}/projects`) : '#';

  return (
    <>
    <SidebarLayout orgId={orgId}>
      <div className="px-10 py-8 flex flex-col gap-6">

        {/* Breadcrumb */}
        <Breadcrumb
          homeHref="/"
          items={[
            { label: org?.name ?? tn('organization'), href: orgHref },
            { label: tn('projects'), href: orgHref },
            { label: project?.name ?? 'Project' },
          ]}
        />

        {/* Header Row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            {/* Title + badge */}
            <div className="flex items-center gap-3">
              <h1 className="m-0 font-display text-2xl font-semibold text-foreground tracking-tight">
                {project?.name ?? 'Project'}
              </h1>
              <span className="inline-flex items-center px-2.5 py-[3px] rounded-full bg-success-light text-xs font-medium font-sans text-success">
                {tc('active')}
              </span>
            </div>
            {project?.description && (
              <p className="m-0 font-sans text-sm text-foreground-secondary leading-[1.4]">
                {project.description}
              </p>
            )}
          </div>

          {/* Upload File button */}
          <button
            onClick={() => router.push(lp(`/projects/${projectId}/upload`))}
            className="flex items-center gap-2 px-5 py-2.5 h-10 rounded-md border-none bg-primary text-primary-foreground font-sans text-sm font-medium cursor-pointer shrink-0"
          >
            <Upload size={16} />
            {t('uploadFile')}
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-border -mb-2">
          {TAB_KEYS.map((tabKey) => {
            const isActive = tabKey === activeTab;
            return (
              <button
                key={tabKey}
                onClick={() => setActiveTab(tabKey)}
                className={`px-4 py-2.5 border-none -mb-px bg-transparent font-sans text-sm cursor-pointer ${
                  isActive
                    ? 'border-b-2 border-b-primary font-medium text-primary'
                    : 'border-b-2 border-b-transparent text-foreground-secondary'
                }`}
              >
                {t(tabKey)}
              </button>
            );
          })}
        </div>

        {/* Design Files Tab Content */}
        {activeTab === 'designFiles' && (
          <>
            {/* Files Table */}
            {isLoading ? (
              <div className="flex justify-center pt-12">
                <Spinner size={24} />
              </div>
            ) : fileList.length === 0 ? (
              <EmptyState
                icon={Layers}
                title={t('noFilesYet')}
                description={t('noFilesDescription')}
              />
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                {/* Table header */}
                <div className="flex items-center px-5 py-2.5 bg-surface border-b border-border">
                  <span className="w-80 font-sans text-xs font-medium text-foreground-muted">{t('fileName')}</span>
                  <span className="w-20 font-sans text-xs font-medium text-foreground-muted">{t('type')}</span>
                  <span className="flex-1 font-sans text-xs font-medium text-foreground-muted">{t('modified')}</span>
                  <span className="w-[60px] font-sans text-xs font-medium text-foreground-muted">{t('by')}</span>
                  <span className="w-8" />
                </div>

                {/* Rows */}
                {fileList.map((file: any, i: number) => {
                  const badge = typeBadge(file.name);
                  const isLast = i === fileList.length - 1;
                  const isMenuOpen = menuFileId === file.id;
                  return (
                    <div
                      key={file.id}
                      className={`flex items-center px-5 py-3 bg-card relative ${
                        isLast ? '' : 'border-b border-border'
                      }`}
                    >
                      {/* File Name */}
                      <div className="w-80 flex items-center gap-2.5 min-w-0">
                        <FileText size={16} className="shrink-0 text-primary" />
                        <Link
                          href={lp(`/files/${file.id}`)}
                          className="font-sans text-[13px] font-medium text-foreground no-underline truncate"
                        >
                          {file.name}
                        </Link>
                      </div>

                      {/* Type badge */}
                      <div className="w-20">
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 rounded-sm font-sans text-[11px] font-medium"
                          style={{ backgroundColor: badge.bg, color: badge.color }}
                        >
                          {badge.label}
                        </span>
                      </div>

                      {/* Modified */}
                      <span className="flex-1 font-sans text-[13px] text-foreground-muted">
                        {timeAgo(file.updatedAt ?? file.createdAt)}
                      </span>

                      {/* By avatar */}
                      <div className="w-[60px] flex items-center">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                          style={{ backgroundColor: avatarColor(file.createdBy ?? 'u') }}
                        >
                          <span className="font-sans text-[9px] font-semibold text-primary-foreground">
                            {initials(file.createdBy ?? 'U')}
                          </span>
                        </div>
                      </div>

                      {/* Menu */}
                      <div className="w-8 flex justify-end">
                        <button
                          onClick={(e) => isMenuOpen ? setMenuFileId(null) : openMenu(file.id, e.currentTarget)}
                          className="bg-transparent border-none cursor-pointer p-1 text-foreground-muted flex items-center justify-center rounded-sm"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Reference Images Section */}
            <div className="flex flex-col gap-4">
              {/* Header: title + plain "Add Images" text link */}
              <div className="flex items-center justify-between">
                <h2 className="m-0 font-display text-lg font-semibold text-foreground">
                  {t('referenceImages')}
                </h2>
                <button className="bg-transparent border-none cursor-pointer font-sans text-sm font-medium text-primary p-0">
                  {t('addImages')}
                </button>
              </div>
              {/* Image placeholder cards — 3-column grid, height 160 preview */}
              <div className="grid grid-cols-3 gap-4">
                {['wireframe-v2.png', 'dashboard-extra.png', 'onboarding-final.png'].map((label) => (
                  <Card key={label} padding="none" className="overflow-hidden">
                    {/* Preview area */}
                    <div className="h-40 bg-surface flex items-center justify-center">
                      <Image size={28} className="text-border-strong" />
                    </div>
                    {/* Label */}
                    <div className="pt-2 px-3 pb-3">
                      <span className="font-sans text-xs text-foreground-muted">
                        {label}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Other tabs — placeholder */}
        {activeTab !== 'designFiles' && (
          <div className="flex justify-center pt-16">
            <p className="font-sans text-sm text-foreground-muted">
              {t('comingSoon', { tab: t(activeTab) })}
            </p>
          </div>
        )}
      </div>
    </SidebarLayout>

    {menuFileId && menuPos && createPortal(
      <>
        <div className="fixed inset-0 z-40" onClick={() => setMenuFileId(null)} />
        <div
          className="fixed z-50 w-40 rounded-md border border-border bg-card shadow-lg py-1"
          style={{ top: menuPos.top, right: menuPos.right }}
        >
          <Link
            href={lp(`/files/${menuFileId}`)}
            className="flex items-center gap-2 px-3 py-2 font-sans text-[13px] text-foreground-secondary no-underline"
            onClick={() => setMenuFileId(null)}
          >
            <ExternalLink size={14} /> {tc('open')}
          </Link>
          <button
            onClick={() => { handleDownload(menuFileId); setMenuFileId(null); }}
            className="flex w-full items-center gap-2 px-3 py-2 font-sans text-[13px] text-foreground-secondary bg-transparent border-none cursor-pointer"
          >
            <Download size={14} /> {tc('download')}
          </button>
          <div className="border-t border-surface my-1" />
          <button
            onClick={() => {
              const file = fileList.find((f: any) => f.id === menuFileId);
              setMenuFileId(null);
              if (file) setConfirmDeleteFile({ id: file.id, name: file.name });
            }}
            className="flex w-full items-center gap-2 px-3 py-2 font-sans text-[13px] text-error bg-transparent border-none cursor-pointer"
          >
            <Trash2 size={14} /> {tc('delete')}
          </button>
        </div>
      </>,
      document.body,
    )}

    {confirmDeleteFile && (
      <ConfirmDialog
        title={t('deleteTitle', { name: confirmDeleteFile.name })}
        description={t('deleteDescription')}
        confirmLabel={tc('delete')}
        onConfirm={() => { deleteFile.mutate(confirmDeleteFile.id); setConfirmDeleteFile(null); }}
        onCancel={() => setConfirmDeleteFile(null)}
      />
    )}
    </>
  );
}
