import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import * as shareController from '../controllers/share.controller.js';

const router = Router();

const createSchema = z.object({
  permission: z.enum(['view', 'download', 'comment']),
  expiresInDays: z.number().int().positive().optional(),
});

// Authenticated routes
router.post('/files/:fileId/share-links', requireAuth, validate(createSchema), shareController.create);
router.get('/files/:fileId/share-links', requireAuth, shareController.list);
router.delete('/share-links/:linkId', requireAuth, shareController.revoke);

// Public route
router.get('/shared/:token', shareController.getShared);

export default router;
