# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pencil Cloud is a cloud platform for small teams (2-10 people) to upload, share, review, and version-control `.pen` design files. The `.pen` format is a JSON-based document tree used by [Pencil](https://pencil.dev) (a design tool).

## Architecture

**Monorepo** using pnpm workspaces:

- `packages/shared` (`@pencil-cloud/shared`) — Shared TypeScript types and `.pen` format utilities (parsing, diffing, validation)
- `apps/api` (`@pencil-cloud/api`) — Express + TypeScript REST API backend
- `apps/web` (`@pencil-cloud/web`) — Next.js 15 frontend (App Router)

**Infrastructure** (via Docker Compose):
- PostgreSQL — Structured data (users, teams, projects, file metadata, comments)
- MinIO — S3-compatible file storage for `.pen` files and thumbnails

## Common Commands

```bash
# Install dependencies
pnpm install

# Start all services (DB, MinIO)
docker compose up -d

# Run API and Web concurrently
pnpm dev

# Run individually
pnpm dev:api          # Express API on :3001
pnpm dev:web          # Next.js on :3000

# Database
pnpm db:migrate       # Run migrations
pnpm db:rollback      # Rollback last migration

# Build & Test
pnpm build            # Build all packages
pnpm test             # Run all tests
pnpm lint             # Type-check all packages

# Run a single test file
pnpm --filter @pencil-cloud/api vitest run src/services/__tests__/file-version.test.ts
```

## Key Technical Decisions

