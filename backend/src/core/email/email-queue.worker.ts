import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, and, lt, lte } from 'drizzle-orm';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { emailQueue } from '../../shared/database/schema/email-queue.js';
import { createJobLogger, newJobId } from '../observability/job-context.js';

type Logger = { info: (...a: any[]) => void; error: (...a: any[]) => void; warn: (...a: any[]) => void };

export type EmailQueueWorkerOptions = {
  intervalMs: number;
  batchSize?: number;
  logger: Logger;
};

/**
 * Enqueue an email for resilient delivery.
 * Call this instead of emailService.send() for critical auth emails.
 */
export async function enqueueEmail(opts: {
  to: string;
  subject: string;
  html: string;
  metadata?: { emailType?: string; tenantId?: string; userId?: string; originReqId?: string };
}): Promise<void> {
  const sql = postgres(process.env.DATABASE_URL!);
  const db = drizzle(sql);
  try {
    await db.insert(emailQueue).values({
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      metadata: opts.metadata ?? {},
    } as any);
  } finally {
    await sql.end();
  }
}

export function createEmailQueueWorker(options: EmailQueueWorkerOptions) {
  const { intervalMs, batchSize = 10, logger } = options;
  let timer: NodeJS.Timeout | null = null;

  async function buildSender() {
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const resend = new Resend(resendKey);
      const from = `ArxisVR <${process.env.EMAIL_FROM || 'onboarding@resend.dev'}>`;
      return async (to: string, subject: string, html: string) => {
        const { error } = await resend.emails.send({ from, to, subject, html });
        if (error) throw new Error(error.message);
      };
    }

    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;
    if (host && user && pass) {
      const port = parseInt(process.env.SMTP_PORT || '587', 10);
      const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
      const from = `"ArxisVR" <${process.env.EMAIL_FROM || user}>`;
      return async (to: string, subject: string, html: string) => {
        await transporter.sendMail({ from, to, subject, html });
      };
    }

    return async (to: string, subject: string) => {
      logger.warn(`[email-queue] no sender configured — dropped: to=${to} subject=${subject}`);
    };
  }

  async function sweep(): Promise<{ sent: number; failed: number }> {
    const sql = postgres(process.env.DATABASE_URL!);
    const db = drizzle(sql, { schema: { emailQueue } });
    let sent = 0; let failed = 0;

    try {
      const send = await buildSender();
      const now = new Date();

      const rows = await db
        .select()
        .from(emailQueue)
        .where(and(
          eq(emailQueue.status, 'pending'),
          lte(emailQueue.scheduledAt, now),
          lt(emailQueue.attempts, emailQueue.maxAttempts),
        ))
        .limit(batchSize);

      for (const row of rows) {
        // Cada email é um job: gera job_id próprio e preserva origin_req_id do
        // request que o enfileirou (S06 trace ponta-a-ponta).
        const jobLog = createJobLogger(logger, {
          jobType: 'email.send',
          jobId: newJobId(),
          originReqId: row.metadata?.originReqId ?? null,
          tenantId: row.metadata?.tenantId,
        });
        try {
          await send(row.to, row.subject, row.html);
          await db
            .update(emailQueue)
            .set({ status: 'sent', sentAt: new Date(), attempts: row.attempts + 1 })
            .where(eq(emailQueue.id, row.id));
          jobLog.info('email sent', { emailId: row.id, status: 'sent', attempts: row.attempts + 1 });
          sent++;
        } catch (err: any) {
          const nextAttempt = row.attempts + 1;
          const isFinal = nextAttempt >= row.maxAttempts;
          // Exponential backoff: 2^attempt * 5min
          const backoffMs = Math.pow(2, nextAttempt) * 5 * 60 * 1000;
          await db
            .update(emailQueue)
            .set({
              attempts: nextAttempt,
              lastError: err.message,
              status: isFinal ? 'failed' : 'pending',
              scheduledAt: isFinal ? row.scheduledAt : new Date(Date.now() + backoffMs),
            })
            .where(eq(emailQueue.id, row.id));

          if (isFinal) {
            jobLog.error('email permanent failure', { emailId: row.id, status: 'failed', attempts: nextAttempt, error: err.message });
            failed++;
          } else {
            jobLog.warn('email send retry scheduled', { emailId: row.id, attempts: nextAttempt, backoffMs });
          }
        }
      }

      return { sent, failed };
    } finally {
      await sql.end();
    }
  }

  function start() {
    if (timer) return;
    logger.info(`[email-queue] worker started (interval=${intervalMs}ms, batchSize=${batchSize})`);
    timer = setInterval(() => {
      sweep().catch(err => logger.error('[email-queue] sweep error:', err));
    }, intervalMs);
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  return { start, stop, sweep };
}
