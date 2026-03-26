import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from '../config/database.js';
import { env } from '../config/env.js';
import { sendMail } from '../config/mailer.js';
import { AppError } from '../middleware/error-handler.js';
import { generateToken, type AuthPayload } from '../middleware/auth.js';

export interface RegisterInput {
  email: string;
  name: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export async function register(input: RegisterInput) {
  const existing = await db('users').where('email', input.email).first();
  if (existing) {
    throw new AppError(409, 'Email already registered');
  }

  const passwordHash = await bcrypt.hash(input.password, env.bcryptSaltRounds);

  const result = await db.transaction(async (trx) => {
    const [user] = await trx('users')
      .insert({
        email: input.email,
        name: input.name,
        password_hash: passwordHash,
      })
      .returning(['id', 'email', 'name', 'avatar_url', 'created_at']);

    // Auto-create a default org for the new user
    const orgName = `${input.name}'s Workspace`;
    const baseSlug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    // Append short user id to guarantee slug uniqueness
    const slug = `${baseSlug}-${(user.id as string).slice(0, 8)}`;

    const [org] = await trx('organizations')
      .insert({ name: orgName, slug, created_by: user.id })
      .returning(['id']);

    await trx('org_members').insert({
      org_id: org.id,
      user_id: user.id,
      role: 'admin',
    });

    return { user, orgId: org.id as string };
  });

  const token = generateToken({ userId: result.user.id, email: result.user.email });
  return { user: formatUser(result.user), token, orgId: result.orgId };
}

export async function login(input: LoginInput) {
  const user = await db('users').where('email', input.email).first();
  if (!user) {
    throw new AppError(401, 'Invalid email or password');
  }

  const valid = await bcrypt.compare(input.password, user.password_hash);
  if (!valid) {
    throw new AppError(401, 'Invalid email or password');
  }

  const token = generateToken({ userId: user.id, email: user.email });
  return { user: formatUser(user), token };
}

export async function getMe(auth: AuthPayload) {
  const user = await db('users')
    .where('id', auth.userId)
    .select('id', 'email', 'name', 'avatar_url', 'created_at')
    .first();
  if (!user) {
    throw new AppError(404, 'User not found');
  }
  return formatUser(user);
}

export async function updateProfile(userId: string, data: { name?: string; avatarUrl?: string }) {
  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.avatarUrl !== undefined) updates.avatar_url = data.avatarUrl;

  if (Object.keys(updates).length === 0) {
    throw new AppError(400, 'No fields to update');
  }

  updates.updated_at = new Date();
  const [user] = await db('users')
    .where('id', userId)
    .update(updates)
    .returning(['id', 'email', 'name', 'avatar_url', 'created_at']);

  return formatUser(user);
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await db('users').where('id', userId).first();
  if (!user) throw new AppError(404, 'User not found');

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) throw new AppError(401, 'Current password is incorrect');

  const passwordHash = await bcrypt.hash(newPassword, env.bcryptSaltRounds);
  await db('users').where('id', userId).update({ password_hash: passwordHash, updated_at: new Date() });
}

export async function forgotPassword(email: string) {
  const user = await db('users').where('email', email).first();
  // Always return success to prevent email enumeration
  if (!user) return { message: 'If an account exists, a reset link has been sent.' };

  const token = crypto.randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + env.passwordResetExpiryMs);

  await db.transaction(async (trx) => {
    // Invalidate any existing tokens
    await trx('password_reset_tokens')
      .where('user_id', user.id)
      .whereNull('used_at')
      .update({ used_at: new Date() });

    await trx('password_reset_tokens').insert({
      user_id: user.id,
      token,
      expires_at: expiresAt,
    });
  });

  const resetUrl = `${env.appUrl}/forgot-password?token=${token}`;
  await sendMail(
    email,
    'Reset your Inspecto password',
    `<p>Hi ${user.name},</p>
     <p>Click the link below to reset your password. This link expires in 1 hour.</p>
     <p><a href="${resetUrl}">${resetUrl}</a></p>
     <p>If you did not request this, please ignore this email.</p>
     <p>— Inspecto Team</p>`,
  );

  return { message: 'If an account exists, a reset link has been sent.' };
}

export async function resetPassword(token: string, newPassword: string) {
  const record = await db('password_reset_tokens')
    .where('token', token)
    .whereNull('used_at')
    .first();

  if (!record) throw new AppError(400, 'Invalid or expired reset token');
  if (new Date(record.expires_at) < new Date()) throw new AppError(400, 'Reset token has expired');

  const passwordHash = await bcrypt.hash(newPassword, env.bcryptSaltRounds);

  await db.transaction(async (trx) => {
    await trx('users').where('id', record.user_id).update({ password_hash: passwordHash, updated_at: new Date() });
    await trx('password_reset_tokens').where('id', record.id).update({ used_at: new Date() });
  });

  return { message: 'Password has been reset successfully' };
}

function formatUser(row: Record<string, unknown>) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
  };
}
