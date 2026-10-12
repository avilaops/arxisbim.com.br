import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, gte, lt, desc } from 'drizzle-orm';
import { users, tenants } from '../../shared/database/schema/tenants.js';
import { memberships } from '../../shared/database/schema/workspaces.js';
import { personalTenant } from '../tenancy/tenant-derivation.js';
import { authTokens, userSessions } from '../../shared/database/schema/observability.js';
import { passwordHistory } from '../../shared/database/schema/password-history.js';
import { BillingService } from '../../modules/billing/billing.service.js';
import { emailService } from '../email/email.service.js';
import { observabilityService } from '../observability/service.js';
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

// M7 — senha forte: min 8 chars, 1 maiúscula, 1 número, 1 especial
const strongPassword = z
  .string()
  .min(8, 'Senha deve ter no mínimo 8 caracteres')
  .regex(/[A-Z]/, 'Senha deve conter ao menos uma letra maiúscula')
  .regex(/[0-9]/, 'Senha deve conter ao menos um número')
  .regex(/[^A-Za-z0-9]/, 'Senha deve conter ao menos um caractere especial');

// E-mail e trim + lowercase ANTES de validar, nos dois schemas e no
// forgotPassword. O teclado do iPhone capitaliza a primeira letra no cadastro
// e o navegador preenche minusculo no login: "Nicolas@" e "nicolas@" viravam
// contas diferentes, e o Nicolas ficou trancado fora com a senha certa em
// 08/09/2026. A migration 056 poe as linhas existentes em minusculas.
const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email inválido'),
  password: z.string().min(1),  // login: não revalida força — senha pode ser legada
  tenantId: z.string().optional(),
});

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email inválido'),
  password: strongPassword,
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').transform(val => val.replace(/</g, '&lt;').replace(/>/g, '&gt;')),
  tenantId: z.string().optional(),
  companyName: z.string().trim().min(2, 'Workspace deve ter no mínimo 2 caracteres').optional(),
  companyId: z.string().optional(),
  turnstileToken: z.string().optional(),
});

// M2 — Credential stuffing layer 1: contador de falhas por email
// Janela deslizante de 5 min. Alerta se > 5 falhas no mesmo email.
const loginFailWindow = new Map<string, { count: number; resetAt: number }>();
const FAIL_WINDOW_MS = 5 * 60 * 1000;
const FAIL_THRESHOLD = 5;

// M2 Layer 3 — IP reputation: bloqueia IPs com > 20 falhas em 15 min (cross-email)
const ipFailWindow = new Map<string, { count: number; resetAt: number; blocked: boolean }>();
const IP_FAIL_WINDOW_MS = 15 * 60 * 1000;
const IP_FAIL_THRESHOLD = 20;

export function recordIpFailure(ip: string): void {
  const now = Date.now();
  const entry = ipFailWindow.get(ip);
  if (!entry || now > entry.resetAt) {
    ipFailWindow.set(ip, { count: 1, resetAt: now + IP_FAIL_WINDOW_MS, blocked: false });
    return;
  }
  entry.count++;
  if (entry.count >= IP_FAIL_THRESHOLD && !entry.blocked) {
    entry.blocked = true;
    console.warn(`[auth] IP blocked due to ${entry.count} failures: ${ip}`);
  }
}

export function isIpBlocked(ip: string): boolean {
  const entry = ipFailWindow.get(ip);
  if (!entry || Date.now() > entry.resetAt) return false;
  return entry.blocked;
}

function recordLoginFailure(email: string, tenantId: string): void {
  const key = email.toLowerCase();
  const now = Date.now();
  const entry = loginFailWindow.get(key);

  if (!entry || now > entry.resetAt) {
    loginFailWindow.set(key, { count: 1, resetAt: now + FAIL_WINDOW_MS });
    return;
  }

  entry.count++;
  if (entry.count === FAIL_THRESHOLD) {
    // Alerta — não lança exceção, só registra
    observabilityService.logAudit({
      tenantId,
      action: 'auth.credential_stuffing.alert',
      resource: 'auth',
      metadata: { email, failCount: entry.count, windowMs: FAIL_WINDOW_MS },
    }).catch(() => {});
    observabilityService.incrementCounter(tenantId, 'auth.credential_stuffing.alerts', { email: email.split('@')[1] ?? 'unknown' }).catch(() => {});
    console.warn(`[auth] credential stuffing alert: ${entry.count} failures for ${email} in ${FAIL_WINDOW_MS / 1000}s`);
  }
}

