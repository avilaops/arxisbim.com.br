import { observabilityService } from '../observability/service.js';

/**
 * Email Service para ArxisVR
 * Implementação local com integração ao sistema de observabilidade
 */
export class EmailService {
  private initialized = false;
  private readonly appName = 'ArxisVR';
  private readonly frontendUrl: string;

  constructor() {
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  }

  /**
   * Inicializa o serviço de email
   * Deve ser chamado na inicialização da aplicação
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('📧 Email service já inicializado');
      return;
    }

    try {
      // Implementação local - apenas marca como inicializado
      this.initialized = true;

      observabilityService.recordMetric('email.service.initialized', 1);
      console.log('✅ Email service inicializado com sucesso (modo local)');
    } catch (error: any) {
      observabilityService.logError(error, {
        component: 'EmailService',
        action: 'initialize',
      });
      console.error('❌ Falha ao inicializar email service:', error.message);
      // Não lançar erro - permitir que a aplicação continue sem email
    }
  }

  /**
   * Verifica se o serviço está configurado e funcionando
   */
  isReady(): boolean {
    return this.initialized;
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
    if (!this.initialized) {
      console.warn('⚠️ Email service não inicializado - email não enviado');
      return;
    }

    const verificationUrl = `${this.frontendUrl}/verify-email?token=${verificationToken}&tenant=${tenantId}`;
    const verificationCode = verificationToken.substring(0, 6).toUpperCase();

    try {
      // Implementação local - apenas log
      console.log(`📧 [MOCK] Email de verificação para ${to}: ${verificationCode} - ${verificationUrl}`);

      observabilityService.recordMetric('email.verification.sent', 1);
      observabilityService.logEvent('email.sent', {
        type: 'verification',
        recipient: to,
        tenantId,
      });

      console.log(`📧 Email de verificação enviado para ${to}`);
    } catch (error: any) {
      observabilityService.recordMetric('email.verification.failed', 1);
      observabilityService.logError(error, {
        component: 'EmailService',
        action: 'sendEmailVerification',
        recipient: to,
        tenantId,
      });
      console.error(`❌ Falha ao enviar email de verificação:`, error.message);
      // Não lançar erro - permitir que o usuário possa reenviar
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
    if (!this.initialized) {
      console.warn('⚠️ Email service não inicializado - email não enviado');
      return;
    }

    const resetUrl = `${this.frontendUrl}/reset-password?token=${resetToken}&tenant=${tenantId}`;

    try {
      // Implementação local - apenas log
      console.log(`📧 [MOCK] Email de reset de senha para ${to}: ${resetUrl}`);

      observabilityService.recordMetric('email.password_reset.sent', 1);
      observabilityService.logEvent('email.sent', {
        type: 'password_reset',
        recipient: to,
        tenantId,
      });

      console.log(`📧 Email de reset de senha enviado para ${to}`);
    } catch (error: any) {
      observabilityService.recordMetric('email.password_reset.failed', 1);
      observabilityService.logError(error, {
        component: 'EmailService',
        action: 'sendPasswordReset',
        recipient: to,
        tenantId,
      });
      console.error(`❌ Falha ao enviar email de reset de senha:`, error.message);
    }
  }

  /**
   * Envia email de boas-vindas após registro
   */
  async sendWelcomeEmail(
    to: string,
    name: string,
    tenantId: string
  ): Promise<void> {
    if (!this.initialized) {
      console.warn('⚠️ Email service não inicializado - email não enviado');
      return;
    }

    try {
      // Implementação local - apenas log
      console.log(`📧 [MOCK] Email de boas-vindas para ${to}: ${name}`);

      observabilityService.recordMetric('email.welcome.sent', 1);
      observabilityService.logEvent('email.sent', {
        type: 'welcome',
        recipient: to,
        tenantId,
      });

      console.log(`📧 Email de boas-vindas enviado para ${to}`);
    } catch (error: any) {
      observabilityService.recordMetric('email.welcome.failed', 1);
      observabilityService.logError(error, {
        component: 'EmailService',
        action: 'sendWelcomeEmail',
        recipient: to,
        tenantId,
      });
      console.error(`❌ Falha ao enviar email de boas-vindas:`, error.message);
    }
  }

  /**
   * Envia email customizado
   */
  async sendCustomEmail(
    to: string,
    subject: string,
    htmlContent: string,
    tenantId: string
  ): Promise<void> {
    if (!this.initialized) {
      console.warn('⚠️ Email service não inicializado - email não enviado');
      return;
    }

    try {
      // Implementação local - apenas log
      console.log(`📧 [MOCK] Email customizado para ${to}: ${subject}`);

      observabilityService.recordMetric('email.custom.sent', 1);
      observabilityService.logEvent('email.sent', {
        type: 'custom',
        recipient: to,
        subject,
        tenantId,
      });

      console.log(`📧 Email customizado enviado para ${to}`);
    } catch (error: any) {
      observabilityService.recordMetric('email.custom.failed', 1);
      observabilityService.logError(error, {
        component: 'EmailService',
        action: 'sendCustomEmail',
        recipient: to,
        tenantId,
      });
      console.error(`❌ Falha ao enviar email customizado:`, error.message);
    }
  }

  /**
   * Verifica a saúde do serviço de email
   */
  async healthCheck(): Promise<{ healthy: boolean; message: string }> {
    if (!this.initialized) {
      return {
        healthy: false,
        message: 'Email service not initialized',
      };
    }

    try {
      // Implementação local - apenas verifica se está inicializado
      return {
        healthy: true,
        message: 'Email service operational (local mode)',
      };
    } catch (error: any) {
      return {
        healthy: false,
        message: error.message,
      };
    }
  }
}

// Singleton instance
export const emailService = new EmailService();
