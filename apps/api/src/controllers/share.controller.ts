import type { Request, Response, NextFunction } from 'express';
import * as shareService from '../services/share.service.js';
import { param } from '../utils/params.js';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const link = await shareService.createShareLink(
      param(req, 'fileId'), req.body.permission, req.body.expiresInDays ?? null, req.auth!.userId,
    );
    res.status(201).json(link);
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const links = await shareService.listShareLinks(param(req, 'fileId'), req.auth!.userId);
    res.json(links);
  } catch (err) { next(err); }
}

export async function revoke(req: Request, res: Response, next: NextFunction) {
  try {
    await shareService.revokeShareLink(param(req, 'linkId'), req.auth!.userId);
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function getShared(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await shareService.getSharedFile(param(req, 'token'));
    res.json(result);
  } catch (err) { next(err); }
}
