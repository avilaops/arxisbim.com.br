/**
 * Email Service para ArxisVR
 * Implementação local com integração ao sistema de observabilidade
 */
export declare class EmailService {
    private initialized;
    private readonly appName;
    private readonly frontendUrl;
    constructor();
    /**
     * Inicializa o serviço de email
     * Deve ser chamado na inicialização da aplicação
     */
    initialize(): Promise<void>;
    /**
     * Verifica se o serviço está configurado e funcionando
     */
    isReady(): boolean;
    /**
     * Envia email de verificação de conta
     */
    sendEmailVerification(to: string, name: string, verificationToken: string, tenantId: string): Promise<void>;
    /**
     * Envia email de reset de senha
     */
    sendPasswordReset(to: string, name: string, resetToken: string, tenantId: string): Promise<void>;
    /**
     * Envia email de boas-vindas após registro
     */
    sendWelcomeEmail(to: string, name: string, tenantId: string): Promise<void>;
    /**
     * Envia email customizado
     */
    sendCustomEmail(to: string, subject: string, htmlContent: string, tenantId: string): Promise<void>;
    /**
     * Verifica a saúde do serviço de email
     */
    healthCheck(): Promise<{
        healthy: boolean;
        message: string;
    }>;
}
export declare const emailService: EmailService;
//# sourceMappingURL=email.service.d.ts.map