import { ApiTokensService } from '../../modules/api-tokens/api-tokens.service.js';

/**
 * Valida que o API_TOKEN_PEPPER está configurado e com comprimento seguro
 * Deve ser chamado ANTES de instanciar qualquer serviço que use tokens
 */
export function validateApiTokenPepper(): void {
  const pepper = process.env.API_TOKEN_PEPPER;

  if (!pepper) {
    throw new Error(
      '❌ API_TOKEN_PEPPER não está configurado. Adicione ao .env:\n' +
      'API_TOKEN_PEPPER=<use: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))">'
    );
  }

  if (pepper.length < 32) {
    throw new Error(
      `❌ API_TOKEN_PEPPER muito curto (${pepper.length} chars). Mínimo 32 caracteres.`
    );
  }
}

/**
 * Inicializa o serviço de API tokens com validação
 */
export function initializeApiTokensService(): ApiTokensService {
  validateApiTokenPepper();
  return new ApiTokensService();
}