/** Expõe contagem atual de falhas para o route handler (M2 layer 2). */
export function getLoginFailCount(email: string): number {
  const entry = loginFailWindow.get(email.toLowerCase());
  if (!entry || Date.now() > entry.resetAt) return 0;
  return entry.count;
}

// Derivação de tenant: domínio público → tenant pessoal único; corporativo →
// slug do domínio. Centralizado em core/tenancy para uso também no OAuth.
// (import no topo do arquivo)

// Converte o nome da empresa/workspace em um slug de tenant (ex: "Ávila Ops" -> 'avila-ops')
function slugifyTenant(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')    // remove acentos
    .replace(/[^a-z0-9]+/g, '-')        // não-alfanumérico -> hífen
    .replace(/^-+|-+$/g, '')            // tira hífens nas pontas
    .slice(0, 40) || 'workspace';
}

// Código de verificação de email: 6 caracteres, sem ambíguos (0/O/1/I).
function generateVerificationCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(6);
  let code = '';
  for (let i = 0; i < 6; i++) code += alphabet[bytes[i] % alphabet.length];
  return code;
}

const BCRYPT_ROUNDS = Math.max(10, parseInt(process.env.BCRYPT_ROUNDS || '12', 10));
const PASSWORD_HISTORY_DEPTH = parseInt(process.env.PASSWORD_HISTORY_DEPTH || '3', 10);

// Hash dummy pré-computado para proteger contra timing attack.
// Garante tempo de resposta constante mesmo quando o usuário não existe.
const DUMMY_HASH = bcrypt.hashSync('arxisvr-timing-protection-dummy-2026', BCRYPT_ROUNDS);

let authDbCache: ReturnType<typeof drizzle<{ users: typeof users; tenants: typeof tenants }>> | null = null;
function authDb() {
  if (!authDbCache) {
    const client = postgres(process.env.DATABASE_URL!, { max: 4 });
    authDbCache = drizzle(client, { schema: { users, tenants } });
  }
  return authDbCache;
}

export class AuthService {
  private db;
  private jwtSecret: string;
  private jwtRefreshSecret: string;
  private accessTokenExpiry = '15m';
  private refreshTokenExpiry = '7d';

  constructor() {
    // Tres AuthService vivem no processo (rotas, middleware, workspaces).
    // Um pool por instancia com max 10 = 30 conexoes so daqui. Pool unico,
    // compartilhado, pequeno (incidente de conexoes de 09/09/2026).
    this.db = authDb();
    // JWT secrets are resolved lazily (getJwtSecret/getJwtRefreshSecret) so that
    // the constructor can be called before process.env is fully populated (e.g. tests).
    this.jwtSecret = '';
    this.jwtRefreshSecret = '';
  }

  private getJwtSecret(): string {
    const s = this.jwtSecret || process.env.JWT_SECRET;
    if (!s) throw new Error('CRITICAL: JWT_SECRET environment variable is not set.');
    return (this.jwtSecret = s);
  }

  private getJwtRefreshSecret(): string {
    const s = this.jwtRefreshSecret || process.env.JWT_REFRESH_SECRET;
    if (!s) throw new Error('CRITICAL: JWT_REFRESH_SECRET environment variable is not set.');
    return (this.jwtRefreshSecret = s);
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
    ];
    if (validated.tenantId) {
      whereClauses.push(eq(users.tenantId, validated.tenantId));
    }

    // Explicit column list — never fails due to optional columns (oauth_*)
    // that may be missing in older DB instances without all migrations applied.
    const [user] = await this.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        passwordHash: users.passwordHash,
        tenantId: users.tenantId,
        companyId: users.companyId,
        role: users.role,
        permissions: users.permissions,
        emailVerified: users.emailVerified,
        emailVerifiedAt: users.emailVerifiedAt,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .where(and(...whereClauses))
      .limit(1);

    if (!user) {
      // Timing attack protection: sempre executar bcrypt mesmo quando usuário não existe
      await bcrypt.compare(validated.password, DUMMY_HASH);
      observabilityService.logAudit({ tenantId: 'system', action: 'auth.login.failed', resource: 'auth', metadata: { reason: 'user_not_found', ip: credentials.ip } }).catch(() => {});
      observabilityService.incrementCounter('system', 'auth.login.failed', { reason: 'user_not_found' }).catch(() => {});
      recordLoginFailure(validated.email, 'system');
      throw new Error('Credenciais inválidas');
    }

