import { db } from '../config/database.js';
import { AppError } from '../middleware/error-handler.js';
import { requireMembership } from './org.service.js';
import { notify } from './notification.service.js';
import type { AnchorMeta } from '@inspecto/shared';

interface CreateCommentInput {
  fileId: string;
  versionId?: string | null;
  body: string;
  parentCommentId?: string | null;
  // Frame-level anchor (required if providing a node anchor)
  frameId?: string | null;
  pinXRatio?: number | null;  // 0.0–1.0 relative to frame width
  pinYRatio?: number | null;  // 0.0–1.0 relative to frame height
  // Node-level anchor (optional)
  nodeId?: string | null;
  anchorMeta?: AnchorMeta | null;
}

export async function createComment(input: CreateCommentInput, userId: string) {
  const file = await db('files').where('id', input.fileId).whereNull('deleted_at').first();
  if (!file) throw new AppError(404, 'File not found');

  const project = await db('projects').where('id', file.project_id).first();
  await requireMembership(project.org_id, userId);

  if (input.versionId) {
    const version = await db('file_versions')
      .where({ id: input.versionId, file_id: input.fileId })
      .first();
    if (!version) throw new AppError(404, 'Version not found');
  }

  if (input.parentCommentId) {
    const parent = await db('comments').where('id', input.parentCommentId).first();
    if (!parent || parent.file_id !== input.fileId) {
      throw new AppError(404, 'Parent comment not found');
    }
  }

  // node anchor requires frame context
  if (input.nodeId && !input.frameId) {
    throw new AppError(400, 'frameId is required when providing a nodeId anchor');
  }

  const [comment] = await db('comments')
    .insert({
      file_id: input.fileId,
      version_id: input.versionId ?? null,
      parent_comment_id: input.parentCommentId ?? null,
      author_id: userId,
      body: input.body,
      frame_id: input.frameId ?? null,
      pin_x_ratio: input.pinXRatio ?? null,
      pin_y_ratio: input.pinYRatio ?? null,
      node_id: input.nodeId ?? null,
      anchor_meta: input.anchorMeta ? JSON.stringify(input.anchorMeta) : null,
      anchor_status: 'active',
    })
    .returning('*');

  // Send notification
  const user = await db('users').where('id', userId).first();
  const actorName = user?.name ?? 'Someone';
  const isReply = !!input.parentCommentId;

  // Find team via project
  const teams = await db('teams')
    .join('projects', 'projects.org_id', 'teams.org_id')
    .where('projects.id', file.project_id)
    .select('teams.id')
    .limit(1);

  notify({
    type: isReply ? 'comment_reply' : 'comment_new',
    title: isReply ? `${actorName} replied to a comment` : `${actorName} commented on ${file.name}`,
    body: input.body.slice(0, 200),
    orgId: project.org_id,
    actorId: userId,
    teamId: teams[0]?.id,
    fileId: input.fileId,
    commentId: comment.id as string,
  }).catch(() => { /* non-blocking */ });

  return formatComment(comment);
}

export async function listComments(
  fileId: string,
  userId: string,
  opts: { versionId?: string; frameId?: string } = {},
) {
  const file = await db('files').where('id', fileId).whereNull('deleted_at').first();
  if (!file) throw new AppError(404, 'File not found');

  const project = await db('projects').where('id', file.project_id).first();
  await requireMembership(project.org_id, userId);

  let query = db('comments')
    .join('users', 'users.id', 'comments.author_id')
    .where('comments.file_id', fileId)
    .select('comments.*', 'users.name as author_name', 'users.avatar_url as author_avatar')
    .orderBy('comments.created_at', 'asc');

  if (opts.versionId) query = query.where('comments.version_id', opts.versionId);
  if (opts.frameId) query = query.where('comments.frame_id', opts.frameId);

  const comments = await query;

  return comments.map((c) => ({
    ...formatComment(c),
    authorName: c.author_name,
    authorAvatar: c.author_avatar,
  }));
}

export async function resolveComment(commentId: string, userId: string) {
  const comment = await db('comments').where('id', commentId).first();
  if (!comment) throw new AppError(404, 'Comment not found');

  const file = await db('files').where('id', comment.file_id).first();
  const project = await db('projects').where('id', file.project_id).first();
  await requireMembership(project.org_id, userId);

  await db('comments')
    .where('id', commentId)
    .update({ resolved: true, resolved_by: userId, resolved_at: db.fn.now() });

  return { success: true };
}

export async function deleteComment(commentId: string, userId: string) {
  const comment = await db('comments').where('id', commentId).first();
  if (!comment) throw new AppError(404, 'Comment not found');

  if (comment.author_id !== userId) {
    throw new AppError(403, 'You can only delete your own comments');
  }

  await db('comments').where('id', commentId).delete();
}

function formatComment(row: Record<string, unknown>) {
  return {
    id: row.id,
    fileId: row.file_id,
    versionId: row.version_id,
    parentCommentId: row.parent_comment_id,
    authorId: row.author_id,
    body: row.body,
    frameId: row.frame_id,
    pinXRatio: row.pin_x_ratio,
    pinYRatio: row.pin_y_ratio,
    nodeId: row.node_id,
    anchorMeta: row.anchor_meta,
    anchorStatus: row.anchor_status,
    resolved: row.resolved,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
