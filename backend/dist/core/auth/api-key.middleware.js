import { ApiKeyService } from '../../routes/v1/auth/api-key.service.js';
/**
 * Middleware para autenticação via API Key
 * Header: X-API-Key: arxis_live_1234567890...
 */
const apiKeyService = new ApiKeyService();
export async function authenticateApiKey(request, reply) {
    // Extrair API key do header
    const apiKey = request.headers['x-api-key'];
    if (!apiKey) {
        return reply.code(401).send({
            error: 'Unauthorized',
            message: 'API key is required. Provide it via X-API-Key header.',
        });
    }
    // Validar formato básico
    if (!apiKey.startsWith('arxis_')) {
        return reply.code(401).send({
            error: 'Unauthorized',
            message: 'Invalid API key format',
        });
    }
    // Extrair IP do cliente
    const ipAddress = request.ip;
    // Validar API key
    const validation = await apiKeyService.validateApiKey(apiKey, ipAddress);
    if (!validation.valid) {
        return reply.code(401).send({
            error: 'Unauthorized',
            message: 'Invalid or expired API key',
        });
    }
    // Adicionar informações do API key ao request
    request.apiKey = {
        keyId: validation.keyId,
        tenantId: validation.tenantId,
        userId: validation.userId,
        scopes: validation.scopes,
        authType: 'api_key',
    };
    // Também adicionar como user para compatibilidade com middlewares existentes
    request.user = {
        userId: validation.userId || 'api_key_user',
        tenantId: validation.tenantId,
        role: 'api_key',
        permissions: validation.scopes,
    };
}
/**
 * Middleware que aceita tanto JWT quanto API Key
 */
export async function authenticateJwtOrApiKey(request, reply) {
    // Verificar se tem API key
    const apiKey = request.headers['x-api-key'];
    if (apiKey) {
        // Autenticar via API key
        return authenticateApiKey(request, reply);
    }
    // Caso contrário, usar autenticação JWT padrão
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({
            error: 'Unauthorized',
            message: 'Authentication required. Provide JWT token or API key.',
        });
    }
    // Deixar o middleware JWT normal processar
    // Isso será tratado pelo authenticateRequest existente
}
//# sourceMappingURL=api-key.middleware.js.map