import type { ApiToken, ApiTokenScope } from '@/types/apiToken';

export interface CreateApiTokenInput {
  name: string;
  scopes: ApiTokenScope[];
  environment: 'live' | 'test';
  expiresAt?: string | null;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export const apiTokensService = {
  async list(): Promise<ApiToken[]> {
    const response = await fetch(`${API_BASE}/api-tokens`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('arxisvr_token')}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch API tokens');
    return response.json();
  },

  async create(input: CreateApiTokenInput) {
    const response = await fetch(`${API_BASE}/api-tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('arxisvr_token')}`,
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error('Failed to create API token');
    return response.json();
  },

  async revoke(tokenId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/api-tokens/${tokenId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('arxisvr_token')}`,
      },
    });
    if (!response.ok) throw new Error('Failed to revoke API token');
  },
};