    // Verificar senha
    const bcryptStart = Date.now();
    const isValidPassword = await bcrypt.compare(validated.password, user.passwordHash);
    observabilityService.recordHistogram(user.tenantId, 'auth.bcrypt.duration_ms', Date.now() - bcryptStart, { operation: 'compare' }).catch(() => {});
    if (!isValidPassword) {
      observabilityService.logAudit({ tenantId: user.tenantId, userId: user.id, action: 'auth.login.failed', resource: 'auth', resourceId: user.id, metadata: { reason: 'wrong_password', ip: credentials.ip } }).catch(() => {});
      observabilityService.incrementCounter(user.tenantId, 'auth.login.failed', { reason: 'wrong_password' }).catch(() => {});
      recordLoginFailure(validated.email, user.tenantId);
      throw new Error('Credenciais inválidas');
    }

    // Email deve estar verificado (bypass via env var para ambientes sem SMTP)
    const requireEmailVerification = process.env.REQUIRE_EMAIL_VERIFICATION !== 'false';
    if (requireEmailVerification && !user.emailVerified) {
      const err: any = new Error('Verifique seu email antes de fazer login. Confira sua caixa de entrada.');
      err.code = 'EMAIL_NOT_VERIFIED';
      throw err;
    }

    if (!user.isActive) {
      throw new Error('Usuário inativo');
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

    observabilityService.logAudit({ tenantId: user.tenantId, userId: user.id, action: 'auth.login.success', resource: 'auth', resourceId: user.id, metadata: { ip: credentials.ip, userAgent: credentials.userAgent } }).catch(() => {});
    observabilityService.incrementCounter(user.tenantId, 'auth.login.total', { success: 'true' }).catch(() => {});

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
  async register(data: { email: string; password: string; name: string; tenantId?: string; companyName?: string; companyId?: string }): Promise<AuthResponse> {
    // Validar input
    const validated = registerSchema.parse(data);

    // Isolamento: todo novo usuário nasce no SEU PRÓPRIO tenant, único.
    // NÃO se aceita tenantId do cliente (impediria entrar em tenant alheio sem
    // convite) e NÃO se agrupa por domínio nem por nome de empresa. companyName
    // serve apenas para nomear o workspace pessoal. Entrar em outro tenant é só
    // via convite aceito (fluxo separado).
    const tenantSlug = personalTenant(validated.email);
    const tenantDisplayName =
      validated.companyName?.trim() || validated.name?.trim() || validated.email.split('@')[0];

    // Email é único globalmente — verificar ANTES da transação para retorno rápido
    const [existingUser] = await this.db
      .select({ id: users.id, email: users.email, name: users.name, tenantId: users.tenantId, companyId: users.companyId, role: users.role, permissions: users.permissions, emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.email, validated.email))
      .limit(1);

    if (existingUser) {
      if (!existingUser.emailVerified) {
        await this.sendVerificationEmail(existingUser.id, existingUser.email, existingUser.tenantId);
        return {
          user: { id: existingUser.id, email: existingUser.email, name: existingUser.name, tenantId: existingUser.tenantId, companyId: existingUser.companyId || undefined, role: existingUser.role, permissions: existingUser.permissions || [] },
          requiresEmailVerification: true,
          existingUnverified: true,
          message: 'Se este email estiver disponível, você receberá um link de verificação.',
        } as any;
      }
      throw new Error('Email já cadastrado');
    }

    // Hash antes da transação (bcrypt é lento; não bloqueia a TX desnecessariamente)
    const passwordHash = await bcrypt.hash(validated.password, BCRYPT_ROUNDS);

    // Transação atômica: tenant + user + membership (ou tudo, ou nada)
    const newUser = await this.db.transaction(async (tx) => {
      let [tenant] = await tx
        .select()
        .from(tenants)
        .where(eq(tenants.tenantId, tenantSlug))
        .limit(1);

      if (!tenant) {
        [tenant] = await tx
          .insert(tenants)
          .values({ tenantId: tenantSlug, name: tenantDisplayName, isActive: true })
          .returning();
      }

      if (!tenant.isActive) throw new Error('Tenant inativo');

      const requireEmailVerification = process.env.REQUIRE_EMAIL_VERIFICATION !== 'false';

      const [user] = await tx
        .insert(users)
        .values({
          email: validated.email,
          name: validated.name,
          passwordHash,
          tenantId: tenantSlug,
          companyId: validated.companyId || null,
          role: 'user',
          permissions: [],
          emailVerified: !requireEmailVerification,
          isActive: !requireEmailVerification,
        })
        .returning();

      await tx.insert(memberships)
        .values({ userId: user.id, tenantId: tenantSlug, role: 'owner', status: 'active' })
        .onConflictDoNothing();

      return user;
    });

    await BillingService.initializeTenantFreeTier(tenantSlug);

    observabilityService.logAudit({ tenantId: tenantSlug, userId: newUser.id, action: 'auth.register', resource: 'user', resourceId: newUser.id, metadata: { email: newUser.email } }).catch(() => {});
    observabilityService.incrementCounter(tenantSlug, 'auth.register.total', { success: 'true' }).catch(() => {});

    // Verificação obrigatória: sempre envia o código. Boas-vindas só após verificar.
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
    // Código de 6 dígitos é o próprio token (verify-email compara igualdade).
    const verificationToken = generateVerificationCode();
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

    observabilityService.logAudit({ tenantId: tokenRecord.tenantId, userId: tokenRecord.userId, action: 'auth.email_verified', resource: 'user', resourceId: tokenRecord.userId }).catch(() => {});

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
      const payload = jwt.verify(refreshToken, this.getJwtRefreshSecret()) as JWTPayload;

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
        if (session.revokeReason === 'rotation') {
          // Token rotacionado sendo reutilizado — sinal de roubo de token.
          // Nuke nuclear: invalidar todas as sessões do usuário.
          await this.db
            .update(userSessions)
            .set({ isRevoked: true, revokedAt: now, isActive: false, revokeReason: 'reuse-nuke' })
            .where(eq(userSessions.userId, session.userId));
          throw new Error('TOKEN_REUSE_DETECTED');
        }
        // Logout normal — apenas rejeitar.
        throw new Error('TOKEN_REVOKED');
      }

      if (session.expiresAt < now) {
        throw new Error('TOKEN_EXPIRED');
      }

      // Buscar usuário
      const [user] = await this.db
        .select({ id: users.id, email: users.email, name: users.name, tenantId: users.tenantId, companyId: users.companyId, role: users.role, permissions: users.permissions, isActive: users.isActive })
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);

