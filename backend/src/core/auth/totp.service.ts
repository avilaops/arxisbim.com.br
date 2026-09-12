import { TOTP, NobleCryptoPlugin, ScureBase32Plugin, generateSecret, verify as otpVerify, generateURI } from 'otplib';
import { toDataURL } from 'qrcode';
import { randomBytes } from 'crypto';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { users } from '../../shared/database/schema/tenants.js';
import jwt from 'jsonwebtoken';

const APP_NAME = 'Arxis';
const BACKUP_CODE_COUNT = 8;
const CHALLENGE_EXPIRY = '10m';

// Shared plugin instances
const crypto = new NobleCryptoPlugin();
const base32 = new ScureBase32Plugin();
const totp = new TOTP({ crypto, base32 });

async function totpVerify(token: string, secret: string): Promise<boolean> {
  try {
    const result = await otpVerify({ token, secret, crypto, base32 });
    return result.valid;
  } catch {
    return false;
  }
}

async function totpGenerate(secret: string): Promise<string> {
  return totp.generate({ secret });
}

function totpKeyUri(email: string, secret: string): string {
  return generateURI({ label: email, issuer: APP_NAME, secret, algorithm: 'sha1', digits: 6, period: 30 });
}

export class TotpService {
  private db;

  constructor() {
    const client = postgres(process.env.DATABASE_URL!, { max: 3 });
    this.db = drizzle(client, { schema: { users } });
  }

  /**
   * Step 1: generate a new TOTP secret for the user (not yet enabled).
   * Returns QR code data URL + backup codes.
   */
  async setupTotp(userId: string): Promise<{ qrCodeDataUrl: string; backupCodes: string[] }> {
    const secret = generateSecret({ crypto });
    const backupCodes = this.generateBackupCodes();

    await this.db
      .update(users)
      .set({
        twoFactorSecret: secret,
        twoFactorBackupCodes: JSON.stringify(backupCodes),
        twoFactorEnabled: false,
      })
      .where(eq(users.id, userId));

    const [user] = await this.db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const otpAuth = totpKeyUri(user.email, secret);
    const qrCodeDataUrl = await toDataURL(otpAuth);

    return { qrCodeDataUrl, backupCodes };
  }

  /**
   * Step 2: user enters first TOTP code to confirm setup.
   */
  async verifySetup(userId: string, code: string): Promise<void> {
    const [user] = await this.db
      .select({ twoFactorSecret: users.twoFactorSecret })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user?.twoFactorSecret) throw new Error('2FA setup not initiated');

    const valid = await totpVerify(code, user.twoFactorSecret);
    if (!valid) throw new Error('Código inválido');

    await this.db
      .update(users)
      .set({ twoFactorEnabled: true })
      .where(eq(users.id, userId));
  }

  /**
   * Disable 2FA (requires the current TOTP code or a backup code).
   */
  async disable(userId: string, code: string): Promise<void> {
    const [user] = await this.db
      .select({ twoFactorSecret: users.twoFactorSecret, twoFactorBackupCodes: users.twoFactorBackupCodes })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user?.twoFactorSecret) throw new Error('2FA não está ativado');

    const validTotp = await totpVerify(code, user.twoFactorSecret);
    const backupResult = validTotp ? null : this.consumeBackupCode(user.twoFactorBackupCodes, code);

    if (!validTotp && !backupResult) throw new Error('Código inválido');

    await this.db
      .update(users)
      .set({
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: backupResult ? backupResult.remaining : null,
      })
      .where(eq(users.id, userId));
  }

  /**
   * Issue a short-lived challenge token after password is verified.
   */
  issueChallengeToken(userId: string, tenantId: string): string {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET not set');
    return jwt.sign(
      { userId, tenantId, type: '2fa_challenge' },
      process.env.JWT_SECRET,
      { expiresIn: CHALLENGE_EXPIRY },
    );
  }

  /**
   * Verify TOTP code + challenge token at login.
   */
  async verifyLoginCode(challengeToken: string, code: string): Promise<{ userId: string; tenantId: string }> {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET not set');

    let payload: any;
    try {
      payload = jwt.verify(challengeToken, process.env.JWT_SECRET);
    } catch {
      throw new Error('Challenge token inválido ou expirado');
    }

    if (payload.type !== '2fa_challenge') throw new Error('Token inválido');

    const [user] = await this.db
      .select({ twoFactorSecret: users.twoFactorSecret, twoFactorBackupCodes: users.twoFactorBackupCodes })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user?.twoFactorSecret) throw new Error('2FA não configurado');

    const validTotp = await totpVerify(code, user.twoFactorSecret);
    if (!validTotp) {
      const backup = this.consumeBackupCode(user.twoFactorBackupCodes, code);
      if (!backup) throw new Error('Código inválido');
      await this.db
        .update(users)
        .set({ twoFactorBackupCodes: backup.remaining })
        .where(eq(users.id, payload.userId));
    }

    return { userId: payload.userId, tenantId: payload.tenantId };
  }

  private generateBackupCodes(): string[] {
    return Array.from({ length: BACKUP_CODE_COUNT }, () =>
      randomBytes(4).toString('hex').toUpperCase(),
    );
  }

  private consumeBackupCode(
    stored: string | null | undefined,
    code: string,
  ): { remaining: string } | null {
    if (!stored) return null;
    let codes: string[];
    try { codes = JSON.parse(stored); } catch { return null; }
    const idx = codes.indexOf(code.toUpperCase());
    if (idx === -1) return null;
    codes.splice(idx, 1);
    return { remaining: JSON.stringify(codes) };
  }
}

export const totpService = new TotpService();
