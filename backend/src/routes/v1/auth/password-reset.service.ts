import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, gte } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { users } from '../../../shared/database/schema/tenants.js';
import { authTokens } from '../../../shared/database/schema/observability.js';
import { observabilityService } from '../../../core/observability/service.js';
import { emailService } from '../../../core/email/email.service.js';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
const RESET_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hora

export class PasswordResetService {
  private db;

  constructor() {
    const client = postgres(process.env.DATABASE_URL!);
    this.db = drizzle(client, { schema: { users, authTokens } });
  }

  /**
   * Solicitar reset de senha (forgot password)
   * Gera token e "enviaria" email (por enquanto só retorna o token)
   */
  async requestPasswordReset(email: string, tenantId: string): Promise<{ resetToken: string; expiresAt: Date }> {
    // Buscar usuário
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.tenantId, tenantId)))
      .limit(1);

    if (!user) {
      // Por segurança, não revelar se o email existe
      // Mas ainda retornar sucesso
      throw new Error('If user exists, reset email will be sent');
    }

    // Gerar token único
    const resetToken = randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(resetToken, 6); // Hash leve para tokens
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY);

    // Salvar token no banco
    await this.db.insert(authTokens).values({
      userId: user.id,
      tenantId: user.tenantId,
      tokenType: 'password_reset',
      token: hashedToken,
      expiresAt,
      isUsed: false,
    });

    // Log de auditoria
    await observabilityService.logAudit({
      tenantId: user.tenantId,
      userId: user.id,
      action: 'password.reset.requested',
      resource: 'auth',
      resourceId: user.id,
      metadata: { email: user.email },
    }).catch(err => console.error('Failed to log audit:', err));

    // Enviar email de reset de senha
    await emailService.sendPasswordReset(
      user.email,
      user.name,
      resetToken,
      user.tenantId
    );

    console.log(`📧 Reset token gerado para ${user.email}: ${resetToken}`);
    
    return {
      resetToken, // Em produção com email configurado, isso não seria retornado
      expiresAt,
    };
  }

  /**
   * Validar token de reset
   */
  async validateResetToken(resetToken: string, tenantId: string): Promise<{ valid: boolean; userId?: string }> {
    const now = new Date();

    // Buscar tokens válidos e não expirados
    const tokens = await this.db
      .select()
      .from(authTokens)
      .where(
        and(
          eq(authTokens.tenantId, tenantId),
          eq(authTokens.tokenType, 'password_reset'),
          eq(authTokens.isUsed, false),
          gte(authTokens.expiresAt, now)
        )
      );

    // Verificar cada token (compare hashes)
    for (const tokenRecord of tokens) {
      const isMatch = await bcrypt.compare(resetToken, tokenRecord.token);
      if (isMatch) {
        return { valid: true, userId: tokenRecord.userId };
      }
    }

    return { valid: false };
  }

  /**
   * Reset de senha usando o token
   */
  async resetPassword(resetToken: string, tenantId: string, newPassword: string): Promise<void> {
    // Validar token
    const validation = await this.validateResetToken(resetToken, tenantId);
    
    if (!validation.valid || !validation.userId) {
      throw new Error('Invalid or expired reset token');
    }

    // Hash nova senha
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // Atualizar senha
    await this.db
      .update(users)
      .set({ passwordHash })
      .where(and(eq(users.id, validation.userId), eq(users.tenantId, tenantId)));

    // Marcar token como usado
    const now = new Date();
    const tokens = await this.db
      .select()
      .from(authTokens)
      .where(
        and(
          eq(authTokens.userId, validation.userId),
          eq(authTokens.tenantId, tenantId),
          eq(authTokens.tokenType, 'password_reset'),
          eq(authTokens.isUsed, false),
          gte(authTokens.expiresAt, now)
        )
      );

    for (const tokenRecord of tokens) {
      const isMatch = await bcrypt.compare(resetToken, tokenRecord.token);
      if (isMatch) {
        await this.db
          .update(authTokens)
          .set({ isUsed: true, usedAt: new Date() })
          .where(eq(authTokens.id, tokenRecord.id));
        break;
      }
    }

    // Log de auditoria
    await observabilityService.logAudit({
      tenantId,
      userId: validation.userId,
      action: 'password.reset.completed',
      resource: 'auth',
      resourceId: validation.userId,
    }).catch(err => console.error('Failed to log audit:', err));

    // Métrica
    await observabilityService.incrementCounter(
      tenantId,
      'auth.password.reset',
      { tenant: tenantId }
    ).catch(err => console.error('Failed to increment counter:', err));
  }

  /**
   * Limpar tokens expirados (manutenção)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const now = new Date();
    
    const result = await this.db
      .delete(authTokens)
      .where(
        and(
          eq(authTokens.tokenType, 'password_reset'),
          gte(authTokens.expiresAt, now)
        )
      );

    return result.rowCount || 0;
  }
}
