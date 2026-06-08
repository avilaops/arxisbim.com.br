import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and } from 'drizzle-orm';
import { users, tenants } from '../../shared/database/schema/tenants.js';
import { memberships } from '../../shared/database/schema/workspaces.js';
import { personalTenant } from '../tenancy/tenant-derivation.js';
import { userSessions } from '../../shared/database/schema/observability.js';
import { observabilityService } from '../observability/service.js';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

type OAuthProvider = 'google' | 'github';

interface OAuthProfile {
  id: string;
  email: string;
  name: string;
  provider: OAuthProvider;
}

const REFRESH_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export class OAuthService {
  private db;

  constructor() {
    const client = postgres(process.env.DATABASE_URL!);
    this.db = drizzle(client, { schema: { users, tenants, userSessions } });
  }

  /**
   * Find or create a user by OAuth profile, then issue tokens.
   * - If a user with this oauth_provider+oauth_id exists → log in.
   * - If a user with this email exists (password account) → link the OAuth provider.
   * - Otherwise → create a new user (auto-verified, isActive=true).
   */
  async loginOrCreate(
    profile: OAuthProfile,
    ip?: string,
    userAgent?: string,
  ): Promise<{ token: string; refreshToken: string; user: Record<string, unknown>; isNewUser: boolean }> {
    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      throw new Error('JWT secrets not configured');
    }

    // 1. Look up by provider+id
    let [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.oauthProvider, profile.provider), eq(users.oauthId, profile.id)))
      .limit(1);

    let isNewUser = false;

    if (!user) {
      // 2. Try to find by email (link existing password account)
      const [byEmail] = await this.db
        .select()
        .from(users)
        .where(eq(users.email, profile.email))
        .limit(1);

      if (byEmail) {
        // Link OAuth to existing account
        [user] = await this.db
          .update(users)
          .set({ oauthProvider: profile.provider, oauthId: profile.id, emailVerified: true, isActive: true })
          .where(eq(users.id, byEmail.id))
          .returning();
      } else {
        // 3. Create new user
        isNewUser = true;
        // Isolamento: novo usuário OAuth nasce no seu próprio tenant único.
        // Entrar em outro tenant é só via convite aceito (fluxo separado).
        const tenantSlug = personalTenant(profile.email);

        // Ensure tenant exists
        const [existingTenant] = await this.db
          .select()
          .from(tenants)
          .where(eq(tenants.tenantId, tenantSlug))
          .limit(1);

        if (!existingTenant) {
          await this.db
            .insert(tenants)
            .values({ tenantId: tenantSlug, name: tenantSlug, isActive: true })
            .onConflictDoNothing();
        }

        [user] = await this.db
          .insert(users)
          .values({
            email: profile.email,
            name: profile.name || profile.email.split('@')[0],
            passwordHash: randomBytes(32).toString('hex'), // unusable hash — OAuth users have no password
            tenantId: tenantSlug,
            role: 'user',
            permissions: [],
            emailVerified: true,  // OAuth provider already verified the email
            isActive: true,
            oauthProvider: profile.provider,
            oauthId: profile.id,
          })
          .returning();

        // Membership: novo usuário OAuth é owner do seu workspace.
        await this.db.insert(memberships)
          .values({ userId: user.id, tenantId: tenantSlug, role: 'owner', status: 'active' })
          .onConflictDoNothing();
      }
    }

    if (!user.isActive) throw new Error('Conta inativa');

    // Update last login
    await this.db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    // Issue tokens
    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name, tenantId: user.tenantId, role: user.role, permissions: user.permissions || [] },
      process.env.JWT_SECRET,
      { expiresIn: '15m' },
    );

    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email, tenantId: user.tenantId, jti: randomBytes(16).toString('hex') },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' },
    );

    await this.db.insert(userSessions).values({
      userId: user.id,
      tenantId: user.tenantId,
      refreshToken,
      ipAddress: ip,
      userAgent,
      expiresAt: new Date(Date.now() + REFRESH_EXPIRY_MS),
      isRevoked: false,
      isActive: true,
    });

    const event = isNewUser ? 'auth.oauth.register' : 'auth.oauth.login';
    observabilityService.logAudit({
      tenantId: user.tenantId, userId: user.id, action: event, resource: 'auth',
      metadata: { provider: profile.provider, ip },
    }).catch(() => {});
    observabilityService.incrementCounter(user.tenantId, 'auth.login.total', { success: 'true', method: profile.provider }).catch(() => {});

    return {
      token,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, tenantId: user.tenantId, role: user.role },
      isNewUser,
    };
  }

  /** Exchange GitHub code for access token, then fetch user profile. */
  async fetchGitHubProfile(code: string): Promise<OAuthProfile> {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error('GitHub OAuth not configured');

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
    if (!tokenData.access_token) throw new Error(`GitHub token error: ${tokenData.error ?? 'unknown'}`);

    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, 'User-Agent': 'ArxisVR' },
    });
    const ghUser = await userRes.json() as { id: number; login: string; name?: string; email?: string };

    // GitHub may not expose email — fetch separately
    let email = ghUser.email;
    if (!email) {
      const emailRes = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${tokenData.access_token}`, 'User-Agent': 'ArxisVR' },
      });
      const emails = await emailRes.json() as Array<{ email: string; primary: boolean; verified: boolean }>;
      email = emails.find(e => e.primary && e.verified)?.email ?? emails[0]?.email;
    }
    if (!email) throw new Error('GitHub account has no accessible email');

    return { id: String(ghUser.id), email, name: ghUser.name || ghUser.login, provider: 'github' };
  }

  /** Exchange Google code for access token, then fetch user profile. */
  async fetchGoogleProfile(code: string, redirectUri: string): Promise<OAuthProfile> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error('Google OAuth not configured');

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
    });
    const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
    if (!tokenData.access_token) throw new Error(`Google token error: ${tokenData.error ?? 'unknown'}`);

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const gUser = await userRes.json() as { id: string; email: string; name: string; verified_email: boolean };
    if (!gUser.email) throw new Error('Google account has no email');

    return { id: gUser.id, email: gUser.email, name: gUser.name, provider: 'google' };
  }
}

export const oauthService = new OAuthService();
