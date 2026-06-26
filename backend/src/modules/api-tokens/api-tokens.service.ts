import { db } from '../../shared/database/index.js';
import { sql } from 'drizzle-orm';
import { generateApiToken, hashApiToken, getTokenPrefix, isValidApiTokenFormat } from './utils/generateApiToken.js';

type ApiTokenScope =
  | 'projects:read'
  | 'projects:write'
  | 'models:read'
  | 'models:write'
  | 'planning:read'
  | 'planning:write'
  | 'budgets:read'
  | 'budgets:write'
  | 'scenarios:read'
  | 'scenarios:write';

interface CreateTokenInput {
  tenantId: string;
  createdById: string;
  name: string;
  scopes: ApiTokenScope[];
  environment: 'live' | 'test';
  expiresAt: Date | null;
}

interface ApiTokenRow {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  environment: 'live' | 'test';
  expires_at: Date | null;
  created_at: Date;
  last_used_at: Date | null;
  last_used_ip: string | null;
  revoked_at: Date | null;
}

export class ApiTokensService {
  /**
   * Criar novo token API
   * Retorna plainToken (mostrado UMA VEZ) e o token registrado (sem secrets)
   */
  async createToken(input: CreateTokenInput) {
    // Validações
    if (!input.scopes || input.scopes.length === 0) {
      throw new Error('Token deve ter pelo menos um escopo');
    }

    const plainToken = generateApiToken(input.environment);
    const tokenHash = hashApiToken(plainToken);
    const tokenPrefix = getTokenPrefix(plainToken);

    // Salvar no banco (apenas hash, nunca plaintext)
    const [row] = await db.execute(sql`
      INSERT INTO api_tokens (
        tenant_id,
        created_by_id,
        name,
        prefix,
        token_hash,
        scopes,
        environment,
        expires_at
      ) VALUES (
        ${input.tenantId},
        ${input.createdById},
        ${input.name},
        ${tokenPrefix},
        ${tokenHash},
        ${JSON.stringify(input.scopes)},
        ${input.environment},
        ${input.expiresAt}
      )
      RETURNING
        id,
        name,
        prefix,
        scopes,
        environment,
        expires_at,
        created_at,
        last_used_at,
        last_used_ip,
        revoked_at
    `);

    const token = this.formatToken(row as unknown as ApiTokenRow);

    // Audit log: registrar criação (sem token plaintext)
    await this.logAuditAction(input.tenantId, (row as any).id, 'created', tokenPrefix, input.createdById);

    return {
      token,
      plainToken, // Mostrar UMA VEZ ao usuário — nunca mais
    };
  }

  /**
   * Listar tokens do tenant (sem plaintext)
   */
  async listTokens(tenantId: string) {
    const rows = await db.execute(sql`
      SELECT
        id,
        name,
        prefix,
        scopes,
        environment,
        expires_at,
        created_at,
        last_used_at,
        last_used_ip,
        revoked_at
      FROM api_tokens
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
    `);

    return (rows as unknown as ApiTokenRow[]).map((row) => this.formatToken(row));
  }

  /**
   * Buscar token por hash (autenticação)
   * Retorna null se expirado, revogado ou não encontrado
   */
  async findByHash(tokenHash: string) {
    const [row] = await db.execute(sql`
      SELECT
        id,
        tenant_id,
        scopes,
        environment,
        expires_at,
        revoked_at,
        prefix
      FROM api_tokens
      WHERE token_hash = ${tokenHash}
      LIMIT 1
    `);

    if (!row) return null;

    const token = row as any;

    // Token revogado
    if (token.revoked_at) {
      return null;
    }

    // Token expirado
    if (token.expires_at && token.expires_at < new Date()) {
      return null;
    }

    return token;
  }

