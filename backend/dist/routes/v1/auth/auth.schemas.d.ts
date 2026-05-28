import { z } from 'zod';
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    name: z.ZodString;
    password: z.ZodString;
    tenantId: z.ZodOptional<z.ZodString>;
    companyName: z.ZodOptional<z.ZodString>;
    companyId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    tenantId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const refreshTokenSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, z.core.$strip>;
export declare const changePasswordSchema: z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodString;
}, z.core.$strip>;
export declare const updateProfileSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    companyId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const logoutSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, z.core.$strip>;
export declare const forgotPasswordSchema: z.ZodObject<{
    email: z.ZodString;
    tenantId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const resetPasswordSchema: z.ZodObject<{
    resetToken: z.ZodString;
    newPassword: z.ZodString;
    tenantId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const verifyEmailSchema: z.ZodObject<{
    verificationToken: z.ZodString;
    tenantId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const resendVerificationSchema: z.ZodObject<{
    userId: z.ZodString;
    tenantId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const enable2FASchema: z.ZodObject<{
    userId: z.ZodOptional<z.ZodString>;
    tenantId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const verify2FASetupSchema: z.ZodObject<{
    code: z.ZodString;
}, z.core.$strip>;
export declare const disable2FASchema: z.ZodObject<{
    password: z.ZodString;
}, z.core.$strip>;
export declare const verify2FALoginSchema: z.ZodObject<{
    code: z.ZodString;
    userId: z.ZodString;
    tenantId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const regenerateBackupCodesSchema: z.ZodObject<{
    password: z.ZodString;
}, z.core.$strip>;
export declare const createApiKeySchema: z.ZodObject<{
    name: z.ZodString;
    scopes: z.ZodArray<z.ZodString>;
    expiresInDays: z.ZodOptional<z.ZodNumber>;
    ipWhitelist: z.ZodOptional<z.ZodArray<z.ZodString>>;
    rateLimit: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const updateApiKeySchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    scopes: z.ZodOptional<z.ZodArray<z.ZodString>>;
    ipWhitelist: z.ZodOptional<z.ZodArray<z.ZodString>>;
    rateLimit: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const webauthnRegistrationOptionsSchema: z.ZodObject<{
    userId: z.ZodOptional<z.ZodString>;
    tenantId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const webauthnVerifyRegistrationSchema: z.ZodObject<{
    credential: z.ZodObject<{
        id: z.ZodString;
        rawId: z.ZodString;
        response: z.ZodObject<{
            clientDataJSON: z.ZodString;
            attestationObject: z.ZodString;
        }, z.core.$strip>;
        type: z.ZodString;
        authenticatorAttachment: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    challenge: z.ZodString;
    credentialName: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const webauthnAuthenticationOptionsSchema: z.ZodObject<{
    email: z.ZodString;
    tenantId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const webauthnVerifyAuthenticationSchema: z.ZodObject<{
    credential: z.ZodObject<{
        id: z.ZodString;
        rawId: z.ZodString;
        response: z.ZodObject<{
            clientDataJSON: z.ZodString;
            authenticatorData: z.ZodString;
            signature: z.ZodString;
            userHandle: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        type: z.ZodString;
    }, z.core.$strip>;
    challenge: z.ZodString;
    userId: z.ZodString;
}, z.core.$strip>;
export declare const webauthnRenameCredentialSchema: z.ZodObject<{
    newName: z.ZodString;
}, z.core.$strip>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type Enable2FAInput = z.infer<typeof enable2FASchema>;
export type Verify2FASetupInput = z.infer<typeof verify2FASetupSchema>;
export type Disable2FAInput = z.infer<typeof disable2FASchema>;
export type Verify2FALoginInput = z.infer<typeof verify2FALoginSchema>;
export type RegenerateBackupCodesInput = z.infer<typeof regenerateBackupCodesSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>;
//# sourceMappingURL=auth.schemas.d.ts.map