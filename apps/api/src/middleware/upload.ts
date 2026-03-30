import multer from 'multer';
import { env } from '../config/env.js';
import { verifyImageBytes, verifyPenContent, IMAGE_EXTS } from '@inspecto/shared';
import type { ValidationResult } from '@inspecto/shared';

export type { ValidationResult };

/**
 * Verify image Buffer — delegates to shared validation.
 */
export function verifyImageBuffer(buffer: Buffer, ext: string): ValidationResult {
  return verifyImageBytes(buffer, ext);
}

/**
 * Verify .pen file Buffer — delegates to shared validation.
 */
export function verifyPenBuffer(buffer: Buffer): ValidationResult {
  if (buffer.length === 0) return { valid: false, error: 'File is empty' };
  return verifyPenContent(buffer.toString('utf-8'));
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
