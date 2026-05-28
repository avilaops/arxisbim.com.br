import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and } from 'drizzle-orm';
import * as crypto from 'crypto';
import { apiKeys } from '../../../shared/database/schema/api-keys.js';
import { observabilityService } from '../../../core/observability/service.js';
export class ApiKeyService {
    db;
    constructor() {
        const client = postgres(process.env.DATABASE_URL);
        this.db = drizzle(client, { schema: { apiKeys } });
    }
    /**
     * Gerar nova API Key
     * Formato: arxis_live_1234567890abcdef1234567890abcdef1234567890abcdef
     */
    async createApiKey(input) {
        // Gerar key aleatória (48 bytes = 96 caracteres hex)
        const randomBytes = crypto.randomBytes(48);
        const keySecret = randomBytes.toString('hex');
        // Prefixo para identificação visual
        const env = process.env.NODE_ENV === 'production' ? 'live' : 'test';
        const keyPrefix = `arxis_${env}`;
        const fullKey = `${keyPrefix}_${keySecret}`;
        // Hash da key completa (SHA-256)
        const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');
        // Calcular expiração
        const expiresAt = input.expiresInDays
            ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
            : null;
        // Inserir no banco
        const [newKey] = await this.db
            .insert(apiKeys)
            .values({
            tenantId: input.tenantId,
            userId: input.userId || null,
            name: input.name,
            keyPrefix,
            keyHash,
            scopes: JSON.stringify(input.scopes),
            expiresAt,
            isActive: true,
            ipWhitelist: input.ipWhitelist ? JSON.stringify(input.ipWhitelist) : null,
            rateLimit: input.rateLimit || '1000/hour',
        })
            .returning();
        // Log de auditoria
        await observabilityService.logAudit({
            tenantId: input.tenantId,
            userId: input.userId,
            action: 'api_key.created',
            resource: 'api_key',
            resourceId: newKey.id,
            metadata: {
                name: input.name,
                scopes: input.scopes,
                expiresAt: expiresAt?.toISOString(),
            },
        }).catch(err => console.error('Failed to log audit:', err));
        // Métrica
        await observabilityService.incrementCounter(input.tenantId, 'api_keys.created', { tenant: input.tenantId }).catch(err => console.error('Failed to increment counter:', err));
        return {
            apiKey: fullKey, // Retornar apenas uma vez - usuário deve guardar
            info: {
                id: newKey.id,
                name: newKey.name,
                keyPrefix: newKey.keyPrefix,
                scopes: JSON.parse(newKey.scopes),
                lastUsedAt: newKey.lastUsedAt,
                expiresAt: newKey.expiresAt,
                isActive: newKey.isActive,
                createdAt: newKey.createdAt,
            },
        };
    }
    /**
     * Validar API Key e retornar informações
     */
    async validateApiKey(apiKey, ipAddress) {
        // Hash da key fornecida
        const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
        // Buscar key no banco
        const [key] = await this.db
            .select()
            .from(apiKeys)
            .where(eq(apiKeys.keyHash, keyHash))
            .limit(1);
        if (!key) {
            return { valid: false };
        }
        // Verificar se está ativa
        if (!key.isActive) {
            return { valid: false };
        }
        // Verificar expiração
        if (key.expiresAt && new Date() > key.expiresAt) {
            return { valid: false };
        }
        // Verificar IP whitelist
        if (key.ipWhitelist && ipAddress) {
            const allowedIps = JSON.parse(key.ipWhitelist);
            if (!allowedIps.includes(ipAddress)) {
                // Log de segurança
                await observabilityService.logError({
                    tenantId: key.tenantId,
                    userId: key.userId || undefined,
                    errorCode: 'IP_NOT_WHITELISTED',
                    errorMessage: `API key used from non-whitelisted IP: ${ipAddress}`,
                    severity: 'warning',
                    context: { keyId: key.id, ipAddress },
                }).catch(err => console.error('Failed to log error:', err));
                return { valid: false };
            }
        }
        // Atualizar lastUsedAt
        await this.db
            .update(apiKeys)
            .set({ lastUsedAt: new Date() })
            .where(eq(apiKeys.id, key.id));
        // Log de uso (async)
        observabilityService.logAudit({
            tenantId: key.tenantId,
            userId: key.userId || undefined,
            action: 'api_key.used',
            resource: 'api_key',
            resourceId: key.id,
            metadata: { ipAddress },
        }).catch(err => console.error('Failed to log audit:', err));
        return {
            valid: true,
            tenantId: key.tenantId,
            userId: key.userId || undefined,
            scopes: JSON.parse(key.scopes),
            keyId: key.id,
        };
    }
    /**
     * Listar API Keys de um tenant/usuário
     */
    async listApiKeys(tenantId, userId) {
        const conditions = userId
            ? and(eq(apiKeys.tenantId, tenantId), eq(apiKeys.userId, userId))
            : eq(apiKeys.tenantId, tenantId);
        const keys = await this.db
            .select()
            .from(apiKeys)
            .where(conditions);
        return keys.map(key => ({
            id: key.id,
            name: key.name,
            keyPrefix: key.keyPrefix,
            scopes: JSON.parse(key.scopes),
            lastUsedAt: key.lastUsedAt,
            expiresAt: key.expiresAt,
            isActive: key.isActive,
            createdAt: key.createdAt,
        }));
    }
    /**
     * Revogar API Key
     */
    async revokeApiKey(keyId, tenantId) {
        await this.db
            .update(apiKeys)
            .set({ isActive: false, revokedAt: new Date() })
            .where(and(eq(apiKeys.id, keyId), eq(apiKeys.tenantId, tenantId)));
        // Log de auditoria
        await observabilityService.logAudit({
            tenantId,
            action: 'api_key.revoked',
            resource: 'api_key',
            resourceId: keyId,
        }).catch(err => console.error('Failed to log audit:', err));
    }
    /**
     * Deletar API Key permanentemente
     */
    async deleteApiKey(keyId, tenantId) {
        await this.db
            .delete(apiKeys)
            .where(and(eq(apiKeys.id, keyId), eq(apiKeys.tenantId, tenantId)));
        // Log de auditoria
        await observabilityService.logAudit({
            tenantId,
            action: 'api_key.deleted',
            resource: 'api_key',
            resourceId: keyId,
        }).catch(err => console.error('Failed to log audit:', err));
    }
    /**
     * Atualizar API Key (nome, scopes, etc)
     */
    async updateApiKey(keyId, tenantId, updates) {
        const updateData = {};
        if (updates.name !== undefined) {
            updateData.name = updates.name;
        }
        if (updates.scopes !== undefined) {
            updateData.scopes = JSON.stringify(updates.scopes);
        }
        if (updates.ipWhitelist !== undefined) {
            updateData.ipWhitelist = JSON.stringify(updates.ipWhitelist);
        }
        if (updates.rateLimit !== undefined) {
            updateData.rateLimit = updates.rateLimit;
        }
        const [updatedKey] = await this.db
            .update(apiKeys)
            .set(updateData)
            .where(and(eq(apiKeys.id, keyId), eq(apiKeys.tenantId, tenantId)))
            .returning();
        if (!updatedKey) {
            throw new Error('API key not found');
        }
        // Log de auditoria
        await observabilityService.logAudit({
            tenantId,
            action: 'api_key.updated',
            resource: 'api_key',
            resourceId: keyId,
            metadata: updates,
        }).catch(err => console.error('Failed to log audit:', err));
        return {
            id: updatedKey.id,
            name: updatedKey.name,
            keyPrefix: updatedKey.keyPrefix,
            scopes: JSON.parse(updatedKey.scopes),
            lastUsedAt: updatedKey.lastUsedAt,
            expiresAt: updatedKey.expiresAt,
            isActive: updatedKey.isActive,
            createdAt: updatedKey.createdAt,
        };
    }
}
//# sourceMappingURL=api-key.service.js.map