import type { Request, Response, NextFunction } from 'express';
import * as commentService from '../services/comment.service.js';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const comment = await commentService.createComment(
      { fileId: req.params.fileId, ...req.body },
      req.auth!.userId,
    );
    res.status(201).json(comment);
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const comments = await commentService.listComments(
      req.params.fileId as string,
      req.auth!.userId,
      {
        versionId: req.query.versionId as string | undefined,
        frameId: req.query.frameId as string | undefined,
      },
    );
    res.json(comments);
  } catch (err) { next(err); }
}

export async function resolve(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await commentService.resolveComment(req.params.commentId as string, req.auth!.userId);
    res.json(result);
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await commentService.deleteComment(req.params.commentId as string, req.auth!.userId);
    res.status(204).send();
  } catch (err) { next(err); }
}