- **File storage**: `.pen` files stored gzip-compressed in S3 (MinIO locally). PostgreSQL only stores metadata + `node_summary` (JSONB cache of top-level node IDs/names/types).
- **Version diffing**: Tree-aware diff using stable node `id` fields from .pen format. Computed synchronously after upload, stored in `version_diffs` table.
- **Comment anchoring**: Comments store `node_id` (pen node ID) + `node_path` (breadcrumb). Carry forward across versions if node still exists; shown as "orphaned" otherwise.
- **Auth**: JWT-based with team roles (admin/member/viewer). Share links use random tokens with configurable permissions (view/download/comment).
- **Preview**: Server-generated PNG thumbnails per frame. Client overlays bounding boxes for node highlighting (avoids rebuilding Pencil's full renderer).

## .pen File Format

- JSON-based document tree. Each node has a unique `id` (no slashes), `type`, and position (`x`, `y`).
- Node types: `frame`, `group`, `rectangle`, `ellipse`, `text`, `line`, `polygon`, `path`, `icon_font`, `ref` (component instance), `note`, `prompt`, `context`.
- Components: nodes with `reusable: true`. Instances use `ref` type pointing to component's `id`, with `descendants` for property overrides.
- Variables: `$variableName` syntax, support themes with multi-axis theming.
- **IMPORTANT**: `.pen` file contents are encrypted and must only be accessed via Pencil MCP tools (`batch_get`, `batch_design`), NOT via `Read`/`Grep`.

## Database Schema

Core tables: `users`, `teams`, `team_members`, `projects`, `files`, `file_versions`, `version_diffs`, `comments`, `share_links`. Migrations in `apps/api/migrations/` using Knex.

## API Structure

Routes follow REST conventions under `/api`:
- `/api/auth/*` — Registration, login, JWT refresh
- `/api/teams/*` — Team CRUD, member management
- `/api/projects/*` — Project CRUD within teams
- `/api/files/*` — File upload/download, version management
- `/api/comments/*` — Threaded comments with node anchoring
- `/api/shared/:token` — Public share link access

## Environment

Copy `.env.example` to `.env`. Key variables: `DATABASE_URL`, `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `JWT_SECRET`.

## Frontend Coding Standards (`apps/web`)

### Styling — Tailwind v4 (REQUIRED)

The project uses **Tailwind CSS v4** (PostCSS API). All design tokens are defined in `src/app/globals.css` inside `@theme {}`. **Never use inline `style={{}}` — always use Tailwind classes.**

```tsx
// BAD
<div style={{ color: '#7C3AED', padding: 16, borderRadius: 8 }}>

// GOOD
<div className="text-primary p-4 rounded-md">
```

**Exception**: Inline styles are only acceptable for truly dynamic values that cannot be expressed with Tailwind (e.g. `style={{ width: someVariable }}` for pixel-perfect computed widths). Even then, prefer CSS variables.

### Design Tokens → Tailwind Classes

All tokens map directly to Tailwind utilities via the `@theme` block:

| Category | Token | Tailwind class |
|---|---|---|
| **Colors** | `--color-primary` | `text-primary` / `bg-primary` |
| | `--color-foreground` | `text-foreground` |
| | `--color-foreground-secondary` | `text-foreground-secondary` |
| | `--color-foreground-muted` | `text-foreground-muted` |
| | `--color-background` | `bg-background` |
| | `--color-card` | `bg-card` |
| | `--color-surface` | `bg-surface` |
| | `--color-border` | (use `inset-shadow-border`) |
| | `--color-error` | `text-error` / `bg-error` |
| | `--color-success` | `text-success` / `bg-success` |
| | `--color-warning` | `text-warning` / `bg-warning` |
| **Radius** | `--radius-sm` → `4px` | `rounded-sm` |
| | `--radius-md` → `8px` | `rounded-md` |
| | `--radius-lg` → `12px` | `rounded-lg` |
| | `--radius-xl` → `16px` | `rounded-xl` |
| | `--radius-pill` → `9999px` | `rounded-pill` |
| **Shadows** | `--shadow-sm/md/lg/xl/dialog` | `shadow-sm` / `shadow-dialog` |
| **Borders** | `--inset-shadow-border` | `inset-shadow-border` |
| | `--inset-shadow-border-strong` | `inset-shadow-border-strong` |
| | `--inset-shadow-border-error` | `inset-shadow-border-error` |
| | `--inset-shadow-border-primary` | `inset-shadow-border-primary` |
| **Fonts** | `--font-sans` = Inter | `font-sans` |
| | `--font-display` = Space Grotesk | `font-display` |
| | `--font-mono` = JetBrains Mono | `font-mono` |

**Never hardcode hex colors** — always use a semantic token class. If a needed token doesn't exist, add it to `globals.css`.

### Borders

Use `inset-shadow-*` instead of CSS `border` for consistent 1px borders:

```tsx
// BAD
<div style={{ border: '1px solid #E5E7EB' }}>
<div className="border border-gray-200">

// GOOD
<div className="inset-shadow-border">
<div className="inset-shadow-border-strong">   // #D1D5DB
<div className="inset-shadow-border-primary">  // primary color
```

### Component Structure

Use **variant/size config objects** + `cn()` utility:

```tsx
import { cn } from '@/lib/cn';

const variants = {
  primary: 'bg-primary text-primary-foreground',
  secondary: 'bg-background text-foreground inset-shadow-border',
} as const;

export function MyComponent({ variant = 'primary', className, ...props }) {
  return (
    <div className={cn('base-classes', variants[variant], className)} {...props} />
  );
}
```

### Text & Strings

All user-visible text strings must be defined as **named constants** — never scatter raw string literals directly in JSX. This allows future i18n extraction:

```tsx
// BAD
<button>Upload File</button>
<p>No files yet. Click "Upload File" to add your first design file.</p>

// GOOD — define at top of file or in a shared strings file
const LABELS = {
  uploadFile: 'Upload File',
  emptyState: 'No files yet. Click "Upload File" to add your first design file.',
} as const;

<button>{LABELS.uploadFile}</button>
<p>{LABELS.emptyState}</p>
```

### Animations

Use the custom utility classes defined in `globals.css`:

```tsx
<div className="animate-in">      // fade-in 0.2s
<div className="animate-scale-in"> // scale + fade 0.15s
<div className="slide-in-from-right"> // slide from right 0.3s
```

### Dropdowns / Portals

Any dropdown, tooltip, or popover that renders inside a scrollable or `overflow-hidden` container **must** use `createPortal(…, document.body)` with `position: fixed` coordinates computed from `getBoundingClientRect()`.

### Dialogs / Confirms

Never use `window.confirm()` or `window.alert()`. Always use the `<ConfirmDialog>` component (`src/components/ui/confirm-dialog.tsx`) for destructive confirmations.
