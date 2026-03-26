import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { penUploadWithImages } from '../middleware/upload.js';
import * as fileController from '../controllers/file.controller.js';

const router = Router();
router.use(requireAuth);

// Files within a project
router.post('/projects/:projectId/files', penUploadWithImages, fileController.upload);
router.get('/projects/:projectId/files', fileController.list);
router.get('/projects/:projectId/files/check-duplicate', fileController.checkDuplicate);

// Direct file access
router.get('/files/:fileId', fileController.get);
router.get('/files/:fileId/content', fileController.getContent);
router.get('/files/:fileId/download', fileController.download);
router.delete('/files/:fileId', fileController.remove);

// Frames (pre-indexed, fast)
router.get('/files/:fileId/frames', fileController.getFrames);
router.get('/files/:fileId/frames/:frameId', fileController.getSingleFrame);

// Image assets
router.get('/files/:fileId/images/:filename', fileController.getImage);

// Versions
router.post('/files/:fileId/versions', penUploadWithImages, fileController.uploadVersion);
router.get('/files/:fileId/versions', fileController.listVersions);

export default router;
