'use client';

import { useCallback, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useDropzone } from 'react-dropzone';
import { extractImageRefs } from '@inspecto/shared';
import { useT } from '@/components/dictionary-provider';
import { useLocalePath } from '@/hooks/use-locale-path';
import { validatePenFile, validateImageFile } from '@/lib/file-validation';
import { files as filesApi, projects as projectsApi } from '@/lib/api';
import { SidebarLayout } from '@/components/sidebar-layout';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { useToast } from '@/components/ui/toast';
import { Spinner } from '@/components/ui/spinner';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import {
  CloudUpload,
  FolderOpen,
  FileText,
  FileCheck,
  Plus,
  X,
  Check,
  AlertCircle,
  ImagePlus,
  ExternalLink,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ImageRef {
  filename: string;
  matched: File | null;
}

interface QueuedFile {
  id: string;
  penFile: File;
  checksum: string;
  imageRefs: ImageRef[];
  status: 'pending' | 'checking' | 'uploading' | 'done' | 'error' | 'duplicate';
  errorMsg?: string;
  existingFileId?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function basename(path: string) {
  return path.split(/[\\/]/).pop()!.toLowerCase();
}

async function computeSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Match files against imageRefs by case-insensitive basename */
function applyImages(refs: ImageRef[], files: File[]): ImageRef[] {
  return refs.map((ref) => {
    const base = basename(ref.filename);
    const match = files.find((f) => f.name.toLowerCase() === base);
    return match ? { ...ref, matched: match } : ref;
  });
}

const IMAGE_ACCEPT = 'image/png,image/jpeg,image/gif,image/webp,image/svg+xml';

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const { isAuthenticated } = useAuthGuard();
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const queryClient = useQueryClient();
  const toast = useToast();
  const t = useT('upload');
  const tc = useT('common');
  const tn = useT('nav');
  const lp = useLocalePath();

  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  // refImages: images added to the Reference Images pool (displayed as cards)
  const [refImages, setRefImages] = useState<File[]>([]);
  const [isDragOverRef, setIsDragOverRef] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const penFolderInputRef = useRef<HTMLInputElement>(null);

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId),
    enabled: isAuthenticated,
  });

  // ── Parse .pen → extract image refs ────────────────────────────────────────
  async function parsePen(file: File): Promise<ImageRef[]> {
    try {
      const text = await file.text();
      const refs = extractImageRefs(JSON.parse(text));
      return refs.map((filename) => ({ filename, matched: null }));
    } catch {
      return [];
    }
  }

  // ── Add .pen files to queue, parse their refs, check duplicate ──────────────
  const onDropPen = useCallback(async (accepted: File[]) => {
    const penFiles = accepted.filter((f) => f.name.endsWith('.pen'));
    for (const pen of penFiles) {
      // Validate .pen structure before queuing
      const penError = await validatePenFile(pen);
      if (penError) {
        toast.add(`${pen.name}: ${penError}`, 'error');
        continue;
      }

      const [imageRefs, checksum] = await Promise.all([parsePen(pen), computeSHA256(pen)]);
      const matched = refImages.length > 0 ? applyImages(imageRefs, refImages) : imageRefs;

      // Local check: same checksum already in queue → toast + skip
      let isLocalDup = false;
      setQueue((prev) => {
        if (prev.some((q) => q.checksum === checksum)) {
          isLocalDup = true;
        }
        return prev;
      });
      if (isLocalDup) {
        toast.add(t('alreadyInList', { name: pen.name }), 'error');
        continue;
      }

      const queueId = Math.random().toString(36).slice(2);
      setQueue((prev) => [...prev, { id: queueId, penFile: pen, checksum, imageRefs: matched, status: 'checking' }]);

      // API pre-check
      try {
        const result = await filesApi.checkDuplicate(projectId, checksum);
        if (result.exists) {
          // Already in project → remove from queue, show toast
          setQueue((prev) => prev.filter((q) => q.id !== queueId));
          toast.add(t('alreadyInProject', { name: pen.name }), 'error');
        } else {
          setQueue((prev) => prev.map((q) => (q.id === queueId ? { ...q, status: 'pending' } : q)));
        }
      } catch {
        // Check failed → fall through to pending so upload can still try
        setQueue((prev) => prev.map((q) => (q.id === queueId ? { ...q, status: 'pending' } : q)));
      }
    }
  }, [refImages, projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropPen,
    accept: { 'application/json': ['.pen'] },
    multiple: true,
    disabled: isUploading,
  });

  // ── Add images to the reference pool, auto-match against all queued files ───
  async function addRefImageFiles(files: File[]) {
    const newImages = files.filter((f) => f.type.startsWith('image/'));
    if (!newImages.length) return;

    // Validate each image
    const validImages: File[] = [];
    for (const img of newImages) {
      const error = await validateImageFile(img);
      if (error) {
        toast.add(error, 'error');
      } else {
        validImages.push(img);
      }
    }
    if (!validImages.length) return;

    setRefImages((prev) => {
      const existing = new Set(prev.map((f) => f.name.toLowerCase()));
      return [...prev, ...validImages.filter((f) => !existing.has(f.name.toLowerCase()))];
    });

    // Apply to all queued file imageRefs
    setQueue((prev) =>
      prev.map((q) => ({ ...q, imageRefs: applyImages(q.imageRefs, validImages) })),
    );
  }

  // Folder: auto-filter to only images matching any queued file's refs
  function addFolderImages(allFiles: File[]) {
    const allRefBasenames = new Set(
      queue.flatMap((q) => q.imageRefs.map((r) => basename(r.filename))),
    );
    const matching = allFiles.filter(
      (f) => f.type.startsWith('image/') && allRefBasenames.has(f.name.toLowerCase()),
    );
    if (matching.length > 0) addRefImageFiles(matching);
  }

  // Folder picker for .pen files (Design Files section)
  async function handlePenFolderPick() {
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      try {
        // @ts-expect-error showDirectoryPicker not in all TS defs
        const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
        const penFiles: File[] = [];
        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'file' && entry.name.endsWith('.pen')) {
            penFiles.push(await entry.getFile());
          }
        }
        if (penFiles.length > 0) await onDropPen(penFiles);
        else toast.add(t('noPenFilesInFolder'), 'error');
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          toast.add(t('couldNotReadFolder'), 'error');
        }
      }
    } else {
      penFolderInputRef.current?.click();
    }
  }

  // Folder picker using File System Access API (no browser confirm dialog)
  // Falls back to hidden input with webkitdirectory on unsupported browsers
  async function handleFolderPick() {
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      try {
        // @ts-expect-error showDirectoryPicker not in all TS defs
        const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
        const IMAGE_EXTS = /\.(png|jpe?g|gif|webp|svg)$/i;
        const files: File[] = [];
        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'file' && IMAGE_EXTS.test(entry.name)) {
            files.push(await entry.getFile());
          }
        }
        if (files.length > 0) addFolderImages(files);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          toast.add(t('couldNotReadFolderFallback'), 'error');
        }
      }
    } else {
      // Fallback for Firefox / Safari
      folderInputRef.current?.click();
    }
  }

  function removeRefImage(filename: string) {
    setRefImages((prev) => prev.filter((f) => f.name !== filename));
    // Unmatch from all queue items
    setQueue((prev) =>
      prev.map((q) => ({
        ...q,
        imageRefs: q.imageRefs.map((r) =>
          basename(r.filename) === filename.toLowerCase() ? { ...r, matched: null } : r,
        ),
      })),
    );
  }

  function removeFromQueue(id: string) {
    setQueue((prev) => prev.filter((q) => q.id !== id));
  }

  // ── Upload all ─────────────────────────────────────────────────────────────
  async function handleUploadAll() {
    // Only upload items that are truly pending (skip done, duplicate, checking, error)
    const pending = queue.filter((q) => q.status === 'pending');
    if (pending.length === 0) return;
    setIsUploading(true);
    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;

    for (const item of pending) {
      setQueue((prev) => prev.map((q) => q.id === item.id ? { ...q, status: 'uploading' } : q));
      try {
        const images = item.imageRefs.flatMap((r) => (r.matched ? [r.matched] : []));
        await filesApi.upload(projectId, item.penFile, images);
        setQueue((prev) => prev.map((q) => q.id === item.id ? { ...q, status: 'done' } : q));
        successCount++;
      } catch (err: any) {
        // 409 = duplicate detected via SHA-256 checksum on server (failsafe in case pre-check missed it)
        if (err?.status === 409 && err?.fileId) {
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id ? { ...q, status: 'duplicate', existingFileId: err.fileId } : q,
            ),
          );
          duplicateCount++;
        } else {
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? { ...q, status: 'error', errorMsg: err.message ?? 'Upload failed' }
                : q,
            ),
          );
          errorCount++;
        }
      }
    }

    setIsUploading(false);
    if (successCount > 0) {
      queryClient.invalidateQueries({ queryKey: ['files', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects', project?.orgId] });
    }

    const hasIssues = errorCount > 0 || duplicateCount > 0;
    if (!hasIssues && successCount > 0) {
      toast.add(t('filesUploaded', { count: successCount }), 'success');
      router.push(lp(`/projects/${projectId}`));
    } else if (successCount > 0 && errorCount > 0) {
      toast.add(t('uploadedWithErrors', { success: successCount, errors: errorCount }), 'error');
    } else if (duplicateCount > 0 && errorCount === 0 && successCount === 0) {
      toast.add(t('allDuplicates'), 'error');
    } else if (errorCount > 0) {
      toast.add(t('uploadFailed'), 'error');
    } else {
      toast.add(t('uploadedWithDuplicates', { success: successCount, duplicates: duplicateCount }), 'success');
    }
  }

  if (!isAuthenticated) return null;

  const orgId = project?.orgId;

  return (
    <SidebarLayout orgId={orgId}>
      <div className="flex flex-col gap-6 px-10 py-8">

        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: tn('projects'), href: orgId ? lp(`/org/${orgId}/projects`) : undefined },
            { label: project?.name ?? 'Project', href: lp(`/projects/${projectId}`) },
            { label: t('breadcrumbUpload') },
          ]}
        />

        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="m-0 font-display text-2xl font-semibold text-foreground tracking-tight">
            {t('title')}
          </h1>
          <p className="m-0 font-sans text-sm text-foreground-secondary">
            {t('subtitle', { project: project?.name ?? t('subtitleFallback') })}
          </p>
        </div>

        {/* ── Design Files ── */}
        <div className="flex flex-col gap-3">
          <h2 className="m-0 font-display text-base font-semibold text-foreground">
            {t('designFiles')}
          </h2>
          <div
            {...getRootProps()}
            className={`h-[180px] rounded-lg border flex flex-col items-center justify-center gap-4 transition ${
              isDragActive ? 'border-primary bg-primary-light' : 'border-border bg-surface'
            } ${isUploading ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <input {...getInputProps()} />
            <div className="w-[52px] h-[52px] rounded-full bg-primary-light flex items-center justify-center">
              <CloudUpload size={24} className="text-primary" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="font-sans text-sm font-medium text-foreground">
                {isDragActive ? t('dropHere') : t('dragAndDrop')}
              </span>
              <span className="font-sans text-xs text-foreground-muted">
                {t('supportedFiles')}
              </span>
            </div>
            {!isDragActive && (
              <div className="flex gap-2">
                <button type="button" className="flex items-center gap-1.5 px-5 py-2 rounded-md border-none bg-primary text-primary-foreground font-sans text-[13px] font-medium cursor-pointer">
                  <FolderOpen size={14} /> {t('browseFiles')}
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handlePenFolderPick(); }}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-md border border-border-strong bg-card font-sans text-[13px] font-medium text-foreground-secondary cursor-pointer"
                >
                  <FolderOpen size={14} /> {t('browseFolder')}
                </button>
              </div>
            )}
          </div>
          {/* Fallback for browsers without showDirectoryPicker */}
          {/* @ts-expect-error webkitdirectory not in TS typings */}
          <input ref={penFolderInputRef} type="file" accept=".pen" webkitdirectory="" multiple className="hidden"
            onChange={async (e) => { const f = Array.from(e.target.files ?? []).filter((x) => x.name.endsWith('.pen')); if (f.length) await onDropPen(f); e.target.value = ''; }}
          />
        </div>

        {/* ── Queued Files ── */}
        {queue.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="m-0 font-display text-base font-semibold text-foreground">
              {t('queuedFiles', { count: queue.length })}
            </h2>
            <div className="overflow-hidden rounded-lg border border-border">
              {queue.map((item, i) => {
                const isLast = i === queue.length - 1;
                const matched = item.imageRefs.filter((r) => r.matched !== null).length;
                const total = item.imageRefs.length;
                const isDone = item.status === 'done';
                const isDuplicate = item.status === 'duplicate';
                const isUploadingThis = item.status === 'uploading';
                const isChecking = item.status === 'checking';
                const isError = item.status === 'error';
                const ext = item.penFile.name.split('.').pop()?.toLowerCase() ?? 'pen';

                return (
                  <div key={item.id} className={`flex items-center justify-between px-4 py-3 bg-card ${isLast ? '' : 'border-b border-border'}`}>
                    {/* Left */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${
                        isDone ? 'bg-success-light' : isDuplicate ? 'bg-warning-light' : (isUploadingThis || isChecking) ? 'bg-primary-light' : 'bg-surface'
                      }`}>
                        {isDone || isDuplicate
                          ? <FileCheck size={18} className={isDone ? 'text-success' : 'text-warning'} />
                          : <FileText size={18} className={(isUploadingThis || isChecking) ? 'text-primary' : 'text-foreground-muted'} />
                        }
                      </div>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-sans text-[13px] font-medium text-foreground truncate">
                          {item.penFile.name}
                        </span>
                        <div className="flex items-center gap-2 font-sans text-[11px] text-foreground-muted">
                          <span>{fileSize(item.penFile.size)} · .{ext}</span>
                          {total > 0 && (
                            <span className={`font-medium ${
                              matched === total ? 'text-success' : matched > 0 ? 'text-warning' : 'text-foreground-muted'
                            }`}>
                              {t('imagesMatched', { matched, total })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: status */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isChecking && (
                        <span className="font-sans text-[11px] font-medium text-primary">{t('checking')}</span>
                      )}
                      {isUploadingThis && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-[120px] h-1 rounded-full bg-border overflow-hidden">
                            <div className="w-[70%] h-full rounded-full bg-primary" />
                          </div>
                          <span className="font-sans text-[11px] font-medium text-primary">{t('uploading')}</span>
                        </div>
                      )}
                      {isDone && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success-light">
                          <Check size={12} className="text-success" />
                          <span className="font-sans text-[11px] font-medium text-success">{t('uploaded')}</span>
                        </div>
                      )}
                      {isDuplicate && (
                        <div className="inline-flex items-center gap-1.5">
                          <span className="font-sans text-[11px] text-foreground-secondary">{t('alreadyExists')}</span>
                          <Link href={lp(`/files/${item.existingFileId}`)} className="font-sans text-[11px] font-medium text-primary no-underline inline-flex items-center gap-0.5">
                            {tc('open')} <ExternalLink size={10} />
                          </Link>
                        </div>
                      )}
                      {isError && (
                        <div className="flex items-center gap-1">
                          <AlertCircle size={12} className="text-error" />
                          <span className="font-sans text-[11px] text-error max-w-[160px] truncate" title={item.errorMsg}>
                            {item.errorMsg ?? t('failed')}
                          </span>
                        </div>
                      )}
                      {item.status === 'pending' && (
                        <span className="font-sans text-[11px] text-foreground-muted">{t('waiting')}</span>
                      )}
                      {/* Remove — not during upload */}
                      {!isUploadingThis && (
                        <button onClick={() => removeFromQueue(item.id)} className="bg-transparent border-none cursor-pointer p-0.5 text-foreground-muted flex items-center">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Reference Images — design: header + 4-col grid ── */}
        <div className="flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="m-0 font-display text-base font-semibold text-foreground">
              {t('referenceImages')}
            </h2>
            <button
              onClick={() => imageInputRef.current?.click()}
              className="flex items-center gap-1 bg-transparent border-none cursor-pointer font-sans text-[13px] font-medium text-primary p-0"
            >
              <Plus size={14} className="text-primary" /> {t('addImages')}
            </button>
          </div>

          {/* Hidden inputs */}
          <input ref={imageInputRef} type="file" accept={IMAGE_ACCEPT} multiple className="hidden"
            onChange={(e) => { const f = Array.from(e.target.files ?? []); if (f.length) addRefImageFiles(f); e.target.value = ''; }}
          />
          {/* @ts-expect-error webkitdirectory not in TS typings */}
          <input ref={folderInputRef} type="file" webkitdirectory="" multiple className="hidden"
            onChange={(e) => { const f = Array.from(e.target.files ?? []); if (f.length) addFolderImages(f); e.target.value = ''; }}
          />

          {/* 4-column grid: drop-zone card + image cards */}
          <div className="grid grid-cols-4 gap-4">
            {/* Drop zone card */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOverRef(true); }}
              onDragLeave={() => setIsDragOverRef(false)}
              onDrop={(e) => {
                e.preventDefault(); setIsDragOverRef(false);
                const dropped = Array.from(e.dataTransfer.files);
                if (dropped.length) addRefImageFiles(dropped);
              }}
              className={`h-[140px] rounded-lg border flex flex-col items-center justify-center gap-2 transition ${
                isDragOverRef ? 'border-primary bg-primary-light' : 'border-border bg-surface'
              }`}
            >
              <ImagePlus size={24} className="text-foreground-muted" />
              <span className="font-sans text-xs text-foreground-muted">{t('dropImagesHere')}</span>
              {/* Files + Folder buttons — small, inside drop zone */}
              <div className="flex gap-1.5 mt-1">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-sm border border-border bg-card font-sans text-[11px] font-medium text-foreground-secondary cursor-pointer"
                >
                  {t('filesBtn')}
                </button>
                <button
                  type="button"
                  onClick={handleFolderPick}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-sm border border-border bg-card font-sans text-[11px] font-medium text-foreground-secondary cursor-pointer"
                >
                  {t('folderBtn')}
                </button>
              </div>
            </div>

            {/* Image cards */}
            {refImages.map((img) => (
              <div key={img.name} className="overflow-hidden rounded-lg border border-border bg-card flex flex-col">
                {/* Preview */}
                <div className="h-[100px] bg-surface flex items-center justify-center relative overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={URL.createObjectURL(img)} alt={img.name} className="w-full h-full object-cover" />
                </div>
                {/* Info row */}
                <div className="flex items-center justify-between px-3 py-2 bg-card">
                  <span className="font-sans text-[11px] font-medium text-foreground truncate flex-1">
                    {img.name}
                  </span>
                  <button onClick={() => removeRefImage(img.name)} className="bg-transparent border-none cursor-pointer p-0 text-foreground-muted shrink-0 flex items-center">
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <button
            onClick={() => router.push(lp(`/projects/${projectId}`))}
            disabled={isUploading}
            className="px-6 py-2.5 rounded-md border border-border bg-transparent font-sans text-sm font-medium text-foreground-secondary cursor-pointer"
          >
            {tc('cancel')}
          </button>
          <button
            onClick={handleUploadAll}
            disabled={queue.length === 0 || isUploading || queue.some((q) => q.status === 'checking')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-md border-none bg-primary text-primary-foreground font-sans text-sm font-medium ${
              queue.length > 0 && !isUploading ? 'cursor-pointer opacity-100' : 'cursor-not-allowed opacity-60'
            }`}
          >
            {isUploading ? <Spinner size={14} /> : <CloudUpload size={16} />}
            {t('uploadAllFiles')}
          </button>
        </div>

      </div>
    </SidebarLayout>
  );
}
