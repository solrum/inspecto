import { db } from '../config/database.js';
import { env } from '../config/env.js';
import { sendMail } from '../config/mailer.js';
import { AppError } from '../middleware/error-handler.js';
import type { OrgRole } from '@inspecto/shared';

export async function createOrg(name: string, userId: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const existing = await db('organizations').where('slug', slug).first();
  if (existing) {
    throw new AppError(409, 'An organization with a similar name already exists');
  }

  const org = await db.transaction(async (trx) => {
    const [org] = await trx('organizations')
      .insert({ name, slug, created_by: userId })
      .returning('*');

    await trx('org_members').insert({
      org_id: org.id,
      user_id: userId,
      role: 'admin',
    });

    return org;
  });

  return formatOrg(org);
}

export async function getOrg(orgId: string, userId: string) {
  await requireMembership(orgId, userId);
  const org = await db('organizations').where('id', orgId).first();
  if (!org) throw new AppError(404, 'Organization not found');

  const members = await db('org_members')
    .join('users', 'users.id', 'org_members.user_id')
    .where('org_members.org_id', orgId)
    .select('users.id', 'users.email', 'users.name', 'users.avatar_url', 'org_members.role', 'org_members.joined_at');

  return {
    ...formatOrg(org),
    members: members.map((m) => ({
      id: m.id,
      email: m.email,
      name: m.name,
      avatarUrl: m.avatar_url,
      role: m.role,
      joinedAt: m.joined_at,
    })),
  };
}

export async function getMyOrgs(userId: string) {
  const orgs = await db('organizations')
    .join('org_members', 'organizations.id', 'org_members.org_id')
    .where('org_members.user_id', userId)
    .select('organizations.*', 'org_members.role');

  const enriched = await Promise.all(
    orgs.map(async (o) => {
      const [memberCount] = await db('org_members').where('org_id', o.id).count('* as count');
      const [projectCount] = await db('projects').where('org_id', o.id).where('archived', false).count('* as count');
      return {
        ...formatOrg(o),
        role: o.role,
        memberCount: Number(memberCount.count),
        projectCount: Number(projectCount.count),
      };
    }),
  );

  return enriched;
}

export async function getOrgStats(orgId: string, userId: string) {
  await requireMembership(orgId, userId);

  const [memberCount] = await db('org_members').where('org_id', orgId).count('* as count');
  const [projectCount] = await db('projects').where('org_id', orgId).where('archived', false).count('* as count');
  const [fileCount] = await db('files')
    .join('projects', 'projects.id', 'files.project_id')
    .where('projects.org_id', orgId)
    .whereNull('files.deleted_at')
    .count('* as count');
  const [commentCount] = await db('comments')
    .join('files', 'files.id', 'comments.file_id')
    .join('projects', 'projects.id', 'files.project_id')
    .where('projects.org_id', orgId)
    .count('* as count');

  return {
    memberCount: Number(memberCount.count),
    projectCount: Number(projectCount.count),
    fileCount: Number(fileCount.count),
    commentCount: Number(commentCount.count),
  };
}

export async function getOrgActivity(orgId: string, userId: string, limit = 20) {
  await requireMembership(orgId, userId);

  const fileUploads = await db('file_versions')
    .join('files', 'files.id', 'file_versions.file_id')
    .join('projects', 'projects.id', 'files.project_id')
    .join('users', 'users.id', 'file_versions.uploaded_by')
    .where('projects.org_id', orgId)
    .whereNull('files.deleted_at')
    .select(
      db.raw("'file_upload' as type"),
      'file_versions.created_at as timestamp',
      'users.name as user_name',
      'users.avatar_url as user_avatar',
      'files.name as file_name',
      'projects.name as project_name',
      'file_versions.version_number',
      'file_versions.commit_message',
    )
    .orderBy('file_versions.created_at', 'desc')
    .limit(limit);

  const recentComments = await db('comments')
    .join('files', 'files.id', 'comments.file_id')
    .join('projects', 'projects.id', 'files.project_id')
    .join('users', 'users.id', 'comments.author_id')
    .where('projects.org_id', orgId)
    .select(
      db.raw("'comment' as type"),
      'comments.created_at as timestamp',
      'users.name as user_name',
      'users.avatar_url as user_avatar',
      'files.name as file_name',
      'projects.name as project_name',
      'comments.body',
    )
    .orderBy('comments.created_at', 'desc')
    .limit(limit);

  const all = [...fileUploads, ...recentComments]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);

  return all.map((item) => ({
    type: item.type,
    timestamp: item.timestamp,
    userName: item.user_name,
    userAvatar: item.user_avatar,
    fileName: item.file_name,
    projectName: item.project_name,
    ...(item.type === 'file_upload'
      ? { versionNumber: item.version_number, commitMessage: item.commit_message }
      : { commentBody: item.body }),
  }));
}

