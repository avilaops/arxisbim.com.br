import { pgTable, uuid, varchar, text, timestamp, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

// =====================================
// API KEYS (Machine-to-Machine Auth)
// =====================================
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: varchar('tenant_id', { length: 255 }).notNull().references(() => tenants.tenantId, { onDelete: 'cascade' }),
  userId: uuid('user_id'), // Opcional - pode ser key de sistema
  name: varchar('name', { length: 255 }).notNull(), // Nome descritivo da key
  keyPrefix: varchar('key_prefix', { length: 10 }).notNull(), // Prefixo visível (ex: 'arxis_')
  keyHash: text('key_hash').notNull(), // Hash da key completa (SHA-256)
  lastUsedAt: timestamp('last_used_at'),
  expiresAt: timestamp('expires_at'), // Null = sem expiração
  isActive: boolean('is_active').default(true).notNull(),
  scopes: text('scopes').notNull(), // JSON array de permissões
  rateLimit: varchar('rate_limit', { length: 50 }).default('1000/hour'), // Rate limit específico
  ipWhitelist: text('ip_whitelist'), // JSON array de IPs permitidos
  createdAt: timestamp('created_at').defaultNow().notNull(),
  revokedAt: timestamp('revoked_at'),
}, (table) => ({
  keyHashIdx: uniqueIndex('api_keys_key_hash_idx').on(table.keyHash),
  tenantIdIdx: index('api_keys_tenant_id_idx').on(table.tenantId),
  userIdIdx: index('api_keys_user_id_idx').on(table.userId),
  isActiveIdx: index('api_keys_is_active_idx').on(table.isActive),
  keyPrefixIdx: index('api_keys_key_prefix_idx').on(table.keyPrefix),
}));

// =====================================
// WEBAUTHN CREDENTIALS (Biometric Auth)
// =====================================
export const webauthnCredentials = pgTable('webauthn_credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  tenantId: varchar('tenant_id', { length: 255 }).notNull().references(() => tenants.tenantId, { onDelete: 'cascade' }),
  credentialId: text('credential_id').notNull().unique(), // Base64URL encoded
  publicKey: text('public_key').notNull(), // Public key em formato PEM ou COSE
  counter: varchar('counter', { length: 50 }).notNull().default('0'), // Signature counter
  deviceType: varchar('device_type', { length: 50 }).notNull(), // 'platform' ou 'cross-platform'
  transports: text('transports'), // JSON array: ['usb', 'nfc', 'ble', 'internal']
  aaguid: varchar('aaguid', { length: 255 }), // Authenticator AAGUID
  credentialName: varchar('credential_name', { length: 255 }), // Nome do dispositivo (ex: "iPhone 13")
  lastUsedAt: timestamp('last_used_at'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  credentialIdIdx: uniqueIndex('webauthn_credential_id_idx').on(table.credentialId),
  userIdIdx: index('webauthn_user_id_idx').on(table.userId),
  tenantIdIdx: index('webauthn_tenant_id_idx').on(table.tenantId),
  isActiveIdx: index('webauthn_is_active_idx').on(table.isActive),
}));
