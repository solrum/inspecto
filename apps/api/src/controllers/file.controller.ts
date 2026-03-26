import type { Request, Response, NextFunction } from 'express';
import * as fileService from '../services/file.service.js';
import { param } from '../utils/params.js';

function extractUploadedFiles(req: Request): { penFile: Express.Multer.File; images: Express.Multer.File[] } | null {
  const fields = req.files as Record<string, Express.Multer.File[]> | undefined;
  const penFiles = fields?.['file'];
  if (!penFiles || penFiles.length === 0) return null;
  return { penFile: penFiles[0], images: fields?.['images'] ?? [] };
}

export async function checkDuplicate(req: Request, res: Response, next: NextFunction) {
  try {
    const { checksum } = req.query;
    if (!checksum || typeof checksum !== 'string') {
      res.status(400).json({ error: 'checksum query param required' });
      return;
    }
    const result = await fileService.checkDuplicate(param(req, 'projectId'), checksum, req.auth!.userId);
    res.json(result);
  } catch (err) { next(err); }
}

export async function upload(req: Request, res: Response, next: NextFunction) {
  try {
    const uploaded = extractUploadedFiles(req);
    if (!uploaded) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    const result = await fileService.uploadFile(
      param(req, 'projectId'), uploaded.penFile, uploaded.images, req.auth!.userId,
    );
    res.status(201).json(result);
  } catch (err) { next(err); }
}

export async function uploadVersion(req: Request, res: Response, next: NextFunction) {
  try {
    const uploaded = extractUploadedFiles(req);
    if (!uploaded) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    const version = await fileService.uploadNewVersion(
      param(req, 'fileId'), uploaded.penFile, uploaded.images, req.body.commitMessage ?? null, req.auth!.userId,
    );
    res.status(201).json(version);
  } catch (err) { next(err); }
}

export async function getImage(req: Request, res: Response, next: NextFunction) {
  try {
    const { stream, contentType } = await fileService.getFileImage(
      param(req, 'fileId'), param(req, 'filename'), req.auth!.userId,
    );
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    (stream as any).pipe(res);
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const files = await fileService.listFiles(param(req, 'projectId'), req.auth!.userId);
    res.json(files);
  } catch (err) { next(err); }
}

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const file = await fileService.getFile(param(req, 'fileId'), req.auth!.userId);
    res.json(file);
  } catch (err) { next(err); }
}

export async function download(req: Request, res: Response, next: NextFunction) {
  try {
    const versionId = typeof req.query.versionId === 'string' ? req.query.versionId : null;
    const { url, filename } = await fileService.getDownloadUrl(
      param(req, 'fileId'), versionId, req.auth!.userId,
    );
    res.json({ url, filename });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await fileService.deleteFile(param(req, 'fileId'), req.auth!.userId);
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function getContent(req: Request, res: Response, next: NextFunction) {
  try {
    const versionId = typeof req.query.versionId === 'string' ? req.query.versionId : null;
    const content = await fileService.getFileContent(param(req, 'fileId'), versionId, req.auth!.userId);
    res.json(content);
  } catch (err) { next(err); }
}

export async function listVersions(req: Request, res: Response, next: NextFunction) {
  try {
    const versions = await fileService.listVersions(param(req, 'fileId'), req.auth!.userId);
    res.json(versions);
  } catch (err) { next(err); }
}

export async function getFrames(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await fileService.getFrameIndex(param(req, 'fileId'), req.auth!.userId);
    res.json(result);
  } catch (err) { next(err); }
}

export async function getSingleFrame(req: Request, res: Response, next: NextFunction) {
  try {
    const doc = await fileService.getSingleFrame(param(req, 'fileId'), param(req, 'frameId'), req.auth!.userId);
    res.json(doc);
  } catch (err) { next(err); }
}
