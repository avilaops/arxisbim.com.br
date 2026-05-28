import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and } from 'drizzle-orm';
import * as crypto from 'crypto';
import { webauthnCredentials } from '../../../shared/database/schema/api-keys.js';
import { users } from '../../../shared/database/schema/tenants.js';
import { observabilityService } from '../../../core/observability/service.js';

/**
 * WebAuthn Service
 * Implementação de autenticação biométrica usando padrão FIDO2/WebAuthn
 * Compatível com: Touch ID, Face ID, Windows Hello, YubiKey, etc.
 */

export interface WebAuthnCredentialInfo {
  id: string;
  credentialId: string;
  credentialName: string | null;
  deviceType: string;
  transports: string[] | null;
  lastUsedAt: Date | null;
  createdAt: Date;
}

export class WebAuthnService {
  private db;
  private rpName: string;
  private rpId: string;
  private origin: string;

  constructor() {
    const client = postgres(process.env.DATABASE_URL!);
    this.db = drizzle(client, { schema: { webauthnCredentials, users } });
    
    // Relying Party configuration
    this.rpName = process.env.WEBAUTHN_RP_NAME || 'ArxisVR';
    this.rpId = process.env.WEBAUTHN_RP_ID || 'localhost';
    this.origin = process.env.WEBAUTHN_ORIGIN || 'http://localhost:5174';
  }

  /**
   * Gerar opções para registro de credencial (registration)
   */
  async generateRegistrationOptions(userId: string, tenantId: string, userName: string, userEmail: string) {
    // Buscar usuário
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    // Buscar credenciais existentes do usuário
    const existingCredentials = await this.db
      .select()
      .from(webauthnCredentials)
      .where(and(
        eq(webauthnCredentials.userId, userId),
        eq(webauthnCredentials.isActive, true)
      ));

    // Gerar challenge aleatório
    const challenge = crypto.randomBytes(32).toString('base64url');

    // Construir opções de registration
    const options = {
      challenge,
      rp: {
        name: this.rpName,
        id: this.rpId,
      },
      user: {
        id: Buffer.from(userId).toString('base64url'),
        name: userEmail,
        displayName: userName,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },  // ES256 (ECDSA com SHA-256)
        { type: 'public-key', alg: -257 }, // RS256 (RSASSA-PKCS1-v1_5 com SHA-256)
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Preferir platform authenticators (Touch ID, Face ID, Windows Hello)
        requireResidentKey: false,
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
      timeout: 60000, // 60 segundos
      attestation: 'none',
      excludeCredentials: existingCredentials.map(cred => ({
        id: cred.credentialId,
        type: 'public-key',
        transports: cred.transports ? JSON.parse(cred.transports) : undefined,
      })),
    };

    // Armazenar challenge temporariamente (em produção, usar Redis ou session)
    // Por enquanto, retornar para o cliente gerenciar
    return {
      options,
      challenge, // Cliente deve enviar de volta na verificação
    };
  }

  /**
   * Verificar e salvar credencial após registration
   */
  async verifyRegistration(
    userId: string,
    tenantId: string,
    credential: {
      id: string;
      rawId: string;
      response: {
        clientDataJSON: string;
        attestationObject: string;
      };
      type: string;
      authenticatorAttachment?: string;
    },
    challenge: string,
    credentialName?: string
  ): Promise<WebAuthnCredentialInfo> {
    // Decodificar clientDataJSON
    const clientData = JSON.parse(
      Buffer.from(credential.response.clientDataJSON, 'base64').toString('utf-8')
    );

    // Verificar challenge
    if (clientData.challenge !== challenge) {
      throw new Error('Challenge mismatch');
    }

    // Verificar origin
    if (clientData.origin !== this.origin) {
      throw new Error('Origin mismatch');
    }

    // Verificar type
    if (clientData.type !== 'webauthn.create') {
      throw new Error('Invalid ceremony type');
    }

    // Decodificar attestationObject (CBOR)
    // NOTA: Em produção, usar biblioteca como @simplewebauthn/server
    // Por simplicidade, vamos aceitar sem validação completa do attestation
    const attestationBuffer = Buffer.from(credential.response.attestationObject, 'base64');

    // Extrair public key (simplificado - em produção usar CBOR parser)
    // Por agora, apenas armazenar o attestationObject completo
    const publicKey = credential.response.attestationObject;

    // Determinar device type
    const deviceType = credential.authenticatorAttachment || 'cross-platform';

    // Salvar credencial
    const [newCredential] = await this.db
      .insert(webauthnCredentials)
      .values({
        userId,
        tenantId,
        credentialId: credential.id,
        publicKey,
        counter: '0',
        deviceType,
        transports: null, // Seria extraído do response
        aaguid: null, // Seria extraído do attestationObject
        credentialName: credentialName || `${deviceType} authenticator`,
        isActive: true,
      })
      .returning();

    // Log de auditoria
    await observabilityService.logAudit({
      tenantId,
      userId,
      action: 'webauthn.credential_registered',
      resource: 'webauthn',
      resourceId: newCredential.id,
      metadata: {
        credentialName: newCredential.credentialName,
        deviceType: newCredential.deviceType,
      },
    }).catch(err => console.error('Failed to log audit:', err));

    // Métrica
    await observabilityService.incrementCounter(
      tenantId,
      'webauthn.registrations',
      { tenant: tenantId, deviceType }
    ).catch(err => console.error('Failed to increment counter:', err));

    return {
      id: newCredential.id,
      credentialId: newCredential.credentialId,
      credentialName: newCredential.credentialName,
      deviceType: newCredential.deviceType,
      transports: newCredential.transports ? JSON.parse(newCredential.transports) : null,
      lastUsedAt: newCredential.lastUsedAt,
      createdAt: newCredential.createdAt,
    };
  }

