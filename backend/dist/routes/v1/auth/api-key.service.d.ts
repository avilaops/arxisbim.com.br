/**
 * API Keys Service
 * Gerenciamento de API Keys para autenticação M2M (machine-to-machine)
 */
export interface CreateApiKeyInput {
    tenantId: string;
    userId?: string;
    name: string;
    scopes: string[];
    expiresInDays?: number;
    ipWhitelist?: string[];
    rateLimit?: string;
}
export interface ApiKeyInfo {
    id: string;
    name: string;
    keyPrefix: string;
    scopes: string[];
    lastUsedAt: Date | null;
    expiresAt: Date | null;
    isActive: boolean;
    createdAt: Date;
}
export declare class ApiKeyService {
    private db;
    constructor();
    /**
     * Gerar nova API Key
     * Formato: arxis_live_1234567890abcdef1234567890abcdef1234567890abcdef
     */
    createApiKey(input: CreateApiKeyInput): Promise<{
        apiKey: string;
        info: ApiKeyInfo;
    }>;
    /**
     * Validar API Key e retornar informações
     */
    validateApiKey(apiKey: string, ipAddress?: string): Promise<{
        valid: boolean;
        tenantId?: string;
        userId?: string;
        scopes?: string[];
        keyId?: string;
    }>;
    /**
     * Listar API Keys de um tenant/usuário
     */
    listApiKeys(tenantId: string, userId?: string): Promise<ApiKeyInfo[]>;
    /**
     * Revogar API Key
     */
    revokeApiKey(keyId: string, tenantId: string): Promise<void>;
    /**
     * Deletar API Key permanentemente
     */
    deleteApiKey(keyId: string, tenantId: string): Promise<void>;
    /**
     * Atualizar API Key (nome, scopes, etc)
     */
    updateApiKey(keyId: string, tenantId: string, updates: {
        name?: string;
        scopes?: string[];
        ipWhitelist?: string[];
        rateLimit?: string;
    }): Promise<ApiKeyInfo>;
}
//# sourceMappingURL=api-key.service.d.ts.map