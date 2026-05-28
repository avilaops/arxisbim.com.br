import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and } from 'drizzle-orm';
import * as crypto from 'crypto';
import { users } from '../../../shared/database/schema/tenants.js';
import { observabilityService } from '../../../core/observability/service.js';

/**
 * Two-Factor Authentication Service (TOTP - Time-based One-Time Password)
 * Implementa autenticação de dois fatores compatível com Google Authenticator, Authy, etc.
 */

const TOTP_WINDOW = 1; // ±1 time window (30s)
const TOTP_STEP = 30; // 30 segundos
const TOTP_DIGITS = 6; // 6 dígitos

export class TwoFactorService {
  private db;

  constructor() {
    const client = postgres(process.env.DATABASE_URL!);
    this.db = drizzle(client, { schema: { users } });
  }

  /**
   * Gerar secret para 2FA (base32 encoded)
   */
  generateSecret(): string {
    const buffer = crypto.randomBytes(20);
    return this.base32Encode(buffer);
  }

  /**
   * Gerar QR Code URL para configuração no app authenticator
   */
  generateQRCodeUrl(email: string, secret: string, issuer: string = 'ArxisVR'): string {
    const encodedIssuer = encodeURIComponent(issuer);
    const encodedEmail = encodeURIComponent(email);
    
    // otpauth://totp/{issuer}:{email}?secret={secret}&issuer={issuer}
    return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_STEP}`;
  }

  /**
   * Habilitar 2FA para um usuário
   */
  async enable2FA(userId: string, tenantId: string): Promise<{ secret: string; qrCodeUrl: string; backupCodes: string[] }> {
    // Buscar usuário
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    // Gerar secret
    const secret = this.generateSecret();
    
    // Gerar backup codes (8 códigos de 8 caracteres)
    const backupCodes = this.generateBackupCodes(8);
    const hashedBackupCodes = backupCodes.map(code => 
      crypto.createHash('sha256').update(code).digest('hex')
    );

    // Atualizar usuário com 2FA
    await this.db
      .update(users)
      .set({
        twoFactorSecret: secret,
        twoFactorEnabled: false, // Ainda não ativado até verificar
        twoFactorBackupCodes: JSON.stringify(hashedBackupCodes),
      })
      .where(eq(users.id, userId));

    // Gerar URL do QR Code
    const qrCodeUrl = this.generateQRCodeUrl(user.email, secret);

    // Log de auditoria
    await observabilityService.logAudit({
      tenantId,
      userId,
      action: '2fa.setup_started',
      resource: 'auth',
      resourceId: userId,
    }).catch(err => console.error('Failed to log audit:', err));

    return {
      secret,
      qrCodeUrl,
      backupCodes, // Retornar apenas uma vez, usuário deve guardar
    };
  }

  /**
   * Verificar código TOTP e ativar 2FA
   */
  async verify2FASetup(userId: string, tenantId: string, code: string): Promise<boolean> {
    // Buscar usuário
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .limit(1);

    if (!user || !user.twoFactorSecret) {
      throw new Error('2FA setup not initiated');
    }

    // Verificar código
    const isValid = this.verifyTOTP(user.twoFactorSecret, code);

    if (!isValid) {
      return false;
    }

    // Ativar 2FA
    await this.db
      .update(users)
      .set({ twoFactorEnabled: true })
      .where(eq(users.id, userId));

    // Log de auditoria
    await observabilityService.logAudit({
      tenantId,
      userId,
      action: '2fa.enabled',
      resource: 'auth',
      resourceId: userId,
    }).catch(err => console.error('Failed to log audit:', err));

    // Métrica
    await observabilityService.incrementCounter(
      tenantId,
      'auth.2fa.enabled',
      { tenant: tenantId }
    ).catch(err => console.error('Failed to increment counter:', err));

    return true;
  }

  /**
   * Desabilitar 2FA
   */
  async disable2FA(userId: string, tenantId: string, password: string): Promise<void> {
    // Buscar usuário
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    // Verificar senha (segurança extra)
    const bcrypt = await import('bcrypt');
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      throw new Error('Invalid password');
    }

    // Desabilitar 2FA
    await this.db
      .update(users)
      .set({
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
      })
      .where(eq(users.id, userId));

    // Log de auditoria
    await observabilityService.logAudit({
      tenantId,
      userId,
      action: '2fa.disabled',
      resource: 'auth',
      resourceId: userId,
    }).catch(err => console.error('Failed to log audit:', err));
  }

  /**
   * Verificar código 2FA durante login
   */
  async verify2FALogin(userId: string, tenantId: string, code: string): Promise<boolean> {
    // Buscar usuário
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .limit(1);

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new Error('2FA not enabled for this user');
    }

    // Verificar código TOTP
    const isValid = this.verifyTOTP(user.twoFactorSecret, code);

    if (isValid) {
      // Log de auditoria
      await observabilityService.logAudit({
        tenantId,
        userId,
        action: '2fa.verified',
        resource: 'auth',
        resourceId: userId,
      }).catch(err => console.error('Failed to log audit:', err));

      return true;
    }

    // Se TOTP falhou, verificar backup codes
    if (user.twoFactorBackupCodes) {
      const backupCodes = JSON.parse(user.twoFactorBackupCodes as string) as string[];
      const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

      const codeIndex = backupCodes.indexOf(hashedCode);
      if (codeIndex !== -1) {
        // Backup code válido, remover da lista
        backupCodes.splice(codeIndex, 1);

        await this.db
          .update(users)
          .set({ twoFactorBackupCodes: JSON.stringify(backupCodes) })
          .where(eq(users.id, userId));

        // Log de auditoria
        await observabilityService.logAudit({
          tenantId,
          userId,
          action: '2fa.backup_code_used',
          resource: 'auth',
          resourceId: userId,
          metadata: { remainingCodes: backupCodes.length },
        }).catch(err => console.error('Failed to log audit:', err));

        return true;
      }
    }

    return false;
  }

  /**
   * Gerar novos backup codes
   */
  async regenerateBackupCodes(userId: string, tenantId: string): Promise<string[]> {
    // Buscar usuário
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .limit(1);

    if (!user || !user.twoFactorEnabled) {
      throw new Error('2FA not enabled');
    }

    // Gerar novos backup codes
    const backupCodes = this.generateBackupCodes(8);
    const hashedBackupCodes = backupCodes.map(code =>
      crypto.createHash('sha256').update(code).digest('hex')
    );

    await this.db
      .update(users)
      .set({ twoFactorBackupCodes: JSON.stringify(hashedBackupCodes) })
      .where(eq(users.id, userId));

    // Log de auditoria
    await observabilityService.logAudit({
      tenantId,
      userId,
      action: '2fa.backup_codes_regenerated',
      resource: 'auth',
      resourceId: userId,
    }).catch(err => console.error('Failed to log audit:', err));

    return backupCodes;
  }

  // =====================================
  // HELPER FUNCTIONS
  // =====================================

  /**
   * Verificar código TOTP
   */
  private verifyTOTP(secret: string, code: string): boolean {
    const now = Math.floor(Date.now() / 1000);
    
    // Verificar janela de tempo atual e adjacentes (±1)
    for (let i = -TOTP_WINDOW; i <= TOTP_WINDOW; i++) {
      const time = Math.floor(now / TOTP_STEP) + i;
      const expectedCode = this.generateTOTP(secret, time);
      
      if (expectedCode === code) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Gerar código TOTP para um determinado timestamp
   */
  private generateTOTP(secret: string, timeCounter: number): string {
    const key = this.base32Decode(secret);
    const time = Buffer.alloc(8);
    
    // Escrever timestamp como big-endian
    time.writeBigUInt64BE(BigInt(timeCounter), 0);
    
    // HMAC-SHA1
    const hmac = crypto.createHmac('sha1', key);
    hmac.update(time);
    const hash = hmac.digest();
    
    // Dynamic truncation
    const offset = hash[hash.length - 1] & 0x0f;
    const binary =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);
    
    const otp = binary % Math.pow(10, TOTP_DIGITS);
    return otp.toString().padStart(TOTP_DIGITS, '0');
  }

  /**
   * Gerar backup codes aleatórios
   */
  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    
    return codes;
  }

  /**
   * Base32 encode
   */
  private base32Encode(buffer: Buffer): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    let output = '';
    
    for (let i = 0; i < buffer.length; i++) {
      value = (value << 8) | buffer[i];
      bits += 8;
      
      while (bits >= 5) {
        output += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    
    if (bits > 0) {
      output += alphabet[(value << (5 - bits)) & 31];
    }
    
    return output;
  }

  /**
   * Base32 decode
   */
  private base32Decode(input: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleanInput = input.toUpperCase().replace(/=+$/, '');
    
    let bits = 0;
    let value = 0;
    const output: number[] = [];
    
    for (let i = 0; i < cleanInput.length; i++) {
      const idx = alphabet.indexOf(cleanInput[i]);
      if (idx === -1) throw new Error('Invalid base32 character');
      
      value = (value << 5) | idx;
      bits += 5;
      
      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }
    
    return Buffer.from(output);
  }
}
