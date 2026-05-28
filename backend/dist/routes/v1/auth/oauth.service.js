/**
 * OAuth Service
 * Integração com provedores OAuth (Google, GitHub)
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and } from 'drizzle-orm';
import { users } from '../../../shared/database/schema/tenants.js';
import { userSessions } from '../../../shared/database/schema/observability.js';
import { AuthService } from './auth.service.js';
import { observabilityService } from '../../../core/observability/service.js';
const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client, { schema: { users, userSessions } });
// Google OAuth Config
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/v1/auth/google/callback';
// GitHub OAuth Config
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI || 'http://localhost:3001/api/v1/auth/github/callback';
export class OAuthService {
    authService;
    constructor() {
        this.authService = new AuthService();
    }
    /**
     * Get Google OAuth authorization URL
     */
    getGoogleAuthUrl(tenantId) {
        if (!GOOGLE_CLIENT_ID) {
            throw new Error('Google OAuth is not configured');
        }
        const params = new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            redirect_uri: GOOGLE_REDIRECT_URI,
            response_type: 'code',
            scope: 'openid email profile',
            access_type: 'offline',
            prompt: 'consent',
            state: tenantId, // Pass tenantId in state
        });
        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }
    /**
     * Get GitHub OAuth authorization URL
     */
    getGitHubAuthUrl(tenantId) {
        if (!GITHUB_CLIENT_ID) {
            throw new Error('GitHub OAuth is not configured');
        }
        const params = new URLSearchParams({
            client_id: GITHUB_CLIENT_ID,
            redirect_uri: GITHUB_REDIRECT_URI,
            scope: 'read:user user:email',
            state: tenantId, // Pass tenantId in state
        });
        return `https://github.com/login/oauth/authorize?${params.toString()}`;
    }
    /**
     * Exchange Google authorization code for tokens and get user info
     */
    async handleGoogleCallback(code, tenantId) {
        if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
            throw new Error('Google OAuth is not configured');
        }
        // Exchange code for access token
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: GOOGLE_REDIRECT_URI,
                grant_type: 'authorization_code',
            }),
        });
        if (!tokenResponse.ok) {
            throw new Error('Failed to exchange Google authorization code');
        }
        const { access_token } = await tokenResponse.json();
        // Get user info
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` },
        });
        if (!userInfoResponse.ok) {
            throw new Error('Failed to fetch Google user info');
        }
        const userInfo = await userInfoResponse.json();
        return this.handleOAuthUser({
            id: userInfo.id,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture,
            provider: 'google',
        }, tenantId);
    }
    /**
     * Exchange GitHub authorization code for tokens and get user info
     */
    async handleGitHubCallback(code, tenantId) {
        if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
            throw new Error('GitHub OAuth is not configured');
        }
        // Exchange code for access token
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                code,
                client_id: GITHUB_CLIENT_ID,
                client_secret: GITHUB_CLIENT_SECRET,
                redirect_uri: GITHUB_REDIRECT_URI,
            }),
        });
        if (!tokenResponse.ok) {
            throw new Error('Failed to exchange GitHub authorization code');
        }
        const { access_token } = await tokenResponse.json();
        // Get user info
        const userInfoResponse = await fetch('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${access_token}`,
                Accept: 'application/json',
            },
        });
        if (!userInfoResponse.ok) {
            throw new Error('Failed to fetch GitHub user info');
        }
        const userInfo = await userInfoResponse.json();
        // Get primary email
        const emailsResponse = await fetch('https://api.github.com/user/emails', {
            headers: {
                Authorization: `Bearer ${access_token}`,
                Accept: 'application/json',
            },
        });
        const emails = await emailsResponse.json();
        const primaryEmail = emails.find(e => e.primary)?.email || userInfo.email;
        return this.handleOAuthUser({
            id: userInfo.id.toString(),
            email: primaryEmail,
            name: userInfo.name || userInfo.login,
            picture: userInfo.avatar_url,
            provider: 'github',
        }, tenantId);
    }
    /**
     * Handle OAuth user - create or login
     */
    async handleOAuthUser(oauthUser, tenantId) {
        // Check if user exists
        const [existingUser] = await db
            .select()
            .from(users)
            .where(and(eq(users.email, oauthUser.email), eq(users.tenantId, tenantId)))
            .limit(1);
        if (existingUser) {
            // User exists - login
            await db
                .update(users)
                .set({ lastLoginAt: new Date() })
                .where(eq(users.id, existingUser.id));
            // Log de auditoria
            await observabilityService.logAudit({
                tenantId,
                userId: existingUser.id,
                action: 'user.oauth_login',
                resource: 'auth',
                resourceId: existingUser.id,
                metadata: {
                    provider: oauthUser.provider,
                    email: oauthUser.email,
                },
            }).catch(err => console.error('Failed to log audit:', err));
            // Generate tokens
            return this.authService.getUserById(existingUser.id, tenantId).then(user => {
                const accessToken = this.authService.generateAccessToken(user.id, user.tenantId, user.role);
                return this.authService.createSession(user.id, user.tenantId).then((session) => ({
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        tenantId: user.tenantId,
                        companyId: user.companyId,
                    },
                    accessToken,
                    refreshToken: session.token,
                    sessionId: session.sessionId,
                    isNewUser: false,
                }));
            });
        }
        else {
            // User doesn't exist - create
            const [newUser] = await db
                .insert(users)
                .values({
                email: oauthUser.email,
                name: oauthUser.name,
                passwordHash: '', // OAuth users don't have password
                tenantId,
                role: 'user',
                isActive: true,
                permissions: {},
            })
                .returning();
            // Log de auditoria
            await observabilityService.logAudit({
                tenantId,
                userId: newUser.id,
                action: 'user.oauth_created',
                resource: 'user',
                resourceId: newUser.id,
                metadata: {
                    provider: oauthUser.provider,
                    email: oauthUser.email,
                    name: oauthUser.name,
                },
            }).catch(err => console.error('Failed to log audit:', err));
            // Generate tokens
            const accessToken = this.authService.generateAccessToken(newUser.id, newUser.tenantId, newUser.role);
            const session = await this.authService.createSession(newUser.id, newUser.tenantId);
            return {
                user: {
                    id: newUser.id,
                    email: newUser.email,
                    name: newUser.name,
                    role: newUser.role,
                    tenantId: newUser.tenantId,
                    companyId: newUser.companyId,
                },
                accessToken,
                refreshToken: session.token,
                sessionId: session.sessionId,
                isNewUser: true,
            };
        }
    }
}
//# sourceMappingURL=oauth.service.js.map