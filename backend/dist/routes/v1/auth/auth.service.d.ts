import type { RegisterInput, LoginInput } from './auth.schemas.js';
export declare class AuthService {
    private db;
    constructor();
    /**
     * Generate a unique tenant slug from a company name.
     * Removes diacritics, lowercases, replaces non-alphanumerics with '-' and
     * appends a short random suffix to guarantee uniqueness.
     */
    private generateTenantSlug;
    /**
     * Register new user (multi-tenant aware).
     * - If `companyName` is provided and `tenantId` is not, creates a new tenant
     *   with a generated slug and registers the user as 'owner'.
     * - If `tenantId` is provided, joins an existing tenant as 'user'.
     */
    register(input: RegisterInput): Promise<{
        user: {
            id: any;
            email: any;
            name: any;
            role: any;
            tenantId: any;
            companyId: any;
        };
        accessToken: string;
        refreshToken: string;
        sessionId: string;
    }>;
    /**
     * Login user.
     * - If `tenantId` is provided, restricts the lookup to that tenant.
     * - Otherwise, finds the user globally by email (email is globally unique).
     */
    login(input: LoginInput, tenantId?: string): Promise<{
        user: {
            id: any;
            email: any;
            name: any;
            role: any;
            tenantId: any;
            companyId: any;
        };
        accessToken: string;
        refreshToken: string;
        sessionId: string;
    }>;
    /**
     * Refresh access token
     */
    refreshToken(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    /**
     * Get user by ID (tenant-isolated)
     */
    getUserById(userId: string, tenantId: string): Promise<{
        id: any;
        email: any;
        name: any;
        role: any;
        tenantId: any;
        companyId: any;
        permissions: any;
    }>;
    /**
     * Generate JWT access token with tenant context
     */
    private generateAccessToken;
    /**
     * Generate JWT refresh token
     */
    private generateRefreshToken;
    /**
     * Create session and store refresh token
     */
    private createSession;
    /**
     * Logout - Revoke refresh token
     */
    logout(refreshToken: string): Promise<void>;
    /**
     * Change password
     */
    changePassword(userId: string, tenantId: string, currentPassword: string, newPassword: string): Promise<void>;
    /**
     * Update user profile
     */
    updateProfile(userId: string, tenantId: string, data: {
        name?: string;
        companyId?: string;
    }): Promise<any>;
    /**
     * Get all active sessions for a user
     */
    getUserSessions(userId: string, tenantId: string): Promise<any[]>;
    /**
     * Revoke specific session
     */
    revokeSession(userId: string, tenantId: string, sessionId: string): Promise<void>;
    /**
     * Request password reset - Generate reset token
     */
    requestPasswordReset(email: string, tenantId: string): Promise<string>;
    /**
     * Reset password using token
     */
    resetPassword(token: string, newPassword: string): Promise<void>;
    /**
     * Send email verification token
     */
    sendEmailVerification(userId: string, tenantId: string): Promise<string>;
    /**
     * Verify email using token
     */
    verifyEmail(token: string): Promise<{
        success: boolean;
        email?: string;
    }>;
}
//# sourceMappingURL=auth.service.d.ts.map