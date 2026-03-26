import { db } from '../config/database.js';
import { env } from '../config/env.js';
import { sendMail } from '../config/mailer.js';

type NotificationType =
  | 'file_upload'
  | 'file_update'
  | 'comment_new'
  | 'comment_reply'
  | 'member_joined'
  | 'member_left';

interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  body: string;
  orgId: string;
  actorId?: string;
  teamId?: string;
  fileId?: string;
  commentId?: string;
}

// ─── Core ───────────────────────────────────────────────────────────────

/**
 * Create notifications for all relevant users.
 * Respects per-user team notification settings and delivery preferences.
 */
export async function notify(input: CreateNotificationInput) {
  const { type, orgId, teamId, actorId } = input;

  // Determine recipients: team members (if teamId) or all org members
  let recipientIds: string[];

  if (teamId) {
    const members = await db('team_members').where('team_id', teamId).select('user_id');
    recipientIds = members.map((m) => m.user_id);
  } else {
    const members = await db('org_members').where('org_id', orgId).select('user_id');
    recipientIds = members.map((m) => m.user_id);
  }

  // Exclude the actor (don't notify yourself)
  if (actorId) {
    recipientIds = recipientIds.filter((id) => id !== actorId);
  }

  if (recipientIds.length === 0) return;

  // Map notification type to settings key
  const settingsKeyMap: Record<NotificationType, string> = {
    file_upload: 'newUpload',
    file_update: 'fileUpdate',
    comment_new: 'newComment',
    comment_reply: 'commentReply',
    member_joined: 'memberJoined',
    member_left: 'memberLeft',
  };
  const settingsKey = settingsKeyMap[type];

  // Load team notification settings for filtering
  let userSettings: Map<string, { enabled: boolean; delivery: string }> = new Map();

  if (teamId && settingsKey) {
    const rows = await db('team_notification_settings')
      .where('team_id', teamId)
      .whereIn('user_id', recipientIds)
      .select('user_id', 'settings', 'delivery');

    for (const row of rows) {
      const enabled = row.settings?.[settingsKey] ?? true;
      userSettings.set(row.user_id, { enabled, delivery: row.delivery });
    }
  }

  // Filter recipients based on settings
  const filteredIds = recipientIds.filter((userId) => {
    const prefs = userSettings.get(userId);
    // Default: enabled if no settings saved
    return prefs ? prefs.enabled : true;
  });

  if (filteredIds.length === 0) return;

  // Insert in-app notifications
  const rows = filteredIds.map((userId) => ({
    user_id: userId,
    org_id: orgId,
    type: input.type,
    title: input.title,
    body: input.body,
    actor_id: actorId ?? null,
    team_id: teamId ?? null,
    file_id: input.fileId ?? null,
    comment_id: input.commentId ?? null,
  }));

  await db('notifications').insert(rows);

  // Send emails for users with email delivery preference
  if (env.smtpHost) {
    const emailRecipientIds = filteredIds.filter((userId) => {
      const prefs = userSettings.get(userId);
      if (!prefs) return false;
      if (prefs.delivery === 'emailAll') return true;
      if (prefs.delivery === 'emailImportant' && ['comment_reply', 'member_left'].includes(type)) return true;
      return false;
    });

    if (emailRecipientIds.length > 0) {
      const users = await db('users').whereIn('id', emailRecipientIds).select('email', 'name');
      for (const user of users) {
        await sendMail(
          user.email,
          input.title,
          `<p>Hi ${user.name},</p><p>${input.body}</p><p>— Inspecto</p>`,
        ).catch(() => { /* non-blocking */ });
      }
    }
  }
}

// ─── User-facing API ────────────────────────────────────────────────────

export async function listNotifications(userId: string, opts?: { limit?: number; offset?: number; unreadOnly?: boolean }) {
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  let query = db('notifications')
    .leftJoin('users as actor', 'actor.id', 'notifications.actor_id')
    .where('notifications.user_id', userId)
    .select(
      'notifications.*',
      'actor.name as actor_name',
      'actor.avatar_url as actor_avatar_url',
    )
    .orderBy('notifications.created_at', 'desc')
    .limit(limit)
    .offset(offset);

  if (opts?.unreadOnly) {
    query = query.where('notifications.read', false);
  }

  const rows = await query;
  return rows.map(formatNotification);
}

export async function countUnread(userId: string) {
  const [result] = await db('notifications')
    .where({ user_id: userId, read: false })
    .count('* as count');
  return Number(result.count);
}

export async function markAsRead(notificationId: string, userId: string) {
  const updated = await db('notifications')
    .where({ id: notificationId, user_id: userId })
    .update({ read: true, read_at: db.fn.now() });
  if (updated === 0) return false;
  return true;
}

export async function markAllAsRead(userId: string) {
  await db('notifications')
    .where({ user_id: userId, read: false })
    .update({ read: true, read_at: db.fn.now() });
}

function formatNotification(row: Record<string, unknown>) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    actorId: row.actor_id,
    actorName: row.actor_name ?? null,
    actorAvatarUrl: row.actor_avatar_url ?? null,
    teamId: row.team_id,
    fileId: row.file_id,
    commentId: row.comment_id,
    read: row.read,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}
