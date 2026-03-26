/**
 * Client-side file validation for .pen files and images.
 * Mirrors backend verification to catch issues before upload.
 */

const IMAGE_MAGIC: { ext: string; bytes: number[] }[] = [
  { ext: '.png', bytes: [0x89, 0x50, 0x4E, 0x47] },
  { ext: '.jpg', bytes: [0xFF, 0xD8, 0xFF] },
  { ext: '.jpeg', bytes: [0xFF, 0xD8, 0xFF] },
  { ext: '.gif', bytes: [0x47, 0x49, 0x46] },
  { ext: '.webp', bytes: [0x52, 0x49, 0x46, 0x46] },
];

/**
 * Validate a .pen file: must be valid JSON with version + children.
 * Returns null if valid, error string if invalid.
 */
export async function validatePenFile(file: File): Promise<string | null> {
  if (file.size === 0) return 'File is empty';

  if (!file.name.endsWith('.pen')) return 'File must have .pen extension';

  let text: string;
  try {
    text = await file.text();
  } catch {
    return 'Cannot read file contents';
  }

  let doc: any;
  try {
    doc = JSON.parse(text);
  } catch {
    return 'File is not valid JSON';
  }

  if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) {
    return 'Document must be a JSON object';
  }

  if (typeof doc.version !== 'string' || !/^\d+\.\d+/.test(doc.version)) {
    return 'Missing or invalid "version" field';
  }

  if (!Array.isArray(doc.children)) {
    return 'Missing "children" array';
  }

  for (let i = 0; i < Math.min(doc.children.length, 50); i++) {
    const child = doc.children[i];
    if (typeof child !== 'object' || child === null) {
      return `children[${i}] is not an object`;
    }
    if (typeof child.id !== 'string' || child.id.length === 0) {
      return `children[${i}] missing "id"`;
    }
    if (typeof child.type !== 'string') {
      return `children[${i}] missing "type"`;
    }
  }

  return null;
}

/**
 * Validate an image file by checking magic bytes and extension.
 * Returns null if valid, error string if invalid.
 */
export async function validateImageFile(file: File): Promise<string | null> {
  if (file.size === 0) return `${file.name}: file is empty`;

  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '');
  const ALLOWED = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']);

  if (!ALLOWED.has(ext)) {
    return `${file.name}: unsupported image format (${ext})`;
  }

  // Read first 16 bytes for magic check
  const slice = file.slice(0, 16);
  const buf = new Uint8Array(await slice.arrayBuffer());

  // SVG: check text content
  if (ext === '.svg') {
    const head = await file.slice(0, 256).text();
    const lower = head.trim().toLowerCase();
    if (!lower.startsWith('<?xml') && !lower.startsWith('<svg') && !lower.includes('<svg')) {
      return `${file.name}: not a valid SVG file`;
    }
    return null;
  }

  // Binary: check magic bytes
  const entry = IMAGE_MAGIC.find((m) => m.ext === ext);
  if (!entry) return `${file.name}: unknown format`;

  if (buf.length < entry.bytes.length) {
    return `${file.name}: file too small to be a valid ${ext}`;
  }

  const match = entry.bytes.every((b, i) => buf[i] === b);
  if (!match) {
    return `${file.name}: content does not match ${ext} format`;
  }

  return null;
}
