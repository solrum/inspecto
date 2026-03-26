import multer from 'multer';
import { env } from '../config/env.js';

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']);

const IMAGE_MAGIC_BYTES: { ext: string; magic: number[] }[] = [
  { ext: '.png', magic: [0x89, 0x50, 0x4E, 0x47] },
  { ext: '.jpg', magic: [0xFF, 0xD8, 0xFF] },
  { ext: '.jpeg', magic: [0xFF, 0xD8, 0xFF] },
  { ext: '.gif', magic: [0x47, 0x49, 0x46] },
  { ext: '.webp', magic: [0x52, 0x49, 0x46, 0x46] }, // RIFF header
];

/**
 * Verify image file by checking magic bytes.
 * SVG files are checked by content instead of magic bytes.
 */
export function verifyImageBuffer(buffer: Buffer, ext: string): boolean {
  if (buffer.length === 0) return false;

  // SVG: check for XML/SVG content
  if (ext === '.svg') {
    const head = buffer.subarray(0, 256).toString('utf-8').trim().toLowerCase();
    return head.startsWith('<?xml') || head.startsWith('<svg') || head.includes('<svg');
  }

  // Binary images: check magic bytes
  const entry = IMAGE_MAGIC_BYTES.find((m) => m.ext === ext);
  if (!entry) return false;

  if (buffer.length < entry.magic.length) return false;
  return entry.magic.every((byte, i) => buffer[i] === byte);
}

/**
 * Verify .pen file content: must be valid JSON with required structure.
 */
export function verifyPenBuffer(buffer: Buffer): { valid: boolean; error?: string } {
  if (buffer.length === 0) return { valid: false, error: 'File is empty' };

  let doc: any;
  try {
    doc = JSON.parse(buffer.toString('utf-8'));
  } catch {
    return { valid: false, error: 'File is not valid JSON' };
  }

  if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) {
    return { valid: false, error: 'Document must be a JSON object' };
  }

  if (typeof doc.version !== 'string' || !/^\d+\.\d+/.test(doc.version)) {
    return { valid: false, error: 'Document must have a valid "version" field (e.g. "2.9")' };
  }

  if (!Array.isArray(doc.children)) {
    return { valid: false, error: 'Document must have a "children" array' };
  }

  // Validate top-level children have id and type
  for (let i = 0; i < doc.children.length; i++) {
    const child = doc.children[i];
    if (typeof child !== 'object' || child === null) {
      return { valid: false, error: `children[${i}] must be an object` };
    }
    if (typeof child.id !== 'string' || child.id.length === 0) {
      return { valid: false, error: `children[${i}] must have a non-empty "id" string` };
    }
    if (typeof child.type !== 'string') {
      return { valid: false, error: `children[${i}] must have a "type" string` };
    }
  }

  return { valid: true };
}

export const penUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxFileSize },
  fileFilter: (_req, file, cb) => {
    if (file.originalname.endsWith('.pen') || file.mimetype === 'application/json') {
      cb(null, true);
    } else {
      cb(new Error('Only .pen files are allowed'));
    }
  },
});

// Accepts: field "file" (.pen) + field "images" (image files)
export const penUploadWithImages = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxImageSize },
  fileFilter: (_req, file, cb) => {
    const ext = '.' + file.originalname.split('.').pop()!.toLowerCase();
    if (file.fieldname === 'file' && (file.originalname.endsWith('.pen') || file.mimetype === 'application/json')) {
      cb(null, true);
    } else if (file.fieldname === 'images' && IMAGE_EXTS.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
}).fields([
  { name: 'file', maxCount: 1 },
  { name: 'images', maxCount: 100 },
]);
