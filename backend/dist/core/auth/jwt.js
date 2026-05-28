import jwt from 'jsonwebtoken';
if (!process.env.JWT_SECRET) {
    console.error('❌ CRITICAL: JWT_SECRET not configured in environment variables');
    process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;
/**
 * Verifica e decodifica um token JWT
 */
export async function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded;
    }
    catch (error) {
        return null;
    }
}
/**
 * Gera um novo token JWT
 */
export function generateToken(payload, expiresIn = '24h') {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
}
/**
 * Decodifica um token sem verificar (útil para debug)
 */
export function decodeToken(token) {
    try {
        return jwt.decode(token);
    }
    catch (error) {
        return null;
    }
}
//# sourceMappingURL=jwt.js.map