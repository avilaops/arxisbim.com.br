import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, gte, lt } from 'drizzle-orm';
import { users, tenants } from '../../shared/database/schema/tenants.js';
import { authTokens, userSessions } from '../../shared/database/schema/observability.js';
import { BillingService } from '../../modules/billing/billing.service.js';
import { emailService } from '../email/email.service.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { randomBytes } from 'crypto';

interface JWTPayload {
  userId: string;
  email: string;
  name?: string;
  tenantId: string;
  companyId?: string;
  role: string;
  permissions: string[];
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    tenantId: string;
    companyId?: string;
    role: string;
    permissions: string[];
  };
  token: string;
  refreshToken?: string;
}

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  tenantId: z.string().optional(),
});

const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  tenantId: z.string().optional(),
  companyId: z.string().optional(),
  turnstileToken: z.string().optional(),
});

// Deriva slug de tenant a partir do domínio do email (ex: user@acme.com -> 'acme')
function tenantFromEmail(email: string): string {
  const domain = email.split('@')[1] || 'public';
  const base = domain.split('.')[0] || 'public';
  return base.toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

const BCRYPT_ROUNDS = Math.max(10, parseInt(process.env.BCRYPT_ROUNDS || '12', 10));

// Hash dummy pré-computado para proteger contra timing attack.
// Garante tempo de resposta constante mesmo quando o usuário não existe.
const DUMMY_HASH = bcrypt.hashSync('arxisvr-timing-protection-dummy-2026', BCRYPT_ROUNDS);

export class AuthService {
  private db;
  private jwtSecret: string;
  private jwtRefreshSecret: string;
  private accessTokenExpiry = '15m';
  private refreshTokenExpiry = '7d';

  constructor() {
    const connectionString = process.env.DATABASE_URL!;
    const client = postgres(connectionString);
    this.db = drizzle(client, { schema: { users, tenants } });
    
    if (!process.env.JWT_SECRET) {
      throw new Error('CRITICAL: JWT_SECRET environment variable is not set. Refusing to start.');
    }
    if (!process.env.JWT_REFRESH_SECRET) {
      throw new Error('CRITICAL: JWT_REFRESH_SECRET environment variable is not set. Refusing to start.');
    }
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  }

  /**
   * Login com email e senha
   */
  async login(credentials: { email: string; password: string; tenantId?: string; ip?: string; userAgent?: string }): Promise<AuthResponse> {
    // Validar input
    const validated = loginSchema.parse(credentials);

    // Email é único globalmente — tenantId opcional. Se omitido, busca só por email.
    const whereClauses = [
      eq(users.email, validated.email),
      eq(users.isActive, true),
    ];
    if (validated.tenantId) {
      whereClauses.push(eq(users.tenantId, validated.tenantId));
    }

    const [user] = await this.db
      .select()
      .from(users)
      .where(and(...whereClauses))
      .limit(1);

    if (!user) {
      // Timing attack protection: sempre executar bcrypt mesmo quando usuário não existe
      await bcrypt.compare(validated.password, DUMMY_HASH);
      throw new Error('Credenciais inválidas');
    }

    // Verificar senha
    const isValidPassword = await bcrypt.compare(validated.password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Credenciais inválidas');
    }

    // Email deve estar verificado
    if (!user.emailVerified) {
      const err: any = new Error('Verifique seu email antes de fazer login. Confira sua caixa de entrada.');
      err.code = 'EMAIL_NOT_VERIFIED';
      throw err;
    }

    // Verificar se o tenant está ativo
    const [tenant] = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.tenantId, user.tenantId))
      .limit(1);

    if (!tenant || !tenant.isActive) {
      throw new Error('Tenant inativo');
    }

    // Atualizar último login
    await this.db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    // Gerar tokens
    const token = this.generateAccessToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
      companyId: user.companyId || undefined,
      role: user.role,
      permissions: user.permissions || [],
    });

    const refreshToken = this.generateRefreshToken({
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
    });

    // Criar sessão rastreável
    await this.db.insert(userSessions).values({
      userId: user.id,
      tenantId: user.tenantId,
      refreshToken,
      ipAddress: credentials.ip,
      userAgent: credentials.userAgent,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isRevoked: false,
      isActive: true,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
        companyId: user.companyId || undefined,
        role: user.role,
        permissions: user.permissions || [],
      },
      token,
      refreshToken,
    };
  }

  /**
   * Registrar novo usuário
   */
  async register(data: { email: string; password: string; name: string; tenantId?: string; companyId?: string }): Promise<AuthResponse> {
    // Validar input
    const validated = registerSchema.parse(data);

    // tenantId opcional — deriva do domínio do email se omitido (ex: user@acme.com -> 'acme')
    const tenantSlug = validated.tenantId || tenantFromEmail(validated.email);

    // Verificar se o tenant existe; se não, criar automaticamente (self-service signup)
    let [tenant] = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.tenantId, tenantSlug))
      .limit(1);

    if (!tenant) {
      [tenant] = await this.db
        .insert(tenants)
        .values({
          tenantId: tenantSlug,
          name: tenantSlug,
          isActive: true,
        })
        .returning();
    }

    if (!tenant.isActive) {
      throw new Error('Tenant inativo');
    }

    // Email é único globalmente — verifica duplicidade sem filtrar por tenant
    const [existingUser] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, validated.email))
      .limit(1);

    // Email já existe — se não verificado, reenviar; se verificado, erro
    if (existingUser) {
      if (!existingUser.emailVerified) {
        await this.sendVerificationEmail(existingUser.id, existingUser.email, existingUser.tenantId);
        return {
          user: { id: existingUser.id, email: existingUser.email, name: existingUser.name, tenantId: existingUser.tenantId, companyId: existingUser.companyId || undefined, role: existingUser.role, permissions: existingUser.permissions || [] },
          requiresEmailVerification: true,
          message: 'Esta conta ainda não foi verificada. Reenviamos o email de confirmação.',
        } as any;
      }
      throw new Error('Email já cadastrado');
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash(validated.password, BCRYPT_ROUNDS);

    // Criar usuário inativo até verificar email
    const [newUser] = await this.db
      .insert(users)
      .values({
        email: validated.email,
        name: validated.name,
        passwordHash,
        tenantId: tenantSlug,
        companyId: validated.companyId || null,
        role: 'user',
        permissions: [],
        emailVerified: false,
        isActive: false,
      })
      .returning();

    await BillingService.initializeTenantFreeTier(tenantSlug);

    // Enviar email de verificação
    await this.sendVerificationEmail(newUser.id, newUser.email, newUser.tenantId);

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        tenantId: newUser.tenantId,
        companyId: newUser.companyId || undefined,
        role: newUser.role,
        permissions: newUser.permissions || [],
      },
      requiresEmailVerification: true,
      message: 'Conta criada com sucesso. Verifique seu email para ativar a conta.',
    } as any;
  }

  /**
   * Gerar e enviar token de verificação de email
   */
  private async sendVerificationEmail(userId: string, email: string, tenantId: string): Promise<void> {
    const verificationToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Invalidar tokens anteriores do mesmo tipo
    await this.db
      .delete(authTokens)
      .where(and(
        eq(authTokens.userId, userId),
        eq(authTokens.tokenType, 'email_verification'),
        eq(authTokens.isUsed, false)
      ));

    await this.db.insert(authTokens).values({
      userId,
      tenantId,
      token: verificationToken,
      tokenType: 'email_verification',
      expiresAt,
      isUsed: false,
      metadata: { email },
    });

    // Buscar nome do usuário
    const [user] = await this.db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
    const name = user?.name || email.split('@')[0];

    await emailService.sendEmailVerification(email, name, verificationToken, tenantId);
  }

  /**
   * Verificar email com token
   */
  async verifyEmail(token: string): Promise<{ success: boolean; userId?: string }> {
    const now = new Date();
    const [tokenRecord] = await this.db
      .select()
      .from(authTokens)
      .where(and(
        eq(authTokens.token, token),
        eq(authTokens.tokenType, 'email_verification'),
        eq(authTokens.isUsed, false),
        gte(authTokens.expiresAt, now)
      ))
      .limit(1);

    if (!tokenRecord) return { success: false };

    await this.db.update(users).set({ emailVerified: true, isActive: true, emailVerifiedAt: new Date() }).where(eq(users.id, tokenRecord.userId));
    await this.db.update(authTokens).set({ isUsed: true, usedAt: new Date() }).where(eq(authTokens.id, tokenRecord.id));

    // Enviar email de boas-vindas
    const [verifiedUser] = await this.db.select({ email: users.email, name: users.name, tenantId: users.tenantId }).from(users).where(eq(users.id, tokenRecord.userId)).limit(1);
    if (verifiedUser) {
      emailService.sendWelcomeEmail(verifiedUser.email, verifiedUser.name, verifiedUser.tenantId).catch(() => {});
    }

    return { success: true, userId: tokenRecord.userId };
  }

  /**
   * Refresh token
   */
  async refreshToken(refreshToken: string, ip?: string, userAgent?: string): Promise<{ token: string; refreshToken: string }> {
    try {
      // Verificar assinatura JWT
      const payload = jwt.verify(refreshToken, this.jwtRefreshSecret) as JWTPayload;

      // A5 — Refresh Token Rotation: validar token contra user_sessions
      const now = new Date();

      // Buscar sessão SEM filtrar isRevoked — distinguir revogada de inexistente
      const [session] = await this.db
        .select()
        .from(userSessions)
        .where(eq(userSessions.refreshToken, refreshToken))
        .limit(1);

      if (!session) {
        // Token JWT válido mas sem registro no DB — forjado ou deletado manualmente.
        // Nuke nuclear: revogar todas as sessões do usuário.
        await this.db
          .update(userSessions)
          .set({ isRevoked: true, revokedAt: now, isActive: false })
          .where(eq(userSessions.userId, payload.userId));
        throw new Error('TOKEN_REUSE_DETECTED');
      }

      if (session.isRevoked) {
        // Sessão revogada por logout ou rotação anterior — não é ataque, só rejeitar.
        throw new Error('TOKEN_REVOKED');
      }

      if (session.expiresAt < now) {
        throw new Error('TOKEN_EXPIRED');
      }

      // Buscar usuário
      const [user] = await this.db
        .select()
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);

      if (!user || !user.isActive) {
        throw new Error('Usuário inativo');
      }

      // Revogar sessão atual (rotação)
      await this.db
        .update(userSessions)
        .set({ isRevoked: true, revokedAt: now, isActive: false })
        .where(eq(userSessions.id, session.id));

      // Gerar novos tokens
      const newToken = this.generateAccessToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
        companyId: user.companyId || undefined,
        role: user.role,
        permissions: user.permissions || [],
      });

      const newRefreshToken = this.generateRefreshToken({
        userId: user.id,
        email: user.email,
        tenantId: user.tenantId,
      });

      // Criar nova sessão
      await this.db.insert(userSessions).values({
        userId: user.id,
        tenantId: user.tenantId,
        refreshToken: newRefreshToken,
        ipAddress: ip || session.ipAddress || undefined,
        userAgent: userAgent || session.userAgent || undefined,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isRevoked: false,
        isActive: true,
      });

      return { token: newToken, refreshToken: newRefreshToken };
    } catch (error: any) {
      const passthrough = ['TOKEN_REUSE_DETECTED', 'TOKEN_REVOKED', 'TOKEN_EXPIRED'];
      if (passthrough.includes(error.message)) throw error;
      console.error('[refreshToken] error:', error?.name, '|', error?.message, '| code:', error?.code, '| detail:', error?.detail, '| constraint:', error?.constraint);
      throw new Error('Token de refresh inválido');
    }
  }

  /**
   * Logout — revoga refresh token da sessão atual
   */
  async logout(refreshToken: string): Promise<void> {
    if (!refreshToken) return;
    const now = new Date();
    await this.db
      .update(userSessions)
      .set({ isRevoked: true, revokedAt: now, isActive: false })
      .where(eq(userSessions.refreshToken, refreshToken));
  }

  /**
   * Listar sessões ativas do usuário
   */
  async getSessions(userId: string): Promise<Array<{
    id: string; ipAddress: string | null; userAgent: string | null;
    createdAt: Date; lastActivityAt: Date; expiresAt: Date;
  }>> {
    const now = new Date();
    return this.db
      .select({
        id: userSessions.id,
        ipAddress: userSessions.ipAddress,
        userAgent: userSessions.userAgent,
        createdAt: userSessions.createdAt,
        lastActivityAt: userSessions.lastActivityAt,
        expiresAt: userSessions.expiresAt,
      })
      .from(userSessions)
      .where(and(
        eq(userSessions.userId, userId),
        eq(userSessions.isRevoked, false),
        gte(userSessions.expiresAt, now),
      ))
      .orderBy(userSessions.lastActivityAt);
  }

  /**
   * Revogar sessão específica (apenas do próprio usuário)
   */
  async revokeSession(sessionId: string, requestingUserId: string): Promise<void> {
    const [session] = await this.db
      .select({ id: userSessions.id, userId: userSessions.userId })
      .from(userSessions)
      .where(eq(userSessions.id, sessionId))
      .limit(1);

    if (!session || session.userId !== requestingUserId) {
      throw new Error('Sessão não encontrada');
    }

    await this.db
      .update(userSessions)
      .set({ isRevoked: true, revokedAt: new Date(), isActive: false })
      .where(eq(userSessions.id, sessionId));
  }

  /**
   * Revogar todas as sessões exceto a atual
   */
  async revokeAllOtherSessions(userId: string, currentRefreshToken: string): Promise<number> {
    const now = new Date();
    const result = await this.db
      .update(userSessions)
      .set({ isRevoked: true, revokedAt: now, isActive: false })
      .where(and(
        eq(userSessions.userId, userId),
        eq(userSessions.isRevoked, false),
      ))
      .returning({ id: userSessions.id });

    // Reativar a sessão atual (não deve ser revogada)
    const [current] = await this.db
      .select()
      .from(userSessions)
      .where(and(
        eq(userSessions.userId, userId),
        eq(userSessions.refreshToken, currentRefreshToken),
      ))
      .limit(1);

    if (current) {
      await this.db
        .update(userSessions)
        .set({ isRevoked: false, revokedAt: null as any, isActive: true })
        .where(eq(userSessions.id, current.id));
    }

    return result.length - (current ? 1 : 0);
  }

  /**
   * Verificar token JWT
   */
  verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.jwtSecret) as JWTPayload;
    } catch (error) {
      throw new Error('Token inválido');
    }
  }

  /**
   * Gerar access token
   */
  private generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload, this.jwtSecret as string, { expiresIn: this.accessTokenExpiry } as jwt.SignOptions);
  }

  /**
   * Gerar refresh token
   */
  private generateRefreshToken(payload: Pick<JWTPayload, 'userId' | 'email' | 'tenantId'>): string {
    return jwt.sign(
      { ...payload, jti: randomBytes(16).toString('hex') },
      this.jwtRefreshSecret as string,
      { expiresIn: this.refreshTokenExpiry } as jwt.SignOptions,
    );
  }

  /**
   * Alterar senha (usuário autenticado)
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new Error('Usuário não encontrado');

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) throw new Error('Senha atual incorreta');

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.db.update(users).set({ passwordHash: newHash }).where(eq(users.id, userId));
  }

  /**
   * Solicitar reset de senha (forgot password)
   */
  async forgotPassword(email: string): Promise<void> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    // Silencioso se email não existe (segurança)
    if (!user || !user.isActive) return;

    const resetToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Invalidar tokens anteriores
    await this.db.delete(authTokens).where(and(
      eq(authTokens.userId, user.id),
      eq(authTokens.tokenType, 'password_reset'),
      eq(authTokens.isUsed, false)
    ));

    await this.db.insert(authTokens).values({
      userId: user.id,
      tenantId: user.tenantId,
      token: resetToken,
      tokenType: 'password_reset',
      expiresAt,
      isUsed: false,
      metadata: { email: user.email },
    });

    await emailService.sendPasswordReset(user.email, user.name, resetToken, user.tenantId);
  }

  /**
   * Redefinir senha com token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const now = new Date();
    const [tokenRecord] = await this.db
      .select()
      .from(authTokens)
      .where(and(
        eq(authTokens.token, token),
        eq(authTokens.tokenType, 'password_reset'),
        eq(authTokens.isUsed, false),
        gte(authTokens.expiresAt, now)
      ))
      .limit(1);

    if (!tokenRecord) throw new Error('Token inválido ou expirado');

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.db.update(users).set({ passwordHash: newHash }).where(eq(users.id, tokenRecord.userId));
    await this.db.update(authTokens).set({ isUsed: true, usedAt: new Date() }).where(eq(authTokens.id, tokenRecord.id));
  }

  /**
   * Buscar usuário por ID
   */
  async getUserById(userId: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
      companyId: user.companyId || undefined,
      role: user.role,
      permissions: user.permissions || [],
      emailVerified: user.emailVerified,
      isActive: user.isActive,
    };
  }

  /**
   * Alias para getSessions — compatibilidade com código legado
   */
  async getUserSessions(userId: string, _tenantId?: string) {
    return this.getSessions(userId);
  }

  /**
   * Atualizar perfil do usuário
   */
  async updateProfile(userId: string, _tenantId: string, data: { name?: string; companyId?: string }) {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.companyId !== undefined) updateData.companyId = data.companyId;

    const [updated] = await this.db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    if (!updated) throw new Error('Usuário não encontrado');

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      tenantId: updated.tenantId,
      companyId: updated.companyId || undefined,
      role: updated.role,
      permissions: updated.permissions || [],
    };
  }

  /**
   * Solicitar reset de senha
   */
  async requestPasswordReset(email: string, _tenantId?: string): Promise<void> {
    return this.forgotPassword(email);
  }
}
