import nodemailer from 'nodemailer';
import { env } from './env.js';

function createTransport() {
  if (!env.smtpHost || env.smtpMockMode) {
    return null;
  }

  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    requireTLS: env.smtpUseTls,
    tls: {
      rejectUnauthorized: env.smtpRejectUnauthorized,
    },
    ...(env.smtpUser && env.smtpPass
      ? { auth: { user: env.smtpUser, pass: env.smtpPass } }
      : {}),
  });
}

const transport = createTransport();

export async function sendMail(to: string, subject: string, html: string) {
  if (!transport) {
    console.log(`[MAIL${env.smtpMockMode ? ' MOCK' : ' DISABLED'}] To: ${to} | Subject: ${subject}`);
    return;
  }

  await transport.sendMail({
    from: `${env.smtpFromName} <${env.mailFrom.replace(/^.*</, '').replace(/>$/, '')}>`,
    to,
    subject,
    html,
  });
}
