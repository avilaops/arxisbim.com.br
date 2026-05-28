import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiKeyService } from '../src/routes/v1/auth/api-key.service';
import { createMockDb, createWhereChain, createSetChain } from './helpers/mock-db';
import * as crypto from 'crypto';

// Mock dependencies
vi.mock('../src/core/observability/service', () => ({
  observabilityService: {
    logAudit: vi.fn().mockResolvedValue(undefined),
    incrementCounter: vi.fn().mockResolvedValue(undefined),
    logError: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('ApiKeyService - Unit Tests', () => {
  let apiKeyService: ApiKeyService;
  let mockDb: ReturnType<typeof createMockDb>;
  const TEST_TENANT_ID = 'test-tenant';
  const TEST_USER_ID = '123e4567-e89b-12d3-a456-426614174000';
  const TEST_KEY_ID = 'key-123';

  beforeEach(() => {
    apiKeyService = new ApiKeyService();
    mockDb = createMockDb();
    // @ts-ignore
    apiKeyService.db = mockDb;
  });

  // =====================================
  // CREATE API KEY TESTS
  // =====================================

  describe('Create API Key', () => {
    const createInput = {
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      name: 'Test API Key',
      scopes: ['read:models', 'write:projects'],
    };

    it('should create API key with correct format', async () => {
      const mockKey = {
        id: TEST_KEY_ID,
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        name: 'Test API Key',
        keyPrefix: 'arxis_test',
        keyHash: 'hash123',
        scopes: JSON.stringify(['read:models', 'write:projects']),
        isActive: true,
        lastUsedAt: null,
        expiresAt: null,
        createdAt: new Date(),
        ipWhitelist: null,
        rateLimit: '1000/hour',
      };

      mockDb.returning.mockResolvedValueOnce([mockKey]);

      const result = await apiKeyService.createApiKey(createInput);

      expect(result).toHaveProperty('apiKey');
      expect(result).toHaveProperty('info');
      expect(result.apiKey).toMatch(/^arxis_(live|test)_[0-9a-f]{96}$/);
      expect(result.info.id).toBe(TEST_KEY_ID);
      expect(result.info.name).toBe('Test API Key');
      expect(result.info.scopes).toEqual(['read:models', 'write:projects']);
    });

    it('should use "live" prefix in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const mockKey = {
        id: TEST_KEY_ID,
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        name: 'Test',
        keyPrefix: 'arxis_live',
        keyHash: 'hash',
        scopes: JSON.stringify([]),
        isActive: true,
        lastUsedAt: null,
        expiresAt: null,
        createdAt: new Date(),
        ipWhitelist: null,
        rateLimit: '1000/hour',
      };

      mockDb.returning.mockResolvedValueOnce([mockKey]);

      const result = await apiKeyService.createApiKey(createInput);

      expect(result.apiKey).toMatch(/^arxis_live_/);

      process.env.NODE_ENV = originalEnv;
    });

    it('should hash API key before storing', async () => {
      const mockKey = {
        id: TEST_KEY_ID,
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        name: 'Test',
        keyPrefix: 'arxis_test',
        keyHash: 'hash',
        scopes: JSON.stringify([]),
        isActive: true,
        lastUsedAt: null,
        expiresAt: null,
        createdAt: new Date(),
        ipWhitelist: null,
        rateLimit: '1000/hour',
      };

      mockDb.returning.mockResolvedValueOnce([mockKey]);

      await apiKeyService.createApiKey(createInput);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          keyHash: expect.any(String),
          keyPrefix: expect.any(String),
        })
      );
    });

    it('should set expiration date when provided', async () => {
      const inputWithExpiry = {
        ...createInput,
        expiresInDays: 30,
      };

      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const mockKey = {
        id: TEST_KEY_ID,
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        name: 'Test',
        keyPrefix: 'arxis_test',
        keyHash: 'hash',
        scopes: JSON.stringify([]),
        isActive: true,
        lastUsedAt: null,
        expiresAt: futureDate,
        createdAt: new Date(),
        ipWhitelist: null,
        rateLimit: '1000/hour',
      };

      mockDb.returning.mockResolvedValueOnce([mockKey]);

      const result = await apiKeyService.createApiKey(inputWithExpiry);

      expect(result.info.expiresAt).toBeInstanceOf(Date);
      expect(result.info.expiresAt).not.toBeNull();
    });

    it('should set IP whitelist when provided', async () => {
      const inputWithIp = {
        ...createInput,
        ipWhitelist: ['192.168.1.1', '10.0.0.1'],
      };

      const mockKey = {
        id: TEST_KEY_ID,
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        name: 'Test',
        keyPrefix: 'arxis_test',
        keyHash: 'hash',
        scopes: JSON.stringify([]),
        isActive: true,
        lastUsedAt: null,
        expiresAt: null,
        createdAt: new Date(),
        ipWhitelist: JSON.stringify(['192.168.1.1', '10.0.0.1']),
        rateLimit: '1000/hour',
      };

      mockDb.returning.mockResolvedValueOnce([mockKey]);

      await apiKeyService.createApiKey(inputWithIp);

      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          ipWhitelist: expect.stringContaining('192.168.1.1'),
        })
      );
    });

    it('should set custom rate limit when provided', async () => {
      const inputWithRateLimit = {
        ...createInput,
        rateLimit: '500/hour',
      };

      const mockKey = {
        id: TEST_KEY_ID,
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        name: 'Test',
        keyPrefix: 'arxis_test',
        keyHash: 'hash',
        scopes: JSON.stringify([]),
        isActive: true,
        lastUsedAt: null,
        expiresAt: null,
        createdAt: new Date(),
        ipWhitelist: null,
        rateLimit: '500/hour',
      };

      mockDb.returning.mockResolvedValueOnce([mockKey]);

      await apiKeyService.createApiKey(inputWithRateLimit);

      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          rateLimit: '500/hour',
        })
      );
    });
  });

  // =====================================
  // VALIDATE API KEY TESTS
  // =====================================

  describe('Validate API Key', () => {
    it('should validate correct API key', async () => {
      const apiKey = 'arxis_test_' + crypto.randomBytes(48).toString('hex');
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

      const mockKey = {
        id: TEST_KEY_ID,
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        keyHash,
        scopes: JSON.stringify(['read:models']),
        isActive: true,
        expiresAt: null,
        ipWhitelist: null,
      };

      mockDb.where.mockReturnValueOnce(createWhereChain([mockKey]));
      mockDb.set.mockReturnValueOnce(createSetChain());

      const result = await apiKeyService.validateApiKey(apiKey);

      expect(result.valid).toBe(true);
      expect(result.tenantId).toBe(TEST_TENANT_ID);
      expect(result.userId).toBe(TEST_USER_ID);
      expect(result.scopes).toEqual(['read:models']);
      expect(result.keyId).toBe(TEST_KEY_ID);
    });

    it('should reject invalid API key', async () => {
      mockDb.where.mockReturnValueOnce(createWhereChain([]));

      const result = await apiKeyService.validateApiKey('invalid-key');

      expect(result.valid).toBe(false);
      expect(result.tenantId).toBeUndefined();
    });

    it('should reject inactive API key', async () => {
      const apiKey = 'arxis_test_' + crypto.randomBytes(48).toString('hex');
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

      const mockKey = {
        id: TEST_KEY_ID,
        tenantId: TEST_TENANT_ID,
        keyHash,
        isActive: false, // Inactive
        scopes: JSON.stringify([]),
        expiresAt: null,
      };

      mockDb.where.mockReturnValueOnce(createWhereChain([mockKey]));

      const result = await apiKeyService.validateApiKey(apiKey);

      expect(result.valid).toBe(false);
    });

    it('should reject expired API key', async () => {
      const apiKey = 'arxis_test_' + crypto.randomBytes(48).toString('hex');
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

      const pastDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago

      const mockKey = {
        id: TEST_KEY_ID,
        tenantId: TEST_TENANT_ID,
        keyHash,
        isActive: true,
        expiresAt: pastDate, // Expired
        scopes: JSON.stringify([]),
      };

      mockDb.where.mockReturnValueOnce(createWhereChain([mockKey]));

      const result = await apiKeyService.validateApiKey(apiKey);

      expect(result.valid).toBe(false);
    });

    it('should validate IP whitelist when provided', async () => {
      const apiKey = 'arxis_test_' + crypto.randomBytes(48).toString('hex');
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

      const mockKey = {
        id: TEST_KEY_ID,
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        keyHash,
        isActive: true,
        expiresAt: null,
        scopes: JSON.stringify([]),
        ipWhitelist: JSON.stringify(['192.168.1.1', '10.0.0.1']),
      };

      mockDb.where.mockReturnValueOnce(createWhereChain([mockKey]));
      mockDb.set.mockReturnValueOnce(createSetChain());

      const result = await apiKeyService.validateApiKey(apiKey, '192.168.1.1');

      expect(result.valid).toBe(true);
    });

    it('should reject non-whitelisted IP', async () => {
      const apiKey = 'arxis_test_' + crypto.randomBytes(48).toString('hex');
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

      const mockKey = {
        id: TEST_KEY_ID,
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        keyHash,
        isActive: true,
        expiresAt: null,
        scopes: JSON.stringify([]),
        ipWhitelist: JSON.stringify(['192.168.1.1']),
      };

      mockDb.where.mockReturnValueOnce(createWhereChain([mockKey]));

      const result = await apiKeyService.validateApiKey(apiKey, '10.0.0.1');

      expect(result.valid).toBe(false);
    });

    it('should update lastUsedAt on successful validation', async () => {
      const apiKey = 'arxis_test_' + crypto.randomBytes(48).toString('hex');
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

      const mockKey = {
        id: TEST_KEY_ID,
        tenantId: TEST_TENANT_ID,
        keyHash,
        isActive: true,
        expiresAt: null,
        scopes: JSON.stringify([]),
        ipWhitelist: null,
      };

      mockDb.where.mockReturnValueOnce(createWhereChain([mockKey]));
      mockDb.set.mockReturnValueOnce(createSetChain());

      await apiKeyService.validateApiKey(apiKey);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          lastUsedAt: expect.any(Date),
        })
      );
    });
  });

  // =====================================
  // LIST API KEYS TESTS
  // =====================================

  describe('List API Keys', () => {
    it('should list all keys for tenant', async () => {
      const mockKeys = [
        {
          id: 'key-1',
          name: 'Key 1',
          keyPrefix: 'arxis_test',
          scopes: JSON.stringify(['read:models']),
          isActive: true,
          lastUsedAt: null,
          expiresAt: null,
          createdAt: new Date(),
        },
        {
          id: 'key-2',
          name: 'Key 2',
          keyPrefix: 'arxis_test',
          scopes: JSON.stringify(['write:projects']),
          isActive: false,
          lastUsedAt: new Date(),
          expiresAt: null,
          createdAt: new Date(),
        },
      ];

      mockDb.where.mockResolvedValueOnce(mockKeys);

      const result = await apiKeyService.listApiKeys(TEST_TENANT_ID);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0].id).toBe('key-1');
      expect(result[0].scopes).toEqual(['read:models']);
      expect(result[1].id).toBe('key-2');
      expect(result[1].scopes).toEqual(['write:projects']);
    });

    it('should filter by user ID when provided', async () => {
      const mockKeys = [
        {
          id: 'key-1',
          name: 'User Key',
          keyPrefix: 'arxis_test',
          scopes: JSON.stringify([]),
          isActive: true,
          lastUsedAt: null,
          expiresAt: null,
          createdAt: new Date(),
        },
      ];

      mockDb.where.mockResolvedValueOnce(mockKeys);

      const result = await apiKeyService.listApiKeys(TEST_TENANT_ID, TEST_USER_ID);

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('User Key');
    });

    it('should return empty array when no keys exist', async () => {
      mockDb.where.mockResolvedValueOnce([]);

      const result = await apiKeyService.listApiKeys(TEST_TENANT_ID);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  // =====================================
  // REVOKE API KEY TESTS
  // =====================================

  describe('Revoke API Key', () => {
    it('should revoke API key', async () => {
      mockDb.set.mockReturnValueOnce(createSetChain());

      await apiKeyService.revokeApiKey(TEST_KEY_ID, TEST_TENANT_ID);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
          revokedAt: expect.any(Date),
        })
      );
    });

    it('should enforce tenant isolation when revoking', async () => {
      mockDb.set.mockReturnValueOnce(createSetChain());

      await apiKeyService.revokeApiKey(TEST_KEY_ID, TEST_TENANT_ID);

      // Verificar que set foi chamado com isActive: false
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
          revokedAt: expect.any(Date),
        })
      );
    });
  });

  // =====================================
  // DELETE API KEY TESTS
  // =====================================

  describe('Delete API Key', () => {
    it('should delete API key permanently', async () => {
      mockDb.set.mockReturnValueOnce(createSetChain());

      await apiKeyService.deleteApiKey(TEST_KEY_ID, TEST_TENANT_ID);

      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });

    it('should enforce tenant isolation when deleting', async () => {
      mockDb.set.mockReturnValueOnce(createSetChain());

      await apiKeyService.deleteApiKey(TEST_KEY_ID, TEST_TENANT_ID);

      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  // =====================================
  // UPDATE API KEY TESTS
  // =====================================

  describe('Update API Key', () => {
    it('should update API key name', async () => {
      const updatedKey = {
        id: TEST_KEY_ID,
        name: 'Updated Name',
        keyPrefix: 'arxis_test',
        scopes: JSON.stringify([]),
        isActive: true,
        lastUsedAt: null,
        expiresAt: null,
        createdAt: new Date(),
      };

      mockDb.returning.mockResolvedValueOnce([updatedKey]);

      const result = await apiKeyService.updateApiKey(TEST_KEY_ID, TEST_TENANT_ID, {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should update API key scopes', async () => {
      const updatedKey = {
        id: TEST_KEY_ID,
        name: 'Test',
        keyPrefix: 'arxis_test',
        scopes: JSON.stringify(['read:models', 'write:models']),
        isActive: true,
        lastUsedAt: null,
        expiresAt: null,
        createdAt: new Date(),
      };

      mockDb.returning.mockResolvedValueOnce([updatedKey]);

      const result = await apiKeyService.updateApiKey(TEST_KEY_ID, TEST_TENANT_ID, {
        scopes: ['read:models', 'write:models'],
      });

      expect(result.scopes).toEqual(['read:models', 'write:models']);
    });

    it('should update IP whitelist', async () => {
      const updatedKey = {
        id: TEST_KEY_ID,
        name: 'Test',
        keyPrefix: 'arxis_test',
        scopes: JSON.stringify([]),
        isActive: true,
        lastUsedAt: null,
        expiresAt: null,
        createdAt: new Date(),
      };

      mockDb.returning.mockResolvedValueOnce([updatedKey]);

      await apiKeyService.updateApiKey(TEST_KEY_ID, TEST_TENANT_ID, {
        ipWhitelist: ['192.168.1.100'],
      });

      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should update rate limit', async () => {
      const updatedKey = {
        id: TEST_KEY_ID,
        name: 'Test',
        keyPrefix: 'arxis_test',
        scopes: JSON.stringify([]),
        isActive: true,
        lastUsedAt: null,
        expiresAt: null,
        createdAt: new Date(),
      };

      mockDb.returning.mockResolvedValueOnce([updatedKey]);

      await apiKeyService.updateApiKey(TEST_KEY_ID, TEST_TENANT_ID, {
        rateLimit: '2000/hour',
      });

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  // =====================================
  // EDGE CASES
  // =====================================

  describe('Edge Cases', () => {
    it('should handle database errors gracefully on create', async () => {
      mockDb.returning.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        apiKeyService.createApiKey({
          tenantId: TEST_TENANT_ID,
          name: 'Test',
          scopes: [],
        })
      ).rejects.toThrow('Database error');
    });

    it('should handle malformed scopes JSON', async () => {
      const apiKey = 'arxis_test_' + crypto.randomBytes(48).toString('hex');
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

      const mockKey = {
        id: TEST_KEY_ID,
        tenantId: TEST_TENANT_ID,
        keyHash,
        isActive: true,
        expiresAt: null,
        scopes: 'invalid-json',
        ipWhitelist: null,
      };

      mockDb.where.mockReturnValueOnce(createWhereChain([mockKey]));

      await expect(apiKeyService.validateApiKey(apiKey)).rejects.toThrow();
    });

    it('should handle null userId', async () => {
      const mockKey = {
        id: TEST_KEY_ID,
        tenantId: TEST_TENANT_ID,
        userId: null,
        name: 'Test',
        keyPrefix: 'arxis_test',
        keyHash: 'hash',
        scopes: JSON.stringify([]),
        isActive: true,
        lastUsedAt: null,
        expiresAt: null,
        createdAt: new Date(),
        ipWhitelist: null,
        rateLimit: '1000/hour',
      };

      mockDb.returning.mockResolvedValueOnce([mockKey]);

      const result = await apiKeyService.createApiKey({
        tenantId: TEST_TENANT_ID,
        name: 'Test',
        scopes: [],
      });

      expect(result.info.id).toBe(TEST_KEY_ID);
    });

    it('should generate unique keys on consecutive calls', async () => {
      const mockKey1 = {
        id: 'key-1',
        tenantId: TEST_TENANT_ID,
        userId: null,
        name: 'Key 1',
        keyPrefix: 'arxis_test',
        keyHash: 'hash1',
        scopes: JSON.stringify([]),
        isActive: true,
        lastUsedAt: null,
        expiresAt: null,
        createdAt: new Date(),
        ipWhitelist: null,
        rateLimit: '1000/hour',
      };

      const mockKey2 = {
        id: 'key-2',
        tenantId: TEST_TENANT_ID,
        userId: null,
        name: 'Key 2',
        keyPrefix: 'arxis_test',
        keyHash: 'hash2',
        scopes: JSON.stringify([]),
        isActive: true,
        lastUsedAt: null,
        expiresAt: null,
        createdAt: new Date(),
        ipWhitelist: null,
        rateLimit: '1000/hour',
      };

      mockDb.returning
        .mockResolvedValueOnce([mockKey1])
        .mockResolvedValueOnce([mockKey2]);

      const result1 = await apiKeyService.createApiKey({
        tenantId: TEST_TENANT_ID,
        name: 'Key 1',
        scopes: [],
      });

      const result2 = await apiKeyService.createApiKey({
        tenantId: TEST_TENANT_ID,
        name: 'Key 2',
        scopes: [],
      });

      expect(result1.apiKey).not.toBe(result2.apiKey);
    });
  });
});
