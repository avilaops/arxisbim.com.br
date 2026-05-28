export declare class PasswordResetService {
    private db;
    constructor();
    /**
     * Solicitar reset de senha (forgot password)
     * Gera token e "enviaria" email (por enquanto só retorna o token)
     */
    requestPasswordReset(email: string, tenantId: string): Promise<{
        resetToken: string;
        expiresAt: Date;
    }>;
    /**
     * Validar token de reset
     */
    validateResetToken(resetToken: string, tenantId: string): Promise<{
        valid: boolean;
        userId?: string;
    }>;
    /**
     * Reset de senha usando o token
     */
    resetPassword(resetToken: string, tenantId: string, newPassword: string): Promise<void>;
    /**
     * Limpar tokens expirados (manutenção)
     */
    cleanupExpiredTokens(): Promise<number>;
}
//# sourceMappingURL=password-reset.service.d.ts.map