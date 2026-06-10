import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.test at module level so vars are available before any test imports run
dotenv.config({ path: path.resolve(__dirname, '../.env.test'), override: false });

// Minimal fallbacks for vars not in .env.test
process.env.JWT_SECRET              ??= 'test-jwt-secret-key-for-vitest-tests-only-do-not-use-in-production';
process.env.JWT_REFRESH_SECRET      ??= 'test-jwt-refresh-secret-for-vitest-tests-only-do-not-use-in-production';
process.env.DATABASE_URL            ??= 'postgresql://postgres:postgres@localhost:5432/arxisvr_test';
process.env.BCRYPT_ROUNDS           ??= '4';
process.env.JWT_EXPIRES_IN          ??= '1h';
process.env.REFRESH_TOKEN_EXPIRES_IN ??= '7d';
process.env.NODE_ENV                ??= 'test';
