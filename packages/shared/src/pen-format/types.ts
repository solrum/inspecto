// .pen format types (subset needed for cloud operations)
// Full spec: https://docs.pencil.dev/for-developers/the-pen-format

export type PenNodeType =
  | 'frame'
  | 'group'
  | 'rectangle'
  | 'ellipse'
  | 'line'
  | 'polygon'
  | 'path'
  | 'text'
  | 'note'
  | 'prompt'
  | 'context'
  | 'icon_font'
  | 'ref';

export interface PenNode {
  id: string;
  type: PenNodeType;
  name?: string;
  x?: number;
  y?: number;
  width?: number | string;
  height?: number | string;
  reusable?: boolean;
  children?: PenNode[];
  ref?: string;
  descendants?: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
}

export interface PenVariable {
  type: 'boolean' | 'color' | 'number' | 'string';
  value: unknown;
}

export interface PenDocument {
  version: string;
  themes?: Record<string, string[]>;
  imports?: Record<string, string>;
  variables?: Record<string, PenVariable>;
  children: PenNode[];
}

/**
 * Validate basic .pen document structure.
 * Returns null if valid, error message if invalid.
 */
export function validatePenDocument(data: unknown): string | null {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return 'Document must be a JSON object';
  }
  const doc = data as Record<string, unknown>;
  if (typeof doc.version !== 'string' || !/^\d+\.\d+/.test(doc.version)) {
    return 'Document must have a valid "version" field (e.g. "2.9")';
  }
  if (!Array.isArray(doc.children)) {
    return 'Document must have a "children" array field';
  }
  for (let i = 0; i < doc.children.length; i++) {
    const child = doc.children[i];
    if (typeof child !== 'object' || child === null) {
      return `children[${i}] must be an object`;
    }
    if (typeof (child as any).id !== 'string' || (child as any).id.length === 0) {
      return `children[${i}] must have a non-empty "id" string`;
    }
    if (typeof (child as any).type !== 'string') {
      return `children[${i}] must have a "type" string`;
    }
  }
  return null;
}

/**
 * Extract top-level node summaries from a .pen document.
 */
export function extractNodeSummary(
  doc: PenDocument
): { id: string; name: string | null; type: string }[] {
  return doc.children.map((child) => ({
    id: child.id,
    name: child.name ?? null,
    type: child.type,
  }));
}

/**
 * Flat info about a node, including its frame and parent context.
 * Used for comment anchor carry-forward fuzzy matching.
 */
export interface NodeInfo {
  id: string;
  name: string | null;
  type: string;
  frameId: string;       // id of the top-level frame this node lives in
  parentId: string | null;
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
}

/**
 * Build a flat lookup map of ALL nodes in the document (recursive).
 * Key = node id. Used during carry-forward to match comments after version upload.
 */
export function extractNodeLookup(doc: PenDocument): Map<string, NodeInfo> {
  const map = new Map<string, NodeInfo>();

  function walk(node: PenNode, frameId: string, parentId: string | null) {
    map.set(node.id, {
      id: node.id,
      name: node.name ?? null,
      type: node.type,
      frameId,
      parentId,
      x: typeof node.x === 'number' ? node.x : null,
      y: typeof node.y === 'number' ? node.y : null,
      width: typeof node.width === 'number' ? node.width : null,
      height: typeof node.height === 'number' ? node.height : null,
    });
    if (node.children) {
      for (const child of node.children) walk(child, frameId, node.id);
    }
  }

  for (const frame of doc.children) {
    walk(frame, frame.id, null);
  }

  return map;
}

/**
 * Frame index entry — stored in DB for fast frame listing without fetching S3.
 */
export interface FrameIndexEntry {
  id: string;
  name: string | null;
  type: string;
  width: number | string | null;
  height: number | string | null;
  x: number | null;
  y: number | null;
  nodeCount: number;
}

/**
 * Extract frame index from .pen document.
 * Includes size/position + recursive node count for each top-level frame.
 */
export function extractFrameIndex(doc: PenDocument): FrameIndexEntry[] {
  function countNodes(node: PenNode): number {
    let count = 1;
    if (node.children) {
      for (const child of node.children) count += countNodes(child);
    }
    return count;
  }

  return doc.children.map((child) => ({
    id: child.id,
    name: child.name ?? null,
    type: child.type,
    width: child.width ?? null,
    height: child.height ?? null,
    x: child.x ?? null,
    y: child.y ?? null,
    nodeCount: countNodes(child),
  }));
}

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']);

function collectImageRefs(value: unknown, found: Set<string>): void {
  if (typeof value === 'string') {
    // Match relative paths like "images/foo.png", ".images/foo.png", or "foo.png"
    const trimmed = value.trim();
    if (trimmed.length > 0 && !trimmed.startsWith('http') && !trimmed.startsWith('data:')) {
      const ext = trimmed.split('.').pop()?.toLowerCase() ?? '';
      if (IMAGE_EXTENSIONS.has(ext)) {
        found.add(trimmed);
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectImageRefs(v, found);
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) {
      collectImageRefs(v, found);
    }
  }
}

/**
 * Extract all relative image paths referenced in a .pen document.
 * Returns basenames only (e.g., "photo.png"), deduplicated.
 */
export function extractImageRefs(doc: PenDocument): string[] {
  const found = new Set<string>();
  collectImageRefs(doc, found);
  // Normalize: strip leading path like "images/" or ".images/"
  return Array.from(found).map((p) => p.replace(/^\.?images[\\/]/, ''));
}

/**
 * Extract a single frame + document variables from a full .pen document.
 * Returns a minimal document containing only that frame.
 */
export function extractSingleFrame(
  doc: PenDocument,
  frameId: string,
): PenDocument | null {
  const frame = doc.children.find((c) => c.id === frameId);
  if (!frame) return null;

  return {
    version: doc.version,
    themes: doc.themes,
    variables: doc.variables,
    children: [frame],
  };
}
