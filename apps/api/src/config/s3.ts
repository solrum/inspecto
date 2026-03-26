import { S3Client } from '@aws-sdk/client-s3';
import { env } from './env.js';

export const s3 = new S3Client({
  endpoint: env.s3Endpoint,
  region: env.s3Region,
  credentials: {
    accessKeyId: env.s3AccessKey,
    secretAccessKey: env.s3SecretKey,
  },
  forcePathStyle: true, // Required for MinIO
});