  /**
   * Registrar uso do token (chamado em cada request autenticado)
   */
  async recordTokenUsage(tokenId: string, tenantId: string, ip: string): Promise<void> {
    // Atualizar last_used_at
    await db.execute(sql`
      UPDATE api_tokens
      SET
        last_used_at = NOW(),
        last_used_ip = ${ip}
      WHERE id = ${tokenId} AND tenant_id = ${tenantId}
    `);

    // Audit log (sem expor token)
    await db.execute(sql`
      INSERT INTO api_token_audit_logs (
        token_id,
        tenant_id,
        action,
        ip_address
      ) VALUES (
        ${tokenId},
        ${tenantId},
        'used',
        ${ip}
      )
    `);
  }

  /**
   * Registrar falha de autenticação
   */
  async recordFailedAuth(tenantId: string, errorMessage: string, ip: string, userAgent?: string): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO api_token_audit_logs (
          token_id,
          tenant_id,
          action,
          ip_address,
          user_agent,
          error_message
        ) VALUES (
          NULL,
          ${tenantId},
          'failed_auth',
          ${ip},
          ${userAgent || null},
          ${errorMessage}
        )
      `);
    } catch (err) {
      // Falha de auditoria não deve bloquear a operação
      console.error('Failed to record failed auth:', err);
    }
  }

  /**
   * Registrar escopo negado
   */
  async recordScopeDenied(tokenId: string, tenantId: string, requiredScopes: string[], ip: string): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO api_token_audit_logs (
          token_id,
          tenant_id,
          action,
          ip_address,
          error_message
        ) VALUES (
          ${tokenId},
          ${tenantId},
          'scope_denied',
          ${ip},
          ${'Required scopes: ' + requiredScopes.join(', ')}
        )
      `);
    } catch (err) {
      console.error('Failed to record scope denial:', err);
    }
  }

  /**
   * Revogar token (não apagar, apenas marcar como revoked)
   * Mantém auditoria intacta
   */
  async revokeToken(tenantId: string, tokenId: string, revokedBy: string): Promise<void> {
    // Buscar token antes de revogar
    const [tokenRow] = await db.execute(sql`
      SELECT id, prefix FROM api_tokens
      WHERE id = ${tokenId} AND tenant_id = ${tenantId}
      LIMIT 1
    `);

    if (!tokenRow) throw new Error('Token not found or not owned by this tenant');

    // Marcar como revogado
    await db.execute(sql`
      UPDATE api_tokens
      SET revoked_at = NOW()
      WHERE id = ${tokenId}
    `);

    // Audit log
    await this.logAuditAction(tenantId, tokenId, 'revoked', (tokenRow as any).prefix, revokedBy);
  }

  /**
   * Formatar token para resposta (público)
   */
  private formatToken(row: ApiTokenRow) {
    return {
      id: row.id,
      name: row.name,
      prefix: row.prefix, // Público: arx_live_abc12345••••••••••Z9K8
      scopes: row.scopes,
      environment: row.environment,
      expiresAt: row.expires_at ? row.expires_at.toISOString() : null,
      createdAt: row.created_at.toISOString(),
      lastUsedAt: row.last_used_at ? row.last_used_at.toISOString() : null,
      lastUsedIp: row.last_used_ip,
      revokedAt: row.revoked_at ? row.revoked_at.toISOString() : null,
    };
  }

  /**
   * Audit log helper (nunca expõe token plaintext)
   */
  private async logAuditAction(
    tenantId: string,
    tokenId: string,
    action: string,
    tokenPrefix: string,
    userId?: string
  ): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO api_token_audit_logs (
          token_id,
          tenant_id,
          user_id,
          action,
          token_prefix
        ) VALUES (
          ${tokenId},
          ${tenantId},
          ${userId || null},
          ${action},
          ${tokenPrefix}
        )
      `);
    } catch (err) {
      console.error('Failed to log audit action:', err);
      // Não falha a operação por causa de logs
    }
  }
}

// Singleton instance (será instanciado com validação no index.ts)
let instance: ApiTokensService | null = null;

export function setApiTokensService(service: ApiTokensService) {
  instance = service;
}

export function getApiTokensService(): ApiTokensService {
  if (!instance) {
    throw new Error('ApiTokensService não foi inicializado. Chame initializeApiTokensService() no index.ts');
  }
  return instance;
}