export async function inviteMember(
  orgId: string,
  email: string,
  inviterId: string,
  opts?: { role?: string; teamId?: string },
) {
  await requireRole(orgId, inviterId, 'admin');

  const user = await db('users').where('email', email).first();
  if (!user) throw new AppError(404, 'User not found with that email');

  const existing = await db('org_members')
    .where({ org_id: orgId, user_id: user.id })
    .first();
  if (existing) throw new AppError(409, 'User is already a member');

  const role = opts?.role ?? 'member';

  await db.transaction(async (trx) => {
    await trx('org_members').insert({
      org_id: orgId,
      user_id: user.id,
      role,
    });

    // Auto-add to team if specified
    if (opts?.teamId) {
      const team = await trx('teams').where({ id: opts.teamId, org_id: orgId }).first();
      if (team) {
        await trx('team_members').insert({ team_id: opts.teamId, user_id: user.id, role: 'member' });
      }
    }
  });

  // Send invite email
  const org = await db('organizations').where('id', orgId).first();
  const orgName = org?.name ?? 'your organization';
  const loginUrl = `${env.appUrl}/login`;
  await sendMail(
    user.email,
    `You've been added to ${orgName} on Inspecto`,
    `<p>Hi ${user.name},</p>
     <p>You've been added to <strong>${orgName}</strong> as a <strong>${role}</strong>.</p>
     <p><a href="${loginUrl}">Sign in to Inspecto</a> to get started.</p>
     <p>— Inspecto Team</p>`,
  );

  return { userId: user.id, email: user.email, name: user.name, role };
}

export async function updateMemberRole(
  orgId: string,
  targetUserId: string,
  role: OrgRole,
  actorId: string,
) {
  await requireRole(orgId, actorId, 'admin');

  const updated = await db('org_members')
    .where({ org_id: orgId, user_id: targetUserId })
    .update({ role })
    .returning('*');

  if (updated.length === 0) throw new AppError(404, 'Member not found');
  return updated[0];
}

export async function removeMember(orgId: string, targetUserId: string, actorId: string) {
  await requireRole(orgId, actorId, 'admin');
  if (targetUserId === actorId) throw new AppError(400, 'Cannot remove yourself');

  const deleted = await db('org_members')
    .where({ org_id: orgId, user_id: targetUserId })
    .delete();

  if (deleted === 0) throw new AppError(404, 'Member not found');
}

// ─── Helpers ───

export async function requireMembership(orgId: string, userId: string) {
  const member = await db('org_members')
    .where({ org_id: orgId, user_id: userId })
    .first();
  if (!member) throw new AppError(403, 'You are not a member of this organization');
  return member;
}

export async function requireRole(orgId: string, userId: string, minRole: OrgRole) {
  const member = await requireMembership(orgId, userId);
  const hierarchy: OrgRole[] = ['viewer', 'member', 'admin'];
  if (hierarchy.indexOf(member.role) < hierarchy.indexOf(minRole)) {
    throw new AppError(403, `Requires ${minRole} role`);
  }
  return member;
}

export async function updateOrg(orgId: string, userId: string, data: { name?: string; description?: string }) {
  await requireRole(orgId, userId, 'admin');
  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.description !== undefined) updates.description = data.description;

  const [org] = await db('organizations')
    .where('id', orgId)
    .update({ ...updates, updated_at: new Date() })
    .returning('*');
  if (!org) throw new AppError(404, 'Organization not found');
  return formatOrg(org);
}

export async function deleteOrg(orgId: string, userId: string) {
  await requireRole(orgId, userId, 'admin');
  const deleted = await db('organizations').where('id', orgId).delete();
  if (!deleted) throw new AppError(404, 'Organization not found');
}

function formatOrg(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}
