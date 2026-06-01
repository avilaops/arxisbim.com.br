import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, isNull } from 'drizzle-orm';
import { users, tenants } from '../../shared/database/schema/tenants.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

interface JWTPayload {
  userId: string;
  email: string;
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
  tenantId: z.string().min(1, 'Tenant ID é obrigatório'),
});

const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  tenantId: z.string().min(1, 'Tenant ID é obrigatório'),
  companyId: z.string().optional(),
});

export class AuthService {
  private db;
  private jwtSecret: string;
  private jwtRefreshSecret: string;
  private accessTokenExpiry = '15m';
  private refreshTokenExpiry = '7d';

  constructor() {
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/arxisvr';
    const client = postgres(connectionString);
    this.db = drizzle(client, { schema: { users, tenants } });
    
    this.jwtSecret = process.env.JWT_SECRET || 'arxis-super-secret-2026';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'arxis-refresh-secret-2026';
  }

  /**
   * Login com email e senha
   */
  async login(credentials: { email: string; password: string; tenantId: string }): Promise<AuthResponse> {
    // Validar input
    const validated = loginSchema.parse(credentials);

    // Buscar usuário pelo email e tenant
    const [user] = await this.db
      .select()
      .from(users)
      .where(
        and(
          eq(users.email, validated.email),
          eq(users.tenantId, validated.tenantId),
          eq(users.isActive, true)
        )
      )
      .limit(1);

    if (!user) {
      throw new Error('Credenciais inválidas');
    }

    // Verificar senha
    const isValidPassword = await bcrypt.compare(validated.password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Credenciais inválidas');
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
  async register(data: { email: string; password: string; name: string; tenantId: string; companyId?: string }): Promise<AuthResponse> {
    // Validar input
    const validated = registerSchema.parse(data);

    // Verificar se o tenant existe; se não, criar automaticamente (self-service signup)
    let [tenant] = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.tenantId, validated.tenantId))
      .limit(1);

    if (!tenant) {
      [tenant] = await this.db
        .insert(tenants)
        .values({
          tenantId: validated.tenantId,
          name: validated.tenantId,
          isActive: true,
        })
        .returning();
    }

    if (!tenant.isActive) {
      throw new Error('Tenant inativo');
    }

    // Verificar se o email já existe no tenant
    const [existingUser] = await this.db
      .select()
      .from(users)
      .where(
        and(
          eq(users.email, validated.email),
          eq(users.tenantId, validated.tenantId)
        )
      )
      .limit(1);

    if (existingUser) {
      throw new Error('Email já cadastrado neste tenant');
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash(validated.password, 10);

    // Criar usuário
    const [newUser] = await this.db
      .insert(users)
      .values({
        email: validated.email,
        name: validated.name,
        passwordHash,
        tenantId: validated.tenantId,
        companyId: validated.companyId || null,
        role: 'user',
        permissions: [],
        emailVerified: false,
        isActive: true,
      })
      .returning();

    // Gerar tokens
    const token = this.generateAccessToken({
      userId: newUser.id,
      email: newUser.email,
      tenantId: newUser.tenantId,
      companyId: newUser.companyId || undefined,
      role: newUser.role,
      permissions: newUser.permissions || [],
    });

    const refreshToken = this.generateRefreshToken({
      userId: newUser.id,
      email: newUser.email,
      tenantId: newUser.tenantId,
    });

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
      token,
      refreshToken,
    };
  }

  /**
   * Refresh token
   */
  async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    try {
      const payload = jwt.verify(refreshToken, this.jwtRefreshSecret) as JWTPayload;

      // Buscar usuário
      const [user] = await this.db
        .select()
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);

      if (!user || !user.isActive) {
        throw new Error('Usuário inativo');
      }

      // Gerar novos tokens
      const newToken = this.generateAccessToken({
        userId: user.id,
        email: user.email,
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

      return {
        token: newToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new Error('Token de refresh inválido');
    }
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
    return jwt.sign(payload, this.jwtRefreshSecret as string, { expiresIn: this.refreshTokenExpiry } as jwt.SignOptions);
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
}
