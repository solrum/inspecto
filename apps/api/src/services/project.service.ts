import { db } from '../config/database.js';
import { AppError } from '../middleware/error-handler.js';
import { requireMembership, requireRole } from './org.service.js';

export async function createProject(orgId: string, name: string, description: string | null, userId: string) {
  await requireRole(orgId, userId, 'member');

  const [project] = await db('projects')
    .insert({
      org_id: orgId,
      name,
      description,
      created_by: userId,
    })
    .returning('*');

  return formatProject(project);
}

export async function listProjects(orgId: string, userId: string) {
  await requireMembership(orgId, userId);

  const projects = await db('projects')
    .leftJoin(
      db('files').whereNull('deleted_at').groupBy('project_id')
        .select('project_id', db.raw('count(*)::int as file_count'))
        .as('fc'),
      'projects.id', 'fc.project_id',
    )
    .where({ 'projects.org_id': orgId, 'projects.archived': false })
    .select('projects.*', db.raw('COALESCE(fc.file_count, 0) as file_count'))
    .orderBy('projects.updated_at', 'desc');

  return projects.map((p) => ({ ...formatProject(p), fileCount: Number(p.file_count) }));
}

export async function getProject(projectId: string, userId: string) {
  const project = await db('projects').where('id', projectId).first();
  if (!project) throw new AppError(404, 'Project not found');

  await requireMembership(project.org_id, userId);
  return formatProject(project);
}

export async function updateProject(projectId: string, updates: { name?: string; description?: string }, userId: string) {
  const project = await db('projects').where('id', projectId).first();
  if (!project) throw new AppError(404, 'Project not found');

  await requireRole(project.org_id, userId, 'member');

  const [updated] = await db('projects')
    .where('id', projectId)
    .update({ ...updates, updated_at: db.fn.now() })
    .returning('*');

  return formatProject(updated);
}

export async function archiveProject(projectId: string, userId: string) {
  const project = await db('projects').where('id', projectId).first();
  if (!project) throw new AppError(404, 'Project not found');

  await requireRole(project.org_id, userId, 'admin');

  await db('projects').where('id', projectId).update({ archived: true, updated_at: db.fn.now() });
}

function formatProject(row: Record<string, unknown>) {
  return {
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    description: row.description,
    archived: row.archived,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
