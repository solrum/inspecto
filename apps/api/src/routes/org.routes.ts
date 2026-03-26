import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import * as orgController from '../controllers/org.controller.js';

const router = Router();
router.use(requireAuth);

const createSchema = z.object({ name: z.string().min(1).max(255) });
const updateOrgSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
});
const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'viewer']).optional(),
  teamId: z.string().uuid().optional(),
});
const roleSchema = z.object({ role: z.enum(['admin', 'member', 'viewer']) });

router.post('/', validate(createSchema), orgController.create);
router.get('/', orgController.listMine);
router.get('/:orgId', orgController.get);
router.patch('/:orgId', validate(updateOrgSchema), orgController.update);
router.delete('/:orgId', orgController.remove);
router.get('/:orgId/stats', orgController.getStats);
router.get('/:orgId/activity', orgController.getActivity);
router.post('/:orgId/invite', validate(inviteSchema), orgController.invite);
router.patch('/:orgId/members/:userId', validate(roleSchema), orgController.updateRole);
router.delete('/:orgId/members/:userId', orgController.removeMember);

export default router;
