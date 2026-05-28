import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PasswordResetService } from '../src/routes/v1/auth/password-reset.service';
import { AccountSecurityService } from '../src/routes/v1/auth/account-security.service';
import { createMockDb, createWhereChain, createSetChain } from './helpers/mock-db';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

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

describe('Password Reset Service - Unit Tests', () => {
  let passwordResetService: PasswordResetService;
  let mockDb: ReturnType<typeof createMockDb>;
  const TEST_TENANT_ID = 'test-tenant';
  const TEST_USER_ID = '123e4567-e89b-12d3-a456-426614174000';
  const TEST_EMAIL = 'test@example.com';
  const TEST_PASSWORD = 'NewPassword123!';

  beforeEach(() => {
    passwordResetService = new PasswordResetService();
    mockDb = createMockDb();
    // @ts-ignore
    passwordResetService.db = mockDb;
  });

  // =====================================
  // REQUEST PASSWORD RESET TESTS
  // =====================================

  describe('Request Password Reset', () => {
    it('should generate reset token for valid user', async () => {
      const mockUser = {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        name: 'Test User',
        tenantId: TEST_TENANT_ID,
      };

      const mockDbInstance = mockDb;
      mockDbInstance.limit.mockResolvedValueOnce([mockUser]);
      mockDbInstance.returning.mockResolvedValueOnce([{ id: 'token-id' }]);

      const result = await passwordResetService.requestPasswordReset(
        TEST_EMAIL,
        TEST_TENANT_ID
      );

      expect(result).toHaveProperty('resetToken');
      expect(result).toHaveProperty('expiresAt');
      expect(typeof result.resetToken).toBe('string');
      expect(result.resetToken.length).toBeGreaterThan(0);
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should fail gracefully for non-existent user', async () => {
      const mockDbInstance = mockDb;
      mockDbInstance.limit.mockResolvedValueOnce([]);

      await expect(
        passwordResetService.requestPasswordReset(TEST_EMAIL, TEST_TENANT_ID)
      ).rejects.toThrow('If user exists, reset email will be sent');
    });

    it('should store hashed token in database', async () => {
      const mockUser = {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        name: 'Test User',
        tenantId: TEST_TENANT_ID,
      };

      const mockDbInstance = mockDb;
      mockDbInstance.limit.mockResolvedValueOnce([mockUser]);
      mockDbInstance.returning.mockResolvedValueOnce([{ id: 'token-id' }]);

      await passwordResetService.requestPasswordReset(TEST_EMAIL, TEST_TENANT_ID);

      expect(mockDbInstance.insert).toHaveBeenCalled();
      expect(mockDbInstance.values).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: TEST_USER_ID,
          tenantId: TEST_TENANT_ID,
          tokenType: 'password_reset',
          token: expect.any(String),
          expiresAt: expect.any(Date),
          isUsed: false,
        })
      );
    });

    it('should set token expiry to 1 hour', async () => {
      const mockUser = {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        name: 'Test User',
        tenantId: TEST_TENANT_ID,
      };

      const mockDbInstance = mockDb;
      mockDbInstance.limit.mockResolvedValueOnce([mockUser]);
      mockDbInstance.returning.mockResolvedValueOnce([{ id: 'token-id' }]);

      const result = await passwordResetService.requestPasswordReset(
        TEST_EMAIL,
        TEST_TENANT_ID
      );

      const now = Date.now();
      const expiresAtTime = result.expiresAt.getTime();
      const hourInMs = 60 * 60 * 1000;

      expect(expiresAtTime).toBeGreaterThan(now);
      expect(expiresAtTime).toBeLessThan(now + hourInMs + 1000); // Allow 1s tolerance
    });
  });

  // =====================================
  // VALIDATE RESET TOKEN TESTS
  // =====================================

  describe('Validate Reset Token', () => {
    it('should validate correct token', async () => {
      const token = 'valid-reset-token';
      const hashedToken = await bcrypt.hash(token, 6);

      const mockToken = {
        id: 'token-id',
        userId: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        token: hashedToken,
        tokenType: 'password_reset',
        isUsed: false,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      };

      const mockDbInstance = mockDb;
      mockDbInstance.where.mockResolvedValueOnce([mockToken]);

      const result = await passwordResetService.validateResetToken(token, TEST_TENANT_ID);

      expect(result.valid).toBe(true);
      expect(result.userId).toBe(TEST_USER_ID);
    });

    it('should reject invalid token', async () => {
      const mockDbInstance = mockDb;
      mockDbInstance.where.mockResolvedValueOnce([]);

      const result = await passwordResetService.validateResetToken(
        'invalid-token',
        TEST_TENANT_ID
      );

      expect(result.valid).toBe(false);
      expect(result.userId).toBeUndefined();
    });

    it('should reject expired token', async () => {
      const token = 'expired-token';
      const hashedToken = await bcrypt.hash(token, 6);

      const mockToken = {
        id: 'token-id',
        userId: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        token: hashedToken,
        tokenType: 'password_reset',
        isUsed: false,
        expiresAt: new Date(Date.now() - 1000), // Expired
      };

      const mockDbInstance = mockDb;
      // Mock retorna vazio porque token expirado não seria retornado pela query
      mockDbInstance.where.mockResolvedValueOnce([]);

      const result = await passwordResetService.validateResetToken(token, TEST_TENANT_ID);

      expect(result.valid).toBe(false);
    });
  });

  // =====================================
  // RESET PASSWORD TESTS
  // =====================================

  describe('Reset Password', () => {
    it('should reset password with valid token', async () => {
      const token = 'valid-reset-token';
      const hashedToken = await bcrypt.hash(token, 6);

      const mockToken = {
        id: 'token-id',
        userId: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        token: hashedToken,
        tokenType: 'password_reset',
        isUsed: false,
        expiresAt: new Date(Date.now() + 3600000),
      };

      // Mock para validateResetToken
      mockDb.where.mockResolvedValueOnce([mockToken]);
      // Mock para update password
      mockDb.set.mockReturnValueOnce(createSetChain());
      // Mock para buscar tokens a serem marcados como usados
      mockDb.where.mockResolvedValueOnce([mockToken]);
      // Mock para marcar token como usado
      mockDb.set.mockReturnValueOnce(createSetChain());

      await passwordResetService.resetPassword(
        token,
        TEST_TENANT_ID,
        TEST_PASSWORD
      );

      // resetPassword não retorna nada, apenas lança erro se falhar
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalled();
    });

    it('should hash new password before storing', async () => {
      const token = 'valid-reset-token';
      const hashedToken = await bcrypt.hash(token, 6);

      const mockToken = {
        id: 'token-id',
        userId: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        token: hashedToken,
        tokenType: 'password_reset',
        isUsed: false,
        expiresAt: new Date(Date.now() + 3600000),
      };

      mockDb.where.mockResolvedValueOnce([mockToken]);
      mockDb.set.mockReturnValueOnce(createSetChain());
      mockDb.where.mockResolvedValueOnce([mockToken]);
      mockDb.set.mockReturnValueOnce(createSetChain());

      await passwordResetService.resetPassword(token, TEST_TENANT_ID, TEST_PASSWORD);

      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          passwordHash: expect.any(String),
        })
      );
    });

    it('should mark token as used after reset', async () => {
      const token = 'valid-reset-token';
      const hashedToken = await bcrypt.hash(token, 6);

      const mockToken = {
        id: 'token-id',
        userId: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        token: hashedToken,
        tokenType: 'password_reset',
        isUsed: false,
        expiresAt: new Date(Date.now() + 3600000),
      };

      mockDb.where.mockResolvedValueOnce([mockToken]);
      mockDb.set.mockReturnValueOnce(createSetChain());
      mockDb.where.mockResolvedValueOnce([mockToken]);
      mockDb.set.mockReturnValueOnce(createSetChain());

      await passwordResetService.resetPassword(token, TEST_TENANT_ID, TEST_PASSWORD);

      expect(mockDb.update).toHaveBeenCalled();
    });
  });
});

