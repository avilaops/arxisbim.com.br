import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, gte, lt } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { users } from '../../../shared/database/schema/tenants.js';
import { authTokens } from '../../../shared/database/schema/observability.js';
import { observabilityService } from '../../../core/observability/service.js';
import { emailService } from '../../../core/email/email.service.js';

const VERIFICATION_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 horas
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutos

export class AccountSecurityService {
  private db;
  private loginAttempts: Map<string, { count: number; lastAttempt: Date }> = new Map();

  constructor() {
    const client = postgres(process.env.DATABASE_URL!);
    this.db = drizzle(client, { schema: { users, authTokens } });
  }

  /**
   * Gerar token de verificação de email
   */
  async generateEmailVerificationToken(userId: string, tenantId: string, email: string): Promise<string> {
    const verificationToken = randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(verificationToken, 6);
    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY);

    await this.db.insert(authTokens).values({
      userId,
      tenantId,
      tokenType: 'email_verification',
      token: hashedToken,
      expiresAt,
      isUsed: false,
      metadata: { email },
    });

    // Log de auditoria
    await observabilityService.logAudit({
      tenantId,
      userId,
      action: 'email.verification.sent',
      resource: 'auth',
      resourceId: userId,
      metadata: { email },
    }).catch(err => console.error('Failed to log audit:', err));

    // Enviar email de verificação
    await emailService.sendEmailVerification(email, userId, verificationToken, tenantId);

    return verificationToken;
  }

  /**
   * Verificar email usando token
   */
  async verifyEmail(verificationToken: string, tenantId: string): Promise<{ success: boolean; userId?: string }> {
    const now = new Date();

    // Buscar tokens válidos
    const tokens = await this.db
      .select()
      .from(authTokens)
      .where(
        and(
          eq(authTokens.tenantId, tenantId),
          eq(authTokens.tokenType, 'email_verification'),
          eq(authTokens.isUsed, false),
          gte(authTokens.expiresAt, now)
        )
      );

    // Verificar cada token
    for (const tokenRecord of tokens) {
      const isMatch = await bcrypt.compare(verificationToken, tokenRecord.token);
      if (isMatch) {
        // Marcar email como verificado
        await this.db
          .update(users)
          .set({ 
            emailVerified: true,
            emailVerifiedAt: new Date(),
          })
          .where(eq(users.id, tokenRecord.userId));

        // Marcar token como usado
        await this.db
          .update(authTokens)
          .set({ isUsed: true, usedAt: new Date() })
          .where(eq(authTokens.id, tokenRecord.id));

        // Log de auditoria
        await observabilityService.logAudit({
          tenantId,
          userId: tokenRecord.userId,
          action: 'email.verified',
          resource: 'auth',
          resourceId: tokenRecord.userId,
        }).catch(err => console.error('Failed to log audit:', err));

        return { success: true, userId: tokenRecord.userId };
      }
    }

    return { success: false };
  }

  /**
   * Reenviar email de verificação
   */
  async resendVerificationEmail(userId: string, tenantId: string): Promise<string> {
    // Buscar usuário
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    if (user.emailVerified) {
      throw new Error('Email already verified');
    }

    // Invalidar tokens anteriores
    await this.db
      .update(authTokens)
      .set({ isUsed: true })
      .where(
        and(
          eq(authTokens.userId, userId),
          eq(authTokens.tokenType, 'email_verification'),
          eq(authTokens.isUsed, false)
        )
      );

    // Gerar novo token
    return this.generateEmailVerificationToken(userId, tenantId, user.email);
  }

  /**
   * Registrar tentativa de login falha
   */
  recordFailedLoginAttempt(email: string, tenantId: string): void {
    const key = `${tenantId}:${email}`;
    const now = new Date();
    const attempt = this.loginAttempts.get(key);

    if (attempt) {
      // Resetar contagem se passou do período de lockout
      const timeSinceLastAttempt = now.getTime() - attempt.lastAttempt.getTime();
      if (timeSinceLastAttempt > LOCKOUT_DURATION) {
        this.loginAttempts.set(key, { count: 1, lastAttempt: now });
      } else {
        this.loginAttempts.set(key, {
          count: attempt.count + 1,
          lastAttempt: now,
        });
      }
    } else {
      this.loginAttempts.set(key, { count: 1, lastAttempt: now });
    }

    // Log se atingiu limite
    const currentAttempt = this.loginAttempts.get(key);
    if (currentAttempt && currentAttempt.count >= MAX_LOGIN_ATTEMPTS) {
      observabilityService.logError({
        tenantId,
        errorCode: 'ACCOUNT_LOCKED',
        errorMessage: `Account locked due to too many failed login attempts: ${email}`,
        severity: 'warning',
        context: { email, attempts: currentAttempt.count },
      }).catch(err => console.error('Failed to log error:', err));
    }
  }

  /**
   * Verificar se conta está bloqueada
   */
  isAccountLocked(email: string, tenantId: string): { locked: boolean; remainingTime?: number } {
    const key = `${tenantId}:${email}`;
    const attempt = this.loginAttempts.get(key);

    if (!attempt || attempt.count < MAX_LOGIN_ATTEMPTS) {
      return { locked: false };
    }

    const now = new Date();
    const timeSinceLastAttempt = now.getTime() - attempt.lastAttempt.getTime();

    if (timeSinceLastAttempt > LOCKOUT_DURATION) {
      // Período de lockout expirou
      this.loginAttempts.delete(key);
      return { locked: false };
    }

    const remainingTime = LOCKOUT_DURATION - timeSinceLastAttempt;
    return { locked: true, remainingTime };
  }

  /**
   * Limpar tentativas de login após login bem-sucedido
   */
  clearLoginAttempts(email: string, tenantId: string): void {
    const key = `${tenantId}:${email}`;
    this.loginAttempts.delete(key);
  }

  /**
   * Obter estatísticas de segurança da conta
   */
  async getAccountSecurityStats(userId: string, tenantId: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    // Contar tokens ativos
    const now = new Date();
    const activeTokens = await this.db
      .select()
      .from(authTokens)
      .where(
        and(
          eq(authTokens.userId, userId),
          eq(authTokens.isUsed, false),
          gte(authTokens.expiresAt, now)
        )
      );

    return {
      emailVerified: user.emailVerified || false,
      emailVerifiedAt: user.emailVerifiedAt,
      lastLoginAt: user.lastLoginAt,
      activeTokens: activeTokens.length,
      accountCreated: user.createdAt,
    };
  }
}
