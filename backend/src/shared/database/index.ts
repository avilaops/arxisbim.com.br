import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema/index.js';

// Configuração da conexão
const connectionString = process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER || 'arxis'}:${process.env.DB_PASSWORD || 'arxis_dev_2026'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'arxisvr'}`;

// Cliente PostgreSQL
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Drizzle ORM instance
export const db = drizzle(client, { schema });

// Health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 5000)
    );
    
    const queryPromise = client`SELECT 1 as health_check`;
    
    await Promise.race([queryPromise, timeoutPromise]);
    return true;
  } catch (error: any) {
    console.error('Database connection failed:', error?.message || error);
    return false;
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  await client.end();
}
