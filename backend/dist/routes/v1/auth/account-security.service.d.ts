export declare class AccountSecurityService {
    private db;
    private loginAttempts;
    constructor();
    /**
     * Gerar token de verificação de email
     */
    generateEmailVerificationToken(userId: string, tenantId: string, email: string): Promise<string>;
    /**
     * Verificar email usando token
     */
    verifyEmail(verificationToken: string, tenantId: string): Promise<{
        success: boolean;
        userId?: string;
    }>;
    /**
     * Reenviar email de verificação
     */
    resendVerificationEmail(userId: string, tenantId: string): Promise<string>;
    /**
     * Registrar tentativa de login falha
     */
    recordFailedLoginAttempt(email: string, tenantId: string): void;
    /**
     * Verificar se conta está bloqueada
     */
    isAccountLocked(email: string, tenantId: string): {
        locked: boolean;
        remainingTime?: number;
    };
    /**
     * Limpar tentativas de login após login bem-sucedido
     */
    clearLoginAttempts(email: string, tenantId: string): void;
    /**
     * Obter estatísticas de segurança da conta
     */
    getAccountSecurityStats(userId: string, tenantId: string): Promise<{
        emailVerified: boolean;
        emailVerifiedAt: Date | null;
        lastLoginAt: Date | null;
        activeTokens: number;
        accountCreated: Date;
    }>;
}
//# sourceMappingURL=account-security.service.d.ts.map