import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TwoFactorService } from '../src/routes/v1/auth/two-factor.service';
import { createMockDb, createWhereChain, createSetChain } from './helpers/mock-db';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

// Mock dependencies
vi.mock('../src/core/observability/service', () => ({
  observabilityService: {
    logAudit: vi.fn().mockResolvedValue(undefined),
    incrementCounter: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('TwoFactorService - Unit Tests', () => {
  let twoFactorService: TwoFactorService;
  let mockDb: ReturnType<typeof createMockDb>;
  const TEST_TENANT_ID = 'test-tenant';
  const TEST_USER_ID = '123e4567-e89b-12d3-a456-426614174000';
  const TEST_EMAIL = 'test@example.com';
  const TEST_PASSWORD = 'Test123!@#';

  beforeEach(() => {
    twoFactorService = new TwoFactorService();
    mockDb = createMockDb();
    // @ts-ignore
    twoFactorService.db = mockDb;
  });

  // =====================================
  // ENABLE 2FA TESTS
  // =====================================

  describe('Enable 2FA', () => {
    it('should generate secret, QR code URL, and backup codes', async () => {
      const mockUser = {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        tenantId: TEST_TENANT_ID,
      };

      mockDb.where.mockReturnValueOnce(createWhereChain([mockUser]));
      mockDb.set.mockReturnValueOnce(createSetChain());

      const result = await twoFactorService.enable2FA(TEST_USER_ID, TEST_TENANT_ID);

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCodeUrl');
      expect(result).toHaveProperty('backupCodes');
      expect(typeof result.secret).toBe('string');
      expect(result.secret.length).toBeGreaterThan(0);
      expect(result.qrCodeUrl).toContain('otpauth://totp/');
      expect(result.qrCodeUrl).toContain(encodeURIComponent(TEST_EMAIL)); // Email é URL-encoded
      expect(Array.isArray(result.backupCodes)).toBe(true);
      expect(result.backupCodes.length).toBe(8);
    });

    it('should generate 8 backup codes of 8 characters each', async () => {
      const mockUser = {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        tenantId: TEST_TENANT_ID,
      };

      mockDb.where.mockReturnValueOnce(createWhereChain([mockUser]));
      mockDb.set.mockReturnValueOnce(createSetChain());

      const result = await twoFactorService.enable2FA(TEST_USER_ID, TEST_TENANT_ID);

      expect(result.backupCodes.length).toBe(8);
      result.backupCodes.forEach(code => {
        expect(code.length).toBe(8);
        expect(/^[0-9A-F]+$/.test(code)).toBe(true); // Hex uppercase
      });
    });

    it('should fail if user not found', async () => {
      mockDb.where.mockReturnValueOnce(createWhereChain([]));

      await expect(
        twoFactorService.enable2FA(TEST_USER_ID, TEST_TENANT_ID)
      ).rejects.toThrow('User not found');
    });

    it('should store 2FA secret but not enable it yet', async () => {
      const mockUser = {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        tenantId: TEST_TENANT_ID,
      };

      mockDb.where.mockReturnValueOnce(createWhereChain([mockUser]));
      mockDb.set.mockReturnValueOnce(createSetChain());

      await twoFactorService.enable2FA(TEST_USER_ID, TEST_TENANT_ID);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          twoFactorSecret: expect.any(String),
          twoFactorEnabled: false, // Not enabled until verified
          twoFactorBackupCodes: expect.any(String),
        })
      );
    });

    it('should generate QR code URL with correct format', async () => {
      const mockUser = {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        tenantId: TEST_TENANT_ID,
      };

      mockDb.where.mockReturnValueOnce(createWhereChain([mockUser]));
      mockDb.set.mockReturnValueOnce(createSetChain());

      const result = await twoFactorService.enable2FA(TEST_USER_ID, TEST_TENANT_ID);

      expect(result.qrCodeUrl).toMatch(/^otpauth:\/\/totp\/ArxisVR:/);
      expect(result.qrCodeUrl).toContain(`secret=${result.secret}`);
      expect(result.qrCodeUrl).toContain('issuer=ArxisVR');
      expect(result.qrCodeUrl).toContain('algorithm=SHA1');
      expect(result.qrCodeUrl).toContain('digits=6');
      expect(result.qrCodeUrl).toContain('period=30');
    });
  });

  // =====================================
  // VERIFY 2FA SETUP TESTS
  // =====================================

  describe('Verify 2FA Setup', () => {
    it('should verify valid TOTP code and enable 2FA', async () => {
      const secret = 'JBSWY3DPEHPK3PXP'; // Base32 encoded secret
      const mockUser = {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        tenantId: TEST_TENANT_ID,
        twoFactorSecret: secret,
        twoFactorEnabled: false,
      };

      mockDb.where.mockReturnValueOnce(createWhereChain([mockUser]));
      mockDb.set.mockReturnValueOnce(createSetChain());

      // Generate valid TOTP code
      const validCode = (twoFactorService as any).generateTOTP(
        secret,
        Math.floor(Date.now() / 1000 / 30)
      );

      const result = await twoFactorService.verify2FASetup(
        TEST_USER_ID,
        TEST_TENANT_ID,
        validCode
      );

      expect(result).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith({ twoFactorEnabled: true });
    });

    it('should reject invalid TOTP code', async () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const mockUser = {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        tenantId: TEST_TENANT_ID,
        twoFactorSecret: secret,
        twoFactorEnabled: false,
      };

      mockDb.where.mockReturnValueOnce(createWhereChain([mockUser]));

      const result = await twoFactorService.verify2FASetup(
        TEST_USER_ID,
        TEST_TENANT_ID,
        '000000' // Invalid code
      );

      expect(result).toBe(false);
    });

    it('should fail if 2FA setup not initiated', async () => {
      const mockUser = {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        tenantId: TEST_TENANT_ID,
        twoFactorSecret: null,
      };

      mockDb.where.mockReturnValueOnce(createWhereChain([mockUser]));

      await expect(
        twoFactorService.verify2FASetup(TEST_USER_ID, TEST_TENANT_ID, '123456')
      ).rejects.toThrow('2FA setup not initiated');
    });

    it('should fail if user not found', async () => {
      mockDb.where.mockReturnValueOnce(createWhereChain([]));

      await expect(
        twoFactorService.verify2FASetup(TEST_USER_ID, TEST_TENANT_ID, '123456')
      ).rejects.toThrow('2FA setup not initiated');
    });
  });

  // =====================================
  // DISABLE 2FA TESTS
  // =====================================

  describe('Disable 2FA', () => {
    it('should disable 2FA with valid password', async () => {
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

      const mockUser = {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        tenantId: TEST_TENANT_ID,
        passwordHash: hashedPassword,
        twoFactorEnabled: true,
        twoFactorSecret: 'JBSWY3DPEHPK3PXP',
      };

      mockDb.where.mockReturnValueOnce(createWhereChain([mockUser]));
      mockDb.set.mockReturnValueOnce(createSetChain());

      await twoFactorService.disable2FA(TEST_USER_ID, TEST_TENANT_ID, TEST_PASSWORD);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith({
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
      });
    });

    it('should fail with invalid password', async () => {
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

      const mockUser = {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        tenantId: TEST_TENANT_ID,
        passwordHash: hashedPassword,
        twoFactorEnabled: true,
      };

      mockDb.where.mockReturnValueOnce(createWhereChain([mockUser]));

      await expect(
        twoFactorService.disable2FA(TEST_USER_ID, TEST_TENANT_ID, 'WrongPassword')
      ).rejects.toThrow('Invalid password');
    });

    it('should fail if user not found', async () => {
      mockDb.where.mockReturnValueOnce(createWhereChain([]));

      await expect(
        twoFactorService.disable2FA(TEST_USER_ID, TEST_TENANT_ID, TEST_PASSWORD)
      ).rejects.toThrow('User not found');
    });
  });

  // =====================================
  // VERIFY 2FA LOGIN TESTS
  // =====================================

  describe('Verify 2FA Login', () => {
    it('should verify valid TOTP code during login', async () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const mockUser = {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        tenantId: TEST_TENANT_ID,
        twoFactorEnabled: true,
        twoFactorSecret: secret,
      };

      mockDb.where.mockReturnValueOnce(createWhereChain([mockUser]));

      const validCode = (twoFactorService as any).generateTOTP(
        secret,
        Math.floor(Date.now() / 1000 / 30)
      );

      const result = await twoFactorService.verify2FALogin(
        TEST_USER_ID,
        TEST_TENANT_ID,
        validCode
      );

      expect(result).toBe(true);
    });

    it('should verify valid backup code during login', async () => {
      const backupCode = '12345678';
      const hashedCode = crypto.createHash('sha256').update(backupCode).digest('hex');

      const mockUser = {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        tenantId: TEST_TENANT_ID,
        twoFactorEnabled: true,
        twoFactorSecret: 'JBSWY3DPEHPK3PXP',
        twoFactorBackupCodes: JSON.stringify([hashedCode, 'other-hash']),
      };

      mockDb.where.mockReturnValueOnce(createWhereChain([mockUser]));
      mockDb.set.mockReturnValueOnce(createSetChain());

      const result = await twoFactorService.verify2FALogin(
        TEST_USER_ID,
        TEST_TENANT_ID,
        backupCode
      );

      expect(result).toBe(true);
      // Backup code should be removed after use
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should remove backup code after successful use', async () => {
      const backupCode = 'ABCD1234';
      const hashedCode = crypto.createHash('sha256').update(backupCode).digest('hex');

      const mockUser = {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        tenantId: TEST_TENANT_ID,
        twoFactorEnabled: true,
        twoFactorSecret: 'JBSWY3DPEHPK3PXP',
        twoFactorBackupCodes: JSON.stringify([hashedCode, 'hash2', 'hash3']),
      };

      mockDb.where.mockReturnValueOnce(createWhereChain([mockUser]));
      mockDb.set.mockReturnValueOnce(createSetChain());

      await twoFactorService.verify2FALogin(
        TEST_USER_ID,
        TEST_TENANT_ID,
        backupCode
      );

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          twoFactorBackupCodes: expect.stringContaining('hash2'),
        })
      );
    });

    it('should reject invalid code', async () => {
      const mockUser = {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        tenantId: TEST_TENANT_ID,
        twoFactorEnabled: true,
        twoFactorSecret: 'JBSWY3DPEHPK3PXP',
        twoFactorBackupCodes: JSON.stringify(['hash1', 'hash2']),
      };

      mockDb.where.mockReturnValueOnce(createWhereChain([mockUser]));

      const result = await twoFactorService.verify2FALogin(
        TEST_USER_ID,
        TEST_TENANT_ID,
        '000000'
      );

      expect(result).toBe(false);
    });

    it('should fail if 2FA not enabled', async () => {
      const mockUser = {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        tenantId: TEST_TENANT_ID,
        twoFactorEnabled: false,
      };

      mockDb.where.mockReturnValueOnce(createWhereChain([mockUser]));

      await expect(
        twoFactorService.verify2FALogin(TEST_USER_ID, TEST_TENANT_ID, '123456')
      ).rejects.toThrow('2FA not enabled for this user');
    });
  });

  // =====================================
  // REGENERATE BACKUP CODES TESTS
  // =====================================

  describe('Regenerate Backup Codes', () => {
    it('should generate new backup codes', async () => {
      const mockUser = {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        tenantId: TEST_TENANT_ID,
        twoFactorEnabled: true,
        twoFactorSecret: 'JBSWY3DPEHPK3PXP',
      };

      mockDb.where.mockReturnValueOnce(createWhereChain([mockUser]));
      mockDb.set.mockReturnValueOnce(createSetChain());

      const result = await twoFactorService.regenerateBackupCodes(
        TEST_USER_ID,
        TEST_TENANT_ID
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(8);
      result.forEach(code => {
        expect(code.length).toBe(8);
        expect(/^[0-9A-F]+$/.test(code)).toBe(true);
      });
    });

    it('should replace old backup codes with new ones', async () => {
      const mockUser = {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        tenantId: TEST_TENANT_ID,
        twoFactorEnabled: true,
        twoFactorSecret: 'JBSWY3DPEHPK3PXP',
        twoFactorBackupCodes: JSON.stringify(['old-hash-1', 'old-hash-2']),
      };

      mockDb.where.mockReturnValueOnce(createWhereChain([mockUser]));
      mockDb.set.mockReturnValueOnce(createSetChain());

      await twoFactorService.regenerateBackupCodes(TEST_USER_ID, TEST_TENANT_ID);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          twoFactorBackupCodes: expect.any(String),
        })
      );
    });

    it('should fail if 2FA not enabled', async () => {
      const mockUser = {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        tenantId: TEST_TENANT_ID,
        twoFactorEnabled: false,
      };

      mockDb.where.mockReturnValueOnce(createWhereChain([mockUser]));

      await expect(
        twoFactorService.regenerateBackupCodes(TEST_USER_ID, TEST_TENANT_ID)
      ).rejects.toThrow('2FA not enabled');
    });

    it('should fail if user not found', async () => {
      mockDb.where.mockReturnValueOnce(createWhereChain([]));

      await expect(
        twoFactorService.regenerateBackupCodes(TEST_USER_ID, TEST_TENANT_ID)
      ).rejects.toThrow('2FA not enabled');
    });
  });

  // =====================================
  // TOTP GENERATION & VERIFICATION
  // =====================================

  describe('TOTP Generation & Verification', () => {
    it('should generate 6-digit TOTP code', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const timeCounter = Math.floor(Date.now() / 1000 / 30);

      const code = (twoFactorService as any).generateTOTP(secret, timeCounter);

      expect(typeof code).toBe('string');
      expect(code.length).toBe(6);
      expect(/^\d{6}$/.test(code)).toBe(true);
    });

    it('should verify TOTP code within time window', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const timeCounter = Math.floor(Date.now() / 1000 / 30);
      const code = (twoFactorService as any).generateTOTP(secret, timeCounter);

      const isValid = (twoFactorService as any).verifyTOTP(secret, code);

      expect(isValid).toBe(true);
    });

    it('should reject code outside time window', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const oldTimeCounter = Math.floor(Date.now() / 1000 / 30) - 10; // 5 minutes ago
      const oldCode = (twoFactorService as any).generateTOTP(secret, oldTimeCounter);

      const isValid = (twoFactorService as any).verifyTOTP(secret, oldCode);

      expect(isValid).toBe(false);
    });

    it('should accept code from previous/next time window', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const timeCounter = Math.floor(Date.now() / 1000 / 30) - 1; // Previous window
      const code = (twoFactorService as any).generateTOTP(secret, timeCounter);

      const isValid = (twoFactorService as any).verifyTOTP(secret, code);

      expect(isValid).toBe(true);
    });
  });

  // =====================================
  // HELPER FUNCTIONS
  // =====================================

  describe('Helper Functions', () => {
    it('should generate unique secrets', () => {
      const secret1 = twoFactorService.generateSecret();
      const secret2 = twoFactorService.generateSecret();

      expect(secret1).not.toBe(secret2);
      expect(secret1.length).toBeGreaterThan(0);
      expect(secret2.length).toBeGreaterThan(0);
    });

    it('should generate QR code URL with custom issuer', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const url = twoFactorService.generateQRCodeUrl(
        TEST_EMAIL,
        secret,
        'CustomIssuer'
      );

      expect(url).toContain('issuer=CustomIssuer');
      expect(url).toContain('otpauth://totp/CustomIssuer:');
    });

    it('should generate unique backup codes', () => {
      const codes1 = (twoFactorService as any).generateBackupCodes(8);
      const codes2 = (twoFactorService as any).generateBackupCodes(8);

      expect(codes1.length).toBe(8);
      expect(codes2.length).toBe(8);
      
      // Should be different sets
      const intersection = codes1.filter((code: string) => codes2.includes(code));
      expect(intersection.length).toBe(0);
    });
  });

  // =====================================
  // EDGE CASES
  // =====================================

  describe('Edge Cases', () => {
    it('should handle database errors gracefully on enable', async () => {
      mockDb.limit.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        twoFactorService.enable2FA(TEST_USER_ID, TEST_TENANT_ID)
      ).rejects.toThrow('Database error');
    });

    it('should handle empty backup codes array', async () => {
      const mockUser = {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        tenantId: TEST_TENANT_ID,
        twoFactorEnabled: true,
        twoFactorSecret: 'JBSWY3DPEHPK3PXP',
        twoFactorBackupCodes: JSON.stringify([]),
      };

      mockDb.where.mockReturnValueOnce(createWhereChain([mockUser]));

      const result = await twoFactorService.verify2FALogin(
        TEST_USER_ID,
        TEST_TENANT_ID,
        'invalid-code'
      );

      expect(result).toBe(false);
    });

    it('should handle null backup codes', async () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const mockUser = {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        tenantId: TEST_TENANT_ID,
        twoFactorEnabled: true,
        twoFactorSecret: secret,
        twoFactorBackupCodes: null,
      };

      mockDb.where.mockReturnValueOnce(createWhereChain([mockUser]));

      // Should still verify TOTP
      const validCode = (twoFactorService as any).generateTOTP(
        secret,
        Math.floor(Date.now() / 1000 / 30)
      );

      const result = await twoFactorService.verify2FALogin(
        TEST_USER_ID,
        TEST_TENANT_ID,
        validCode
      );

      expect(result).toBe(true);
    });
  });
});
