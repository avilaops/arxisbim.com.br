import { beforeAll } from 'vitest';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file for tests
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Set test environment variables if not defined
beforeAll(() => {
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-vitest-tests-only-do-not-use-in-production';
  }

  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/arxisvr_test';
  }

  if (!process.env.BCRYPT_ROUNDS) {
    process.env.BCRYPT_ROUNDS = '4'; // Lower rounds for faster tests
  }

  if (!process.env.JWT_EXPIRES_IN) {
    process.env.JWT_EXPIRES_IN = '1h';
  }

  if (!process.env.REFRESH_TOKEN_EXPIRES_IN) {
    process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
  }

  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'test';
  }
});
