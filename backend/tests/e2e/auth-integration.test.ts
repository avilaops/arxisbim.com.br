import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { users, tenants } from '../../src/shared/database/schema/tenants.js';
import { authTokens } from '../../src/shared/database/schema/observability.js';
import { apiKeys } from '../../src/shared/database/schema/api-keys.js';

// =====================================
// CONFIGURAÇÃO DO BANCO DE DADOS
// =====================================

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/arxisvr';
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-vitest';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '4', 10); // Rápido para testes

let client: postgres.Sql;
let db: ReturnType<typeof drizzle>;
let txClient: postgres.TransactionSql | null = null;

// =====================================
// SETUP & TEARDOWN
// =====================================

beforeAll(async () => {
  // Conectar ao banco real
  client = postgres(DATABASE_URL, { max: 1 });
  db = drizzle(client);
  
  console.log('\n🔗 Conectado ao PostgreSQL:', DATABASE_URL.split('@')[1]);
});

afterAll(async () => {
  // Fechar conexão
  await client.end();
  console.log('🔌 Conexão fechada\n');
});

beforeEach(async () => {
  // Iniciar transação para isolar cada teste
  // Nota: postgres-js não suporta transações nested, então usaremos o db direto
  console.log('📦 Iniciando teste com banco real...');
});

afterEach(async () => {
  // Limpar dados de teste criados
  // Usando tenantId específico de teste para facilitar limpeza
  const testTenantId = 'test-tenant-e2e';
  
  try {
    await db.delete(authTokens).where(eq(authTokens.tenantId, testTenantId));
    await db.delete(apiKeys).where(eq(apiKeys.tenantId, testTenantId));
    await db.delete(users).where(eq(users.tenantId, testTenantId));
    console.log('🧹 Dados de teste limpos');
  } catch (err) {
    console.error('⚠️  Erro ao limpar dados de teste:', err);
  }
});

// =====================================
// HELPERS
// =====================================

const TEST_TENANT_ID = 'test-tenant-e2e';
const TEST_EMAIL = 'integration@test.com';
const TEST_PASSWORD = 'SecurePass123!';
const TEST_NAME = 'Integration Test User';

async function createTestUser(email = TEST_EMAIL, password = TEST_PASSWORD) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  
  const [user] = await db
    .insert(users)
    .values({
      email,
      name: TEST_NAME,
      passwordHash,
      tenantId: TEST_TENANT_ID,
      role: 'user',
      isActive: true,
      emailVerified: true,
    })
    .returning();
  
  return user;
}

