import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import * as projectController from '../controllers/project.controller.js';

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
});

// Nested under /orgs/:orgId
router.post('/orgs/:orgId/projects', validate(createSchema), projectController.create);
router.get('/orgs/:orgId/projects', projectController.list);

// Direct project access
router.get('/projects/:projectId', projectController.get);
router.patch('/projects/:projectId', validate(updateSchema), projectController.update);
router.delete('/projects/:projectId', projectController.archive);

export default router;
