import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PasswordResetService } from '../src/routes/v1/auth/password-reset.service';
import { AccountSecurityService } from '../src/routes/v1/auth/account-security.service';
import * as bcrypt from 'bcrypt';

// Mock dependencies
vi.mock('../src/core/observability/service', () => ({
  observabilityService: {
    logAudit: vi.fn().mockResolvedValue(undefined),
    incrementCounter: vi.fn().mockResolvedValue(undefined),
    logError: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../src/core/email/email.service', () => ({
  emailService: {
    sendPasswordReset: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('Password Reset Service - Simplified Tests', () => {
  let service: PasswordResetService;
  const TEST_TENANT_ID = 'test-tenant';
  const TEST_USER_ID = 'user-123';
  const TEST_EMAIL = 'test@example.com';

  beforeEach(() => {
    service = new PasswordResetService();
    
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
      delete: vi.fn(),
    };
    
    // Make all methods return mockDb for chaining
    mockDb.select.mockReturnValue(mockDb);
    mockDb.from.mockReturnValue(mockDb);
    mockDb.where.mockReturnValue(mockDb);
    mockDb.limit.mockResolvedValue([]);
    mockDb.insert.mockReturnValue(mockDb);
    mockDb.values.mockReturnValue(mockDb);
    mockDb.returning.mockResolvedValue([]);
    mockDb.update.mockReturnValue(mockDb);
    mockDb.set.mockReturnValue(mockDb);
    mockDb.delete.mockReturnValue(mockDb);
    
    // @ts-ignore
    service.db = mockDb;
  });

  describe('Request Password Reset', () => {
    it('should generate reset token for valid user', async () => {
      const mockDb = (service as any).db;
      
      mockDb.limit.mockResolvedValueOnce([{
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        name: 'Test',
        tenantId: TEST_TENANT_ID,
      }]);
      
      mockDb.returning.mockResolvedValueOnce([{ id: 'token-id' }]);

      const result = await service.requestPasswordReset(TEST_EMAIL, TEST_TENANT_ID);

      expect(result).toHaveProperty('resetToken');
      expect(result).toHaveProperty('expiresAt');
      expect(typeof result.resetToken).toBe('string');
    });

    it('should fail for non-existent user', async () => {
      const mockDb = (service as any).db;
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(
        service.requestPasswordReset(TEST_EMAIL, TEST_TENANT_ID)
      ).rejects.toThrow();
    });
  });

  describe('Validate Reset Token', () => {
    it('should validate correct token', async () => {
      const token = 'test-token';
      const hashedToken = await bcrypt.hash(token, 6);
      
      const mockDb = (service as any).db;
      mockDb.where.mockResolvedValueOnce([{
        id: 'token-id',
        userId: TEST_USER_ID,
        token: hashedToken,
        expiresAt: new Date(Date.now() + 3600000),
      }]);

      const result = await service.validateResetToken(token, TEST_TENANT_ID);

      expect(result.valid).toBe(true);
      expect(result.userId).toBe(TEST_USER_ID);
    });

    it('should reject invalid token', async () => {
      const mockDb = (service as any).db;
      mockDb.where.mockResolvedValueOnce([]);

      const result = await service.validateResetToken('invalid', TEST_TENANT_ID);

      expect(result.valid).toBe(false);
    });
  });

  describe('Reset Password', () => {
    it('should reset password with valid token', async () => {
      const token = 'test-token';
      const hashedToken = await bcrypt.hash(token, 6);
      
      const mockDb = (service as any).db;
      
      // Mock for validateResetToken
      mockDb.where.mockResolvedValueOnce([{
        id: 'token-id',
        userId: TEST_USER_ID,
        token: hashedToken,
        expiresAt: new Date(Date.now() + 3600000),
      }]);
      
      // Mock for update password
      mockDb.where.mockResolvedValueOnce(undefined);
      
      // Mock for get tokens to mark as used
      mockDb.where.mockResolvedValueOnce([{
        id: 'token-id',
        userId: TEST_USER_ID,
        token: hashedToken,
      }]);
      
      // Mock for mark token as used
      mockDb.where.mockResolvedValueOnce(undefined);

      await service.resetPassword(token, TEST_TENANT_ID, 'NewPassword123!');

      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should fail with invalid token', async () => {
      const mockDb = (service as any).db;
      mockDb.where.mockResolvedValueOnce([]); // No valid token

      await expect(
        service.resetPassword('invalid', TEST_TENANT_ID, 'NewPassword123!')
      ).rejects.toThrow('Invalid or expired reset token');
    });
  });
});

describe('Account Security Service - Simplified Tests', () => {
  let service: AccountSecurityService;
  const TEST_TENANT_ID = 'test-tenant';
  const TEST_USER_ID = 'user-123';
  const TEST_EMAIL = 'test@example.com';

  beforeEach(() => {
    service = new AccountSecurityService();
    
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
    mockDb.limit.mockResolvedValue([]);
    mockDb.insert.mockReturnValue(mockDb);
    mockDb.values.mockReturnValue(mockDb);
    mockDb.returning.mockResolvedValue([]);
    mockDb.update.mockReturnValue(mockDb);
    mockDb.set.mockReturnValue(mockDb);
    
    // @ts-ignore
    service.db = mockDb;
  });

  describe('Email Verification', () => {
    it('should generate email verification token', async () => {
      const mockDb = (service as any).db;
      mockDb.returning.mockResolvedValueOnce([{ id: 'token-id' }]);

      const token = await service.generateEmailVerificationToken(
        TEST_USER_ID,
        TEST_TENANT_ID,
        TEST_EMAIL
      );

      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should verify email with valid token', async () => {
      const token = 'test-token';
      const hashedToken = await bcrypt.hash(token, 6);
      
      const mockDb = (service as any).db;
      mockDb.where.mockResolvedValueOnce([{
        id: 'token-id',
        userId: TEST_USER_ID,
        token: hashedToken,
        expiresAt: new Date(Date.now() + 86400000),
      }]);
      
      mockDb.where.mockResolvedValueOnce(undefined);
      mockDb.where.mockResolvedValueOnce(undefined);

      const result = await service.verifyEmail(token, TEST_TENANT_ID);

      expect(result.success).toBe(true);
      expect(result.userId).toBe(TEST_USER_ID);
    });

    it('should reject invalid token', async () => {
      const mockDb = (service as any).db;
      mockDb.where.mockResolvedValueOnce([]);

      const result = await service.verifyEmail('invalid', TEST_TENANT_ID);

      expect(result.success).toBe(false);
    });
  });

  describe('Login Attempts Tracking', () => {
    it('should track failed login attempts', () => {
      service.recordFailedLoginAttempt(TEST_EMAIL, TEST_TENANT_ID);
      service.recordFailedLoginAttempt(TEST_EMAIL, TEST_TENANT_ID);

      const result = service.isAccountLocked(TEST_EMAIL, TEST_TENANT_ID);

      expect(result.locked).toBe(false); // Only 2 attempts, max is 5
    });

    it('should lock account after max attempts', () => {
      for (let i = 0; i < 6; i++) {
        service.recordFailedLoginAttempt(TEST_EMAIL, TEST_TENANT_ID);
      }

      const result = service.isAccountLocked(TEST_EMAIL, TEST_TENANT_ID);

      expect(result.locked).toBe(true);
      expect(result.remainingTime).toBeGreaterThan(0);
    });

    it('should reset attempts on successful login', () => {
      service.recordFailedLoginAttempt(TEST_EMAIL, TEST_TENANT_ID);
      service.recordFailedLoginAttempt(TEST_EMAIL, TEST_TENANT_ID);

      service.clearLoginAttempts(TEST_EMAIL, TEST_TENANT_ID);

      const result = service.isAccountLocked(TEST_EMAIL, TEST_TENANT_ID);

      expect(result.locked).toBe(false);
    });
  });

  describe('Account Security Stats', () => {
    it('should get account security stats', async () => {
      const mockDb = (service as any).db;
      
      const mockUser = {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        lastLoginAt: new Date(),
        createdAt: new Date(),
      };
      
      // Mock the where().limit() chain for getting user
      const whereChain = {
        limit: vi.fn().mockResolvedValue([mockUser]),
      };
      mockDb.where.mockReturnValueOnce(whereChain);
      
      // Mock the where() for getting active tokens
      mockDb.where.mockResolvedValueOnce([]);

      const result = await service.getAccountSecurityStats(TEST_USER_ID, TEST_TENANT_ID);

      expect(result).toHaveProperty('emailVerified');
      expect(result).toHaveProperty('activeTokens');
      expect(result.emailVerified).toBe(true);
    });

    it('should fail if user not found', async () => {
      const mockDb = (service as any).db;
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(
        service.getAccountSecurityStats(TEST_USER_ID, TEST_TENANT_ID)
      ).rejects.toThrow('User not found');
    });
  });
});
