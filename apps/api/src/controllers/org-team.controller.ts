import type { Request, Response, NextFunction } from 'express';
import * as teamService from '../services/org-team.service.js';
import { param } from '../utils/params.js';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const team = await teamService.createTeam(param(req, 'orgId'), req.body, req.auth!.userId);
    res.status(201).json(team);
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const teams = await teamService.listTeams(param(req, 'orgId'), req.auth!.userId);
    res.json(teams);
  } catch (err) { next(err); }
}

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const team = await teamService.getTeam(param(req, 'orgId'), param(req, 'teamId'), req.auth!.userId);
    res.json(team);
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const team = await teamService.updateTeam(param(req, 'orgId'), param(req, 'teamId'), req.body, req.auth!.userId);
    res.json(team);
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await teamService.deleteTeam(param(req, 'orgId'), param(req, 'teamId'), req.auth!.userId);
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function addMember(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await teamService.addMember(
      param(req, 'orgId'), param(req, 'teamId'), req.body.userId, req.body.role ?? 'member', req.auth!.userId,
    );
    res.status(201).json(result);
  } catch (err) { next(err); }
}

export async function removeMember(req: Request, res: Response, next: NextFunction) {
  try {
    await teamService.removeMember(param(req, 'orgId'), param(req, 'teamId'), param(req, 'userId'), req.auth!.userId);
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function updateMemberRole(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await teamService.updateMemberRole(
      param(req, 'orgId'), param(req, 'teamId'), param(req, 'userId'), req.body.role, req.auth!.userId,
    );
    res.json(result);
  } catch (err) { next(err); }
}

export async function getPermissions(req: Request, res: Response, next: NextFunction) {
  try {
    const perms = await teamService.getPermissions(param(req, 'orgId'), param(req, 'teamId'), req.auth!.userId);
    res.json(perms);
  } catch (err) { next(err); }
}

export async function updatePermissions(req: Request, res: Response, next: NextFunction) {
  try {
    const perms = await teamService.updatePermissions(param(req, 'orgId'), param(req, 'teamId'), req.body, req.auth!.userId);
    res.json(perms);
  } catch (err) { next(err); }
}

export async function getNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await teamService.getNotificationSettings(param(req, 'orgId'), param(req, 'teamId'), req.auth!.userId);
    res.json(settings);
  } catch (err) { next(err); }
}

export async function updateNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await teamService.updateNotificationSettings(
      param(req, 'orgId'), param(req, 'teamId'), req.auth!.userId, req.body.settings, req.body.delivery,
    );
    res.json(result);
  } catch (err) { next(err); }
}
