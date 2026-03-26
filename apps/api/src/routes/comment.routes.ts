import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import * as commentController from '../controllers/comment.controller.js';

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  body: z.string().min(1).max(5000),
  versionId: z.string().uuid().optional(),
  parentCommentId: z.string().uuid().optional(),
  // Frame anchor
  frameId: z.string().optional(),
  pinXRatio: z.number().min(0).max(1).optional(),
  pinYRatio: z.number().min(0).max(1).optional(),
  // Node anchor
  nodeId: z.string().optional(),
  anchorMeta: z.object({
    name: z.string().nullable().optional(),
    type: z.string(),
    parentId: z.string().nullable().optional(),
    bbox: z.object({
      x: z.number().nullable(),
      y: z.number().nullable(),
      w: z.number().nullable(),
      h: z.number().nullable(),
    }),
  }).optional(),
});

// GET /files/:fileId/comments?frameId=&versionId=
router.get('/files/:fileId/comments', commentController.list);
// POST /files/:fileId/comments
router.post('/files/:fileId/comments', validate(createSchema), commentController.create);
router.post('/comments/:commentId/resolve', commentController.resolve);
router.delete('/comments/:commentId', commentController.remove);

export default router;
