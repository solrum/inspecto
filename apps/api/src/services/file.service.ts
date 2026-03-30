import { PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3 } from '../config/s3.js';
import { db } from '../config/database.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/error-handler.js';
import { requireMembership, requireRole } from './org.service.js';
import { validatePenDocument, extractNodeSummary, extractFrameIndex, extractNodeLookup, extractSingleFrame, type PenDocument } from '@inspecto/shared';
import { carryForwardComments } from './comment-anchor.service.js';
import { notify } from './notification.service.js';
import { verifyPenBuffer, verifyImageBuffer } from '../middleware/upload.js';
import { gzipSync, gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const IMAGE_CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

// Upload image assets to S3 and return a map of original filename → S3 key
async function uploadImages(
  orgId: string,
  projectId: string,
  fileId: string,
  images: Express.Multer.File[],
): Promise<Map<string, string>> {
  const keyMap = new Map<string, string>();
  for (const img of images) {
    const filename = img.originalname.replace(/^.*[\\/]/, ''); // strip any path prefix
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    const s3Key = `${orgId}/${projectId}/${fileId}/images/${filename}`;
    await s3.send(
      new PutObjectCommand({
        Bucket: env.s3Bucket,
        Key: s3Key,
        Body: img.buffer,
        ContentType: IMAGE_CONTENT_TYPES[ext] ?? 'application/octet-stream',
      }),
    );
    keyMap.set(filename, s3Key);
  }
  return keyMap;
}

// Deep-scan a JSON value and replace image relative paths with API URLs
function rewriteImagePaths(value: unknown, fileId: string, imageFilenames: Set<string>): unknown {
  if (typeof value === 'string') {
    // Match paths like "images/foo.png", ".images/foo.png", or just "foo.png"
    const basename = value.replace(/^\.?images[\\/]/, '').replace(/^.*[\\/]/, '');
    if (imageFilenames.has(basename)) {
      return `/api/files/${fileId}/images/${basename}`;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((v) => rewriteImagePaths(v, fileId, imageFilenames));
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = rewriteImagePaths(v, fileId, imageFilenames);
    }
    return out;
  }
  return value;
}

export async function checkDuplicate(
  projectId: string,
  checksum: string,
  userId: string,
): Promise<{ exists: boolean; fileId?: string }> {
  const project = await db('projects').where('id', projectId).first();
  if (!project) throw new AppError(404, 'Project not found');
  await requireMembership(project.org_id, userId);

  const existing = await db('files')
    .where({ project_id: projectId, checksum })
    .whereNull('deleted_at')
    .first();
  if (existing) return { exists: true, fileId: existing.id };
  return { exists: false };
}

export async function uploadFile(
  projectId: string,
  file: Express.Multer.File,
  images: Express.Multer.File[],
  userId: string,
) {
  const project = await db('projects').where('id', projectId).first();
  if (!project) throw new AppError(404, 'Project not found');
  await requireRole(project.org_id, userId, 'member');

  // Compute SHA-256 checksum and detect duplicate uploads
  const checksum = createHash('sha256').update(file.buffer).digest('hex');
  const existing = await db('files')
    .where({ project_id: projectId, checksum })
    .whereNull('deleted_at')
    .first();
  if (existing) {
    throw new AppError(409, 'This file has already been uploaded to this project', { fileId: existing.id });
  }

  // Verify .pen file content (magic bytes + structure)
  const penVerify = verifyPenBuffer(file.buffer);
  if (!penVerify.valid) {
    throw new AppError(400, `Invalid .pen file: ${penVerify.error}`);
  }

  // Verify all image files (magic bytes)
  for (const img of images) {
    const ext = '.' + img.originalname.split('.').pop()!.toLowerCase();
    const imgCheck = verifyImageBuffer(img.buffer, ext);
    if (!imgCheck.valid) {
      throw new AppError(400, `Invalid image file: ${img.originalname} — ${imgCheck.error}`);
    }
  }

  // Parse .pen document
  let penDoc: PenDocument = JSON.parse(file.buffer.toString('utf-8'));

  const { penFile, version } = await db.transaction(async (trx) => {
    // Create file record
    const [penFile] = await trx('files')
      .insert({
        project_id: projectId,
        name: file.originalname.replace(/\.pen$/, ''),
        original_filename: file.originalname,
        uploaded_by: userId,
        checksum,
      })
      .returning('*');

    // Upload associated images first, then rewrite paths in the .pen doc
    if (images.length > 0) {
      await uploadImages(project.org_id, projectId, penFile.id, images);
      const imageFilenames = new Set(images.map((img) => img.originalname.replace(/^.*[\\/]/, '')));
      penDoc = rewriteImagePaths(penDoc, penFile.id, imageFilenames) as PenDocument;
    }

    // Create first version
    const s3Key = `${project.org_id}/${projectId}/${penFile.id}/versions/v1.pen`;
    const penBuffer = Buffer.from(JSON.stringify(penDoc));
    const compressed = gzipSync(penBuffer);

    await s3.send(
      new PutObjectCommand({
        Bucket: env.s3Bucket,
        Key: s3Key,
        Body: compressed,
        ContentType: 'application/json',
        ContentEncoding: 'gzip',
      }),
    );

    const nodeSummary = extractNodeSummary(penDoc);
    const frameIndex = extractFrameIndex(penDoc);

    const [version] = await trx('file_versions')
      .insert({
        file_id: penFile.id,
        version_number: 1,
        s3_key: s3Key,
        file_size_bytes: penBuffer.length,
        node_summary: JSON.stringify(nodeSummary),
        frame_index: JSON.stringify(frameIndex),
        uploaded_by: userId,
      })
      .returning('*');

    await trx('files')
      .where('id', penFile.id)
      .update({ current_version_id: version.id });

    return { penFile, version };
  });

  // Notify outside transaction (non-blocking side-effect)
  const user = await db('users').where('id', userId).first();
  notify({
    type: 'file_upload',
    title: `${user?.name ?? 'Someone'} uploaded ${penFile.name}`,
    body: `New design file uploaded to the project.`,
    orgId: project.org_id,
    actorId: userId,
    fileId: penFile.id as string,
  }).catch(() => {});

  return {
    file: formatFile({ ...penFile, current_version_id: version.id }),
    version: formatVersion(version),
  };
}

export async function uploadNewVersion(
  fileId: string,
  file: Express.Multer.File,
  images: Express.Multer.File[],
  commitMessage: string | null,
  userId: string,
) {
  const penFile = await db('files').where('id', fileId).whereNull('deleted_at').first();
  if (!penFile) throw new AppError(404, 'File not found');

  const project = await db('projects').where('id', penFile.project_id).first();
  await requireRole(project.org_id, userId, 'member');

  // Verify .pen file content
  const penVerify = verifyPenBuffer(file.buffer);
  if (!penVerify.valid) {
    throw new AppError(400, `Invalid .pen file: ${penVerify.error}`);
  }

  // Verify all image files
  for (const img of images) {
    const ext = '.' + img.originalname.split('.').pop()!.toLowerCase();
    const imgCheck = verifyImageBuffer(img.buffer, ext);
    if (!imgCheck.valid) {
      throw new AppError(400, `Invalid image file: ${img.originalname} — ${imgCheck.error}`);
    }
  }

  let penDoc: PenDocument = JSON.parse(file.buffer.toString('utf-8'));

  if (images.length > 0) {
    await uploadImages(project.org_id, project.id, fileId, images);
    const imageFilenames = new Set(images.map((img) => img.originalname.replace(/^.*[\\/]/, '')));
    penDoc = rewriteImagePaths(penDoc, fileId, imageFilenames) as PenDocument;
  }

  const latestVersion = await db('file_versions')
    .where('file_id', fileId)
    .orderBy('version_number', 'desc')
    .first();

  const newVersionNumber = (latestVersion?.version_number ?? 0) + 1;
  const s3Key = `${project.org_id}/${project.id}/${fileId}/versions/v${newVersionNumber}.pen`;
  const penBuffer = Buffer.from(JSON.stringify(penDoc));
  const compressed = gzipSync(penBuffer);

  await s3.send(
    new PutObjectCommand({
      Bucket: env.s3Bucket,
      Key: s3Key,
      Body: compressed,
      ContentType: 'application/json',
      ContentEncoding: 'gzip',
    }),
  );

  const nodeSummary = extractNodeSummary(penDoc);
  const frameIndex = extractFrameIndex(penDoc);

  const version = await db.transaction(async (trx) => {
    const [version] = await trx('file_versions')
      .insert({
        file_id: fileId,
        version_number: newVersionNumber,
        s3_key: s3Key,
        file_size_bytes: penBuffer.length,
        node_summary: JSON.stringify(nodeSummary),
        frame_index: JSON.stringify(frameIndex),
        commit_message: commitMessage,
        uploaded_by: userId,
      })
      .returning('*');

    await trx('files')
      .where('id', fileId)
      .update({ current_version_id: version.id, updated_at: trx.fn.now() });

    // Carry-forward comment anchors to the new version
    const nodeLookup = extractNodeLookup(penDoc);
    const frameIndexForAnchor = frameIndex.map((f) => ({
      id: f.id,
      width: typeof f.width === 'number' ? f.width : null,
      height: typeof f.height === 'number' ? f.height : null,
    }));
    await carryForwardComments(fileId, version.id, nodeLookup, frameIndexForAnchor);

    return version;
  });

  // Notify outside transaction (non-blocking side-effect)
  const user = await db('users').where('id', userId).first();
  notify({
    type: 'file_update',
    title: `${user?.name ?? 'Someone'} updated ${penFile.name}`,
    body: commitMessage ?? `Version ${newVersionNumber} uploaded.`,
    orgId: project.org_id,
    actorId: userId,
    fileId,
  }).catch(() => {});

  return formatVersion(version);
}

export async function listFiles(projectId: string, userId: string) {
  const project = await db('projects').where('id', projectId).first();
  if (!project) throw new AppError(404, 'Project not found');
  await requireMembership(project.org_id, userId);

  const files = await db('files')
    .leftJoin('file_versions', 'file_versions.id', 'files.current_version_id')
    .where({ 'files.project_id': projectId })
    .whereNull('files.deleted_at')
    .select('files.*', 'file_versions.version_number as current_version_number')
    .orderBy('files.updated_at', 'desc');

  return files.map((f) => ({ ...formatFile(f), versionNumber: f.current_version_number ?? null }));
}

export async function getFile(fileId: string, userId: string) {
  const penFile = await db('files').where('id', fileId).whereNull('deleted_at').first();
  if (!penFile) throw new AppError(404, 'File not found');

  const project = await db('projects').where('id', penFile.project_id).first();
  await requireMembership(project.org_id, userId);

  const versions = await db('file_versions')
    .where('file_id', fileId)
    .orderBy('version_number', 'desc');

  return {
    ...formatFile(penFile),
    project: { id: project.id, name: project.name, orgId: project.org_id },
    versions: versions.map(formatVersion),
  };
}

export async function getDownloadUrl(fileId: string, versionId: string | null, userId: string) {
  const penFile = await db('files').where('id', fileId).whereNull('deleted_at').first();
  if (!penFile) throw new AppError(404, 'File not found');

  const project = await db('projects').where('id', penFile.project_id).first();
  await requireMembership(project.org_id, userId);

  const version = versionId
    ? await db('file_versions').where({ id: versionId, file_id: fileId }).first()
    : await db('file_versions').where('id', penFile.current_version_id).first();

  if (!version) throw new AppError(404, 'Version not found');

  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: env.s3Bucket, Key: version.s3_key }),
    { expiresIn: env.s3PresignedUrlExpiry },
  );

  return { url, filename: `${penFile.name}_v${version.version_number}.pen` };
}

