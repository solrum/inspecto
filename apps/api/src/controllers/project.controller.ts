import type { Request, Response, NextFunction } from 'express';
import * as projectService from '../services/project.service.js';
import { param } from '../utils/params.js';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await projectService.createProject(
      param(req, 'orgId'), req.body.name, req.body.description ?? null, req.auth!.userId,
    );
    res.status(201).json(project);
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const projects = await projectService.listProjects(param(req, 'orgId'), req.auth!.userId);
    res.json(projects);
  } catch (err) { next(err); }
}

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await projectService.getProject(param(req, 'projectId'), req.auth!.userId);
    res.json(project);
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await projectService.updateProject(param(req, 'projectId'), req.body, req.auth!.userId);
    res.json(project);
  } catch (err) { next(err); }
}

export async function archive(req: Request, res: Response, next: NextFunction) {
  try {
    await projectService.archiveProject(param(req, 'projectId'), req.auth!.userId);
    res.status(204).send();
  } catch (err) { next(err); }
}