      if (!user || !user.isActive) {
        throw new Error('Usuário inativo');
      }

      // Revogar sessão atual (rotação) — marcada para detectar reuse futuro
      await this.db
        .update(userSessions)
        .set({ isRevoked: true, revokedAt: now, isActive: false, revokeReason: 'rotation' })
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

      observabilityService.logAudit({ tenantId: user.tenantId, userId: user.id, action: 'auth.token.refresh', resource: 'auth', resourceId: user.id, metadata: { ip } }).catch(() => {});
      observabilityService.incrementCounter(user.tenantId, 'auth.token.refresh.total', { success: 'true' }).catch(() => {});

      return { token: newToken, refreshToken: newRefreshToken };
    } catch (error: any) {
      const passthrough = ['TOKEN_REUSE_DETECTED', 'TOKEN_REVOKED', 'TOKEN_EXPIRED'];
      if (passthrough.includes(error.message)) {
        observabilityService.incrementCounter('system', 'auth.token.refresh.failed', { reason: error.message }).catch(() => {});
        throw error;
      }
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
    const [session] = await this.db
      .update(userSessions)
      .set({ isRevoked: true, revokedAt: now, isActive: false, revokeReason: 'logout' })
      .where(eq(userSessions.refreshToken, refreshToken))
      .returning({ userId: userSessions.userId, tenantId: userSessions.tenantId });

    if (session) {
      observabilityService.logAudit({ tenantId: session.tenantId, userId: session.userId, action: 'auth.logout', resource: 'auth', resourceId: session.userId }).catch(() => {});
      observabilityService.incrementCounter(session.tenantId, 'auth.logout.total').catch(() => {});
    }
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

    const [revoked] = await this.db
      .update(userSessions)
      .set({ isRevoked: true, revokedAt: new Date(), isActive: false })
      .where(eq(userSessions.id, sessionId))
      .returning({ tenantId: userSessions.tenantId });

    if (revoked) {
      observabilityService.logAudit({ tenantId: revoked.tenantId, userId: requestingUserId, action: 'auth.session.revoked', resource: 'session', resourceId: sessionId }).catch(() => {});
    }
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
      return jwt.verify(token, this.getJwtSecret()) as JWTPayload;
    } catch (error) {
      throw new Error('Token inválido');
    }
  }

  /**
   * Emite um access token para um tenant específico (troca de workspace).
   * Público: usado pelo módulo de workspaces após validar a membership.
   */
  issueAccessToken(payload: JWTPayload): string {
    return this.generateAccessToken(payload);
  }

  /**
   * Gerar access token
   */
  private generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload, this.getJwtSecret(), { expiresIn: this.accessTokenExpiry } as jwt.SignOptions);
  }

  /**
   * Gerar refresh token
   */
  private generateRefreshToken(payload: Pick<JWTPayload, 'userId' | 'email' | 'tenantId'>): string {
    return jwt.sign(
      { ...payload, jti: randomBytes(16).toString('hex') },
      this.getJwtRefreshSecret(),
      { expiresIn: this.refreshTokenExpiry } as jwt.SignOptions,
    );
  }

  /**
   * Solicitar reset de senha (forgot password)
   */
  async forgotPassword(rawEmail: string): Promise<void> {
    const email = rawEmail.trim().toLowerCase();
    const [user] = await this.db.select({ id: users.id, email: users.email, name: users.name, tenantId: users.tenantId, isActive: users.isActive }).from(users).where(eq(users.email, email)).limit(1);
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
    observabilityService.logAudit({ tenantId: user.tenantId, userId: user.id, action: 'auth.password_reset.requested', resource: 'auth', resourceId: user.id }).catch(() => {});
    observabilityService.incrementCounter(user.tenantId, 'auth.password_reset.total', { step: 'requested' }).catch(() => {});
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

    strongPassword.parse(newPassword);
    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.checkAndSavePasswordHistory(tokenRecord.userId, tokenRecord.tenantId, newPassword, newHash);
    await this.db.update(users).set({ passwordHash: newHash }).where(eq(users.id, tokenRecord.userId));
    await this.db.update(authTokens).set({ isUsed: true, usedAt: new Date() }).where(eq(authTokens.id, tokenRecord.id));
    observabilityService.logAudit({ tenantId: tokenRecord.tenantId, userId: tokenRecord.userId, action: 'auth.password_reset.completed', resource: 'auth', resourceId: tokenRecord.userId }).catch(() => {});
    observabilityService.incrementCounter(tokenRecord.tenantId, 'auth.password_reset.total', { step: 'completed' }).catch(() => {});
  }

  /**
   * Buscar usuário por ID
   */
  async getUserById(userId: string) {
    const [user] = await this.db
      .select({ id: users.id, email: users.email, name: users.name, tenantId: users.tenantId, companyId: users.companyId, role: users.role, permissions: users.permissions, emailVerified: users.emailVerified, isActive: users.isActive })
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
   * B3 — Verifica que a nova senha não repete nenhuma das últimas N.
   * Se passar, persiste o novo hash no histórico e descarta os excedentes.
   */
  private async checkAndSavePasswordHistory(userId: string, tenantId: string, newPasswordPlain: string, newHash: string): Promise<void> {
    const history = await this.db
      .select({ id: passwordHistory.id, hash: passwordHistory.hash })
      .from(passwordHistory)
      .where(eq(passwordHistory.userId, userId))
      .orderBy(desc(passwordHistory.createdAt))
      .limit(PASSWORD_HISTORY_DEPTH);

    for (const entry of history) {
      const reused = await bcrypt.compare(newPasswordPlain, entry.hash);
      if (reused) throw new Error(`Esta senha já foi usada recentemente. Escolha uma diferente.`);
    }

    // Salvar novo hash
    await this.db.insert(passwordHistory).values({ userId, tenantId, hash: newHash });

    // Apagar registros excedentes (manter apenas os últimos N)
    const all = await this.db
      .select({ id: passwordHistory.id })
      .from(passwordHistory)
      .where(eq(passwordHistory.userId, userId))
      .orderBy(desc(passwordHistory.createdAt));

    const toDelete = all.slice(PASSWORD_HISTORY_DEPTH).map(r => r.id);
    for (const id of toDelete) {
      await this.db.delete(passwordHistory).where(eq(passwordHistory.id, id));
    }
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