export async function getFileContent(fileId: string, versionId: string | null, userId: string): Promise<PenDocument> {
  const penFile = await db('files').where('id', fileId).whereNull('deleted_at').first();
  if (!penFile) throw new AppError(404, 'File not found');

  const project = await db('projects').where('id', penFile.project_id).first();
  await requireMembership(project.org_id, userId);

  const version = versionId
    ? await db('file_versions').where({ id: versionId, file_id: fileId }).first()
    : await db('file_versions').where('id', penFile.current_version_id).first();
  if (!version) throw new AppError(404, 'Version not found');

  const response = await s3.send(
    new GetObjectCommand({ Bucket: env.s3Bucket, Key: version.s3_key }),
  );

  const bodyBytes = await response.Body!.transformToByteArray();
  const decompressed = gunzipSync(Buffer.from(bodyBytes));
  return JSON.parse(decompressed.toString('utf-8'));
}

export async function getFrameIndex(fileId: string, userId: string) {
  const penFile = await db('files').where('id', fileId).whereNull('deleted_at').first();
  if (!penFile) throw new AppError(404, 'File not found');

  const project = await db('projects').where('id', penFile.project_id).first();
  await requireMembership(project.org_id, userId);

  const version = await db('file_versions').where('id', penFile.current_version_id).first();
  if (!version) throw new AppError(404, 'Version not found');

  return {
    frames: version.frame_index ?? version.node_summary ?? [],
    versionId: version.id,
    versionNumber: version.version_number,
  };
}

