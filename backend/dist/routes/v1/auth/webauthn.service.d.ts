/**
 * WebAuthn Service
 * Implementação de autenticação biométrica usando padrão FIDO2/WebAuthn
 * Compatível com: Touch ID, Face ID, Windows Hello, YubiKey, etc.
 */
export interface WebAuthnCredentialInfo {
    id: string;
    credentialId: string;
    credentialName: string | null;
    deviceType: string;
    transports: string[] | null;
    lastUsedAt: Date | null;
    createdAt: Date;
}
export declare class WebAuthnService {
    private db;
    private rpName;
    private rpId;
    private origin;
    constructor();
    /**
     * Gerar opções para registro de credencial (registration)
     */
    generateRegistrationOptions(userId: string, tenantId: string, userName: string, userEmail: string): Promise<{
        options: {
            challenge: string;
            rp: {
                name: string;
                id: string;
            };
            user: {
                id: string;
                name: string;
                displayName: string;
            };
            pubKeyCredParams: {
                type: string;
                alg: number;
            }[];
            authenticatorSelection: {
                authenticatorAttachment: string;
                requireResidentKey: boolean;
                residentKey: string;
                userVerification: string;
            };
            timeout: number;
            attestation: string;
            excludeCredentials: any;
        };
        challenge: string;
    }>;
    /**
     * Verificar e salvar credencial após registration
     */
    verifyRegistration(userId: string, tenantId: string, credential: {
        id: string;
        rawId: string;
        response: {
            clientDataJSON: string;
            attestationObject: string;
        };
        type: string;
        authenticatorAttachment?: string;
    }, challenge: string, credentialName?: string): Promise<WebAuthnCredentialInfo>;
    /**
     * Gerar opções para autenticação (authentication)
     */
    generateAuthenticationOptions(email: string, tenantId: string): Promise<{
        options: {
            challenge: string;
            rpId: string;
            allowCredentials: any;
            userVerification: string;
            timeout: number;
        };
        challenge: string;
        userId: any;
    }>;
    /**
     * Verificar autenticação WebAuthn
     */
    verifyAuthentication(userId: string, tenantId: string, credential: {
        id: string;
        rawId: string;
        response: {
            clientDataJSON: string;
            authenticatorData: string;
            signature: string;
            userHandle?: string;
        };
        type: string;
    }, challenge: string): Promise<{
        valid: boolean;
        credentialId?: string;
    }>;
    /**
     * Listar credenciais do usuário
     */
    listCredentials(userId: string, tenantId: string): Promise<WebAuthnCredentialInfo[]>;
    /**
     * Remover credencial
     */
    removeCredential(credentialId: string, userId: string, tenantId: string): Promise<void>;
    /**
     * Renomear credencial
     */
    renameCredential(credentialId: string, userId: string, tenantId: string, newName: string): Promise<void>;
}
//# sourceMappingURL=webauthn.service.d.ts.map