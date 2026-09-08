import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { Resend } from 'resend';
import { observabilityService } from '../observability/service.js';
import { enqueueEmail } from './email-queue.worker.js';

/**
 * Email Service para ArxisVR
 * Prioridade: Resend API (RESEND_API_KEY) > SMTP > modo log
 */
export class EmailService {
  private initialized = false;
  private transporter: Transporter | null = null;
  private resend: Resend | null = null;
  private readonly appName = 'ArxisVR';
  private readonly frontendUrl: string;
  private readonly fromAddress: string;

  constructor() {
    this.frontendUrl = process.env.FRONTEND_URL || 'https://arxisvr.avilaops.com';
    this.fromAddress = process.env.EMAIL_FROM || 'onboarding@resend.dev';
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      this.resend = new Resend(resendKey);
      this.initialized = true;
      console.log('✅ Email service inicializado com Resend');
      return;
    }

    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);

    if (host && user && pass) {
      try {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
          tls: { rejectUnauthorized: false },
        });
        await this.transporter.verify();
        this.initialized = true;
        console.log(`✅ Email service inicializado com SMTP: ${host}:${port}`);
      } catch (err: any) {
        console.error(`❌ SMTP falhou (${host}:${port}): ${err.message}. Usando modo log.`);
        this.transporter = null;
        this.initialized = true;
      }
    } else {
      this.initialized = true;
      console.log('✅ Email service inicializado (modo log)');
    }
  }

  isReady(): boolean {
    return this.initialized;
  }

  private async send(to: string, subject: string, html: string, metadata?: { emailType?: string; tenantId?: string }): Promise<void> {
    try {
      await this.sendDirect(to, subject, html);
    } catch (err: any) {
      // Direct send failed — enqueue for retry
      console.warn(`[email] direct send failed, enqueueing: to=${to} err=${err.message}`);
      await enqueueEmail({ to, subject, html, metadata }).catch(() => {
        // Enqueue itself failed (DB down) — log and move on, do not block caller
        console.error(`[email] enqueue also failed: to=${to} subject=${subject}`);
      });
    }
  }

  private async sendDirect(to: string, subject: string, html: string): Promise<void> {
    if (this.resend) {
      const { error } = await this.resend.emails.send({
        from: `${this.appName} <${this.fromAddress}>`,
        to,
        subject,
        html,
      });
      if (error) throw new Error(error.message);
      return;
    }

    if (this.transporter) {
      await this.transporter.sendMail({
        from: `"${this.appName}" <${this.fromAddress}>`,
        to,
        subject,
        html,
      });
      return;
    }

    console.log(`📧 [EMAIL LOG] Para: ${to} | Assunto: ${subject}`);
    console.log(`📧 [EMAIL LOG] HTML preview: ${html.replace(/<[^>]+>/g, '').substring(0, 300)}`);
  }

  /**
   * Envia email de verificação de conta
   */
  async sendEmailVerification(
    to: string,
    name: string,
    verificationToken: string,
    tenantId: string
  ): Promise<void> {
    const verificationUrl = `${this.frontendUrl}/verify-email?token=${verificationToken}&tenant=${tenantId}`;
    const code = verificationToken.substring(0, 6).toUpperCase();

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#f5f7fa;margin:0;padding:32px 0">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#2563EB,#7C3AED);padding:32px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:24px;letter-spacing:-0.5px">ArxisVR</h1>
      <p style="color:rgba(255,255,255,.8);margin:8px 0 0;font-size:14px">Plataforma BIM Imersiva</p>
    </div>
    <div style="padding:32px">
      <h2 style="margin:0 0 8px;color:#111827;font-size:20px">Olá, ${name} 👋</h2>
      <p style="color:#6b7280;margin:0 0 24px;line-height:1.6">
        Sua conta foi criada com sucesso. Para ativar o acesso, confirme seu endereço de email clicando no botão abaixo.
      </p>
      <div style="text-align:center;margin:0 0 24px">
        <a href="${verificationUrl}"
           style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#2563EB,#7C3AED);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">
          Verificar meu email
        </a>
      </div>
      <p style="color:#9ca3af;font-size:13px;text-align:center;margin:0 0 8px">
        Ou use o código de verificação:
      </p>
      <div style="text-align:center;margin:0 0 24px">
        <span style="display:inline-block;background:#f3f4f6;border-radius:8px;padding:12px 24px;font-size:24px;font-weight:700;letter-spacing:6px;color:#111827;font-family:monospace">
          ${code}
        </span>
      </div>
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0">
        Link válido por 24 horas. Se não criou esta conta, ignore este email.
      </p>
    </div>
  </div>
</body>
</html>`;

    try {
      await this.send(to, `Confirme seu email - ${this.appName}`, html, { emailType: 'email_verification', tenantId });
      observabilityService.recordMetric('email.verification.sent', 1);
      console.log(`📧 Email de verificação enviado para ${to}`);
    } catch (error: any) {
      observabilityService.recordMetric('email.verification.failed', 1);
      console.error(`❌ Falha ao enviar email de verificação:`, error.message);
    }
  }

  /**
   * Envia email de reset de senha
   */
  async sendPasswordReset(
    to: string,
    name: string,
    resetToken: string,
    tenantId: string
  ): Promise<void> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${resetToken}&tenant=${tenantId}`;

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#f5f7fa;margin:0;padding:32px 0">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#2563EB,#7C3AED);padding:32px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:24px">ArxisVR</h1>
    </div>
    <div style="padding:32px">
      <h2 style="margin:0 0 8px;color:#111827;font-size:20px">Redefinição de senha</h2>
      <p style="color:#6b7280;margin:0 0 24px;line-height:1.6">
        Olá, ${name}. Recebemos uma solicitação para redefinir a senha da sua conta.
      </p>
      <div style="text-align:center;margin:0 0 24px">
        <a href="${resetUrl}"
           style="display:inline-block;padding:14px 32px;background:#2563EB;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">
          Redefinir senha
        </a>
      </div>
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0">
        Link válido por 1 hora. Se não solicitou, ignore este email.
      </p>
    </div>
  </div>
</body>
</html>`;

    try {
      await this.send(to, `Redefinição de senha - ${this.appName}`, html, { emailType: 'password_reset', tenantId });
      observabilityService.recordMetric('email.password_reset.sent', 1);
      console.log(`📧 Email de reset de senha enviado para ${to}`);
    } catch (error: any) {
      observabilityService.recordMetric('email.password_reset.failed', 1);
      console.error(`❌ Falha ao enviar email de reset:`, error.message);
    }
  }

  /**
   * Envia email de boas-vindas (pós-verificação)
   */
  async sendWelcomeEmail(to: string, name: string, tenantId: string): Promise<void> {
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#f5f7fa;margin:0;padding:32px 0">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#2563EB,#7C3AED);padding:32px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:24px">ArxisVR</h1>
    </div>
    <div style="padding:32px">
      <h2 style="margin:0 0 8px;color:#111827;font-size:20px">Bem-vindo, ${name}! 🎉</h2>
      <p style="color:#6b7280;line-height:1.6">
        Sua conta está ativa. Acesse a plataforma BIM imersiva e comece a explorar seus projetos.
      </p>
      <div style="text-align:center;margin:24px 0">
        <a href="${this.frontendUrl}/login"
           style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#2563EB,#7C3AED);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">
          Acessar ArxisVR
        </a>
      </div>
    </div>
  </div>
</body>
</html>`;

    try {
      await this.send(to, `Bem-vindo ao ${this.appName}!`, html);
      console.log(`📧 Email de boas-vindas enviado para ${to}`);
    } catch (error: any) {
      console.error(`❌ Falha ao enviar email de boas-vindas:`, error.message);
    }
  }

  async sendCustomEmail(to: string, subject: string, htmlContent: string, tenantId: string): Promise<void> {
    try {
      await this.send(to, subject, htmlContent);
      console.log(`📧 Email customizado enviado para ${to}`);
    } catch (error: any) {
      console.error(`❌ Falha ao enviar email customizado:`, error.message);
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; message: string }> {
    if (!this.initialized) {
      return { healthy: false, message: 'Email service not initialized' };
    }
    if (this.transporter) {
      try {
        await this.transporter.verify();
        return { healthy: true, message: 'SMTP connection OK' };
      } catch (err: any) {
        return { healthy: false, message: `SMTP error: ${err.message}` };
      }
    }
    return { healthy: true, message: 'Email service operational (log mode)' };
  }
}

// Singleton instance
export const emailService = new EmailService();
