/**
 * Shared file validation for .pen files and images.
 * Used by both API (Buffer) and client (Uint8Array).
 */

export const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']);

export const IMAGE_MAGIC = [
  { exts: ['.png'], bytes: [0x89, 0x50, 0x4E, 0x47], label: 'PNG' },
  { exts: ['.jpg', '.jpeg'], bytes: [0xFF, 0xD8, 0xFF], label: 'JPEG' },
  { exts: ['.gif'], bytes: [0x47, 0x49, 0x46], label: 'GIF' },
  { exts: ['.webp'], bytes: [0x52, 0x49, 0x46, 0x46], label: 'WebP' },
] as const;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Verify image bytes. Works with any array-like of bytes (Buffer, Uint8Array).
 * Detects format from magic bytes — allows extension mismatch (e.g. JPEG saved as .png).
 */
export function verifyImageBytes(bytes: ArrayLike<number>, ext: string): ValidationResult {
  if (bytes.length === 0) return { valid: false, error: 'file is empty' };

  // SVG: check text content (not binary magic)
  if (ext === '.svg') {
    const head = String.fromCharCode(...Array.from({ length: Math.min(bytes.length, 256) }, (_, i) => bytes[i]))
      .trim().toLowerCase();
    const ok = head.startsWith('<?xml') || head.startsWith('<svg') || head.includes('<svg');
    return ok ? { valid: true } : { valid: false, error: 'not a valid SVG file' };
  }

  // Binary: detect format from magic bytes
  const detected = IMAGE_MAGIC.find((m) => {
    if (bytes.length < m.bytes.length) return false;
    return m.bytes.every((b, i) => bytes[i] === b);
  });

  if (!detected) {
    return { valid: false, error: 'content does not match any supported image format' };
  }

  return { valid: true };
}

/**
 * Verify .pen file content: must be valid JSON with version + children.
 */
export function verifyPenContent(text: string): ValidationResult {
  if (text.length === 0) return { valid: false, error: 'File is empty' };

  let doc: any;
  try {
    doc = JSON.parse(text);
  } catch {
    return { valid: false, error: 'File is not valid JSON' };
  }

  if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) {
    return { valid: false, error: 'Document must be a JSON object' };
  }

  if (typeof doc.version !== 'string' || !/^\d+\.\d+/.test(doc.version)) {
    return { valid: false, error: 'Missing or invalid "version" field' };
  }

  if (!Array.isArray(doc.children)) {
    return { valid: false, error: 'Missing "children" array' };
  }

  for (let i = 0; i < Math.min(doc.children.length, 50); i++) {
    const child = doc.children[i];
    if (typeof child !== 'object' || child === null) {
      return { valid: false, error: `children[${i}] is not an object` };
    }
    if (typeof child.id !== 'string' || child.id.length === 0) {
      return { valid: false, error: `children[${i}] missing "id"` };
    }
    if (typeof child.type !== 'string') {
      return { valid: false, error: `children[${i}] missing "type"` };
    }
  }

  return { valid: true };
}
