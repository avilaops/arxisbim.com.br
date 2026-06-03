import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { users, tenants } from '../../../shared/database/schema/tenants.js';
import { userSessions, authTokens } from '../../../shared/database/schema/observability.js';
import type { RegisterInput, LoginInput } from './auth.schemas.js';
import { observabilityService } from '../../../core/observability/service.js';
import { emailService } from '../../../core/email/email.service.js';
import { randomBytes } from 'crypto';

// =====================================
// CONFIGURATION FROM .env
// =====================================

// Validate required environment variables
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be defined in .env');
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be defined in .env');
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '24h') as jwt.SignOptions['expiresIn'];
const REFRESH_TOKEN_EXPIRES_IN = (process.env.REFRESH_TOKEN_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);

// =====================================
// AUTH SERVICE
// =====================================

export class AuthService {
  private db;

  constructor() {
    const client = postgres(process.env.DATABASE_URL!);
    this.db = drizzle(client, { schema: { users, userSessions } });
  }

  /**
   * Generate a unique tenant slug from a company name.
   * Removes diacritics, lowercases, replaces non-alphanumerics with '-' and
   * appends a short random suffix to guarantee uniqueness.
   */
  private generateTenantSlug(companyName: string): string {
    const base = companyName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32);
    const suffix = randomBytes(3).toString('hex');
    return base ? `${base}-${suffix}` : `company-${suffix}`;
  }

  /**
   * Register new user (multi-tenant aware).
   * - If `companyName` is provided and `tenantId` is not, creates a new tenant
   *   with a generated slug and registers the user as 'owner'.
   * - If `tenantId` is provided, joins an existing tenant as 'user'.
   */
  async register(input: RegisterInput) {
    let tenantId = input.tenantId;
    let role: 'owner' | 'user' = 'user';

    // Create tenant on-the-fly when only companyName is provided
    if (!tenantId && input.companyName) {
      // Retry slug generation on the rare collision (unique constraint)
      for (let attempt = 0; attempt < 3; attempt++) {
        const slug = this.generateTenantSlug(input.companyName);
        try {
          await this.db.insert(tenants).values({
            tenantId: slug,
            name: input.companyName,
            isActive: true,
          });
          tenantId = slug;
          role = 'owner';
          break;
        } catch (err: any) {
          // unique_violation on tenant_id → retry; otherwise rethrow
          if (err?.code !== '23505') throw err;
        }
      }
      if (!tenantId) {
        throw new Error('Não foi possível criar o workspace, tente novamente');
      }
    }

    if (!tenantId) {
      throw new Error('tenantId ou companyName é obrigatório');
    }

    // Check if user already exists in this tenant
    const existingUser = await this.db
      .select()
      .from(users)
      .where(
        and(
          eq(users.email, input.email),
          eq(users.tenantId, tenantId)
        )
      )
      .limit(1);

    if (existingUser.length > 0) {
      const existing = existingUser[0];
      // Se a conta existe mas o email não foi verificado, reenviar verificação
      if (!existing.emailVerified) {
        await this.sendEmailVerification(existing.id, existing.tenantId);
        return {
          user: {
            id: existing.id,
            email: existing.email,
            name: existing.name,
            role: existing.role,
            tenantId: existing.tenantId,
            companyId: existing.companyId,
          },
          requiresEmailVerification: true,
          message: 'Esta conta ainda não foi verificada. Reenviamos o email de confirmação.',
        } as any;
      }
      throw new Error('Já existe uma conta com este email');
    }

    // Hash password with configurable rounds
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    // Create user (tenant-isolated) — inactive until email is verified
    const [newUser] = await this.db
      .insert(users)
      .values({
        email: input.email,
        name: input.name,
        passwordHash,
        tenantId,
        companyId: input.companyId || null,
        role,
        isActive: false,        // activated after email verification
        emailVerified: false,
        permissions: [],
      })
      .returning();

    // Log de auditoria - usuário criado
    await observabilityService.logAudit({
      tenantId: newUser.tenantId,
      userId: newUser.id,
      action: 'user.created',
      resource: 'user',
      resourceId: newUser.id,
      metadata: {
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
    }).catch(err => console.error('Failed to log audit:', err));

    // Métrica - novo usuário
    await observabilityService.incrementCounter(
      newUser.tenantId,
      'users.created',
      { tenant: newUser.tenantId }
    ).catch(err => console.error('Failed to increment counter:', err));

    // Gerar e enviar token de verificação de email
    await this.sendEmailVerification(newUser.id, newUser.tenantId);

    // NÃO geramos tokens de acesso — usuário precisa verificar email primeiro
    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        tenantId: newUser.tenantId,
        companyId: newUser.companyId,
      },
      requiresEmailVerification: true,
      message: 'Conta criada com sucesso. Verifique seu email para ativar a conta.',
    };
  }

  /**
   * Login user.
   * - If `tenantId` is provided, restricts the lookup to that tenant.
   * - Otherwise, finds the user globally by email (email is globally unique).
   */
  async login(input: LoginInput, tenantId?: string) {
    const whereClauses = tenantId
      ? and(
          eq(users.email, input.email),
          eq(users.tenantId, tenantId),
          eq(users.isActive, true)
        )
      : and(
          eq(users.email, input.email),
          eq(users.isActive, true)
        );

    const [user] = await this.db
      .select()
      .from(users)
      .where(whereClauses)
      .limit(1);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(
      input.password,
      user.passwordHash
    );

    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Require email verification before login
    if (!user.emailVerified) {
      const err: any = new Error('Por favor, verifique seu email antes de fazer login. Verifique sua caixa de entrada.');
      err.code = 'EMAIL_NOT_VERIFIED';
      throw err;
    }

    // Update last login
    await this.db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    // Log de auditoria - login bem-sucedido
    await observabilityService.logAudit({
      tenantId: user.tenantId,
      userId: user.id,
      action: 'user.login',
      resource: 'auth',
      resourceId: user.id,
      metadata: {
        email: user.email,
      },
    }).catch(err => console.error('Failed to log audit:', err));

    // Métrica - login
    await observabilityService.incrementCounter(
      user.tenantId,
      'auth.login.success',
      { tenant: user.tenantId }
    ).catch(err => console.error('Failed to increment counter:', err));

    // Generate tokens
    const accessToken = this.generateAccessToken(
      user.id,
      user.tenantId,
      user.role
    );
    const { token: refreshToken, sessionId } = await this.createSession(
      user.id,
      user.tenantId
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        companyId: user.companyId,
      },
      accessToken,
      refreshToken,
      sessionId,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, JWT_SECRET) as {
        userId: string;
        tenantId: string;
      };

      const user = await this.getUserById(decoded.userId, decoded.tenantId);

      const accessToken = this.generateAccessToken(
        user.id,
        user.tenantId,
        user.role
      );
      const newRefreshToken = this.generateRefreshToken(
        user.id,
        user.tenantId
      );

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Get user by ID (tenant-isolated)
   */
  async getUserById(userId: string, tenantId: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, userId),
          eq(users.tenantId, tenantId),
          eq(users.isActive, true)
        )
      )
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      companyId: user.companyId,
      permissions: user.permissions,
    };
  }

  /**
   * Generate JWT access token with tenant context
   */
  private generateAccessToken(
    userId: string,
    tenantId: string,
    role: string
  ): string {
    return jwt.sign(
      {
        userId,
        tenantId,
        role,
        type: 'access',
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  /**
   * Generate JWT refresh token
   */
  private generateRefreshToken(userId: string, tenantId: string): string {
    return jwt.sign(
      {
        userId,
        tenantId,
        type: 'refresh',
        jti: randomBytes(16).toString('hex'),
      },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );
  }

  /**
   * Create session and store refresh token
   */
  private async createSession(
    userId: string,
    tenantId: string,
    deviceInfo?: { userAgent?: string; ip?: string; device?: string; browser?: string; os?: string },
    ipAddress?: string
  ): Promise<{ token: string; sessionId: string }> {
    const refreshToken = this.generateRefreshToken(userId, tenantId);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const [session] = await this.db
      .insert(userSessions)
      .values({
        userId,
        tenantId,
        refreshToken,
        expiresAt,
        deviceInfo: deviceInfo || null,
        ipAddress: ipAddress || 'unknown',
        isRevoked: false,
      })
      .returning();

    return {
      token: refreshToken,
      sessionId: session.id,
    };
  }

  /**
   * Logout - Revoke refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    await this.db
      .update(userSessions)
      .set({ isRevoked: true, revokedAt: new Date() })
      .where(eq(userSessions.refreshToken, refreshToken));

    // Log de auditoria
    try {
      const decoded = jwt.decode(refreshToken) as any;
      if (decoded?.userId && decoded?.tenantId) {
        await observabilityService.logAudit({
          tenantId: decoded.tenantId,
          userId: decoded.userId,
          action: 'user.logout',
          resource: 'auth',
          resourceId: decoded.userId,
        });
      }
    } catch (err) {
      console.error('Failed to log logout:', err);
    }
  }

  /**
   * Change password
   */
  async changePassword(
    userId: string,
    tenantId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    // Verificar usuário
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    // Verificar senha atual
    const isValidPassword = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );

    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Hash nova senha
    const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // Atualizar senha
    await this.db
      .update(users)
      .set({ passwordHash: newPasswordHash })
      .where(eq(users.id, userId));

    // Revogar todas as sessões
    await this.db
      .update(userSessions)
      .set({ isRevoked: true, revokedAt: new Date() })
      .where(and(eq(userSessions.userId, userId), eq(userSessions.isRevoked, false)));

    // Log de auditoria
    await observabilityService.logAudit({
      tenantId,
      userId,
      action: 'user.password_changed',
      resource: 'auth',
      resourceId: userId,
    }).catch(err => console.error('Failed to log audit:', err));
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    tenantId: string,
    data: { name?: string; companyId?: string }
  ): Promise<any> {
    const updateData: any = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.companyId !== undefined) {
      updateData.companyId = data.companyId;
    }

    const [updatedUser] = await this.db
      .update(users)
      .set(updateData)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .returning();

    if (!updatedUser) {
      throw new Error('User not found');
    }

    // Log de auditoria
    await observabilityService.logAudit({
      tenantId,
      userId,
      action: 'user.profile_updated',
      resource: 'user',
      resourceId: userId,
      metadata: data,
    }).catch(err => console.error('Failed to log audit:', err));

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      tenantId: updatedUser.tenantId,
      companyId: updatedUser.companyId,
    };
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string, tenantId: string): Promise<any[]> {
    const sessions = await this.db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.userId, userId),
          eq(userSessions.tenantId, tenantId),
          eq(userSessions.isRevoked, false)
        )
      );

    return sessions.map(session => ({
      id: session.id,
      deviceInfo: session.deviceInfo,
      ipAddress: session.ipAddress,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      lastUsedAt: session.lastUsedAt,
    }));
  }

  /**
   * Revoke specific session
   */
  async revokeSession(
    userId: string,
    tenantId: string,
    sessionId: string
  ): Promise<void> {
    await this.db
      .update(userSessions)
      .set({ isRevoked: true, revokedAt: new Date() })
      .where(
        and(
          eq(userSessions.id, sessionId),
          eq(userSessions.userId, userId),
          eq(userSessions.tenantId, tenantId)
        )
      );

    await observabilityService.logAudit({
      tenantId,
      userId,
      action: 'user.session_revoked',
      resource: 'session',
      resourceId: sessionId,
    }).catch(err => console.error('Failed to log audit:', err));
  }

  /**
   * Request password reset - Generate reset token
   */
  async requestPasswordReset(email: string, tenantId: string): Promise<string> {
    // Verificar se usuário existe
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.tenantId, tenantId)))
      .limit(1);

    if (!user) {
      // Não revelar se o email existe ou não (security)
      return 'reset_token_placeholder';
    }

    // Gerar token único
    const resetToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Salvar token
    await this.db.insert(authTokens).values({
      userId: user.id,
      tenantId,
      token: resetToken,
      tokenType: 'password_reset',
      expiresAt,
      metadata: {},
    });

    // Log de auditoria
    await observabilityService.logAudit({
      tenantId,
      userId: user.id,
      action: 'user.password_reset_requested',
      resource: 'auth',
      resourceId: user.id,
      metadata: { email },
    }).catch(err => console.error('Failed to log audit:', err));

    return resetToken;
  }

  /**
   * Reset password using token
   */
  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<void> {
    // Buscar token válido
    const [tokenRecord] = await this.db
      .select()
      .from(authTokens)
      .where(
        and(
          eq(authTokens.token, token),
          eq(authTokens.tokenType, 'password_reset')
        )
      )
      .limit(1);

    if (!tokenRecord) {
      throw new Error('Invalid or expired reset token');
    }

    // Verificar se expirou
    if (new Date() > tokenRecord.expiresAt) {
      throw new Error('Reset token has expired');
    }

    // Verificar se já foi usado
    if (tokenRecord.usedAt) {
      throw new Error('Reset token has already been used');
    }

    // Hash nova senha
    const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // Atualizar senha
    await this.db
      .update(users)
      .set({ passwordHash: newPasswordHash })
      .where(eq(users.id, tokenRecord.userId));

    // Marcar token como usado
    await this.db
      .update(authTokens)
      .set({ usedAt: new Date() })
      .where(eq(authTokens.id, tokenRecord.id));

    // Revogar todas as sessões ativas
    await this.db
      .update(userSessions)
      .set({ isRevoked: true, revokedAt: new Date() })
      .where(
        and(
          eq(userSessions.userId, tokenRecord.userId),
          eq(userSessions.isRevoked, false)
        )
      );

    // Log de auditoria
    await observabilityService.logAudit({
      tenantId: tokenRecord.tenantId,
      userId: tokenRecord.userId,
      action: 'user.password_reset_completed',
      resource: 'auth',
      resourceId: tokenRecord.userId,
    }).catch(err => console.error('Failed to log audit:', err));
  }

  /**
   * Send email verification token
   */
  async sendEmailVerification(userId: string, tenantId: string): Promise<string> {
    // Buscar usuário
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    // Verificar se já está verificado
    if (user.emailVerified) {
      throw new Error('Email already verified');
    }

    // Gerar token
    const verificationToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    // Salvar token
    await this.db.insert(authTokens).values({
      userId,
      tenantId,
      token: verificationToken,
      tokenType: 'email_verification',
      expiresAt,
      metadata: { email: user.email },
    });

    // Log de auditoria
    await observabilityService.logAudit({
      tenantId,
      userId,
      action: 'user.email_verification_sent',
      resource: 'auth',
      resourceId: userId,
      metadata: { email: user.email },
    }).catch(err => console.error('Failed to log audit:', err));

    // Enviar email de verificação
    await emailService.sendEmailVerification(
      user.email,
      user.name,
      verificationToken,
      tenantId
    );

    return verificationToken;
  }

  /**
   * Verify email using token
   */
  async verifyEmail(token: string): Promise<{ success: boolean; email?: string }> {
    // Buscar token válido
    const [tokenRecord] = await this.db
      .select()
      .from(authTokens)
      .where(
        and(
          eq(authTokens.token, token),
          eq(authTokens.tokenType, 'email_verification')
        )
      )
      .limit(1);

    if (!tokenRecord) {
      throw new Error('Invalid verification token');
    }

    // Verificar se expirou
    if (new Date() > tokenRecord.expiresAt) {
      throw new Error('Verification token has expired');
    }

    // Verificar se já foi usado
    if (tokenRecord.usedAt) {
      throw new Error('Token has already been used');
    }

    // Atualizar usuário
    const [updatedUser] = await this.db
      .update(users)
      .set({
        emailVerified: true,
        emailVerifiedAt: new Date(),
      })
      .where(eq(users.id, tokenRecord.userId))
      .returning();

    // Marcar token como usado
    await this.db
      .update(authTokens)
      .set({ usedAt: new Date() })
      .where(eq(authTokens.id, tokenRecord.id));

    // Log de auditoria
    await observabilityService.logAudit({
      tenantId: tokenRecord.tenantId,
      userId: tokenRecord.userId,
      action: 'user.email_verified',
      resource: 'user',
      resourceId: tokenRecord.userId,
      metadata: { email: updatedUser.email },
    }).catch(err => console.error('Failed to log audit:', err));

    return {
      success: true,
      email: updatedUser.email,
    };
  }
}
