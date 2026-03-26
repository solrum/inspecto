import type { Request, Response, NextFunction } from 'express';
import * as notifService from '../services/notification.service.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const unreadOnly = req.query.unread === 'true';
    const notifications = await notifService.listNotifications(req.auth!.userId, { limit, offset, unreadOnly });
    res.json(notifications);
  } catch (err) { next(err); }
}

export async function unreadCount(req: Request, res: Response, next: NextFunction) {
  try {
    const count = await notifService.countUnread(req.auth!.userId);
    res.json({ count });
  } catch (err) { next(err); }
}

export async function markRead(req: Request, res: Response, next: NextFunction) {
  try {
    const ok = await notifService.markAsRead(req.params.notificationId as string, req.auth!.userId);
    if (!ok) { res.status(404).json({ error: 'Notification not found' }); return; }
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function markAllRead(req: Request, res: Response, next: NextFunction) {
  try {
    await notifService.markAllAsRead(req.auth!.userId);
    res.json({ success: true });
  } catch (err) { next(err); }
}
