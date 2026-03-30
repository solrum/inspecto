/**
 * Client-side file validation — thin wrappers around @inspecto/shared.
 * Converts browser File objects to bytes/text for shared validators.
 */

import { verifyImageBytes, verifyPenContent, IMAGE_EXTS } from '@inspecto/shared';

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

  const result = verifyPenContent(text);
  return result.valid ? null : result.error!;
}

/**
 * Validate an image file by checking magic bytes.
 * Returns null if valid, error string if invalid.
 */
export async function validateImageFile(file: File): Promise<string | null> {
  if (file.size === 0) return `${file.name}: file is empty`;

  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '');
  if (!IMAGE_EXTS.has(ext)) {
    return `${file.name}: unsupported image format (${ext})`;
  }

  // Read enough bytes for magic check (256 for SVG text detection)
  const readSize = ext === '.svg' ? 256 : 16;
  const buf = new Uint8Array(await file.slice(0, readSize).arrayBuffer());
  const result = verifyImageBytes(buf, ext);
  return result.valid ? null : `${file.name}: ${result.error}`;
}
