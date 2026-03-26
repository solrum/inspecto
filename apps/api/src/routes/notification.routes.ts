import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as notifController from '../controllers/notification.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/', notifController.list);
router.get('/unread-count', notifController.unreadCount);
router.post('/:notificationId/read', notifController.markRead);
router.post('/read-all', notifController.markAllRead);

export default router;
