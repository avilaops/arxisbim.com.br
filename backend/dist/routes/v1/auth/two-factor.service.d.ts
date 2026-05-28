export declare class TwoFactorService {
    private db;
    constructor();
    /**
     * Gerar secret para 2FA (base32 encoded)
     */
    generateSecret(): string;
    /**
     * Gerar QR Code URL para configuração no app authenticator
     */
    generateQRCodeUrl(email: string, secret: string, issuer?: string): string;
    /**
     * Habilitar 2FA para um usuário
     */
    enable2FA(userId: string, tenantId: string): Promise<{
        secret: string;
        qrCodeUrl: string;
        backupCodes: string[];
    }>;
    /**
     * Verificar código TOTP e ativar 2FA
     */
    verify2FASetup(userId: string, tenantId: string, code: string): Promise<boolean>;
    /**
     * Desabilitar 2FA
     */
    disable2FA(userId: string, tenantId: string, password: string): Promise<void>;
    /**
     * Verificar código 2FA durante login
     */
    verify2FALogin(userId: string, tenantId: string, code: string): Promise<boolean>;
    /**
     * Gerar novos backup codes
     */
    regenerateBackupCodes(userId: string, tenantId: string): Promise<string[]>;
    /**
     * Verificar código TOTP
     */
    private verifyTOTP;
    /**
     * Gerar código TOTP para um determinado timestamp
     */
    private generateTOTP;
    /**
     * Gerar backup codes aleatórios
     */
    private generateBackupCodes;
    /**
     * Base32 encode
     */
    private base32Encode;
    /**
     * Base32 decode
     */
    private base32Decode;
}
//# sourceMappingURL=two-factor.service.d.ts.map