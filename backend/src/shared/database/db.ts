import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/arxisvr';

// Create postgres.js client
const client = postgres(connectionString);

// Create drizzle instance
export const db = drizzle(client, { schema });