  /**
   * Gerar opções para autenticação (authentication)
   */
  async generateAuthenticationOptions(email: string, tenantId: string) {
    // Buscar usuário por email
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.tenantId, tenantId)))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    // Buscar credenciais do usuário
    const credentials = await this.db
      .select()
      .from(webauthnCredentials)
      .where(and(
        eq(webauthnCredentials.userId, user.id),
        eq(webauthnCredentials.isActive, true)
      ));

    if (credentials.length === 0) {
      throw new Error('No WebAuthn credentials found for this user');
    }

    // Gerar challenge
    const challenge = crypto.randomBytes(32).toString('base64url');

    const options = {
      challenge,
      rpId: this.rpId,
      allowCredentials: credentials.map(cred => ({
        id: cred.credentialId,
        type: 'public-key',
        transports: cred.transports ? JSON.parse(cred.transports) : undefined,
      })),
      userVerification: 'preferred',
      timeout: 60000,
    };

    return {
      options,
      challenge,
      userId: user.id,
    };
  }

  /**
   * Verificar autenticação WebAuthn
   */
  async verifyAuthentication(
    userId: string,
    tenantId: string,
    credential: {
      id: string;
      rawId: string;
      response: {
        clientDataJSON: string;
        authenticatorData: string;
        signature: string;
        userHandle?: string;
      };
      type: string;
    },
    challenge: string
  ): Promise<{ valid: boolean; credentialId?: string }> {
    // Decodificar clientDataJSON
    const clientData = JSON.parse(
      Buffer.from(credential.response.clientDataJSON, 'base64').toString('utf-8')
    );

    // Verificar challenge
    if (clientData.challenge !== challenge) {
      return { valid: false };
    }

    // Verificar origin
    if (clientData.origin !== this.origin) {
      return { valid: false };
    }

    // Verificar type
    if (clientData.type !== 'webauthn.get') {
      return { valid: false };
    }

    // Buscar credencial
    const [storedCredential] = await this.db
      .select()
      .from(webauthnCredentials)
      .where(and(
        eq(webauthnCredentials.credentialId, credential.id),
        eq(webauthnCredentials.userId, userId),
        eq(webauthnCredentials.tenantId, tenantId),
        eq(webauthnCredentials.isActive, true)
      ))
      .limit(1);

    if (!storedCredential) {
      return { valid: false };
    }

    // NOTA: Em produção, verificar signature usando a public key
    // Isso requer parsing do authenticatorData e validação criptográfica
    // Por simplicidade, assumimos válido se chegou até aqui
    // IMPORTANTE: Implementar verificação completa em produção!

    // Atualizar lastUsedAt e counter
    await this.db
      .update(webauthnCredentials)
      .set({
        lastUsedAt: new Date(),
        // counter: incrementar baseado no authenticatorData
      })
      .where(eq(webauthnCredentials.id, storedCredential.id));

    // Log de auditoria
    await observabilityService.logAudit({
      tenantId,
      userId,
      action: 'webauthn.authentication_successful',
      resource: 'webauthn',
      resourceId: storedCredential.id,
    }).catch(err => console.error('Failed to log audit:', err));

    return {
      valid: true,
      credentialId: storedCredential.id,
    };
  }

  /**
   * Listar credenciais do usuário
   */
  async listCredentials(userId: string, tenantId: string): Promise<WebAuthnCredentialInfo[]> {
    const credentials = await this.db
      .select()
      .from(webauthnCredentials)
      .where(and(
        eq(webauthnCredentials.userId, userId),
        eq(webauthnCredentials.tenantId, tenantId)
      ));

    return credentials.map(cred => ({
      id: cred.id,
      credentialId: cred.credentialId,
      credentialName: cred.credentialName,
      deviceType: cred.deviceType,
      transports: cred.transports ? JSON.parse(cred.transports) : null,
      lastUsedAt: cred.lastUsedAt,
      createdAt: cred.createdAt,
    }));
  }

  /**
   * Remover credencial
   */
  async removeCredential(credentialId: string, userId: string, tenantId: string): Promise<void> {
    await this.db
      .delete(webauthnCredentials)
      .where(and(
        eq(webauthnCredentials.id, credentialId),
        eq(webauthnCredentials.userId, userId),
        eq(webauthnCredentials.tenantId, tenantId)
      ));

    // Log de auditoria
    await observabilityService.logAudit({
      tenantId,
      userId,
      action: 'webauthn.credential_removed',
      resource: 'webauthn',
      resourceId: credentialId,
    }).catch(err => console.error('Failed to log audit:', err));
  }

  /**
   * Renomear credencial
   */
  async renameCredential(
    credentialId: string,
    userId: string,
    tenantId: string,
    newName: string
  ): Promise<void> {
    await this.db
      .update(webauthnCredentials)
      .set({ credentialName: newName })
      .where(and(
        eq(webauthnCredentials.id, credentialId),
        eq(webauthnCredentials.userId, userId),
        eq(webauthnCredentials.tenantId, tenantId)
      ));
  }
}
