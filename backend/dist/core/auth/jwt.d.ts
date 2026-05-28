import jwt from 'jsonwebtoken';
export interface TokenPayload {
    userId: string;
    tenantId: string;
    email: string;
    iat?: number;
    exp?: number;
}
/**
 * Verifica e decodifica um token JWT
 */
export declare function verifyToken(token: string): Promise<TokenPayload | null>;
/**
 * Gera um novo token JWT
 */
export declare function generateToken(payload: Omit<TokenPayload, 'iat' | 'exp'>, expiresIn?: jwt.SignOptions['expiresIn']): string;
/**
 * Decodifica um token sem verificar (útil para debug)
 */
export declare function decodeToken(token: string): TokenPayload | null;
//# sourceMappingURL=jwt.d.ts.map