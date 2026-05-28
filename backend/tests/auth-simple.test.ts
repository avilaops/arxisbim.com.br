import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../src/routes/v1/auth/auth.service';
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

describe('AuthService - Simplified Tests', () => {
  let authService: AuthService;
  const TEST_TENANT_ID = 'test-tenant';
  const TEST_USER_ID = '123e4567-e89b-12d3-a456-426614174000';
  const TEST_EMAIL = 'test@example.com';
  const TEST_PASSWORD = 'Test123!@#';

  beforeEach(() => {
    authService = new AuthService();
    
    // Mock database with proper chainable methods that always return mockDb
    const mockDb: any = {
      select: vi.fn(),
      from: vi.fn(),
      where: vi.fn(),
      limit: vi.fn(),
      insert: vi.fn(),
      values: vi.fn(),
      returning: vi.fn(),
      update: vi.fn(),
      set: vi.fn(),
    };
    
    // Make all methods return mockDb for chaining
    mockDb.select.mockReturnValue(mockDb);
    mockDb.from.mockReturnValue(mockDb);
    mockDb.where.mockReturnValue(mockDb);
    mockDb.limit.mockResolvedValue([]); // Returns Promise
    mockDb.insert.mockReturnValue(mockDb);
    mockDb.values.mockReturnValue(mockDb);
    mockDb.returning.mockResolvedValue([]);
    mockDb.update.mockReturnValue(mockDb);
    mockDb.set.mockReturnValue(mockDb);
    
    // @ts-ignore
    authService.db = mockDb;
  });

  describe('Register', () => {
    it('should register new user successfully', async () => {
      const mockDb = (authService as any).db;
      
      // Mock: User doesn't exist
      mockDb.limit.mockResolvedValueOnce([]);
      
      // Mock: User creation
      const mockUser = {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        name: 'Test User',
        role: 'user',
        tenantId: TEST_TENANT_ID,
        companyId: null,
        passwordHash: 'hashed',
        isActive: true,
        permissions: {},
      };
      mockDb.returning.mockResolvedValueOnce([mockUser]);
      
      // Mock createSession
      vi.spyOn(authService as any, 'createSession').mockResolvedValueOnce({
        token: 'refresh-token',
        sessionId: 'session-id',
      });

      const result = await authService.register({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        name: 'Test User',
        tenantId: TEST_TENANT_ID,
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(TEST_EMAIL);
    });

    it('should fail if user already exists', async () => {
      const mockDb = (authService as any).db;
      
      mockDb.limit.mockResolvedValueOnce([{ id: 'existing', email: TEST_EMAIL }]);

      await expect(
        authService.register({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
          name: 'Test',
          tenantId: TEST_TENANT_ID,
        })
      ).rejects.toThrow('Já existe uma conta com este email');
    });
  });

  describe('Login', () => {
    it('should login with valid credentials', async () => {
      const mockDb = (authService as any).db;
      const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);
      
      const mockUser = {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        name: 'Test User',
        role: 'user',
        tenantId: TEST_TENANT_ID,
        passwordHash: hashedPassword,
        isActive: true,
      };

      // Mock user found - need to mock the WHOLE chain including .where()
      const whereChain = {
        limit: vi.fn().mockResolvedValue([mockUser]),
      };
      mockDb.where.mockReturnValueOnce(whereChain);
      
      // Mock update lastLoginAt - this is a separate chain
      const updateChain = {
        where: vi.fn().mockResolvedValue(undefined),
      };
      mockDb.set.mockReturnValueOnce(updateChain);
      
      // Mock createSession
      vi.spyOn(authService as any, 'createSession').mockResolvedValueOnce({
        token: 'refresh-token',
        sessionId: 'session-id',
      });

      const result = await authService.login(
        { email: TEST_EMAIL, password: TEST_PASSWORD },
        TEST_TENANT_ID
      );

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result.user.email).toBe(TEST_EMAIL);
    });

    it('should fail with invalid email', async () => {
      const mockDb = (authService as any).db;
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(
        authService.login({ email: TEST_EMAIL, password: TEST_PASSWORD }, TEST_TENANT_ID)
      ).rejects.toThrow('Invalid credentials');
    });

    it('should fail with invalid password', async () => {
      const mockDb = (authService as any).db;
      const hashedPassword = await bcrypt.hash('DifferentPassword', 10);
      
      mockDb.limit.mockResolvedValueOnce([{
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        passwordHash: hashedPassword,
        isActive: true,
        tenantId: TEST_TENANT_ID,
      }]);

      await expect(
        authService.login({ email: TEST_EMAIL, password: TEST_PASSWORD }, TEST_TENANT_ID)
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('Refresh Token', () => {
    it('should generate new tokens with valid refresh token', async () => {
      const refreshToken = jwt.sign(
        { userId: TEST_USER_ID, tenantId: TEST_TENANT_ID },
        process.env.JWT_SECRET || 'test-secret'
      );

      const mockUser = {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        name: 'Test',
        role: 'user',
        tenantId: TEST_TENANT_ID,
        permissions: {},
      };

      vi.spyOn(authService, 'getUserById').mockResolvedValueOnce(mockUser);

      const result = await authService.refreshToken(refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should fail with invalid refresh token', async () => {
      await expect(
        authService.refreshToken('invalid-token')
      ).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('Token Generation', () => {
    it('should generate valid JWT access token', () => {
      const token = (authService as any).generateAccessToken(
        TEST_USER_ID,
        TEST_TENANT_ID,
        'user'
      );

      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret') as any;
      expect(decoded.userId).toBe(TEST_USER_ID);
      expect(decoded.tenantId).toBe(TEST_TENANT_ID);
      expect(decoded.role).toBe('user');
    });
  });
});
