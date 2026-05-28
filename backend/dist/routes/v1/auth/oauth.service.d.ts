/**
 * OAuth Service
 * Integração com provedores OAuth (Google, GitHub)
 */
export interface OAuthUserInfo {
    id: string;
    email: string;
    name: string;
    picture?: string;
    provider: 'google' | 'github';
}
export declare class OAuthService {
    private authService;
    constructor();
    /**
     * Get Google OAuth authorization URL
     */
    getGoogleAuthUrl(tenantId: string): string;
    /**
     * Get GitHub OAuth authorization URL
     */
    getGitHubAuthUrl(tenantId: string): string;
    /**
     * Exchange Google authorization code for tokens and get user info
     */
    handleGoogleCallback(code: string, tenantId: string): Promise<any>;
    /**
     * Exchange GitHub authorization code for tokens and get user info
     */
    handleGitHubCallback(code: string, tenantId: string): Promise<any>;
    /**
     * Handle OAuth user - create or login
     */
    private handleOAuthUser;
}
//# sourceMappingURL=oauth.service.d.ts.map