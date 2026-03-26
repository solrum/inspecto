'use client';

import { useCallback, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { extractImageRefs } from '@inspecto/shared';
import { cn } from '@/lib/cn';
import { validatePenFile, validateImageFile } from '@/lib/file-validation';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { Upload, CheckCircle2, AlertCircle, ImageIcon, FolderOpen, X, FileText } from 'lucide-react';
import { useT } from '@/components/dictionary-provider';

const IMAGE_ACCEPT = 'image/png,image/jpeg,image/gif,image/webp,image/svg+xml';

interface ImageRefStatus {
  filename: string;
  matched: File | null;
}

interface Props {
  onUpload: (penFile: File, images: File[]) => void;
  isPending: boolean;
  allowSkipImages?: boolean;
}

export function PenUploadPanel({ onUpload, isPending, allowSkipImages = true }: Props) {
  const t = useT('uploadPanel');
  const toast = useToast();
  const [penFile, setPenFile] = useState<File | null>(null);
  const [imageRefs, setImageRefs] = useState<ImageRefStatus[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragOverImages, setIsDragOverImages] = useState(false);
  // Dedicated inputs — completely separate from pen dropzone
  const imageInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // ── Parse .pen and extract image refs ──────────────────────────────────
  async function parsePenFile(file: File): Promise<ImageRefStatus[] | null> {
    setParseError(null);
    setPenFile(file);
    setImageRefs([]);

    // Validate .pen structure before parsing
    const error = await validatePenFile(file);
    if (error) {
      setParseError(error);
      setPenFile(null);
      return null;
    }

    try {
      const text = await file.text();
      const doc = JSON.parse(text);
      const refs = extractImageRefs(doc);
      return refs.map((filename) => ({ filename, matched: null }));
    } catch {
      setParseError(t('parseError'));
      setPenFile(null);
      return null;
    }
  }

  // ── Match images to refs by basename (case-insensitive) ─────────────────
  function applyImages(refs: ImageRefStatus[], files: File[]): ImageRefStatus[] {
    return refs.map((ref) => {
      const refBasename = ref.filename.split(/[\\/]/).pop()!.toLowerCase();
      const match = files.find((f) => f.name.toLowerCase() === refBasename) ?? ref.matched;
      return { ...ref, matched: match ?? null };
    });
  }

  async function addImages(files: File[]) {
    const validFiles: File[] = [];
    for (const file of files) {
      const error = await validateImageFile(file);
      if (error) {
        toast.add(error, 'error');
      } else {
        validFiles.push(file);
      }
    }
    if (validFiles.length > 0) {
      setImageRefs((prev) => applyImages(prev, validFiles));
    }
  }

  function removeImage(refFilename: string) {
    setImageRefs((prev) =>
      prev.map((ref) => (ref.filename === refFilename ? { ...ref, matched: null } : ref)),
    );
  }

  // ── Pen-file-only dropzone ───────────────────────────────────────────────
  const onDropPen = useCallback(async (accepted: File[]) => {
    const pen = accepted.find((f) => f.name.endsWith('.pen'));
    if (!pen) return;
    const refs = await parsePenFile(pen);
    if (refs) setImageRefs(refs);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropPen,
    accept: { 'application/json': ['.pen'] },
    multiple: false,
    disabled: isPending || !!penFile,
  });

  // ── Image input handlers ─────────────────────────────────────────────────
  function handleImageInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) addImages(files);
    e.target.value = '';
  }

  // Folder selection: auto-filter to only images that match a ref basename
  function handleFolderInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const allFiles = Array.from(e.target.files ?? []);
    const refBasenames = new Set(
      imageRefs.map((r) => r.filename.split(/[\\/]/).pop()!.toLowerCase()),
    );
    const matched = allFiles.filter(
      (f) => f.type.startsWith('image/') && refBasenames.has(f.name.toLowerCase()),
    );
    if (matched.length > 0) addImages(matched);
    e.target.value = '';
  }

  function handleImageDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOverImages(true);
  }

  function handleImageDragLeave() {
    setIsDragOverImages(false);
  }

  function handleImageDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOverImages(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (files.length > 0) addImages(files);
  }

  // ── Derived state ────────────────────────────────────────────────────────
  const matched = imageRefs.filter((r) => r.matched !== null).length;
  const total = imageRefs.length;
  const allMatched = total > 0 && matched === total;
  const canUpload = penFile !== null && (total === 0 || allMatched || allowSkipImages);

  function handleUpload() {
    if (!penFile) return;
    const images = imageRefs.flatMap((r) => (r.matched ? [r.matched] : []));
    onUpload(penFile, images);
  }

  function reset() {
    setPenFile(null);
    setImageRefs([]);
    setParseError(null);
  }

  // ── No file selected — pen dropzone ─────────────────────────────────────
  if (!penFile) {
    return (
      <div>
        {parseError && (
          <div className="mb-3 flex items-center gap-2 rounded-md bg-error-light px-3 py-2 text-xs text-error">
            <AlertCircle size={14} /> {parseError}
          </div>
        )}
        <div
          {...getRootProps()}
          className={cn(
            'group cursor-pointer rounded-lg border-2 border-dashed transition-all',
            isDragActive
              ? 'border-info bg-info-light/50'
              : 'border-border hover:border-foreground-muted hover:bg-surface/50',
            isPending && 'pointer-events-none opacity-60',
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center py-10">
            <div className={cn('mb-3 rounded-lg p-3 transition', isDragActive ? 'bg-info-light' : 'bg-surface group-hover:bg-border')}>
              <Upload size={22} className={isDragActive ? 'text-info' : 'text-foreground-secondary'} />
            </div>
            <p className="text-sm font-medium text-foreground">
              {isDragActive ? t('dropToUpload') : t('uploadPenFile')}
            </p>
            <p className="mt-0.5 text-xs text-foreground-muted">
              {t('dragAndDrop')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── File selected — image matching panel ────────────────────────────────
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {/* File header */}
      <div className="flex items-center justify-between border-b border-surface bg-surface/50 px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface">
            <FileText size={16} className="text-foreground-secondary" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{penFile.name}</p>
            <p className="text-xs text-foreground-muted">{(penFile.size / 1024).toFixed(1)} KB</p>
          </div>
        </div>
        {!isPending && (
          <button
            onClick={reset}
            className="ml-2 shrink-0 rounded-md p-1 text-foreground-muted hover:bg-surface hover:text-foreground-secondary transition"
          >
            <X size={15} />
          </button>
        )}
      </div>

      <div className="p-4">
        {total > 0 ? (
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground-secondary uppercase tracking-wide">
                {t('imageReferences')}
              </p>
              <span className={cn('text-xs font-medium', allMatched ? 'text-success' : 'text-foreground-muted')}>
                {t('matched', { matched, total })}
              </span>
            </div>

            {/* Ref list */}
            <div className="mb-3 space-y-1.5 max-h-40 overflow-y-auto">
              {imageRefs.map((ref) => (
                <div
                  key={ref.filename}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-3 py-2 text-xs',
                    ref.matched ? 'bg-success-light' : 'bg-surface',
                  )}
                >
                  {ref.matched
                    ? <CheckCircle2 size={13} className="shrink-0 text-success" />
                    : <AlertCircle size={13} className="shrink-0 text-warning" />}
                  <span className="flex-1 truncate font-mono text-foreground-secondary">
                    {ref.filename}
                  </span>
                  {ref.matched && (
                    <button
                      onClick={() => removeImage(ref.filename)}
                      className="shrink-0 text-foreground-muted hover:text-error transition"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Drop zone + action row */}
            <div
              onDragOver={handleImageDragOver}
              onDragLeave={handleImageDragLeave}
              onDrop={handleImageDrop}
              className={cn(
                'rounded-md border border-dashed transition-all',
                isDragOverImages
                  ? 'border-info bg-info-light/50'
                  : 'border-border',
              )}
            >
              <div className="flex items-center gap-2 px-3 py-2.5">
                <ImageIcon size={13} className="shrink-0 text-foreground-muted" />
                <span className="flex-1 text-xs text-foreground-muted">
                  {isDragOverImages ? t('dropImages') : t('dropImagesOr')}
                </span>
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground-secondary hover:bg-surface transition"
                >
                  <ImageIcon size={11} /> {t('filesBtn')}
                </button>
                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground-secondary hover:bg-surface transition"
                >
                  <FolderOpen size={11} /> {t('folderBtn')}
                </button>
              </div>
            </div>

            {/* Hidden file input — individual images */}
            <input
              ref={imageInputRef}
              type="file"
              accept={IMAGE_ACCEPT}
              multiple
              className="hidden"
              onChange={handleImageInputChange}
            />
            {/* Hidden folder input — auto-filters to matching images only */}
            <input
              ref={folderInputRef}
              type="file"
              // @ts-expect-error webkitdirectory not in TS typings
              webkitdirectory=""
              multiple
              className="hidden"
              onChange={handleFolderInputChange}
            />
          </div>
        ) : (
          <p className="mb-4 text-xs text-foreground-muted">
            {t('noImageRefs')}
          </p>
        )}

        <Button
          onClick={handleUpload}
          disabled={!canUpload || isPending}
          className="w-full"
        >
          {isPending ? (
            <><Spinner size={14} className="mr-1.5" /> {t('uploadingBtn')}</>
          ) : total > 0 && !allMatched ? (
            t('uploadMissing', { count: total - matched })
          ) : (
            t('uploadBtn')
          )}
        </Button>

        {total > 0 && !allMatched && !isPending && (
          <p className="mt-2 text-center text-xs text-foreground-muted">
            {t('missingWarning')}
          </p>
        )}
      </div>
    </div>
  );
}