export async function getSingleFrame(fileId: string, frameId: string, userId: string) {
  const penFile = await db('files').where('id', fileId).whereNull('deleted_at').first();
  if (!penFile) throw new AppError(404, 'File not found');

  const project = await db('projects').where('id', penFile.project_id).first();
  await requireMembership(project.org_id, userId);

  const version = await db('file_versions').where('id', penFile.current_version_id).first();
  if (!version) throw new AppError(404, 'Version not found');

  // Fetch full document from S3 and extract single frame
  const response = await s3.send(
    new GetObjectCommand({ Bucket: env.s3Bucket, Key: version.s3_key }),
  );
  const bodyBytes = await response.Body!.transformToByteArray();
  const decompressed = gunzipSync(Buffer.from(bodyBytes));
  const fullDoc = JSON.parse(decompressed.toString('utf-8'));

  const singleFrameDoc = extractSingleFrame(fullDoc, frameId);
  if (!singleFrameDoc) throw new AppError(404, 'Frame not found');

  return singleFrameDoc;
}

export async function getFileImage(fileId: string, filename: string, userId: string) {
  const penFile = await db('files').where('id', fileId).whereNull('deleted_at').first();
  if (!penFile) throw new AppError(404, 'File not found');

  const project = await db('projects').where('id', penFile.project_id).first();
  await requireMembership(project.org_id, userId);

  const s3Key = `${project.org_id}/${project.id}/${fileId}/images/${filename}`;

  try {
    await s3.send(new HeadObjectCommand({ Bucket: env.s3Bucket, Key: s3Key }));
  } catch {
    throw new AppError(404, 'Image not found');
  }

  const response = await s3.send(new GetObjectCommand({ Bucket: env.s3Bucket, Key: s3Key }));
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const contentType = IMAGE_CONTENT_TYPES[ext] ?? 'application/octet-stream';
  return { stream: response.Body!, contentType };
}

