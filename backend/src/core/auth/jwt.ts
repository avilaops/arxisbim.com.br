import jwt from 'jsonwebtoken';

if (!process.env.JWT_SECRET) {
  console.error('❌ CRITICAL: JWT_SECRET not configured in environment variables');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;

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
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Gera um novo token JWT
 */
export function generateToken(payload: Omit<TokenPayload, 'iat' | 'exp'>, expiresIn: jwt.SignOptions['expiresIn'] = '24h'): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * Decodifica um token sem verificar (útil para debug)
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    return jwt.decode(token) as TokenPayload;
  } catch (error) {
    return null;
  }
}
