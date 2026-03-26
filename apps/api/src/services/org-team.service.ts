import { db } from '../config/database.js';
import { AppError } from '../middleware/error-handler.js';
import { requireMembership, requireRole } from './org.service.js';
import { notify } from './notification.service.js';

type TeamRole = 'admin' | 'member' | 'viewer';

// ─── Helpers ────────────────────────────────────────────────────────────

async function requireTeamAdmin(orgId: string, teamId: string, userId: string) {
  // Allow if org admin OR team admin
  const orgMember = await db('org_members').where({ org_id: orgId, user_id: userId }).first();
  if (!orgMember) throw new AppError(403, 'Not an organization member');
  if (orgMember.role === 'admin') return;

  const teamMember = await db('team_members').where({ team_id: teamId, user_id: userId }).first();
  if (!teamMember || teamMember.role !== 'admin') {
    throw new AppError(403, 'Requires org admin or team admin role');
  }
}

function formatTeam(row: Record<string, unknown>) {
  return {
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    description: row.description,
    leadId: row.lead_id ?? null,
    permissions: row.permissions ?? {},
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── CRUD ───────────────────────────────────────────────────────────────

export async function createTeam(
  orgId: string,
  data: { name: string; description?: string; leadId?: string },
  userId: string,
) {
  await requireRole(orgId, userId, 'admin');

  const [team] = await db('teams')
    .insert({
      org_id: orgId,
      name: data.name,
      description: data.description ?? null,
      lead_id: data.leadId ?? null,
      created_by: userId,
    })
    .returning('*');

  return formatTeam(team);
}

export async function listTeams(orgId: string, userId: string) {
  await requireMembership(orgId, userId);

  const teams = await db('teams')
    .where('org_id', orgId)
    .orderBy('name', 'asc');

  const enriched = await Promise.all(
    teams.map(async (t) => {
      const [memberCount] = await db('team_members').where('team_id', t.id).count('* as count');
      return { ...formatTeam(t), memberCount: Number(memberCount.count) };
    }),
  );

  return enriched;
}

export async function getTeam(orgId: string, teamId: string, userId: string) {
  await requireMembership(orgId, userId);

  const team = await db('teams').where({ id: teamId, org_id: orgId }).first();
  if (!team) throw new AppError(404, 'Team not found');

  const members = await db('team_members')
    .join('users', 'users.id', 'team_members.user_id')
    .where('team_members.team_id', teamId)
    .select(
      'users.id', 'users.email', 'users.name', 'users.avatar_url',
      'team_members.role', 'team_members.joined_at',
    );

  return {
    ...formatTeam(team),
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

export async function updateTeam(
  orgId: string,
  teamId: string,
  updates: { name?: string; description?: string; leadId?: string | null },
  userId: string,
) {
  await requireRole(orgId, userId, 'admin');

  const team = await db('teams').where({ id: teamId, org_id: orgId }).first();
  if (!team) throw new AppError(404, 'Team not found');

  const patch: Record<string, unknown> = { updated_at: db.fn.now() };
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.leadId !== undefined) patch.lead_id = updates.leadId;

  const [updated] = await db('teams').where('id', teamId).update(patch).returning('*');
  return formatTeam(updated);
}

export async function deleteTeam(orgId: string, teamId: string, userId: string) {
  await requireRole(orgId, userId, 'admin');

  const deleted = await db('teams').where({ id: teamId, org_id: orgId }).delete();
  if (deleted === 0) throw new AppError(404, 'Team not found');
}

// ─── Members ────────────────────────────────────────────────────────────

export async function addMember(
  orgId: string, teamId: string, targetUserId: string, role: TeamRole, actorId: string,
) {
  await requireTeamAdmin(orgId, teamId, actorId);
  await requireMembership(orgId, targetUserId);

  const team = await db('teams').where({ id: teamId, org_id: orgId }).first();
  if (!team) throw new AppError(404, 'Team not found');

  const existing = await db('team_members').where({ team_id: teamId, user_id: targetUserId }).first();
  if (existing) throw new AppError(409, 'User is already a team member');

  await db('team_members').insert({ team_id: teamId, user_id: targetUserId, role });

  const actor = await db('users').where('id', actorId).first();
  const target = await db('users').where('id', targetUserId).first();
  notify({
    type: 'member_joined',
    title: `${target?.name ?? 'A member'} joined ${team.name}`,
    body: `Added by ${actor?.name ?? 'an admin'}.`,
    orgId,
    actorId,
    teamId,
  }).catch(() => {});

  return { teamId, userId: targetUserId, role };
}

export async function removeMember(orgId: string, teamId: string, targetUserId: string, actorId: string) {
  await requireTeamAdmin(orgId, teamId, actorId);

  const team = await db('teams').where({ id: teamId, org_id: orgId }).first();
  const target = await db('users').where('id', targetUserId).first();

  const deleted = await db('team_members')
    .where({ team_id: teamId, user_id: targetUserId })
    .delete();

  if (deleted === 0) throw new AppError(404, 'Team member not found');

  notify({
    type: 'member_left',
    title: `${target?.name ?? 'A member'} was removed from ${team?.name ?? 'the team'}`,
    body: `Removed by an admin.`,
    orgId,
    actorId,
    teamId,
  }).catch(() => {});
}

export async function updateMemberRole(
  orgId: string, teamId: string, targetUserId: string, role: TeamRole, actorId: string,
) {
  await requireTeamAdmin(orgId, teamId, actorId);

  const updated = await db('team_members')
    .where({ team_id: teamId, user_id: targetUserId })
    .update({ role })
    .returning('*');

  if (updated.length === 0) throw new AppError(404, 'Team member not found');
  return { teamId, userId: targetUserId, role };
}

// ─── Permissions ────────────────────────────────────────────────────────

export async function getPermissions(orgId: string, teamId: string, userId: string) {
  await requireMembership(orgId, userId);

  const team = await db('teams').where({ id: teamId, org_id: orgId }).first();
  if (!team) throw new AppError(404, 'Team not found');

  return team.permissions;
}

export async function updatePermissions(
  orgId: string, teamId: string, permissions: Record<string, boolean>, userId: string,
) {
  await requireTeamAdmin(orgId, teamId, userId);

  const team = await db('teams').where({ id: teamId, org_id: orgId }).first();
  if (!team) throw new AppError(404, 'Team not found');

  const [updated] = await db('teams')
    .where('id', teamId)
    .update({ permissions: JSON.stringify(permissions), updated_at: db.fn.now() })
    .returning('permissions');

  return updated.permissions;
}

// ─── Notifications ──────────────────────────────────────────────────────

export async function getNotificationSettings(orgId: string, teamId: string, userId: string) {
  await requireMembership(orgId, userId);

  const team = await db('teams').where({ id: teamId, org_id: orgId }).first();
  if (!team) throw new AppError(404, 'Team not found');

  const row = await db('team_notification_settings')
    .where({ team_id: teamId, user_id: userId })
    .first();

  if (row) {
    return { settings: row.settings, delivery: row.delivery };
  }

  // Return defaults
  return {
    settings: {
      newUpload: true, fileUpdate: true, newComment: true,
      commentReply: true, memberJoined: true, memberLeft: false,
    },
    delivery: 'inApp',
  };
}

export async function updateNotificationSettings(
  orgId: string,
  teamId: string,
  userId: string,
  settings: Record<string, boolean>,
  delivery: string,
) {
  await requireMembership(orgId, userId);

  const team = await db('teams').where({ id: teamId, org_id: orgId }).first();
  if (!team) throw new AppError(404, 'Team not found');

  await db('team_notification_settings')
    .insert({
      team_id: teamId,
      user_id: userId,
      settings: JSON.stringify(settings),
      delivery,
      updated_at: db.fn.now(),
    })
    .onConflict(['team_id', 'user_id'])
    .merge({
      settings: JSON.stringify(settings),
      delivery,
      updated_at: db.fn.now(),
    });

  return { settings, delivery };
}
