import dotenv from 'dotenv';
import path from 'node:path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.API_PORT ?? '3001', 10),

  // Database
  databaseUrl: process.env.DATABASE_URL!,

  // S3 (MinIO self-hosted)
  s3Endpoint: process.env.S3_ENDPOINT!,
  s3AccessKey: process.env.S3_ACCESS_KEY!,
  s3SecretKey: process.env.S3_SECRET_KEY!,
  s3Bucket: process.env.S3_BUCKET ?? 'inspecto-files',
  s3Region: process.env.S3_REGION ?? 'us-east-1',
  s3PresignedUrlExpiry: parseInt(process.env.S3_PRESIGNED_URL_EXPIRY ?? '900', 10),

  // Auth
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '12', 10),
  passwordResetExpiryMs: parseInt(process.env.PASSWORD_RESET_EXPIRY_MS ?? '3600000', 10),

  // CORS
  corsOrigin: process.env.CORS_ORIGIN ?? 'https://inspecto.solrum.dev',

  // Upload limits (bytes)
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE ?? String(50 * 1024 * 1024), 10),
  maxImageSize: parseInt(process.env.MAX_IMAGE_SIZE ?? String(20 * 1024 * 1024), 10),

  // SMTP (self-hosted email)
  smtpHost: process.env.SMTP_HOST ?? '',
  smtpPort: parseInt(process.env.SMTP_PORT ?? '465', 10),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUseTls: process.env.SMTP_USE_TLS === 'true',
  smtpUser: process.env.SMTP_USER ?? '',
  smtpPass: process.env.SMTP_PASS ?? '',
  smtpRejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false',
  smtpMockMode: process.env.SMTP_MOCK_MODE === 'true',
  mailFrom: process.env.MAIL_FROM ?? 'Inspecto <noreply@solrum.dev>',
  smtpFromName: process.env.SMTP_FROM_NAME ?? 'Inspecto',

  // App URL (for email links)
  appUrl: process.env.APP_URL ?? 'http://localhost:3000',
} as const;