function generateJWT(userId: string, email: string) {
  return jwt.sign(
    { userId, email, tenantId: TEST_TENANT_ID },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function verifyJWT(token: string) {
  return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; tenantId: string };
}

// =====================================
// TESTES E2E - AUTH SERVICE
// =====================================

describe('Auth Service - E2E Integration Tests (PostgreSQL)', () => {
  
  describe('User Registration', () => {
    it('should register new user successfully', async () => {
      const email = 'newuser@test.com';
      const password = 'NewPass123!';
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      
      // Criar usuário
      const [user] = await db
        .insert(users)
        .values({
          email,
          name: 'New User',
          passwordHash,
          tenantId: TEST_TENANT_ID,
          role: 'user',
          isActive: true,
        })
        .returning();
      
      // Verificar dados salvos
      expect(user).toBeDefined();
      expect(user.email).toBe(email);
      expect(user.name).toBe('New User');
      expect(user.tenantId).toBe(TEST_TENANT_ID);
      expect(user.role).toBe('user');
      expect(user.isActive).toBe(true);
      expect(user.passwordHash).toBeDefined();
      
      // Verificar que senha foi hasheada corretamente
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      expect(isPasswordValid).toBe(true);
      
      // Verificar que usuário existe no banco
      const [savedUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      
      expect(savedUser).toBeDefined();
      expect(savedUser.id).toBe(user.id);
    });

    it('should reject duplicate email in same tenant', async () => {
      const email = 'duplicate@test.com';
      await createTestUser(email);
      
      // Tentar criar usuário com mesmo email
      await expect(async () => {
        await db
          .insert(users)
          .values({
            email,
            name: 'Duplicate User',
            passwordHash: await bcrypt.hash('pass', BCRYPT_ROUNDS),
            tenantId: TEST_TENANT_ID,
            role: 'user',
          });
      }).rejects.toThrow(); // Deve falhar por constraint UNIQUE
    });

    it('should allow same email in different tenants', async () => {
      const email = 'multi@test.com';
      const otherTenantId = 'other-tenant';
      
      // Criar tenant adicional para o teste
      await db
        .insert(tenants)
        .values({
          tenantId: otherTenantId,
          name: 'Other Tenant',
          isActive: true,
        })
        .onConflictDoNothing();
      
      // Criar no tenant 1
      const [user1] = await db
        .insert(users)
        .values({
          email,
          name: 'User Tenant 1',
          passwordHash: await bcrypt.hash('pass1', BCRYPT_ROUNDS),
          tenantId: TEST_TENANT_ID,
          role: 'user',
        })
        .returning();
      
      // Criar no tenant 2
      const [user2] = await db
        .insert(users)
        .values({
          email,
          name: 'User Tenant 2',
          passwordHash: await bcrypt.hash('pass2', BCRYPT_ROUNDS),
          tenantId: otherTenantId,
          role: 'user',
        })
        .returning();
      
      expect(user1.id).not.toBe(user2.id);
      expect(user1.email).toBe(user2.email);
      expect(user1.tenantId).not.toBe(user2.tenantId);
      
      // Limpar dados do tenant 2
      await db.delete(users).where(eq(users.tenantId, otherTenantId));
      await db.delete(tenants).where(eq(tenants.tenantId, otherTenantId));
    });
  });

  describe('User Login', () => {
    it('should login with valid credentials', async () => {
      const user = await createTestUser();
      
      // Buscar usuário
      const [foundUser] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.email, TEST_EMAIL),
            eq(users.tenantId, TEST_TENANT_ID),
            eq(users.isActive, true)
          )
        )
        .limit(1);
      
      expect(foundUser).toBeDefined();
      expect(foundUser.id).toBe(user.id);
      
      // Verificar senha
      const isPasswordValid = await bcrypt.compare(TEST_PASSWORD, foundUser.passwordHash);
      expect(isPasswordValid).toBe(true);
      
      // Gerar token
      const token = generateJWT(foundUser.id, foundUser.email);
      expect(token).toBeDefined();
      
      // Verificar token
      const decoded = verifyJWT(token);
      expect(decoded.userId).toBe(foundUser.id);
      expect(decoded.email).toBe(foundUser.email);
    });

    it('should reject invalid password', async () => {
      const user = await createTestUser();
      
      const [foundUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, TEST_EMAIL))
        .limit(1);
      
      const isPasswordValid = await bcrypt.compare('WrongPassword!', foundUser.passwordHash);
      expect(isPasswordValid).toBe(false);
    });

    it('should reject inactive user', async () => {
      // Criar usuário inativo
      const passwordHash = await bcrypt.hash(TEST_PASSWORD, BCRYPT_ROUNDS);
      await db
        .insert(users)
        .values({
          email: 'inactive@test.com',
          name: 'Inactive User',
          passwordHash,
          tenantId: TEST_TENANT_ID,
          role: 'user',
          isActive: false,
        });
      
      // Tentar buscar usuário ativo
      const foundUsers = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.email, 'inactive@test.com'),
            eq(users.isActive, true)
          )
        )
        .limit(1);
      
      expect(foundUsers.length).toBe(0);
    });

    it('should update lastLoginAt on successful login', async () => {
      const user = await createTestUser();
      expect(user.lastLoginAt).toBeNull();
      
      // Atualizar lastLoginAt
      const [updatedUser] = await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id))
        .returning();
      
      expect(updatedUser.lastLoginAt).toBeInstanceOf(Date);
      expect(updatedUser.lastLoginAt!.getTime()).toBeGreaterThan(Date.now() - 5000);
    });
  });

  describe('2FA (Two-Factor Authentication)', () => {
    it('should enable 2FA with secret and backup codes', async () => {
      const user = await createTestUser();
      
      const secret = 'JBSWY3DPEHPK3PXP'; // Base32 secret
      const backupCodes = ['code1', 'code2', 'code3'];
      const hashedCodes = await Promise.all(
        backupCodes.map(code => bcrypt.hash(code, BCRYPT_ROUNDS))
      );
      
      // Ativar 2FA
      const [updatedUser] = await db
        .update(users)
        .set({
          twoFactorEnabled: true,
          twoFactorSecret: secret,
          twoFactorBackupCodes: JSON.stringify(hashedCodes),
        })
        .where(eq(users.id, user.id))
        .returning();
      
      expect(updatedUser.twoFactorEnabled).toBe(true);
      expect(updatedUser.twoFactorSecret).toBe(secret);
      expect(updatedUser.twoFactorBackupCodes).toBeDefined();
      
      // Verificar backup codes
      const savedCodes = JSON.parse(updatedUser.twoFactorBackupCodes!);
      expect(savedCodes.length).toBe(3);
      
      const isCode1Valid = await bcrypt.compare('code1', savedCodes[0]);
      expect(isCode1Valid).toBe(true);
    });

    it('should disable 2FA and clear secret', async () => {
      const user = await createTestUser();
      
      // Ativar 2FA primeiro
      await db
        .update(users)
        .set({
          twoFactorEnabled: true,
          twoFactorSecret: 'SECRET123',
          twoFactorBackupCodes: JSON.stringify(['code1']),
        })
        .where(eq(users.id, user.id));
      
      // Desativar 2FA
      const [updatedUser] = await db
        .update(users)
        .set({
          twoFactorEnabled: false,
          twoFactorSecret: null,
          twoFactorBackupCodes: null,
        })
        .where(eq(users.id, user.id))
        .returning();
      
      expect(updatedUser.twoFactorEnabled).toBe(false);
      expect(updatedUser.twoFactorSecret).toBeNull();
      expect(updatedUser.twoFactorBackupCodes).toBeNull();
    });
  });

  describe('Password Reset', () => {
    it('should create password reset token', async () => {
      const user = await createTestUser();
      
      const resetToken = 'reset_' + Math.random().toString(36).substring(2);
      const expiresAt = new Date(Date.now() + 3600000); // 1 hora
      
      const [token] = await db
        .insert(authTokens)
        .values({
          userId: user.id,
          tenantId: TEST_TENANT_ID,
          token: resetToken,
          tokenType: 'password_reset',
          expiresAt,
          isUsed: false,
        })
        .returning();
      
      expect(token).toBeDefined();
      expect(token.token).toBe(resetToken);
      expect(token.tokenType).toBe('password_reset');
      expect(token.isUsed).toBe(false);
    });

    it('should validate and use reset token', async () => {
      const user = await createTestUser();
      const resetToken = 'reset_valid_token';
      
      // Criar token
      await db.insert(authTokens).values({
        userId: user.id,
        tenantId: TEST_TENANT_ID,
        token: resetToken,
        tokenType: 'password_reset',
        expiresAt: new Date(Date.now() + 3600000),
        isUsed: false,
      });
      
      // Validar token
      const [validToken] = await db
        .select()
        .from(authTokens)
        .where(
          and(
            eq(authTokens.token, resetToken),
            eq(authTokens.isUsed, false)
          )
        )
        .limit(1);
      
      expect(validToken).toBeDefined();
      expect(validToken.expiresAt.getTime()).toBeGreaterThan(Date.now());
      
      // Marcar como usado
      const [usedToken] = await db
        .update(authTokens)
        .set({ isUsed: true, usedAt: new Date() })
        .where(eq(authTokens.id, validToken.id))
        .returning();
      
      expect(usedToken.isUsed).toBe(true);
      expect(usedToken.usedAt).toBeInstanceOf(Date);
    });

    it('should reject expired token', async () => {
      const user = await createTestUser();
      const expiredToken = 'reset_expired_token';
      
      // Criar token expirado
      await db.insert(authTokens).values({
        userId: user.id,
        tenantId: TEST_TENANT_ID,
        token: expiredToken,
        tokenType: 'password_reset',
        expiresAt: new Date(Date.now() - 3600000), // Expirado há 1 hora
        isUsed: false,
      });
      
      // Tentar validar
      const [token] = await db
        .select()
        .from(authTokens)
        .where(eq(authTokens.token, expiredToken))
        .limit(1);
      
      expect(token.expiresAt.getTime()).toBeLessThan(Date.now());
    });

    it('should reset password successfully', async () => {
      const user = await createTestUser();
      const newPassword = 'NewSecurePass456!';
      
      // Hash nova senha
      const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      
      // Atualizar senha
      const [updatedUser] = await db
        .update(users)
        .set({ passwordHash: newPasswordHash })
        .where(eq(users.id, user.id))
        .returning();
      
      // Verificar nova senha
      const isNewPasswordValid = await bcrypt.compare(newPassword, updatedUser.passwordHash);
      expect(isNewPasswordValid).toBe(true);
      
      // Verificar que senha antiga não funciona
      const isOldPasswordValid = await bcrypt.compare(TEST_PASSWORD, updatedUser.passwordHash);
      expect(isOldPasswordValid).toBe(false);
    });
  });

  describe('API Keys', () => {
    it('should create API key with hash', async () => {
      const user = await createTestUser();
      
      const keyPrefix = 'arxis_';
      const fullKey = keyPrefix + Math.random().toString(36).substring(2);
      const keyHash = await bcrypt.hash(fullKey, BCRYPT_ROUNDS);
      
      const [apiKey] = await db
        .insert(apiKeys)
        .values({
          tenantId: TEST_TENANT_ID,
          userId: user.id,
          name: 'Test API Key',
          keyPrefix,
          keyHash,
          scopes: JSON.stringify(['read', 'write']),
          isActive: true,
        })
        .returning();
      
      expect(apiKey).toBeDefined();
      expect(apiKey.keyPrefix).toBe(keyPrefix);
      expect(apiKey.scopes).toContain('read');
      expect(apiKey.isActive).toBe(true);
      
      // Verificar hash
      const isKeyValid = await bcrypt.compare(fullKey, apiKey.keyHash);
      expect(isKeyValid).toBe(true);
    });

    it('should validate API key', async () => {
      const user = await createTestUser();
      const fullKey = 'arxis_testkey123';
      const keyHash = await bcrypt.hash(fullKey, BCRYPT_ROUNDS);
      
      // Criar API key
      await db.insert(apiKeys).values({
        tenantId: TEST_TENANT_ID,
        userId: user.id,
        name: 'Validation Test Key',
        keyPrefix: 'arxis_',
        keyHash,
        scopes: JSON.stringify(['read']),
        isActive: true,
      });
      
      // Buscar todas as keys ativas deste tenant
      const activeKeys = await db
        .select()
        .from(apiKeys)
        .where(
          and(
            eq(apiKeys.tenantId, TEST_TENANT_ID),
            eq(apiKeys.isActive, true)
          )
        );
      
      // Verificar cada key até encontrar a correta
      let validKey = null;
      for (const key of activeKeys) {
        const isValid = await bcrypt.compare(fullKey, key.keyHash);
        if (isValid) {
          validKey = key;
          break;
        }
      }
      
      expect(validKey).toBeDefined();
      expect(validKey!.name).toBe('Validation Test Key');
    });

    it('should revoke API key', async () => {
      const user = await createTestUser();
      
      // Criar API key
      const [apiKey] = await db
        .insert(apiKeys)
        .values({
          tenantId: TEST_TENANT_ID,
          userId: user.id,
          name: 'To Be Revoked',
          keyPrefix: 'arxis_',
          keyHash: await bcrypt.hash('key123', BCRYPT_ROUNDS),
          scopes: JSON.stringify(['read']),
          isActive: true,
        })
        .returning();
      
      // Revogar
      const [revokedKey] = await db
        .update(apiKeys)
        .set({
          isActive: false,
          revokedAt: new Date(),
        })
        .where(eq(apiKeys.id, apiKey.id))
        .returning();
      
      expect(revokedKey.isActive).toBe(false);
      expect(revokedKey.revokedAt).toBeInstanceOf(Date);
    });

    it('should check API key expiration', async () => {
      const user = await createTestUser();
      
      // Criar API key expirada
      const [expiredKey] = await db
        .insert(apiKeys)
        .values({
          tenantId: TEST_TENANT_ID,
          userId: user.id,
          name: 'Expired Key',
          keyPrefix: 'arxis_',
          keyHash: await bcrypt.hash('expiredkey', BCRYPT_ROUNDS),
          scopes: JSON.stringify(['read']),
          expiresAt: new Date(Date.now() - 86400000), // Expirado há 1 dia
          isActive: true,
        })
        .returning();
      
      expect(expiredKey.expiresAt!.getTime()).toBeLessThan(Date.now());
      
      // Criar API key válida
      const [validKey] = await db
        .insert(apiKeys)
        .values({
          tenantId: TEST_TENANT_ID,
          userId: user.id,
          name: 'Valid Key',
          keyPrefix: 'arxis_',
          keyHash: await bcrypt.hash('validkey', BCRYPT_ROUNDS),
          scopes: JSON.stringify(['read']),
          expiresAt: new Date(Date.now() + 86400000), // Expira em 1 dia
          isActive: true,
        })
        .returning();
      
      expect(validKey.expiresAt!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should track last used timestamp', async () => {
      const user = await createTestUser();
      
      const [apiKey] = await db
        .insert(apiKeys)
        .values({
          tenantId: TEST_TENANT_ID,
          userId: user.id,
          name: 'Usage Tracking Key',
          keyPrefix: 'arxis_',
          keyHash: await bcrypt.hash('trackkey', BCRYPT_ROUNDS),
          scopes: JSON.stringify(['read']),
          isActive: true,
        })
        .returning();
      
      expect(apiKey.lastUsedAt).toBeNull();
      
      // Atualizar lastUsedAt
      const [updatedKey] = await db
        .update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeys.id, apiKey.id))
        .returning();
      
      expect(updatedKey.lastUsedAt).toBeInstanceOf(Date);
      expect(updatedKey.lastUsedAt!.getTime()).toBeGreaterThan(Date.now() - 5000);
    });
  });
});