export async function deleteFile(fileId: string, userId: string) {
  const penFile = await db('files').where('id', fileId).whereNull('deleted_at').first();
  if (!penFile) throw new AppError(404, 'File not found');

  const project = await db('projects').where('id', penFile.project_id).first();
  await requireRole(project.org_id, userId, 'member');

  await db('files')
    .where('id', fileId)
    .update({ deleted_at: db.fn.now() });
}

export async function listVersions(fileId: string, userId: string) {
  const penFile = await db('files').where('id', fileId).whereNull('deleted_at').first();
  if (!penFile) throw new AppError(404, 'File not found');

  const project = await db('projects').where('id', penFile.project_id).first();
  await requireMembership(project.org_id, userId);

  const versions = await db('file_versions')
    .join('users', 'users.id', 'file_versions.uploaded_by')
    .where('file_versions.file_id', fileId)
    .select('file_versions.*', 'users.name as uploader_name')
    .orderBy('version_number', 'desc');

  return versions.map((v) => ({
    ...formatVersion(v),
    uploaderName: v.uploader_name,
  }));
}

// ─── Formatters ───

function formatFile(row: Record<string, unknown>) {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    originalFilename: row.original_filename,
    currentVersionId: row.current_version_id,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function formatVersion(row: Record<string, unknown>) {
  return {
    id: row.id,
    fileId: row.file_id,
    versionNumber: row.version_number,
    fileSizeBytes: row.file_size_bytes,
    nodeSummary: row.node_summary,
    commitMessage: row.commit_message,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  };
}
