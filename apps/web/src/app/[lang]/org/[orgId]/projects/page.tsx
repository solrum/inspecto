'use client';

import { use, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useT } from '@/components/dictionary-provider';
import { useLocalePath } from '@/hooks/use-locale-path';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { orgs, projects, files as filesApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import { SearchInput } from '@/components/ui/search-input';
import { PageHeader } from '@/components/ui/page-header';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Card } from '@/components/ui/card';
import { FolderOpen, File, Plus, MoreHorizontal, MessageCircle, X } from 'lucide-react';

// Deterministic color from project name
const PROJECT_COLORS = [
  { bg: 'var(--color-primary)', light: 'var(--color-primary-light)' },
  { bg: 'var(--color-info)', light: 'var(--color-info-light)' },
  { bg: 'var(--color-success)', light: 'var(--color-success-light)' },
  { bg: 'var(--color-warning)', light: 'var(--color-warning-light)' },
  { bg: 'var(--color-error)', light: 'var(--color-error-light)' },
  { bg: 'var(--color-accent-pink)', light: '#FCE7F3' },
  { bg: 'var(--color-accent-teal)', light: '#CFFAFE' },
];

// Avatar accent colors matching design tokens
const AVATAR_COLORS = [
  'var(--color-primary)',
  'var(--color-accent-pink)',
  'var(--color-accent-indigo)',
  'var(--color-accent-teal)',
];

function colorForProject(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PROJECT_COLORS[Math.abs(hash) % PROJECT_COLORS.length];
}

