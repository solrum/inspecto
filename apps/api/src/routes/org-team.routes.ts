import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import * as teamController from '../controllers/org-team.controller.js';

const router = Router({ mergeParams: true });
router.use(requireAuth);

const createSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  leadId: z.string().uuid().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  leadId: z.string().uuid().nullable().optional(),
});

const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
});

const memberRoleSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer']),
});

const permissionsSchema = z.object({
  viewFiles: z.boolean(),
  editFiles: z.boolean(),
  deleteFiles: z.boolean(),
  uploadFiles: z.boolean(),
  addComments: z.boolean(),
  deleteComments: z.boolean(),
  resolveComments: z.boolean(),
  inviteMembers: z.boolean(),
  removeMembers: z.boolean(),
  changeRoles: z.boolean(),
});

const notificationsSchema = z.object({
  settings: z.object({
    newUpload: z.boolean(),
    fileUpdate: z.boolean(),
    newComment: z.boolean(),
    commentReply: z.boolean(),
    memberJoined: z.boolean(),
    memberLeft: z.boolean(),
  }),
  delivery: z.enum(['inApp', 'emailImportant', 'emailAll']),
});

// Teams CRUD
router.post('/', validate(createSchema), teamController.create);
router.get('/', teamController.list);
router.get('/:teamId', teamController.get);
router.patch('/:teamId', validate(updateSchema), teamController.update);
router.delete('/:teamId', teamController.remove);

// Team members
router.post('/:teamId/members', validate(addMemberSchema), teamController.addMember);
router.patch('/:teamId/members/:userId', validate(memberRoleSchema), teamController.updateMemberRole);
router.delete('/:teamId/members/:userId', teamController.removeMember);

// Team permissions
router.get('/:teamId/permissions', teamController.getPermissions);
router.put('/:teamId/permissions', validate(permissionsSchema), teamController.updatePermissions);

// Team notification settings
router.get('/:teamId/notifications', teamController.getNotifications);
router.put('/:teamId/notifications', validate(notificationsSchema), teamController.updateNotifications);

export default router;