// =====================================
// ACCOUNT SECURITY SERVICE TESTS
// =====================================

describe('Account Security Service - Unit Tests', () => {
  let accountSecurityService: AccountSecurityService;
  let mockDb: ReturnType<typeof createMockDb>;
  const TEST_TENANT_ID = 'test-tenant';
  const TEST_USER_ID = '123e4567-e89b-12d3-a456-426614174000';
  const TEST_EMAIL = 'test@example.com';
  const TEST_OLD_PASSWORD = 'OldPassword123!';
  const TEST_NEW_PASSWORD = 'NewPassword123!';

  beforeEach(() => {
    accountSecurityService = new AccountSecurityService();
    mockDb = createMockDb();
    // @ts-ignore
    accountSecurityService.db = mockDb;
  });

  // =====================================
  // EMAIL VERIFICATION TESTS
  // =====================================

  describe('Email Verification', () => {
    it('should generate email verification token', async () => {
      mockDb.returning.mockResolvedValueOnce([{ id: 'token-id' }]);

      const token = await accountSecurityService.generateEmailVerificationToken(
        TEST_USER_ID,
        TEST_TENANT_ID,
        TEST_EMAIL
      );

      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should verify email with valid token', async () => {
      const token = 'valid-verification-token';
      const hashedToken = await bcrypt.hash(token, 6);

      const mockToken = {
        id: 'token-id',
        userId: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        token: hashedToken,
        tokenType: 'email_verification',
        isUsed: false,
        expiresAt: new Date(Date.now() + 86400000), // 24 hours
      };

      // Mock para buscar tokens
      mockDb.where.mockResolvedValueOnce([mockToken]);
      // Mock para update users (emailVerified)
      mockDb.set.mockReturnValueOnce(createSetChain());
      // Mock para update authTokens (isUsed)
      mockDb.set.mockReturnValueOnce(createSetChain());

      const result = await accountSecurityService.verifyEmail(token, TEST_TENANT_ID);

      expect(result.success).toBe(true);
      expect(result.userId).toBe(TEST_USER_ID);
    });

    it('should update user emailVerified status', async () => {
      const token = 'valid-verification-token';
      const hashedToken = await bcrypt.hash(token, 6);

      const mockToken = {
        id: 'token-id',
        userId: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        token: hashedToken,
        tokenType: 'email_verification',
        isUsed: false,
        expiresAt: new Date(Date.now() + 86400000),
      };

      mockDb.where.mockResolvedValueOnce([mockToken]);
      mockDb.set.mockReturnValueOnce(createSetChain());
      mockDb.set.mockReturnValueOnce(createSetChain());

      await accountSecurityService.verifyEmail(token, TEST_TENANT_ID);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          emailVerified: true,
          emailVerifiedAt: expect.any(Date),
        })
      );
    });
  });

  // =====================================
  // CHANGE PASSWORD TESTS - COMENTADOS
  // Método changePassword não existe no AccountSecurityService
  // =====================================

  // describe('Change Password', () => {
  //   it('should change password with correct old password', async () => {
  //     const oldPasswordHash = await bcrypt.hash(TEST_OLD_PASSWORD, 10);
  //     const mockUser = {
  //       id: TEST_USER_ID,
  //       email: TEST_EMAIL,
  //       tenantId: TEST_TENANT_ID,
  //       passwordHash: oldPasswordHash,
  //     };
  //     mockDb.where.mockReturnValueOnce(createWhereChain([mockUser]));
  //     mockDb.set.mockReturnValueOnce(createSetChain());
  //     const result = await accountSecurityService.changePassword(
  //       TEST_USER_ID,
  //       TEST_TENANT_ID,
  //       TEST_OLD_PASSWORD,
  //       TEST_NEW_PASSWORD
  //     );
  //     expect(result.success).toBe(true);
  //     expect(mockDb.update).toHaveBeenCalled();
  //   });
  // });

  // =====================================
  // LOGIN ATTEMPTS TESTS
  // =====================================

  describe('Login Attempts Tracking', () => {
    it('should track failed login attempts', () => {
      accountSecurityService.recordFailedLoginAttempt(TEST_EMAIL, TEST_TENANT_ID);
      accountSecurityService.recordFailedLoginAttempt(TEST_EMAIL, TEST_TENANT_ID);

      const result = accountSecurityService.isAccountLocked(TEST_EMAIL, TEST_TENANT_ID);

      // Should not be locked after 2 attempts (max is 5)
      expect(result.locked).toBe(false);
    });

    it('should lock account after max attempts', () => {
      for (let i = 0; i < 6; i++) {
        accountSecurityService.recordFailedLoginAttempt(TEST_EMAIL, TEST_TENANT_ID);
      }

      const result = accountSecurityService.isAccountLocked(TEST_EMAIL, TEST_TENANT_ID);

      expect(result.locked).toBe(true);
      expect(result.remainingTime).toBeGreaterThan(0);
    });

    it('should reset attempts on successful login', () => {
      accountSecurityService.recordFailedLoginAttempt(TEST_EMAIL, TEST_TENANT_ID);
      accountSecurityService.recordFailedLoginAttempt(TEST_EMAIL, TEST_TENANT_ID);

      accountSecurityService.clearLoginAttempts(TEST_EMAIL, TEST_TENANT_ID);

      const result = accountSecurityService.isAccountLocked(TEST_EMAIL, TEST_TENANT_ID);

      expect(result.locked).toBe(false);
    });
  });

  // =====================================
  // EDGE CASES
  // =====================================

  // describe('Edge Cases', () => {
  //   Todos os testes comentados - métodos não existem
  // });
});