function avatarColorsForProject(name: string): [string, string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const base = Math.abs(hash);
  return [
    AVATAR_COLORS[base % AVATAR_COLORS.length],
    AVATAR_COLORS[(base + 1) % AVATAR_COLORS.length],
    AVATAR_COLORS[(base + 2) % AVATAR_COLORS.length],
  ];
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ProjectsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = use(params);
  const { isAuthenticated } = useAuthGuard();
  const queryClient = useQueryClient();
  const toast = useToast();
  const router = useRouter();
  const t = useT('projects');
  const tc = useT('common');
  const tn = useT('nav');
  const lp = useLocalePath();
  const [search, setSearch] = useState('');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const { data: org } = useQuery({
    queryKey: ['org', orgId],
    queryFn: () => orgs.get(orgId),
    enabled: isAuthenticated,
  });

  const { data: projectList = [], isLoading } = useQuery({
    queryKey: ['projects', orgId],
    queryFn: () => projects.list(orgId),
    enabled: isAuthenticated,
  });

  const createProject = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      projects.create(orgId, data),
    onSuccess: (project: any) => {
      queryClient.invalidateQueries({ queryKey: ['projects', orgId] });
      setShowCreate(false);
      setNewName('');
      setNewDescription('');
      // Navigate to new project's detail page
      router.push(lp(`/projects/${project.id}`));
    },
    onError: (err: any) => toast.add(err.message, 'error'),
  });

  const filtered = projectList.filter(
    (p: any) => p.name?.toLowerCase().includes(search.toLowerCase()),
  );

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    createProject.mutate({ name: newName.trim(), description: newDescription.trim() || undefined });
  }

  function toggleExpand(projectId: string) {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      next.has(projectId) ? next.delete(projectId) : next.add(projectId);
      return next;
    });
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex flex-col gap-6 px-10 py-8">
      {/* Breadcrumb */}
      <Breadcrumb
        homeHref="/"
        items={[
          { label: org?.name ?? tn('organization') },
          { label: t('title') },
        ]}
      />

      {/* Header */}
      <PageHeader
        title={t('title')}
        action={
          <div className="flex items-center gap-3">
            {projectList.length > 0 && (
              <SearchInput
                placeholder={t('searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            )}
            <Button onClick={() => setShowCreate(true)} className="gap-1.5 px-4 py-2.5">
              <Plus size={16} /> {t('newProject')}
            </Button>
          </div>
        }
      />

      {/* Create project dialog */}
      {showCreate && (
        <CreateProjectDialog
          onClose={() => { setShowCreate(false); setNewName(''); setNewDescription(''); }}
          onSubmit={handleCreate}
          name={newName}
          description={newDescription}
          onNameChange={setNewName}
          onDescriptionChange={setNewDescription}
          isPending={createProject.isPending}
        />
      )}

      {/* Project list */}
      {isLoading ? (
        <div className="flex justify-center pt-16"><Spinner size={24} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={search ? t('noProjectsFound') : t('noProjectsYet')}
          description={search ? t('searchEmpty') : t('createPrompt')}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((project: any) => {
            const { bg, light } = colorForProject(project.name);
            const [av1, av2, av3] = avatarColorsForProject(project.name);
            const isExpanded = expandedProjects.has(project.id);
            const fileCount: number = project.fileCount ?? 0;

            return (
              <div
                key={project.id}
                className="flex flex-col overflow-hidden rounded-lg border border-border"
              >
                {/* Project header */}
                <button
                  onClick={() => toggleExpand(project.id)}
                  className="flex w-full items-center justify-between gap-3 border-none bg-surface px-5 py-4 text-left cursor-pointer"
                >
                  {/* Left: icon + info */}
                  <div className="flex flex-1 items-center gap-3 min-w-0">
                    {/* Icon box */}
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
                      style={{ backgroundColor: light }}
                    >
                      <FolderOpen size={18} style={{ color: bg }} />
                    </div>
                    {/* Info: name + meta */}
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate font-display text-base font-semibold text-foreground">
                        {project.name}
                      </span>
                      <div className="flex items-center gap-2 font-sans text-xs text-foreground-muted">
                        <span>{t('fileCount', { count: fileCount })}</span>
                        <span>·</span>
                        <span>{t('updated', { time: timeAgo(project.updatedAt ?? project.createdAt) })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: badge + avatars + ellipsis */}
                  <div className="flex shrink-0 items-center gap-2">
                    {/* Active badge */}
                    <span className="inline-flex items-center rounded-full bg-success-light px-2.5 py-1 font-sans text-[11px] font-medium text-success">
                      {tc('active')}
                    </span>
                    {/* Avatar group */}
                    <div className="flex items-center">
                      {[av1, av2, av3].map((color, i) => (
                        <div
                          key={i}
                          className={`h-6 w-6 shrink-0 rounded-full border-2 border-background ${i > 0 ? '-ml-2' : ''}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    {/* Ellipsis menu button */}
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-foreground-muted"
                      onClick={(e) => { e.stopPropagation(); }}
                    >
                      <MoreHorizontal size={18} />
                    </div>
                  </div>
                </button>

                {/* Expanded file list */}
                {isExpanded && <ProjectFileList projectId={project.id} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Create Project Dialog ────────────────────────────────────────────────────
function CreateProjectDialog({
  onClose,
  onSubmit,
  name,
  description,
  onNameChange,
  onDescriptionChange,
  isPending,
}: {
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  name: string;
  description: string;
  onNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  isPending: boolean;
}) {
  const t = useT('projects');
  const tc = useT('common');
  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Dialog card */}
      <Card padding="lg" className="flex w-[520px] max-w-full flex-col gap-6 shadow-xl">
        {/* Header */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-start justify-between">
            <h2 className="m-0 font-display text-[22px] font-semibold tracking-tight text-foreground">
              {t('createTitle')}
            </h2>
            <button
              onClick={onClose}
              className="flex items-center justify-center rounded-sm border-none bg-transparent p-1 text-foreground-muted cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
          <p className="m-0 font-sans text-sm leading-normal text-foreground-secondary">
            {t('createSubtitle')}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          {/* Project Name field */}
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[13px] font-medium text-foreground-secondary">
              {t('projectName')}
            </label>
            <input
              type="text"
              placeholder="e.g. Mobile App Redesign"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              autoFocus
              className="w-full rounded-md border border-border bg-background px-3.5 py-2.5 font-sans text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          {/* Description field */}
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[13px] font-medium text-foreground-secondary">
              {t('description')} <span className="font-normal text-foreground-muted">({tc('optional')})</span>
            </label>
            <textarea
              placeholder="Briefly describe what this project is for..."
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              rows={3}
              className="w-full resize-y rounded-md border border-border bg-background px-3.5 py-2.5 font-sans text-sm leading-normal text-foreground outline-none focus:border-primary min-h-20"
            />
          </div>

          {/* Actions */}
          <div className="mt-1 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="cursor-pointer rounded-md border border-border bg-transparent px-6 py-2.5 font-sans text-sm font-medium text-foreground-secondary"
            >
              {tc('cancel')}
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isPending}
              className="flex items-center gap-1.5 rounded-md border-none bg-primary px-6 py-2.5 font-sans text-sm font-medium text-primary-foreground cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? <Spinner size={14} /> : <Plus size={15} />}
              {t('createProject')}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ── Project File List ────────────────────────────────────────────────────────
function ProjectFileList({ projectId }: { projectId: string }) {
  const t = useT('projects');
  const lp = useLocalePath();
  const { data: fileList = [], isLoading } = useQuery({
    queryKey: ['files', projectId],
    queryFn: () => filesApi.list(projectId),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center border-t border-border p-5">
        <Spinner size={18} />
      </div>
    );
  }

  if (fileList.length === 0) {
    return (
      <div className="border-t border-border p-5 text-center">
        <p className="m-0 font-sans text-[13px] text-foreground-muted">{t('noFilesYet')}</p>
        <Link
          href={lp(`/projects/${projectId}`)}
          className="mt-2 inline-flex items-center gap-1.5 font-sans text-xs font-medium text-primary no-underline"
        >
          <Plus size={12} /> {t('uploadFiles')}
        </Link>
      </div>
    );
  }

  return (
    <div className="border-t border-border px-5">
      {fileList.map((file: any, i: number) => (
        <div
          key={file.id}
          className={`flex items-center justify-between py-[11px] ${i < fileList.length - 1 ? 'border-b border-border' : ''}`}
        >
          {/* Left: file icon + name */}
          <div className="flex flex-1 items-center gap-2.5 min-w-0">
            <File size={16} className="shrink-0 text-foreground-muted" />
            <Link
              href={lp(`/files/${file.id}`)}
              className="truncate font-sans text-[13px] text-foreground no-underline"
            >
              {file.name}
            </Link>
          </div>

          {/* Right: version badge + date + comments */}
          <div className="flex shrink-0 items-center gap-4">
            {file.versionNumber != null && (
              <span className="inline-flex items-center rounded-sm bg-primary-light px-2 py-[3px] font-sans text-[11px] font-medium text-primary">
                v{file.versionNumber}
              </span>
            )}
            <span className="font-sans text-xs text-foreground-muted">
              {formatDate(file.updatedAt ?? file.createdAt)}
            </span>
            <div className="flex items-center gap-1 text-foreground-muted">
              <MessageCircle size={14} />
              <span className="font-sans text-xs text-foreground-muted">0</span>
            </div>
          </div>
        </div>
      ))}
      {/* View project link */}
      <div className="py-2.5">
        <Link
          href={lp(`/projects/${projectId}`)}
          className="font-sans text-xs font-medium text-primary no-underline"
        >
          {t('viewProject')}
        </Link>
      </div>
    </div>
  );
}
