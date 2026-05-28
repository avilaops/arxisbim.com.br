import { isIP } from 'node:net';
import { z } from 'zod';
// =====================================
// VALIDATION SCHEMAS
// =====================================
export const registerSchema = z.object({
    email: z.string().email('Email inválido'),
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    password: z.string()
        .min(8, 'Senha deve ter no mínimo 8 caracteres')
        .regex(/[A-Z]/, 'Senha deve conter pelo menos 1 letra maiúscula')
        .regex(/[0-9]/, 'Senha deve conter pelo menos 1 número')
        .regex(/[^A-Za-z0-9]/, 'Senha deve conter pelo menos 1 caractere especial'),
    tenantId: z.string().min(1).optional(),
    companyName: z.string().min(2, 'Nome da empresa deve ter no mínimo 2 caracteres').max(100).optional(),
    companyId: z.string().optional(),
}).refine((data) => Boolean(data.tenantId) || Boolean(data.companyName), { message: 'Informe o nome da empresa', path: ['companyName'] });
export const loginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'Senha é obrigatória'),
    tenantId: z.string().optional(), // Pode vir do header ou corpo
});
export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token é obrigatório'),
});
export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
    newPassword: z.string()
        .min(8, 'Nova senha deve ter no mínimo 8 caracteres')
        .regex(/[A-Z]/, 'Nova senha deve conter pelo menos 1 letra maiúscula')
        .regex(/[0-9]/, 'Nova senha deve conter pelo menos 1 número')
        .regex(/[^A-Za-z0-9]/, 'Nova senha deve conter pelo menos 1 caractere especial'),
});
export const updateProfileSchema = z.object({
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').optional(),
    companyId: z.string().optional(),
});
export const logoutSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token é obrigatório'),
});
export const forgotPasswordSchema = z.object({
    email: z.string().email('Email inválido'),
    tenantId: z.string().optional(),
});
export const resetPasswordSchema = z.object({
    resetToken: z.string().min(1, 'Token de reset é obrigatório'),
    newPassword: z.string()
        .min(8, 'Nova senha deve ter no mínimo 8 caracteres')
        .regex(/[A-Z]/, 'Nova senha deve conter pelo menos 1 letra maiúscula')
        .regex(/[0-9]/, 'Nova senha deve conter pelo menos 1 número')
        .regex(/[^A-Za-z0-9]/, 'Nova senha deve conter pelo menos 1 caractere especial'),
    tenantId: z.string().optional(),
});
export const verifyEmailSchema = z.object({
    verificationToken: z.string().min(1, 'Token de verificação é obrigatório'),
    tenantId: z.string().optional(),
});
export const resendVerificationSchema = z.object({
    userId: z.string().min(1, 'UserId é obrigatório'),
    tenantId: z.string().optional(),
});
export const enable2FASchema = z.object({
    userId: z.string().optional(), // Opcional se autenticado
    tenantId: z.string().optional(),
});
export const verify2FASetupSchema = z.object({
    code: z.string().length(6, 'Código deve ter 6 dígitos'),
});
export const disable2FASchema = z.object({
    password: z.string().min(1, 'Senha é obrigatória'),
});
export const verify2FALoginSchema = z.object({
    code: z.string().length(6, 'Código deve ter 6 dígitos'),
    userId: z.string().min(1, 'UserId é obrigatório'),
    tenantId: z.string().optional(),
});
export const regenerateBackupCodesSchema = z.object({
    password: z.string().min(1, 'Senha é obrigatória para gerar novos códigos'),
});
// API Keys
const ipAddressSchema = z.string().refine((value) => isIP(value) !== 0, 'IP inválido');
export const createApiKeySchema = z.object({
    name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
    scopes: z.array(z.string()).min(1, 'Pelo menos um scope é obrigatório'),
    expiresInDays: z.number().positive().optional(),
    ipWhitelist: z.array(ipAddressSchema).optional(),
    rateLimit: z.string().optional(),
});
export const updateApiKeySchema = z.object({
    name: z.string().min(3).optional(),
    scopes: z.array(z.string()).optional(),
    ipWhitelist: z.array(ipAddressSchema).optional(),
    rateLimit: z.string().optional(),
});
// WebAuthn
export const webauthnRegistrationOptionsSchema = z.object({
    userId: z.string().optional(),
    tenantId: z.string().optional(),
});
export const webauthnVerifyRegistrationSchema = z.object({
    credential: z.object({
        id: z.string(),
        rawId: z.string(),
        response: z.object({
            clientDataJSON: z.string(),
            attestationObject: z.string(),
        }),
        type: z.string(),
        authenticatorAttachment: z.string().optional(),
    }),
    challenge: z.string(),
    credentialName: z.string().optional(),
});
export const webauthnAuthenticationOptionsSchema = z.object({
    email: z.string().email(),
    tenantId: z.string().optional(),
});
export const webauthnVerifyAuthenticationSchema = z.object({
    credential: z.object({
        id: z.string(),
        rawId: z.string(),
        response: z.object({
            clientDataJSON: z.string(),
            authenticatorData: z.string(),
            signature: z.string(),
            userHandle: z.string().optional(),
        }),
        type: z.string(),
    }),
    challenge: z.string(),
    userId: z.string(),
});
export const webauthnRenameCredentialSchema = z.object({
    newName: z.string().min(1, 'Nome é obrigatório'),
});
//# sourceMappingURL=auth.schemas.js.map