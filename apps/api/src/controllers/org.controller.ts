import type { Request, Response, NextFunction } from 'express';
import * as orgService from '../services/org.service.js';
import { param } from '../utils/params.js';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const org = await orgService.createOrg(req.body.name, req.auth!.userId);
    res.status(201).json(org);
  } catch (err) { next(err); }
}

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const org = await orgService.getOrg(param(req, 'orgId'), req.auth!.userId);
    res.json(org);
  } catch (err) { next(err); }
}

export async function listMine(req: Request, res: Response, next: NextFunction) {
  try {
    const orgs = await orgService.getMyOrgs(req.auth!.userId);
    res.json(orgs);
  } catch (err) { next(err); }
}

export async function invite(req: Request, res: Response, next: NextFunction) {
  try {
    const member = await orgService.inviteMember(param(req, 'orgId'), req.body.email, req.auth!.userId, {
      role: req.body.role,
      teamId: req.body.teamId,
    });
    res.status(201).json(member);
  } catch (err) { next(err); }
}

export async function updateRole(req: Request, res: Response, next: NextFunction) {
  try {
    await orgService.updateMemberRole(param(req, 'orgId'), param(req, 'userId'), req.body.role, req.auth!.userId);
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function removeMember(req: Request, res: Response, next: NextFunction) {
  try {
    await orgService.removeMember(param(req, 'orgId'), param(req, 'userId'), req.auth!.userId);
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const org = await orgService.updateOrg(param(req, 'orgId'), req.auth!.userId, req.body);
    res.json(org);
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await orgService.deleteOrg(param(req, 'orgId'), req.auth!.userId);
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function getStats(req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await orgService.getOrgStats(param(req, 'orgId'), req.auth!.userId);
    res.json(stats);
  } catch (err) { next(err); }
}

export async function getActivity(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const activity = await orgService.getOrgActivity(param(req, 'orgId'), req.auth!.userId, limit);
    res.json(activity);
  } catch (err) { next(err); }
}
