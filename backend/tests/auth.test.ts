import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../src/routes/v1/auth/auth.service';
import { createMockDb, createWhereChain, createSetChain } from './helpers/mock-db';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock dependencies
vi.mock('../src/core/observability/service', () => ({
  observabilityService: {
    logAudit: vi.fn().mockResolvedValue(undefined),
    incrementCounter: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../src/core/email/email.service', () => ({
  emailService: {
    sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('AuthService - Unit Tests', () => {
  let authService: AuthService;
  let mockDb: ReturnType<typeof createMockDb>;
  const TEST_TENANT_ID = 'test-tenant';
  const TEST_USER_ID = '123e4567-e89b-12d3-a456-426614174000';
  const TEST_EMAIL = 'test@example.com';
  const TEST_PASSWORD = 'Test123!@#';
  const TEST_NAME = 'Test User';

  beforeEach(() => {
    authService = new AuthService();
    mockDb = createMockDb();
    // @ts-ignore
    authService.db = mockDb;
  });

  describe('Register', () => {
    it('should register new user successfully', async () => {
      // Mock: User doesn't exist
      mockDb.where.mockReturnValueOnce(createWhereChain([]));

      // Mock: User creation returns new user
      const mockUser = {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        name: TEST_NAME,
        role: 'user',
        tenantId: TEST_TENANT_ID,
        companyId: null,
        passwordHash: await bcrypt.hash(TEST_PASSWORD, 10),
        isActive: true,
        permissions: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDb.returning.mockResolvedValueOnce([mockUser]);

      // Mock session creation
      vi.spyOn(authService as any, 'createSession').mockResolvedValueOnce({
        token: 'mock-refresh-token',
        sessionId: 'mock-session-id',
      });

      const result = await authService.register({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        name: TEST_NAME,
        tenantId: TEST_TENANT_ID,
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('sessionId');
      expect(result.user.email).toBe(TEST_EMAIL);
      expect(result.user.name).toBe(TEST_NAME);
      expect(result.user.role).toBe('user');
    });

    it('should fail if user already exists in tenant', async () => {
      // Mock: User already exists
      const existingUser = {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        tenantId: TEST_TENANT_ID,
      };
      mockDb.where.mockReturnValueOnce(createWhereChain([existingUser]));

      await expect(authService.register({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        name: TEST_NAME,
        tenantId: TEST_TENANT_ID,
      })).rejects.toThrow('Já existe uma conta com este email');
    });

    it('should create user with correct tenant isolation', async () => {
      mockDb.where.mockReturnValueOnce(createWhereChain([]));
      
      const mockUser = {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        name: TEST_NAME,
        role: 'user',
        tenantId: TEST_TENANT_ID,
        companyId: null,
        passwordHash: 'hashed',
        isActive: true,
        permissions: {},
      };
      mockDb.returning.mockResolvedValueOnce([mockUser]);
      
      vi.spyOn(authService as any, 'createSession').mockResolvedValueOnce({
        token: 'mock-refresh-token',
        sessionId: 'mock-session-id',
      });

      const result = await authService.register({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        name: TEST_NAME,
        tenantId: TEST_TENANT_ID,
      });

      expect(result.user.tenantId).toBe(TEST_TENANT_ID);
    });

    it('should set default role as user', async () => {
      mockDb.where.mockReturnValueOnce(createWhereChain([]));
      
      const mockUser = {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        name: TEST_NAME,
        role: 'user',
        tenantId: TEST_TENANT_ID,
        companyId: null,
        passwordHash: 'hashed',
        isActive: true,
        permissions: {},
      };
      mockDb.returning.mockResolvedValueOnce([mockUser]);
      
      vi.spyOn(authService as any, 'createSession').mockResolvedValueOnce({
        token: 'mock-refresh-token',
        sessionId: 'mock-session-id',
      });

      const result = await authService.register({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        name: TEST_NAME,
        tenantId: TEST_TENANT_ID,
      });

      expect(result.user.role).toBe('user');
    });
  });

  // =====================================
  // LOGIN TESTS
  // =====================================

  describe('Login', () => {
    it('should login with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);
      const mockUser = {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        name: TEST_NAME,
        role: 'user',
        tenantId: TEST_TENANT_ID,
        companyId: null,
        passwordHash: hashedPassword,
        isActive: true,
        permissions: {},
      };

      // Mock: User found with where().limit() chain
      mockDb.where.mockReturnValueOnce(createWhereChain([mockUser]));
      
      // Mock: Update last login with set().where() chain
      mockDb.set.mockReturnValueOnce(createSetChain());

      // Mock session creation
      vi.spyOn(authService as any, 'createSession').mockResolvedValueOnce({
        token: 'mock-refresh-token',
        sessionId: 'mock-session-id',
      });

      const result = await authService.login(
        { email: TEST_EMAIL, password: TEST_PASSWORD },
        TEST_TENANT_ID
      );

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('sessionId');
      expect(result.user.email).toBe(TEST_EMAIL);
    });

    it('should fail with invalid email', async () => {
      // Mock: User not found
      mockDb.where.mockReturnValueOnce(createWhereChain([]));

      await expect(
        authService.login({ email: TEST_EMAIL, password: TEST_PASSWORD }, TEST_TENANT_ID)
      ).rejects.toThrow('Invalid credentials');
    });

    it('should fail with invalid password', async () => {
      const hashedPassword = await bcrypt.hash('DifferentPassword', 10);
      const mockUser = {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        passwordHash: hashedPassword,
        isActive: true,
        tenantId: TEST_TENANT_ID,
      };

      mockDb.where.mockReturnValueOnce(createWhereChain([mockUser]));

      await expect(
        authService.login({ email: TEST_EMAIL, password: TEST_PASSWORD }, TEST_TENANT_ID)
      ).rejects.toThrow('Invalid credentials');
    });

    it('should fail if user is inactive', async () => {
      const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);
      const mockUser = {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        passwordHash: hashedPassword,
        isActive: false,
        tenantId: TEST_TENANT_ID,
      };

      // User won't be found due to isActive filter
      mockDb.where.mockReturnValueOnce(createWhereChain([]));

      await expect(
        authService.login({ email: TEST_EMAIL, password: TEST_PASSWORD }, TEST_TENANT_ID)
      ).rejects.toThrow('Invalid credentials');
    });

    it('should enforce tenant isolation', async () => {
      const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);
      const mockUser = {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        passwordHash: hashedPassword,
        isActive: true,
        tenantId: 'different-tenant',
      };

      // User won't be found in this tenant
      mockDb.where.mockReturnValueOnce(createWhereChain([]));

      await expect(
        authService.login({ email: TEST_EMAIL, password: TEST_PASSWORD }, TEST_TENANT_ID)
      ).rejects.toThrow('Invalid credentials');
    });

    it('should update lastLoginAt on successful login', async () => {
      const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);
      const mockUser = {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        name: TEST_NAME,
        role: 'user',
        tenantId: TEST_TENANT_ID,
        companyId: null,
        passwordHash: hashedPassword,
        isActive: true,
        permissions: {},
      };

      mockDb.where.mockReturnValueOnce(createWhereChain([mockUser]));
      mockDb.set.mockReturnValueOnce(createSetChain());

      vi.spyOn(authService as any, 'createSession').mockResolvedValueOnce({
        token: 'mock-refresh-token',
        sessionId: 'mock-session-id',
      });

      await authService.login({ email: TEST_EMAIL, password: TEST_PASSWORD }, TEST_TENANT_ID);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          lastLoginAt: expect.any(Date),
        })
      );
    });
  });

  // =====================================
  // REFRESH TOKEN TESTS
  // =====================================

  describe('Refresh Token', () => {
    it('should generate new tokens with valid refresh token', async () => {
      const refreshToken = jwt.sign(
        { userId: TEST_USER_ID, tenantId: TEST_TENANT_ID },
        process.env.JWT_SECRET || 'test-secret'
      );

      const mockUser = {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        name: TEST_NAME,
        role: 'user',
        tenantId: TEST_TENANT_ID,
        companyId: null,
        permissions: {},
      };

      vi.spyOn(authService, 'getUserById').mockResolvedValueOnce(mockUser);

      const result = await authService.refreshToken(refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
    });

    it('should fail with invalid refresh token', async () => {
      const invalidToken = 'invalid-token';

      await expect(authService.refreshToken(invalidToken)).rejects.toThrow(
        'Invalid refresh token'
      );
    });

    it('should fail with expired refresh token', async () => {
      const expiredToken = jwt.sign(
        { userId: TEST_USER_ID, tenantId: TEST_TENANT_ID },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      await expect(authService.refreshToken(expiredToken)).rejects.toThrow(
        'Invalid refresh token'
      );
    });
  });

  // =====================================
  // GET USER BY ID TESTS
  // =====================================

  describe('Get User By ID', () => {
    it('should get user successfully with valid ID and tenant', async () => {
      const mockUser = {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        name: TEST_NAME,
        role: 'user',
        tenantId: TEST_TENANT_ID,
        companyId: null,
        isActive: true,
        permissions: { read: true },
      };

      mockDb.where.mockReturnValueOnce(createWhereChain([mockUser]));

      const result = await authService.getUserById(TEST_USER_ID, TEST_TENANT_ID);

      expect(result.id).toBe(TEST_USER_ID);
      expect(result.email).toBe(TEST_EMAIL);
      expect(result.tenantId).toBe(TEST_TENANT_ID);
      expect(result.permissions).toEqual({ read: true });
    });

    it('should fail if user not found', async () => {
      mockDb.where.mockReturnValueOnce(createWhereChain([]));

      await expect(
        authService.getUserById(TEST_USER_ID, TEST_TENANT_ID)
      ).rejects.toThrow('User not found');
    });

    it('should fail if user is inactive', async () => {
      mockDb.where.mockReturnValueOnce(createWhereChain([]));

      await expect(
        authService.getUserById(TEST_USER_ID, TEST_TENANT_ID)
      ).rejects.toThrow('User not found');
    });

    it('should enforce tenant isolation', async () => {
      mockDb.where.mockReturnValueOnce(createWhereChain([]));

      await expect(
        authService.getUserById(TEST_USER_ID, 'different-tenant')
      ).rejects.toThrow('User not found');
    });
  });

  // =====================================
  // TOKEN GENERATION TESTS
  // =====================================

  describe('Token Generation', () => {
    it('should generate valid JWT access token', () => {
      // Call private method via type assertion
      const token = (authService as any).generateAccessToken(
        TEST_USER_ID,
        TEST_TENANT_ID,
        'user'
      );

      expect(typeof token).toBe('string');

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'test-secret'
      ) as any;

      expect(decoded.userId).toBe(TEST_USER_ID);
      expect(decoded.tenantId).toBe(TEST_TENANT_ID);
      expect(decoded.role).toBe('user');
      expect(decoded.type).toBe('access');
    });

    it('should generate valid refresh token', () => {
      const token = (authService as any).generateRefreshToken(
        TEST_USER_ID,
        TEST_TENANT_ID
      );

      expect(typeof token).toBe('string');

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'test-secret'
      ) as any;

      expect(decoded.userId).toBe(TEST_USER_ID);
      expect(decoded.tenantId).toBe(TEST_TENANT_ID);
    });

    it('should include tenant context in tokens', () => {
      const accessToken = (authService as any).generateAccessToken(
        TEST_USER_ID,
        TEST_TENANT_ID,
        'admin'
      );

      const decoded = jwt.verify(
        accessToken,
        process.env.JWT_SECRET || 'test-secret'
      ) as any;

      expect(decoded.tenantId).toBe(TEST_TENANT_ID);
    });
  });

  describe('Edge Cases', () => {
    it('should handle database errors gracefully on register', async () => {
      const errorChain = {
        limit: vi.fn().mockRejectedValue(new Error('Database connection failed')),
      };
      mockDb.where.mockReturnValueOnce(errorChain);

      await expect(
        authService.register({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
          name: TEST_NAME,
          tenantId: TEST_TENANT_ID,
        })
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle database errors gracefully on login', async () => {
      const errorChain = {
        limit: vi.fn().mockRejectedValue(new Error('Database connection failed')),
      };
      mockDb.where.mockReturnValueOnce(errorChain);

      await expect(
        authService.login(
          { email: TEST_EMAIL, password: TEST_PASSWORD },
          TEST_TENANT_ID
        )
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle empty email', async () => {
      mockDb.where.mockReturnValueOnce(createWhereChain([]));

      await expect(
        authService.login({ email: '', password: TEST_PASSWORD }, TEST_TENANT_ID)
      ).rejects.toThrow('Invalid credentials');
    });

    it('should handle empty password', async () => {
      mockDb.where.mockReturnValueOnce(createWhereChain([]));

      await expect(
        authService.login({ email: TEST_EMAIL, password: '' }, TEST_TENANT_ID)
      ).rejects.toThrow('Invalid credentials');
    });
  });
});
