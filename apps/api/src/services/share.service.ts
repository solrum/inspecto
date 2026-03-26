import crypto from 'node:crypto';
import { db } from '../config/database.js';
import { AppError } from '../middleware/error-handler.js';
import { requireMembership } from './org.service.js';
import type { SharePermission } from '@inspecto/shared';

export async function createShareLink(
  fileId: string,
  permission: SharePermission,
  expiresInDays: number | null,
  userId: string,
) {
  const file = await db('files').where('id', fileId).whereNull('deleted_at').first();
  if (!file) throw new AppError(404, 'File not found');

  const project = await db('projects').where('id', file.project_id).first();
  await requireMembership(project.org_id, userId);

  const token = crypto.randomBytes(24).toString('base64url');
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const [link] = await db('share_links')
    .insert({
      file_id: fileId,
      token,
      permission,
      created_by: userId,
      expires_at: expiresAt,
    })
    .returning('*');

  return formatShareLink(link);
}

export async function listShareLinks(fileId: string, userId: string) {
  const file = await db('files').where('id', fileId).whereNull('deleted_at').first();
  if (!file) throw new AppError(404, 'File not found');

  const project = await db('projects').where('id', file.project_id).first();
  await requireMembership(project.org_id, userId);

  const links = await db('share_links')
    .where({ file_id: fileId, is_active: true })
    .orderBy('created_at', 'desc');

  return links.map(formatShareLink);
}

export async function revokeShareLink(linkId: string, userId: string) {
  const link = await db('share_links').where('id', linkId).first();
  if (!link) throw new AppError(404, 'Share link not found');

  const file = await db('files').where('id', link.file_id).first();
  const project = await db('projects').where('id', file.project_id).first();
  await requireMembership(project.org_id, userId);

  await db('share_links').where('id', linkId).update({ is_active: false });
}

export async function getSharedFile(token: string) {
  const link = await db('share_links')
    .where({ token, is_active: true })
    .first();

  if (!link) throw new AppError(404, 'Share link not found or expired');

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    throw new AppError(410, 'Share link has expired');
  }

  const file = await db('files')
    .where('id', link.file_id)
    .whereNull('deleted_at')
    .first();
  if (!file) throw new AppError(404, 'File not found');

  const version = await db('file_versions')
    .where('id', file.current_version_id)
    .first();

  return {
    permission: link.permission,
    file: {
      id: file.id,
      name: file.name,
      currentVersionId: file.current_version_id,
    },
    version: version
      ? {
          id: version.id,
          versionNumber: version.version_number,
          nodeSummary: version.node_summary,
          createdAt: version.created_at,
        }
      : null,
  };
}

function formatShareLink(row: Record<string, unknown>) {
  return {
    id: row.id,
    fileId: row.file_id,
    token: row.token,
    permission: row.permission,
    expiresAt: row.expires_at,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}
