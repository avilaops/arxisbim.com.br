export type ApiTokenScope =
  | 'projects:read'
  | 'projects:write'
  | 'models:read'
  | 'models:write'
  | 'planning:read'
  | 'planning:write'
  | 'budgets:read'
  | 'budgets:write'
  | 'scenarios:read'
  | 'scenarios:write';

export interface ApiToken {
  id: string;
  name: string;
  prefix: string;
  scopes: ApiTokenScope[];
  environment: 'live' | 'test';
  expiresAt: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  lastUsedIp: string | null;
  revokedAt: string | null;
}

export interface CreatedApiToken {
  token: ApiToken;
  plainToken: string;
}
